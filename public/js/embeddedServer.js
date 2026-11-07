/**
 * Bychance - Built-In Window Server & Security Engine
 *
 * Embeds the complete backend server directly inside the web application window:
 * 1. Virtual HTTP router intercepting /api/status, /api/gallery, /api/save-image, /api/security-audit
 *    so the app operates 100% self-contained in any browser window (file://, static host, or localhost)
 *    with automatic hybrid sync if a local Python companion server is present.
 * 2. Multi-layer user security suite:
 *    - Magic-byte & MIME validation for all generated/imported images (blocks SVG/HTML XSS payloads)
 *    - Secret redaction & Memory-Only / SessionStorage credential isolation
 *    - Remote cleartext HTTP blocker (prevents leaking API keys over unencrypted non-local HTTP)
 *    - Configurable Safe-Mode Prompt Guardrail (enforces safe anime generation & blocks unsafe tokens)
 *    - Client-side rate limiter & request sanitization log
 */

import { Storage } from './storage.js';
import { PerchanceEngine } from './perchanceEngine.js';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export const EmbeddedServer = {
  startTime: Date.now(),
  mode: 'in-window', // 'in-window' | 'hybrid'
  localBackendOnline: false,
  requestCount: 0,
  blockedCount: 0,
  logs: [],

  // User-configurable security policies (persisted safely in localStorage without secrets)
  securityPolicy: {
    safeModeGuardrail: true,       // Enforces safe/general anime rating & blocks explicit tokens
    memoryOnlySecrets: false,      // If true, API keys live only in JS RAM and never touch sessionStorage
    blockRemoteHttp: true,         // Blocks sending requests/keys to non-localhost plaintext http:// URLs
    strictMimeValidation: true,    // Verifies PNG/JPEG/WebP magic bytes & rejects SVG/HTML blobs
    rateLimitPerMinute: 24         // Max image generations per minute to prevent accidental runaway loops
  },

  _rateWindow: [],
  _originalFetch: null,

  /**
   * Initialize the built-in window server, virtual fetch interceptor, and security policies
   */
  async init() {
    this._loadSecurityPolicy();
    this._installVirtualServerInterceptor();
    this._log('INFO', 'Built-in Window Server initialized (v2.0 Embedded Engine)');

    // Probe whether optional local Python companion is also running
    await this._probeCompanionBackend();
    return this.getStatus();
  },

  _loadSecurityPolicy() {
    try {
      const saved = localStorage.getItem('bychance_security_policy');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.securityPolicy = {
          ...this.securityPolicy,
          safeModeGuardrail: parsed.safeModeGuardrail !== undefined ? Boolean(parsed.safeModeGuardrail) : true,
          memoryOnlySecrets: Boolean(parsed.memoryOnlySecrets),
          blockRemoteHttp: parsed.blockRemoteHttp !== undefined ? Boolean(parsed.blockRemoteHttp) : true,
          strictMimeValidation: parsed.strictMimeValidation !== undefined ? Boolean(parsed.strictMimeValidation) : true,
          rateLimitPerMinute: Math.min(Math.max(parseInt(parsed.rateLimitPerMinute, 10) || 24, 4), 60)
        };
      }
    } catch {
      // Use defaults
    }
  },

  saveSecurityPolicy(updates = {}) {
    this.securityPolicy = { ...this.securityPolicy, ...updates };
    try {
      localStorage.setItem('bychance_security_policy', JSON.stringify(this.securityPolicy));
    } catch {
      // Ignore storage quota errors
    }
    if (this.securityPolicy.memoryOnlySecrets) {
      try {
        sessionStorage.removeItem('bychance_secrets');
      } catch {
        // Ignore
      }
    }
    this._log('SECURITY', `Updated security policies (SafeMode=${this.securityPolicy.safeModeGuardrail}, MemoryOnlyKeys=${this.securityPolicy.memoryOnlySecrets})`);
  },

  /**
   * Append a sanitized entry to the in-window server activity log
   */
  _log(level, message) {
    const cleanMsg = String(message)
      .replace(/([?&])(key|api_key|apikey|token|access_token)=[^&\s]*/gi, '$1$2=[REDACTED]')
      .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]')
      .replace(/\b(pk_|hf_|sk-)[A-Za-z0-9._-]+/g, '$1[REDACTED]');

    this.logs.unshift({
      time: new Date().toLocaleTimeString(),
      level,
      message: cleanMsg
    });
    if (this.logs.length > 60) {
      this.logs.pop();
    }

    window.dispatchEvent(new CustomEvent('bychance:server-log', { detail: this.logs[0] }));
  },

  /**
   * Check if a companion localhost server is present; if not, run 100% in-window
   */
  async _probeCompanionBackend() {
    const proto = (typeof window !== 'undefined' && window.location) ? window.location.protocol : '';
    if ((proto !== 'http:' && proto !== 'https:') || !this._originalFetch) {
      this.localBackendOnline = false;
      this.mode = 'in-window';
      return;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await this._originalFetch('/api/status', {
        method: 'GET',
        signal: controller.signal,
        headers: { 'X-Bychance-Probe': '1' }
      });
      clearTimeout(timer);
      if (res && res.ok) {
        this.localBackendOnline = true;
        this.mode = 'hybrid';
        this._log('INFO', 'Hybrid Mode active: In-Window Server paired with local disk gallery');
        return;
      }
    } catch {
      // Running purely in-window (e.g. GitHub Pages, static host, or standalone)
    }

    this.localBackendOnline = false;
    this.mode = 'in-window';
  },

  /**
   * Intercepts /api/* requests inside the browser window so all server endpoints
   * work natively inside the application window itself.
   */
  _installVirtualServerInterceptor() {
    if (this._originalFetch || typeof window === 'undefined' || !window.fetch) return;
    this._originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
      const urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      let pathname = '';

      try {
        if (urlStr.startsWith('/')) {
          pathname = urlStr.split('?')[0];
        } else if (
          window.location.origin &&
          window.location.origin !== 'null' &&
          urlStr.startsWith(window.location.origin)
        ) {
          pathname = new URL(urlStr).pathname;
        }
      } catch {
        pathname = '';
      }

      if (pathname.startsWith('/api/')) {
        this.requestCount++;
        const method = (init.method || 'GET').toUpperCase();
        this._log('API', `${method} ${pathname} (handled in-window)`);

        if (pathname === '/api/status' && method === 'GET') {
          return this._jsonResponse(200, await this.getStatus());
        }
        if (pathname === '/api/security-audit' && method === 'GET') {
          return this._jsonResponse(200, this.runSecurityAudit());
        }
        if (pathname === '/api/gallery' && method === 'GET') {
          const items = await Storage.getAllImages();
          return this._jsonResponse(200, {
            count: items.length,
            mode: this.mode,
            images: items.map(i => ({
              id: i.id,
              url: Storage._sanitizeUrl(i.url),
              prompt: i.prompt,
              model: i.model,
              seed: i.seed,
              timestamp: i.timestamp
            }))
          });
        }
        if (pathname === '/api/save-image' && method === 'POST') {
          return await this._handleVirtualSaveImage(init);
        }
      }

      return this._originalFetch(input, init);
    };
  },

  _jsonResponse(status, data) {
    return new Response(JSON.stringify(data, null, 2), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Bychance-Server': 'In-Window-Embedded-2.0',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  },

  /**
   * Handle POST /api/save-image directly inside the browser window
   */
  async _handleVirtualSaveImage(init) {
    try {
      const rawBody = typeof init.body === 'string' ? init.body : '';
      if (!rawBody || rawBody.length > MAX_IMAGE_BYTES * 1.4) {
        return this._jsonResponse(413, { success: false, error: 'Payload size out of allowed bounds' });
      }

      const payload = JSON.parse(rawBody);
      const b64Data = String(payload.image_base64 || '');
      if (!b64Data) {
        return this._jsonResponse(400, { success: false, error: 'Missing image_base64' });
      }

      const blob = this.base64ToValidatedBlob(b64Data);
      const saved = await Storage.saveImage({
        id: 'img_' + Date.now(),
        prompt: String(payload.prompt || 'Saved image'),
        model: String(payload.model || 'flux-anime'),
        seed: Number(payload.seed) || Math.floor(Math.random() * 2147483647),
        blob,
        url: URL.createObjectURL(blob),
        timestamp: Date.now()
      });

      // If hybrid companion is online, also mirror to disk asynchronously
      if (this.localBackendOnline && this._originalFetch) {
        this._originalFetch('/api/save-image', init).catch(() => {});
      }

      return this._jsonResponse(200, {
        success: true,
        id: saved.id,
        mode: this.mode,
        size_bytes: blob.size
      });
    } catch (err) {
      return this._jsonResponse(400, {
        success: false,
        error: err.message || 'Invalid image payload'
      });
    }
  },

  /**
   * Verify magic bytes for PNG, JPEG, or WebP images and reject SVG/HTML/script payloads
   */
  isValidImageBytes(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 12) return false;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
    ) {
      return 'image/png';
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }
    // WebP: RIFF....WEBP
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return 'image/webp';
    }
    return false;
  },

  /**
   * Validate a fetched Blob to ensure it is a safe binary raster image (never SVG/HTML)
   */
  async validateImageBlob(blob) {
    if (!blob || !(blob instanceof Blob)) {
      throw new Error('Invalid image blob response');
    }
    if (blob.size <= 0 || blob.size > MAX_IMAGE_BYTES) {
      throw new Error(`Image size (${Math.round(blob.size / 1024)} KB) exceeds security limits`);
    }

    if (!this.securityPolicy.strictMimeValidation) {
      return blob;
    }

    const headerBuffer = await blob.slice(0, 16).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);
    const detectedMime = this.isValidImageBytes(headerBytes);

    if (!detectedMime) {
      this.blockedCount++;
      this._log('SECURITY', 'Blocked response with invalid image magic bytes (non-PNG/JPEG/WebP)');
      throw new Error('Security check failed: Provider returned non-image or unsupported format.');
    }

    if (blob.type !== detectedMime) {
      return new Blob([blob], { type: detectedMime });
    }
    return blob;
  },

  /**
   * Convert base64 string to a magic-byte validated image Blob
   */
  base64ToValidatedBlob(b64String) {
    const cleanB64 = b64String.includes(',') ? b64String.split(',', 1)[1] : b64String;
    const binary = atob(cleanB64.trim());
    if (binary.length > MAX_IMAGE_BYTES) {
      throw new Error('Decoded image exceeds 10 MB security limit');
    }
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const detectedMime = this.isValidImageBytes(bytes);
    if (!detectedMime) {
      this.blockedCount++;
      this._log('SECURITY', 'Blocked base64 payload failing PNG/JPEG/WebP magic-byte verification');
      throw new Error('Security check failed: Corrupt or disallowed image format');
    }
    return new Blob([bytes], { type: detectedMime });
  },

  /**
   * Validate an endpoint URL before sending any request or credentials
   */
  validateEndpointUrl(rawUrl) {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new Error('Invalid endpoint URL format.');
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      this.blockedCount++;
      throw new Error('Security policy: Only https:// or local http:// endpoints are allowed.');
    }

    const isLocal =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '[::1]';

    if (parsed.protocol === 'http:' && !isLocal && this.securityPolicy.blockRemoteHttp) {
      this.blockedCount++;
      this._log('SECURITY', `Blocked insecure plaintext HTTP request to remote host: ${parsed.hostname}`);
      throw new Error('Security policy blocked sending data to an unencrypted remote http:// server. Use https:// or localhost.');
    }

    return parsed;
  },

  /**
   * Check rate limiter before launching a generation batch
   */
  checkRateLimit(requestedCount = 1) {
    const now = Date.now();
    this._rateWindow = this._rateWindow.filter(ts => now - ts < 60000);

    const limit = this.securityPolicy.rateLimitPerMinute || 24;
    if (this._rateWindow.length + requestedCount > limit) {
      this.blockedCount++;
      this._log('SECURITY', `Rate limit triggered (${this._rateWindow.length}/${limit} generations in 60s)`);
      throw new Error(`Rate limit protection: Maximum ${limit} images per minute reached. Please wait a few seconds.`);
    }

    for (let i = 0; i < requestedCount; i++) {
      this._rateWindow.push(now);
    }
  },

  /**
   * Apply Safe-Mode Prompt Guardrails to protect users from accidental or injected unsafe tokens
   */
  enforcePromptSafety(promptText, negativeText = '') {
    const cleanPrompt = String(promptText || '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .trim();

    if (cleanPrompt.length > 2500) {
      throw new Error('Prompt exceeds maximum safe length (2500 characters).');
    }

    if (!this.securityPolicy.safeModeGuardrail) {
      return { prompt: cleanPrompt, negativePrompt: negativeText };
    }

    // Detect explicit/unsafe Booru rating tokens when Safe Mode is enabled
    const unsafePattern = /\b(nsfw|explicit|rating:explicit|rating_explicit|rating:questionable|rating_questionable|nude|naked|18\+|r-18|hentai|uncensored)\b/i;
    if (unsafePattern.test(cleanPrompt)) {
      this.blockedCount++;
      this._log('SECURITY', 'Safe-Mode Guardrail blocked unsafe/explicit token in prompt');
      throw new Error('Safe-Mode Guardrail active: Explicit/NSFW tokens are blocked. You can manage guardrails in the Server & Security console (🛡️).');
    }

    // Ensure 'nsfw, explicit' are present in negative conditioning when Safe Mode is active
    const negLower = (negativeText || '').toLowerCase();
    let safeNegative = negativeText || '';
    if (!negLower.includes('nsfw')) {
      safeNegative = safeNegative ? `nsfw, explicit, ${safeNegative}` : 'nsfw, explicit';
    }

    return {
      prompt: cleanPrompt,
      negativePrompt: safeNegative
    };
  },

  /**
   * Return live status of the built-in window server
   */
  async getStatus() {
    let storedCount = 0;
    try {
      const items = await Storage.getAllImages();
      storedCount = items.length;
    } catch {
      storedCount = 0;
    }

    return {
      name: 'Bychance Embedded Window Server',
      version: '2.0.0',
      status: 'online',
      mode: this.mode,
      modeLabel: this.mode === 'hybrid'
        ? 'In-Window Engine + Local Disk Sync'
        : '100% Built-In Window Server (Self-Contained)',
      uptimeSeconds: Math.round((Date.now() - this.startTime) / 1000),
      requestsHandled: this.requestCount,
      threatsBlocked: this.blockedCount,
      galleryItemsStored: storedCount,
      modelsAvailable: Object.keys(PerchanceEngine.modelProfiles),
      securityPolicy: this.securityPolicy
    };
  },

  /**
   * Run a live 7-point security audit of the current browser window environment
   */
  runSecurityAudit() {
    const hasCspMeta = Boolean(document.querySelector('meta[http-equiv="Content-Security-Policy"]'));
    const hasNoReferrer = Boolean(document.querySelector('meta[name="referrer"][content="no-referrer"]'));

    // Verify no secrets exist in persistent localStorage
    let localStorageClean = true;
    try {
      const saved = localStorage.getItem('bychance_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pollinationsKey || parsed.hfToken || parsed.customApiKey) {
          localStorageClean = false;
        }
      }
    } catch {
      localStorageClean = true;
    }

    const checks = [
      {
        id: 'csp',
        title: 'Content Security Policy (CSP) Enforced in Window',
        passed: hasCspMeta,
        detail: 'Restricts script, frame, object, and connection origins directly inside index.html / standalone.html.'
      },
      {
        id: 'referrer',
        title: 'Zero-Leak Referrer Policy (no-referrer)',
        passed: hasNoReferrer,
        detail: 'Prevents prompts or URL parameters from leaking in HTTP Referer headers to external image hosts.'
      },
      {
        id: 'secrets',
        title: 'Credential Isolation (Zero Persistent Disk Keys)',
        passed: localStorageClean,
        detail: this.securityPolicy.memoryOnlySecrets
          ? 'Strict RAM-Only Mode active: API keys are never written to web storage.'
          : 'API keys are isolated to ephemeral sessionStorage (or RAM) and stripped from all saved URLs & JSON backups.'
      },
      {
        id: 'mime',
        title: 'Binary Magic-Byte Image Verification',
        passed: this.securityPolicy.strictMimeValidation,
        detail: 'Inspects file headers (PNG/JPEG/WebP magic bytes) and blocks SVG/HTML payloads to prevent stored XSS.'
      },
      {
        id: 'https',
        title: 'Remote Plaintext HTTP Blocker',
        passed: this.securityPolicy.blockRemoteHttp,
        detail: 'Blocks transmitting prompts or API keys over unencrypted HTTP to non-localhost servers.'
      },
      {
        id: 'safemode',
        title: 'Safe-Mode Content & Prompt Guardrail',
        passed: this.securityPolicy.safeModeGuardrail,
        detail: 'Filters explicit/unsafe tokens and enforces safe negative prompt conditioning.'
      },
      {
        id: 'ratelimit',
        title: 'In-Window Rate Limiter & Quota Guard',
        passed: this.securityPolicy.rateLimitPerMinute <= 60,
        detail: `Caps generation bursts at ${this.securityPolicy.rateLimitPerMinute} images/min to prevent runaway loops.`
      }
    ];

    const passedCount = checks.filter(c => c.passed).length;
    return {
      score: Math.round((passedCount / checks.length) * 100),
      passedCount,
      totalChecks: checks.length,
      checks
    };
  },

  /**
   * Emergency Security Wipe: Clears all API keys in memory & sessionStorage and revokes active blob URLs
   */
  purgeCredentialsAndSession(imageGeneratorRef = null) {
    try {
      sessionStorage.removeItem('bychance_secrets');
    } catch {
      // Ignore
    }
    if (imageGeneratorRef && imageGeneratorRef.settings) {
      imageGeneratorRef.settings.pollinationsKey = '';
      imageGeneratorRef.settings.hfToken = '';
      imageGeneratorRef.settings.customApiKey = '';
    }
    this._log('SECURITY', 'Executed emergency credential purge: wiped all API keys from session & memory');
  }
};
