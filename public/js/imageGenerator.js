/**
 * Bychance - Image Generation Service
 * 
 * Supports:
 * - Single-request binary fetch pipeline (eliminates duplicate requests that trigger IP cooldowns)
 * - Automatic Pollinations free-tier cooldown detection with live second-by-second countdown & auto-retry
 * - Real-time phase & status callbacks (onStatus) for live UI telemetry
 * - Built-in Window Server & Security Engine integration (rate limiting, Safe-Mode guardrail, magic-byte verification)
 * - Model-aware prompt conditioning (FLUX.1 Anime, Illustrious XL, Animagine XL, Pony V6 XL, FLUX.1 Dev, FLUX 3D, SDXL Turbo)
 * - Hugging Face Inference API & Custom WebUI / A1111 / OpenAI-compatible image endpoints
 */

import { PerchanceEngine } from './perchanceEngine.js';
import { EmbeddedServer } from './embeddedServer.js';

export const ImageGenerator = {
  // Configurable settings
  settings: {
    provider: 'pollinations', // 'pollinations' | 'huggingface' | 'custom'
    defaultModel: 'flux-anime',
    pollinationsKey: '',
    hfToken: '',
    hfModel: 'cagliostrolab/animagine-xl-3.1',
    customEndpoint: '',
    customApiKey: ''
  },

  // Dimension presets optimized for free GPU inference (<= 1024 to prevent OOM)
  aspectRatios: {
    '1:1': { label: 'Square (1:1)', width: 1024, height: 1024, cssRatio: '1 / 1' },
    '2:3': { label: 'Portrait (2:3)', width: 680, height: 1024, cssRatio: '2 / 3' },
    '3:4': { label: 'Portrait (3:4)', width: 768, height: 1024, cssRatio: '3 / 4' },
    '9:16': { label: 'Story/Phone (9:16)', width: 576, height: 1024, cssRatio: '9 / 16' },
    '3:2': { label: 'Landscape (3:2)', width: 1024, height: 680, cssRatio: '3 / 2' },
    '4:3': { label: 'Landscape (4:3)', width: 1024, height: 768, cssRatio: '4 / 3' },
    '16:9': { label: 'Cinematic (16:9)', width: 1024, height: 576, cssRatio: '16 / 9' }
  },

  /**
   * Initialize settings from localStorage (non-sensitive) and sessionStorage (API keys)
   */
  init() {
    try {
      const saved = localStorage.getItem('bychance_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const hadLegacyKeys = Boolean(parsed.pollinationsKey || parsed.hfToken || parsed.customApiKey);
        this.settings = {
          ...this.settings,
          provider: parsed.provider || this.settings.provider,
          defaultModel: parsed.defaultModel || this.settings.defaultModel,
          hfModel: parsed.hfModel || this.settings.hfModel,
          customEndpoint: parsed.customEndpoint || this.settings.customEndpoint
        };
        if (hadLegacyKeys) {
          this.settings.pollinationsKey = parsed.pollinationsKey || '';
          this.settings.hfToken = parsed.hfToken || '';
          this.settings.customApiKey = parsed.customApiKey || '';
          this.saveSettings(this.settings);
        }
      }
      if (!EmbeddedServer.securityPolicy.memoryOnlySecrets) {
        const savedSecrets = sessionStorage.getItem('bychance_secrets');
        if (savedSecrets) {
          const parsedSecrets = JSON.parse(savedSecrets);
          this.settings.pollinationsKey = parsedSecrets.pollinationsKey || this.settings.pollinationsKey || '';
          this.settings.hfToken = parsedSecrets.hfToken || this.settings.hfToken || '';
          this.settings.customApiKey = parsedSecrets.customApiKey || this.settings.customApiKey || '';
        }
      }
    } catch (e) {
      console.warn('Could not load settings from storage');
    }
  },

  /**
   * Save non-sensitive settings to localStorage and API credentials to sessionStorage (unless RAM-only mode is active)
   */
  saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      const publicSettings = {
        provider: this.settings.provider,
        defaultModel: this.settings.defaultModel,
        hfModel: this.settings.hfModel,
        customEndpoint: this.settings.customEndpoint
      };
      localStorage.setItem('bychance_settings', JSON.stringify(publicSettings));

      if (EmbeddedServer.securityPolicy.memoryOnlySecrets) {
        sessionStorage.removeItem('bychance_secrets');
      } else {
        const secretSettings = {
          pollinationsKey: this.settings.pollinationsKey || '',
          hfToken: this.settings.hfToken || '',
          customApiKey: this.settings.customApiKey || ''
        };
        sessionStorage.setItem('bychance_secrets', JSON.stringify(secretSettings));
      }
    } catch (e) {
      console.warn('Could not save settings');
    }
  },

  /**
   * Deduplicate comma-separated prompt/negative tokens while preserving order
   */
  _dedupeTokens(tokenStr) {
    if (!tokenStr) return '';
    const seen = new Set();
    const result = [];
    for (const part of tokenStr.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(trimmed);
      }
    }
    return result.join(', ');
  },

  /**
   * Prepare the final prompt by:
   * 1. Resolving Perchance template syntax {a|b|c}, weights, and [wildcards]
   * 2. Applying model-specific prefix/suffix identifiers if Quality Booster is enabled
   * 3. Appending style preset tokens if selected
   * 4. Building a deduplicated model + style negative prompt
   */
  preparePrompt(rawPrompt, styleKey = '', enableBoosters = true, modelKey = 'flux-anime') {
    const profile = PerchanceEngine.modelProfiles[modelKey] || PerchanceEngine.modelProfiles['flux-anime'];

    // 1. Resolve Perchance curly brackets & [wildcards]
    let evaluated = PerchanceEngine.evaluate(rawPrompt);
    const evalLower = evaluated.toLowerCase();

    // 2. Apply style preset
    let styleSuffix = '';
    let styleNegative = '';
    let styleModel = null;

    if (styleKey && PerchanceEngine.stylePresets[styleKey]) {
      const preset = PerchanceEngine.stylePresets[styleKey];
      styleSuffix = preset.promptSuffix || '';
      styleNegative = preset.negativePrompt || '';
      styleModel = preset.recommendedModel || modelKey;
    }

    // 3. Apply Model-Specific Quality & Conditioning Boosters if enabled
    let prefixTokens = '';
    let suffixTokens = '';

    if (enableBoosters && profile) {
      if (profile.qualityPrefix) {
        const missingPrefix = profile.qualityPrefix
          .split(',')
          .map(s => s.trim())
          .filter(s => s && !evalLower.includes(s.toLowerCase()));
        if (missingPrefix.length > 0) {
          prefixTokens = missingPrefix.join(', ') + ', ';
        }
      }

      if (profile.qualitySuffix) {
        const missingSuffix = profile.qualitySuffix
          .split(',')
          .map(s => s.trim())
          .filter(s => s && !evalLower.includes(s.toLowerCase()));
        if (missingSuffix.length > 0) {
          suffixTokens = ', ' + missingSuffix.join(', ');
        }
      }
    }

    const rawFullPrompt = `${prefixTokens}${evaluated}${styleSuffix}${suffixTokens}`.trim();
    const fullPrompt = this._dedupeTokens(rawFullPrompt);

    const modelNegative = profile ? profile.defaultNegative : '';
    const mergedNegative = this._dedupeTokens([styleNegative, modelNegative].filter(Boolean).join(', '));

    return {
      evaluatedPrompt: evaluated,
      fullPrompt: fullPrompt,
      styleNegative: mergedNegative,
      recommendedModel: styleModel || modelKey,
      modelProfile: profile
    };
  },

  /**
   * Generate a single image with live phase telemetry, automatic cooldown wait, and magic-byte verification
   */
  async generateSingle({
    prompt,
    negativePrompt = '',
    style = '',
    aspectRatio = '2:3',
    seed = null,
    model = 'flux-anime',
    guidanceScale = 6.0,
    enableBoosters = true,
    batchIndex = 0,
    onStatus = null
  }) {
    const startTime = performance.now();
    const emitStatus = (phase, message, extra = {}) => {
      if (typeof onStatus === 'function') {
        onStatus({ index: batchIndex, phase, message, ...extra });
      }
    };

    emitStatus('conditioning', 'Phase 1/4: Evaluating Perchance syntax & model conditioning...');

    // Enforce Safe-Mode Prompt Guardrail on raw input first
    EmbeddedServer.enforcePromptSafety(prompt, negativePrompt);

    // Determine dimensions
    const ratioConfig = this.aspectRatios[aspectRatio] || this.aspectRatios['2:3'];
    const width = ratioConfig.width;
    const height = ratioConfig.height;

    const effectiveModelKey = PerchanceEngine.modelProfiles[model] ? model : 'flux-anime';
    const profile = PerchanceEngine.modelProfiles[effectiveModelKey];

    // Resolve prompt & model-aware style modifiers
    const prepared = this.preparePrompt(prompt, style, enableBoosters, effectiveModelKey);

    // Combine user negative prompt with model + style negative prompt
    const rawCombinedNegative = this._dedupeTokens(
      [negativePrompt, prepared.styleNegative]
        .filter(s => s && s.trim().length > 0)
        .join(', ')
    );

    // Re-verify resolved prompt & negative through Safe-Mode Guardrail
    const safetyChecked = EmbeddedServer.enforcePromptSafety(prepared.fullPrompt, rawCombinedNegative);
    const finalPrompt = safetyChecked.prompt;
    const combinedNegative = safetyChecked.negativePrompt;

    // Determine seed (random if not specified)
    const effectiveSeed = (seed !== null && seed !== undefined && seed !== '')
      ? Number(seed) + batchIndex
      : Math.floor(Math.random() * 2147483647);

    const pollinationsBackendModel = profile ? profile.pollinationsModel : 'flux';
    const modelShortName = profile ? profile.shortName : effectiveModelKey;

    emitStatus(
      'sampling',
      `Phase 2/4: Rendering ${width}×${height} anime illustration on ${modelShortName}...`,
      { evaluatedPrompt: prepared.evaluatedPrompt, seed: effectiveSeed, modelName: modelShortName }
    );

    let imageUrl = '';
    let imageBlob = null;

    EmbeddedServer.requestCount++;
    EmbeddedServer._log('GENERATE', `Rendering [${modelShortName}] ${width}x${height} (Seed: ${effectiveSeed})`);

    if (this.settings.provider === 'pollinations') {
      const result = await this._generatePollinationsSinglePass(
        finalPrompt,
        width,
        height,
        effectiveSeed,
        pollinationsBackendModel,
        combinedNegative,
        emitStatus
      );
      imageUrl = result.url;
      imageBlob = result.blob;
    } else if (this.settings.provider === 'huggingface') {
      const result = await this._generateHuggingFace(
        finalPrompt,
        combinedNegative,
        width,
        height,
        effectiveSeed,
        guidanceScale,
        profile
      );
      imageUrl = result.url;
      imageBlob = result.blob;
    } else if (this.settings.provider === 'custom') {
      const result = await this._generateCustom(
        finalPrompt,
        combinedNegative,
        width,
        height,
        effectiveSeed,
        guidanceScale
      );
      imageUrl = result.url;
      imageBlob = result.blob;
    }

    emitStatus('verifying', 'Phase 4/4: Verifying binary magic bytes & saving to gallery...');

    // Never persist API key query parameters in the saved record URL
    const sanitizedUrl = this._redactUrlSecrets(imageUrl);
    const displayUrl = imageBlob ? URL.createObjectURL(imageBlob) : sanitizedUrl;

    const duration = Math.round(performance.now() - startTime);

    return {
      id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      url: displayUrl,
      blob: imageBlob,
      prompt: prompt,
      evaluatedPrompt: prepared.evaluatedPrompt,
      fullPrompt: finalPrompt,
      negativePrompt: combinedNegative,
      style: style,
      model: effectiveModelKey,
      modelName: modelShortName,
      aspectRatio: aspectRatio,
      width: width,
      height: height,
      seed: effectiveSeed,
      guidanceScale: guidanceScale,
      durationMs: duration,
      timestamp: Date.now()
    };
  },

  /**
   * Strip sensitive query parameters (such as key, token, api_key) from a URL
   */
  _redactUrlSecrets(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      ['key', 'api_key', 'apikey', 'token', 'access_token'].forEach(param => {
        parsed.searchParams.delete(param);
      });
      return parsed.toString();
    } catch {
      return rawUrl.replace(/([?&])(key|api_key|apikey|token)=[^&]*/gi, '$1').replace(/[?&]$/, '');
    }
  },

  /**
   * Generate a batch of images (1, 2, or 4) with rate-limit verification
   * Executes sequentially on anonymous Pollinations to prevent simultaneous IP rate-limit collisions.
   */
  async generateBatch({
    prompt,
    negativePrompt = '',
    style = '',
    aspectRatio = '2:3',
    seed = null,
    model = 'flux-anime',
    guidanceScale = 6.0,
    enableBoosters = true,
    batchCount = 1,
    onProgress = null,
    onStatus = null
  }) {
    const count = Math.min(Math.max(parseInt(batchCount, 10) || 1, 1), 4);

    // Check built-in window server rate limiter before firing batch
    EmbeddedServer.checkRateLimit(count);

    const isAnonymousPollinations =
      this.settings.provider === 'pollinations' && !this.settings.pollinationsKey;

    if (isAnonymousPollinations && count > 1) {
      // Run sequentially so requests don't collide on the anonymous IP limiter
      const results = [];
      for (let i = 0; i < count; i++) {
        try {
          const res = await this.generateSingle({
            prompt,
            negativePrompt,
            style,
            aspectRatio,
            seed,
            model,
            guidanceScale,
            enableBoosters,
            batchIndex: i,
            onStatus
          });
          if (onProgress) onProgress({ index: i, count, result: res, success: true });
          results.push({ status: 'fulfilled', value: res });
        } catch (err) {
          if (onProgress) onProgress({ index: i, count, error: err, success: false });
          results.push({ status: 'rejected', reason: err });
        }
      }
      return results;
    }

    const promises = [];
    for (let i = 0; i < count; i++) {
      const p = this.generateSingle({
        prompt,
        negativePrompt,
        style,
        aspectRatio,
        seed,
        model,
        guidanceScale,
        enableBoosters,
        batchIndex: i,
        onStatus
      }).then(result => {
        if (onProgress) onProgress({ index: i, count, result, success: true });
        return result;
      }).catch(error => {
        if (onProgress) onProgress({ index: i, count, error, success: false });
        throw error;
      });

      promises.push(p);
    }

    return Promise.allSettled(promises);
  },

  /**
   * Helper to load an image via Image object with custom timeout and no-referrer protection
   */
  _preloadImage(url, timeoutMs = 35000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      let timer = setTimeout(() => {
        img.src = '';
        reject(new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s`));
      }, timeoutMs);

      img.onload = () => {
        clearTimeout(timer);
        resolve(url);
      };

      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error('Failed to load image from provider'));
      };

      img.src = url;
    });
  },

  /**
   * Sleep helper with live 1-second countdown status updates
   */
  async _waitWithCountdown(seconds, emitStatus, reasonPrefix) {
    const total = Math.min(Math.max(Math.ceil(seconds), 1), 46);
    for (let remaining = total; remaining > 0; remaining--) {
      emitStatus(
        'cooldown',
        `⏳ ${reasonPrefix} — Auto-resuming generation in ${remaining}s (or add a free Pollinations key in ⚙️ Settings for instant parallel renders)...`,
        { cooldownRemaining: remaining, cooldownTotal: total }
      );
      await new Promise(r => setTimeout(r, 1000));
    }
  },

  /**
   * Single-pass Pollinations fetch:
   * - Fetches the image ONCE via fetch() to avoid double-requesting the same URL
   * - If HTTP 402/429 (anonymous 45s IP rate limit) is returned, reads the exact "Retry after Ns"
   *   from the JSON body, displays a live countdown in the UI, and automatically completes!
   */
  async _generatePollinationsSinglePass(prompt, width, height, seed, model, negativePrompt, emitStatus) {
    const primaryUrl = this._buildPollinationsUrl(prompt, width, height, seed, model, negativePrompt, false);

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        const response = await fetch(primaryUrl, {
          method: 'GET',
          mode: 'cors',
          referrerPolicy: 'no-referrer',
          credentials: 'omit',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          emitStatus('downloading', 'Phase 3/4: Receiving high-resolution anime artwork...');
          const rawBlob = await response.blob();
          const validBlob = await EmbeddedServer.validateImageBlob(rawBlob);
          return { url: primaryUrl, blob: validBlob };
        }

        // Check for anonymous free-tier rate limit (HTTP 402 or 429)
        if ((response.status === 402 || response.status === 429) && attempt === 1) {
          let waitSec = 22;
          try {
            const errJson = await response.json();
            const msg = (errJson && errJson.error && errJson.error.message) ? errJson.error.message : '';
            const match = msg.match(/Retry after\s+(\d+)\s*s/i);
            if (match) {
              waitSec = parseInt(match[1], 10) + 2;
            }
          } catch {
            waitSec = 22;
          }

          EmbeddedServer._log('INFO', `Pollinations anonymous IP cooldown active; waiting ${waitSec}s to auto-resume`);
          await this._waitWithCountdown(
            waitSec,
            emitStatus,
            'Free GPU queue cooldown (1 image / 45s without key)'
          );
          emitStatus('sampling', 'Phase 2/4: Cooldown finished! Rendering anime illustration now...');
          continue;
        }
      } catch (fetchErr) {
        console.warn('Direct CORS fetch attempt warning:', fetchErr);
      }
    }

    // Fallback to Image element preload if CORS restricted direct fetch
    try {
      emitStatus('sampling', 'Phase 2/4: Loading artwork via direct image stream...');
      await this._preloadImage(primaryUrl, 30000);
      return { url: primaryUrl, blob: null };
    } catch (imgErr) {
      console.warn('Primary image preload failed:', imgErr);
    }

    // Final Fallback: gen.pollinations.ai (if user provided a key)
    if (this.settings.pollinationsKey) {
      const fallbackUrl = this._buildPollinationsUrl(prompt, width, height, seed, model, negativePrompt, true);
      try {
        await this._preloadImage(fallbackUrl, 25000);
        return { url: fallbackUrl, blob: null };
      } catch (err2) {
        console.warn('Secondary Pollinations host failed:', err2);
      }
    }

    throw new Error('Free GPU queue is busy (limit: 1 image per 45s without a key). Wait ~20 seconds and click Generate again, or add a free key from enter.pollinations.ai in Settings (⚙️).');
  },

  /**
   * Build clean Pollinations.ai URL
   */
  _buildPollinationsUrl(prompt, width, height, seed, model, negativePrompt, useGenHost = false) {
    const cleanPrompt = prompt.replace(/[/\\#?&]/g, ' ').replace(/\s+/g, ' ').trim();
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    
    const validModel = (model === 'turbo') ? 'turbo' : 'flux';

    const baseUrl = useGenHost
      ? `https://gen.pollinations.ai/image/${encodedPrompt}`
      : `https://image.pollinations.ai/prompt/${encodedPrompt}`;

    const safeParam = EmbeddedServer.securityPolicy.safeModeGuardrail ? '&safe=true' : '';
    let url = `${baseUrl}?width=${width}&height=${height}&seed=${seed}&model=${validModel}&nologo=true&enhance=false${safeParam}`;

    if (this.settings.pollinationsKey) {
      url += `&key=${encodeURIComponent(this.settings.pollinationsKey)}`;
    }

    if (negativePrompt) {
      const cleanNeg = negativePrompt.replace(/[/\\#?&]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanNeg) {
        url += `&negative_prompt=${encodeURIComponent(cleanNeg)}`;
      }
    }

    return url;
  },

  /**
   * Hugging Face Inference API generator with binary magic-byte validation
   */
  async _generateHuggingFace(prompt, negativePrompt, width, height, seed, guidanceScale = 6.5, profile = null) {
    if (!this.settings.hfToken) {
      throw new Error('Hugging Face User Access Token is required. Please set it in Settings.');
    }

    const defaultRepo = (profile && profile.hfRepo) ? profile.hfRepo : 'cagliostrolab/animagine-xl-3.1';
    const modelName = (this.settings.hfModel || defaultRepo).trim();
    if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(modelName)) {
      throw new Error('Invalid Hugging Face model repository identifier.');
    }
    const endpoint = `https://api-inference.huggingface.co/models/${modelName}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      headers: {
        'Authorization': `Bearer ${this.settings.hfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: negativePrompt,
          width: Math.min(width, 1024),
          height: Math.min(height, 1024),
          guidance_scale: Number(guidanceScale) || 6.5,
          seed: seed
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API Error (${response.status})`);
    }

    const rawBlob = await response.blob();
    const blob = await EmbeddedServer.validateImageBlob(rawBlob);
    const url = URL.createObjectURL(blob);
    return { url, blob };
  },

  /**
   * Custom Endpoint (WebUI / A1111 / OpenAI compatible) with endpoint & magic-byte security checks
   */
  async _generateCustom(prompt, negativePrompt, width, height, seed, guidanceScale = 6.5) {
    if (!this.settings.customEndpoint) {
      throw new Error('Custom Endpoint URL is required. Please configure it in Settings.');
    }

    const parsedEndpoint = EmbeddedServer.validateEndpointUrl(this.settings.customEndpoint);

    const headers = { 'Content-Type': 'application/json' };
    if (this.settings.customApiKey) {
      headers['Authorization'] = `Bearer ${this.settings.customApiKey}`;
    }

    const isTxt2Img = parsedEndpoint.pathname.includes('txt2img');
    const body = isTxt2Img ? {
      prompt: prompt,
      negative_prompt: negativePrompt,
      width: width,
      height: height,
      seed: seed,
      steps: 28,
      cfg_scale: Number(guidanceScale) || 6.5
    } : {
      prompt: prompt,
      size: `${width}x${height}`,
      n: 1,
      response_format: 'b64_json'
    };

    const response = await fetch(parsedEndpoint.toString(), {
      method: 'POST',
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Custom API Error (${response.status})`);
    }

    const json = await response.json();
    let b64 = '';

    if (json.images && json.images[0]) {
      b64 = json.images[0];
    } else if (json.data && json.data[0] && json.data[0].b64_json) {
      b64 = json.data[0].b64_json;
    } else if (json.data && json.data[0] && json.data[0].url) {
      const returnedUrl = String(json.data[0].url);
      if (!/^https?:\/\//i.test(returnedUrl) && !/^data:image\/(png|jpeg|webp);base64,/i.test(returnedUrl)) {
        throw new Error('Untrusted image URL scheme from custom endpoint');
      }
      return { url: this._redactUrlSecrets(returnedUrl), blob: null };
    } else {
      throw new Error('Unrecognized response format from custom endpoint');
    }

    const blob = EmbeddedServer.base64ToValidatedBlob(b64);
    const url = URL.createObjectURL(blob);

    return { url, blob };
  }
};
