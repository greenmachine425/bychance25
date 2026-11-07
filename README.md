# ✨ Bychance — Anime AI Image Generator

A clean, modern web application that functions like **Perchance**, powered by model-aware conditioning profiles (**FLUX.1 Anime**, **Illustrious XL / NoobAI**, **Animagine XL 3.1/4.0**, **Pony Diffusion V6 XL**, **FLUX.1 Dev**, **FLUX 3D**, and **SDXL Turbo**), a real-time **Prompt Coach**, and a **350+ Model Identifier & Danbooru Lexicon**.

---

## 🌟 Highlights

- **🎲 Full Perchance Syntax & Wildcard Engine**:
  - Direct support for Perchance sets: `{option1|option2|option3}`
  - Percentage & ratio weights: `{60% rare option|40% common}` and `{3::kimono|1::armor}`
  - Nested expressions: `{cute {cat|fox} girl|badass {samurai|ninja}}`
  - Built-in dictionary `[wildcards]`: `[subject]`, `[hair]`, `[eyes]`, `[expression]`, `[pose]`, `[outfit]`, `[accessory]`, `[scenery]`, `[lighting]`, `[vfx]`, `[camera]`, `[studio]`, `[quality]`
  - Real-time syntax resolution preview with instant re-roll!

- **🧠 Model Intelligence & Conditioning Profiles (7 Architectures)**:
  - **FLUX.1 Anime (`flux-anime`)**: Hybrid T5-XXL natural language + CLIP-L key visual studio conditioning (`anime key visual`, `official art`, `clean crisp lineart`, `cel shading`).
  - **Illustrious XL / NoobAI (`illustrious-xl`)**: Canonical Danbooru tag conditioning (`masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest, year 2024, anime coloring`).
  - **Animagine XL 3.1 / 4.0 (`animagine-xl`)**: Structured quality, rating & era tag suffixes (`masterpiece, best quality, very aesthetic, newest, safe`).
  - **Pony Diffusion V6 XL (`pony-xl`)**: Score-tag percentile conditioning (`score_9, score_8_up, score_7_up, score_6_up, source_anime, rating_safe`).
  - **FLUX.1 Dev / Pro (`flux`)**: Natural language spatial composition, lens physics, and readable quoted text (`"NEO TOKYO"`).
  - **FLUX 3D Anime & Figurine (`flux-3d`)**: Cel-shaded 3D game shaders (*Arc System Works* / *Honkai Star Rail*) and 1/7 scale painted PVC figurine renders (`subsurface scattering`, `octane render`).
  - **SDXL Turbo / Lightning (`turbo`)**: Distilled 1–4 step fast prototyping (~2s) with front-loaded token prioritization and low CFG.

- **⚡ Real-Time Prompt Coach & Auto-Tuner**:
  - Evaluates your prompt live across **7 core pillars**: *Subject & Count*, *Hair/Eyes/Expression*, *Attire & Props*, *Pose/Angle/Framing*, *Environment*, *Lighting/VFX*, and *Model-Specific Trigger Identifiers*.
  - One-click **`⚡ Optimize for Model`** and **`⚡ Auto-Tune Model Setup`** buttons that configure optimal Guidance (CFG), deduplicated model triggers, and model-calibrated negative prompts.

- **🏷️ Searchable 350+ Model Identifier & Danbooru Lexicon**:
  - 12 categorized collections: *Model Quality/Era/Score Identifiers*, *Subject Count & Archetypes*, *Camera Angles & Lenses*, *Haircuts & Bangs*, *Eyes & Micro-Expressions*, *Dynamic Poses*, *Outfits & Fabrics*, *Weapons & Props*, *Lighting Physics & VFX*, *Environments*, *Anime Studios & Mediums*, and *Negative Prompt Identifiers*.

- **🎨 14 Curated Studio & Aesthetic Presets**:
  - *Modern Digital Anime*, *Illustrious Booru Masterpiece*, *90s Retro Cel Anime*, *Studio Ghibli Watercolor*, *Makoto Shinkai (CoMix Wave)*, *Cyberpunk / Studio Trigger*, *Kyoto Animation (KyoAni)*, *Ufotable Action (VFX)*, *MAPPA Dark Cinematic*, *Manga Monochrome Ink*, *Light Novel / VN Key Art*, *3D Cel / Scale Figurine*, *Chibi & Kawaii Sticker*, and *Dark Fantasy / Gothic*.

- **📜 Perchance Template Library**:
  - 12 generator templates including *Astral Magical Girl*, *Cyberpunk Edgerunner Ronin*, *Illustrious XL Booru Formula*, *Pony V6 Score-9 Dynamic Action*, *Infinite `[Wildcard]` Sandbox*, *Ghibli Countryside*, *Makoto Shinkai Twilight*, *Ufotable Elemental Awakening*, *Gothic Lolita Cathedral*, *Mecha Cockpit*, *1/7 Scale Figurine*, and *KyoAni Rainy Cafe*.

- **⚡ Batch Generation & Aspect Ratios**:
  - Render **1, 2, or 4 images** concurrently with live skeleton progress cards.
  - Aspect ratios: **1:1** (1024×1024), **2:3** (680×1024), **3:4** (768×1024), **9:16** (576×1024), **16:9** (1024×576).

- **🛡️ Built-In Window Server & 7-Layer User Security Center**:
  - **100% In-Window Embedded Server (`EmbeddedServer`)**: Intercepts and serves `/api/status`, `/api/gallery`, `/api/save-image`, and `/api/security-audit` directly inside the browser application window (`index.html` / `standalone.html`), requiring zero external server processes while supporting hybrid sync if `server.py` is running.
  - **In-Window Content Security Policy (CSP) & `no-referrer`**: Enforced directly via `<meta>` headers inside the window and HTTP headers so prompts and URLs never leak via Referer headers.
  - **Binary Magic-Byte Image Verification**: Validates `PNG`, `JPEG`, and `WebP` file signatures on all generated/imported images and rejects `SVG`/`HTML` payloads to eliminate stored XSS vectors.
  - **Ephemeral Credential Isolation & RAM-Only Mode**: API keys never touch `localStorage`, IndexedDB, or JSON backups; users can enable **Strict RAM-Only Mode** or trigger a one-click **Emergency Credential Wipe**.
  - **Remote Plaintext HTTP Blocker**: Prevents custom endpoints from sending prompts or API keys over unencrypted non-localhost `http://` connections.
  - **Safe-Mode Content & Prompt Guardrail**: Blocks explicit/unsafe prompt tokens and enforces safe negative prompt conditioning.
  - **In-Window Rate Limiter**: Protects users from accidental infinite loops or quota exhaustion.

- **🔍 Fullscreen Lightbox & Local Persistence**:
  - Interactive pan & zoom, metadata inspector, PNG download, prompt/seed copy, settings reuse, IndexedDB persistence, and JSON backup export.

---

## 🚀 Quickstart

### 1. Launch the Server

Run the zero-dependency Python server:

```bash
python3 server.py
```

Or specify a custom port:

```bash
python3 server.py 8080
```

### 2. Rebuild Standalone Bundle (Optional)

To bundle everything into a single self-contained `standalone.html` file:

```bash
python3 build_standalone.py
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Trigger Anime Generation |
| `Escape` | Close Lightbox / Modals |
| `Left / Right Arrow` | Navigate previous/next image in Lightbox |
| `+` / `-` | Zoom In / Zoom Out in Lightbox |
| `0` | Reset Zoom to 100% |
