# ✨ Bychance — Anime AI Image Generator

A clean, modern web application that functions like **Perchance**, utilizing the same high-tier anime models and combinatorial generation system for creating anime illustrations.

---

## 🌟 Highlights

- **🎲 Full Perchance Syntax Engine**:
  - Direct support for Perchance sets: `{option1|option2|option3}`
  - Weighted probabilities: `{60% rare option|40% common}`
  - Nested expressions: `{cute {cat|fox} girl|badass {samurai|ninja}}`
  - Real-time syntax resolution preview as you type!

- **🎨 FLUX & Modern Anime Models**:
  - **FLUX.1 Anime**: State-of-the-art Japanese animation key visual aesthetics with exceptional anatomy, lighting, and detail.
  - **FLUX.1 Standard**: General high-fidelity open weights generation.
  - **SDXL Turbo**: Lightning-fast rapid prototyping in seconds.
  - **FLUX 3D Anime**: 3D CGI / anime figurine aesthetics.

- **📜 Curated Style Presets**:
  - **Modern Digital Anime**: Sharp lines, 4K digital key visual, trending on Pixiv
  - **90s Retro Cel Anime**: Hand-painted cels, film grain, vintage VHS warmth (Sailor Moon / Evangelion / Bebop)
  - **Studio Ghibli Watercolor**: Whimsical pastoral landscapes, painterly gouache
  - **Makoto Shinkai**: Radiant twilight skies, volumetric cumulus clouds, starlit reflections
  - **Studio Trigger / Cyberpunk**: High energy, explosive neon saturation, angular action lines
  - **Kyoto Animation (KyoAni)**: Glassy expressive eyes, delicate soft bloom, slice-of-life perfection
  - **Ufotable Action**: High contrast darks, elemental particle VFX, glowing kinetic combat
  - **Manga Monochrome Ink**: High contrast screentone inks, crosshatching, manga panels
  - **Chibi & Kawaii Sticker**: Adorable proportions, thick outlines, sticker cutouts
  - **Dark Fantasy Anime**: Ornate dark armor, glowing runes, eerie gothic mist

- **📜 Perchance Template Library**:
  - One-click access to classic anime scenarios: *Magical Girl Awakening*, *Cyberpunk Street Ronin*, *Ghibli Countryside Afternoon*, *Shinkai Twilight Rooftop*, *Shonen Battle Awakening*, *Gothic Lolita Moonlight*, *Mecha Pilot Cockpit*, *Cozy Rainy Day Cafe*.
  - Use templates directly or roll an evaluated prompt with one click.

- **🏷️ Interactive Tag Builder**:
  - Categorized one-click tags for Character, Hair & Face, Outfit, Scenery & Setting, Lighting & Effects, and Composition.

- **⚡ Batch Generation & Aspect Ratios**:
  - Render **1, 2, or 4 images** concurrently with live skeleton progress cards.
  - Supported aspect ratios:
    - **1:1** Square (1024×1024)
    - **2:3** Portrait (832×1216)
    - **3:4** Portrait (768×1024)
    - **9:16** Phone Wallpaper / Story (720×1280)
    - **16:9** Widescreen Cinematic (1280×720)

- **🔍 Fullscreen Lightbox & Management**:
  - Interactive pan & zoom (mouse wheel / buttons)
  - Generation metadata inspector (Prompt, Evaluated template, Seed, Dimensions, Model, Render time)
  - Quick actions: Download PNG, Copy Prompt, Copy Seed, Reuse Prompt & Settings, Favorite, Delete
  - IndexedDB local storage: All generations and favorites persist across browser reloads without data loss!
  - Export gallery history as JSON backup.

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

### 2. Open in Browser

Open your browser and navigate to:
**`http://localhost:8000`** (or the port displayed in terminal)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | Trigger Anime Generation |
| `Escape` | Close Lightbox / Modals |
| `Left / Right Arrow` | Navigate previous/next image in Lightbox |
| `+` / `-` | Zoom In / Zoom Out in Lightbox |
| `0` | Reset Zoom to 100% |

---

## 📁 Project Structure

```
Bychance/
├── server.py               # Multi-threaded Python HTTP server & API
├── public/                 # Static web application files
│   ├── index.html          # Main application page
│   ├── css/
│   │   └── style.css       # Design system, glassmorphism, animations
│   └── js/
│       ├── app.js          # Core application controller & event bindings
│       ├── perchanceEngine.js # Perchance syntax parser, dictionary & templates
│       ├── imageGenerator.js  # Multi-provider generation service (FLUX/Anime)
│       ├── storage.js      # IndexedDB / localStorage persistence
│       └── viewer.js       # Lightbox image viewer, zoom/pan & actions
├── gallery/                # Local saved image outputs
└── README.md               # Documentation
```
