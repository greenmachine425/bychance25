# Bychance — Perchance Prompting Helper & Modular Workbench

A **100% deterministic, zero-AI** Perchance prompting workbench that turns everyday words into high-signal model-recognized descriptors, splits prompts into modular sections for effortless mixing & matching, and provides a live-synced full copy-paste window.

## Key Features

1. **Modular Split Edit Windows + Unified Copy-Paste Master Window**:
   - **👤 1. Character & Subject**: Identity, hair, eyes, facial traits, species/archetype.
   - **👗 2. Pose, Outfit & Action**: Stance, expression, clothing, fabrics, accessories, props.
   - **🏞️ 3. Scene & Environment**: Setting, architecture, weather, time of day, atmosphere.
   - **🎨 4. Art Style, Camera & Quality**: Studio aesthetic, medium, camera angle, lighting physics, quality boosters.
   - **🚫 5. Negative Prompt**: Standard exclusions formatted for Perchance negative boxes.
   - **📋 Full Prompt Copy-Paste Window**: Synchronized in real time with the modular boxes, or paste any existing full prompt and click **`↙️ Split into Modular Boxes`** to automatically separate it into the 5 modular windows.

2. **Deterministic Word & Character Upgrader (No AI)**:
   - Detects vague/weak words (`"shiny"`, `"standing"`, `"sad"`, `"nice lighting"`, `"camera below"`, `"good quality"`, etc.) and replaces them with model-recognized tags or `{option1|option2}` Perchance choice syntax.
   - Expands recognizable characters (such as **Rosalina**, **Princess Zelda**, **Frieren**, **2B**, **Samus Aran**, **Hatsune Miku**, **Princess Peach**, **Tifa Lockhart**) into accurate, faithful visual identifiers so image models render the right character traits.

3. **Full & Modular Presets**:
   - Load complete **Full Setup Presets** or swap **individual section presets** (e.g., keep *Rosalina* in Character while swapping Pose/Outfit to *Cozy Autumn Sweater* or *Cyberpunk Techwear*, and Scene to *Rainy Neon Alley* or *Cosmic Observatory*).
   - Save, delete, export, and import your own custom presets via `localStorage` and JSON.

## Running Locally

- Open `index.html` or `standalone.html` directly in any browser, or run:
  ```bash
  python3 server.py 3000
  ```
  and visit `http://localhost:3000`.
