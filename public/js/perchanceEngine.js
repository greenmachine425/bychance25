/**
 * Bychance - Perchance-style Template Syntax, Model Intelligence & Anime Generator Engine
 * 
 * Implements:
 * 1. Perchance syntax parsing ({a|b|c}, percentage weights {60% a|40% b}, ratio weights {3::a|1::b}, nested sets, and [wildcard] tokens)
 * 2. Model Intelligence Profiles (FLUX.1 Anime, Illustrious XL / NoobAI, Animagine XL, Pony Diffusion V6 XL, FLUX.1 Dev, FLUX 3D, SDXL Turbo)
 * 3. Real-time Prompt Analyzer, Pillar Coach & Model-Specific Prompt Optimizer
 * 4. Comprehensive Danbooru / FLUX Identifier Lexicon (350+ model-recognized tokens across 13 categories)
 * 5. Pre-made generator templates & curated aesthetic style presets
 */

export const PerchanceEngine = {
  /**
   * Model Intelligence Profiles
   * Defines how each anime/illustration model understands text, its trigger identifiers,
   * recommended guidance scale (CFG), prompt ordering rules, and default negative prompts.
   */
  modelProfiles: {
    "flux-anime": {
      id: "flux-anime",
      name: "FLUX.1 Anime (Key Visual Studio)",
      shortName: "FLUX.1 Anime",
      badge: "Recommended • Hybrid T5 + CLIP",
      encoder: "T5-XXL Natural Language + CLIP-L Tags",
      pollinationsModel: "flux",
      hfRepo: "black-forest-labs/FLUX.1-schnell",
      recommendedGuidance: 5.5,
      guidanceRange: [3.5, 7.5],
      optimalAspect: "2:3",
      syntaxStyle: "Hybrid: Natural descriptive clauses + high-signal anime studio & Booru identifiers",
      promptFormula: "[Subject & Count] + [Character Appearance & Expression] + [Detailed Attire & Props] + [Action & Camera Framing] + [Environment & Atmosphere] + [Lighting, Studio & Key Visual Identifiers]",
      description: "Excels at complex spatial instructions, exact colors, multi-layered outfits, and modern 4K anime key visual aesthetics without needing heavy parentheses weighting.",
      triggerWords: [
        "anime key visual",
        "official art",
        "masterpiece anime illustration",
        "crisp cel shading",
        "clean lineart",
        "expressive luminous eyes",
        "subsurface scattering",
        "volumetric lighting",
        "trending on Pixiv",
        "high production value"
      ],
      qualityPrefix: "",
      qualitySuffix: ", masterpiece anime key visual, official art, clean crisp lineart, vibrant cel-shaded colors, expressive detailed eyes, high production value, 4k anime illustration",
      defaultNegative: "low quality, worst quality, blurry, photorealistic, 3d cgi, deformed hands, extra fingers, bad anatomy, watermark, text, signature, ugly, washed out",
      tips: [
        "Combine natural sentences ('holding a glowing katana above her head') with canonical anime identifiers ('anime key visual, Ufotable style').",
        "Avoid SD1.5-style parentheses weights like ((masterpiece:1.4)) — FLUX's T5 encoder reads natural emphasis words like 'prominent', 'vibrant', and 'intricate'.",
        "Specify lighting physics explicitly ('backlighting', 'tyndall effect', 'rim light', 'chromatic aberration') for studio-grade compositing."
      ]
    },

    "illustrious-xl": {
      id: "illustrious-xl",
      name: "Illustrious XL / NoobAI (Danbooru Master)",
      shortName: "Illustrious XL",
      badge: "Booru Tag Specialist",
      encoder: "Dual CLIP SDXL (Danbooru / e621 Tag Conditioning)",
      pollinationsModel: "flux",
      hfRepo: "OnomaAIResearch/Illustrious-xl-early-release-v0",
      recommendedGuidance: 6.0,
      guidanceRange: [4.5, 7.5],
      optimalAspect: "2:3",
      syntaxStyle: "Comma-separated canonical Danbooru tags ordered from quality/count to environment",
      promptFormula: "[Quality & Era Meta Tags] + [1girl/1boy, solo] + [Character/Archetype] + [Hair, Eyes & Expression Tags] + [Costume & Accessory Tags] + [Pose & Camera Angle Tags] + [Background & Lighting Tags]",
      description: "Trained directly on millions of Danbooru tags. Responds strongly to exact Booru taxonomy, camera angle identifiers ('dutch angle', 'cowboy shot', 'from below'), and era identifiers ('newest', 'year 2024').",
      triggerWords: [
        "masterpiece",
        "best quality",
        "amazing quality",
        "very aesthetic",
        "absurdres",
        "newest",
        "year 2024",
        "year 2025",
        "anime coloring",
        "official style",
        "detailed background",
        "dynamic angle"
      ],
      qualityPrefix: "masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest, year 2024, ",
      qualitySuffix: ", anime coloring, crisp lineart, detailed background, highres",
      defaultNegative: "worst quality, old, early, low quality, lowres, signature, username, logo, bad hands, mutated hands, extra digits, fewer digits, bad anatomy, anatomical nonsense, blurry, watermark, text",
      tips: [
        "Start prompts with quality & era identifiers: 'masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest'.",
        "Always include subject count tags early ('1girl, solo' or '1boy, solo') and exact framing tags ('cowboy shot', 'upper body', 'full body').",
        "Put 'old, early, worst quality, lowres, bad hands, extra digits' in the Negative Prompt to lock in modern sharp linework."
      ]
    },

    "animagine-xl": {
      id: "animagine-xl",
      name: "Animagine XL 3.1 / 4.0 (CagliostroLab)",
      shortName: "Animagine XL",
      badge: "Structured Anime SDXL",
      encoder: "SDXL Structured Tag & Era Conditioning",
      pollinationsModel: "flux",
      hfRepo: "cagliostrolab/animagine-xl-3.1",
      recommendedGuidance: 6.5,
      guidanceRange: [5.0, 7.5],
      optimalAspect: "2:3",
      syntaxStyle: "Structured Booru tags with explicit quality, aesthetic, and era suffixes",
      promptFormula: "[1girl/1boy, solo] + [Character & Series/Archetype] + [Appearance & Outfit Tags] + [Action, Angle & Environment Tags] + [masterpiece, best quality, very aesthetic, newest, safe]",
      description: "Industry-standard open anime SDXL checkpoint trained with strict quality ('masterpiece, best quality'), aesthetic ('very aesthetic'), and era ('newest', 'recent', 'early') conditioning.",
      triggerWords: [
        "masterpiece",
        "best quality",
        "great quality",
        "very aesthetic",
        "newest",
        "recent",
        "safe",
        "general",
        "1girl",
        "solo",
        "depth of field",
        "cinematic lighting"
      ],
      qualityPrefix: "",
      qualitySuffix: ", masterpiece, best quality, very aesthetic, newest, safe, absurdres",
      defaultNegative: "nsfw, lowres, (bad), text, error, fewer, extra, missing, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, oldest, early, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]",
      tips: [
        "Animagine XL places quality & era tags at the END of the prompt: '... , masterpiece, best quality, very aesthetic, newest'.",
        "Use era identifiers to shift art styles: 'newest' (2021-2025 modern digital), 'recent' (2018-2020), 'mid' (2015-2017), or 'old' (retro 2000s).",
        "Keep Guidance Scale between 5.5 and 7.0 to prevent oversaturated contrast."
      ]
    },

    "pony-xl": {
      id: "pony-xl",
      name: "Pony Diffusion V6 XL (Score-Tag Anime)",
      shortName: "Pony V6 XL",
      badge: "Score-Tag System",
      encoder: "SDXL Score-Tag & Source Conditioning",
      pollinationsModel: "flux",
      hfRepo: "LyliaEngine/Pony_Diffusion_V6_XL",
      recommendedGuidance: 6.5,
      guidanceRange: [5.5, 7.5],
      optimalAspect: "2:3",
      syntaxStyle: "Mandatory score_9 prefix + source_anime + Booru character & pose tags",
      promptFormula: "score_9, score_8_up, score_7_up, score_6_up, source_anime, rating_safe, [1girl/1boy], [Appearance & Outfit], [Dynamic Pose & Camera Angle], [Environment & Lighting]",
      description: "Uses aesthetic percentile score identifiers ('score_9, score_8_up, source_anime') to unlock extraordinary dynamic poses, expressive faces, and dramatic lighting.",
      triggerWords: [
        "score_9",
        "score_8_up",
        "score_7_up",
        "score_6_up",
        "source_anime",
        "rating_safe",
        "break",
        "dynamic pose",
        "expressive face",
        "dramatic lighting"
      ],
      qualityPrefix: "score_9, score_8_up, score_7_up, score_6_up, source_anime, rating_safe, ",
      qualitySuffix: ", masterpiece, highres, detailed anime art",
      defaultNegative: "score_4, score_5, score_6, source_furry, source_pony, source_cartoon, 3d, photorealistic, ugly, deformed, blurry, lowres, bad anatomy, bad hands, extra fingers, text, watermark, signature",
      tips: [
        "Always prefix prompts with 'score_9, score_8_up, score_7_up, source_anime, rating_safe' — without score tags, quality drops sharply.",
        "Include 'score_4, score_5, score_6, source_cartoon, source_furry' in the Negative Prompt to enforce pure high-tier anime aesthetics.",
        "Excels at extreme perspective ('foreshortening', 'worm\\'s-eye view', 'dynamic action pose')."
      ]
    },

    "flux": {
      id: "flux",
      name: "FLUX.1 Dev / Pro (Cinematic & Hybrid Art)",
      shortName: "FLUX.1 Standard",
      badge: "Natural Language + Text",
      encoder: "T5-XXL (512 tokens) + CLIP-L",
      pollinationsModel: "flux",
      hfRepo: "black-forest-labs/FLUX.1-dev",
      recommendedGuidance: 4.5,
      guidanceRange: [3.0, 6.5],
      optimalAspect: "16:9",
      syntaxStyle: "Rich natural prose describing subject, materials, camera lens, and lighting",
      promptFormula: "[Medium & Style Declaration] + [Detailed Subject & Pose Prose] + [Materials, Textures & Color Palette] + [Environment & Spatial Layout] + [Camera Lens, Depth of Field & Lighting]",
      description: "High-precision natural language diffusion model capable of complex multi-character interactions, accurate readable text in quotes, and breathtaking environmental lighting.",
      triggerWords: [
        "cinematic anime illustration",
        "volumetric god rays",
        "raytraced reflections",
        "85mm f/1.4 lens",
        "shallow depth of field",
        "intricate textures",
        "dramatic chiaroscuro",
        "color graded",
        "masterpiece"
      ],
      qualityPrefix: "",
      qualitySuffix: ", masterpiece illustration, ultra-detailed, cinematic lighting, sharp focus, rich color grading, high resolution",
      defaultNegative: "blurry, low resolution, low quality, deformed anatomy, mutated hands, watermark, ugly, oversaturated",
      tips: [
        "To render readable text on signs, hoodies, or posters, put the exact words in quotation marks (e.g. a neon sign reading \"NEO TOKYO\").",
        "Describe spatial relationships clearly ('on the left', 'in the foreground', 'reflected in the rain puddle below').",
        "Works best at lower Guidance Scales (3.5–5.5) for natural contrast and smooth gradients."
      ]
    },

    "flux-3d": {
      id: "flux-3d",
      name: "FLUX 3D Anime & Figurine (Cel-CG / UE5)",
      shortName: "FLUX 3D Anime",
      badge: "3D Cel / Scale Figure",
      encoder: "T5-XXL + 3D Rendering & Shader Identifiers",
      pollinationsModel: "flux",
      hfRepo: "black-forest-labs/FLUX.1-schnell",
      recommendedGuidance: 5.5,
      guidanceRange: [4.0, 7.0],
      optimalAspect: "2:3",
      syntaxStyle: "Subject + 3D shader/engine identifiers (Arc System Works, Genshin/HSR cel render, or Good Smile PVC figure)",
      promptFormula: "[Subject & Character Design] + [3D Cel-Shaded / PVC Figurine Material Identifiers] + [Dynamic Pose & Base/Environment] + [Subsurface Scattering, Rim Light & Octane/UE5 Render Tags]",
      description: "Specialized profile for stylized 3D anime game visuals (Guilty Gear Strive / Honkai Star Rail cel-shaded 3D) and collectible 1/7 scale anime figurine photography.",
      triggerWords: [
        "3D anime render",
        "cel-shaded 3D",
        "Arc System Works style",
        "Honkai Star Rail 3D model style",
        "1/7 scale PVC anime figure",
        "Good Smile Company aesthetic",
        "subsurface scattering",
        "global illumination",
        "octane render",
        "studio rim lighting"
      ],
      qualityPrefix: "",
      qualitySuffix: ", 3D anime render, stylized cel-shaded 3D character art, subsurface scattering, global illumination, soft studio rim lighting, octane render, Unreal Engine 5 anime shader, 8k resolution",
      defaultNegative: "flat 2D sketch, rough lineart, low poly, blurry, pixelated, deformed hands, bad anatomy, watermark, text, noisy",
      tips: [
        "Use 'cel-shaded 3D, Arc System Works style' for anime fighting/RPG game graphics, or '1/7 scale painted PVC figure on acrylic display base, macro studio photography' for figurine looks.",
        "Add 'subsurface scattering, translucent hair tips, anisotropic hair highlights' for lifelike anime shader materials."
      ]
    },

    "turbo": {
      id: "turbo",
      name: "SDXL Turbo / Lightning (Ultra-Fast ~2s)",
      shortName: "SDXL Turbo",
      badge: "Instant Prototyping",
      encoder: "Distilled 4-Step SDXL (77 CLIP Token Window)",
      pollinationsModel: "turbo",
      hfRepo: "stabilityai/sdxl-turbo",
      recommendedGuidance: 2.0,
      guidanceRange: [1.0, 3.5],
      optimalAspect: "1:1",
      syntaxStyle: "Concise, front-loaded high-impact keywords under 60 words",
      promptFormula: "[Core Subject & Archetype] + [Key Hair/Eye/Outfit Feature] + [Primary Setting] + [Lighting & Style Identifier]",
      description: "Adversarially distilled high-speed model that generates in 1–4 steps (~2 seconds). Prioritizes the first 40–60 tokens and requires low guidance scale.",
      triggerWords: [
        "anime masterpiece",
        "1girl",
        "vibrant anime art",
        "sharp focus",
        "studio key visual",
        "cinematic lighting",
        "clean lineart",
        "highly detailed"
      ],
      qualityPrefix: "",
      qualitySuffix: ", anime masterpiece, vibrant colors, sharp focus, studio key visual",
      defaultNegative: "blurry, low quality, deformed, bad anatomy, extra fingers, watermark, text",
      tips: [
        "Front-load your most important subject and style words in the first 15 words — SDXL Turbo weighs early tokens much more heavily.",
        "Keep Guidance Scale low (1.5–3.0) to avoid burned-in contrast artifacts.",
        "Great for rapid composition & Perchance template testing before switching to FLUX.1 Anime for final 4K rendering."
      ]
    }
  },

  /**
   * Parse and evaluate Perchance syntax in a text string.
   * Supports:
   * - Wildcard tokens: [subject], [hair], [hairColor], [hairStyle], [eyes], [expression], [pose], [outfit], [accessory], [scenery], [lighting], [vfx], [camera], [studio], [quality]
   * - Basic sets: {apple|banana|cherry}
   * - Nested sets: {cute {cat|fox} girl|badass {samurai|ninja}}
   * - Percentage weights: {50% high chance|25% medium|25% rare}
   * - Relative numeric weights: {3::common|1::rare} or {3*common|1*rare}
   */
  evaluate(template) {
    if (!template || typeof template !== 'string') return '';

    let text = template;

    // 1. Resolve known [wildcard] category tokens first (leaves unknown [brackets] intact for SD de-emphasis syntax)
    text = this._resolveWildcards(text);

    // 2. Iteratively resolve innermost { ... } blocks
    const maxIterations = 30;
    let iteration = 0;

    while (iteration < maxIterations) {
      const match = text.match(/\{([^{}]+)\}/);
      if (!match) break;

      const fullMatch = match[0];
      const innerContent = match[1];
      const selectedOption = this._chooseFromSet(innerContent);

      text = text.replace(fullMatch, () => selectedOption);
      iteration++;
    }

    // 3. Resolve any wildcards that were inside chosen { ... } branches
    text = this._resolveWildcards(text);

    return text.replace(/\s+/g, ' ').trim();
  },

  /**
   * Resolves [wildcard] placeholders matching dictionary categories
   */
  _resolveWildcards(text) {
    if (!text.includes('[')) return text;

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const wildcardMap = {
      subject: () => pick(this.dictionary.subjects),
      hair: () => `${pick(this.dictionary.hairColors)} ${pick(this.dictionary.hairStyles)}`,
      haircolor: () => pick(this.dictionary.hairColors),
      hairstyle: () => pick(this.dictionary.hairStyles),
      eyes: () => pick(this.dictionary.eyeStyles),
      expression: () => pick(this.dictionary.expressions),
      pose: () => pick(this.dictionary.poses),
      outfit: () => pick(this.dictionary.attire),
      attire: () => pick(this.dictionary.attire),
      accessory: () => pick(this.dictionary.accessories),
      scenery: () => pick(this.dictionary.scenery),
      setting: () => pick(this.dictionary.scenery),
      lighting: () => pick(this.dictionary.lighting),
      vfx: () => pick(this.dictionary.vfx),
      camera: () => pick(this.dictionary.cameraAndComposition),
      angle: () => pick(this.dictionary.cameraAndComposition),
      studio: () => pick(this.dictionary.studios),
      quality: () => pick(this.dictionary.qualityBoosters)
    };

    return text.replace(/\[([a-zA-Z]+)\]/g, (full, key) => {
      const lower = key.toLowerCase();
      if (wildcardMap[lower]) {
        return wildcardMap[lower]();
      }
      return full;
    });
  },

  /**
   * Helper to pick one option from a pipe-delimited string
   * Handles weighted options like '50% a|50% b', '3::a|1::b', '3*a|1*b', or plain 'a|b|c'
   */
  _chooseFromSet(innerContent) {
    const rawOptions = innerContent.split('|').map(s => s.trim()).filter(s => s.length > 0);
    if (rawOptions.length === 0) return '';

    let hasWeights = false;
    const weightedOptions = [];
    let totalWeight = 0;

    for (const opt of rawOptions) {
      // Match "60% option", "3::option", or "3*option"
      const pctMatch = opt.match(/^(\d+(?:\.\d+)?)\s*%\s*(.*)$/);
      const ratioMatch = !pctMatch ? opt.match(/^(\d+(?:\.\d+)?)\s*(?:::|\*)\s*(.*)$/) : null;

      if (pctMatch || ratioMatch) {
        hasWeights = true;
        const m = pctMatch || ratioMatch;
        const weight = parseFloat(m[1]);
        const val = m[2].trim();
        weightedOptions.push({ value: val, weight });
        totalWeight += weight;
      } else {
        weightedOptions.push({ value: opt, weight: 1 });
        totalWeight += 1;
      }
    }

    if (hasWeights && totalWeight > 0) {
      let rand = Math.random() * totalWeight;
      for (const item of weightedOptions) {
        if (rand < item.weight) {
          return item.value;
        }
        rand -= item.weight;
      }
      return weightedOptions[weightedOptions.length - 1].value;
    }

    // Default uniform random choice
    const idx = Math.floor(Math.random() * rawOptions.length);
    return rawOptions[idx];
  },

  /**
   * Comprehensive anime dictionary for prompt construction, wildcards & randomization
   */
  dictionary: {
    subjects: [
      "1girl, solo, beautiful anime heroine",
      "1girl, solo, cyberpunk netrunner samurai",
      "1girl, solo, celestial magical girl in astral regalia",
      "1girl, solo, shrine maiden (miko) exorcist",
      "1girl, solo, kuudere silver-haired elf archmage",
      "1girl, solo, tsundere academy student council president",
      "1girl, solo, elite mecha pilot in neural plugsuit",
      "1girl, solo, gothic lolita vampire noblewoman",
      "1girl, solo, wandering ronin swordswoman",
      "1girl, solo, kitsune spirit princess with nine tails",
      "1girl, solo, valkyrie knight in winged silver armor",
      "1girl, solo, cozy slice-of-life bookshop barista",
      "1girl, solo, steampunk airship navigator",
      "1girl, solo, alchemist witch in oversized pointed hat",
      "1boy, solo, charismatic shonen lightning warrior",
      "1boy, solo, stoic dark fantasy dragon knight",
      "1boy, solo, futuristic cybernetic bounty hunter",
      "1boy, solo, mysterious onmyoji spirit mage",
      "1girl and 1boy, romantic anime couple under translucent umbrella",
      "chibi, solo, adorable anime mascot with floating star companion"
    ],

    hairColors: [
      "silver white", "sakura pastel pink", "midnight raven black", "platinum blonde",
      "glowing aqua cyan", "crimson scarlet", "twilight amethyst violet", "emerald jade",
      "gradient lavender and mint", "fiery sunset orange", "cobalt sapphire blue",
      "inner-color black and neon magenta", "snowy iridescent white"
    ],

    hairStyles: [
      "long twintails with fluttering silk ribbons",
      "flowing waist-length hair with intricate crown braid",
      "messy wolf cut with swept bangs and sidelocks",
      "classic hime cut with blunt bangs and hair intakes",
      "high combat ponytail tied with ornate cord and ahoge",
      "windblown wavy hair with floating hair strands",
      "luxurious twin drill curls with lace hairband",
      "sleek asymmetrical bob cut with hair over one eye",
      "twin braids resting over shoulders with floral hairpins"
    ],

    eyeStyles: [
      "gem-like crimson red eyes with intricate iris highlights",
      "deep ocean sapphire blue eyes with luminous reflections",
      "glowing electric violet eyes with star-shaped pupils",
      "heterochromia (one golden amber eye, one turquoise cyan eye)",
      "radiant emerald green eyes with long colored eyelashes",
      "warm honey gold eyes with soft specular bloom",
      "slit dragon pupils glowing with ethereal cyan light",
      "expressive rose-pink eyes with heart-shaped catchlights"
    ],

    expressions: [
      "gentle serene smile, looking at viewer",
      "smug playful smirk, tilted head",
      "intense focused combat gaze, parted lips",
      "tsundere pout with soft blush on cheeks",
      "mysterious melancholic expression, half-closed eyes (jitome)",
      "confident radiant grin, sparkling eyes",
      "playful wink with peace sign",
      "calm stoic kuudere expression, composed gaze"
    ],

    poses: [
      "dynamic action pose, reaching towards viewer with foreshortening",
      "standing gracefully with hand on hip, wind-blown posture",
      "unsheathing a glowing katana in mid-air leap",
      "seated on a stone ledge looking back over shoulder",
      "casting a radiant spell with floating magic circle around hands",
      "leaning against a rain-streaked balcony railing",
      "dramatic contrapposto stance with billowing cape",
      "holding an antique parasol while looking up at the sky"
    ],

    attire: [
      "futuristic techwear jacket with glowing neon seams and pleated skirt",
      "ceremonial white and crimson miko kimono with gold-embroidered obi",
      "extravagant gothic lolita dress with black velvet ribbons and lace corsetry",
      "sleek neural-link mecha pilot plugsuit with luminescent circuit lines",
      "traditional serafuku sailor uniform with red neckerchief and thighhighs",
      "ornate filigree valkyrie plate armor with flowing royal cape",
      "oversized knitted off-shoulder sweater with headphones around neck",
      "celestial sorceress robe woven with glowing starlight constellations",
      "breezy white summer sundress with ribbon-tied straw hat",
      "steampunk tailored coat with brass gears, leather harness, and corset"
    ],

    accessories: [
      "fluffy kemonomimi fox ears and nine glowing tails",
      "luminous geometric halo floating above head",
      "translucent holographic tactical visor over one eye",
      "ancient rune-etched katana with drifting cherry blossom aura",
      "crystalline astral staff radiating cosmic stardust",
      "delicate kanzashi cherry blossom hairpin with dangling chimes",
      "vintage round wire-frame glasses catching lens flare",
      "floating grimoire spellbook with glowing golden pages",
      "black lace choker and silver cross earrings"
    ],

    scenery: [
      "ancient Shinto shrine courtyard with vermilion torii gates and drifting sakura petals",
      "rain-slicked Neo-Tokyo cyberpunk alley reflecting holographic kanji billboards",
      "colossal floating sky island with overgrown marble ruins and cascading waterfalls",
      "coastal Japanese train station platform at golden sunset overlooking sparkling ocean waves",
      "enchanted bioluminescent forest filled with glowing spirit wisps and giant crystal flora",
      "high school rooftop at twilight overlooking a sprawling city skyline under a split comet",
      "cozy sunlit botanical greenhouse cafe with hanging ferns and warm wooden bookshelves",
      "grand celestial astral observatory under a vivid Milky Way galaxy and colossal moon",
      "snow-blanketed mountain shrine illuminated by paper lanterns and aurora borealis",
      "gothic cathedral interior with towering stained glass windows and moonlit mist"
    ],

    lighting: [
      "cinematic golden hour backlighting, warm rim light, tyndall effect",
      "vibrant cyberpunk neon dual-lighting in electric cyan and magenta bloom",
      "ethereal volumetric god rays (crepuscular rays) piercing through twilight clouds",
      "magical bioluminescent starlight with soft depth-of-field bokeh",
      "high-contrast dramatic chiaroscuro lighting with razor-sharp specular highlights",
      "dappled sunlight filtering through tree leaves, soft studio bloom",
      "Makoto Shinkai twilight sky gradient with lens flare and water reflections",
      "mystical crimson moonlight casting long atmospheric shadows"
    ],

    vfx: [
      "drifting cherry blossom petals, soft chromatic aberration",
      "swirling elemental lightning sparks and glowing energy embers",
      "floating golden magic runes and geometric spell circles",
      "rain droplets frozen in mid-air with puddle mirror reflections",
      "ethereal butterflies made of glowing blue starlight",
      "anamorphic lens flare, subtle film grain, depth of field bokeh"
    ],

    cameraAndComposition: [
      "cowboy shot, dynamic angle, shallow depth of field, sharp focus on eyes",
      "portrait close-up, expressive eyes in razor-sharp focus, creamy bokeh background",
      "dramatic low angle (from below), heroic foreshortening, expansive sky backdrop",
      "dutch angle (tilted frame), high-energy kinetic action composition",
      "wide cinematic establishing shot, rule of thirds, intricate background detail",
      "over-the-shoulder perspective looking back at viewer, windblown hair in foreground",
      "high angle (from above), character looking up at camera, dramatic perspective"
    ],

    studios: [
      "Ufotable style, high-contrast elemental VFX",
      "Kyoto Animation (KyoAni) style, luminous glassy eyes and soft bloom",
      "Makoto Shinkai / CoMix Wave Films style, hyper-detailed clouds and twilight",
      "Studio Ghibli / Hayao Miyazaki style, painterly gouache background",
      "Studio Trigger / Cyberpunk Edgerunners style, bold neon angular linework",
      "MAPPA cinematic dark fantasy style, gritty atmospheric shading",
      "CloverWorks luminous slice-of-life style, delicate pastel lighting",
      "Shaft / Monogatari style, avant-garde geometric composition"
    ],

    qualityBoosters: [
      "masterpiece, best quality, very aesthetic, absurdres, newest",
      "anime key visual, official art, clean crisp lineart, vibrant colors",
      "score_9, score_8_up, score_7_up, source_anime, masterpiece",
      "ultra-detailed anime illustration, trending on Pixiv, 4k resolution"
    ]
  },

  /**
   * Pre-configured style definitions that map to specific prompt modifiers,
   * negative prompts, trigger identifiers, and aesthetic tunings.
   */
  stylePresets: {
    "flux-anime": {
      name: "Modern Digital Anime",
      description: "Crisp lines, vibrant colors, 4K key visual aesthetic (Pixiv / Key Visual)",
      triggerIdentifiers: ["anime key visual", "official art", "clean crisp lineart", "trending on pixiv"],
      promptSuffix: ", modern anime key visual, official art, clean crisp lineart, vibrant rich cel-shaded colors, polished digital illustration, high production value, trending on pixiv, absurdres",
      negativePrompt: "low quality, worst quality, blurry, deformed, bad anatomy, extra limbs, watermark, text, signature, rough sketch, photorealistic, 3d",
      recommendedModel: "flux-anime"
    },
    "illustrious-booru": {
      name: "Illustrious Booru Masterpiece",
      description: "Pure Danbooru tag aesthetic with modern 2024/2025 crisp anime coloring",
      triggerIdentifiers: ["very aesthetic", "absurdres", "newest", "year 2024", "anime coloring"],
      promptSuffix: ", masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest, year 2024, anime coloring, official style, intricate details, sharp focus",
      negativePrompt: "worst quality, old, early, low quality, lowres, signature, username, logo, bad hands, mutated hands, extra digits, fewer digits, anatomical nonsense",
      recommendedModel: "illustrious-xl"
    },
    "retro-90s": {
      name: "90s Retro Cel Anime",
      description: "Classic hand-painted animation cels, VHS grain & warm nostalgic hues",
      triggerIdentifiers: ["1990s (style)", "animation cel", "retro artstyle", "anime screencap"],
      promptSuffix: ", 1990s (style), retro artstyle, classic hand-painted animation cel, vintage anime screencap, cel shading, VHS film grain, muted warm retro color palette, 90s OVA aesthetic",
      negativePrompt: "3D render, digital CGI, modern oversaturated digital art, newest, year 2024, plastic texture, low quality, blurry",
      recommendedModel: "flux-anime"
    },
    "studio-ghibli": {
      name: "Studio Ghibli Watercolor",
      description: "Whimsical, lush pastoral backgrounds, hand-drawn painterly feel",
      triggerIdentifiers: ["Studio Ghibli style", "watercolor (medium)", "painterly background"],
      promptSuffix: ", Hayao Miyazaki Studio Ghibli style, lush painterly gouache and watercolor background, whimsical pastoral atmosphere, warm natural sunlight, hand-drawn traditional animation masterpiece",
      negativePrompt: "dark, gritty, photo, 3D, CGI, plastic, harsh neon, deformed, low quality",
      recommendedModel: "flux-anime"
    },
    "makoto-shinkai": {
      name: "Makoto Shinkai (CoMix Wave)",
      description: "Radiant twilight skies, towering cumulus clouds, emotional lens flare",
      triggerIdentifiers: ["Makoto Shinkai style", "CoMix Wave Films", "volumetric cumulus clouds", "twilight"],
      promptSuffix: ", Makoto Shinkai visual style, CoMix Wave Films aesthetic, dramatic volumetric cumulus clouds, radiant twilight sky, hyper-detailed sparkling reflections, anamorphic lens flare, emotional cinematic anime",
      negativePrompt: "flat colors, simple background, low detail, washed out, dull lighting, low quality, bad anatomy",
      recommendedModel: "flux-anime"
    },
    "cyberpunk-trigger": {
      name: "Cyberpunk / Studio Trigger",
      description: "High saturation, angular action lines, neon futuristic pop (Edgerunners)",
      triggerIdentifiers: ["Studio Trigger style", "Cyberpunk Edgerunners", "chromatic aberration", "neon"],
      promptSuffix: ", Studio Trigger dynamic anime style, Cyberpunk Edgerunners aesthetic, Hiroyuki Imaishi bold angular linework, explosive neon cyan and magenta saturation, chromatic aberration, kinetic action framing",
      negativePrompt: "dull, muted, pastel, washed out, realism, blurry, low resolution, static",
      recommendedModel: "flux-anime"
    },
    "kyoto-animation": {
      name: "Kyoto Animation (KyoAni)",
      description: "Luminous glassy eyes, delicate soft bloom, slice-of-life perfection",
      triggerIdentifiers: ["Kyoto Animation style", "luminous eyes", "soft bloom", "intricate hair"],
      promptSuffix: ", Kyoto Animation (KyoAni) style, delicate expressive character design, luminous multi-layered glassy eye reflections, soft bloom lighting, tyndall effect, intricate floating hair strands",
      negativePrompt: "rough, messy, harsh shadows, grotesque, bad anatomy, deformed face, low quality",
      recommendedModel: "flux-anime"
    },
    "ufotable-action": {
      name: "Ufotable Action (VFX)",
      description: "High contrast darks, dynamic elemental particle VFX, digital compositing",
      triggerIdentifiers: ["Ufotable style", "elemental particle VFX", "backlighting", "glowing aura"],
      promptSuffix: ", Ufotable anime style, high contrast dramatic digital compositing, brilliant elemental particle effects, glowing kinetic energy aura, volumetric embers, cinematic anime battle screencap",
      negativePrompt: "flat lighting, low contrast, washed out, static, boring, deformed, low quality",
      recommendedModel: "flux-anime"
    },
    "mappa-dark": {
      name: "MAPPA Dark Cinematic",
      description: "Gritty atmospheric shading, intense eyes, cinematic camera perspective",
      triggerIdentifiers: ["MAPPA style", "dark cinematic anime", "crosshatching", "dramatic shadows"],
      promptSuffix: ", MAPPA studio anime style, dark cinematic atmosphere, gritty detailed shading, intense expressive eyes, dynamic wide-angle perspective, dramatic chiaroscuro lighting, anime key visual",
      negativePrompt: "pastel, childish, flat shading, low quality, blurry, deformed hands",
      recommendedModel: "flux-anime"
    },
    "manga-ink": {
      name: "Manga Monochrome Ink",
      description: "Crisp black and white G-pen ink, screentone shading, manga panel",
      triggerIdentifiers: ["monochrome", "greyscale", "screentones", "manga lineart"],
      promptSuffix: ", monochrome, greyscale, Japanese manga illustration, high contrast black and white G-pen ink drawing, meticulous screentones, speed lines, crosshatching, dramatic manga page art",
      negativePrompt: "color, colorful, watercolor, 3d, photorealistic, blurry, messy, low quality",
      recommendedModel: "illustrious-xl"
    },
    "light-novel-cg": {
      name: "Light Novel / VN Key Art",
      description: "Ultra-polished character illustration with intricate frills, lace & sparkles",
      triggerIdentifiers: ["light novel illustration", "visual novel CG", "intricate details", "sparkling"],
      promptSuffix: ", light novel cover illustration, visual novel CG masterpiece, ultra-detailed hair highlights, intricate clothing folds and lace trim, sparkling atmospheric particles, vibrant rim lighting",
      negativePrompt: "simple, flat colors, rough sketch, lowres, bad anatomy, extra fingers, watermark",
      recommendedModel: "illustrious-xl"
    },
    "cel-3d-figure": {
      name: "3D Cel / Scale Figurine",
      description: "Stylized 3D anime shader or collectible 1/7 painted PVC scale figure",
      triggerIdentifiers: ["3D anime render", "1/7 scale figure", "subsurface scattering", "octane render"],
      promptSuffix: ", stylized 3D anime render, 1/7 scale painted PVC anime figure aesthetic, subsurface scattering, smooth cel-shaded 3D materials, studio rim lighting, shallow depth of field, octane render",
      negativePrompt: "flat 2D sketch, messy lineart, low poly, pixelated, blurry, deformed",
      recommendedModel: "flux-3d"
    },
    "chibi-sticker": {
      name: "Chibi & Kawaii Sticker",
      description: "Adorable super-deformed proportions, thick outlines, die-cut sticker art",
      triggerIdentifiers: ["chibi", "super deformed", "sticker", "white outline"],
      promptSuffix: ", chibi, super deformed kawaii anime character, large sparkling eyes, die-cut vinyl sticker design with clean white outline, bright pastel pop colors, adorable playful charm",
      negativePrompt: "realistic proportions, tall, grim, dark, gritty, low quality, bad anatomy",
      recommendedModel: "flux-anime"
    },
    "dark-fantasy": {
      name: "Dark Fantasy / Gothic",
      description: "Moody gothic ambiance, glowing ethereal runes, ornate dark filigree armor",
      triggerIdentifiers: ["dark fantasy", "gothic", "ornate filigree armor", "glowing runes"],
      promptSuffix: ", dark fantasy anime masterpiece, gothic atmosphere, intricate ornate dark filigree armor, glowing ethereal magic runes, misty volumetric moonlight, moody epic composition",
      negativePrompt: "cheerful, bright pastel, comedic, modern casual, low quality, deformed, blurry",
      recommendedModel: "flux-anime"
    }
  },

  /**
   * Pre-built Perchance Template Library
   * Includes classic {a|b|c} syntax, weighted {60% a|40% b} syntax, and [wildcard] syntax
   */
  templates: [
    {
      id: "magical-girl",
      title: "Astral Magical Girl Awakening",
      category: "Fantasy",
      recommendedModel: "flux-anime",
      icon: "✨",
      template: "1girl, solo, magical girl in {ornate white and rose-gold frilled dress|flowing celestial starry gown with translucent ribbons}, {sakura pink|platinum blonde|iridescent silver} hair in {long flowing twintails|elaborate twin drill curls|windblown waves with hair intakes}, {radiant ruby|sparkling sapphire|star-shaped violet} eyes, wielding a {glowing crystal star scepter|winged astral staff}, surrounded by {floating geometric magic circles and starlight|swirling glowing cherry blossoms|cosmic nebula sparkles}, {ancient Shinto shrine at twilight|floating marble sky sanctuary}, dramatic backlighting, tyndall effect, anime key visual, masterpiece"
    },
    {
      id: "cyberpunk-ronin",
      title: "Cyberpunk Edgerunner Ronin",
      category: "Sci-Fi",
      recommendedModel: "flux-anime",
      icon: "⚡",
      template: "1girl, solo, cyberpunk street ronin, {midnight black|neon aqua cyan|crimson} hair in {an asymmetrical wolf cut|high combat ponytail|sleek bob cut with glowing neural hairpins}, {glowing cybernetic optics|slit neon violet eyes}, wearing {oversized techwear trenchcoat with illuminated holographic collar|sleek carbon-fiber tactical armor and pleated skirt}, unsheathing a {thermal katana wreathed in plasma arcs|dual high-frequency neon blades}, {rain-drenched Neo-Tokyo alley with neon kanji reflections in puddles|skyline megastructure rooftop in pouring rain}, dutch angle, chromatic aberration, volumetric neon fog, Studio Trigger aesthetic"
    },
    {
      id: "illustrious-booru-pro",
      title: "Illustrious XL Canonical Booru Formula",
      category: "Model Showcase",
      recommendedModel: "illustrious-xl",
      icon: "🏷️",
      template: "masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest, year 2024, 1girl, solo, {silver hair|sakura pink hair|aqua hair}, {long twintails|hime cut|floating hair}, {blunt bangs|swept bangs}, {red eyes|blue eyes|heterochromia}, {gentle smile|smug smirk|tsundere pout}, {looking at viewer}, {serafuku sailor uniform|gothic lolita dress|miko kimono}, {cowboy shot|upper body}, {from below|dutch angle}, {cherry blossom shrine courtyard|sunset train station platform|starry observatory}, backlighting, bloom, depth of field, chromatic aberration, anime coloring"
    },
    {
      id: "pony-v6-dynamic",
      title: "Pony V6 XL Score-9 Dynamic Action",
      category: "Model Showcase",
      recommendedModel: "pony-xl",
      icon: "🐎",
      template: "score_9, score_8_up, score_7_up, score_6_up, source_anime, rating_safe, 1girl, solo, {valkyrie knight|kitsune spirit swordswoman|dark elf archmage}, {platinum blonde|silver white|crimson} windblown hair, {glowing golden eyes|fierce emerald eyes}, wearing {ornate silver filigree armor with tattered royal cape|ceremonial battle kimono with glowing runes}, {dynamic mid-air combat pose with foreshortening|casting an explosive elemental spell towards camera}, {worm's-eye view|tilted dutch angle}, {shattered floating temple ruins|stormy lightning battlefield}, volumetric god rays, flying embers, masterpiece"
    },
    {
      id: "wildcard-sandbox",
      title: "Infinite [Wildcard] Combinatorial Generator",
      category: "Wildcard Engine",
      recommendedModel: "flux-anime",
      icon: "🎲",
      template: "[subject], [hair], [eyes], [expression], [pose], wearing [outfit], [accessory], in a [scenery], [lighting], [vfx], [camera], [studio], [quality]"
    },
    {
      id: "ghibli-countryside",
      title: "Ghibli Pastoral Summer Afternoon",
      category: "Slice of Life",
      recommendedModel: "flux-anime",
      icon: "🍃",
      template: "1girl, solo, wearing {breezy floral sundress and ribbon straw hat|vintage linen apron over puffed-sleeve blouse}, {chestnut brown|soft raven black} hair with {wind-tousled bangs|twin braided pigtails}, {warm peaceful smile|curious wonder-filled gaze}, {standing on a grassy hillside overlooking coastal train tracks and sparkling blue sea|tending a sunlit greenhouse overflowing with sunflowers and climbing ivy}, {towering white cumulus clouds in deep azure summer sky|warm golden late-afternoon sunlight}, Hayao Miyazaki Studio Ghibli style, lush painterly gouache background, nostalgic emotional atmosphere"
    },
    {
      id: "shinkai-twilight",
      title: "Makoto Shinkai Comet & Twilight Sky",
      category: "Cinematic",
      recommendedModel: "flux-anime",
      icon: "🌆",
      template: "{60% 1girl, solo|40% 1girl and 1boy standing side by side}, {windblown school uniform and fluttering scarf|casual summer festival yukata}, gazing up at {a breathtaking split comet streaking across a violet-and-amber twilight sky|colossal illuminated cumulus clouds reflecting in rain-soaked rooftop puddles}, distant Tokyo tower skyline silhouette, Makoto Shinkai CoMix Wave Films visual style, hyper-detailed sky physics, anamorphic lens flare, emotional cinematic key visual"
    },
    {
      id: "shonen-awakening",
      title: "Ufotable Shonen Elemental Awakening",
      category: "Action",
      recommendedModel: "flux-anime",
      icon: "🔥",
      template: "{1boy|1girl}, solo, anime warrior in low combat stance, {spiky crimson hair|flowing silver hair} surging upward, {fierce glowing eyes with slit pupils}, wearing {battle-worn haori coat over dark demon-slayer uniform|ornate dragon-scale armor}, unleashing {swirling Hinokami dragon flames and glowing embers|crackling azure lightning breathing aura}, shattered stone ground, extreme foreshortening, dramatic low angle, Ufotable digital compositing, high-contrast particle VFX"
    },
    {
      id: "gothic-moonlight",
      title: "Gothic Lolita Blood-Moon Cathedral",
      category: "Gothic",
      recommendedModel: "illustrious-xl",
      icon: "🌙",
      template: "1girl, solo, gothic lolita vampire aristocrat, porcelain skin, {silver white|obsidian black} hair in {extravagant twin drill curls|waist-length waves with black rose headdress}, {glowing crimson eyes|heterochromia red and gold eyes}, wearing {layered Victorian velvet mourning dress with lace parasol}, surrounded by {fluttering scarlet butterflies and drifting rose petals}, inside {a ruined gothic cathedral under a colossal blood-red full moon|a candlelit baroque throne room with stained glass}, chiaroscuro moonlight, dark romantic anime masterpiece"
    },
    {
      id: "mecha-cockpit",
      title: "Mecha Pilot Neural Sync 100%",
      category: "Mecha",
      recommendedModel: "flux-anime",
      icon: "🤖",
      template: "1girl, solo, elite mecha pilot, {short lavender hair with headset clips|long fiery red ponytail}, wearing {form-fitting white and cyan neural plugsuit with glowing telemetry nodes}, seated inside {the panoramic holographic cockpit of an orbital combat mecha}, {translucent orange HUD targeting reticles reflecting in her eyes|floating holographic diagnostic screens surrounding her}, orbital earth horizon and starfield visible through cockpit glass, dramatic neon rim lighting, Gainax / Studio Trigger mecha aesthetic"
    },
    {
      id: "scale-figurine-3d",
      title: "1/7 Scale Collectible Anime Figure",
      category: "3D & Figure",
      recommendedModel: "flux-3d",
      icon: "🏆",
      template: "1girl, solo, collectible 1/7 scale painted PVC anime figure of a {celestial dragon swordswoman|magical idol singer|cyberpunk Valkyrie}, {translucent gradient hair tips with pearl finish}, dynamic pose atop a {sculpted crystal diorama display base with translucent water splashes|ruined marble pillar base with LED flame effects}, studio macro product photography, subsurface scattering on skin, smooth satin paint finish, soft dual rim lighting, shallow depth of field, Good Smile Company Alter masterpiece"
    },
    {
      id: "cozy-cafe",
      title: "KyoAni Rainy Window Bookshop Cafe",
      category: "Slice of Life",
      recommendedModel: "flux-anime",
      icon: "☕",
      template: "1girl, solo, gentle bookshop barista, {warm honey-brown hair in loose low bun with stray locks|soft chestnut bob cut}, {warm comforting smile, looking at viewer}, wearing {oversized cream cable-knit turtleneck sweater and dark cafe apron}, holding {a ceramic mug of steaming matcha latte with leaf foam art}, seated beside {a rain-streaked vintage window overlooking an autumn cobblestone street}, warm tungsten fairy lights bokeh, soft bloom lighting, Kyoto Animation slice-of-life masterpiece"
    }
  ],

  /**
   * Real-time Prompt Coach & Pillar Analyzer
   * Evaluates a user's prompt against the 7 core pillars of anime prompt engineering
   * and checks for model-specific trigger identifiers.
   */
  analyzePrompt(rawPrompt, modelKey = 'flux-anime') {
    const text = (rawPrompt || '').trim();
    const lower = text.toLowerCase();
    const profile = this.modelProfiles[modelKey] || this.modelProfiles['flux-anime'];

    const pillarDefs = [
      {
        id: 'subject',
        label: 'Subject & Count',
        icon: '👤',
        regex: /\b(1girl|1boy|2girls|2boys|solo|girl|boy|woman|man|heroine|warrior|samurai|ronin|magical girl|miko|maid|elf|witch|mage|sorceress|knight|pilot|princess|vampire|kitsune|catgirl|kemonomimi|idol|student|barista|chibi|character|couple|protagonist)\b|\[(subject)\]/i,
        suggestions: ['1girl, solo', '1boy, solo', 'magical girl', 'cyberpunk samurai', 'miko shrine maiden', 'elf archmage']
      },
      {
        id: 'appearance',
        label: 'Hair, Eyes & Expression',
        icon: '👁️',
        regex: /\b(hair|twintails|ponytail|braid|bob|hime cut|bangs|ahoge|drills|eyes|heterochromia|pupils|eyelashes|smile|grin|smirk|pout|blush|wink|stoic|tsundere|kuudere|expression|gaze|crying|tears)\b|\[(hair|haircolor|hairstyle|eyes|expression)\]/i,
        suggestions: ['silver hair, long twintails', 'glowing sapphire eyes', 'heterochromia', 'gentle smile, blush', 'blunt bangs, sidelocks']
      },
      {
        id: 'outfit',
        label: 'Attire, Fabrics & Props',
        icon: '👘',
        regex: /\b(uniform|serafuku|kimono|yukata|miko|dress|gown|lolita|armor|plugsuit|bodysuit|techwear|jacket|coat|hoodie|sweater|turtleneck|robe|cloak|cape|apron|skirt|thighhighs|ribbon|lace|katana|sword|staff|wand|parasol|glasses|visor|wings|halo|horns|ears)\b|\[(outfit|attire|accessory)\]/i,
        suggestions: ['serafuku sailor uniform', 'ornate gothic lolita dress', 'cyberpunk techwear jacket', 'ceremonial miko kimono', 'glowing katana']
      },
      {
        id: 'poseCamera',
        label: 'Pose, Angle & Framing',
        icon: '🎥',
        regex: /\b(pose|stance|standing|sitting|seated|leaping|floating|reaching|holding|wielding|looking at viewer|looking back|looking up|head tilt|portrait|close-up|upper body|cowboy shot|full body|wide shot|low angle|high angle|from below|from above|dutch angle|foreshortening|pov|over-the-shoulder|profile|depth of field|bokeh)\b|\[(pose|camera|angle)\]/i,
        suggestions: ['cowboy shot, looking at viewer', 'dramatic low angle (from below)', 'dutch angle, dynamic pose', 'shallow depth of field, bokeh', 'foreshortening, reaching out']
      },
      {
        id: 'setting',
        label: 'Environment & Scenery',
        icon: '⛩️',
        regex: /\b(shrine|torii|temple|alley|tokyo|city|skyline|rooftop|island|ruins|train|station|classroom|cafe|library|observatory|forest|meadow|garden|cathedral|castle|throne|beach|ocean|sea|mountain|sky|clouds|moon|starry|galaxy|street|window|room|background)\b|\[(scenery|setting)\]/i,
        suggestions: ['cherry blossom Shinto shrine', 'rain-slicked Neo-Tokyo neon alley', 'twilight rooftop overlooking city', 'floating sky island ruins', 'starlit astral observatory']
      },
      {
        id: 'lightingVfx',
        label: 'Lighting, Atmosphere & VFX',
        icon: '✨',
        regex: /\b(lighting|backlighting|rim light|god rays|volumetric|tyndall|sunlight|golden hour|twilight|sunset|moonlight|neon|bioluminescent|chiaroscuro|shadows|bloom|glow|sparkles|petals|sakura|embers|sparks|lightning|runes|magic circle|rain|reflections|snow|aurora|lens flare|chromatic aberration|ray tracing|subsurface scattering)\b|\[(lighting|vfx)\]/i,
        suggestions: ['cinematic backlighting, rim light', 'volumetric god rays, tyndall effect', 'chromatic aberration, bloom', 'drifting sakura petals, bokeh', 'neon cyan and magenta glow']
      },
      {
        id: 'modelTriggers',
        label: `${profile.shortName} Triggers`,
        icon: '⚡',
        regex: modelKey === 'pony-xl'
          ? /\b(score_9|score_8_up|source_anime)\b/i
          : (modelKey === 'illustrious-xl' || modelKey === 'animagine-xl')
            ? /\b(masterpiece|best quality|very aesthetic|absurdres|newest|year 2024|year 2025)\b/i
            : modelKey === 'flux-3d'
              ? /\b(3d anime|cel-shaded 3d|pvc|scale figure|subsurface scattering|octane render|unreal engine)\b/i
              : /\b(masterpiece|best quality|key visual|official art|lineart|cel shad|studio|pixiv|highres|absurdres|8k|4k)\b|\[(quality|studio)\]/i,
        suggestions: profile.triggerWords.slice(0, 6)
      }
    ];

    const pillars = pillarDefs.map(p => {
      const match = text.match(p.regex);
      return {
        id: p.id,
        label: p.label,
        icon: p.icon,
        present: Boolean(match),
        matchedWord: match ? match[0] : null,
        suggestions: p.suggestions
      };
    });

    const presentCount = pillars.filter(p => p.present).length;
    const score = text.length === 0 ? 0 : Math.min(100, Math.round((presentCount / pillars.length) * 100));

    let level = 'Needs Detail';
    if (score >= 85) level = 'Studio Masterpiece';
    else if (score >= 70) level = 'Strong Prompt';
    else if (score >= 45) level = 'Balanced Draft';

    // Identify model-specific trigger words not yet in prompt
    const missingModelTriggers = profile.triggerWords.filter(
      trig => !lower.includes(trig.toLowerCase())
    );

    // Model-specific diagnostic warnings / tips
    const warnings = [];
    if (modelKey === 'pony-xl' && !lower.includes('score_9')) {
      warnings.push('Pony V6 XL works best when prefixed with "score_9, score_8_up, score_7_up, source_anime".');
    }
    if ((modelKey === 'illustrious-xl' || modelKey === 'animagine-xl') && !lower.includes('1girl') && !lower.includes('1boy') && !lower.includes('[subject]')) {
      warnings.push(`${profile.shortName} relies on Booru subject count tags like "1girl, solo" or "1boy, solo".`);
    }
    if ((modelKey === 'flux-anime' || modelKey === 'flux') && /\(\([^)]+\)\)/.test(text)) {
      warnings.push('FLUX uses a T5 natural language encoder that ignores ((double parentheses)) — use descriptive adjectives instead.');
    }
    if (modelKey === 'turbo' && text.split(/\s+/).length > 65) {
      warnings.push('SDXL Turbo prioritizes the first ~60 words. Consider keeping the prompt concise and front-loaded.');
    }

    return {
      score,
      level,
      presentCount,
      totalPillars: pillars.length,
      pillars,
      missingModelTriggers,
      warnings,
      profile
    };
  },

  /**
   * Optimizes and enriches a prompt specifically for the chosen model architecture
   * without duplicating existing tags.
   */
  optimizePromptForModel(rawPrompt, modelKey = 'flux-anime') {
    const profile = this.modelProfiles[modelKey] || this.modelProfiles['flux-anime'];
    let text = (rawPrompt || '').trim();
    if (!text) {
      text = this.generateRandomPrompt(modelKey);
    }

    const lower = text.toLowerCase();
    const analysis = this.analyzePrompt(text, modelKey);

    // 1. Ensure subject count identifier for Booru/Pony models
    if ((modelKey === 'illustrious-xl' || modelKey === 'animagine-xl' || modelKey === 'pony-xl') &&
        !lower.includes('1girl') && !lower.includes('1boy') && !lower.includes('2girls') && !lower.includes('[subject]')) {
      text = `1girl, solo, ${text}`;
    }

    // 2. Apply model-specific prefix identifiers if missing
    if (modelKey === 'pony-xl' && !lower.includes('score_9')) {
      text = `score_9, score_8_up, score_7_up, score_6_up, source_anime, rating_safe, ${text}`;
    } else if (modelKey === 'illustrious-xl' && !lower.includes('very aesthetic')) {
      text = `masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest, year 2024, ${text}`;
    }

    // 3. Add missing high-impact pillars if prompt is sparse
    const updatedLower = text.toLowerCase();
    const additions = [];

    if (!analysis.pillars.find(p => p.id === 'poseCamera')?.present) {
      additions.push('cowboy shot, dynamic angle, looking at viewer, depth of field');
    }
    if (!analysis.pillars.find(p => p.id === 'lightingVfx')?.present) {
      additions.push('cinematic backlighting, volumetric lighting, soft bloom');
    }

    // 4. Add model-specific suffix identifiers if not already present
    if (modelKey === 'animagine-xl' && !updatedLower.includes('very aesthetic')) {
      additions.push('masterpiece, best quality, very aesthetic, newest, safe');
    } else if (modelKey === 'flux-anime' && !updatedLower.includes('key visual')) {
      additions.push('anime key visual, official art, clean crisp lineart, vibrant cel shading, high production value');
    } else if (modelKey === 'flux-3d' && !updatedLower.includes('3d anime')) {
      additions.push('stylized 3D anime render, subsurface scattering, global illumination, studio rim lighting, octane render');
    } else if (modelKey === 'flux' && !updatedLower.includes('cinematic lighting')) {
      additions.push('masterpiece illustration, ultra-detailed, cinematic lighting, sharp focus');
    }

    if (additions.length > 0) {
      text = `${text.replace(/,\s*$/, '')}, ${additions.join(', ')}`;
    }

    return text;
  },

  /**
   * Generates a completely randomized, model-tuned anime prompt
   * using the internal dictionary and Perchance combinatorial logic.
   */
  generateRandomPrompt(modelKey = 'flux-anime') {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const subject = pick(this.dictionary.subjects);
    const hairColor = pick(this.dictionary.hairColors);
    const hairStyle = pick(this.dictionary.hairStyles);
    const eyeStyle = pick(this.dictionary.eyeStyles);
    const expression = pick(this.dictionary.expressions);
    const pose = pick(this.dictionary.poses);
    const attire = pick(this.dictionary.attire);
    const accessory = Math.random() > 0.25 ? `, ${pick(this.dictionary.accessories)}` : "";
    const scenery = pick(this.dictionary.scenery);
    const lighting = pick(this.dictionary.lighting);
    const vfx = pick(this.dictionary.vfx);
    const camera = pick(this.dictionary.cameraAndComposition);

    let core = `${subject}, ${hairColor} ${hairStyle}, ${eyeStyle}, ${expression}, ${pose}, wearing ${attire}${accessory}, ${scenery}, ${lighting}, ${vfx}, ${camera}`;

    if (modelKey === 'pony-xl') {
      return `score_9, score_8_up, score_7_up, source_anime, rating_safe, ${core}`;
    } else if (modelKey === 'illustrious-xl') {
      return `masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest, year 2024, ${core}, anime coloring`;
    } else if (modelKey === 'animagine-xl') {
      return `${core}, masterpiece, best quality, very aesthetic, newest, safe`;
    } else if (modelKey === 'flux-3d') {
      return `${core}, stylized 3D anime render, subsurface scattering, global illumination, octane render`;
    }
    return `${core}, anime key visual, official art, masterpiece`;
  },

  /**
   * Generates a Perchance-syntax template with inline curly braces
   * that the user can explore or edit.
   */
  generateRandomTemplate(modelKey = 'flux-anime') {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const pickTwo = arr => {
      const a = pick(arr);
      let b = pick(arr);
      while (b === a) b = pick(arr);
      return `{${a}|${b}}`;
    };

    const hairSet = pickTwo(this.dictionary.hairColors);
    const hairStyleSet = pickTwo(this.dictionary.hairStyles);
    const eyeSet = pickTwo(this.dictionary.eyeStyles);
    const expressionSet = pickTwo(this.dictionary.expressions);
    const poseSet = pickTwo(this.dictionary.poses);
    const attireSet = pickTwo(this.dictionary.attire);
    const scenerySet = pickTwo(this.dictionary.scenery);
    const lightingSet = pickTwo(this.dictionary.lighting);

    const prefix = modelKey === 'pony-xl'
      ? 'score_9, score_8_up, source_anime, 1girl, solo'
      : modelKey === 'illustrious-xl'
        ? 'masterpiece, best quality, very aesthetic, newest, 1girl, solo'
        : '1girl, solo';

    return `${prefix}, ${hairSet} ${hairStyleSet}, ${eyeSet}, ${expressionSet}, ${poseSet}, wearing ${attireSet}, ${scenerySet}, ${lightingSet}, anime key visual, masterpiece`;
  },

  /**
   * Comprehensive Interactive Tag & Model Identifier Lexicon (350+ tokens across 13 categories)
   */
  getTagCategories() {
    return [
      {
        id: "model-triggers",
        name: "⚡ Model Quality, Era & Score Identifiers",
        description: "Core conditioning tokens recognized by FLUX, Illustrious XL, Animagine XL, and Pony V6",
        tags: [
          "masterpiece", "best quality", "amazing quality", "great quality", "very aesthetic",
          "absurdres", "highres", "ultra-detailed", "intricate details", "anime key visual",
          "official art", "official style", "anime coloring", "clean crisp lineart",
          "cel shading", "newest", "year 2025", "year 2024", "recent", "mid", "early", "old",
          "1990s (style)", "1980s (style)", "retro artstyle", "anime screencap",
          "light novel illustration", "visual novel CG", "game CG", "promotional art",
          "trending on Pixiv", "score_9", "score_8_up", "score_7_up", "score_6_up",
          "source_anime", "rating_safe"
        ]
      },
      {
        id: "subject-count",
        name: "👤 Subject Count & Character Archetypes",
        description: "Booru subject count identifiers and classic anime character classes",
        tags: [
          "1girl", "solo", "1boy", "2girls", "1girl 1boy", "multiple girls", "solo focus",
          "chibi", "super deformed", "magical girl", "miko (shrine maiden)", "cyberpunk netrunner",
          "ronin swordswoman", "kunoichi ninja", "valkyrie knight", "kuudere elf archmage",
          "tsundere student", "mecha pilot", "gothic lolita noble", "vampire princess",
          "kitsune fox spirit", "kemonomimi catgirl", "dragonborn empress", "onmyoji exorcist",
          "alchemist witch", "steampunk engineer", "idol singer", "cozy cafe barista",
          "angelic paladin", "demon queen"
        ]
      },
      {
        id: "camera-angles",
        name: "🎥 Camera Angles, Framing & Lenses",
        description: "Canonical Danbooru & cinematic camera identifiers to control shot composition",
        tags: [
          "portrait", "close-up", "extreme close-up", "upper body", "cowboy shot", "full body",
          "wide shot", "establishing shot", "from below", "low angle", "worm's-eye view",
          "from above", "high angle", "bird's-eye view", "dutch angle", "tilted frame",
          "from side", "profile", "from behind", "over-the-shoulder", "pov", "foreshortening",
          "fisheye lens", "panoramic", "85mm f/1.4 lens", "35mm cinematic lens",
          "shallow depth of field", "bokeh", "blurry foreground", "blurry background",
          "sharp focus", "motion blur", "vignette", "rule of thirds"
        ]
      },
      {
        id: "hair-styles",
        name: "💇‍♀️ Haircuts, Bangs & Hair Physics",
        description: "Precise Booru hair taxonomy and color gradient identifiers",
        tags: [
          "silver hair", "white hair", "platinum blonde hair", "golden blonde hair",
          "sakura pink hair", "pastel pink hair", "crimson red hair", "aqua cyan hair",
          "cobalt blue hair", "midnight black hair", "lavender hair", "amethyst violet hair",
          "emerald green hair", "Chestnut brown hair", "multicolored hair", "gradient hair",
          "inner color hair", "streaked hair", "split-color hair", "translucent hair tips",
          "twintails", "low twintails", "ponytail", "high ponytail", "side ponytail",
          "braid", "twin braids", "crown braid", "hime cut", "bob cut", "wolf cut",
          "pixie cut", "drill hair", "twin drills", "floating hair", "windblown hair",
          "very long hair", "wavy hair", "messy hair", "blunt bangs", "swept bangs",
          "parted bangs", "crossed bangs", "hair over one eye", "sidelocks", "hair intakes", "ahoge"
        ]
      },
      {
        id: "eyes-expressions",
        name: "👁️ Eyes, Pupils & Micro-Expressions",
        description: "Eye colors, specialized pupil shapes, gaze direction, and facial emotions",
        tags: [
          "sapphire blue eyes", "crimson red eyes", "golden amber eyes", "emerald green eyes",
          "amethyst purple eyes", "aqua eyes", "rose pink eyes", "heterochromia",
          "glowing eyes", "sparkling eyes", "luminous glassy eyes", "star-shaped pupils",
          "heart-shaped pupils", "slit pupils", "ringed eyes", "detailed iris",
          "long eyelashes", "colored eyelashes", "looking at viewer", "looking back",
          "looking up", "looking away", "looking to the side", "half-closed eyes (jitome)",
          "gentle smile", "confident grin", "smug smirk", "tsundere pout", "blush",
          "full-face blush", "embarrassed", "playful wink", "one eye closed", "parted lips",
          "open mouth", "stoic expression", "determined gaze", "melancholic gaze",
          "tearing up", "crying", "surprised", "yandere gaze", "head tilt"
        ]
      },
      {
        id: "poses-actions",
        name: "🤸 Dynamic Poses, Gestures & Actions",
        description: "Action stances, hand gestures, and character interaction identifiers",
        tags: [
          "dynamic action pose", "combat stance", "mid-air leap", "floating in air",
          "reaching towards viewer", "outstretched hand", "hand on hip", "arms crossed",
          "peace sign (v sign)", "salute", "adjusting glasses", "holding weapon",
          "unsheathing sword", "casting spell", "praying hands", "holding umbrella",
          "holding teacup", "reading book", "sitting on ledge", "leaning forward",
          "contrapposto", "arching back", "walking in rain", "running", "dancing"
        ]
      },
      {
        id: "outfits-fabrics",
        name: "👘 Outfits, Costumes & Fabric Materials",
        description: "Traditional, modern, sci-fi, and fantasy garments plus shader material tags",
        tags: [
          "serafuku (sailor uniform)", "blazer school uniform", "miko kimono", "furisode kimono",
          "summer yukata", "hakama", "gothic lolita dress", "sweet lolita dress",
          "victorian maid apron", "butler suit", "cyberpunk techwear jacket", "tactical harness",
          "neural pilot plugsuit", "ornate valkyrie armor", "filigree plate armor",
          "dark fantasy cloak", "celestial sorceress robe", "oversized hoodie",
          "off-shoulder sweater", "cable-knit turtleneck", "white summer sundress",
          "frilled dress", "evening gown", "wedding dress", "steampunk corset",
          "pleated skirt", "thighhighs", "zettai ryouiki", "black pantyhose", "fingerless gloves",
          "lace trim", "velvet ribbons", "silk fabric", "translucent fabric", "iridescent fabric",
          "wet clothes", "gold embroidery", "detached sleeves"
        ]
      },
      {
        id: "weapons-props",
        name: "⚔️ Weapons, Magic Props & Accessories",
        description: "Iconic anime weapons, headgear, wings, and ornamental details",
        tags: [
          "katana", "glowing rune sword", "plasma blade", "greatsword", "ornate scythe",
          "crystal magic staff", "star wand", "floating grimoire", "floating magic circle",
          "bow and energy arrow", "dual cyberpunk pistols", "cybernetic arm",
          "mechanical wings", "feathered angel wings", "bat demon wings", "translucent fairy wings",
          "glowing halo", "oni horns", "dragon horns", "fox ears", "nine fox tails",
          "cat ears (nekomimi)", "pointed elf ears", "holographic visor", "goggles on head",
          "headphones", "round glasses", "eyepatch", "lace parasol", "paper lantern",
          "folding fan (sensu)", "kanzashi floral hairpin", "silk hair ribbon",
          "black choker", "witch hat", "crown", "tiara"
        ]
      },
      {
        id: "lighting-vfx",
        name: "🌟 Lighting Physics, Color & Atmospheric VFX",
        description: "Studio compositing, light transport, particles, and camera optical effects",
        tags: [
          "cinematic lighting", "backlighting", "rim lighting", "volumetric lighting",
          "god rays (crepuscular rays)", "tyndall effect", "chiaroscuro", "dramatic shadows",
          "dappled sunlight", "golden hour sunset", "blue hour twilight", "crimson moonlight",
          "cyberpunk neon lighting", "bioluminescence", "soft studio bloom", "anamorphic lens flare",
          "chromatic aberration", "subsurface scattering", "raytraced reflections",
          "caustics", "iridescent highlights", "drifting cherry blossom petals",
          "falling autumn leaves", "floating fire embers", "sparks", "crackling lightning aura",
          "glowing magic runes", "spirit wisps", "glowing butterflies", "rain droplets",
          "water puddle reflections", "snowflakes", "aurora borealis", "starlight bokeh"
        ]
      },
      {
        id: "environments",
        name: "⛩️ Environments, Architecture & Worldbuilding",
        description: "Detailed anime background settings and skyscapes",
        tags: [
          "Shinto shrine courtyard", "vermilion torii gates", "cherry blossom forest",
          "bamboo forest", "Neo-Tokyo cyberpunk alley", "holographic city skyline",
          "school rooftop at sunset", "coastal train station platform", "train interior",
          "sunlit classroom", "cozy botanical bookshop cafe", "ancient grand library",
          "celestial astral observatory", "floating sky island", "overgrown marble ruins",
          "bioluminescent crystal cavern", "underwater Atlantis ruins", "gothic cathedral",
          "stained glass windows", "baroque throne room", "snowy mountain hot spring (onsen)",
          "traditional tatami tea room", "post-apocalyptic overgrown metropolis",
          "sea of clouds", "towering cumulus clouds", "starry Milky Way sky",
          "split comet in twilight sky", "colossal full moon"
        ]
      },
      {
        id: "studio-aesthetics",
        name: "🎨 Anime Studios, Directors & Art Mediums",
        description: "Recognized studio visual signatures, mediums, and rendering styles",
        tags: [
          "Ufotable style", "Kyoto Animation (KyoAni) style", "Makoto Shinkai style",
          "CoMix Wave Films aesthetic", "Studio Ghibli style", "Hayao Miyazaki style",
          "Studio Trigger style", "Hiroyuki Imaishi style", "MAPPA style", "CloverWorks style",
          "Shaft / Monogatari style", "Arc System Works cel-shaded 3D",
          "Honkai Star Rail 3D shader style", "1/7 scale PVC anime figure",
          "Good Smile Company aesthetic", "watercolor (medium)", "gouache background",
          "impasto oil painting", "monochrome", "greyscale", "manga screentones",
          "G-pen ink lineart", "die-cut vinyl sticker", "pixel art anime"
        ]
      },
      {
        id: "negative-identifiers",
        name: "🚫 Negative Prompt Identifiers (Click to Exclude)",
        description: "Click any token here to add it directly to your Negative Prompt box",
        isNegative: true,
        tags: [
          "worst quality", "low quality", "lowres", "bad anatomy", "bad hands",
          "mutated hands", "extra fingers", "missing fingers", "fewer digits", "extra digits",
          "extra limbs", "missing limbs", "bad proportions", "anatomical nonsense",
          "deformed", "disfigured", "ugly", "blurry", "jpeg artifacts", "watermark",
          "text", "signature", "username", "logo", "artist name", "cropped", "out of frame",
          "old", "early", "oldest", "score_4", "score_5", "score_6", "source_furry",
          "source_pony", "source_cartoon", "3d", "photorealistic", "cgi", "plastic skin",
          "flat colors", "oversaturated", "simple background", "bad feet", "cross-eyed"
        ]
      }
    ];
  }
};
