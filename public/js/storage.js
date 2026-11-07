/**
 * Bychance - Storage Service (IndexedDB + LocalStorage + In-Memory Fallback)
 * 
 * Preserves generated images, prompts, seeds, metadata, and user favorites locally.
 * Resilient across http://, https://, file://, and Android content:// origins.
 */

const DB_NAME = 'bychance_db';
const DB_VERSION = 1;
const STORE_NAME = 'generations';

export const Storage = {
  db: null,
  memoryStore: [],

  async init() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (val) => {
        if (!settled) {
          settled = true;
          resolve(val);
        }
      };

      // Safety timeout so blocked IDB in restricted WebViews never hangs initialization
      const timer = setTimeout(() => {
        console.warn('IndexedDB init timed out, using fallback storage');
        finish(false);
      }, 1200);

      try {
        const idb = window.indexedDB;
        if (!idb) {
          clearTimeout(timer);
          finish(false);
          return;
        }

        const request = idb.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          try {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
              store.createIndex('timestamp', 'timestamp', { unique: false });
              store.createIndex('isFavorite', 'isFavorite', { unique: false });
              store.createIndex('model', 'model', { unique: false });
            }
          } catch (upgradeErr) {
            console.warn('IndexedDB upgrade warning:', upgradeErr);
          }
        };

        request.onsuccess = (event) => {
          clearTimeout(timer);
          this.db = event.target.result;
          finish(true);
        };

        request.onerror = () => {
          clearTimeout(timer);
          console.warn('IndexedDB unavailable in this origin, using fallback storage');
          finish(false);
        };

        request.onblocked = () => {
          clearTimeout(timer);
          finish(false);
        };
      } catch (err) {
        clearTimeout(timer);
        console.warn('IndexedDB access denied in this context (e.g. file:// or content://), using fallback memory/localStorage');
        finish(false);
      }
    });
  },

  /**
   * Sanitize image URL to strip any query secrets and reject dangerous schemes (including SVG data URLs)
   */
  _sanitizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (/^data:image\/svg/i.test(trimmed)) {
      return '';
    }
    if (!/^(https?:\/\/|blob:|data:image\/(png|jpeg|jpg|webp);base64,|\/gallery\/)/i.test(trimmed)) {
      return '';
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        ['key', 'api_key', 'apikey', 'token', 'access_token'].forEach(p => parsed.searchParams.delete(p));
        return parsed.toString();
      } catch {
        return trimmed.replace(/([?&])(key|api_key|apikey|token|access_token)=[^&]*/gi, '$1').replace(/[?&]$/, '');
      }
    }
    return trimmed;
  },

  /**
   * Save a newly generated image record with automatic fallback to localStorage and RAM
   */
  async saveImage(item) {
    const record = {
      id: item.id || 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      prompt: item.prompt || '',
      evaluatedPrompt: item.evaluatedPrompt || item.prompt || '',
      fullPrompt: item.fullPrompt || item.prompt || '',
      negativePrompt: item.negativePrompt || '',
      style: item.style || '',
      model: item.model || 'flux-anime',
      modelName: item.modelName || item.model || 'FLUX.1 Anime',
      aspectRatio: item.aspectRatio || '2:3',
      width: item.width || 680,
      height: item.height || 1024,
      seed: item.seed,
      guidanceScale: item.guidanceScale || 5.5,
      durationMs: item.durationMs || 0,
      timestamp: item.timestamp || Date.now(),
      isFavorite: false,
      url: this._sanitizeUrl(item.url || ''),
      blob: item.blob || null
    };

    // Always keep in-session memoryStore updated
    this.memoryStore = [record, ...this.memoryStore.filter(i => i.id !== record.id)].slice(0, 60);

    if (this.db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction([STORE_NAME], 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(record);
          req.onsuccess = () => resolve(record);
          req.onerror = (e) => reject(e.target.error);
        });
        return record;
      } catch (idbErr) {
        console.warn('IndexedDB put fallback to localStorage/memory:', idbErr);
      }
    }

    // LocalStorage fallback (metadata only)
    try {
      const items = this._getLocalStorageList();
      const stripped = { ...record, blob: null };
      const updated = [stripped, ...items.filter(i => i.id !== record.id)].slice(0, 50);
      localStorage.setItem('bychance_history', JSON.stringify(updated));
    } catch {
      // In content:// or strict mode, memoryStore still holds the items
    }
    return record;
  },

  /**
   * Retrieve all saved images, sorted newest first
   */
  async getAllImages(onlyFavorites = false, searchQuery = '') {
    let results = [];

    if (this.db) {
      try {
        results = await new Promise((resolve, reject) => {
          const tx = this.db.transaction([STORE_NAME], 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = (e) => reject(e.target.error);
        });
      } catch {
        results = [];
      }
    }

    if (!results || results.length === 0) {
      const lsItems = this._getLocalStorageList();
      // Merge memoryStore and localStorage items
      const map = new Map();
      [...this.memoryStore, ...lsItems].forEach(item => {
        if (item && item.id && !map.has(item.id)) {
          map.set(item.id, item);
        }
      });
      results = Array.from(map.values());
    }

    results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (onlyFavorites) {
      results = results.filter(i => i.isFavorite);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(i => 
        (i.prompt && i.prompt.toLowerCase().includes(q)) ||
        (i.model && i.model.toLowerCase().includes(q)) ||
        (i.style && i.style.toLowerCase().includes(q)) ||
        (String(i.seed).includes(q))
      );
    }

    // Ensure object URLs are active for records with blobs
    results.forEach(item => {
      if (item.blob && (!item.url || item.url.startsWith('blob:'))) {
        try {
          item.url = URL.createObjectURL(item.blob);
        } catch {
          // Ignore
        }
      }
    });

    return results;
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id) {
    const memItem = this.memoryStore.find(i => i.id === id);
    if (memItem) {
      memItem.isFavorite = !memItem.isFavorite;
    }

    if (this.db) {
      try {
        return await new Promise((resolve, reject) => {
          const tx = this.db.transaction([STORE_NAME], 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const getReq = store.get(id);

          getReq.onsuccess = () => {
            const item = getReq.result;
            if (!item) {
              resolve(memItem ? memItem.isFavorite : false);
              return;
            }
            item.isFavorite = !item.isFavorite;
            const putReq = store.put(item);
            putReq.onsuccess = () => resolve(item.isFavorite);
            putReq.onerror = (e) => reject(e.target.error);
          };
          getReq.onerror = (e) => reject(e.target.error);
        });
      } catch {
        // Fallback below
      }
    }

    try {
      const items = this._getLocalStorageList();
      const item = items.find(i => i.id === id);
      if (item) {
        item.isFavorite = !item.isFavorite;
        localStorage.setItem('bychance_history', JSON.stringify(items));
        return item.isFavorite;
      }
    } catch {
      // Ignore
    }
    return memItem ? memItem.isFavorite : false;
  },

  /**
   * Delete an image by ID
   */
  async deleteImage(id) {
    this.memoryStore = this.memoryStore.filter(i => i.id !== id);

    if (this.db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction([STORE_NAME], 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => reject(e.target.error);
        });
      } catch {
        // Fallback below
      }
    }

    try {
      let items = this._getLocalStorageList();
      items = items.filter(i => i.id !== id);
      localStorage.setItem('bychance_history', JSON.stringify(items));
    } catch {
      // Ignore
    }
    return true;
  },

  /**
   * Clear all history
   */
  async clearAll() {
    this.memoryStore = [];
    if (this.db) {
      try {
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction([STORE_NAME], 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => reject(e.target.error);
        });
      } catch {
        // Ignore
      }
    }
    try {
      localStorage.removeItem('bychance_history');
    } catch {
      // Ignore
    }
    return true;
  },

  /**
   * Export all generations metadata as JSON
   */
  async exportBackup() {
    const list = await this.getAllImages();
    const cleanList = list.map(item => {
      const copy = { ...item };
      delete copy.blob;
      copy.url = this._sanitizeUrl(copy.url || '');
      return copy;
    });

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanList, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `bychance_backup_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  },

  _getLocalStorageList() {
    try {
      const raw = localStorage.getItem('bychance_history');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
};
