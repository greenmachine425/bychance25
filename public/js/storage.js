/**
 * Bychance - Storage Service (IndexedDB + LocalStorage)
 * 
 * Preserves generated images, prompts, seeds, metadata, and user favorites locally.
 */

const DB_NAME = 'bychance_db';
const DB_VERSION = 1;
const STORE_NAME = 'generations';

export const Storage = {
  db: null,

  async init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not available, using localStorage fallback');
        resolve(false);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
          store.createIndex('model', 'model', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(true);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        resolve(false);
      };
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
        return '';
      }
    }
    return trimmed;
  },

  /**
   * Save a newly generated image record
   */
  async saveImage(item) {
    const record = {
      id: item.id || 'img_' + Date.now(),
      prompt: item.prompt || '',
      evaluatedPrompt: item.evaluatedPrompt || item.prompt || '',
      fullPrompt: item.fullPrompt || item.prompt || '',
      negativePrompt: item.negativePrompt || '',
      style: item.style || '',
      model: item.model || 'flux-anime',
      aspectRatio: item.aspectRatio || '2:3',
      width: item.width || 832,
      height: item.height || 1216,
      seed: item.seed,
      guidanceScale: item.guidanceScale || 7.5,
      durationMs: item.durationMs || 0,
      timestamp: item.timestamp || Date.now(),
      isFavorite: false,
      url: this._sanitizeUrl(item.url || ''),
      blob: item.blob || null
    };

    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve(record);
        req.onerror = (e) => reject(e.target.error);
      });
    } else {
      // LocalStorage fallback (metadata only)
      try {
        const items = this._getLocalStorageList();
        const stripped = { ...record, blob: null };
        items.unshift(stripped);
        if (items.length > 50) items.pop();
        localStorage.setItem('bychance_history', JSON.stringify(items));
        return record;
      } catch (err) {
        console.error('LocalStorage save error', err);
        return record;
      }
    }
  },

  /**
   * Retrieve all saved images, sorted newest first
   */
  async getAllImages(onlyFavorites = false, searchQuery = '') {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          let results = req.result || [];
          results.sort((a, b) => b.timestamp - a.timestamp);

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
              item.url = URL.createObjectURL(item.blob);
            }
          });

          resolve(results);
        };

        req.onerror = (e) => reject(e.target.error);
      });
    } else {
      let items = this._getLocalStorageList();
      if (onlyFavorites) items = items.filter(i => i.isFavorite);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(i => (i.prompt && i.prompt.toLowerCase().includes(q)));
      }
      return items;
    }
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id) {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
          const item = getReq.result;
          if (!item) {
            resolve(false);
            return;
          }
          item.isFavorite = !item.isFavorite;
          const putReq = store.put(item);
          putReq.onsuccess = () => resolve(item.isFavorite);
          putReq.onerror = (e) => reject(e.target.error);
        };
        getReq.onerror = (e) => reject(e.target.error);
      });
    } else {
      const items = this._getLocalStorageList();
      const item = items.find(i => i.id === id);
      if (item) {
        item.isFavorite = !item.isFavorite;
        localStorage.setItem('bychance_history', JSON.stringify(items));
        return item.isFavorite;
      }
      return false;
    }
  },

  /**
   * Delete an image by ID
   */
  async deleteImage(id) {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e.target.error);
      });
    } else {
      let items = this._getLocalStorageList();
      items = items.filter(i => i.id !== id);
      localStorage.setItem('bychance_history', JSON.stringify(items));
      return true;
    }
  },

  /**
   * Clear all history
   */
  async clearAll() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e.target.error);
      });
    } else {
      localStorage.removeItem('bychance_history');
      return true;
    }
  },

  /**
   * Export all generations metadata as JSON
   */
  async exportBackup() {
    const list = await this.getAllImages();
    // Exclude heavy blobs and redact any sensitive query params from JSON export
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
