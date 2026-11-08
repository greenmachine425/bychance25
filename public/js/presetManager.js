/**
 * Bychance Preset Manager
 * Manages Full Setup Presets and Per-Section Modular Presets (Character, Outfit/Pose, Scene, Art Style)
 * with localStorage persistence, custom saving, deleting, and JSON import/export.
 */

const PresetManager = (() => {
    const STORAGE_KEY_FULL = "bychance_v2_custom_full_presets";
    const STORAGE_KEY_SECTION = "bychance_v2_custom_section_presets";
    const STORAGE_KEY_LAST_STATE = "bychance_v5_last_workbench_state";

    const DEFAULT_NEGATIVE = "3d, photorealistic, realistic photo, chibi, super deformed, big head, oversized head, lowres, worst quality, low quality, bad anatomy, bad hands, extra digits, fewer digits, blurry, watermark, signature, text, jpeg artifacts, deformed, mutated hands";

    // Built-in Full Setup Presets
    const BUILTIN_FULL_PRESETS = [
        {
            id: "full_2d_pinup",
            name: "2D Pinup Style (Default)",
            builtin: true,
            rawPrompt: "aesthetic 11, anthro art style, zoomorphism character, anthropomorphic in the style of furry art, anthropomorphic animal. aesthetic 11, anthro art style, zoomorphism character, anthropomorphic in the style of furry art, anthropomorphic animal. aesthetic 11, anthro art style, zoomorphism character, anthropomorphic in the style of furry art. Cowboy shot of an adult human woman, extreme exaggerated pin-up figure, 3/4 side angle. Posing with arms raised up behind head, arched back, leaning back slightly. Stylized 2D Disney-anime face: huge expressive bright green anime eyes, friendly sweet smile, winged liner, minimalist dot nose, cute tapered chin, short wavy Monroe blonde hair fading to pink tips, ahoge, black choker. Black spaghetti strap crop tank top, bare midriff, tight grey cotton booty shorts, plain heather grey lounge shorts. Extreme cartoon anatomy, gigantic drooping heavy bust, massive sagging breasts, natural gravity hang, tiny cinched waist, massive flared shelf hips, thick thighs. Bold angular linework in the style of Bruce Timm, AWD, and xaxaxa, flat color fills, stark two-tone cel shading, zero gradients, 1990s animated screencap.",
            sections: {
                character: "Stylized 2D Disney-anime face: huge expressive bright green anime eyes, friendly sweet smile, winged liner, minimalist dot nose, cute tapered chin, short wavy Monroe blonde hair fading to pink tips, ahoge, black choker. Extreme cartoon anatomy, gigantic drooping heavy bust, massive sagging breasts, natural gravity hang, tiny cinched waist, massive flared shelf hips, thick thighs.",
                outfit: "Black spaghetti strap crop tank top, bare midriff, tight grey cotton booty shorts, plain heather grey lounge shorts.",
                pose: "Cowboy shot of an adult human woman, extreme exaggerated pin-up figure, 3/4 side angle. Posing with arms raised up behind head, arched back, leaning back slightly.",
                scene: "",
                style: "aesthetic 11, anthro art style, zoomorphism character, anthropomorphic in the style of furry art, anthropomorphic animal. aesthetic 11, anthro art style, zoomorphism character, anthropomorphic in the style of furry art, anthropomorphic animal. aesthetic 11, anthro art style, zoomorphism character, anthropomorphic in the style of furry art. Bold angular linework in the style of Bruce Timm, AWD, and xaxaxa, flat color fills, stark two-tone cel shading, zero gradients, 1990s animated screencap.",
                negative: DEFAULT_NEGATIVE
            }
        },
        {
            id: "full_rosalina",
            name: "Rosalina — Cosmic Observatory",
            builtin: true,
            sections: {
                character: "Rosalina (Super Mario), 1girl, solo, tall slender cosmic princess, platinum blonde hair, long swept bangs covering right eye, bright turquoise cyan eyes, fair skin",
                outfit: "silver tiara crown with jewels, off-shoulder light turquoise sleeveless gown, white collar trim, silver star brooch on chest, golden star wand, floating yellow Luma star companion",
                pose: "graceful floating posture, serene regal expression, looking at viewer",
                scene: "Comet Observatory dome terrace, deep cosmic starry night sky, vivid Milky Way nebula, floating stardust motes, luminous crescent moon",
                style: "masterpiece, best quality, ultra-detailed anime key visual, luminous magical bloom, cinematic cyan rim lighting, intricate iris catchlights, smooth cel shading",
                negative: DEFAULT_NEGATIVE
            }
        },
        {
            id: "full_zelda",
            name: "Princess Zelda — Sacred Ruins",
            builtin: true,
            sections: {
                character: "Princess Zelda (Legend of Zelda), 1girl, solo, long braided golden blonde hair, pointed Hylian ears, bright emerald green eyes",
                outfit: "ornate royal blue and white Hylian ceremonial gown, gold Triforce embroidery, decorative shoulder pauldrons, golden belt",
                pose: "poised standing stance, hands clasped in prayer, noble contemplative expression",
                scene: "ancient moss-covered Temple of Time ruins, glowing blue Silent Princess flowers in foreground, shafts of warm golden sunlight filtering through stone arches",
                style: "masterpiece, best quality, painterly fantasy anime illustration, volumetric god rays, rich atmospheric color grading, crisp lineart",
                negative: DEFAULT_NEGATIVE
            }
        },
        {
            id: "full_frieren",
            name: "Frieren — Twilight Flower Field",
            builtin: true,
            sections: {
                character: "Frieren (Sousou no Frieren), 1girl, solo, petite elf mage, silver-white hair in long twin tails, long pointed elf ears, calm emerald green eyes",
                outfit: "white and gold-trimmed capelet over white tunic, striped scarf, black skirt, brown leather boots, red-gemmed golden mage staff, red dangling earrings",
                pose: "seated gracefully in flower meadow, gentle nostalgic smile, looking at viewer",
                scene: "vast meadow of glowing blue-moon weed flowers at twilight dusk, shooting stars across indigo sky, fireflies, gentle breeze",
                style: "masterpiece, best quality, delicate watercolor anime aesthetic, soft magical bioluminescent lighting, shallow depth of field, expressive lineweight",
                negative: DEFAULT_NEGATIVE
            }
        },
        {
            id: "full_2b",
            name: "2B — Post-Apocalyptic Cathedral",
            builtin: true,
            sections: {
                character: "2B (NieR:Automata), YoRHa No.2 Type B, 1girl, solo, short silver-white bob hair, bangs, black combat visor blindfold over eyes, beauty mark under lip",
                outfit: "black Gothic lolita combat dress, high-slit velvet skirt with silver embroidery, puff sleeves with feather trim, black thigh-high boots, Virtuous Contract katana",
                pose: "dynamic combat stance, stoic expression, poised readiness",
                scene: "sunlit overgrown city cathedral ruins, crumbling concrete pillars, white Lunar Tear flowers, floating dust motes in light beams",
                style: "masterpiece, best quality, atmospheric dark sci-fi illustration, dramatic chiaroscuro lighting, intricate velvet and metallic textures, 85mm portrait framing",
                negative: DEFAULT_NEGATIVE
            }
        },
        {
            id: "full_samus",
            name: "Samus Aran — Starship Bridge",
            builtin: true,
            sections: {
                character: "Samus Aran (Metroid), 1girl, solo, tall athletic figure, long golden blonde hair in high ponytail, piercing ice-blue eyes, beauty mark under left eye",
                outfit: "sleek glowing blue Zero Suit bodysuit, subtle hexagonal panel texture, glowing pink chest insignia, metallic Paralyzer pistol holstered",
                pose: "confident contrapposto stance, hand on hip, confident gaze",
                scene: "high-tech galactic starship command bridge, glowing cyan holographic star map projections, deep space viewport with nebula",
                style: "masterpiece, best quality, sleek sci-fi anime key visual, glossy specular highlights, neon cyan and magenta rim lighting, sharp focus",
                negative: DEFAULT_NEGATIVE
            }
        },
        {
            id: "full_miku",
            name: "Hatsune Miku — Holographic Concert",
            builtin: true,
            sections: {
                character: "Hatsune Miku (Vocaloid), 1girl, solo, very long aqua-turquoise twin tails, bright turquoise eyes, sparkling eye catchlights",
                outfit: "sleeveless grey futuristic collared top with turquoise tie, black detached arm warmers with glowing equalizer graphics, pleated black miniskirt, square hair ribbons",
                pose: "dynamic singing pose reaching toward viewer, joyful beaming smile",
                scene: "futuristic holographic concert stage, floating cyan musical notes, laser light beams, bokeh stage lights",
                style: "masterpiece, best quality, vibrant modern anime illustration, high-contrast neon bloom, crisp linework, dynamic low angle shot",
                negative: DEFAULT_NEGATIVE
            }
        },
        {
            id: "full_perchance_mix",
            name: "Dynamic Fantasy Explorer ({a|b} Syntax)",
            builtin: true,
            sections: {
                character: "1girl, solo, {silver-white|platinum blonde|midnight black|crimson} hair, {windswept hair|long braided hair|twin tails}, {emerald green|sapphire blue|amber gold} eyes, detailed iris catchlights",
                outfit: "{ornate royal mage robe with gold filigree|engraved silver valkyrie plate armor|stylish traveller cloak and leather tunic}",
                pose: "{graceful standing pose|dynamic spellcasting stance|looking back over shoulder}, poised posture",
                scene: "{ancient floating sky citadel at sunset|enchanted bioluminescent forest glade at night|grand gothic library with floating grimoires}",
                style: "masterpiece, best quality, {modern anime key visual, vibrant cel shading|painterly fantasy concept art, rich brushwork}, cinematic rim lighting, volumetric god rays",
                negative: DEFAULT_NEGATIVE
            }
        }
    ];

    // Built-in Modular Section Presets
    const BUILTIN_SECTION_PRESETS = {
        character: [
            {
                id: "char_2d_pinup",
                name: "2D Pinup Proportions (Curvy / Expressive)",
                value: "1girl, solo, stylized 2D pinup proportions, curvy figure, wide hips, thick thighs, narrow waist, large expressive eyes, long eyelashes, detailed iris catchlights, expressive facial features"
            },
            {
                id: "char_rosalina",
                name: "Rosalina (Super Mario)",
                value: "Rosalina (Super Mario), 1girl, solo, tall slender cosmic princess, platinum blonde hair, long swept bangs covering right eye, bright turquoise cyan eyes, fair skin"
            },
            {
                id: "char_peach",
                name: "Princess Peach (Super Mario)",
                value: "Princess Peach (Super Mario), 1girl, solo, long wavy golden blonde hair, sapphire blue eyes, rosy cheeks"
            },
            {
                id: "char_zelda",
                name: "Princess Zelda (Legend of Zelda)",
                value: "Princess Zelda (Legend of Zelda), 1girl, solo, long braided golden blonde hair, pointed Hylian ears, bright emerald green eyes"
            },
            {
                id: "char_frieren",
                name: "Frieren (Sousou no Frieren)",
                value: "Frieren (Sousou no Frieren), 1girl, solo, petite elf mage, silver-white hair in long twin tails, long pointed elf ears, calm green eyes"
            },
            {
                id: "char_2b",
                name: "2B (NieR:Automata)",
                value: "2B (NieR:Automata), YoRHa No.2 Type B, 1girl, solo, short silver-white bob hair, bangs, black combat visor blindfold, beauty mark under lip"
            },
            {
                id: "char_samus",
                name: "Samus Aran (Metroid)",
                value: "Samus Aran (Metroid), 1girl, solo, tall athletic figure, long golden blonde hair in high ponytail, piercing ice-blue eyes, beauty mark under left eye"
            },
            {
                id: "char_miku",
                name: "Hatsune Miku (Vocaloid)",
                value: "Hatsune Miku (Vocaloid), 1girl, solo, very long aqua-turquoise twin tails, bright turquoise eyes"
            },
            {
                id: "char_tifa",
                name: "Tifa Lockhart (FFVII)",
                value: "Tifa Lockhart (Final Fantasy VII), 1girl, solo, long dark brown hair with dolphin-tail tips, warm wine-red eyes, athletic toned physique"
            },
            {
                id: "char_custom_elf",
                name: "Ethereal High Elf Archetype",
                value: "1girl, solo, ethereal high elf, waist-length iridescent silver hair, long pointed elf ears, luminous violet eyes, delicate eyelashes"
            }
        ],
        outfit: [
            {
                id: "out_rosalina_gown",
                name: "Rosalina's Turquoise Gown & Luma",
                value: "silver tiara crown, off-shoulder light turquoise sleeveless gown, white collar trim, silver star brooch on chest, golden star wand, floating yellow Luma companion"
            },
            {
                id: "out_cozy_cafe",
                name: "Cozy Autumn Sweater & Scarf",
                value: "oversized cream cable-knit sweater, plaid pleated skirt, warm knit scarf, holding ceramic coffee mug"
            },
            {
                id: "out_cyber_techwear",
                name: "Cyberpunk Neon Techwear & Katana",
                value: "sleek matte-black futuristic techwear jacket, glowing cyan neon collar trim, tactical utility straps, fingerless gloves, holographic katana"
            },
            {
                id: "out_royal_ballgown",
                name: "Opulent Royal Ballgown",
                value: "ornate midnight-blue silk ballgown, gold filigree embroidery, layered chiffon skirt, diamond tiara, long white opera gloves"
            },
            {
                id: "out_valkyrie_armor",
                name: "Engraved Silver Valkyrie Armor",
                value: "engraved silver filigree plate armor, white feathered cape, gilded pauldrons, winged spear"
            },
            {
                id: "out_summer_sundress",
                name: "Sunlit Summer Sundress & Straw Hat",
                value: "flowing white linen sundress with ribbon, wide-brimmed straw sunhat, barefoot"
            }
        ],
        pose: [
            {
                id: "pos_pinup_confident",
                name: "Confident Pinup Stance",
                value: "confident pinup stance, hand on hip, playful expression, looking at viewer"
            },
            {
                id: "pos_graceful_standing",
                name: "Graceful Contrapposto Stance",
                value: "graceful contrapposto stance, poised posture, serene warm smile, looking at viewer"
            },
            {
                id: "pos_seated_cozy",
                name: "Seated Gracefully / Relaxed",
                value: "seated gracefully, legs crossed, relaxed posture, gentle smile, looking at viewer"
            },
            {
                id: "pos_looking_back",
                name: "Looking Back Over Shoulder",
                value: "standing pose, looking back over shoulder at viewer, captivating gaze, windswept motion"
            },
            {
                id: "pos_dynamic_action",
                name: "Dynamic Action / Combat Stance",
                value: "dynamic airborne action pose, foreshortened perspective, kinetic motion, intense focused gaze"
            },
            {
                id: "pos_spellcasting",
                name: "Arcane Spellcasting Pose",
                value: "dynamic spellcasting stance, hand reaching forward, casting glowing arcane magic circle, focused expression"
            }
        ],
        scene: [
            {
                id: "scn_observatory",
                name: "Cosmic Starry Observatory",
                value: "Comet Observatory dome terrace, deep cosmic starry night sky, vivid Milky Way nebula, floating stardust particles, luminous crescent moon"
            },
            {
                id: "scn_neon_rain",
                name: "Rainy Cyberpunk Neon Alley",
                value: "neon-drenched cyberpunk street at night, wet asphalt mirror reflections, glowing holographic kanji signage, falling rain droplets, steam rising from vents"
            },
            {
                id: "scn_enchanted_forest",
                name: "Sunlit Enchanted Forest Glade",
                value: "ancient mossy forest glade, golden sunbeams filtering through dense canopy, glowing bioluminescent mushrooms, crystal clear stream, floating pollen motes"
            },
            {
                id: "scn_cozy_cafe",
                name: "Warm Rainy-Window Cafe Interior",
                value: "cozy vintage wooden cafe interior, warm amber Edison bulb lighting, raindrops streaking down glass windowpane, blurred city bokeh outside, bookshelves"
            },
            {
                id: "scn_gothic_palace",
                name: "Grand Stained-Glass Cathedral",
                value: "grand Gothic cathedral hall, soaring vaulted marble arches, towering stained glass rose windows casting colorful light beams, candelabras"
            },
            {
                id: "scn_sunset_beach",
                name: "Golden Hour Ocean Horizon",
                value: "scenic tropical ocean shoreline at golden hour sunset, turquoise translucent waves, wet sand reflections, dramatic glowing cumulonimbus clouds"
            }
        ],
        style: [
            {
                id: "sty_2d_pinup",
                name: "2D Pinup Style (Default)",
                value: "2D pinup illustration style, stylized 2D character art, wide hips, thick thighs, curvy, large expressive eyes, bold clean lineart, smooth cel shading, vibrant saturated colors, glossy specular highlights, masterpiece, best quality, highres"
            },
            {
                id: "sty_modern_anime",
                name: "Modern Anime Key Visual (Shinkai / KyoAni)",
                value: "masterpiece, best quality, ultra-detailed modern anime key visual, Makoto Shinkai and Kyoto Animation aesthetic, vibrant cel shading, crisp lineart, cinematic rim lighting, luminous bloom, shallow depth of field"
            },
            {
                id: "sty_90s_cel",
                name: "90s Retro Cel Anime Aesthetic",
                value: "masterpiece, best quality, 1990s retro anime production cel aesthetic, hand-painted gouache background, subtle VHS film grain, classic high-contrast cel shading, nostalgic color palette"
            },
            {
                id: "sty_ufotable_action",
                name: "Ufotable Dynamic Lighting & VFX",
                value: "masterpiece, best quality, ufotable style digital anime illustration, dramatic high-contrast lighting, glowing particle effects, dynamic camera angle, crisp metallic highlights, absurdres"
            },
            {
                id: "sty_painterly_fantasy",
                name: "Painterly Fantasy Concept Art",
                value: "masterpiece, best quality, digital fantasy concept art illustration, expressive painterly brushwork, rich atmospheric color grading, volumetric god rays, chiaroscuro lighting, intricate textures"
            },
            {
                id: "sty_watercolor",
                name: "Soft Storybook Watercolor",
                value: "masterpiece, best quality, delicate watercolor and ink illustration, textured cold-press paper grain, soft pastel washes, gentle diffused daylight, whimsical aesthetic"
            },
            {
                id: "sty_photoreal",
                name: "Cinematic 85mm Photorealistic Portrait",
                value: "RAW photo, masterpiece, best quality, photorealistic portrait, 85mm f/1.4 prime lens, creamy bokeh background, natural skin texture, subsurface scattering, Kodak Portra 400 film grading, cinematic key lighting"
            }
        ]
    };

    function getCustomFullPresets() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_FULL);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveCustomFullPresets(list) {
        try {
            localStorage.setItem(STORAGE_KEY_FULL, JSON.stringify(list));
        } catch (e) {
            console.warn("Could not save custom full presets:", e);
        }
    }

    function getCustomSectionPresets() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_SECTION);
            const parsed = raw ? JSON.parse(raw) : {};
            return {
                character: parsed.character || [],
                outfit: parsed.outfit || [],
                pose: parsed.pose || [],
                scene: parsed.scene || [],
                style: parsed.style || []
            };
        } catch (e) {
            return { character: [], outfit: [], pose: [], scene: [], style: [] };
        }
    }

    function saveCustomSectionPresets(map) {
        try {
            localStorage.setItem(STORAGE_KEY_SECTION, JSON.stringify(map));
        } catch (e) {
            console.warn("Could not save custom section presets:", e);
        }
    }

    function getAllFullPresets() {
        return [...BUILTIN_FULL_PRESETS, ...getCustomFullPresets()];
    }

    function getSectionPresets(sectionKey) {
        const builtin = BUILTIN_SECTION_PRESETS[sectionKey] || [];
        const custom = (getCustomSectionPresets()[sectionKey] || []).map((item) => ({
            ...item,
            custom: true
        }));
        return [...builtin, ...custom];
    }

    function addCustomFullPreset(name, sections) {
        const list = getCustomFullPresets();
        const newPreset = {
            id: "custom_full_" + Date.now(),
            name: `${name.trim()} (Custom)`,
            builtin: false,
            sections: { ...sections }
        };
        list.push(newPreset);
        saveCustomFullPresets(list);
        return newPreset;
    }

    function deleteCustomFullPreset(id) {
        const list = getCustomFullPresets().filter((p) => p.id !== id);
        saveCustomFullPresets(list);
    }

    function addCustomSectionPreset(sectionKey, name, value) {
        const map = getCustomSectionPresets();
        if (!map[sectionKey]) map[sectionKey] = [];
        const newEntry = {
            id: `custom_${sectionKey}_${Date.now()}`,
            name: `${name.trim()} (Custom)`,
            value: value.trim(),
            custom: true
        };
        map[sectionKey].push(newEntry);
        saveCustomSectionPresets(map);
        return newEntry;
    }

    function deleteCustomSectionPreset(sectionKey, id) {
        const map = getCustomSectionPresets();
        if (!map[sectionKey]) return;
        map[sectionKey] = map[sectionKey].filter((p) => p.id !== id);
        saveCustomSectionPresets(map);
    }

    function saveLastWorkbenchState(sections) {
        try {
            localStorage.setItem(STORAGE_KEY_LAST_STATE, JSON.stringify(sections));
        } catch (e) {}
    }

    function loadLastWorkbenchState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_LAST_STATE);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return null;
    }

    function exportAllCustomPresetsJSON() {
        return JSON.stringify(
            {
                version: 2,
                exportedAt: new Date().toISOString(),
                fullPresets: getCustomFullPresets(),
                sectionPresets: getCustomSectionPresets()
            },
            null,
            2
        );
    }

    function importCustomPresetsJSON(jsonString) {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data.fullPresets)) {
            const currentFull = getCustomFullPresets();
            const merged = [...currentFull, ...data.fullPresets];
            saveCustomFullPresets(merged);
        }
        if (data.sectionPresets && typeof data.sectionPresets === "object") {
            const currentSec = getCustomSectionPresets();
            ["character", "outfit", "pose", "scene", "style"].forEach((k) => {
                if (Array.isArray(data.sectionPresets[k])) {
                    currentSec[k] = [...(currentSec[k] || []), ...data.sectionPresets[k]];
                }
            });
            saveCustomSectionPresets(currentSec);
        }
    }

    return {
        DEFAULT_NEGATIVE,
        getAllFullPresets,
        getSectionPresets,
        addCustomFullPreset,
        deleteCustomFullPreset,
        addCustomSectionPreset,
        deleteCustomSectionPreset,
        saveLastWorkbenchState,
        loadLastWorkbenchState,
        exportAllCustomPresetsJSON,
        importCustomPresetsJSON
    };
})();

window.PresetManager = PresetManager;
