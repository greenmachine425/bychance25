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
            primary: "2D pinup illustration style, stylized 2D character art, wide hips, thick thighs, curvy figure, stylized large head, large expressive eyes, bold clean lineart, smooth cel shading, vibrant colors",
            alternatives: [
                "stylized 2D pinup proportions, exaggerated hourglass silhouette, wide hips, thick thighs, large expressive eyes, crisp ink lineart, glossy cel shading",
                "modern 2D cartoon pinup aesthetic, curvy stylized anatomy, large head proportion, expressive eyes, clean vector-style linework"
            ],
            perchance: "{2D pinup illustration style, wide hips, thick thighs, curvy, stylized large head, large expressive eyes, bold lineart|stylized 2D pinup aesthetic, exaggerated curvy proportions, glossy cel shading}"
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
            primary: "photorealistic RAW photo, 85mm f/1.4 DSLR, natural skin pores, subsurface scattering, film grain",
            alternatives: [
                "cinematic 35mm film still, Kodak Portra 400 color grading, lifelike textures",
                "hyper-detailed studio portrait photography, physically accurate lighting"
            ],
            perchance: "{photorealistic RAW photo, 85mm DSLR, subsurface scattering|cinematic 35mm film still, Kodak Portra 400}"
        }
    ];

    // 2. Recognizable Character & Concept Visual Identifier Database
    // Ensures typing or picking a character (like "Rosalina") gives exact visual traits models recognize
    const CHARACTER_IDENTIFIERS = {
        "rosalina": {
            name: "Rosalina (Super Mario)",
            character: "Rosalina (Super Mario), 1girl, solo, tall slender cosmic princess, platinum blonde hair, long swept bangs covering right eye, bright turquoise cyan eyes, serene regal expression, fair skin",
            outfit: "silver tiara crown with jewels, off-shoulder light turquoise sleeveless gown, white collar trim, silver star brooch on chest, long flared dress hem, wand with golden star, accompanied by floating yellow Luma star companion",
            scene: "Comet Observatory dome, deep cosmic starry night sky, glowing Milky Way nebula, floating stardust particles, crescent moon",
            style: "masterpiece, best quality, vibrant anime illustration, luminous magical bloom, soft rim lighting, intricate eye catchlights, smooth cel shading"
        },
        "peach": {
            name: "Princess Peach (Super Mario)",
            character: "Princess Peach (Super Mario), 1girl, solo, long wavy golden blonde hair, sapphire blue eyes, sweet royal smile, rosy cheeks",
            outfit: "gold crown with red and blue jewels, pink puff-sleeve ballgown, darker pink pannier hip drapes, blue oval brooch on chest, long white opera gloves, blue round earrings",
            scene: "sunlit Mushroom Kingdom castle garden, stained glass castle towers in background, floating flower petals",
            style: "masterpiece, best quality, vibrant anime illustration, soft pastel lighting, crisp lineart"
        },
        "zelda": {
            name: "Princess Zelda (Legend of Zelda)",
            character: "Princess Zelda (Breath of the Wild / Tears of the Kingdom), 1girl, solo, long braided golden blonde hair, pointed Hylian ears, bright emerald green eyes, noble determined expression",
            outfit: "ornate royal blue and white Hylian ceremonial dress, gold Triforce embroidery, decorative shoulder pauldrons, golden belt",
            scene: "ancient overgrown Temple of Time ruins, Silent Princess glowing blue flowers, sunbeams through stone arches",
            style: "masterpiece, best quality, painterly fantasy anime illustration, golden hour volumetric light, intricate textures"
        },
        "samus": {
            name: "Samus Aran (Metroid)",
            character: "Samus Aran (Metroid), 1girl, solo, athletic tall figure, long golden blonde hair in high ponytail, piercing ice-blue eyes, beauty mark under left eye, confident expression",
            outfit: "sleek glowing blue Zero Suit bodysuit, subtle hexagonal tech texture, glowing pink chest insignia, metallic paralyzer pistol in hand",
            scene: "high-tech galactic starship bridge, holographic star map displays, atmospheric cyan neon rim lighting",
            style: "masterpiece, best quality, sci-fi anime key visual, glossy specular highlights, cinematic contrast"
        },
        "2b": {
            name: "2B (NieR:Automata)",
            character: "2B (NieR:Automata), YoRHa No.2 Type B, 1girl, solo, short silver-white bob hair, bangs, black combat visor blindfold over eyes, beauty mark under lip, stoic expression",
            outfit: "black Gothic lolita combat dress, high-slit velvet skirt with silver embroidery, puff sleeves with feather trim, black thigh-high boots, floating Virtuous Contract katana behind back",
            scene: "overgrown post-apocalyptic city ruins, crumbling concrete skyscrapers, shafts of pale sunlight, floating white dust motes",
            style: "masterpiece, best quality, atmospheric dark fantasy sci-fi illustration, delicate fabric textures, rim lighting"
        },
        "frieren": {
            name: "Frieren (Sousou no Frieren)",
            character: "Frieren (Sousou no Frieren), 1girl, solo, petite elf mage, silver-white hair in twin tails, long pointed elf ears, calm green eyes, peaceful nostalgic expression",
            outfit: "white and gold-trimmed capelet over white tunic shirt, striped scarf, black skirt, brown leather boots, red-gemmed golden mage staff, dangling red earrings",
            scene: "field of glowing blue-moon weed flowers at twilight, starry dusk sky, gentle breeze",
            style: "masterpiece, best quality, delicate watercolor anime aesthetic, soft magical lighting, expressive linework"
        },
        "miku": {
            name: "Hatsune Miku (Vocaloid)",
            character: "Hatsune Miku (Vocaloid), 1girl, solo, very long aqua-turquoise twin tails reaching knees, bright turquoise eyes, cheerful energetic smile",
            outfit: "sleeveless grey futuristic collared top with turquoise tie, black detached arm warmers with glowing equalizer graphics, pleated black skirt with teal trim, square hair ribbons",
            scene: "virtual concert stage, floating holographic musical notes, cyan laser beams, glowing crowd silhouettes",
            style: "masterpiece, best quality, vibrant modern anime illustration, luminous neon bloom, sharp focus"
        },
        "tifa": {
            name: "Tifa Lockhart (Final Fantasy VII)",
            character: "Tifa Lockhart (Final Fantasy VII Remake), 1girl, solo, long dark brown hair with dolphin-tail tips, warm wine-red eyes, athletic toned physique, warm confident smile",
            outfit: "fitted white cropped tank top, black miniskirt with suspenders, red leather combat gloves with metallic plates, black thigh-high socks, red boots",
            scene: "Seventh Heaven bar interior, warm amber Edison bulb lighting, wooden counter, neon sign glow",
            style: "masterpiece, best quality, semi-realistic 3D anime rendering, subsurface skin scattering, cinematic depth of field"
        }
    };

    // 3. Curated Quick-Add Tag Chips per Section
    const SECTION_QUICK_TAGS = {
        character: [
            { label: "+ 2D Pinup Proportions", value: "stylized 2D pinup proportions, curvy, wide hips, thick thighs, narrow waist, stylized large head, large expressive eyes" },
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
            { label: "+ 2D Pinup Style", value: "2D pinup illustration style, stylized 2D character art, wide hips, thick thighs, curvy, stylized large head, large expressive eyes, bold clean lineart, smooth cel shading, glossy highlights" },
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
        const order = ["character", "outfit", "scene", "style"];
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

    // 8. Parse a Full Pasted Prompt into Modular Sections (Character, Outfit/Pose, Scene, Style, Negative)
    function parseFullPromptToSections(fullText) {
        const result = {
            character: [],
            outfit: [],
            scene: [],
            style: [],
            negative: []
        };

        if (!fullText || !fullText.trim()) {
            return { character: "", outfit: "", scene: "", style: "", negative: "" };
        }

        // Extract Negative prompt if present
        let mainText = fullText;
        const negMatch = fullText.match(/(?:negative prompt\s*:|###\s*negative\s*:|\bnegative\s*:)\s*([\s\S]*)$/i);
        if (negMatch) {
            result.negative.push(negMatch[1].trim());
            mainText = fullText.slice(0, negMatch.index).trim();
        }

        // Tokenize by comma outside of {...} braces
        const tokens = splitTopLevelCommas(mainText);

        const styleKeywords = /\b(masterpiece|best quality|highres|absurdres|8k|4k|illustration|anime|cel shading|lineart|concept art|photorealistic|raw photo|dslr|lens|bokeh|depth of field|lighting|rim light|god rays|volumetric|chiaroscuro|bloom|angle|from below|from above|close-up|full body|portrait|shot|film grain|watercolor|oil painting|render|ufotable|shinkai|ghibli)\b/i;
        const sceneKeywords = /\b(background|sky|night|daylight|sunset|sunrise|twilight|forest|woods|city|street|castle|palace|room|interior|outdoor|observatory|nebula|starry|stars|moon|clouds|rain|snow|mist|fog|ocean|beach|mountain|garden|cafe|ruins|temple|flowers|petals|stardust|horizon|landscape|architecture)\b/i;
        const outfitPoseKeywords = /\b(dress|gown|skirt|shirt|jacket|coat|sweater|cardigan|armor|suit|bodysuit|gloves|boots|shoes|stockings|thighhighs|crown|tiara|brooch|wand|sword|katana|weapon|staff|scarf|hat|ribbon|earrings|necklace|glasses|visor|blindfold|standing|sitting|seated|pose|stance|walking|running|action|fighting|leaning|crossed|holding|smiling|smile|expression|blush|crying|tears|scowl|glare|looking|gaze)\b/i;
        const negKeywords = /\b(lowres|worst quality|low quality|bad anatomy|bad hands|extra digits|blurry|watermark|signature|mutated|deformed|ugly|jpeg artifacts)\b/i;

        tokens.forEach((rawToken) => {
            const token = rawToken.trim();
            if (!token) return;

            if (negKeywords.test(token)) {
                result.negative.push(token);
            } else if (styleKeywords.test(token)) {
                result.style.push(token);
            } else if (sceneKeywords.test(token)) {
                result.scene.push(token);
            } else if (outfitPoseKeywords.test(token)) {
                result.outfit.push(token);
            } else {
                result.character.push(token);
            }
        });

        return {
            character: result.character.join(", "),
            outfit: result.outfit.join(", "),
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

    return {
        WORD_UPGRADES,
        CHARACTER_IDENTIFIERS,
        SECTION_QUICK_TAGS,
        scanForUpgrades,
        upgradeWeakWordsInText,
        cleanCommaFormatting,
        assembleFullPrompt,
        parseFullPromptToSections,
        evaluatePerchanceSyntax
    };
})();

window.PromptEngine = PromptEngine;
