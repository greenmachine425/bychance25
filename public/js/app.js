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
        }, 2400);
    }

    function autoFitTextarea(el) {
        if (!el) return;
        el.style.height = "auto";
        const minH = el.classList.contains("master-textarea") ? 150 : 76;
        el.style.height = Math.max(minH, Math.min(el.scrollHeight + 4, 420)) + "px";
    }

    function autoFitAllTextareas() {
        SECTION_KEYS.forEach((k) => autoFitTextarea(boxes[k]));
        autoFitTextarea(masterBox);
    }

    function getCurrentSections() {
        return {
            character: boxes.character.value,
            outfit: boxes.outfit.value,
            scene: boxes.scene.value,
            style: boxes.style.value,
            negative: boxes.negative.value
        };
    }

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

    function syncModularToMaster() {
        const current = getCurrentSections();
        const format = masterFormatSelect.value || "standard";
        masterBox.value = PromptEngine.assembleFullPrompt(current, format);
        PresetManager.saveLastWorkbenchState(current);
        refreshUpgradeSuggestions();
        autoFitAllTextareas();
    }

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

    function renderSectionPresetDropdowns() {
        ["character", "outfit", "scene", "style"].forEach((sectionKey) => {
            const selectEl = sectionSelects[sectionKey];
            if (!selectEl) return;
            const list = PresetManager.getSectionPresets(sectionKey);
            selectEl.innerHTML = "";

            const placeholder = document.createElement("option");
            placeholder.value = "";
            const labelMap = {
                character: "Select Character Preset...",
                outfit: "Select Pose / Outfit Preset...",
                scene: "Select Scene Preset...",
                style: "Select Style Preset..."
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
        showToast(`Added to ${sectionKey}`);
    }

    function refreshUpgradeSuggestions() {
        const combinedText = [
            boxes.character.value,
            boxes.outfit.value,
            boxes.scene.value,
            boxes.style.value,
            masterBox.value
        ].join(", ");

        const suggestions = PromptEngine.scanForUpgrades(combinedText);
        upgradeCountBadge.textContent = `${suggestions.length}`;
        upgradeSuggestionsList.innerHTML = "";

        if (suggestions.length === 0) {
            const empty = document.createElement("div");
            empty.className = "card-hint";
            empty.style.padding = "4px 0";
            empty.textContent = "No weak words detected. Type terms like 'Rosalina', 'shiny', 'standing', 'sad', 'nice lighting', 'camera below', or 'good quality' to see deterministic tag replacements.";
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
            wordBadge.textContent = item.type === "character" ? item.label : `Term: ${item.label}`;

            const catBadge = document.createElement("span");
            catBadge.className = "upgrade-cat-badge";
            catBadge.textContent = item.category;

            header.appendChild(wordBadge);
            header.appendChild(catBadge);

            const preview = document.createElement("div");
            preview.className = "upgrade-target-preview";
            preview.textContent = item.primary;

            const actions = document.createElement("div");
            actions.className = "upgrade-actions";

            if (item.type === "character" && item.characterProfile) {
                const fillAllBtn = document.createElement("button");
                fillAllBtn.className = "btn btn-sm btn-primary";
                fillAllBtn.textContent = "Populate All Sections";
                fillAllBtn.addEventListener("click", () => {
                    const prof = item.characterProfile;
                    boxes.character.value = prof.character;
                    if (!boxes.outfit.value.trim()) boxes.outfit.value = prof.outfit;
                    if (!boxes.scene.value.trim()) boxes.scene.value = prof.scene;
                    if (!boxes.style.value.trim()) boxes.style.value = prof.style;
                    syncModularToMaster();
                    showToast(`Loaded visual traits for ${prof.name}`);
                });

                const charOnlyBtn = document.createElement("button");
                charOnlyBtn.className = "btn btn-sm";
                charOnlyBtn.textContent = "Expand Character Only";
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
                    showToast(`Expanded character traits for ${prof.name}`);
                });

                actions.appendChild(fillAllBtn);
                actions.appendChild(charOnlyBtn);
            } else {
                const applyPrimaryBtn = document.createElement("button");
                applyPrimaryBtn.className = "btn btn-sm btn-primary";
                applyPrimaryBtn.textContent = "Replace with Tags";
                applyPrimaryBtn.addEventListener("click", () => {
                    replaceRegexAcrossBoxes(item.regex, item.primary);
                    showToast(`Upgraded ${item.label}`);
                });

                const applyPerchanceBtn = document.createElement("button");
                applyPerchanceBtn.className = "btn btn-sm";
                applyPerchanceBtn.textContent = "Replace as {a|b}";
                applyPerchanceBtn.addEventListener("click", () => {
                    replaceRegexAcrossBoxes(item.regex, item.perchance);
                    showToast(`Upgraded ${item.label} to {a|b}`);
                });

                actions.appendChild(applyPrimaryBtn);
                actions.appendChild(applyPerchanceBtn);

                (item.alternatives || []).forEach((alt, idx) => {
                    const altBtn = document.createElement("button");
                    altBtn.className = "btn btn-sm";
                    altBtn.textContent = `Option ${idx + 2}`;
                    altBtn.title = alt;
                    altBtn.addEventListener("click", () => {
                        replaceRegexAcrossBoxes(item.regex, alt);
                        showToast(`Replaced ${item.label}`);
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

    async function copyTextToClipboard(text, label) {
        if (!text || !text.trim()) {
            showToast(`Nothing to copy in ${label}`);
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            showToast(`Copied ${label}`);
        } catch (err) {
            const temp = document.createElement("textarea");
            temp.value = text;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
            showToast(`Copied ${label}`);
        }
    }

    SECTION_KEYS.forEach((key) => {
        boxes[key].addEventListener("input", () => {
            autoFitTextarea(boxes[key]);
            syncModularToMaster();
        });
    });

    masterBox.addEventListener("input", () => {
        autoFitTextarea(masterBox);
        refreshUpgradeSuggestions();
    });

    masterFormatSelect.addEventListener("change", () => {
        syncModularToMaster();
    });

    fullPresetSelect.addEventListener("change", () => {
        updateDeleteFullPresetVisibility();
        const all = PresetManager.getAllFullPresets();
        const chosen = all.find((p) => p.id === fullPresetSelect.value);
        if (chosen) {
            setSections(chosen.sections, true);
            showToast(`Loaded ${chosen.name}`);
        }
    });

    document.getElementById("btn-load-full-preset").addEventListener("click", () => {
        const all = PresetManager.getAllFullPresets();
        const chosen = all.find((p) => p.id === fullPresetSelect.value);
        if (chosen) {
            setSections(chosen.sections, true);
            showToast(`Loaded ${chosen.name}`);
        }
    });

    document.getElementById("btn-save-full-preset").addEventListener("click", () => {
        const name = window.prompt("Preset name (saves Character, Pose/Outfit, Scene, Style, and Negative):");
        if (!name || !name.trim()) return;
        const created = PresetManager.addCustomFullPreset(name, getCurrentSections());
        renderFullPresetDropdown(created.id);
        showToast(`Saved preset: ${created.name}`);
    });

    deleteFullPresetBtn.addEventListener("click", () => {
        const id = fullPresetSelect.value;
        const all = PresetManager.getAllFullPresets();
        const chosen = all.find((p) => p.id === id);
        if (!chosen || chosen.builtin) return;
        if (window.confirm(`Delete custom preset "${chosen.name}"?`)) {
            PresetManager.deleteCustomFullPreset(id);
            renderFullPresetDropdown();
            showToast("Deleted custom preset");
        }
    });

    ["character", "outfit", "scene", "style"].forEach((sectionKey) => {
        const selectEl = sectionSelects[sectionKey];
        selectEl.addEventListener("change", () => {
            updateSectionDeleteBtn(sectionKey);
            const list = PresetManager.getSectionPresets(sectionKey);
            const chosen = list.find((item) => item.id === selectEl.value);
            if (chosen) {
                boxes[sectionKey].value = chosen.value;
                syncModularToMaster();
                showToast(`Updated ${sectionKey}: ${chosen.name}`);
            }
        });
    });

    document.querySelectorAll("[data-save-section]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const sectionKey = btn.getAttribute("data-save-section");
            const val = boxes[sectionKey].value.trim();
            if (!val) {
                showToast(`Enter text in ${sectionKey} first`);
                return;
            }
            const name = window.prompt(`Save current ${sectionKey} preset as:`);
            if (!name || !name.trim()) return;
            const created = PresetManager.addCustomSectionPreset(sectionKey, name, val);
            renderSectionPresetDropdowns();
            sectionSelects[sectionKey].value = created.id;
            updateSectionDeleteBtn(sectionKey);
            showToast(`Saved ${sectionKey} preset: ${created.name}`);
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
            showToast(`Deleted custom ${sectionKey} preset`);
        });
    });

    document.querySelectorAll("[data-upgrade-section]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const sectionKey = btn.getAttribute("data-upgrade-section");
            const res = PromptEngine.upgradeWeakWordsInText(boxes[sectionKey].value, false);
            boxes[sectionKey].value = res.text;
            syncModularToMaster();
            if (res.count > 0) {
                showToast(`Upgraded ${res.count} term(s) in ${sectionKey}`);
            } else {
                showToast(`No weak terms found in ${sectionKey}`);
            }
        });
    });

    document.querySelectorAll("[data-expand-box]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-expand-box");
            const el = document.getElementById(targetId);
            if (!el) return;
            el.classList.toggle("expanded-box");
            const isExpanded = el.classList.contains("expanded-box");
            btn.textContent = isExpanded ? "Collapse" : "Expand";
            autoFitTextarea(el);
        });
    });

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
            showToast(`Upgraded ${total} weak word(s)`);
        } else {
            showToast("No weak words detected");
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
            showToast(`Upgraded ${total} term(s) to {a|b} choices`);
        } else {
            showToast("No weak words detected");
        }
    });

    document.getElementById("btn-wrap-choice").addEventListener("click", () => {
        const start = masterBox.selectionStart;
        const end = masterBox.selectionEnd;
        const full = masterBox.value;
        if (start === end) {
            showToast("Select text inside Full Prompt first");
            return;
        }
        const selected = full.slice(start, end).trim();
        const parts = selected.split(",").map((s) => s.trim()).filter(Boolean);
        const wrapped = parts.length > 1 ? `{${parts.join("|")}}` : `{${selected}|variant}`;
        masterBox.value = full.slice(0, start) + wrapped + full.slice(end);
        showToast(`Wrapped selection: ${wrapped}`);
    });

    function runRollPreview() {
        const template = masterBox.value.trim();
        if (!template) {
            showToast("Prompt is empty");
            return;
        }
        const rolled = PromptEngine.evaluatePerchanceSyntax(template);
        rollPreviewOutput.textContent = rolled;
        rollPreviewContainer.classList.remove("hidden");
    }

    document.getElementById("btn-roll-preview").addEventListener("click", () => {
        runRollPreview();
        showToast("Rolled sample prompt");
    });

    document.getElementById("btn-reroll").addEventListener("click", runRollPreview);

    document.getElementById("btn-copy-roll").addEventListener("click", () => {
        copyTextToClipboard(rollPreviewOutput.textContent, "Sample Roll");
    });

    document.getElementById("btn-close-roll").addEventListener("click", () => {
        rollPreviewContainer.classList.add("hidden");
    });

    document.getElementById("btn-split-to-boxes").addEventListener("click", () => {
        const raw = masterBox.value.trim();
        if (!raw) {
            showToast("Paste or enter a prompt in Full Prompt first");
            return;
        }
        const split = PromptEngine.parseFullPromptToSections(raw);
        if (!split.negative && boxes.negative.value) {
            split.negative = boxes.negative.value;
        }
        setSections(split, true);
        showToast("Split full prompt into modular sections");
    });

    document.getElementById("btn-reset-negative").addEventListener("click", () => {
        boxes.negative.value = PresetManager.DEFAULT_NEGATIVE;
        syncModularToMaster();
        showToast("Restored default negative prompt");
    });

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
        showToast("Cleared all sections");
    });

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
        showToast("Exported bychance-presets.json");
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
                showToast("Imported custom presets");
            } catch (err) {
                showToast("Invalid preset JSON file");
            }
        };
        reader.readAsText(file);
        importInput.value = "";
    });

    // Initialize
    renderFullPresetDropdown();
    renderSectionPresetDropdowns();
    renderQuickTagChips();

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
