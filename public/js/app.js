/**
 * Bychance - Main Application Controller
 */

import { PerchanceEngine } from './perchanceEngine.js';
import { EmbeddedServer } from './embeddedServer.js';
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
    this.activeTagCategory = 'all';
    this.tagSearchQuery = '';
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

  getActiveModelKey() {
    const modelSelect = document.getElementById('model-select');
    return (modelSelect && modelSelect.value) ? modelSelect.value : 'flux-anime';
  }

  async init() {
    console.log('Initializing Bychance application & Built-In Window Server...');

    // 1. Bind all UI and button events IMMEDIATELY and synchronously so buttons always work
    try { this.generateNewSeed(); } catch (e) { console.warn(e); }
    try { Viewer.init((savedItem) => this.applySavedSettings(savedItem)); } catch (e) { console.warn(e); }
    try { this.renderStylePresets(); } catch (e) { console.warn(e); }
    try { this.renderTemplateLibrary(); } catch (e) { console.warn(e); }
    try { this.renderTagBuilder(); } catch (e) { console.warn(e); }
    try { this.renderModelGuideModal(); } catch (e) { console.warn(e); }
    try { this.bindEvents(); } catch (e) { console.warn(e); }
    try { this.updateSyntaxPreview(); } catch (e) { console.warn(e); }
    try { this.updatePromptCoach(); } catch (e) { console.warn(e); }

    // 2. Initialize storage, built-in window server, and gallery asynchronously with fault isolation
    try { await Storage.init(); } catch (e) { console.warn('Storage init warning:', e); }
    try { await EmbeddedServer.init(); } catch (e) { console.warn('EmbeddedServer init warning:', e); }
    try { ImageGenerator.init(); } catch (e) { console.warn('ImageGenerator init warning:', e); }
    try { await this.renderServerSecurityModal(); } catch (e) { console.warn(e); }
    try { await this.loadGallery(); } catch (e) { console.warn(e); }

    // Listen for image deletion events from Viewer
    window.addEventListener('bychance:image-deleted', () => {
      this.loadGallery();
    });

    // Listen for built-in window server log events
    window.addEventListener('bychance:server-log', () => {
      const srvModal = document.getElementById('server-security-modal');
      if (srvModal && !srvModal.classList.contains('hidden')) {
        this.renderServerSecurityModal();
      }
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

    // Optimize Prompt for Active Model Button
    const btnOptimize = document.getElementById('btn-optimize-prompt');
    if (btnOptimize) {
      btnOptimize.addEventListener('click', () => {
        const promptInput = document.getElementById('prompt-input');
        const modelKey = this.getActiveModelKey();
        const profile = PerchanceEngine.modelProfiles[modelKey] || PerchanceEngine.modelProfiles['flux-anime'];
        if (promptInput) {
          promptInput.value = PerchanceEngine.optimizePromptForModel(promptInput.value, modelKey);
          this.updateSyntaxPreview();
          this.updatePromptCoach();
          this.showToast(`Optimized prompt with ${profile.shortName} identifiers! ⚡`);
        }
      });
    }

    // Auto-Tune Model Setup (CFG + Negative + Triggers)
    const btnApplyDefaults = document.getElementById('btn-apply-model-defaults');
    if (btnApplyDefaults) {
      btnApplyDefaults.addEventListener('click', () => {
        this.applyModelBestPractices(this.getActiveModelKey(), true);
      });
    }

    // Fill Recommended Negative Prompt for Active Model
    const btnFillNegative = document.getElementById('btn-fill-model-negative');
    if (btnFillNegative) {
      btnFillNegative.addEventListener('click', () => {
        const modelKey = this.getActiveModelKey();
        const profile = PerchanceEngine.modelProfiles[modelKey] || PerchanceEngine.modelProfiles['flux-anime'];
        const negInput = document.getElementById('negative-input');
        if (negInput && profile) {
          negInput.value = profile.defaultNegative;
          this.showToast(`Loaded ${profile.shortName} negative identifiers!`);
        }
      });
    }

    // Random Prompt Button (Dice)
    const btnRandom = document.getElementById('btn-random-prompt');
    if (btnRandom) {
      btnRandom.addEventListener('click', () => {
        const promptInput = document.getElementById('prompt-input');
        const modelKey = this.getActiveModelKey();
        if (promptInput) {
          promptInput.value = PerchanceEngine.generateRandomPrompt(modelKey);
          this.updateSyntaxPreview();
          this.updatePromptCoach();
          this.showToast('Rolled a new model-tuned anime scenario! 🎲');
        }
      });
    }

    // Random Perchance Syntax Template
    const btnRandomTemplate = document.getElementById('btn-random-template');
    if (btnRandomTemplate) {
      btnRandomTemplate.addEventListener('click', () => {
        const promptInput = document.getElementById('prompt-input');
        const modelKey = this.getActiveModelKey();
        if (promptInput) {
          promptInput.value = PerchanceEngine.generateRandomTemplate(modelKey);
          this.updateSyntaxPreview();
          this.updatePromptCoach();
          this.showToast('Created Perchance syntax template with {options}! ✨');
        }
      });
    }

    // Wildcard Quick-Insert Buttons
    document.querySelectorAll('.wildcard-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const token = btn.getAttribute('data-wildcard');
        if (token) {
          this.appendTokenToPrompt(token);
          this.showToast(`Inserted dynamic wildcard ${token} 🎲`);
        }
      });
    });

    // Re-roll Syntax Preview Button
    const btnRerollPreview = document.getElementById('btn-reroll-preview');
    if (btnRerollPreview) {
      btnRerollPreview.addEventListener('click', () => {
        this.updateSyntaxPreview();
      });
    }

    // Model Select change -> update coach & guidance recommendation
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
      modelSelect.addEventListener('change', () => {
        const modelKey = this.getActiveModelKey();
        const profile = PerchanceEngine.modelProfiles[modelKey];
        if (profile) {
          const guidanceSlider = document.getElementById('guidance-slider');
          const guidanceVal = document.getElementById('guidance-val');
          if (guidanceSlider && guidanceVal) {
            guidanceSlider.value = profile.recommendedGuidance;
            guidanceVal.textContent = Number(profile.recommendedGuidance).toFixed(1);
          }
          this.showToast(`Switched to ${profile.shortName} (Recommended CFG: ${profile.recommendedGuidance})`);
        }
        this.updatePromptCoach();
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

    // Live Syntax Preview & Coach on prompt typing
    const promptInput = document.getElementById('prompt-input');
    if (promptInput) {
      promptInput.addEventListener('input', () => {
        this.updateSyntaxPreview();
        this.updatePromptCoach();
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

    // Tag / Identifier Lexicon Search Filter
    const tagSearchInput = document.getElementById('tag-search-input');
    if (tagSearchInput) {
      tagSearchInput.addEventListener('input', (e) => {
        this.tagSearchQuery = e.target.value.trim().toLowerCase();
        this.renderTagBuilder();
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
      btn.addEventListener('click', () => {
        const targetModalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(targetModalId);
        if (modal) modal.classList.add('hidden');
      });
    });

    // Built-In Window Server & Security Console Modal toggle
    const btnOpenSrvSec = document.getElementById('btn-open-server-security');
    const srvSecModal = document.getElementById('server-security-modal');
    if (btnOpenSrvSec && srvSecModal) {
      btnOpenSrvSec.addEventListener('click', async () => {
        await this.renderServerSecurityModal();
        srvSecModal.classList.remove('hidden');
      });
    }

    // Security policy checkboxes inside the Built-In Server & Security Console
    const bindSecurityCheckbox = (id, policyKey, label) => {
      const el = document.getElementById(id);
      if (el) {
        el.checked = Boolean(EmbeddedServer.securityPolicy[policyKey]);
        el.addEventListener('change', async () => {
          EmbeddedServer.saveSecurityPolicy({ [policyKey]: el.checked });
          await this.renderServerSecurityModal();
          this.showToast(`${label}: ${el.checked ? 'Enabled 🛡️' : 'Disabled'}`);
        });
      }
    };
    bindSecurityCheckbox('sec-safe-mode', 'safeModeGuardrail', 'Safe-Mode Guardrail');
    bindSecurityCheckbox('sec-memory-only', 'memoryOnlySecrets', 'Strict RAM-Only Keys');
    bindSecurityCheckbox('sec-block-http', 'blockRemoteHttp', 'Remote HTTP Blocker');
    bindSecurityCheckbox('sec-strict-mime', 'strictMimeValidation', 'Magic-Byte Verification');

    // Test Built-In /api/status Endpoint button
    const btnTestApi = document.getElementById('btn-test-window-api');
    if (btnTestApi) {
      btnTestApi.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/status');
          const data = await res.json();
          await this.renderServerSecurityModal();
          this.showToast(`In-Window /api/status OK • Mode: ${data.modeLabel} (${data.uptimeSeconds}s uptime)`);
        } catch (err) {
          this.showToast('In-Window API check error');
        }
      });
    }

    // Emergency Credential Purge button
    const btnPurgeSecrets = document.getElementById('btn-purge-secrets');
    if (btnPurgeSecrets) {
      btnPurgeSecrets.addEventListener('click', async () => {
        EmbeddedServer.purgeCredentialsAndSession(ImageGenerator);
        this.populateSettingsForm();
        await this.renderServerSecurityModal();
        this.showToast('Wiped all API keys from memory & session! 🧹');
      });
    }

    // Model & Prompt Guide Modal toggle
    const btnOpenGuide = document.getElementById('btn-open-guide');
    const guideModal = document.getElementById('guide-modal');
    if (btnOpenGuide && guideModal) {
      btnOpenGuide.addEventListener('click', () => guideModal.classList.remove('hidden'));
    }

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
   * Append a token cleanly to the prompt input without duplicate commas
   */
  appendTokenToPrompt(token) {
    const promptInput = document.getElementById('prompt-input');
    if (!promptInput || !token) return;

    const current = promptInput.value.trim();
    if (!current) {
      promptInput.value = token;
    } else if (current.toLowerCase().includes(token.toLowerCase())) {
      this.showToast(`"${token}" is already in your prompt`);
      return;
    } else {
      const cleaned = current.replace(/,\s*$/, '');
      promptInput.value = `${cleaned}, ${token}`;
    }

    this.updateSyntaxPreview();
    this.updatePromptCoach();
  }

  /**
   * Append a negative identifier to the negative prompt input and reveal the drawer
   */
  appendTokenToNegative(token) {
    const negInput = document.getElementById('negative-input');
    const negContainer = document.getElementById('negative-prompt-container');
    const toggleBtn = document.getElementById('toggle-negative-btn');
    if (!negInput || !token) return;

    if (negContainer && negContainer.classList.contains('hidden')) {
      negContainer.classList.remove('hidden');
      if (toggleBtn) toggleBtn.textContent = 'Hide Negative Prompt ▲';
    }

    const current = negInput.value.trim();
    if (!current) {
      negInput.value = token;
    } else if (!current.toLowerCase().includes(token.toLowerCase())) {
      negInput.value = `${current.replace(/,\s*$/, '')}, ${token}`;
    }
  }

  /**
   * Apply model's recommended CFG, negative prompt, aspect ratio, and trigger optimization
   */
  applyModelBestPractices(modelKey, optimizePromptText = true) {
    const profile = PerchanceEngine.modelProfiles[modelKey] || PerchanceEngine.modelProfiles['flux-anime'];
    if (!profile) return;

    const modelSelect = document.getElementById('model-select');
    if (modelSelect && modelSelect.value !== modelKey) {
      modelSelect.value = modelKey;
    }

    // Set recommended guidance scale
    const guidanceSlider = document.getElementById('guidance-slider');
    const guidanceVal = document.getElementById('guidance-val');
    if (guidanceSlider && guidanceVal) {
      guidanceSlider.value = profile.recommendedGuidance;
      guidanceVal.textContent = Number(profile.recommendedGuidance).toFixed(1);
    }

    // Set recommended negative prompt
    const negInput = document.getElementById('negative-input');
    if (negInput) {
      negInput.value = profile.defaultNegative;
    }

    // Optimize prompt text if requested
    const promptInput = document.getElementById('prompt-input');
    if (optimizePromptText && promptInput) {
      promptInput.value = PerchanceEngine.optimizePromptForModel(promptInput.value, modelKey);
    }

    this.updateSyntaxPreview();
    this.updatePromptCoach();
    this.showToast(`Applied ${profile.shortName} best practices (CFG ${profile.recommendedGuidance} + Negative + Triggers)! ⚡`);
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
    const hasCurly = val.includes('{') && val.includes('}');
    const hasWildcard = /\[(subject|hair|haircolor|hairstyle|eyes|expression|pose|outfit|attire|accessory|scenery|setting|lighting|vfx|camera|angle|studio|quality)\]/i.test(val);

    if (hasCurly || hasWildcard) {
      const resolved = PerchanceEngine.evaluate(val);
      previewText.textContent = resolved;
      previewContainer.classList.remove('hidden');
    } else {
      previewContainer.classList.add('hidden');
    }
  }

  /**
   * Update the Real-Time Prompt Coach & Model Identifier Advisor panel
   */
  updatePromptCoach() {
    const promptInput = document.getElementById('prompt-input');
    const scoreBar = document.getElementById('coach-score-bar');
    const scoreBadge = document.getElementById('coach-score-badge');
    const modelBadge = document.getElementById('coach-model-badge');
    const pillarsGrid = document.getElementById('coach-pillars-grid');
    const recsRow = document.getElementById('coach-recommendations-row');
    const warningsRow = document.getElementById('coach-warnings-row');

    if (!promptInput || !pillarsGrid || !recsRow) return;

    const modelKey = this.getActiveModelKey();
    const analysis = PerchanceEngine.analyzePrompt(promptInput.value, modelKey);
    const profile = analysis.profile;

    if (scoreBar) {
      scoreBar.style.width = `${analysis.score}%`;
    }

    if (scoreBadge) {
      scoreBadge.textContent = `${analysis.level} (${analysis.presentCount}/${analysis.totalPillars})`;
      if (analysis.score >= 80) {
        scoreBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
      } else if (analysis.score >= 50) {
        scoreBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30';
      } else {
        scoreBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30';
      }
    }

    if (modelBadge && profile) {
      modelBadge.textContent = `${profile.shortName} • Optimal CFG ${profile.recommendedGuidance}`;
    }

    // Render 7 Pillar status chips
    pillarsGrid.innerHTML = analysis.pillars.map(p => {
      if (p.present) {
        return `
          <span class="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 flex items-center gap-1" title="Detected: ${this.escapeHtml(p.matchedWord)}">
            <span>✓</span>
            <span>${this.escapeHtml(p.label)}</span>
          </span>
        `;
      } else {
        const firstSug = p.suggestions[0] || '';
        return `
          <button type="button" data-suggest="${this.escapeHtml(firstSug)}" class="coach-pillar-add-btn px-2 py-0.5 rounded-lg text-[11px] font-medium bg-zinc-900 hover:bg-indigo-950/60 text-zinc-400 hover:text-indigo-200 border border-zinc-800 border-dashed hover:border-indigo-500/40 flex items-center gap-1 transition-all" title="Missing ${this.escapeHtml(p.label)} — Click to add '${this.escapeHtml(firstSug)}'">
            <span>+</span>
            <span>${this.escapeHtml(p.label)}</span>
          </button>
        `;
      }
    }).join('');

    pillarsGrid.querySelectorAll('.coach-pillar-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sug = btn.getAttribute('data-suggest');
        if (sug) {
          this.appendTokenToPrompt(sug);
          this.showToast(`Added ${sug} to strengthen prompt!`);
        }
      });
    });

    // Collect recommended identifiers to display (missing model triggers + missing pillar suggestions)
    const missingPillars = analysis.pillars.filter(p => !p.present);
    const quickChips = [];

    // First include up to 4 missing model-specific trigger words
    analysis.missingModelTriggers.slice(0, 4).forEach(trig => {
      quickChips.push({ token: trig, type: 'model' });
    });

    // Then include suggestions from any missing pillars
    missingPillars.forEach(mp => {
      mp.suggestions.slice(0, 2).forEach(s => {
        if (!quickChips.some(c => c.token.toLowerCase() === s.toLowerCase())) {
          quickChips.push({ token: s, type: 'pillar' });
        }
      });
    });

    if (quickChips.length > 0) {
      recsRow.innerHTML = `
        <span class="text-zinc-500 font-medium mr-1">Recommended Identifiers:</span>
        ${quickChips.slice(0, 8).map(c => `
          <button type="button" data-token="${this.escapeHtml(c.token)}" class="coach-token-btn px-2 py-0.5 rounded-md text-[11px] ${c.type === 'model' ? 'bg-indigo-950/50 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white' : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white'} transition-all">
            + ${this.escapeHtml(c.token)}
          </button>
        `).join('')}
      `;

      recsRow.querySelectorAll('.coach-token-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tok = btn.getAttribute('data-token');
          if (tok) {
            this.appendTokenToPrompt(tok);
            this.showToast(`Added identifier: ${tok}`);
          }
        });
      });
      recsRow.classList.remove('hidden');
    } else {
      recsRow.innerHTML = `<span class="text-emerald-400">✨ All core ${this.escapeHtml(profile.shortName)} trigger identifiers and prompt pillars are active!</span>`;
    }

    // Warnings
    if (warningsRow) {
      if (analysis.warnings.length > 0) {
        warningsRow.innerHTML = analysis.warnings.map(w => `<div>💡 ${this.escapeHtml(w)}</div>`).join('');
        warningsRow.classList.remove('hidden');
      } else {
        warningsRow.classList.add('hidden');
      }
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
      const triggersInfo = preset.triggerIdentifiers ? ` [Triggers: ${preset.triggerIdentifiers.join(', ')}]` : '';
      btn.title = `${preset.description}${triggersInfo}`;
      btn.innerHTML = `<span>🎨</span><span>${this.escapeHtml(preset.name)}</span>`;
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

        const styleKey = btn.getAttribute('data-style');
        if (styleKey && PerchanceEngine.stylePresets[styleKey]) {
          const preset = PerchanceEngine.stylePresets[styleKey];
          if (preset.recommendedModel && PerchanceEngine.modelProfiles[preset.recommendedModel]) {
            const modelSelect = document.getElementById('model-select');
            if (modelSelect && modelSelect.value !== preset.recommendedModel) {
              modelSelect.value = preset.recommendedModel;
              this.updatePromptCoach();
            }
          }
        }
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
      const recModel = tpl.recommendedModel && PerchanceEngine.modelProfiles[tpl.recommendedModel]
        ? PerchanceEngine.modelProfiles[tpl.recommendedModel].shortName
        : 'FLUX.1 Anime';

      const card = document.createElement('div');
      card.className = 'p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all cursor-pointer group flex flex-col justify-between';
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xl">${this.escapeHtml(tpl.icon)}</span>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">${this.escapeHtml(recModel)}</span>
              <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">${this.escapeHtml(tpl.category)}</span>
            </div>
          </div>
          <h4 class="font-medium text-sm text-zinc-200 group-hover:text-indigo-400 transition-colors mb-1.5">${this.escapeHtml(tpl.title)}</h4>
          <p class="text-xs text-zinc-400 line-clamp-3 font-mono leading-relaxed bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">${this.escapeHtml(tpl.template)}</p>
        </div>
        <div class="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800/50">
          <span class="text-xs text-indigo-400 font-medium">Use Template Formula →</span>
          <button class="roll-btn text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors" title="Evaluate immediately into a resolved prompt">🎲 Roll Single</button>
        </div>
      `;

      const applyTplModel = () => {
        if (tpl.recommendedModel && PerchanceEngine.modelProfiles[tpl.recommendedModel]) {
          const modelSelect = document.getElementById('model-select');
          if (modelSelect) modelSelect.value = tpl.recommendedModel;
        }
      };

      // Use raw template
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('roll-btn')) return;
        const promptInput = document.getElementById('prompt-input');
        if (promptInput) {
          promptInput.value = tpl.template;
          applyTplModel();
          this.updateSyntaxPreview();
          this.updatePromptCoach();
          document.getElementById('templates-modal').classList.add('hidden');
          this.showToast(`Loaded "${tpl.title}" template!`);
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
            applyTplModel();
            this.updateSyntaxPreview();
            this.updatePromptCoach();
            document.getElementById('templates-modal').classList.add('hidden');
            this.showToast(`Evaluated "${tpl.title}" prompt!`);
          }
        });
      }

      list.appendChild(card);
    });
  }

  /**
   * Render Interactive Identifier Lexicon & Tag Builder Modal with Search & Category Tabs
   */
  renderTagBuilder() {
    const container = document.getElementById('tags-container');
    const tabsContainer = document.getElementById('tag-category-tabs');
    if (!container) return;

    const categories = PerchanceEngine.getTagCategories();

    // Render Category Tabs
    if (tabsContainer) {
      const allActive = this.activeTagCategory === 'all';
      let tabsHtml = `
        <button type="button" data-cat-id="all" class="tag-cat-tab px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${allActive ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'}">
          All Categories (${categories.reduce((acc, c) => acc + c.tags.length, 0)})
        </button>
      `;

      categories.forEach(cat => {
        const isActive = this.activeTagCategory === cat.id;
        tabsHtml += `
          <button type="button" data-cat-id="${this.escapeHtml(cat.id)}" class="tag-cat-tab px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'}">
            ${this.escapeHtml(cat.name)}
          </button>
        `;
      });

      tabsContainer.innerHTML = tabsHtml;
      tabsContainer.querySelectorAll('.tag-cat-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this.activeTagCategory = tab.getAttribute('data-cat-id') || 'all';
          this.renderTagBuilder();
        });
      });
    }

    container.innerHTML = '';
    const query = this.tagSearchQuery;

    categories.forEach(cat => {
      if (this.activeTagCategory !== 'all' && this.activeTagCategory !== cat.id) return;

      const filteredTags = query
        ? cat.tags.filter(t => t.toLowerCase().includes(query) || cat.name.toLowerCase().includes(query))
        : cat.tags;

      if (filteredTags.length === 0) return;

      const section = document.createElement('div');
      section.className = 'p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2.5';
      const isNegative = Boolean(cat.isNegative);

      section.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h4 class="text-xs font-bold uppercase tracking-wider ${isNegative ? 'text-rose-400' : 'text-indigo-300'}">${this.escapeHtml(cat.name)}</h4>
          <span class="text-[11px] text-zinc-500">${this.escapeHtml(cat.description || '')}</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${filteredTags.map(tag => `
            <button type="button" class="tag-pill px-2.5 py-1 rounded-lg text-xs ${isNegative ? 'bg-rose-950/40 hover:bg-rose-600 text-rose-200 border border-rose-500/30' : 'bg-zinc-800/80 hover:bg-indigo-600 text-zinc-200 border border-zinc-700/50'} hover:text-white transition-colors" data-tag="${this.escapeHtml(tag)}" data-negative="${isNegative}">
              ${isNegative ? '−' : '+'} ${this.escapeHtml(tag)}
            </button>
          `).join('')}
        </div>
      `;

      section.querySelectorAll('.tag-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          const tag = btn.getAttribute('data-tag');
          const isNeg = btn.getAttribute('data-negative') === 'true';
          if (isNeg) {
            this.appendTokenToNegative(tag);
            this.showToast(`Added "${tag}" to Negative Prompt 🚫`);
          } else {
            this.appendTokenToPrompt(tag);
            this.showToast(`Added identifier: ${tag}`);
          }
        });
      });

      container.appendChild(section);
    });

    if (!container.children.length) {
      container.innerHTML = `<p class="text-center text-zinc-500 py-8 text-xs">No identifiers matched "${this.escapeHtml(query)}".</p>`;
    }
  }

  /**
   * Render Model Intelligence & Prompt Engineering Guide Modal
   */
  renderModelGuideModal() {
    const container = document.getElementById('guide-content');
    if (!container) return;

    const profiles = Object.values(PerchanceEngine.modelProfiles);

    const modelCardsHtml = profiles.map(p => `
      <div class="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3 flex flex-col justify-between">
        <div class="space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="text-sm font-bold text-white">${this.escapeHtml(p.name)}</h4>
              <p class="text-[11px] text-indigo-400 font-medium">${this.escapeHtml(p.encoder)}</p>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
              CFG ${p.recommendedGuidance} (${p.guidanceRange[0]}–${p.guidanceRange[1]})
            </span>
          </div>

          <p class="text-xs text-zinc-300 leading-relaxed">${this.escapeHtml(p.description)}</p>

          <div class="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">Recommended Prompt Formula</span>
            <p class="font-mono text-[11px] text-emerald-300">${this.escapeHtml(p.promptFormula)}</p>
          </div>

          <div>
            <span class="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">Recognized Model Trigger Identifiers (Click to Insert)</span>
            <div class="flex flex-wrap gap-1">
              ${p.triggerWords.map(tw => `
                <button type="button" data-guide-trigger="${this.escapeHtml(tw)}" class="guide-trigger-btn px-2 py-0.5 rounded-md bg-indigo-950/60 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/30 text-[11px] font-mono transition-colors">
                  + ${this.escapeHtml(tw)}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-1">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-rose-300 block">Recommended Negative Identifiers</span>
            <p class="font-mono text-[11px] text-zinc-400 line-clamp-2">${this.escapeHtml(p.defaultNegative)}</p>
          </div>

          <ul class="space-y-1 text-[11px] text-zinc-400 list-disc list-inside">
            ${p.tips.map(t => `<li>${this.escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>

        <div class="pt-3 border-t border-zinc-800/80 flex items-center justify-end">
          <button type="button" data-select-model="${this.escapeHtml(p.id)}" class="guide-select-model-btn w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all">
            ⚡ Activate ${this.escapeHtml(p.shortName)} &amp; Auto-Tune Setup
          </button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <!-- Perchance Syntax & Wildcards Cheat Sheet -->
      <div class="p-4 rounded-2xl bg-indigo-950/25 border border-indigo-500/30 space-y-3">
        <h4 class="text-sm font-bold text-white flex items-center gap-2">
          <span>🎲</span>
          <span>Perchance Dynamic Syntax &amp; Wildcards Reference</span>
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <span class="text-[11px] font-semibold text-indigo-300 block mb-1">1. Choice Sets</span>
            <code class="text-xs text-zinc-200 font-mono block mb-1">{silver|pink|aqua} hair</code>
            <p class="text-[11px] text-zinc-400">Randomly picks one option per image in a batch.</p>
          </div>
          <div class="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <span class="text-[11px] font-semibold text-indigo-300 block mb-1">2. Percentage &amp; Ratio Weights</span>
            <code class="text-xs text-zinc-200 font-mono block mb-1">{70% common|30% rare}</code>
            <p class="text-[11px] text-zinc-400">Also supports ratio weights like <code class="text-indigo-300">{3::kimono|1::armor}</code>.</p>
          </div>
          <div class="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <span class="text-[11px] font-semibold text-indigo-300 block mb-1">3. Nested Expressions</span>
            <code class="text-xs text-zinc-200 font-mono block mb-1">{cute {cat|fox} girl|ronin}</code>
            <p class="text-[11px] text-zinc-400">Evaluates from the innermost curly braces outward.</p>
          </div>
          <div class="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
            <span class="text-[11px] font-semibold text-pink-300 block mb-1">4. Built-in [Wildcards]</span>
            <code class="text-xs text-pink-200 font-mono block mb-1">[subject], [hair], [scenery]</code>
            <p class="text-[11px] text-zinc-400">Pulls curated phrases from Bychance's anime dictionary.</p>
          </div>
        </div>
      </div>

      <!-- Model Architecture Cards -->
      <div>
        <h4 class="text-sm font-bold text-white mb-3">Supported Anime Model Profiles &amp; Conditioning Architectures</h4>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          ${modelCardsHtml}
        </div>
      </div>
    `;

    container.querySelectorAll('.guide-trigger-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const trig = btn.getAttribute('data-guide-trigger');
        if (trig) {
          this.appendTokenToPrompt(trig);
          this.showToast(`Inserted trigger identifier: ${trig}`);
        }
      });
    });

    container.querySelectorAll('.guide-select-model-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mId = btn.getAttribute('data-select-model');
        if (mId) {
          this.applyModelBestPractices(mId, true);
          const modal = document.getElementById('guide-modal');
          if (modal) modal.classList.add('hidden');
        }
      });
    });
  }

  /**
   * Render Built-In Window Server & Security Console Modal
   */
  async renderServerSecurityModal() {
    const status = await EmbeddedServer.getStatus();
    const audit = EmbeddedServer.runSecurityAudit();

    const headerBadge = document.getElementById('header-server-badge');
    if (headerBadge) {
      headerBadge.textContent = status.mode === 'hybrid'
        ? `Hybrid Server • ${audit.score}% Safe`
        : `Window Server • ${audit.score}% Safe`;
    }

    const modeEl = document.getElementById('srv-mode-label');
    if (modeEl) modeEl.textContent = status.modeLabel;

    const scoreEl = document.getElementById('srv-security-score');
    if (scoreEl) scoreEl.textContent = `${audit.score}% Verified (${audit.passedCount}/${audit.totalChecks} Checks)`;

    const reqEl = document.getElementById('srv-requests-count');
    if (reqEl) reqEl.textContent = `${status.requestsHandled} handled • ${status.threatsBlocked} blocked`;

    const storeEl = document.getElementById('srv-storage-count');
    if (storeEl) storeEl.textContent = `${status.galleryItemsStored} items in IndexedDB`;

    // Sync checkbox states
    const syncCheck = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };
    syncCheck('sec-safe-mode', status.securityPolicy.safeModeGuardrail);
    syncCheck('sec-memory-only', status.securityPolicy.memoryOnlySecrets);
    syncCheck('sec-block-http', status.securityPolicy.blockRemoteHttp);
    syncCheck('sec-strict-mime', status.securityPolicy.strictMimeValidation);

    const auditList = document.getElementById('srv-audit-list');
    if (auditList) {
      auditList.innerHTML = audit.checks.map(c => `
        <div class="p-3 rounded-xl border ${c.passed ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-amber-950/25 border-amber-500/30'} flex items-start gap-2.5">
          <span class="text-sm mt-0.5">${c.passed ? '✅' : '⚠️'}</span>
          <div>
            <div class="font-semibold text-xs ${c.passed ? 'text-emerald-300' : 'text-amber-300'}">${this.escapeHtml(c.title)}</div>
            <p class="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">${this.escapeHtml(c.detail)}</p>
          </div>
        </div>
      `).join('');
    }

    const logOutput = document.getElementById('srv-log-output');
    if (logOutput) {
      if (EmbeddedServer.logs.length === 0) {
        logOutput.innerHTML = `<div class="text-zinc-500">No requests logged yet.</div>`;
      } else {
        logOutput.innerHTML = EmbeddedServer.logs.map(entry => {
          const badgeClass = entry.level === 'SECURITY'
            ? 'text-amber-400'
            : entry.level === 'API'
              ? 'text-emerald-400'
              : 'text-indigo-400';
          return `<div><span class="text-zinc-500">[${this.escapeHtml(entry.time)}]</span> <span class="font-bold ${badgeClass}">${this.escapeHtml(entry.level)}</span> ${this.escapeHtml(entry.message)}</div>`;
        }).join('');
      }
    }
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
    const guidanceScale = guidanceSlider ? parseFloat(guidanceSlider.value) : 5.5;

    // Model selection
    const model = this.getActiveModelKey();

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
   * Handle the primary Generate action with live stopwatch & telemetry HUD
   */
  async handleGenerate() {
    if (this.isGenerating) return;

    const params = this.getGenerationParams();
    if (!params.prompt) {
      this.showToast('Please enter a prompt or roll a random one! 🎲');
      return;
    }

    const profile = PerchanceEngine.modelProfiles[params.model] || PerchanceEngine.modelProfiles['flux-anime'];
    this.isGenerating = true;
    this._genStartMs = performance.now();
    this.updateGeneratingUI(true, false);

    // Setup preview area with placeholder skeleton cards
    this.setupBatchPreviewGrid(params.batchCount, params.aspectRatio);

    // Immediately show toast & smoothly scroll telemetry / live stage into view
    this.showToast(`🚀 Generating ${params.batchCount} anime image${params.batchCount > 1 ? 's' : ''} with ${profile.shortName}...`);
    const hud = document.getElementById('generation-telemetry-hud');
    if (hud) {
      setTimeout(() => {
        hud.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    }

    let successCount = 0;

    try {
      const results = await ImageGenerator.generateBatch({
        ...params,
        onStatus: (statusInfo) => {
          this.handleGenerationStatus(statusInfo);
        },
        onProgress: (progress) => {
          this.handleImageItemProgress(progress);
        }
      });

      // Save successful generations into storage and refresh gallery
      for (const res of results) {
        if (res.status === 'fulfilled' && res.value) {
          successCount++;
          await Storage.saveImage(res.value);
        }
      }

      await this.loadGallery();

      if (successCount > 0) {
        this.showToast(`✨ Generated ${successCount} anime masterpiece${successCount > 1 ? 's' : ''}!`);
      } else {
        const firstReason = results.find(r => r.status === 'rejected')?.reason;
        this.showToast(`⚠️ ${firstReason ? firstReason.message : 'Generation timed out'}`);
      }

      // Randomize seed if unlocked
      if (!this.isSeedLocked) {
        this.generateNewSeed();
      }
    } catch (err) {
      console.error('Generation batch error:', err);
      this.showToast(`Generation failed: ${err.message || 'Network error'}`);
    } finally {
      this.isGenerating = false;
      this.updateGeneratingUI(false, successCount > 0);
    }
  }

  /**
   * Update live telemetry HUD and card status text during generation phases
   */
  handleGenerationStatus({ index = 0, phase, message, evaluatedPrompt, cooldownRemaining, cooldownTotal }) {
    const statusText = document.getElementById('telemetry-status-text');
    const phaseBadge = document.getElementById('telemetry-phase-badge');
    const progressFill = document.getElementById('telemetry-progress-fill');
    const activePromptEl = document.getElementById('telemetry-active-prompt');

    if (statusText && message) {
      statusText.textContent = message;
    }
    if (evaluatedPrompt && activePromptEl) {
      activePromptEl.textContent = evaluatedPrompt;
    }

    if (phaseBadge && progressFill) {
      if (phase === 'conditioning') {
        phaseBadge.textContent = 'STEP 1/4 • SYNTAX';
        phaseBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0';
        progressFill.style.width = '20%';
      } else if (phase === 'cooldown') {
        phaseBadge.textContent = `⏳ QUEUE WAIT (${cooldownRemaining || ''}s)`;
        phaseBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0';
        const pct = cooldownTotal ? Math.round(((cooldownTotal - (cooldownRemaining || 0)) / cooldownTotal) * 60) + 15 : 40;
        progressFill.style.width = `${pct}%`;
      } else if (phase === 'sampling') {
        phaseBadge.textContent = 'STEP 2/4 • RENDERING GPU';
        phaseBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0';
        progressFill.style.width = '65%';
      } else if (phase === 'downloading') {
        phaseBadge.textContent = 'STEP 3/4 • RECEIVING';
        phaseBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0';
        progressFill.style.width = '88%';
      } else if (phase === 'verifying') {
        phaseBadge.textContent = 'STEP 4/4 • VERIFYING';
        phaseBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0';
        progressFill.style.width = '96%';
      }
    }

    const cardStatus = document.getElementById(`card-status-${index}`);
    if (cardStatus && message) {
      cardStatus.textContent = message;
    }
  }

  /**
   * Setup placeholder skeleton cards in the live preview area
   */
  setupBatchPreviewGrid(count, aspectRatio) {
    const grid = document.getElementById('live-preview-grid');
    const stageHeader = document.getElementById('live-stage-header');
    const stageTitle = document.getElementById('live-stage-title');
    const stageSubtitle = document.getElementById('live-stage-subtitle');
    const stageDot = document.getElementById('live-stage-dot');
    if (!grid) return;

    if (stageHeader) stageHeader.classList.remove('hidden');
    if (stageTitle) stageTitle.textContent = 'Live Generation Stage (Rendering...)';
    if (stageSubtitle) stageSubtitle.textContent = 'Streaming from AI inference engine...';
    if (stageDot) stageDot.className = 'w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping';

    grid.innerHTML = '';
    const ratioInfo = ImageGenerator.aspectRatios[aspectRatio] || ImageGenerator.aspectRatios['2:3'];
    const profile = PerchanceEngine.modelProfiles[this.getActiveModelKey()];
    const modelLabel = profile ? profile.shortName : 'FLUX.1 Anime';

    // Adjust grid columns based on batch size
    grid.className = count === 1 
      ? 'grid grid-cols-1 max-w-lg mx-auto gap-4' 
      : (count === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'grid grid-cols-2 sm:grid-cols-4 gap-4');

    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.id = `preview-card-${i}`;
      card.className = 'relative rounded-2xl overflow-hidden border-2 border-indigo-500/40 bg-zinc-900 flex flex-col items-center justify-center shadow-2xl shadow-indigo-950/40 group cursor-wait';
      card.style.aspectRatio = ratioInfo.cssRatio;

      card.innerHTML = `
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-zinc-950 to-purple-950/30 animate-pulse flex flex-col items-center justify-center p-5 text-center">
          <div class="relative mb-4">
            <div class="w-14 h-14 border-4 border-indigo-500/30 rounded-full"></div>
            <div class="w-14 h-14 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
            <span class="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-indigo-300" id="card-timer-${i}">0.0s</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
            Rendering Artwork #${i + 1} • ${this.escapeHtml(modelLabel)}
          </span>
          <span id="card-status-${i}" class="text-xs font-medium text-zinc-200 max-w-xs leading-relaxed">
            Phase 1/4: Conditioning prompt &amp; connecting to GPU...
          </span>
          <span class="text-[10px] text-zinc-500 mt-2">Typical render time: 4–12 seconds</span>
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
        <div class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-emerald-950/85 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold backdrop-blur">
          ✓ Rendered in ${safeDuration}s
        </div>
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

      card.classList.remove('cursor-wait', 'border-indigo-500/40');
      card.classList.add('cursor-pointer', 'border-emerald-500/50');
      card.addEventListener('click', () => {
        Viewer.open(result, this.galleryItems);
      });
    } else {
      const safeErr = this.escapeHtml(error ? error.message : 'Timeout');
      card.classList.remove('cursor-wait');
      card.innerHTML = `
        <div class="p-5 text-center space-y-2">
          <span class="text-3xl block">⚠️</span>
          <p class="text-xs text-rose-400 font-bold">Generation Paused / Busy</p>
          <p class="text-[11px] text-zinc-300 leading-relaxed max-w-xs mx-auto">${safeErr}</p>
        </div>
      `;
    }
  }

  /**
   * Update UI generation state (button loading spinner, live stopwatch, telemetry HUD)
   */
  updateGeneratingUI(loading, succeeded = false) {
    const btn = document.getElementById('btn-generate');
    const hud = document.getElementById('generation-telemetry-hud');
    const elapsedEl = document.getElementById('telemetry-elapsed');
    const spinner = document.getElementById('telemetry-spinner');
    const phaseBadge = document.getElementById('telemetry-phase-badge');
    const statusText = document.getElementById('telemetry-status-text');
    const progressFill = document.getElementById('telemetry-progress-fill');
    const activePromptEl = document.getElementById('telemetry-active-prompt');
    const stageTitle = document.getElementById('live-stage-title');
    const stageSubtitle = document.getElementById('live-stage-subtitle');
    const stageDot = document.getElementById('live-stage-dot');

    if (this._telemetryTimer) {
      clearInterval(this._telemetryTimer);
      this._telemetryTimer = null;
    }

    if (loading) {
      const promptInput = document.getElementById('prompt-input');
      if (activePromptEl && promptInput) {
        activePromptEl.textContent = PerchanceEngine.evaluate(promptInput.value);
      }
      if (hud) hud.classList.remove('hidden');
      if (spinner) spinner.classList.remove('hidden');
      if (progressFill) progressFill.style.width = '18%';

      // Start 100ms live stopwatch
      this._telemetryTimer = setInterval(() => {
        const sec = ((performance.now() - (this._genStartMs || performance.now())) / 1000).toFixed(1);
        if (elapsedEl) elapsedEl.textContent = `${sec}s`;
        if (btn) {
          btn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Generating Anime Artwork... (${sec}s)</span>
          `;
        }
        document.querySelectorAll('[id^="card-timer-"]').forEach(el => {
          el.textContent = `${sec}s`;
        });
      }, 100);

      if (btn) {
        btn.disabled = true;
      }
    } else {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Generate Anime</span><span class="text-xs opacity-80 font-normal ml-1 hidden sm:inline">(Ctrl+↵)</span>`;
      }
      if (spinner) spinner.classList.add('hidden');

      const totalSec = ((performance.now() - (this._genStartMs || performance.now())) / 1000).toFixed(1);
      if (elapsedEl) elapsedEl.textContent = `${totalSec}s`;

      if (succeeded) {
        if (phaseBadge) {
          phaseBadge.textContent = '✓ COMPLETE (100%)';
          phaseBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0';
        }
        if (statusText) {
          statusText.textContent = `Finished rendering in ${totalSec}s! Saved to your Artwork Gallery below.`;
        }
        if (progressFill) {
          progressFill.style.width = '100%';
          progressFill.classList.remove('animate-pulse');
        }
        if (stageTitle) stageTitle.textContent = 'Latest Generated Anime Artwork';
        if (stageSubtitle) stageSubtitle.textContent = `Rendered in ${totalSec}s • Click artwork to open Fullscreen Zoom & Inspector`;
        if (stageDot) stageDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
      } else {
        if (phaseBadge) {
          phaseBadge.textContent = '⚠️ PAUSED';
          phaseBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0';
        }
        if (stageDot) stageDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-400';
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
      const safeModel = this.escapeHtml(item.modelName || item.model || 'FLUX.1 Anime');

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
      if (modelSelect && PerchanceEngine.modelProfiles[item.model]) {
        modelSelect.value = item.model;
      }
    }

    this.updateSyntaxPreview();
    this.updatePromptCoach();
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

// Bootstrap app immediately if DOM is already interactive/complete, or on DOMContentLoaded
function bootstrapBychance() {
  if (window.__bychanceBootstrapped) return;
  window.__bychanceBootstrapped = true;
  const app = new App();
  window.bychanceApp = app;
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapBychance);
} else {
  bootstrapBychance();
}
