/**
 * Bychance Deterministic Prompt Engine (Zero-AI)
 * Converts everyday words into high-signal model identifiers (Danbooru/Anime/FLUX/SDXL tags),
 * expands recognizable character traits accurately, parses full prompts into modular sections,
 * and evaluates Perchance {a|b|c} syntax.
 */

const PromptEngine = (() => {
    // 1. Deterministic Word & Phrase Upgrade Dictionary
    // Maps weak/vague words or phrases -> model-recognized visual descriptors & Perchance choice sets
    const WORD_UPGRADES = [
        // Lighting & Glow
        {
            match: /\b(nice lighting|good lighting|pretty lighting)\b/gi,
            label: "nice/good lighting",
            category: "Lighting",
            primary: "cinematic rim lighting, volumetric god rays, soft bloom",
            alternatives: [
                "dramatic chiaroscuro lighting, subsurface scattering",
                "golden hour warm sunlight, dappled light rays, lens flare",
                "studio key light, soft fill light, crisp specular highlights"
            ],
            perchance: "{cinematic rim lighting, volumetric god rays|golden hour sunlight, warm backlight|dramatic studio key lighting, subsurface scattering}"
        },
        {
            match: /\b(shiny|shining)\b/gi,
            label: "shiny",
            category: "Lighting",
            primary: "specular highlights, luminous sheen, glossy surface",
            alternatives: [
                "iridescent shimmer, metallic reflections",
                "glistening, high-gloss finish, bright catchlights"
            ],
            perchance: "{specular highlights, luminous sheen|iridescent shimmer, glossy reflections}"
        },
        {
            match: /\b(glowing|glow)\b/gi,
            label: "glowing",
            category: "Lighting",
            primary: "bioluminescent glow, ethereal bloom, radiant light emission",
            alternatives: [
                "ambient neon glow, soft halation, floating light motes",
                "magical luminescence, rim-lit aura"
            ],
            perchance: "{bioluminescent glow, ethereal bloom|magical luminescence, floating light particles}"
        },
        {
            match: /\b(dark|darkness)\b/gi,
            label: "dark",
            category: "Lighting",
            primary: "low-key lighting, deep atmospheric shadows, chiaroscuro",
            alternatives: [
                "moonlit silhouettes, moody tenebrism, dim ambient light",
                "shadowy contrast, rim-lit in darkness"
            ],
            perchance: "{low-key lighting, deep atmospheric shadows|moody chiaroscuro, dim moonlight}"
        },
        {
            match: /\b(bright)\b/gi,
            label: "bright",
            category: "Lighting",
            primary: "high-key lighting, vibrant illumination, crisp sunlight",
            alternatives: [
                "sun-drenched, luminous exposure, vivid color saturation",
                "radiant daylight, airy atmospheric glow"
            ],
            perchance: "{high-key lighting, vibrant illumination|sun-drenched, radiant daylight}"
        },

        // Emotions, Expressions & Gaze
        {
            match: /\b(happy|smiling)\b/gi,
            label: "happy / smiling",
            category: "Expression",
            primary: "warm gentle smile, joyful expression, bright eye catchlights",
            alternatives: [
                "beaming grin, cheerful eyes, relaxed eyebrows",
                "soft serene smile, parted lips, affectionate gaze"
            ],
            perchance: "{warm gentle smile, bright eye catchlights|beaming joyful grin|soft serene smile, affectionate gaze}"
        },
        {
            match: /\b(sad|crying)\b/gi,
            label: "sad / crying",
            category: "Expression",
            primary: "melancholic expression, downcast eyes, glistening teardrops",
            alternatives: [
                "vulnerable expression, furrowed brows, watery eyes",
                "somber gaze, single tear rolling down cheek, trembling lips"
            ],
            perchance: "{melancholic expression, glistening teardrops|somber downcast eyes, vulnerable gaze}"
        },
        {
            match: /\b(angry|mad)\b/gi,
            label: "angry / mad",
            category: "Expression",
            primary: "fierce scowl, furrowed eyebrows, intense piercing glare",
            alternatives: [
                "clenched teeth, narrowed eyes, aggressive expression",
                "defiant glare, sharp intense eyes"
            ],
            perchance: "{fierce scowl, intense piercing glare|narrowed eyes, defiant expression}"
        },
        {
            match: /\b(shy|embarrassed)\b/gi,
            label: "shy / embarrassed",
            category: "Expression",
            primary: "bashful expression, soft cheek blush, averted gaze",
            alternatives: [
                "flustered blush, timid smile, fidgeting fingers",
                "sideways glance, rosy cheeks, coy expression"
            ],
            perchance: "{bashful expression, soft cheek blush, averted gaze|flustered blush, coy sideways glance}"
        },
        {
            match: /\b(looking|staring)\b/gi,
            label: "looking / staring",
            category: "Expression",
            primary: "looking at viewer, direct eye contact, detailed iris catchlights",
            alternatives: [
                "looking back over shoulder, captivating gaze",
                "gazing into the distance, contemplative profile"
            ],
            perchance: "{looking at viewer, direct eye contact|looking back over shoulder|gazing into the distance}"
        },
        {
            match: /\b(detailed eyes|nice eyes|pretty eyes)\b/gi,
            label: "nice/detailed eyes",
            category: "Character",
            primary: "intricate iris texture, sparkling catchlights, long eyelashes, expressive pupils",
            alternatives: [
                "luminous jewel-like eyes, crisp corneal reflection",
                "limpid eyes, delicate eyelashes, subtle eye shadow"
            ],
            perchance: "{intricate iris texture, sparkling catchlights|luminous jewel-like eyes, long eyelashes}"
        },

        // Poses & Action
        {
            match: /\b(standing)\b/gi,
            label: "standing",
            category: "Pose",
            primary: "graceful contrapposto stance, poised posture",
            alternatives: [
                "confident standing pose, hand on hip, weight shifted",
                "relaxed standing posture, arms loosely at sides",
                "heroic stance, wind-swept silhouette"
            ],
            perchance: "{graceful contrapposto stance|confident standing pose, hand on hip|heroic wind-swept stance}"
        },
        {
            match: /\b(sitting)\b/gi,
            label: "sitting",
            category: "Pose",
            primary: "seated gracefully, legs crossed, relaxed posture",
            alternatives: [
                "perched on edge, leaning slightly forward",
                "sitting with knees drawn up, cozy posture"
            ],
            perchance: "{seated gracefully, legs crossed|perched on edge, leaning slightly forward|sitting with knees drawn up}"
        },
        {
            match: /\b(fighting|action pose)\b/gi,
            label: "fighting / action pose",
            category: "Pose",
            primary: "dynamic combat stance, motion blur, foreshortened perspective, mid-leap",
            alternatives: [
                "agile battle posture, airborne action, kinetic energy",
                "readying weapon, intense combat focus, dramatic diagonal composition"
            ],
            perchance: "{dynamic combat stance, foreshortened perspective|agile airborne action pose, kinetic energy}"
        },
        {
            match: /\b(walking)\b/gi,
            label: "walking",
            category: "Pose",
            primary: "mid-stride walking pose, flowing movement, natural gait",
            alternatives: [
                "strolling casually, looking back over shoulder",
                "brisk purposeful stride, coat billowing"
            ],
            perchance: "{mid-stride walking pose, flowing movement|strolling casually, looking back}"
        },

        // Camera & Framing
        {
            match: /\b(camera below|from below|low camera)\b/gi,
            label: "camera below",
            category: "Camera",
            primary: "low angle shot, from below, dramatic foreshortening",
            alternatives: [
                "worm's-eye view, heroic low perspective",
                "tilted low-angle framing, imposing stature"
            ],
            perchance: "{low angle shot, from below|dramatic low-angle foreshortening}"
        },
        {
            match: /\b(camera above|from above|high camera)\b/gi,
            label: "camera above",
            category: "Camera",
            primary: "high angle shot, from above, looking up at viewer",
            alternatives: [
                "bird's-eye perspective, elevated camera angle",
                "overhead framing, foreshortened perspective"
            ],
            perchance: "{high angle shot, from above|overhead perspective, looking up at camera}"
        },
        {
            match: /\b(close up|closeup)\b/gi,
            label: "close up",
            category: "Camera",
            primary: "portrait close-up, upper body framing, shallow depth of field, 85mm prime lens",
            alternatives: [
                "extreme close-up on face, macro detail, creamy bokeh background",
                "head and shoulders portrait, sharp facial focus"
            ],
            perchance: "{portrait close-up, 85mm lens, shallow depth of field|head and shoulders framing, creamy bokeh}"
        },
        {
            match: /\b(full body)\b/gi,
            label: "full body",
            category: "Camera",
            primary: "full body shot, head-to-toe framing, wide angle 35mm lens",
            alternatives: [
                "full-length figure visible, grounded in environment, balanced composition",
                "wide establishing full-body shot, shoes in frame"
            ],
            perchance: "{full body shot, head-to-toe framing|wide establishing full-body shot}"
        },
        {
            match: /\b(blurry background)\b/gi,
            label: "blurry background",
            category: "Camera",
            primary: "shallow depth of field, creamy f/1.4 bokeh, subject isolation",
            alternatives: [
                "soft out-of-focus background, circular bokeh orbs",
                "cinematic depth of field, sharp foreground focus"
            ],
            perchance: "{shallow depth of field, creamy bokeh|soft out-of-focus background, subject isolation}"
        },

        // Hair, Clothing & Materials
        {
            match: /\b(windy hair|flowing hair)\b/gi,
            label: "windy / flowing hair",
            category: "Character",
            primary: "windswept hair, floating hair strands, fine individual hair detail",
            alternatives: [
                "billowing locks in the breeze, dynamic hair motion",
                "silky flowing hair, translucent hair tips in backlight"
            ],
            perchance: "{windswept hair, floating hair strands|silky billowing hair, backlit hair tips}"
        },
        {
            match: /\b(fancy dress|nice dress)\b/gi,
            label: "fancy / nice dress",
            category: "Outfit",
            primary: "ornate ballgown, intricate gold embroidery, layered silk chiffon, satin drapery",
            alternatives: [
                "elegant tailored evening gown, delicate lace trim, velvet bodice",
                "regal couture dress, jeweled neckline, flowing translucent fabric"
            ],
            perchance: "{ornate ballgown, embroidered silk chiffon|elegant evening gown, delicate lace and satin}"
        },
        {
            match: /\b(armor)\b/gi,
            label: "armor",
            category: "Outfit",
            primary: "ornate filigree plate armor, brushed steel pauldrons, metallic specular wear",
            alternatives: [
                "engraved silver knight armor, leather straps, gilded trim",
                "sleek tactical sci-fi exosuit armor, carbon fiber panels"
            ],
            perchance: "{ornate filigree plate armor, brushed steel|engraved silver knight armor, gilded trim}"
        },
        {
            match: /\b(casual clothes|normal clothes)\b/gi,
            label: "casual clothes",
            category: "Outfit",
            primary: "stylish streetwear, oversized knit cardigan, pleated skirt, realistic fabric folds",
            alternatives: [
                "modern casual outfit, fitted denim jacket, cotton tee, sneakers",
                "cozy everyday attire, cable-knit sweater, tailored trousers"
            ],
            perchance: "{stylish streetwear, oversized knit cardigan|modern casual jacket, realistic fabric folds|cozy cable-knit sweater}"
        },

        // Environment & Scene
        {
            match: /\b(night sky|stars|starry)\b/gi,
            label: "night sky / starry",
            category: "Scene",
            primary: "celestial night sky, vivid Milky Way nebula, twinkling constellations, shooting stars",
            alternatives: [
                "deep cosmic starfield, aurora borealis ribbons, luminous crescent moon",
                "astronomy observatory dome, swirling galaxies, stardust particles"
            ],
            perchance: "{celestial night sky, vivid Milky Way nebula, shooting stars|deep cosmic starfield, luminous crescent moon}"
        },
        {
            match: /\b(forest|woods)\b/gi,
            label: "forest / woods",
            category: "Scene",
            primary: "ancient mossy forest, sunbeams filtering through canopy, lush ferns, atmospheric mist",
            alternatives: [
                "enchanted woodland glade, glowing mushrooms, dappled foliage",
                "dense pine forest, morning fog, towering redwoods"
            ],
            perchance: "{ancient mossy forest, sunbeams through canopy|enchanted woodland glade, atmospheric mist}"
        },
        {
            match: /\b(city|street)\b/gi,
            label: "city / street",
            category: "Scene",
            primary: "detailed urban streetscape, wet asphalt reflections, glowing shopfronts, atmospheric perspective",
            alternatives: [
                "neon-drenched cyberpunk alleyway, rain puddles, holographic signage",
                "sunlit European cobblestone street, historic architecture, cafe terraces"
            ],
            perchance: "{detailed urban streetscape, wet asphalt reflections|neon-lit alleyway, rain puddles|sunlit cobblestone street}"
        },
        {
            match: /\b(castle|palace)\b/gi,
            label: "castle / palace",
            category: "Scene",
            primary: "grand Gothic cathedral palace, vaulted marble arches, stained glass windows, chandeliers",
            alternatives: [
                "majestic fantasy citadel, soaring spires, polished stone colonnade",
                "opulent royal throne room, gilded pillars, velvet drapes"
            ],
            perchance: "{grand palace interior, vaulted marble arches, stained glass|majestic fantasy citadel, soaring spires}"
        },

        // Quality & Style Boosters
        {
            match: /\b(good quality|high quality|detailed|very detailed)\b/gi,
            label: "good/high quality / detailed",
            category: "Style",
            primary: "masterpiece, best quality, ultra-detailed, crisp lineart, intricate textures, 8k resolution",
            alternatives: [
                "absurdres, highres, meticulous detail, sharp focus, professional illustration",
                "studio quality, rich color grading, fine micro-textures"
            ],
            perchance: "{masterpiece, best quality, ultra-detailed, crisp focus|absurdres, studio quality, intricate textures}"
        },
        {
            match: /\b(pinup|2d pinup|pin-up)\b/gi,
            label: "2D pinup style",
            category: "Style",
            primary: "2D pinup illustration style, stylized 2D character art, wide hips, thick thighs, curvy figure, large expressive eyes, bold clean lineart, smooth cel shading, vibrant colors",
            alternatives: [
                "stylized 2D pinup proportions, hourglass silhouette, wide hips, thick thighs, large expressive eyes, crisp ink lineart, glossy cel shading",
                "modern 2D cartoon pinup aesthetic, curvy stylized anatomy, expressive eyes, clean vector-style linework"
            ],
            perchance: "{2D pinup illustration style, wide hips, thick thighs, curvy, large expressive eyes, bold lineart|stylized 2D pinup aesthetic, curvy proportions, glossy cel shading}"
        },
        {
            match: /\b(anime|anime style)\b/gi,
            label: "anime style",
            category: "Style",
            primary: "modern anime key visual, vibrant cel shading, clean lineweight, Makoto Shinkai & Kyoto Animation aesthetic",
            alternatives: [
                "90s retro anime cel aesthetic, subtle film grain, hand-painted background",
                "ufotable style digital anime illustration, dynamic lighting effects, rich gradients"
            ],
            perchance: "{modern anime key visual, vibrant cel shading|ufotable style illustration, luminous effects|90s retro anime cel style}"
        },
        {
            match: /\b(realistic|photorealistic)\b/gi,
            label: "realistic / photorealistic",
            category: "Style",
            primary: "photorealistic RAW photo, 85mm f/1.4 DSLR, natural skin texture, subsurface scattering, film grain",
            alternatives: [
                "cinematic 35mm film still, Kodak Portra 400 color grading, lifelike textures",
                "hyper-detailed studio portrait photography, physically accurate lighting"
            ],
            perchance: "{photorealistic RAW photo, 85mm DSLR, subsurface scattering|cinematic 35mm film still, Kodak Portra 400}"
        },
        {
            match: /\b(cute|pretty|beautiful|gorgeous)\b/gi,
            label: "cute / pretty / beautiful",
            category: "Character",
            primary: "refined facial features, expressive eyes, detailed iris catchlights, soft natural blush",
            alternatives: [
                "delicate symmetry, luminous eyes, graceful demeanor",
                "charming expression, glossy lips, fine eyelashes"
            ],
            perchance: "{refined facial features, expressive eyes, detailed catchlights|delicate symmetry, luminous gaze}"
        },
        {
            match: /\b(cool|epic|awesome)\b/gi,
            label: "cool / epic / awesome",
            category: "Style",
            primary: "dramatic composition, high-contrast rim lighting, kinetic energy, striking visual impact",
            alternatives: [
                "cinematic framing, atmospheric depth, bold silhouette",
                "dynamic perspective, volumetric lighting, intense atmosphere"
            ],
            perchance: "{dramatic composition, high-contrast rim lighting|cinematic framing, volumetric lighting}"
        },
        {
            match: /\b(magic|magical|spell)\b/gi,
            label: "magic / spell",
            category: "Outfit",
            primary: "swirling arcane energy, glowing runes, luminous particle effects, ethereal aura",
            alternatives: [
                "casting radiant spell circle, floating light motes, mystic glow",
                "crackling elemental energy, bioluminescent mana ribbons"
            ],
            perchance: "{swirling arcane energy, glowing runes|radiant spell circle, floating light particles}"
        },
        {
            match: /\b(water|ocean|sea|beach)\b/gi,
            label: "water / ocean / beach",
            category: "Scene",
            primary: "crystal-clear turquoise water, glistening wave crests, caustic light reflections, coastal horizon",
            alternatives: [
                "sunlit ocean shoreline, wet sand mirror reflections, sea mist",
                "tranquil water surface, shimmering ripples, refracted light"
            ],
            perchance: "{crystal-clear turquoise water, caustic light reflections|sunlit ocean shoreline, wet sand reflections}"
        },
        {
            match: /\b(rain|raining|rainy)\b/gi,
            label: "rain / rainy",
            category: "Scene",
            primary: "falling rain droplets, wet surface reflections, atmospheric mist, puddles",
            alternatives: [
                "heavy downpour, glistening wet textures, Moody overcast sky",
                "gentle rain shower, water streaks on glass, ambient reflections"
            ],
            perchance: "{falling rain droplets, wet surface reflections|gentle rain shower, glistening puddles}"
        },
        {
            match: /\b(fire|flames|burning)\b/gi,
            label: "fire / flames",
            category: "Scene",
            primary: "dancing embers, warm orange rim lighting, flickering flames, rising heat haze",
            alternatives: [
                "roaring firelight, glowing sparks, dramatic warm-cool contrast",
                "swirling flame tongues, floating ash particles, intense illumination"
            ],
            perchance: "{dancing embers, warm firelight, glowing sparks|roaring flames, dramatic warm rim lighting}"
        },
        {
            match: /\b(snow|snowing|snowy|winter)\b/gi,
            label: "snow / winter",
            category: "Scene",
            primary: "falling snowflakes, frost-covered surfaces, crisp winter air, soft diffused overcast light",
            alternatives: [
                "pristine snowdrifts, visible breath in cold air, icy specular glints",
                "serene winter landscape, glistening ice crystals, pale blue shadows"
            ],
            perchance: "{falling snowflakes, frost-covered surfaces|pristine snowdrifts, glistening ice crystals}"
        },
        {
            match: /\b(sunset|sunrise|golden hour)\b/gi,
            label: "sunset / sunrise",
            category: "Scene",
            primary: "golden hour warm sunlight, long dramatic shadows, glowing amber and violet horizon clouds",
            alternatives: [
                "radiant twilight sky, warm backlit rim glow, atmospheric haze",
                "crimson and gold sunset clouds, soft lens flare, warm color grading"
            ],
            perchance: "{golden hour warm sunlight, glowing amber horizon|radiant twilight sky, warm backlit rim glow}"
        },
        {
            match: /\b(running|jumping)\b/gi,
            label: "running / jumping",
            category: "Pose",
            primary: "dynamic mid-motion pose, kinetic energy, windswept motion, foreshortened angle",
            alternatives: [
                "agile airborne leap, flowing garments, action framing",
                "energetic sprint, expressive movement, subtle motion blur"
            ],
            perchance: "{dynamic mid-motion pose, kinetic energy|agile airborne leap, flowing movement}"
        },
        {
            match: /\b(sword|blade|weapon)\b/gi,
            label: "sword / weapon",
            category: "Outfit",
            primary: "ornate forged steel blade,sharp metallic reflections, engraved hilt, gleaming edge",
            alternatives: [
                "luminous enchanted sword, intricate crossguard, specular steel glint",
                "masterwork katana, polished edge, dynamic weapon stance"
            ],
            perchance: "{ornate forged steel blade, metallic reflections|luminous enchanted sword, engraved hilt}"
        }
    ];

    // 2. Recognizable Character & Concept Visual Identifier Database
    // Ensures typing or picking a character (like "Rosalina") gives exact visual traits models recognize
    const CHARACTER_IDENTIFIERS = {
        "rosalina": {
            name: "Rosalina (Super Mario)",
            character: "Rosalina (Super Mario), 1girl, solo, tall slender cosmic princess, platinum blonde hair, long swept bangs covering right eye, bright turquoise cyan eyes, fair skin",
            outfit: "silver tiara crown with jewels, off-shoulder light turquoise sleeveless gown, white collar trim, silver star brooch on chest, long flared dress hem, golden star wand, floating yellow Luma companion",
            pose: "graceful floating posture, serene regal expression, looking at viewer",
            scene: "Comet Observatory dome, deep cosmic starry night sky, glowing Milky Way nebula, floating stardust particles, crescent moon",
            style: "masterpiece, best quality, vibrant anime illustration, luminous magical bloom, soft rim lighting, intricate eye catchlights, smooth cel shading"
        },
        "peach": {
            name: "Princess Peach (Super Mario)",
            character: "Princess Peach (Super Mario), 1girl, solo, long wavy golden blonde hair, sapphire blue eyes, rosy cheeks",
            outfit: "gold crown with red and blue jewels, pink puff-sleeve ballgown, darker pink pannier hip drapes, blue oval brooch on chest, long white opera gloves, blue round earrings",
            pose: "poised royal stance, hands clasped gently, sweet warm smile",
            scene: "sunlit Mushroom Kingdom castle garden, stained glass castle towers in background, floating flower petals",
            style: "masterpiece, best quality, vibrant anime illustration, soft pastel lighting, crisp lineart"
        },
        "zelda": {
            name: "Princess Zelda (Legend of Zelda)",
            character: "Princess Zelda (Breath of the Wild / Tears of the Kingdom), 1girl, solo, long braided golden blonde hair, pointed Hylian ears, bright emerald green eyes",
            outfit: "ornate royal blue and white Hylian ceremonial dress, gold Triforce embroidery, decorative shoulder pauldrons, golden belt",
            pose: "poised standing stance, noble contemplative expression, looking at viewer",
            scene: "ancient overgrown Temple of Time ruins, Silent Princess glowing blue flowers, sunbeams through stone arches",
            style: "masterpiece, best quality, painterly fantasy anime illustration, golden hour volumetric light, intricate textures"
        },
        "samus": {
            name: "Samus Aran (Metroid)",
            character: "Samus Aran (Metroid), 1girl, solo, athletic tall figure, long golden blonde hair in high ponytail, piercing ice-blue eyes, beauty mark under left eye",
            outfit: "sleek glowing blue Zero Suit bodysuit, subtle hexagonal tech texture, glowing pink chest insignia, metallic paralyzer pistol",
            pose: "confident contrapposto stance, hand on hip, focused expression",
            scene: "high-tech galactic starship bridge, holographic star map displays, atmospheric cyan neon rim lighting",
            style: "masterpiece, best quality, sci-fi anime key visual, glossy specular highlights, cinematic contrast"
        },
        "2b": {
            name: "2B (NieR:Automata)",
            character: "2B (NieR:Automata), YoRHa No.2 Type B, 1girl, solo, short silver-white bob hair, bangs, black combat visor blindfold over eyes, beauty mark under lip",
            outfit: "black Gothic lolita combat dress, high-slit velvet skirt with silver embroidery, puff sleeves with feather trim, black thigh-high boots, Virtuous Contract katana",
            pose: "dynamic combat stance, stoic expression, poised readiness",
            scene: "overgrown post-apocalyptic city ruins, crumbling concrete skyscrapers, shafts of pale sunlight, floating white dust motes",
            style: "masterpiece, best quality, atmospheric dark fantasy sci-fi illustration, delicate fabric textures, rim lighting"
        },
        "frieren": {
            name: "Frieren (Sousou no Frieren)",
            character: "Frieren (Sousou no Frieren), 1girl, solo, petite elf mage, silver-white hair in twin tails, long pointed elf ears, calm green eyes",
            outfit: "white and gold-trimmed capelet over white tunic shirt, striped scarf, black skirt, brown leather boots, red-gemmed golden mage staff, dangling red earrings",
            pose: "seated gracefully, peaceful nostalgic expression, gentle gaze",
            scene: "field of glowing blue-moon weed flowers at twilight, starry dusk sky, gentle breeze",
            style: "masterpiece, best quality, delicate watercolor anime aesthetic, soft magical lighting, expressive linework"
        },
        "miku": {
            name: "Hatsune Miku (Vocaloid)",
            character: "Hatsune Miku (Vocaloid), 1girl, solo, very long aqua-turquoise twin tails reaching knees, bright turquoise eyes",
            outfit: "sleeveless grey futuristic collared top with turquoise tie, black detached arm warmers with glowing equalizer graphics, pleated black skirt with teal trim, square hair ribbons",
            pose: "dynamic singing pose reaching toward viewer, cheerful energetic smile",
            scene: "virtual concert stage, floating holographic musical notes, cyan laser beams, glowing crowd silhouettes",
            style: "masterpiece, best quality, vibrant modern anime illustration, luminous neon bloom, sharp focus"
        },
        "tifa": {
            name: "Tifa Lockhart (Final Fantasy VII)",
            character: "Tifa Lockhart (Final Fantasy VII Remake), 1girl, solo, long dark brown hair with dolphin-tail tips, warm wine-red eyes, athletic toned physique",
            outfit: "fitted white cropped tank top, black miniskirt with suspenders, red leather combat gloves with metallic plates, black thigh-high socks, red boots",
            pose: "confident standing posture, warm confident smile, looking at viewer",
            scene: "Seventh Heaven bar interior, warm amber Edison bulb lighting, wooden counter, neon sign glow",
            style: "masterpiece, best quality, semi-realistic 3D anime rendering, subsurface skin scattering, cinematic depth of field"
        }
    };

    // 3. Curated Quick-Add Tag Chips per Section
    const SECTION_QUICK_TAGS = {
        character: [
            { label: "+ 2D Pinup Proportions", value: "stylized 2D pinup proportions, curvy, wide hips, thick thighs, narrow waist, large expressive eyes" },
            { label: "+ 1girl, solo", value: "1girl, solo" },
            { label: "+ 1boy, solo", value: "1boy, solo" },
            { label: "+ Expressive Eyes", value: "large expressive eyes, detailed iris texture, sparkling eye catchlights, long eyelashes" },
            { label: "+ Windswept Hair", value: "windswept hair, floating hair strands, fine hair detail" },
            { label: "+ Elf Ears", value: "pointed elf ears, ethereal elven features" },
            { label: "+ Perchance Hair Color", value: "{platinum blonde|silver-white|midnight black|pastel pink|crimson red} hair" },
            { label: "+ Perchance Eye Color", value: "{emerald green|sapphire blue|amber gold|violet|turquoise} eyes" }
        ],
        outfit: [
            { label: "+ Graceful Pose", value: "graceful contrapposto stance, poised posture, looking at viewer" },
            { label: "+ Dynamic Action", value: "dynamic airborne action pose, foreshortened perspective, kinetic motion" },
            { label: "+ Warm Smile", value: "warm gentle smile, soft blush, parted lips" },
            { label: "+ Royal Gown", value: "ornate silk ballgown, gold filigree embroidery, layered chiffon drapery" },
            { label: "+ Cyber Techwear", value: "sleek futuristic techwear jacket, glowing neon trim, tactical straps" },
            { label: "+ Cozy Knitwear", value: "oversized cable-knit sweater, pleated skirt, warm scarf" },
            { label: "+ Perchance Pose", value: "{graceful standing pose|seated with legs crossed|looking back over shoulder|dynamic mid-stride pose}" }
        ],
        scene: [
            { label: "+ Starry Observatory", value: "cosmic observatory dome, vivid Milky Way nebula, floating stardust, crescent moon" },
            { label: "+ Enchanted Forest", value: "ancient mossy forest, sunbeams filtering through canopy, glowing flora, mist" },
            { label: "+ Rainy Neon Street", value: "neon-lit cyberpunk street at night, wet asphalt reflections, rain droplets" },
            { label: "+ Cozy Cafe", value: "warm sunlit wooden cafe interior, steaming teacup, rain on windowpane, bokeh" },
            { label: "+ Sunset Beach", value: "golden hour ocean shore, turquoise waves, glowing horizon clouds, sea breeze" },
            { label: "+ Perchance Time", value: "{golden hour sunset|starlit midnight|crisp morning sunlight|twilight dusk}" }
        ],
        style: [
            { label: "+ 2D Pinup Style", value: "2D pinup illustration style, stylized 2D character art, wide hips, thick thighs, curvy, large expressive eyes, bold clean lineart, smooth cel shading, glossy highlights" },
            { label: "+ Masterpiece Boosters", value: "masterpiece, best quality, ultra-detailed, sharp focus, intricate textures" },
            { label: "+ Modern Anime Key Visual", value: "modern anime key visual, vibrant cel shading, crisp lineart, luminous bloom" },
            { label: "+ 90s Retro Cel Anime", value: "1990s retro anime cel aesthetic, hand-painted background, subtle film grain" },
            { label: "+ Painterly Concept Art", value: "digital fantasy concept art, expressive brushwork, rich atmospheric color grading" },
            { label: "+ Cinematic Lighting", value: "cinematic rim lighting, volumetric god rays, subsurface scattering" },
            { label: "+ 85mm Portrait Bokeh", value: "portrait framing, 85mm f/1.4 prime lens, shallow depth of field, creamy bokeh" },
            { label: "+ Perchance Angle", value: "{eye-level portrait shot|low angle heroic shot|high angle from above|dynamic Dutch angle}" }
        ],
        negative: [
            { label: "+ Standard Quality Negatives", value: "lowres, worst quality, low quality, blurry, jpeg artifacts, watermark, signature, text" },
            { label: "+ Anatomy & Hands Fix", value: "bad anatomy, bad hands, extra digits, fewer digits, mutated hands, fused fingers, extra limbs" },
            { label: "+ Anti-Flat / Anti-3D", value: "flat shading, washed out colors, overexposed, plastic skin, uncanny valley" }
        ]
    };

    // 4. Scan text for weak words or unexpanded character names
    function scanForUpgrades(text) {
        if (!text || !text.trim()) return [];
        const suggestions = [];
        const seenLabels = new Set();

        // Check character names that haven't been expanded yet
        Object.keys(CHARACTER_IDENTIFIERS).forEach((key) => {
            const profile = CHARACTER_IDENTIFIERS[key];
            const regex = new RegExp(`\\b${key}\\b`, "i");
            // Only suggest if the name is present, and its expanded trait isn't already there
            if (regex.test(text) && !text.toLowerCase().includes(profile.character.slice(0, 35).toLowerCase())) {
                suggestions.push({
                    type: "character",
                    matchedWord: key,
                    label: `Character Expansion: ${profile.name}`,
                    category: "Character ID",
                    primary: `${profile.character}, ${profile.outfit}`,
                    alternatives: [profile.character, `${profile.character}, ${profile.outfit}, ${profile.scene}`],
                    perchance: `${profile.character}, {${profile.outfit}|casual modern outfit}`,
                    characterProfile: profile
                });
                seenLabels.add(key);
            }
        });

        // Check weak words & phrases
        WORD_UPGRADES.forEach((rule) => {
            rule.match.lastIndex = 0;
            const found = rule.match.exec(text);
            if (found && !seenLabels.has(rule.label)) {
                suggestions.push({
                    type: "word",
                    matchedWord: found[0],
                    regex: rule.match,
                    label: `"${found[0]}"`,
                    category: rule.category,
                    primary: rule.primary,
                    alternatives: rule.alternatives,
                    perchance: rule.perchance
                });
                seenLabels.add(rule.label);
            }
        });

        return suggestions;
    }

    // 5. Deterministically upgrade all weak words in a string
    function upgradeWeakWordsInText(text, usePerchanceChoices = false) {
        if (!text || !text.trim()) return { text: "", count: 0 };
        let updated = text;
        let count = 0;

        // First check if a standalone character name needs visual trait expansion
        Object.keys(CHARACTER_IDENTIFIERS).forEach((key) => {
            const profile = CHARACTER_IDENTIFIERS[key];
            const regex = new RegExp(`\\b${key}\\b`, "gi");
            if (regex.test(updated) && !updated.toLowerCase().includes(profile.character.slice(0, 30).toLowerCase())) {
                updated = updated.replace(regex, profile.character);
                count++;
            }
        });

        // Replace weak words with high-signal model tokens
        WORD_UPGRADES.forEach((rule) => {
            rule.match.lastIndex = 0;
            if (rule.match.test(updated)) {
                rule.match.lastIndex = 0;
                const replacement = usePerchanceChoices ? rule.perchance : rule.primary;
                updated = updated.replace(rule.match, replacement);
                count++;
            }
        });

        // Clean up duplicate commas
        updated = cleanCommaFormatting(updated);
        return { text: updated, count };
    }

    // 6. Clean comma formatting while preserving Perchance {a|b} blocks
    function cleanCommaFormatting(str) {
        if (!str) return "";
        return str
            .replace(/\s*,\s*/g, ", ")
            .replace(/(,\s*){2,}/g, ", ")
            .replace(/^,\s*|\s*,\s*$/g, "")
            .trim();
    }

    // 7. Assemble Modular Sections into a Unified Full Prompt
    function assembleFullPrompt(sections, format = "standard") {
        const order = ["character", "outfit", "pose", "scene", "style"];
        const activeParts = order
            .map((key) => (sections[key] || "").trim().replace(/,+$/, "").trim())
            .filter(Boolean);

        const positivePrompt = activeParts.join(", ");
        const negativePrompt = (sections.negative || "").trim();

        if (format === "perchance-list") {
            const lines = [
                "# Perchance Prompt Generator Lists",
                "prompt",
                `  ${positivePrompt || "masterpiece, best quality"}`
            ];
            if (negativePrompt) {
                lines.push("", "negative", `  ${negativePrompt}`);
            }
            return lines.join("\n");
        }

        if (format === "with-negative" && negativePrompt) {
            return `${positivePrompt}\n\nNegative prompt: ${negativePrompt}`;
        }

        return positivePrompt;
    }

    // 8. Parse a Full Pasted Prompt into Modular Sections (Character, Outfit, Pose, Scene, Style, Negative)
    function parseFullPromptToSections(fullText) {
        const result = {
            character: [],
            outfit: [],
            pose: [],
            scene: [],
            style: [],
            negative: []
        };

        if (!fullText || !fullText.trim()) {
            return { character: "", outfit: "", pose: "", scene: "", style: "", negative: "" };
        }

        // Extract Negative prompt if present
        let mainText = fullText;
        const negMatch = fullText.match(/(?:negative prompt\s*:|###\s*negative\s*:|\bnegative\s*:)\s*([\s\S]*)$/i);
        if (negMatch) {
            result.negative.push(negMatch[1].trim());
            mainText = fullText.slice(0, negMatch.index).trim();
        }

        // Strip common conversational filler prefixes
        mainText = mainText
            .replace(/^(?:please\s+)?(?:can you\s+)?(?:draw|create|generate|make|paint|render|show)\s+(?:me\s+)?(?:a\s+|an\s+)?(?:picture|image|photo|illustration|drawing|art|portrait)\s+of\s+/i, "")
            .replace(/^(?:a\s+|an\s+)?(?:picture|image|photo|illustration|drawing|art|portrait)\s+of\s+/i, "");

        // Tokenize by comma outside of {...} braces, and further split long natural-language clauses
        const rawTokens = splitTopLevelCommas(mainText);
        const tokens = [];
        rawTokens.forEach((t) => {
            if (t.includes("{") || t.split(/\s+/).length <= 4) {
                tokens.push(t);
            } else {
                // Split natural language prepositional clauses into tag-friendly chunks
                const subParts = t
                    .replace(/\b(wearing|dressed in|holding|carrying)\b/gi, ", $1")
                    .replace(/\b(standing|sitting|seated|walking|running|kneeling|floating|leaning|posing)\b/gi, ", $1")
                    .replace(/\b(in a|in an|in the|inside a|at a|at the|on a|on the|under a|under the|surrounded by|with a background of)\b/gi, ", ")
                    .replace(/\b(in style of|in the style of|drawn in|rendered in|lit by)\b/gi, ", ")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                tokens.push(...subParts);
            }
        });

        const styleKeywords = /\b(masterpiece|best quality|highres|absurdres|8k|4k|illustration|anime|pinup|pin-up|cel shading|lineart|concept art|photorealistic|raw photo|dslr|lens|bokeh|depth of field|lighting|rim light|god rays|volumetric|chiaroscuro|bloom|angle|from below|from above|close-up|closeup|full body|portrait|shot|film grain|watercolor|oil painting|render|ufotable|shinkai|ghibli|sharp focus|textures|highlights)\b/i;
        const sceneKeywords = /\b(background|backdrop|sky|night|daylight|sunset|sunrise|golden hour|twilight|forest|woods|city|street|alley|castle|palace|room|interior|outdoor|observatory|nebula|starry|stars|moon|clouds|rain|rainy|snow|snowy|winter|mist|fog|ocean|sea|water|beach|shore|mountain|garden|meadow|field|cafe|bar|ruins|temple|cathedral|library|stage|bridge|flowers|petals|stardust|horizon|landscape|architecture|window)\b/i;
        const poseKeywords = /\b(standing|sitting|seated|pose|posing|stance|posture|contrapposto|walking|running|jumping|leaping|action|fighting|combat|spellcasting|leaning|crossed|kneeling|floating|perched|curtsy|stride|smiling|smile|grin|laugh|expression|blush|crying|tears|scowl|glare|looking|gaze|staring|wink|hand on hip|arms|reaching|clasped)\b/i;
        const outfitKeywords = /\b(wearing|dressed|dress|gown|ballgown|sundress|skirt|miniskirt|shirt|top|blouse|tunic|jacket|coat|sweater|cardigan|armor|pauldrons|suit|bodysuit|techwear|robe|cloak|cape|capelet|gloves|boots|shoes|stockings|thighhighs|socks|crown|tiara|brooch|wand|sword|katana|blade|weapon|spear|staff|pistol|scarf|hat|sunhat|ribbon|earrings|necklace|glasses|visor|blindfold|belt|suspenders|collar|sleeves|fabric|silk|satin|velvet|lace|denim|leather|attire|outfit|clothes|garment|mug|teacup|Luma)\b/i;
        const negKeywords = /\b(lowres|worst quality|low quality|bad anatomy|bad hands|extra digits|fewer digits|blurry|watermark|signature|mutated|deformed|ugly|jpeg artifacts)\b/i;

        tokens.forEach((rawToken) => {
            const token = rawToken.trim().replace(/^(?:a|an|the|and|with)\s+/i, "").trim();
            if (!token) return;

            if (negKeywords.test(token)) {
                result.negative.push(token);
            } else if (styleKeywords.test(token)) {
                result.style.push(token);
            } else if (sceneKeywords.test(token)) {
                result.scene.push(token);
            } else if (outfitKeywords.test(token)) {
                result.outfit.push(token);
            } else if (poseKeywords.test(token)) {
                result.pose.push(token);
            } else {
                result.character.push(token);
            }
        });

        return {
            character: result.character.join(", "),
            outfit: result.outfit.join(", "),
            pose: result.pose.join(", "),
            scene: result.scene.join(", "),
            style: result.style.join(", "),
            negative: result.negative.join(", ")
        };
    }

    function splitTopLevelCommas(str) {
        const parts = [];
        let current = "";
        let depth = 0;
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (ch === "{") depth++;
            else if (ch === "}" && depth > 0) depth--;

            if ((ch === "," || ch === "\n") && depth === 0) {
                if (current.trim()) parts.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        if (current.trim()) parts.push(current.trim());
        return parts;
    }

    // 9. Deterministic Perchance {a|b|c} Syntax Evaluator (Test Roll Preview)
    function evaluatePerchanceSyntax(template) {
        if (!template) return "";
        let output = template;
        let safety = 0;

        // Resolve innermost { ... } blocks iteratively
        const braceRegex = /\{([^{}]+)\}/g;
        while (braceRegex.test(output) && safety < 25) {
            output = output.replace(braceRegex, (_, inner) => {
                // Range check e.g. {1-5}
                const rangeMatch = inner.match(/^(\d+)-(\d+)$/);
                if (rangeMatch) {
                    const min = parseInt(rangeMatch[1], 10);
                    const max = parseInt(rangeMatch[2], 10);
                    return String(Math.floor(Math.random() * (max - min + 1)) + min);
                }

                const options = inner.split("|").map((s) => s.trim()).filter(Boolean);
                if (options.length === 0) return "";

                // Support weighted options like "60% a|40% b" or "a^2|b"
                const parsed = options.map((opt) => {
                    const pctMatch = opt.match(/^(\d+(?:\.\d+)?)%\s+(.+)$/);
                    if (pctMatch) {
                        return { weight: parseFloat(pctMatch[1]), text: pctMatch[2] };
                    }
                    const caretMatch = opt.match(/^(.+?)\^(\d+(?:\.\d+)?)$/);
                    if (caretMatch) {
                        return { weight: parseFloat(caretMatch[2]), text: caretMatch[1] };
                    }
                    return { weight: 1, text: opt };
                });

                const totalWeight = parsed.reduce((acc, item) => acc + item.weight, 0);
                let roll = Math.random() * totalWeight;
                for (const item of parsed) {
                    roll -= item.weight;
                    if (roll <= 0) return item.text;
                }
                return parsed[parsed.length - 1].text;
            });
            safety++;
        }

        return cleanCommaFormatting(output);
    }

    // 10. Comprehensive Deterministic Prompt Improver
    // Takes either a raw prompt string or a sections object, splits/normalizes it,
    // upgrades weak words, expands known characters, and enriches sparse sections with high-signal tags.
    function improvePrompt(input, options = {}) {
        const usePerchance = Boolean(options.usePerchance);
        const defaultNegative = options.defaultNegative || "lowres, worst quality, low quality, bad anatomy, bad hands, extra digits, fewer digits, blurry, watermark, signature, text, jpeg artifacts, deformed, mutated hands";

        let sections = {
            character: "",
            outfit: "",
            pose: "",
            scene: "",
            style: "",
            negative: ""
        };

        if (typeof input === "string") {
            sections = parseFullPromptToSections(input);
        } else if (input && typeof input === "object") {
            sections = {
                character: (input.character || "").trim(),
                outfit: (input.outfit || "").trim(),
                pose: (input.pose || "").trim(),
                scene: (input.scene || "").trim(),
                style: (input.style || "").trim(),
                negative: (input.negative || "").trim()
            };
            // If all modular tokens are crammed into character (e.g. unsplit paste), re-parse across sections
            if (sections.character && !sections.outfit && !sections.pose && !sections.scene && !sections.style && sections.character.includes(",")) {
                const parsed = parseFullPromptToSections(sections.character);
                sections.character = parsed.character;
                sections.outfit = parsed.outfit;
                sections.pose = parsed.pose;
                sections.scene = parsed.scene;
                sections.style = parsed.style;
                if (!sections.negative && parsed.negative) {
                    sections.negative = parsed.negative;
                }
            }
        }

        let totalChanges = 0;
        const appliedNotes = [];

        const combinedInitial = [sections.character, sections.outfit, sections.pose, sections.scene, sections.style].join(" ");

        // Step A: Expand recognizable character profiles across sections if present
        Object.keys(CHARACTER_IDENTIFIERS).forEach((key) => {
            const profile = CHARACTER_IDENTIFIERS[key];
            const regex = new RegExp(`\\b${key}\\b`, "i");
            if (regex.test(combinedInitial)) {
                if (!sections.character.toLowerCase().includes(profile.character.slice(0, 28).toLowerCase())) {
                    const replaceReg = new RegExp(`\\b${key}\\b`, "gi");
                    if (replaceReg.test(sections.character)) {
                        sections.character = cleanCommaFormatting(sections.character.replace(replaceReg, profile.character));
                    } else {
                        sections.character = cleanCommaFormatting(`${profile.character}, ${sections.character}`);
                    }
                    totalChanges++;
                    appliedNotes.push(`Expanded ${profile.name}`);
                }
                if (!sections.outfit.trim()) {
                    sections.outfit = profile.outfit;
                    totalChanges++;
                }
                if (!sections.pose.trim() && profile.pose) {
                    sections.pose = profile.pose;
                    totalChanges++;
                }
                if (!sections.scene.trim()) {
                    sections.scene = profile.scene;
                    totalChanges++;
                }
                if (!sections.style.trim()) {
                    sections.style = profile.style;
                    totalChanges++;
                }
            }
        });

        // Step B: Normalize common subject nouns in character section
        if (sections.character) {
            if (/\b(girl|woman|female|lady|princess|heroine|maiden|witch|sorceress)\b/i.test(sections.character) && !/\b1girl\b/i.test(sections.character)) {
                sections.character = cleanCommaFormatting(`1girl, solo, ${sections.character.replace(/\b(a|an|the)\s+(girl|woman|female|lady)\b/gi, "$2")}`);
                totalChanges++;
            } else if (/\b(boy|man|male|guy|prince|warrior)\b/i.test(sections.character) && !/\b1boy\b/i.test(sections.character)) {
                sections.character = cleanCommaFormatting(`1boy, solo, ${sections.character.replace(/\b(a|an|the)\s+(boy|man|male|guy)\b/gi, "$2")}`);
                totalChanges++;
            }
        }

        // Step C: Upgrade weak/vague words in each section
        ["character", "outfit", "pose", "scene", "style"].forEach((k) => {
            if (!sections[k]) return;
            const res = upgradeWeakWordsInText(sections[k], usePerchance);
            if (res.count > 0) {
                sections[k] = res.text;
                totalChanges += res.count;
            }
        });

        // Step D: Enrich sparse or missing sections with high-signal descriptors
        // 1. Character enrichment
        if (!sections.character.trim()) {
            sections.character = usePerchance
                ? "1girl, solo, {platinum blonde|silver-white|midnight black} hair, {emerald green|sapphire blue|amber} eyes, detailed iris catchlights, expressive facial features"
                : "1girl, solo, expressive eyes, detailed iris catchlights, refined facial features";
            totalChanges++;
            appliedNotes.push("Added subject foundation");
        } else if (!/\b(catchlights|iris|expressive eyes|facial features)\b/i.test(sections.character)) {
            const booster = usePerchance
                ? "{large expressive eyes, detailed iris catchlights|luminous eyes, long eyelashes, refined facial features}"
                : "expressive eyes, detailed iris catchlights, refined facial features";
            sections.character = cleanCommaFormatting(`${sections.character}, ${booster}`);
            totalChanges++;
            appliedNotes.push("Enhanced character details");
        }

        // 2. Outfit enrichment
        if (sections.outfit) {
            sections.outfit = cleanCommaFormatting(sections.outfit.replace(/\b(?:wearing|dressed in)\s+(?:a\s+|an\s+)?/gi, ""));
        }
        if (!sections.outfit.trim()) {
            sections.outfit = usePerchance
                ? "{detailed tailored attire, crisp fabric folds|ornate garment, intricate material textures}"
                : "detailed attire, crisp fabric folds, intricate material textures";
            totalChanges++;
            appliedNotes.push("Added outfit detail");
        } else if (!/\b(folds|texture|textures|fabric|silk|satin|leather|steel|trim|embroidery)\b/i.test(sections.outfit)) {
            sections.outfit = cleanCommaFormatting(`${sections.outfit}, realistic fabric folds`);
            totalChanges++;
        }

        // 3. Pose & Expression enrichment
        if (!sections.pose.trim()) {
            sections.pose = usePerchance
                ? "{graceful contrapposto stance, looking at viewer|confident standing pose, hand on hip|poised posture, looking back over shoulder}"
                : "graceful contrapposto stance, poised posture, looking at viewer";
            totalChanges++;
            appliedNotes.push("Added pose & expression");
        } else if (!/\b(looking|gaze|viewer|expression|smile|glare|eyes)\b/i.test(sections.pose)) {
            sections.pose = cleanCommaFormatting(`${sections.pose}, looking at viewer`);
            totalChanges++;
        }

        // 4. Scene & Environment enrichment
        if (!sections.scene.trim()) {
            sections.scene = usePerchance
                ? "{clean atmospheric backdrop, soft depth of field|scenic environment, ambient floating light motes, subtle vignette}"
                : "atmospheric backdrop, subtle depth of field, ambient light motes";
            totalChanges++;
            appliedNotes.push("Added scene atmosphere");
        } else if (!/\b(depth|atmosphere|atmospheric|motes|particles|reflections|sunbeams|bokeh|mist|shadows|lighting)\b/i.test(sections.scene)) {
            const sceneBooster = usePerchance
                ? "{atmospheric depth, floating light motes|rich environmental detail, soft background bokeh}"
                : "atmospheric depth, rich environmental detail";
            sections.scene = cleanCommaFormatting(`${sections.scene}, ${sceneBooster}`);
            totalChanges++;
            appliedNotes.push("Enhanced scene depth");
        }

        // 5. Art Style, Camera & Quality enrichment
        if (!sections.style.trim()) {
            sections.style = usePerchance
                ? "masterpiece, best quality, ultra-detailed, {vibrant 2D illustration, bold clean lineart, smooth cel shading|modern anime key visual, luminous bloom}, cinematic rim lighting, sharp focus, highres"
                : "masterpiece, best quality, ultra-detailed, vibrant 2D illustration, bold clean lineart, smooth cel shading, cinematic rim lighting, glossy specular highlights, sharp focus, highres";
            totalChanges++;
            appliedNotes.push("Added quality, lighting & style tags");
        } else {
            if (!/\b(masterpiece|best quality|ultra-detailed|highres|absurdres)\b/i.test(sections.style)) {
                sections.style = cleanCommaFormatting(`masterpiece, best quality, ultra-detailed, highres, ${sections.style}`);
                totalChanges++;
                appliedNotes.push("Added quality boosters");
            }
            if (!/\b(lighting|light|god rays|chiaroscuro|bloom|highlights|subsurface)\b/i.test(sections.style)) {
                const lightBooster = usePerchance
                    ? "{cinematic rim lighting, luminous bloom|volumetric lighting, glossy specular highlights}"
                    : "cinematic rim lighting, glossy specular highlights";
                sections.style = cleanCommaFormatting(`${sections.style}, ${lightBooster}`);
                totalChanges++;
                appliedNotes.push("Added lighting tags");
            }
            if (!/\b(sharp focus|intricate textures|lineart|shading|render|photo)\b/i.test(sections.style)) {
                sections.style = cleanCommaFormatting(`${sections.style}, sharp focus, intricate textures`);
                totalChanges++;
            }
        }

        // 6. Negative prompt fallback
        if (!sections.negative.trim()) {
            sections.negative = defaultNegative;
        }

        return {
            sections,
            count: totalChanges,
            notes: appliedNotes
        };
    }

    // 11. Improve a single modular section in place
    function improveSingleSection(sectionKey, text, usePerchance = false) {
        const raw = (text || "").trim();
        let res = upgradeWeakWordsInText(raw, usePerchance);
        let updated = res.text;
        let count = res.count;

        if (sectionKey === "character") {
            if (updated && /\b(girl|woman|female|lady)\b/i.test(updated) && !/\b1girl\b/i.test(updated)) {
                updated = cleanCommaFormatting(`1girl, solo, ${updated.replace(/\b(a|an|the)\s+(girl|woman|female|lady)\b/gi, "$2")}`);
                count++;
            } else if (updated && /\b(boy|man|male|guy)\b/i.test(updated) && !/\b1boy\b/i.test(updated)) {
                updated = cleanCommaFormatting(`1boy, solo, ${updated.replace(/\b(a|an|the)\s+(boy|man|male|guy)\b/gi, "$2")}`);
                count++;
            }
            if (updated && !/\b(catchlights|iris|expressive eyes|facial features)\b/i.test(updated)) {
                updated = cleanCommaFormatting(`${updated}, expressive eyes, detailed iris catchlights, refined facial features`);
                count++;
            }
        } else if (sectionKey === "outfit") {
            if (updated) {
                updated = cleanCommaFormatting(updated.replace(/\b(?:wearing|dressed in)\s+(?:a\s+|an\s+)?/gi, ""));
            }
            if (updated && !/\b(folds|texture|textures|fabric|silk|satin|leather|steel|trim)\b/i.test(updated)) {
                updated = cleanCommaFormatting(`${updated}, realistic fabric folds, intricate material detail`);
                count++;
            }
        } else if (sectionKey === "pose") {
            if (updated && !/\b(stance|pose|posture|looking|gaze|viewer)\b/i.test(updated)) {
                updated = cleanCommaFormatting(`${updated}, poised posture, looking at viewer`);
                count++;
            }
        } else if (sectionKey === "scene") {
            if (updated && !/\b(depth|atmosphere|atmospheric|motes|particles|reflections|sunbeams|bokeh|mist)\b/i.test(updated)) {
                updated = cleanCommaFormatting(`${updated}, atmospheric depth, ambient light motes`);
                count++;
            }
        } else if (sectionKey === "style") {
            if (updated && !/\b(masterpiece|best quality|ultra-detailed|highres)\b/i.test(updated)) {
                updated = cleanCommaFormatting(`masterpiece, best quality, ultra-detailed, highres, ${updated}`);
                count++;
            }
            if (updated && !/\b(lighting|light|god rays|chiaroscuro|bloom|highlights)\b/i.test(updated)) {
                updated = cleanCommaFormatting(`${updated}, cinematic rim lighting, sharp focus`);
                count++;
            }
        }

        return { text: updated, count };
    }

    return {
        WORD_UPGRADES,
        CHARACTER_IDENTIFIERS,
        SECTION_QUICK_TAGS,
        scanForUpgrades,
        upgradeWeakWordsInText,
        cleanCommaFormatting,
        assembleFullPrompt,
        parseFullPromptToSections,
        evaluatePerchanceSyntax,
        improvePrompt,
        improveSingleSection
    };
})();

window.PromptEngine = PromptEngine;
