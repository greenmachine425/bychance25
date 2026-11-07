/**
 * Bychance Controller — Minimalist Prompt Optimiser & Section Splitter
 * Flip-flops seamlessly between the single-box Prompt Optimiser and the 6-part Section Splitter.
 */

document.addEventListener("DOMContentLoaded", () => {
    const SECTION_KEYS = ["character", "outfit", "pose", "scene", "style", "negative"];
    const PRESET_SECTION_KEYS = ["character", "outfit", "pose", "scene", "style"];

    const tabOptimiser = document.getElementById("tab-optimiser");
    const tabSplitter = document.getElementById("tab-splitter");
    const viewOptimiser = document.getElementById("view-optimiser");
    const viewSplitter = document.getElementById("view-splitter");

    const boxes = {
        character: document.getElementById("box-character"),
        outfit: document.getElementById("box-outfit"),
        pose: document.getElementById("box-pose"),
        scene: document.getElementById("box-scene"),
        style: document.getElementById("box-style"),
        negative: document.getElementById("box-negative")
    };

    const masterBox = document.getElementById("box-master");
    const negativeOptBox = document.getElementById("box-negative-opt");
    const masterFormatSelect = document.getElementById("master-format-select");
    const fullPresetSelect = document.getElementById("full-preset-select");
    const deleteFullPresetBtn = document.getElementById("btn-delete-full-preset");

    const sectionSelects = {
        character: document.getElementById("preset-select-character"),
        outfit: document.getElementById("preset-select-outfit"),
        pose: document.getElementById("preset-select-pose"),
        scene: document.getElementById("preset-select-scene"),
        style: document.getElementById("preset-select-style")
    };

    let toastTimer = null;
    let masterDirty = false;

    function showToast(msg) {
        const banner = document.getElementById("toast-banner");
        if (!banner) return;
        banner.textContent = msg;
        banner.classList.add("visible");
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            banner.classList.remove("visible");
        }, 2200);
    }

    function getCurrentSections() {
        return {
            character: boxes.character.value,
            outfit: boxes.outfit.value,
            pose: boxes.pose.value,
            scene: boxes.scene.value,
            style: boxes.style.value,
            negative: boxes.negative.value
        };
    }

    function setSections(sections, syncMaster = true) {
        // Backward compatibility if a saved preset had no separate pose field
        if (sections && !sections.pose && sections.outfit) {
            const parsed = PromptEngine.parseFullPromptToSections(sections.outfit);
            if (parsed.pose && parsed.outfit) {
                sections = {
                    ...sections,
                    outfit: parsed.outfit,
                    pose: parsed.pose
                };
            }
        }

        SECTION_KEYS.forEach((k) => {
            if (typeof sections[k] === "string") {
                boxes[k].value = sections[k];
            }
        });
        negativeOptBox.value = boxes.negative.value;

        if (syncMaster) {
            syncSectionsToMaster();
        } else {
            PresetManager.saveLastWorkbenchState(getCurrentSections());
        }
    }

    function syncSectionsToMaster() {
        const current = getCurrentSections();
        negativeOptBox.value = current.negative;
        const format = masterFormatSelect.value || "standard";
        masterBox.value = PromptEngine.assembleFullPrompt(current, format);
        masterDirty = false;
        PresetManager.saveLastWorkbenchState(current);
    }

    function syncMasterToSectionsIfEdited() {
        const raw = masterBox.value.trim();
        if (!raw) {
            setSections(
                {
                    character: "",
                    outfit: "",
                    pose: "",
                    scene: "",
                    style: "",
                    negative: negativeOptBox.value
                },
                false
            );
            masterDirty = false;
            return;
        }
        const currentAssembled = PromptEngine.assembleFullPrompt(
            getCurrentSections(),
            masterFormatSelect.value || "standard"
        ).trim();

        if (masterDirty || raw !== currentAssembled) {
            const split = PromptEngine.parseFullPromptToSections(raw);
            if (!split.negative) {
                split.negative = negativeOptBox.value || boxes.negative.value;
            }
            setSections(split, false);
            masterDirty = false;
        }
    }

    // Mode Switching (Flip-Flop between Optimiser and Splitter)
    function switchMode(mode) {
        if (mode === "splitter") {
            syncMasterToSectionsIfEdited();
            tabOptimiser.classList.remove("active");
            tabOptimiser.setAttribute("aria-selected", "false");
            tabSplitter.classList.add("active");
            tabSplitter.setAttribute("aria-selected", "true");
            viewOptimiser.classList.add("hidden");
            viewSplitter.classList.remove("hidden");
        } else {
            syncSectionsToMaster();
            tabSplitter.classList.remove("active");
            tabSplitter.setAttribute("aria-selected", "false");
            tabOptimiser.classList.add("active");
            tabOptimiser.setAttribute("aria-selected", "true");
            viewSplitter.classList.add("hidden");
            viewOptimiser.classList.remove("hidden");
        }
    }

    tabOptimiser.addEventListener("click", () => switchMode("optimiser"));
    tabSplitter.addEventListener("click", () => switchMode("splitter"));

    document.getElementById("btn-go-split").addEventListener("click", () => {
        syncMasterToSectionsIfEdited();
        switchMode("splitter");
        showToast("Split prompt into sections");
    });

    document.getElementById("btn-go-optimiser").addEventListener("click", () => {
        switchMode("optimiser");
        showToast("Combined sections into Prompt Optimiser");
    });

    // Core Fix / Improve Action
    function runFixPrompt(usePerchance = false) {
        const isSplitterActive = !viewSplitter.classList.contains("hidden");
        let source;
        if (!isSplitterActive) {
            const raw = masterBox.value.trim();
            const currentAssembled = PromptEngine.assembleFullPrompt(
                getCurrentSections(),
                masterFormatSelect.value || "standard"
            ).trim();
            source = (masterDirty || raw !== currentAssembled) ? raw : getCurrentSections();
        } else {
            source = getCurrentSections();
        }

        const res = PromptEngine.improvePrompt(source, {
            usePerchance,
            defaultNegative: PresetManager.DEFAULT_NEGATIVE
        });

        setSections(res.sections, true);
        if (res.count > 0) {
            const detail = res.notes && res.notes.length
                ? res.notes.slice(0, 2).join(", ")
                : `+${res.count} improvements`;
            showToast(`Fixed prompt (${detail})`);
        } else {
            showToast("Prompt is already optimized");
        }
    }

    document.getElementById("btn-fix-prompt").addEventListener("click", () => {
        runFixPrompt(false);
    });

    document.getElementById("btn-fix-perchance").addEventListener("click", () => {
        runFixPrompt(true);
    });

    document.getElementById("btn-fix-all-sections").addEventListener("click", () => {
        runFixPrompt(false);
    });

    masterBox.addEventListener("input", () => {
        masterDirty = true;
    });

    masterBox.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            runFixPrompt(false);
        }
    });

    negativeOptBox.addEventListener("input", () => {
        boxes.negative.value = negativeOptBox.value;
        PresetManager.saveLastWorkbenchState(getCurrentSections());
        if (masterFormatSelect.value !== "standard") {
            syncSectionsToMaster();
        }
    });

    SECTION_KEYS.forEach((key) => {
        boxes[key].addEventListener("input", () => {
            if (key === "negative") {
                negativeOptBox.value = boxes.negative.value;
            }
            syncSectionsToMaster();
        });
    });

    masterFormatSelect.addEventListener("change", () => {
        syncSectionsToMaster();
    });

    // Individual Section Fix Buttons
    document.querySelectorAll("[data-upgrade-section]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const sectionKey = btn.getAttribute("data-upgrade-section");
            const res = PromptEngine.improveSingleSection(sectionKey, boxes[sectionKey].value, false);
            boxes[sectionKey].value = res.text;
            syncSectionsToMaster();
            if (res.count > 0) {
                showToast(`Fixed ${sectionKey}`);
            } else {
                showToast(`${sectionKey} is already optimized`);
            }
        });
    });

    // Presets Management
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
        const labelMap = {
            character: "Character Presets...",
            outfit: "Outfit Presets...",
            pose: "Pose Presets...",
            scene: "Scene Presets...",
            style: "Style Presets..."
        };

        PRESET_SECTION_KEYS.forEach((sectionKey) => {
            const selectEl = sectionSelects[sectionKey];
            if (!selectEl) return;
            const list = PresetManager.getSectionPresets(sectionKey);
            selectEl.innerHTML = "";

            const placeholder = document.createElement("option");
            placeholder.value = "";
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

    fullPresetSelect.addEventListener("change", () => {
        updateDeleteFullPresetVisibility();
        const all = PresetManager.getAllFullPresets();
        const chosen = all.find((p) => p.id === fullPresetSelect.value);
        if (chosen) {
            setSections(chosen.sections, true);
            showToast(`Loaded ${chosen.name}`);
        }
    });

    document.getElementById("btn-save-full-preset").addEventListener("click", () => {
        syncMasterToSectionsIfEdited();
        const name = window.prompt("Preset name:");
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

    PRESET_SECTION_KEYS.forEach((sectionKey) => {
        const selectEl = sectionSelects[sectionKey];
        if (!selectEl) return;
        selectEl.addEventListener("change", () => {
            updateSectionDeleteBtn(sectionKey);
            const list = PresetManager.getSectionPresets(sectionKey);
            const chosen = list.find((item) => item.id === selectEl.value);
            if (chosen) {
                boxes[sectionKey].value = chosen.value;
                syncSectionsToMaster();
                showToast(`Loaded ${sectionKey}: ${chosen.name}`);
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
            const name = window.prompt(`Save ${sectionKey} preset as:`);
            if (!name || !name.trim()) return;
            const created = PresetManager.addCustomSectionPreset(sectionKey, name, val);
            renderSectionPresetDropdowns();
            sectionSelects[sectionKey].value = created.id;
            updateSectionDeleteBtn(sectionKey);
            showToast(`Saved ${sectionKey} preset`);
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

    // Clipboard & Reset Controls
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

    document.getElementById("btn-copy-master").addEventListener("click", () => {
        copyTextToClipboard(masterBox.value, "Prompt");
    });

    document.getElementById("btn-copy-combined").addEventListener("click", () => {
        syncSectionsToMaster();
        copyTextToClipboard(masterBox.value, "Combined Prompt");
    });

    document.getElementById("btn-copy-negative").addEventListener("click", () => {
        copyTextToClipboard(boxes.negative.value, "Negative Prompt");
    });

    document.getElementById("btn-copy-negative-opt").addEventListener("click", () => {
        copyTextToClipboard(negativeOptBox.value, "Negative Prompt");
    });

    function resetNegativeToDefault() {
        boxes.negative.value = PresetManager.DEFAULT_NEGATIVE;
        negativeOptBox.value = PresetManager.DEFAULT_NEGATIVE;
        syncSectionsToMaster();
        showToast("Restored default negative prompt");
    }

    document.getElementById("btn-reset-negative").addEventListener("click", resetNegativeToDefault);
    document.getElementById("btn-reset-negative-opt").addEventListener("click", resetNegativeToDefault);

    document.getElementById("btn-clear-all").addEventListener("click", () => {
        setSections(
            {
                character: "",
                outfit: "",
                pose: "",
                scene: "",
                style: "",
                negative: PresetManager.DEFAULT_NEGATIVE
            },
            true
        );
        showToast("Cleared prompt");
    });

    // Initialize
    renderFullPresetDropdown();
    renderSectionPresetDropdowns();

    const lastState = PresetManager.loadLastWorkbenchState();
    if (lastState && (lastState.character || lastState.outfit || lastState.pose || lastState.scene || lastState.style)) {
        setSections(lastState, true);
    } else {
        const defaultPreset = PresetManager.getAllFullPresets()[0];
        if (defaultPreset) {
            fullPresetSelect.value = defaultPreset.id;
            setSections(defaultPreset.sections, true);
        }
    }
});
