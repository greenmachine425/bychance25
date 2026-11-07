/**
 * Bychance - Main Application Controller
 */

import { PerchanceEngine } from './perchanceEngine.js';
import { ImageGenerator } from './imageGenerator.js';
import { Storage } from './storage.js';
import { Viewer } from './viewer.js';

class App {
  constructor() {
    this.isGenerating = false;
    this.currentSeed = null;
    this.isSeedLocked = false;
    this.currentBatch = [];
    this.galleryItems = [];
    this.currentFilter = 'all'; // 'all' | 'favorites'
    this.searchQuery = '';
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async init() {
    console.log('Initializing Bychance application...');
    ImageGenerator.init();
    await Storage.init();

    Viewer.init((savedItem) => this.applySavedSettings(savedItem));

    this.renderStylePresets();
    this.renderTemplateLibrary();
    this.renderTagBuilder();
    this.bindEvents();
    await this.loadGallery();

    // Default random seed
    this.generateNewSeed();

    // Listen for image deletion events from Viewer
    window.addEventListener('bychance:image-deleted', () => {
      this.loadGallery();
    });

    console.log('Bychance initialized successfully.');
  }

  bindEvents() {
    // Generate Button
    const genBtn = document.getElementById('btn-generate');
    if (genBtn) genBtn.addEventListener('click', () => this.handleGenerate());

    // Keyboard shortcut Ctrl+Enter or Cmd+Enter
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.handleGenerate();
      }
    });

    // Random Prompt Button (Dice)
    const btnRandom = document.getElementById('btn-random-prompt');
    if (btnRandom) {
      btnRandom.addEventListener('click', () => {
        const promptInput = document.getElementById('prompt-input');
        if (promptInput) {
          promptInput.value = PerchanceEngine.generateRandomPrompt();
          this.updateSyntaxPreview();
          this.showToast('Rolled a new random anime scenario! 🎲');
        }
      });
    }

    // Random Perchance Syntax Template
    const btnRandomTemplate = document.getElementById('btn-random-template');
    if (btnRandomTemplate) {
      btnRandomTemplate.addEventListener('click', () => {
        const promptInput = document.getElementById('prompt-input');
        if (promptInput) {
          promptInput.value = PerchanceEngine.generateRandomTemplate();
          this.updateSyntaxPreview();
          this.showToast('Created random Perchance template with {options}! ✨');
        }
      });
    }

    // Seed Randomize Button
    const btnRandomSeed = document.getElementById('btn-random-seed');
    if (btnRandomSeed) {
      btnRandomSeed.addEventListener('click', () => {
        this.generateNewSeed();
      });
    }

    // Seed Lock Toggle
    const btnLockSeed = document.getElementById('btn-lock-seed');
    if (btnLockSeed) {
      btnLockSeed.addEventListener('click', () => {
        this.isSeedLocked = !this.isSeedLocked;
        this.updateSeedLockUI();
      });
    }

    // Seed Input manual change
    const seedInput = document.getElementById('seed-input');
    if (seedInput) {
      seedInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.currentSeed = isNaN(val) ? null : val;
      });
    }

    // Live Syntax Preview on prompt typing
    const promptInput = document.getElementById('prompt-input');
    if (promptInput) {
      promptInput.addEventListener('input', () => {
        this.updateSyntaxPreview();
      });
    }

    // Guidance Scale Slider
    const guidanceSlider = document.getElementById('guidance-slider');
    const guidanceVal = document.getElementById('guidance-val');
    if (guidanceSlider && guidanceVal) {
      guidanceSlider.addEventListener('input', (e) => {
        guidanceVal.textContent = parseFloat(e.target.value).toFixed(1);
      });
    }

    // Aspect Ratio Buttons
    const aspectBtns = document.querySelectorAll('.aspect-ratio-btn');
    aspectBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        aspectBtns.forEach(b => b.classList.remove('active', 'border-indigo-500', 'bg-indigo-500/20', 'text-indigo-300'));
        btn.classList.add('active', 'border-indigo-500', 'bg-indigo-500/20', 'text-indigo-300');
      });
    });

    // Batch Count Buttons (1, 2, 4)
    const batchBtns = document.querySelectorAll('.batch-count-btn');
    batchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        batchBtns.forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
        btn.classList.add('active', 'bg-indigo-600', 'text-white');
      });
    });

    // Toggle Negative Prompt details
    const toggleNegativeBtn = document.getElementById('toggle-negative-btn');
    const negativeContainer = document.getElementById('negative-prompt-container');
    if (toggleNegativeBtn && negativeContainer) {
      toggleNegativeBtn.addEventListener('click', () => {
        const isHidden = negativeContainer.classList.contains('hidden');
        if (isHidden) {
          negativeContainer.classList.remove('hidden');
          toggleNegativeBtn.textContent = 'Hide Negative Prompt ▲';
        } else {
          negativeContainer.classList.add('hidden');
          toggleNegativeBtn.textContent = 'Show Negative Prompt ▼';
        }
      });
    }

    // Gallery Filters (All / Favorites)
    const filterAllBtn = document.getElementById('filter-all-btn');
    const filterFavBtn = document.getElementById('filter-fav-btn');
    if (filterAllBtn && filterFavBtn) {
      filterAllBtn.addEventListener('click', () => {
        this.currentFilter = 'all';
        filterAllBtn.classList.add('bg-zinc-800', 'text-white');
        filterFavBtn.classList.remove('bg-zinc-800', 'text-white');
        this.loadGallery();
      });
      filterFavBtn.addEventListener('click', () => {
        this.currentFilter = 'favorites';
        filterFavBtn.classList.add('bg-zinc-800', 'text-white');
        filterAllBtn.classList.remove('bg-zinc-800', 'text-white');
        this.loadGallery();
      });
    }

    // Gallery Search
    const gallerySearch = document.getElementById('gallery-search');
    if (gallerySearch) {
      gallerySearch.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        this.loadGallery();
      });
    }

    // Clear History Button
    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', async () => {
        if (confirm('Clear all generated image history?')) {
          await Storage.clearAll();
          await this.loadGallery();
          this.showToast('Gallery cleared');
        }
      });
    }

    // Export Backup Button
    const btnExport = document.getElementById('btn-export-history');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        Storage.exportBackup();
      });
    }

    // Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetModalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(targetModalId);
        if (modal) modal.classList.add('hidden');
      });
    });

    // Tag Builder Modal toggle
    const btnOpenTags = document.getElementById('btn-open-tags');
    const tagModal = document.getElementById('tags-modal');
    if (btnOpenTags && tagModal) {
      btnOpenTags.addEventListener('click', () => tagModal.classList.remove('hidden'));
    }

    // Template Library Modal toggle
    const btnOpenTemplates = document.getElementById('btn-open-templates');
    const templatesModal = document.getElementById('templates-modal');
    if (btnOpenTemplates && templatesModal) {
      btnOpenTemplates.addEventListener('click', () => templatesModal.classList.remove('hidden'));
    }

    // Settings Modal toggle
    const btnOpenSettings = document.getElementById('btn-open-settings');
    const settingsModal = document.getElementById('settings-modal');
    if (btnOpenSettings && settingsModal) {
      btnOpenSettings.addEventListener('click', () => {
        this.populateSettingsForm();
        settingsModal.classList.remove('hidden');
      });
    }

    // Save Settings
    const formSettings = document.getElementById('settings-form');
    if (formSettings) {
      formSettings.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettingsForm();
        settingsModal.classList.add('hidden');
        this.showToast('Settings saved');
      });
    }

    // Lightbox Modal action buttons
    const lbClose = document.getElementById('lightbox-close-btn');
    if (lbClose) lbClose.addEventListener('click', () => Viewer.close());

    const lbNext = document.getElementById('lightbox-next-btn');
    if (lbNext) lbNext.addEventListener('click', () => Viewer.next());

    const lbPrev = document.getElementById('lightbox-prev-btn');
    if (lbPrev) lbPrev.addEventListener('click', () => Viewer.prev());

    const lbZoomIn = document.getElementById('lightbox-zoom-in');
    if (lbZoomIn) lbZoomIn.addEventListener('click', () => Viewer.zoomIn());

    const lbZoomOut = document.getElementById('lightbox-zoom-out');
    if (lbZoomOut) lbZoomOut.addEventListener('click', () => Viewer.zoomOut());

    const lbZoomReset = document.getElementById('lightbox-zoom-reset');
    if (lbZoomReset) lbZoomReset.addEventListener('click', () => Viewer.resetZoom());

    const lbDownload = document.getElementById('lightbox-download-btn');
    if (lbDownload) lbDownload.addEventListener('click', () => Viewer.download());

    const lbCopyPrompt = document.getElementById('lightbox-copy-prompt-btn');
    if (lbCopyPrompt) lbCopyPrompt.addEventListener('click', () => {
      if (Viewer.activeItem) Viewer.copyText(Viewer.activeItem.prompt, 'Prompt');
    });

    const lbCopySeed = document.getElementById('lightbox-copy-seed-btn');
    if (lbCopySeed) lbCopySeed.addEventListener('click', () => {
      if (Viewer.activeItem) Viewer.copyText(String(Viewer.activeItem.seed), 'Seed');
    });

    const lbApplySettings = document.getElementById('lightbox-apply-settings-btn');
    if (lbApplySettings) lbApplySettings.addEventListener('click', () => Viewer.applySettings());

    const lbFav = document.getElementById('lightbox-fav-btn');
    if (lbFav) lbFav.addEventListener('click', async () => {
      await Viewer.toggleFavorite();
      this.loadGallery();
    });

    const lbDelete = document.getElementById('lightbox-delete-btn');
    if (lbDelete) lbDelete.addEventListener('click', () => Viewer.deleteItem());
  }

  /**
   * Update Perchance Syntax Preview pill under prompt box
   */
  updateSyntaxPreview() {
    const promptInput = document.getElementById('prompt-input');
    const previewContainer = document.getElementById('syntax-preview-container');
    const previewText = document.getElementById('syntax-preview-text');
    if (!promptInput || !previewContainer || !previewText) return;

    const val = promptInput.value;
    if (val.includes('{') && val.includes('}')) {
      const resolved = PerchanceEngine.evaluate(val);
      previewText.textContent = resolved;
      previewContainer.classList.remove('hidden');
    } else {
      previewContainer.classList.add('hidden');
    }
  }

  /**
   * Generate new random seed
   */
  generateNewSeed() {
    this.currentSeed = Math.floor(Math.random() * 2147483647);
    const seedInput = document.getElementById('seed-input');
    if (seedInput) seedInput.value = this.currentSeed;
  }

  updateSeedLockUI() {
    const btnLock = document.getElementById('btn-lock-seed');
    if (!btnLock) return;
    if (this.isSeedLocked) {
      btnLock.innerHTML = `<svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`;
      btnLock.title = 'Seed is locked (consistent character/composition)';
      this.showToast('Seed locked 🔒');
    } else {
      btnLock.innerHTML = `<svg class="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>`;
      btnLock.title = 'Seed is unlocked (will randomize each generation)';
      this.showToast('Seed unlocked 🔓');
    }
  }

  /**
   * Render Style Presets Pills
   */
  renderStylePresets() {
    const container = document.getElementById('style-presets-container');
    if (!container) return;

    container.innerHTML = '';

    // "None / Default" preset
    const defaultBtn = document.createElement('button');
    defaultBtn.className = 'style-preset-btn active px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-500 bg-indigo-500/20 text-indigo-300 transition-all flex items-center gap-1.5 whitespace-nowrap';
    defaultBtn.setAttribute('data-style', '');
    defaultBtn.innerHTML = `<span>✨</span><span>Default</span>`;
    container.appendChild(defaultBtn);

    Object.entries(PerchanceEngine.stylePresets).forEach(([key, preset]) => {
      const btn = document.createElement('button');
      btn.className = 'style-preset-btn px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:text-white transition-all flex items-center gap-1.5 whitespace-nowrap';
      btn.setAttribute('data-style', key);
      btn.title = preset.description;
      btn.innerHTML = `<span>🎨</span><span>${preset.name}</span>`;
      container.appendChild(btn);
    });

    // Style button clicks
    container.querySelectorAll('.style-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.style-preset-btn').forEach(b => {
          b.classList.remove('active', 'border-indigo-500', 'bg-indigo-500/20', 'text-indigo-300');
          b.classList.add('border-zinc-800', 'bg-zinc-900/60', 'text-zinc-300');
        });
        btn.classList.add('active', 'border-indigo-500', 'bg-indigo-500/20', 'text-indigo-300');
        btn.classList.remove('border-zinc-800', 'bg-zinc-900/60', 'text-zinc-300');
      });
    });
  }

  /**
   * Render Template Library Modal
   */
  renderTemplateLibrary() {
    const list = document.getElementById('templates-list');
    if (!list) return;

    list.innerHTML = '';
    PerchanceEngine.templates.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all cursor-pointer group flex flex-col justify-between';
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xl">${tpl.icon}</span>
            <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">${tpl.category}</span>
          </div>
          <h4 class="font-medium text-sm text-zinc-200 group-hover:text-indigo-400 transition-colors mb-1.5">${tpl.title}</h4>
          <p class="text-xs text-zinc-400 line-clamp-3 font-mono leading-relaxed bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">${tpl.template}</p>
        </div>
        <div class="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800/50">
          <span class="text-xs text-indigo-400 font-medium">Use Template →</span>
          <button class="roll-btn text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300" title="Evaluate immediately">🎲 Roll One</button>
        </div>
      `;

      // Use raw template
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('roll-btn')) return;
        const promptInput = document.getElementById('prompt-input');
        if (promptInput) {
          promptInput.value = tpl.template;
          this.updateSyntaxPreview();
          document.getElementById('templates-modal').classList.add('hidden');
          this.showToast(`Loaded ${tpl.title} template!`);
        }
      });

      // Roll evaluated option directly
      const rollBtn = card.querySelector('.roll-btn');
      if (rollBtn) {
        rollBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const promptInput = document.getElementById('prompt-input');
          if (promptInput) {
            promptInput.value = PerchanceEngine.evaluate(tpl.template);
            this.updateSyntaxPreview();
            document.getElementById('templates-modal').classList.add('hidden');
            this.showToast(`Evaluated ${tpl.title} prompt!`);
          }
        });
      }

      list.appendChild(card);
    });
  }

  /**
   * Render Tag Builder Modal
   */
  renderTagBuilder() {
    const container = document.getElementById('tags-container');
    if (!container) return;

    container.innerHTML = '';
    const categories = PerchanceEngine.getTagCategories();

    categories.forEach(cat => {
      const section = document.createElement('div');
      section.className = 'mb-4';
      section.innerHTML = `
        <h4 class="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">${cat.name}</h4>
        <div class="flex flex-wrap gap-1.5">
          ${cat.tags.map(tag => `
            <button class="tag-pill px-2.5 py-1 rounded-lg text-xs bg-zinc-800/80 hover:bg-indigo-600 hover:text-white text-zinc-300 transition-colors border border-zinc-700/50" data-tag="${tag}">
              + ${tag}
            </button>
          `).join('')}
        </div>
      `;

      section.querySelectorAll('.tag-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.getAttribute('data-tag');
          const promptInput = document.getElementById('prompt-input');
          if (promptInput) {
            const current = promptInput.value.trim();
            promptInput.value = current ? `${current}, ${tag}` : tag;
            this.updateSyntaxPreview();
            this.showToast(`Added tag: ${tag}`);
          }
        });
      });

      container.appendChild(section);
    });
  }

  /**
   * Read all input parameters from UI
   */
  getGenerationParams() {
    const promptInput = document.getElementById('prompt-input');
    const prompt = promptInput ? promptInput.value.trim() : '';

    const negativeInput = document.getElementById('negative-input');
    const negativePrompt = negativeInput ? negativeInput.value.trim() : '';

    // Active Style
    const activeStyleBtn = document.querySelector('.style-preset-btn.active');
    const style = activeStyleBtn ? activeStyleBtn.getAttribute('data-style') : '';

    // Active Aspect Ratio
    const activeAspectBtn = document.querySelector('.aspect-ratio-btn.active');
    const aspectRatio = activeAspectBtn ? activeAspectBtn.getAttribute('data-ratio') : '2:3';

    // Active Batch Count
    const activeBatchBtn = document.querySelector('.batch-count-btn.active');
    const batchCount = activeBatchBtn ? parseInt(activeBatchBtn.getAttribute('data-count'), 10) : 1;

    // Guidance Scale
    const guidanceSlider = document.getElementById('guidance-slider');
    const guidanceScale = guidanceSlider ? parseFloat(guidanceSlider.value) : 7.5;

    // Model selection
    const modelSelect = document.getElementById('model-select');
    const model = modelSelect ? modelSelect.value : 'flux';

    // Quality Booster Checkbox
    const boosterCheck = document.getElementById('quality-booster-toggle');
    const enableBoosters = boosterCheck ? boosterCheck.checked : true;

    return {
      prompt,
      negativePrompt,
      style,
      aspectRatio,
      batchCount,
      guidanceScale,
      model,
      enableBoosters,
      seed: this.currentSeed
    };
  }

  /**
   * Handle the primary Generate action
   */
  async handleGenerate() {
    if (this.isGenerating) return;

    const params = this.getGenerationParams();
    if (!params.prompt) {
      this.showToast('Please enter a prompt or roll a random one! 🎲');
      return;
    }

    this.isGenerating = true;
    this.updateGeneratingUI(true);

    // Setup preview area with placeholder skeleton cards
    this.setupBatchPreviewGrid(params.batchCount, params.aspectRatio);

    try {
      const results = await ImageGenerator.generateBatch({
        ...params,
        onProgress: (progress) => {
          this.handleImageItemProgress(progress);
        }
      });

      // Save successful generations into storage and refresh gallery
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value) {
          await Storage.saveImage(res.value);
        }
      }

      await this.loadGallery();
      this.showToast('Generated image(s) successfully! ✨');

      // Randomize seed if unlocked
      if (!this.isSeedLocked) {
        this.generateNewSeed();
      }
    } catch (err) {
      console.error('Generation batch error:', err);
      this.showToast(`Generation failed: ${err.message || 'Network error'}`);
    } finally {
      this.isGenerating = false;
      this.updateGeneratingUI(false);
    }
  }

  /**
   * Setup placeholder skeleton cards in the live preview area
   */
  setupBatchPreviewGrid(count, aspectRatio) {
    const grid = document.getElementById('live-preview-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const ratioInfo = ImageGenerator.aspectRatios[aspectRatio] || ImageGenerator.aspectRatios['2:3'];

    // Adjust grid columns based on batch size
    grid.className = count === 1 
      ? 'grid grid-cols-1 max-w-lg mx-auto gap-4' 
      : (count === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'grid grid-cols-2 sm:grid-cols-4 gap-4');

    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.id = `preview-card-${i}`;
      card.className = 'relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 flex flex-col items-center justify-center shadow-xl group';
      card.style.aspectRatio = ratioInfo.cssRatio;

      card.innerHTML = `
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-950/20 to-zinc-950 animate-pulse flex flex-col items-center justify-center p-4 text-center">
          <div class="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span class="text-xs font-medium text-zinc-400">Rendering anime artwork #${i + 1}...</span>
          <span class="text-[10px] text-zinc-500 mt-1">Applying FLUX attention layers</span>
        </div>
      `;

      grid.appendChild(card);
    }
  }

  /**
   * Handle single item completion in a batch
   */
  handleImageItemProgress({ index, result, success, error }) {
    const card = document.getElementById(`preview-card-${index}`);
    if (!card) return;

    if (success && result) {
      const safeUrl = this.escapeHtml(Storage._sanitizeUrl(result.url));
      const safeAlt = this.escapeHtml(result.prompt);
      const safePrompt = this.escapeHtml(result.evaluatedPrompt || result.prompt);
      const safeSeed = this.escapeHtml(result.seed);
      const safeDuration = ((Number(result.durationMs) || 0) / 1000).toFixed(1);

      card.innerHTML = `
        <img src="${safeUrl}" alt="${safeAlt}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
          <p class="text-xs text-white line-clamp-2 font-medium">${safePrompt}</p>
          <div class="flex items-center justify-between text-[10px] text-zinc-300 mt-1">
            <span>Seed: ${safeSeed}</span>
            <span>${safeDuration}s</span>
          </div>
        </div>
        <button class="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur hover:bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="Open Viewer">
          🔍
        </button>
      `;

      card.classList.remove('cursor-wait');
      card.classList.add('cursor-pointer');
      card.addEventListener('click', () => {
        Viewer.open(result, this.galleryItems);
      });
    } else {
      const safeErr = this.escapeHtml(error ? error.message : 'Timeout');
      card.innerHTML = `
        <div class="p-4 text-center">
          <span class="text-2xl mb-2 block">⚠️</span>
          <p class="text-xs text-rose-400 font-medium">Generation Failed</p>
          <p class="text-[10px] text-zinc-500 mt-1 line-clamp-2">${safeErr}</p>
        </div>
      `;
    }
  }

  /**
   * Update UI generation state (button loading spinner, progress bar)
   */
  updateGeneratingUI(loading) {
    const btn = document.getElementById('btn-generate');
    const progressBar = document.getElementById('generation-progress-bar');
    if (btn) {
      if (loading) {
        btn.disabled = true;
        btn.innerHTML = `
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Generating Anime Art...
        `;
        if (progressBar) progressBar.classList.remove('hidden');
      } else {
        btn.disabled = false;
        btn.innerHTML = `<span>Generate Anime</span><span class="text-xs opacity-75 font-normal ml-1">(Ctrl+↵)</span>`;
        if (progressBar) progressBar.classList.add('hidden');
      }
    }
  }

  /**
   * Load and render Gallery from storage
   */
  async loadGallery() {
    const list = await Storage.getAllImages(
      this.currentFilter === 'favorites',
      this.searchQuery
    );
    this.galleryItems = list;

    const countEl = document.getElementById('gallery-count');
    if (countEl) countEl.textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;

    const container = document.getElementById('gallery-grid');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-zinc-500">
          <span class="text-4xl block mb-3">🎨</span>
          <p class="text-sm font-medium text-zinc-400">No images yet</p>
          <p class="text-xs text-zinc-500 mt-1">Roll a prompt and click "Generate Anime" to create your first masterpiece!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'relative rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-900 group cursor-pointer hover:border-indigo-500/50 transition-all';
      
      const ratioInfo = ImageGenerator.aspectRatios[item.aspectRatio] || ImageGenerator.aspectRatios['2:3'];
      card.style.aspectRatio = ratioInfo.cssRatio;

      const safeUrl = this.escapeHtml(Storage._sanitizeUrl(item.url));
      const safeAlt = this.escapeHtml(item.prompt);
      const safePrompt = this.escapeHtml(item.evaluatedPrompt || item.prompt);
      const safeSeed = this.escapeHtml(item.seed);
      const safeModel = this.escapeHtml(item.model || 'FLUX');

      card.innerHTML = `
        <img src="${safeUrl}" alt="${safeAlt}" loading="lazy" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
          <div class="flex justify-end gap-1">
            <button class="fav-quick-btn p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white" title="Favorite">
              ${item.isFavorite ? '⭐' : '☆'}
            </button>
          </div>
          <div>
            <p class="text-[11px] text-white line-clamp-2 font-medium">${safePrompt}</p>
            <div class="flex items-center justify-between text-[9px] text-zinc-400 mt-1">
              <span>Seed: ${safeSeed}</span>
              <span>${safeModel}</span>
            </div>
          </div>
        </div>
      `;

      // Quick favorite
      const favBtn = card.querySelector('.fav-quick-btn');
      if (favBtn) {
        favBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const isFav = await Storage.toggleFavorite(item.id);
          item.isFavorite = isFav;
          favBtn.textContent = isFav ? '⭐' : '☆';
          if (this.currentFilter === 'favorites' && !isFav) {
            this.loadGallery();
          }
        });
      }

      // Open Lightbox
      card.addEventListener('click', () => {
        Viewer.open(item, this.galleryItems);
      });

      container.appendChild(card);
    });
  }

  /**
   * Apply settings from an existing generation record
   */
  applySavedSettings(item) {
    const promptInput = document.getElementById('prompt-input');
    if (promptInput) promptInput.value = item.prompt;

    const negInput = document.getElementById('negative-input');
    if (negInput && item.negativePrompt) negInput.value = item.negativePrompt;

    this.currentSeed = item.seed;
    const seedInput = document.getElementById('seed-input');
    if (seedInput) seedInput.value = item.seed;

    if (item.aspectRatio) {
      document.querySelectorAll('.aspect-ratio-btn').forEach(b => {
        if (b.getAttribute('data-ratio') === item.aspectRatio) {
          b.click();
        }
      });
    }

    if (item.style) {
      document.querySelectorAll('.style-preset-btn').forEach(b => {
        if (b.getAttribute('data-style') === item.style) {
          b.click();
        }
      });
    }

    if (item.model) {
      const modelSelect = document.getElementById('model-select');
      if (modelSelect) modelSelect.value = item.model;
    }

    this.updateSyntaxPreview();
  }

  populateSettingsForm() {
    const providerSelect = document.getElementById('settings-provider');
    const pollinationsKeyInput = document.getElementById('settings-pollinations-key');
    const hfTokenInput = document.getElementById('settings-hf-token');
    const hfModelInput = document.getElementById('settings-hf-model');
    const customEndpointInput = document.getElementById('settings-custom-endpoint');
    const customApiKeyInput = document.getElementById('settings-custom-api-key');
    const pollinationsSection = document.getElementById('settings-pollinations-section');
    const hfSection = document.getElementById('settings-hf-section');
    const customSection = document.getElementById('settings-custom-section');

    if (providerSelect) {
      providerSelect.value = ImageGenerator.settings.provider;

      const updateSections = () => {
        const val = providerSelect.value;
        if (pollinationsSection) pollinationsSection.style.display = val === 'pollinations' ? 'block' : 'none';
        if (hfSection) hfSection.style.display = val === 'huggingface' ? 'block' : 'none';
        if (customSection) customSection.style.display = val === 'custom' ? 'block' : 'none';
      };

      updateSections();
      providerSelect.onchange = updateSections;
    }
    if (pollinationsKeyInput) pollinationsKeyInput.value = ImageGenerator.settings.pollinationsKey || '';
    if (hfTokenInput) hfTokenInput.value = ImageGenerator.settings.hfToken || '';
    if (hfModelInput) hfModelInput.value = ImageGenerator.settings.hfModel || '';
    if (customEndpointInput) customEndpointInput.value = ImageGenerator.settings.customEndpoint || '';
    if (customApiKeyInput) customApiKeyInput.value = ImageGenerator.settings.customApiKey || '';
  }

  saveSettingsForm() {
    const providerSelect = document.getElementById('settings-provider');
    const pollinationsKeyInput = document.getElementById('settings-pollinations-key');
    const hfTokenInput = document.getElementById('settings-hf-token');
    const hfModelInput = document.getElementById('settings-hf-model');
    const customEndpointInput = document.getElementById('settings-custom-endpoint');
    const customApiKeyInput = document.getElementById('settings-custom-api-key');

    ImageGenerator.saveSettings({
      provider: providerSelect ? providerSelect.value : 'pollinations',
      pollinationsKey: pollinationsKeyInput ? pollinationsKeyInput.value.trim() : '',
      hfToken: hfTokenInput ? hfTokenInput.value.trim() : '',
      hfModel: hfModelInput ? hfModelInput.value.trim() : '',
      customEndpoint: customEndpointInput ? customEndpointInput.value.trim() : '',
      customApiKey: customApiKeyInput ? customApiKeyInput.value.trim() : ''
    });
  }

  showToast(msg) {
    Viewer.showToast(msg);
  }
}

// Bootstrap app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
