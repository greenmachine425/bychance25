/**
 * Bychance - Perchance-style Template Syntax & Anime Generator Engine
 * 
 * Implements:
 * 1. Perchance syntax parsing ({a|b|c}, weighted choices, nested sets)
 * 2. Comprehensive anime generation dictionary & prompt randomizer
 * 3. Pre-made generator templates (Ghibli, Shinkai, 90s Cel, Cyberpunk, etc.)
 * 4. Tag builder catalog for interactive prompt construction
 */

export const PerchanceEngine = {
  /**
   * Parse and evaluate Perchance syntax in a text string.
   * Supports:
   * - Basic sets: {apple|banana|cherry}
   * - Nested sets: {cute {cat|fox} girl|badass {samurai|ninja}}
   * - Weighted chances: {50% high chance|25% medium|25% rare}
   */
  evaluate(template) {
    if (!template || typeof template !== 'string') return '';

    let text = template;
    const maxIterations = 20;
    let iteration = 0;

    // Iteratively resolve innermost { ... } blocks
    while (iteration < maxIterations) {
      const match = text.match(/\{([^{}]+)\}/);
      if (!match) break;

      const fullMatch = match[0];
      const innerContent = match[1];
      const selectedOption = this._chooseFromSet(innerContent);

      text = text.replace(fullMatch, () => selectedOption);
      iteration++;
    }

    return text.trim();
  },

  /**
   * Helper to pick one option from a pipe-delimited string
   * Handles weighted options like '50% a|50% b' or plain 'a|b|c'
   */
  _chooseFromSet(innerContent) {
    const rawOptions = innerContent.split('|').map(s => s.trim()).filter(s => s.length > 0);
    if (rawOptions.length === 0) return '';

    // Check for percentage weights (e.g., "60% option A")
    let hasWeights = false;
    const weightedOptions = [];
    let totalWeight = 0;

    for (const opt of rawOptions) {
      const weightMatch = opt.match(/^(\d+(?:\.\d+)?)\s*%\s*(.*)$/);
      if (weightMatch) {
        hasWeights = true;
        const weight = parseFloat(weightMatch[1]);
        const val = weightMatch[2].trim();
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
   * Comprehensive anime dictionary for prompt construction & randomization
   */
  dictionary: {
    subjects: [
      "1girl, beautiful anime heroine",
      "1girl, cyberpunk blade runner",
      "1girl, magical girl in ornate dress",
      "1girl, shrine maiden (miko)",
      "1girl, kuudere elf sorceress",
      "1girl, tsundere academy student",
      "1girl, mecha pilot in plugsuit",
      "1girl, gothic lolita princess",
      "1girl, wandering ronin swordsman",
      "1girl, cyberpunk hacker with tech visor",
      "1girl, celestial dragon princess",
      "1girl, cozy slice-of-life barista",
      "1girl, ethereal fairy with translucent wings",
      "1boy, charismatic shonen protagonist",
      "1boy, stoic dark fantasy swordsman",
      "1boy, futuristic cyber vigilante",
      "1boy, mysterious academy prodigy",
      "1girl and 1boy, romantic anime couple under umbrella",
      "chibi anime mascot with adorable companion"
    ],

    hairColors: [
      "silver white", "sakura pastel pink", "midnight raven black", "golden blonde",
      "glowing cyan", "crimson red", "twilight violet", "emerald green",
      "two-tone pastel lavender and mint", "fiery gradient orange"
    ],

    hairStyles: [
      "twin tails with fluttering ribbons", "flowing long hair with intricate braid",
      "messy short bob with side fringe", "hime cut with blunt bangs",
      "high ponytail tied with silk cord", "loose wavy hair drifting in wind",
      "elaborate braided bun with floral hairpins", "spiky dynamic anime hair"
    ],

    eyeStyles: [
      "gem-like crimson eyes", "deep ocean sapphire blue eyes", "glowing electric violet eyes",
      "heterochromia (one gold eye, one turquoise eye)", "star-shaped pupils with cosmic sparkle",
      "warm honey amber eyes", "emerald green eyes with soft specular highlights"
    ],

    expressions: [
      "gentle serene smile", "smug playful smirk", "intense focused combat gaze",
      "tsundere pout with faint blush", "mysterious melancholic gaze",
      "confident radiant grin", "winking playfully at the viewer",
      "calm stoic expression"
    ],

    attire: [
      "futuristic glowing techwear jacket and pleated skirt",
      "elaborate ceremonial white and crimson miko kimono",
      "ornate gothic lolita dress with black lace and velvet ribbons",
      "sleek sci-fi pilot plugsuit with glowing circuitry",
      "traditional Japanese school sailor uniform with red neckerchief",
      "ornate golden-trimmed fantasy armor with flowing royal cape",
      "oversized streetwear hoodie with headphone around neck",
      "enchanted sorceress robe adorned with star constellations",
      "flowing summer sundress with straw hat",
      "cyberpunk combat gear with tactical harness and holographic badges"
    ],

    accessories: [
      "fluffy kemonomimi cat ears and tail",
      "glowing celestial halo floating above head",
      "futuristic holographic visor over one eye",
      "ancient katana with glowing runes along the edge",
      "ornate magical crystal staff radiating starlight",
      "translucent cherry blossom hairpin",
      "vintage round glasses catching lens glare",
      "silver cross earrings and choker",
      "delicate butterfly hairpin fluttering"
    ],

    scenery: [
      "ancient Japanese shrine courtyard with drifting sakura cherry blossoms",
      "rain-slicked Neo-Tokyo cyberpunk alley illuminated by vibrant neon signs",
      "breathtaking floating sky island with ancient overgrown ruins and waterfalls",
      "dreamy sunset train platform overlooking a sparkling coastal sea",
      "enchanted bioluminescent fantasy forest with floating ethereal spirits",
      "rooftop garden at twilight overlooking an endless metropolis of light",
      "cozy sunlit greenhouse cafe filled with blooming plants and vintage books",
      "grand celestial observatory with massive crystal telescope under starry Milky Way",
      "snowy mountain shrine gate under a brilliant aurora borealis",
      "traditional Japanese tatami room with open shoji doors facing autumn maple garden"
    ],

    lighting: [
      "cinematic golden hour rim lighting, soft warm sunlight",
      "vibrant neon backlight with cyan and magenta bloom",
      "ethereal volumetric god rays filtering through clouds",
      "magical starlight and gentle glowing particle bokeh",
      "dramatic dynamic chiaroscuro lighting with sharp highlights",
      "soft diffused anime studio lighting, clean specular highlights",
      "romantic sunset twilight with gradient pastel hues",
      "mystical glowing blue bioluminescent ambience"
    ],

    cameraAndComposition: [
      "portrait close-up, expressive eyes in sharp focus",
      "medium shot, dynamic pose with flowing fabrics",
      "wide cinematic angle, breathtaking environmental composition",
      "dramatic low angle hero shot, expansive sky backdrop",
      "intimate over-the-shoulder perspective with depth of field",
      "side profile with hair fluttering across the wind"
    ],

    qualityBoosters: [
      "masterpiece", "best quality", "ultra-detailed anime artstyle",
      "sharp focus", "intricate lineart", "vibrant color palette",
      "studio anime key visual", "clean illustration"
    ]
  },

  /**
   * Pre-configured style definitions that map to specific prompt modifiers,
   * negative prompts, and aesthetic tunings.
   */
  stylePresets: {
    "flux-anime": {
      name: "Modern Digital Anime",
      description: "Crisp lines, vibrant colors, 4K key visual aesthetic",
      promptSuffix: ", modern anime key visual, clean crisp lineart, vibrant rich colors, polished digital illustration, high production value, trending on pixiv",
      negativePrompt: "low quality, worst quality, blurry, deformed, bad anatomy, extra limbs, watermark, text, signature, rough sketch",
      recommendedModel: "flux"
    },
    "retro-90s": {
      name: "90s Retro Cel Anime",
      description: "Classic hand-painted animation cels, vintage grain & warm hues",
      promptSuffix: ", 1990s anime aesthetic, classic hand-painted animation cel style, retro anime color palette, film grain, soft cel shading, nostalgia, vintage anime screencap, studio art from 1995",
      negativePrompt: "3D render, digital CGI, modern oversaturated digital art, plastic texture, low quality, blurry",
      recommendedModel: "flux"
    },
    "studio-ghibli": {
      name: "Studio Ghibli Watercolor",
      description: "Whimsical, lush pastoral backgrounds, hand-drawn painterly feel",
      promptSuffix: ", Hayao Miyazaki Studio Ghibli style, lush painterly background, whimsical gouache and watercolor textures, warm emotional lighting, hand-drawn traditional animation masterpiece",
      negativePrompt: "dark, gritty, photo, 3D, CGI, plastic, harsh neon, deformed, low quality",
      recommendedModel: "flux"
    },
    "makoto-shinkai": {
      name: "Makoto Shinkai (Your Name / Weathering)",
      description: "Radiant skies, dramatic clouds, hyper-detailed twilight lighting",
      promptSuffix: ", Makoto Shinkai visual style, CoMix Wave Films aesthetic, dramatic volumetric cumulus clouds, radiant twilight sky, hyper-detailed sparkling environmental reflections, emotional cinematic atmosphere",
      negativePrompt: "flat colors, low detail, washed out, dull lighting, low quality, bad anatomy",
      recommendedModel: "flux"
    },
    "cyberpunk-trigger": {
      name: "Cyberpunk / Studio Trigger",
      description: "High saturation, angular action lines, neon futuristic pop",
      promptSuffix: ", Studio Trigger dynamic anime style, Cyberpunk Edgerunners aesthetic, bold sharp angular linework, explosive neon saturation, dynamic action framing, electric energy",
      negativePrompt: "dull, muted, pastel, washed out, realism, blurry, low resolution",
      recommendedModel: "flux"
    },
    "kyoto-animation": {
      name: "Kyoto Animation (KyoAni)",
      description: "Luminous glassy eyes, delicate soft bloom, slice-of-life warmth",
      promptSuffix: ", Kyoto Animation style, delicate expressive character design, luminous glassy eye reflections, soft bloom lighting, warm heartfelt atmosphere, intricate hair movement",
      negativePrompt: "rough, messy, harsh, grotesque, bad anatomy, deformed face, low quality",
      recommendedModel: "flux"
    },
    "ufotable-action": {
      name: "Ufotable Action (Demon Slayer)",
      description: "High contrast darks, dynamic particle VFX, dramatic impact lighting",
      promptSuffix: ", Ufotable anime style, high contrast dramatic lighting, brilliant elemental particle effects, glowing kinetic energy aura, cinematic anime battle scene, intense atmosphere",
      negativePrompt: "flat, low contrast, washed out, static, boring, deformed, low quality",
      recommendedModel: "flux"
    },
    "manga-ink": {
      name: "Manga Monochrome Ink",
      description: "Crisp black and white ink, screentone shading, manga panel",
      promptSuffix: ", Japanese manga illustration, high contrast black and white ink drawing, meticulous screentones, cross-hatching, dramatic manga lineart, clean monochrome panel",
      negativePrompt: "color, full color, watercolor, blurry, messy, low quality, photorealistic",
      recommendedModel: "flux"
    },
    "chibi-sticker": {
      name: "Chibi & Kawaii Sticker",
      description: "Adorable oversized head, cute proportions, pastel sticker art",
      promptSuffix: ", cute chibi anime character, kawaii proportions, large expressive sparkling eyes, sticker design with clean white outline, bright pastel colors, adorable playful charm",
      negativePrompt: "realistic proportions, scary, grim, dark, low quality, bad anatomy, deformed",
      recommendedModel: "flux"
    },
    "dark-fantasy": {
      name: "Dark Fantasy Anime",
      description: "Moody gothic ambiance, glowing ethereal runes, ornate dark armor",
      promptSuffix: ", dark fantasy anime aesthetic, gothic atmosphere, intricate ornate dark armor, glowing ethereal magic runes, misty cinematic lighting, moody epic composition",
      negativePrompt: "cheerful, pastel, comedic, low quality, deformed, blurry",
      recommendedModel: "flux"
    }
  },

  /**
   * Pre-built Perchance Template Library
   * Allows users to load, inspect, and randomize classic Perchance-style templates
   */
  templates: [
    {
      id: "magical-girl",
      title: "Magical Girl Awakening",
      category: "Fantasy",
      icon: "✨",
      template: "1girl, magical girl in {ornate white and pink lace dress|flowing celestial starry gown|fluttering ribbons and frills}, {sakura pink|golden blonde|silver} hair styled into {flowing twin tails|elaborate braided curls|long floating waves}, {radiant ruby|sparkling sapphire|golden amber} eyes, wielding a {glowing crystal star wand|radiant magical scepter}, surrounded by {floating magical glyphs and starlight|fluttering glowing cherry blossoms|swirling cosmic sparkles}, {ancient shrine courtyard at dusk|floating cloud palace|mystical crystal sanctuary}, cinematic lighting, masterpiece"
    },
    {
      id: "cyberpunk-ronin",
      title: "Cyberpunk Street Ronin",
      category: "Sci-Fi",
      icon: "⚡",
      template: "1girl, badass cyberpunk ronin, {raven black|neon cyan|crimson} hair with {an asymmetrical undercut|messy bob with cyber wires|high combat ponytail}, {glowing cybernetic optics|electric blue eyes}, wearing {oversized techwear trenchcoat with glowing holographic collar|sleek carbon fiber armor and pleated skirt}, holding a {futuristic thermal katana glowing neon red|dual high-frequency plasma blades}, in a {rain-drenched Shinjuku neon back-alley with puddle reflections|skyline rooftop overlooking holographic billboards}, steam rising, volumetric fog, rim lighting, 4K anime key visual"
    },
    {
      id: "ghibli-countryside",
      title: "Ghibli Countryside Afternoon",
      category: "Slice of Life",
      icon: "🍃",
      template: "1girl in {loose floral sundress and straw hat|cozy vintage apron over white blouse}, {chestnut brown|soft black} hair with {breezy bangs|cute braided pigtails}, looking with {wonder|warm peaceful smile} toward the horizon, sitting in {a lush green meadow overlooking rural Japanese train tracks|a rustic hillside cottage garden blooming with sunflowers}, {giant fluffy cumulus clouds in brilliant azure sky|soft golden late-afternoon sunlight}, Studio Ghibli painterly watercolor artstyle, nostalgic peaceful mood"
    },
    {
      id: "shinkai-twilight",
      title: "Makoto Shinkai Twilight Rooftop",
      category: "Cinematic",
      icon: "🌆",
      template: "{1girl|1girl and 1boy standing close}, {wind-blown hair|fluttering school uniform}, gazing up at {a brilliant split comet streaking through twilight sky|spectacular purple and gold sunset clouds reflecting in rooftop rainwater}, Tokyo skyline silhouette in distance, Makoto Shinkai CoMix Wave visual style, hyper-detailed cloud physics, emotional cinematic atmosphere, dazzling light lens flare"
    },
    {
      id: "shonen-awakening",
      title: "Shonen Battle Awakening",
      category: "Action",
      icon: "🔥",
      template: "{1boy|1girl}, anime warrior in combat stance, {spiky crimson hair|electric blue hair} standing on end, {fierce determined eyes glowing with elemental power}, {shredded battle armor with glowing energy crests|dark combat gi}, enveloped in {surging azure lightning aura|swirling dragon flames and embers}, cracked battlefield ground, high dynamic range, dynamic perspective, Ufotable anime action sequence, intense particle effects"
    },
    {
      id: "gothic-moonlight",
      title: "Gothic Lolita Moonlight",
      category: "Gothic",
      icon: "🌙",
      template: "1girl, gothic lolita noble, {porcelain pale skin}, {silver white|obsidian black} hair in {luxurious twin drill curls|cascading waves with black lace headpiece}, {crimson vampire eyes|heterochromia gold and red}, wearing {extravagant Victorian mourning dress with velvet ribbons and corsetry}, holding {a vintage antique parasol|a single blooming dark rose}, inside {a gothic cathedral courtyard under a blood red full moon|an overgrown graveyard with stone gargoyles}, eerie mist, ethereal moonlight, dark romantic anime aesthetic"
    },
    {
      id: "mecha-cockpit",
      title: "Mecha Pilot Sync Rate 100%",
      category: "Mecha",
      icon: "🤖",
      template: "1girl, elite mecha pilot, {short sporty purple hair|sleek blonde bob}, wearing {skintight neural plugsuit with glowing interface nodes}, seated inside {the holographic panoramic cockpit of a giant combat mecha}, {neon tactical HUD displays reflecting in eyes|heads-up radar holographic graphs floating in air}, deep space battlefield visible outside viewport, high tension, neon accents, Gainax / Trigger mecha anime aesthetic"
    },
    {
      id: "cozy-cafe",
      title: "Cozy Rainy Day Cafe",
      category: "Slice of Life",
      icon: "☕",
      template: "1girl, cute cafe barista, {warm honey brown hair in loose messy bun|soft dark bob}, {sweet gentle smile}, wearing {knitted oversized turtleneck sweater and brown apron}, holding {a ceramic mug of steaming latte with foam art}, sitting by {a rain-streaked cafe window overlooking a peaceful European cobblestone street}, indoor warm lighting, fairy lights bokeh, cozy melancholic atmosphere, Kyoto Animation slice of life artstyle"
    }
  ],

  /**
   * Generates a completely randomized, high quality anime prompt
   * using the internal dictionary and Perchance combinatorial logic.
   */
  generateRandomPrompt() {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    const subject = pick(this.dictionary.subjects);
    const hairColor = pick(this.dictionary.hairColors);
    const hairStyle = pick(this.dictionary.hairStyles);
    const eyeStyle = pick(this.dictionary.eyeStyles);
    const expression = pick(this.dictionary.expressions);
    const attire = pick(this.dictionary.attire);
    const accessory = Math.random() > 0.3 ? `, ${pick(this.dictionary.accessories)}` : "";
    const scenery = pick(this.dictionary.scenery);
    const lighting = pick(this.dictionary.lighting);
    const camera = pick(this.dictionary.cameraAndComposition);

    return `${subject}, ${hairColor} ${hairStyle}, ${eyeStyle}, ${expression}, wearing ${attire}${accessory}, ${scenery}, ${lighting}, ${camera}`;
  },

  /**
   * Generates a Perchance-syntax template with inline curly braces
   * that the user can explore or edit.
   */
  generateRandomTemplate() {
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
    const attireSet = pickTwo(this.dictionary.attire);
    const scenerySet = pickTwo(this.dictionary.scenery);
    const lightingSet = pickTwo(this.dictionary.lighting);

    return `1girl, ${hairSet} ${hairStyleSet}, ${eyeSet}, ${expressionSet}, wearing ${attireSet}, ${scenerySet}, ${lightingSet}, masterpiece anime visual`;
  },

  /**
   * Interactive Tag Library for the Tag Builder
   */
  getTagCategories() {
    return [
      {
        name: "Character",
        tags: [
          "1girl", "1boy", "magical girl", "cyberpunk samurai", "shrine maiden",
          "elf sorceress", "academy student", "mecha pilot", "gothic lolita",
          "chibi mascot", "kemonomimi catgirl", "kitsune fox girl", "demon princess",
          "angelic knight", "barista", "steampunk engineer"
        ]
      },
      {
        name: "Hair & Face",
        tags: [
          "silver hair", "sakura pink hair", "raven black hair", "blonde hair",
          "cyan hair", "twin tails", "flowing long hair", "hime cut", "short bob",
          "ponytail", "blue eyes", "crimson red eyes", "golden amber eyes",
          "heterochromia", "star pupils", "gentle smile", "smug smirk",
          "tsundere pout", "blushing", "winking", "stoic expression"
        ]
      },
      {
        name: "Outfit",
        tags: [
          "school sailor uniform", "miko kimono", "gothic lolita dress",
          "cyberpunk techwear", "pilot plugsuit", "fantasy battle armor",
          "oversized hoodie", "sorceress robe", "summer sundress",
          "steampunk coat", "maid outfit", "kimono with obi"
        ]
      },
      {
        name: "Scenery & Setting",
        tags: [
          "cherry blossom shrine", "Neo-Tokyo cyberpunk alley", "floating sky island",
          "sunset train platform", "enchanted forest", "rooftop garden at dusk",
          "rainy city street", "celestial observatory", "snowy mountain torii",
          "tatami tea room", "ancient overgrown ruins", "cozy bookshop cafe"
        ]
      },
      {
        name: "Lighting & Effects",
        tags: [
          "cinematic rim lighting", "golden hour sunset", "vibrant neon glow",
          "volumetric god rays", "ethereal starlight bokeh", "glowing magic runes",
          "drifting cherry blossom petals", "rain reflections", "floating embers",
          "aurora borealis", "sparkling lens flare", "soft studio lighting"
        ]
      },
      {
        name: "Composition",
        tags: [
          "portrait close-up", "medium shot", "wide cinematic shot",
          "dynamic battle pose", "dramatic low angle", "looking at viewer",
          "profile view", "wind blown hair", "depth of field"
        ]
      }
    ];
  }
};
