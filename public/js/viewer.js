/**
 * Bychance - Image Viewer & Lightbox Module
 * 
 * Provides:
 * - Interactive lightbox with zoom, pan, and keyboard navigation
 * - Full generation metadata inspector
 * - Quick actions: Download, Copy Prompt, Reuse Settings, Variations, Favorite, Delete
 */

import { Storage } from './storage.js';

export const Viewer = {
  activeItem: null,
  galleryItems: [],
  currentIndex: -1,
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  onApplySettingsCallback: null,

  init(onApplySettings) {
    this.onApplySettingsCallback = onApplySettings;
    this._bindEvents();
  },

  /**
   * Open the viewer with a specific item and current gallery list for navigation
   */
  open(item, fullList = []) {
    this.activeItem = item;
    this.galleryItems = fullList;
    this.currentIndex = fullList.findIndex(i => i.id === item.id);
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;

    const modal = document.getElementById('lightbox-modal');
    if (!modal) return;

    this.render();
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  },

  /**
   * Close the viewer
   */
  close() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    this.activeItem = null;
  },

  /**
   * Update modal contents with activeItem data
   */
  render() {
    const item = this.activeItem;
    if (!item) return;

    const imgEl = document.getElementById('lightbox-image');
    if (imgEl) {
      imgEl.src = Storage._sanitizeUrl(item.url);
      imgEl.alt = item.prompt || 'Generated anime illustration';
      this._updateImageTransform();
    }

    // Populate metadata
    this._setText('lightbox-prompt', item.prompt);
    
    // Perchance evaluated prompt section (only if different from template)
    const evaluatedContainer = document.getElementById('lightbox-evaluated-container');
    if (evaluatedContainer) {
      if (item.evaluatedPrompt && item.evaluatedPrompt !== item.prompt) {
        evaluatedContainer.classList.remove('hidden');
        this._setText('lightbox-evaluated-prompt', item.evaluatedPrompt);
      } else {
        evaluatedContainer.classList.add('hidden');
      }
    }

    this._setText('lightbox-negative', item.negativePrompt || 'None');
    this._setText('lightbox-model', item.model || 'FLUX Anime');
    this._setText('lightbox-style', item.style ? (item.style.replace('-', ' ').toUpperCase()) : 'Default');
    this._setText('lightbox-dimensions', `${item.width} × ${item.height} (${item.aspectRatio || '2:3'})`);
    this._setText('lightbox-seed', String(item.seed));
    this._setText('lightbox-duration', item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : 'Instant');
    this._setText('lightbox-date', new Date(item.timestamp).toLocaleString());

    // Favorite button state
    const favBtn = document.getElementById('lightbox-fav-btn');
    if (favBtn) {
      favBtn.innerHTML = item.isFavorite 
        ? `<svg class="w-5 h-5 text-amber-400 fill-amber-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> Favorited`
        : `<svg class="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke-width="2"/></svg> Favorite`;
    }

    // Prev / Next button states
    const prevBtn = document.getElementById('lightbox-prev-btn');
    const nextBtn = document.getElementById('lightbox-next-btn');
    if (prevBtn) prevBtn.disabled = this.currentIndex <= 0;
    if (nextBtn) nextBtn.disabled = this.currentIndex < 0 || this.currentIndex >= this.galleryItems.length - 1;
  },

  /**
   * Navigate to next image
   */
  next() {
    if (this.currentIndex < this.galleryItems.length - 1) {
      this.currentIndex++;
      this.activeItem = this.galleryItems[this.currentIndex];
      this.zoomLevel = 1;
      this.panX = 0;
      this.panY = 0;
      this.render();
    }
  },

  /**
   * Navigate to previous image
   */
  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.activeItem = this.galleryItems[this.currentIndex];
      this.zoomLevel = 1;
      this.panX = 0;
      this.panY = 0;
      this.render();
    }
  },

  /**
   * Zoom controls
   */
  zoomIn() {
    this.zoomLevel = Math.min(this.zoomLevel + 0.25, 3.5);
    this._updateImageTransform();
  },

  zoomOut() {
    this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.5);
    if (this.zoomLevel === 1) {
      this.panX = 0;
      this.panY = 0;
    }
    this._updateImageTransform();
  },

  resetZoom() {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this._updateImageTransform();
  },

  _updateImageTransform() {
    const imgEl = document.getElementById('lightbox-image');
    if (imgEl) {
      imgEl.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }
    const zoomText = document.getElementById('lightbox-zoom-level');
    if (zoomText) {
      zoomText.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  },

  /**
   * Download the active image file
   */
  async download() {
    if (!this.activeItem) return;
    const item = this.activeItem;
    const slug = (item.prompt || 'anime')
      .slice(0, 25)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase();
    const filename = `bychance_${slug}_${item.seed}.png`;

    try {
      if (item.blob) {
        const url = URL.createObjectURL(item.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const res = await fetch(item.url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      this.showToast('Image downloaded!');
    } catch (e) {
      console.warn('Direct blob download failed, falling back to anchor', e);
      const safeUrl = Storage._sanitizeUrl(item.url);
      if (safeUrl) {
        const a = document.createElement('a');
        a.href = safeUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = filename;
        a.click();
      }
    }
  },

  /**
   * Copy prompt or seed to clipboard
   */
  async copyText(text, label = 'Prompt') {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(`${label} copied to clipboard!`);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showToast(`${label} copied!`);
    }
  },

  /**
   * Apply settings from the active item into generation inputs
   */
  applySettings() {
    if (!this.activeItem || !this.onApplySettingsCallback) return;
    this.onApplySettingsCallback(this.activeItem);
    this.close();
    this.showToast('Applied prompt and settings!');
  },

  /**
   * Toggle favorite
   */
  async toggleFavorite() {
    if (!this.activeItem) return;
    const isFav = await Storage.toggleFavorite(this.activeItem.id);
    this.activeItem.isFavorite = isFav;
    this.render();
    this.showToast(isFav ? 'Added to favorites ⭐' : 'Removed from favorites');
  },

  /**
   * Delete image
   */
  async deleteItem() {
    if (!this.activeItem) return;
    if (!confirm('Are you sure you want to delete this image?')) return;
    await Storage.deleteImage(this.activeItem.id);
    this.showToast('Image deleted');
    this.close();
    // Dispatch event so gallery refreshes
    window.dispatchEvent(new CustomEvent('bychance:image-deleted', { detail: { id: this.activeItem.id } }));
  },

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2400);
  },

  _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  },

  _bindEvents() {
    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      const modal = document.getElementById('lightbox-modal');
      if (!modal || modal.classList.contains('hidden')) return;

      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === '+' || e.key === '=') this.zoomIn();
      if (e.key === '-') this.zoomOut();
      if (e.key === '0') this.resetZoom();
    });

    // Panning image with mouse
    const imgWrapper = document.getElementById('lightbox-image-wrapper');
    if (imgWrapper) {
      imgWrapper.addEventListener('mousedown', (e) => {
        if (this.zoomLevel <= 1) return;
        this.isDragging = true;
        this.dragStartX = e.clientX - this.panX;
        this.dragStartY = e.clientY - this.panY;
        imgWrapper.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;
        this.panX = e.clientX - this.dragStartX;
        this.panY = e.clientY - this.dragStartY;
        this._updateImageTransform();
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
        if (imgWrapper) imgWrapper.style.cursor = this.zoomLevel > 1 ? 'grab' : 'default';
      });

      // Mouse wheel zoom
      imgWrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) this.zoomIn();
        else this.zoomOut();
      }, { passive: false });
    }
  }
};
