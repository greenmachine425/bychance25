/**
 * Bychance Workbench UI Controller
 * Connects Modular Split Editors, Full Copy-Paste Master Window,
 * Deterministic Word Upgrader, and Preset Manager.
 */

document.addEventListener("DOMContentLoaded", () => {
    const SECTION_KEYS = ["character", "outfit", "scene", "style", "negative"];

    const boxes = {
        character: document.getElementById("box-character"),
        outfit: document.getElementById("box-outfit"),
        scene: document.getElementById("box-scene"),
        style: document.getElementById("box-style"),
        negative: document.getElementById("box-negative")
    };

    const masterBox = document.getElementById("box-master");
    const masterFormatSelect = document.getElementById("master-format-select");
    const fullPresetSelect = document.getElementById("full-preset-select");
    const deleteFullPresetBtn = document.getElementById("btn-delete-full-preset");

    const sectionSelects = {
        character: document.getElementById("preset-select-character"),
        outfit: document.getElementById("preset-select-outfit"),
        scene: document.getElementById("preset-select-scene"),
        style: document.getElementById("preset-select-style")
    };

    const upgradeSuggestionsList = document.getElementById("upgrade-suggestions-list");
    const upgradeCountBadge = document.getElementById("upgrade-count-badge");
    const dictSearchInput = document.getElementById("dict-search-input");
    const dictBrowserGrid = document.getElementById("dict-browser-grid");

    const rollPreviewContainer = document.getElementById("roll-preview-container");
    const rollPreviewOutput = document.getElementById("roll-preview-output");

    let toastTimer = null;

    function showToast(msg) {
        const banner = document.getElementById("toast-banner");
        if (!banner) return;
        banner.textContent = msg;
        banner.classList.add("visible");
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            banner.classList.remove("visible");
        }, 2600);
    }

    // Auto-adjust textarea height so content never clips
    function autoFitTextarea(el) {
        if (!el) return;
        el.style.height = "auto";
        const minH = el.classList.contains("master-textarea") ? 165 : 86;
        el.style.height = Math.max(minH, Math.min(el.scrollHeight + 4, 420)) + "px";
    }

    function autoFitAllTextareas() {
        SECTION_KEYS.forEach((k) => autoFitTextarea(boxes[k]));
        autoFitTextarea(masterBox);
    }

    // Read current modular sections state
    function getCurrentSections() {
        return {
            character: boxes.character.value,
            outfit: boxes.outfit.value,
            scene: boxes.scene.value,
            style: boxes.style.value,
            negative: boxes.negative.value
        };
    }

    // Write state into modular boxes and sync master window
    function setSections(sections, syncMaster = true) {
        SECTION_KEYS.forEach((k) => {
            if (typeof sections[k] === "string") {
                boxes[k].value = sections[k];
            }
        });
        if (syncMaster) {
            syncModularToMaster();
        } else {
            refreshUpgradeSuggestions();
            PresetManager.saveLastWorkbenchState(getCurrentSections());
            autoFitAllTextareas();
        }
    }

    // Sync Modular Boxes -> Full Master Prompt Window
    function syncModularToMaster() {
        const current = getCurrentSections();
        const format = masterFormatSelect.value || "standard";
        masterBox.value = PromptEngine.assembleFullPrompt(current, format);
        PresetManager.saveLastWorkbenchState(current);
        refreshUpgradeSuggestions();
        autoFitAllTextareas();
    }

    // Populate Full Setup Presets Dropdown
    function renderFullPresetDropdown(selectedId) {
        const all = PresetManager.getAllFullPresets();
        fullPresetSelect.innerHTML = "";
        all.forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name;
            fullPresetSelect.appendChild(opt);
        });
        if (selectedId && all.some((p) => p.id === selectedId)) {
            fullPresetSelect.value = selectedId;
        }
        updateDeleteFullPresetVisibility();
    }

    function updateDeleteFullPresetVisibility() {
        const all = PresetManager.getAllFullPresets();
        const current = all.find((p) => p.id === fullPresetSelect.value);
        if (current && !current.builtin) {
            deleteFullPresetBtn.classList.remove("hidden");
        } else {
            deleteFullPresetBtn.classList.add("hidden");
        }
    }

    // Populate Per-Section Modular Presets Dropdowns
    function renderSectionPresetDropdowns() {
        ["character", "outfit", "scene", "style"].forEach((sectionKey) => {
            const selectEl = sectionSelects[sectionKey];
            if (!selectEl) return;
            const list = PresetManager.getSectionPresets(sectionKey);
            selectEl.innerHTML = "";

            const placeholder = document.createElement("option");
            placeholder.value = "";
            const labelMap = {
                character: "Swap Character Preset...",
                outfit: "Swap Pose / Outfit Preset...",
                scene: "Swap Scene Preset...",
                style: "Swap Art Style Preset..."
            };
            placeholder.textContent = labelMap[sectionKey];
            selectEl.appendChild(placeholder);

            list.forEach((item) => {
                const opt = document.createElement("option");
                opt.value = item.id;
                opt.textContent = item.name;
                selectEl.appendChild(opt);
            });

            updateSectionDeleteBtn(sectionKey);
        });
    }

    function updateSectionDeleteBtn(sectionKey) {
        const selectEl = sectionSelects[sectionKey];
        const delBtn = document.getElementById(`del-section-${sectionKey}`);
        if (!selectEl || !delBtn) return;
        const list = PresetManager.getSectionPresets(sectionKey);
        const found = list.find((item) => item.id === selectEl.value);
        if (found && found.custom) {
            delBtn.classList.remove("hidden");
        } else {
            delBtn.classList.add("hidden");
        }
    }

    // Render Quick-Add Tag Chips under each modular box
    function renderQuickTagChips() {
        SECTION_KEYS.forEach((sectionKey) => {
            const container = document.getElementById(`chips-${sectionKey}`);
            if (!container) return;
            container.innerHTML = "";
            const tags = PromptEngine.SECTION_QUICK_TAGS[sectionKey] || [];
            tags.forEach((tag) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "tag-chip";
                btn.textContent = tag.label;
                btn.title = `Append: ${tag.value}`;
                btn.addEventListener("click", () => {
                    appendTokenToBox(sectionKey, tag.value);
                });
                container.appendChild(btn);
            });
        });
    }

    function appendTokenToBox(sectionKey, tokenStr) {
        const box = boxes[sectionKey];
        if (!box) return;
        const current = box.value.trim();
        if (!current) {
            box.value = tokenStr;
        } else if (!current.toLowerCase().includes(tokenStr.toLowerCase())) {
            box.value = PromptEngine.cleanCommaFormatting(`${current}, ${tokenStr}`);
        }
        syncModularToMaster();
        showToast(`Added to ${sectionKey}: ${tokenStr.slice(0, 36)}...`);
    }

    // Scan all boxes for weak words or unexpanded character names and render interactive suggestions
    function refreshUpgradeSuggestions() {
        const combinedText = [
            boxes.character.value,
            boxes.outfit.value,
            boxes.scene.value,
            boxes.style.value,
            masterBox.value
        ].join(", ");

        const suggestions = PromptEngine.scanForUpgrades(combinedText);
        upgradeCountBadge.textContent = `${suggestions.length} upgrade${suggestions.length === 1 ? "" : "s"} available`;
        upgradeSuggestionsList.innerHTML = "";

        if (suggestions.length === 0) {
            const empty = document.createElement("div");
            empty.className = "card-hint";
            empty.style.padding = "0.5rem 0";
            empty.textContent = "No weak words detected! Try typing words like 'Rosalina', 'shiny', 'standing', 'sad', 'nice lighting', 'camera below', or 'good quality' to see instant deterministic upgrades.";
            upgradeSuggestionsList.appendChild(empty);
            return;
        }

        suggestions.forEach((item) => {
            const card = document.createElement("div");
            card.className = "upgrade-item";

            const header = document.createElement("div");
            header.className = "upgrade-item-header";

            const wordBadge = document.createElement("span");
            wordBadge.className = "upgrade-word-badge";
            wordBadge.textContent = item.type === "character" ? `🌟 ${item.label}` : `Weak term: ${item.label}`;

            const catBadge = document.createElement("span");
            catBadge.className = "upgrade-cat-badge";
            catBadge.textContent = item.category;

            header.appendChild(wordBadge);
            header.appendChild(catBadge);

            const preview = document.createElement("div");
            preview.className = "upgrade-target-preview";
            preview.textContent = `→ ${item.primary}`;

            const actions = document.createElement("div");
            actions.className = "upgrade-actions";

            if (item.type === "character" && item.characterProfile) {
                const fillAllBtn = document.createElement("button");
                fillAllBtn.className = "btn btn-xs btn-primary";
                fillAllBtn.textContent = "✨ Populate Character + Outfit + Scene Boxes";
                fillAllBtn.addEventListener("click", () => {
                    const prof = item.characterProfile;
                    boxes.character.value = prof.character;
                    if (!boxes.outfit.value.trim()) boxes.outfit.value = prof.outfit;
                    if (!boxes.scene.value.trim()) boxes.scene.value = prof.scene;
                    if (!boxes.style.value.trim()) boxes.style.value = prof.style;
                    syncModularToMaster();
                    showToast(`Loaded full visual identifiers for ${prof.name}!`);
                });

                const charOnlyBtn = document.createElement("button");
                charOnlyBtn.className = "btn btn-xs btn-emerald";
                charOnlyBtn.textContent = "👤 Expand Character Box Only";
                charOnlyBtn.addEventListener("click", () => {
                    const prof = item.characterProfile;
                    const reg = new RegExp(`\\b${item.matchedWord}\\b`, "gi");
                    if (reg.test(boxes.character.value)) {
                        boxes.character.value = PromptEngine.cleanCommaFormatting(
                            boxes.character.value.replace(reg, prof.character)
                        );
                    } else {
                        boxes.character.value = prof.character;
                    }
                    syncModularToMaster();
                    showToast(`Expanded ${prof.name} character traits!`);
                });

                actions.appendChild(fillAllBtn);
                actions.appendChild(charOnlyBtn);
            } else {
                // Weak word replacement buttons
                const applyPrimaryBtn = document.createElement("button");
                applyPrimaryBtn.className = "btn btn-xs btn-amber";
                applyPrimaryBtn.textContent = "✨ Replace with Model Tags";
                applyPrimaryBtn.addEventListener("click", () => {
                    replaceRegexAcrossBoxes(item.regex, item.primary);
                    showToast(`Upgraded ${item.label} → ${item.primary.slice(0, 34)}...`);
                });

                const applyPerchanceBtn = document.createElement("button");
                applyPerchanceBtn.className = "btn btn-xs btn-purple";
                applyPerchanceBtn.textContent = "🎲 Replace with {a|b} Choice";
                applyPerchanceBtn.addEventListener("click", () => {
                    replaceRegexAcrossBoxes(item.regex, item.perchance);
                    showToast(`Upgraded ${item.label} to Perchance {a|b} choices!`);
                });

                actions.appendChild(applyPrimaryBtn);
                actions.appendChild(applyPerchanceBtn);

                (item.alternatives || []).forEach((alt, idx) => {
                    const altBtn = document.createElement("button");
                    altBtn.className = "btn btn-xs";
                    altBtn.textContent = `Alt ${idx + 1}: ${alt.slice(0, 28)}...`;
                    altBtn.title = alt;
                    altBtn.addEventListener("click", () => {
                        replaceRegexAcrossBoxes(item.regex, alt);
                        showToast(`Replaced ${item.label} with Alt ${idx + 1}`);
                    });
                    actions.appendChild(altBtn);
                });
            }

            card.appendChild(header);
            card.appendChild(preview);
            card.appendChild(actions);
            upgradeSuggestionsList.appendChild(card);
        });
    }

    function replaceRegexAcrossBoxes(regex, replacement) {
        let changedInModular = false;
        ["character", "outfit", "scene", "style"].forEach((k) => {
            regex.lastIndex = 0;
            if (regex.test(boxes[k].value)) {
                regex.lastIndex = 0;
                boxes[k].value = PromptEngine.cleanCommaFormatting(boxes[k].value.replace(regex, replacement));
                changedInModular = true;
            }
        });

        if (changedInModular) {
            syncModularToMaster();
        } else {
            regex.lastIndex = 0;
            masterBox.value = PromptEngine.cleanCommaFormatting(masterBox.value.replace(regex, replacement));
            const parsed = PromptEngine.parseFullPromptToSections(masterBox.value);
            setSections(parsed, true);
        }
    }

    // Render Searchable Dictionary Browser
    function renderDictionaryBrowser(query = "") {
        const q = query.trim().toLowerCase();
        dictBrowserGrid.innerHTML = "";

        const categoryToSection = {
            Character: "character",
            Expression: "outfit",
            Pose: "outfit",
            Outfit: "outfit",
            Scene: "scene",
            Lighting: "style",
            Camera: "style",
            Style: "style"
        };

        // 1. Character Profiles
        Object.keys(PromptEngine.CHARACTER_IDENTIFIERS).forEach((key) => {
            const prof = PromptEngine.CHARACTER_IDENTIFIERS[key];
            if (q && !prof.name.toLowerCase().includes(q) && !prof.character.toLowerCase().includes(q)) {
                return;
            }
            const row = document.createElement("div");
            row.className = "dict-row";
            row.innerHTML = `
                <div class="upgrade-item-header">
                    <span class="upgrade-word-badge" style="color:#34d399;">👤 ${prof.name}</span>
                    <span class="upgrade-cat-badge">Character ID</span>
                </div>
                <div class="upgrade-target-preview">${prof.character}</div>
            `;
            const btnRow = document.createElement("div");
            btnRow.className = "upgrade-actions";

            const loadCharBtn = document.createElement("button");
            loadCharBtn.className = "btn btn-xs btn-emerald";
            loadCharBtn.textContent = "+ Set Character Box";
            loadCharBtn.addEventListener("click", () => {
                boxes.character.value = prof.character;
                syncModularToMaster();
                showToast(`Set Character to ${prof.name}`);
            });

            const loadFullCharBtn = document.createElement("button");
            loadFullCharBtn.className = "btn btn-xs btn-primary";
            loadFullCharBtn.textContent = "+ Load Character + Outfit + Scene";
            loadFullCharBtn.addEventListener("click", () => {
                boxes.character.value = prof.character;
                boxes.outfit.value = prof.outfit;
                boxes.scene.value = prof.scene;
                boxes.style.value = prof.style;
                syncModularToMaster();
                showToast(`Loaded full setup for ${prof.name}`);
            });

            btnRow.appendChild(loadCharBtn);
            btnRow.appendChild(loadFullCharBtn);
            row.appendChild(btnRow);
            dictBrowserGrid.appendChild(row);
        });

        // 2. Weak Word -> High-Signal Tag Rules
        PromptEngine.WORD_UPGRADES.forEach((rule) => {
            if (
                q &&
                !rule.label.toLowerCase().includes(q) &&
                !rule.primary.toLowerCase().includes(q) &&
                !rule.category.toLowerCase().includes(q)
            ) {
                return;
            }
            const targetSection = categoryToSection[rule.category] || "style";
            const row = document.createElement("div");
            row.className = "dict-row";
            row.innerHTML = `
                <div class="upgrade-item-header">
                    <span class="upgrade-word-badge">"${rule.label}"</span>
                    <span class="upgrade-cat-badge">${rule.category} → ${targetSection}</span>
                </div>
                <div class="upgrade-target-preview">${rule.primary}</div>
            `;
            const btnRow = document.createElement("div");
            btnRow.className = "upgrade-actions";

            const addTagBtn = document.createElement("button");
            addTagBtn.className = "btn btn-xs btn-amber";
            addTagBtn.textContent = `+ Add to ${targetSection}`;
            addTagBtn.addEventListener("click", () => {
                appendTokenToBox(targetSection, rule.primary);
            });

            const addChoiceBtn = document.createElement("button");
            addChoiceBtn.className = "btn btn-xs btn-purple";
            addChoiceBtn.textContent = `+ Add {a|b} to ${targetSection}`;
            addChoiceBtn.addEventListener("click", () => {
                appendTokenToBox(targetSection, rule.perchance);
            });

            btnRow.appendChild(addTagBtn);
            btnRow.appendChild(addChoiceBtn);
            row.appendChild(btnRow);
            dictBrowserGrid.appendChild(row);
        });
    }

    // Copy helper with clipboard fallback
    async function copyTextToClipboard(text, label) {
        if (!text || !text.trim()) {
            showToast(`Nothing to copy in ${label}!`);
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            showToast(`✅ Copied ${label} to clipboard!`);
        } catch (err) {
            const temp = document.createElement("textarea");
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
            showToast(`✅ Copied ${label} to clipboard!`);
        }
    }

    // Wire Event Listeners
    // 1. Modular Box Input -> Live Sync to Master
    SECTION_KEYS.forEach((key) => {
        boxes[key].addEventListener("input", () => {
            autoFitTextarea(boxes[key]);
            syncModularToMaster();
        });
    });

    // 2. Master Box Input -> Refresh Upgrade Suggestions & AutoFit
    masterBox.addEventListener("input", () => {
        autoFitTextarea(masterBox);
        refreshUpgradeSuggestions();
    });

    masterFormatSelect.addEventListener("change", () => {
        syncModularToMaster();
    });

    // 3. Full Setup Preset Load / Save / Delete
    fullPresetSelect.addEventListener("change", () => {
        updateDeleteFullPresetVisibility();
        const all = PresetManager.getAllFullPresets();
        const chosen = all.find((p) => p.id === fullPresetSelect.value);
        if (chosen) {
            setSections(chosen.sections, true);
            showToast(`Loaded preset: ${chosen.name}`);
        }
    });

    document.getElementById("btn-load-full-preset").addEventListener("click", () => {
        const all = PresetManager.getAllFullPresets();
        const chosen = all.find((p) => p.id === fullPresetSelect.value);
        if (chosen) {
            setSections(chosen.sections, true);
            showToast(`Loaded preset: ${chosen.name}`);
        }
    });

    document.getElementById("btn-save-full-preset").addEventListener("click", () => {
        const name = window.prompt("Enter a name for this Full Preset (saves Character + Outfit + Scene + Style + Negative):");
        if (!name || !name.trim()) return;
        const created = PresetManager.addCustomFullPreset(name, getCurrentSections());
        renderFullPresetDropdown(created.id);
        showToast(`💾 Saved custom preset: ${created.name}`);
    });

    deleteFullPresetBtn.addEventListener("click", () => {
        const id = fullPresetSelect.value;
        const all = PresetManager.getAllFullPresets();
        const chosen = all.find((p) => p.id === id);
        if (!chosen || chosen.builtin) return;
        if (window.confirm(`Delete custom preset "${chosen.name}"?`)) {
            PresetManager.deleteCustomFullPreset(id);
            renderFullPresetDropdown();
            showToast("Deleted custom preset.");
        }
    });

    // 4. Per-Section Preset Swap / Save / Delete
    ["character", "outfit", "scene", "style"].forEach((sectionKey) => {
        const selectEl = sectionSelects[sectionKey];
        selectEl.addEventListener("change", () => {
            updateSectionDeleteBtn(sectionKey);
            const list = PresetManager.getSectionPresets(sectionKey);
            const chosen = list.find((item) => item.id === selectEl.value);
            if (chosen) {
                boxes[sectionKey].value = chosen.value;
                syncModularToMaster();
                showToast(`Swapped ${sectionKey}: ${chosen.name}`);
            }
        });
    });

    document.querySelectorAll("[data-save-section]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const sectionKey = btn.getAttribute("data-save-section");
            const val = boxes[sectionKey].value.trim();
            if (!val) {
                showToast(`Write something in the ${sectionKey} box first!`);
                return;
            }
            const name = window.prompt(`Save current ${sectionKey.toUpperCase()} box as a reusable preset named:`);
            if (!name || !name.trim()) return;
            const created = PresetManager.addCustomSectionPreset(sectionKey, name, val);
            renderSectionPresetDropdowns();
            sectionSelects[sectionKey].value = created.id;
            updateSectionDeleteBtn(sectionKey);
            showToast(`💾 Saved ${sectionKey} preset: ${created.name}`);
        });
    });

    document.querySelectorAll("[data-delete-section]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const sectionKey = btn.getAttribute("data-delete-section");
            const selectEl = sectionSelects[sectionKey];
            const id = selectEl.value;
            if (!id) return;
            PresetManager.deleteCustomSectionPreset(sectionKey, id);
            renderSectionPresetDropdowns();
            showToast(`Deleted custom ${sectionKey} preset.`);
        });
    });

    // 5. Per-Section Upgrade Words Button
    document.querySelectorAll("[data-upgrade-section]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const sectionKey = btn.getAttribute("data-upgrade-section");
            const res = PromptEngine.upgradeWeakWordsInText(boxes[sectionKey].value, false);
            boxes[sectionKey].value = res.text;
            syncModularToMaster();
            if (res.count > 0) {
                showToast(`✨ Upgraded ${res.count} term(s) in ${sectionKey}!`);
            } else {
                showToast(`No weak terms found in ${sectionKey} box.`);
            }
        });
    });

    // 6. Expand / Collapse Box Height Buttons (Zero Clipping)
    document.querySelectorAll("[data-expand-box]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-expand-box");
            const el = document.getElementById(targetId);
            if (!el) return;
            el.classList.toggle("expanded-box");
            const isExpanded = el.classList.contains("expanded-box");
            btn.textContent = isExpanded ? "🔽 Shrink" : "↕️ Expand";
            autoFitTextarea(el);
        });
    });

    // 7. Master Window Actions
    document.getElementById("btn-copy-master").addEventListener("click", () => {
        copyTextToClipboard(masterBox.value, "Full Prompt");
    });

    document.getElementById("btn-copy-negative").addEventListener("click", () => {
        copyTextToClipboard(boxes.negative.value, "Negative Prompt");
    });

    document.getElementById("btn-upgrade-all").addEventListener("click", () => {
        let total = 0;
        ["character", "outfit", "scene", "style"].forEach((k) => {
            const res = PromptEngine.upgradeWeakWordsInText(boxes[k].value, false);
            boxes[k].value = res.text;
            total += res.count;
        });
        syncModularToMaster();
        if (total > 0) {
            showToast(`✨ Deterministically upgraded ${total} weak word(s) across your prompt!`);
        } else {
            showToast("All words are already high-signal! Check the Lookup panel to add more tags.");
        }
    });

    document.getElementById("btn-upgrade-perchance").addEventListener("click", () => {
        let total = 0;
        ["character", "outfit", "scene", "style"].forEach((k) => {
            const res = PromptEngine.upgradeWeakWordsInText(boxes[k].value, true);
            boxes[k].value = res.text;
            total += res.count;
        });
        syncModularToMaster();
        if (total > 0) {
            showToast(`🎲 Upgraded ${total} term(s) into Perchance {a|b} dynamic choice sets!`);
        } else {
            showToast("No weak words detected to convert into {a|b} sets.");
        }
    });

    document.getElementById("btn-wrap-choice").addEventListener("click", () => {
        const start = masterBox.selectionStart;
        const end = masterBox.selectionEnd;
        const full = masterBox.value;
        if (start === end) {
            showToast("Highlight comma-separated words inside the Full Prompt box first to wrap them in {a|b}!");
            return;
        }
        const selected = full.slice(start, end).trim();
        const parts = selected.split(",").map((s) => s.trim()).filter(Boolean);
        const wrapped = parts.length > 1 ? `{${parts.join("|")}}` : `{${selected}|alternative}`;
        masterBox.value = full.slice(0, start) + wrapped + full.slice(end);
        showToast(`Wrapped selection as Perchance choice: ${wrapped}`);
    });

    function runRollPreview() {
        const template = masterBox.value.trim();
        if (!template) {
            showToast("Prompt is empty!");
            return;
        }
        const rolled = PromptEngine.evaluatePerchanceSyntax(template);
        rollPreviewOutput.textContent = rolled;
        rollPreviewContainer.classList.remove("hidden");
    }

    document.getElementById("btn-roll-preview").addEventListener("click", () => {
        runRollPreview();
        showToast("🎲 Rolled sample output from your Perchance {a|b} choices!");
    });

    document.getElementById("btn-reroll").addEventListener("click", runRollPreview);

    document.getElementById("btn-copy-roll").addEventListener("click", () => {
        copyTextToClipboard(rollPreviewOutput.textContent, "Rolled Sample Prompt");
    });

    document.getElementById("btn-close-roll").addEventListener("click", () => {
        rollPreviewContainer.classList.add("hidden");
    });

    // Split Full Pasted Prompt into Modular Boxes
    document.getElementById("btn-split-to-boxes").addEventListener("click", () => {
        const raw = masterBox.value.trim();
        if (!raw) {
            showToast("Paste or type a prompt in the Full Prompt box first!");
            return;
        }
        const split = PromptEngine.parseFullPromptToSections(raw);
        if (!split.negative && boxes.negative.value) {
            split.negative = boxes.negative.value;
        }
        setSections(split, true);
        showToast("↙️ Split full prompt into Character, Pose/Outfit, Scene, and Style boxes!");
    });

    // Reset Default Negatives
    document.getElementById("btn-reset-negative").addEventListener("click", () => {
        boxes.negative.value = PresetManager.DEFAULT_NEGATIVE;
        syncModularToMaster();
        showToast("Restored default high-signal Negative Prompt tags.");
    });

    // Clear All
    document.getElementById("btn-clear-all").addEventListener("click", () => {
        setSections(
            {
                character: "",
                outfit: "",
                scene: "",
                style: "",
                negative: PresetManager.DEFAULT_NEGATIVE
            },
            true
        );
        showToast("🧹 Cleared all positive prompt sections.");
    });

    // Export / Import Custom Presets JSON
    document.getElementById("btn-export-presets").addEventListener("click", () => {
        const json = PresetManager.exportAllCustomPresetsJSON();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "bychance-presets.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("📤 Exported custom presets as bychance-presets.json");
    });

    const importInput = document.getElementById("import-presets-input");
    document.getElementById("btn-import-presets").addEventListener("click", () => {
        importInput.click();
    });

    importInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                PresetManager.importCustomPresetsJSON(String(reader.result));
                renderFullPresetDropdown();
                renderSectionPresetDropdowns();
                showToast("📥 Imported custom presets!");
            } catch (err) {
                showToast("❌ Invalid preset JSON file.");
            }
        };
        reader.readAsText(file);
        importInput.value = "";
    });

    // Dictionary Search
    dictSearchInput.addEventListener("input", () => {
        renderDictionaryBrowser(dictSearchInput.value);
    });

    // Initialize Workbench
    renderFullPresetDropdown();
    renderSectionPresetDropdowns();
    renderQuickTagChips();
    renderDictionaryBrowser("");

    // Load last saved state or default to Rosalina — Cosmic Observatory so user sees accurate traits immediately
    const lastState = PresetManager.loadLastWorkbenchState();
    if (lastState && (lastState.character || lastState.outfit || lastState.scene || lastState.style)) {
        setSections(lastState, true);
    } else {
        const rosalinaPreset = PresetManager.getAllFullPresets()[0];
        if (rosalinaPreset) {
            fullPresetSelect.value = rosalinaPreset.id;
            setSections(rosalinaPreset.sections, true);
        }
    }
});
