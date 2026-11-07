/**
 * Bychance - Image Generation Service
 * 
 * Supports:
 * - Model-aware prompt conditioning (FLUX.1 Anime, Illustrious XL, Animagine XL, Pony V6 XL, FLUX.1 Dev, FLUX 3D, SDXL Turbo)
 * - Pollinations.ai FLUX & Turbo models (Free, zero-key, high-res)
 * - Automatic host failover (image.pollinations.ai & gen.pollinations.ai)
 * - Hugging Face Inference API with model-specific repository mapping & guidance_scale
 * - Custom WebUI / A1111 / OpenAI-compatible image endpoints
 * - Optimized aspect ratio dimension mapping (max-edge 1024 to prevent GPU timeouts)
 * - Deduplicated quality boosting & model-calibrated negative prompt enrichment
 * - Batch generation (1, 2, 4 images)
 */

import { PerchanceEngine } from './perchanceEngine.js';

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
        // Migrate any legacy keys out of persistent localStorage into sessionStorage
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
      const savedSecrets = sessionStorage.getItem('bychance_secrets');
      if (savedSecrets) {
        const parsedSecrets = JSON.parse(savedSecrets);
        this.settings.pollinationsKey = parsedSecrets.pollinationsKey || this.settings.pollinationsKey || '';
        this.settings.hfToken = parsedSecrets.hfToken || this.settings.hfToken || '';
        this.settings.customApiKey = parsedSecrets.customApiKey || this.settings.customApiKey || '';
      }
    } catch (e) {
      console.warn('Could not load settings from storage');
    }
  },

  /**
   * Save non-sensitive settings to localStorage and API credentials to sessionStorage
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

      const secretSettings = {
        pollinationsKey: this.settings.pollinationsKey || '',
        hfToken: this.settings.hfToken || '',
        customApiKey: this.settings.customApiKey || ''
      };
      sessionStorage.setItem('bychance_secrets', JSON.stringify(secretSettings));
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
        // Only prepend prefix tokens that are not already in the prompt
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
   * Generate a single image with automatic retries and failover
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
    batchIndex = 0
  }) {
    const startTime = performance.now();

    // Determine dimensions
    const ratioConfig = this.aspectRatios[aspectRatio] || this.aspectRatios['2:3'];
    const width = ratioConfig.width;
    const height = ratioConfig.height;

    const effectiveModelKey = PerchanceEngine.modelProfiles[model] ? model : 'flux-anime';
    const profile = PerchanceEngine.modelProfiles[effectiveModelKey];

    // Resolve prompt & model-aware style modifiers
    const prepared = this.preparePrompt(prompt, style, enableBoosters, effectiveModelKey);
    const finalPrompt = prepared.fullPrompt;

    // Combine user negative prompt with model + style negative prompt
    const combinedNegative = this._dedupeTokens(
      [negativePrompt, prepared.styleNegative]
        .filter(s => s && s.trim().length > 0)
        .join(', ')
    );

    // Determine seed (random if not specified)
    const effectiveSeed = (seed !== null && seed !== undefined && seed !== '')
      ? Number(seed) + batchIndex
      : Math.floor(Math.random() * 2147483647);

    const pollinationsBackendModel = profile ? profile.pollinationsModel : 'flux';

    let imageUrl = '';
    let imageBlob = null;

    if (this.settings.provider === 'pollinations') {
      imageUrl = await this._generatePollinationsWithFailover(
        finalPrompt,
        width,
        height,
        effectiveSeed,
        pollinationsBackendModel,
        combinedNegative
      );
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

    // Attempt to convert to Blob for local IndexedDB caching if possible
    if (!imageBlob && imageUrl) {
      try {
        const fetchRes = await fetch(imageUrl, { mode: 'cors' });
        if (fetchRes.ok) {
          imageBlob = await fetchRes.blob();
        }
      } catch (err) {
        // Direct browser <img> rendering will still work even if CORS restricts Blob reading
      }
    }

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
      modelName: profile ? profile.shortName : effectiveModelKey,
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
   * Generate a batch of images (1, 2, or 4)
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
    onProgress = null
  }) {
    const count = Math.min(Math.max(parseInt(batchCount, 10) || 1, 1), 4);
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
        batchIndex: i
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
   * Helper to load an image via Image object with custom timeout
   */
  _preloadImage(url, timeoutMs = 35000) {
    return new Promise((resolve, reject) => {
      const img = new Image();
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
   * Generates using Pollinations with automatic host failover & fallback models
   */
  async _generatePollinationsWithFailover(prompt, width, height, seed, model, negativePrompt) {
    // 1. Primary Attempt: image.pollinations.ai
    const primaryUrl = this._buildPollinationsUrl(prompt, width, height, seed, model, negativePrompt, false);
    try {
      await this._preloadImage(primaryUrl, 30000);
      return primaryUrl;
    } catch (err1) {
      console.warn('Pollinations primary endpoint failed or timed out:', err1);
    }

    // 2. Fallback Attempt: gen.pollinations.ai
    const fallbackUrl = this._buildPollinationsUrl(prompt, width, height, seed, model, negativePrompt, true);
    try {
      await this._preloadImage(fallbackUrl, 25000);
      return fallbackUrl;
    } catch (err2) {
      console.warn('Pollinations secondary endpoint failed:', err2);
    }

    // 3. Fallback Model: turbo model (fastest inference, takes ~2 seconds)
    if (model !== 'turbo') {
      const turboUrl = this._buildPollinationsUrl(prompt, width, height, seed, 'turbo', negativePrompt, false);
      try {
        await this._preloadImage(turboUrl, 20000);
        return turboUrl;
      } catch (err3) {
        console.warn('Pollinations turbo fallback failed:', err3);
      }
    }

    throw new Error('Image generation provider failed or timed out. If using Pollinations, add a free key in Settings (⚙️), or configure Hugging Face / a local WebUI endpoint.');
  },

  /**
   * Build clean Pollinations.ai URL
   */
  _buildPollinationsUrl(prompt, width, height, seed, model, negativePrompt, useGenHost = false) {
    // Clean prompt of special characters that interfere with path routing
    const cleanPrompt = prompt.replace(/[/\\#?&]/g, ' ').replace(/\s+/g, ' ').trim();
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    
    // Model mapping: Pollinations supports 'flux' and 'turbo'
    const validModel = (model === 'turbo') ? 'turbo' : 'flux';

    const baseUrl = useGenHost
      ? `https://gen.pollinations.ai/image/${encodedPrompt}`
      : `https://image.pollinations.ai/prompt/${encodedPrompt}`;

    let url = `${baseUrl}?width=${width}&height=${height}&seed=${seed}&model=${validModel}&nologo=true&enhance=false`;

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
   * Hugging Face Inference API generator
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

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return { url, blob };
  },

  /**
   * Custom Endpoint (WebUI / A1111 / OpenAI compatible)
   */
  async _generateCustom(prompt, negativePrompt, width, height, seed, guidanceScale = 6.5) {
    if (!this.settings.customEndpoint) {
      throw new Error('Custom Endpoint URL is required. Please configure it in Settings.');
    }

    let parsedEndpoint;
    try {
      parsedEndpoint = new URL(this.settings.customEndpoint);
    } catch {
      throw new Error('Invalid Custom Endpoint URL.');
    }
    if (parsedEndpoint.protocol !== 'http:' && parsedEndpoint.protocol !== 'https:') {
      throw new Error('Custom Endpoint URL must use http:// or https://');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (this.settings.customApiKey) {
      headers['Authorization'] = `Bearer ${this.settings.customApiKey}`;
    }

    // Default to A1111 sdapi/v1/txt2img payload format or OpenAI format
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
      if (!/^https?:\/\//i.test(returnedUrl) && !/^data:image\//i.test(returnedUrl)) {
        throw new Error('Untrusted image URL scheme from custom endpoint');
      }
      return { url: this._redactUrlSecrets(returnedUrl), blob: null };
    } else {
      throw new Error('Unrecognized response format from custom endpoint');
    }

    const byteCharacters = atob(b64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    const url = URL.createObjectURL(blob);

    return { url, blob };
  }
};
