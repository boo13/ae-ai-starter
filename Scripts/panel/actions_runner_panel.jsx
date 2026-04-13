/**
 * actions_runner_panel.jsx
 *
 * Loads the action catalog from Scripts/lib/actions/index.json and provides
 * a UI for running any action with adjustable inputs. Use this for testing
 * actions and exploring the catalog — it stays current as new actions are added.
 *
 * Run via: File > Scripts > Run Script File... or docked as a ScriptUI panel.
 *
 * Adding a new action to the runner:
 *   1. #include the action file below (in dependency order)
 *   2. Add one line to FUNCTIONS: "functionName": functionName
 *   3. Add "runnerMeta" to the action's index.json entry (or run build_actions_index.jsx
 *      — it preserves existing runnerMeta and you can add it manually via the catalog)
 *   That's it. The panel auto-builds the UI and run handler from runnerMeta.
 */

// ---- Shared libraries ----
#include "../lib/helpers.jsxinc"
#include "../lib/io.jsxinc"
#include "../lib/prop-walker.jsxinc"
#include "../lib/result-writer.jsxinc"

// ---- Actions (include in dependency order) ----
#include "../lib/actions/comp/create_comp.jsxinc"
#include "../lib/actions/comp/add_3d_break.jsxinc"
#include "../lib/actions/comp/center_composition.jsxinc"
#include "../lib/actions/comp/guide_preset.jsxinc"
#include "../lib/actions/comp/pre_compose.jsxinc"
#include "../lib/actions/comp/enable_collapse_transformations.jsxinc"
#include "../lib/actions/comp/increment_composition_versions.jsxinc"
#include "../lib/actions/comp/reset_composition_work_area.jsxinc"
#include "../lib/actions/comp/set_work_area_to_markers.jsxinc"
#include "../lib/actions/comp/toggle_onion_skinning.jsxinc"
#include "../lib/actions/comp/toggle_preserve_nested_frame_rate.jsxinc"
#include "../lib/actions/comp/toggle_timecode_and_start_frames.jsxinc"
#include "../lib/actions/comp/transfer_composition_work_area.jsxinc"
#include "../lib/actions/utility/data_timing.jsxinc"
#include "../lib/actions/utility/add_selection_to_new_folder.jsxinc"
#include "../lib/actions/utility/calculate_distance_between_layers.jsxinc"
#include "../lib/actions/utility/find_all_expressions.jsxinc"
#include "../lib/actions/utility/find_specific_effect.jsxinc"
#include "../lib/actions/utility/project_folder.jsxinc"
#include "../lib/actions/utility/reset_layer_names.jsxinc"
#include "../lib/actions/marker/beat_markers.jsxinc"
#include "../lib/actions/marker/add_markers_at_out_points.jsxinc"
#include "../lib/actions/marker/add_markers_at_selected_keyframes.jsxinc"
#include "../lib/actions/marker/add_markers_to_selected_layers.jsxinc"
#include "../lib/actions/marker/add_markers_at_work_area.jsxinc"
#include "../lib/actions/marker/copy_composition_markers_to_layer.jsxinc"
#include "../lib/actions/marker/copy_layer_markers_to_composition.jsxinc"
#include "../lib/actions/render/queue_comp.jsxinc"
#include "../lib/actions/render/add_labeled_items_to_render_queue.jsxinc"
#include "../lib/actions/render/add_selected_compositions_to_render_queue.jsxinc"
#include "../lib/actions/render/clean_render_queue.jsxinc"
#include "../lib/actions/layer/solid.jsxinc"
#include "../lib/actions/layer/null_object.jsxinc"
#include "../lib/actions/layer/text_layer.jsxinc"
#include "../lib/actions/layer/shape_layer.jsxinc"
#include "../lib/actions/layer/light.jsxinc"
#include "../lib/actions/layer/camera.jsxinc"
#include "../lib/actions/layer/image_swap.jsxinc"
#include "../lib/actions/layer/set_parent.jsxinc"
#include "../lib/actions/layer/layer_from_item.jsxinc"
#include "../lib/actions/layer/mask.jsxinc"
#include "../lib/actions/layer/randomize_layer_start_time.jsxinc"
#include "../lib/actions/layer/set_track_matte_to_above.jsxinc"
#include "../lib/actions/layer/set_to_average_position.jsxinc"
#include "../lib/actions/layer/parent_selected_layers_to_layers_below.jsxinc"
#include "../lib/actions/layer/select_text_layers.jsxinc"
#include "../lib/actions/layer/add_visibility_controller.jsxinc"
#include "../lib/actions/layer/prepare_layer_out_points_for_lottie.jsxinc"
#include "../lib/actions/layer/toggle_specific_effects.jsxinc"
#include "../lib/actions/layer/hard_solo_layers.jsxinc"
#include "../lib/actions/layer/lock_all_layers.jsxinc"
#include "../lib/actions/layer/connect_two_layers_with_a_line.jsxinc"
#include "../lib/actions/layer/parent_opacity.jsxinc"
#include "../lib/actions/layer/rename_selected_layers_with_numbers.jsxinc"
#include "../lib/actions/layer/select_all_children.jsxinc"
#include "../lib/actions/layer/select_disabled_layers.jsxinc"
#include "../lib/actions/layer/select_guide_layers.jsxinc"
#include "../lib/actions/layer/select_non_null_layers.jsxinc"
#include "../lib/actions/layer/select_parent_layer.jsxinc"
#include "../lib/actions/layer/select_random_layers.jsxinc"
#include "../lib/actions/layer/select_shape_layers.jsxinc"
#include "../lib/actions/layer/select_unparented_layers.jsxinc"
#include "../lib/actions/layer/shift_layer_start_time.jsxinc"
#include "../lib/actions/layer/unlock_all_layers.jsxinc"
#include "../lib/actions/layer/zero_position.jsxinc"
#include "../lib/actions/property/set_keyframes.jsxinc"
#include "../lib/actions/property/set_expression.jsxinc"
#include "../lib/actions/property/expression_control.jsxinc"
#include "../lib/actions/property/invert_selected_keyframes.jsxinc"
#include "../lib/actions/property/remove_redundant_keyframes.jsxinc"
#include "../lib/actions/property/make_hold_keyframes.jsxinc"
#include "../lib/actions/property/add_simple_loop_expression.jsxinc"
#include "../lib/actions/property/add_additional_animation_control.jsxinc"
#include "../lib/actions/property/fill_in_keyframes.jsxinc"
#include "../lib/actions/property/build_dropdown_selector.jsxinc"
#include "../lib/actions/property/set_simple_time_remap_loop.jsxinc"
#include "../lib/actions/property/add_posterize_time_expression.jsxinc"
#include "../lib/actions/property/append_to_expression.jsxinc"
#include "../lib/actions/property/apply_maintain_stroke_width_expression.jsxinc"
#include "../lib/actions/property/disable_selected_expressions.jsxinc"
#include "../lib/actions/property/enable_selected_expressions.jsxinc"
#include "../lib/actions/property/flip_path.jsxinc"
#include "../lib/actions/property/keyframe_group_opacities.jsxinc"
#include "../lib/actions/property/keyframe_current_value_from_expression.jsxinc"
#include "../lib/actions/property/multiply_selected_keyframes.jsxinc"
#include "../lib/actions/property/round_selected_keyframe_values.jsxinc"
#include "../lib/actions/property/round_selected_property_values.jsxinc"
#include "../lib/actions/property/swap_property_values.jsxinc"
#include "../lib/actions/property/swap_selected_property_dimensions.jsxinc"
#include "../lib/actions/property/toggle_maintain_scale_expression.jsxinc"
#include "../lib/actions/property/update_stroke_weight_expressions.jsxinc"
#include "../lib/actions/effects/gate_weave.jsxinc"
#include "../lib/actions/effects/grain.jsxinc"
#include "../lib/actions/effects/flicker.jsxinc"
#include "../lib/actions/effects/color_grade.jsxinc"
#include "../lib/actions/effects/star_trim_animation.jsxinc"
#include "../lib/actions/effects/apply_effect.jsxinc"
#include "../lib/actions/effects/add_posterize_time_adjustment_layer.jsxinc"
#include "../lib/actions/effects/enable_motion_blur.jsxinc"
#include "../lib/actions/scene/backdrop.jsxinc"
#include "../lib/actions/scene/camera_rig.jsxinc"
#include "../lib/actions/scene/title_stack.jsxinc"
#include "../lib/actions/presets/demo_scene.jsxinc"
#include "../lib/actions/presets/film_damage_treatment.jsxinc"
#include "../lib/actions/presets/text_animator.jsxinc"
#include "../lib/actions/presets/expression_rig.jsxinc"
#include "../lib/actions/presets/motion_graphic_scene.jsxinc"
#include "../lib/actions/presets/glitch_intro.jsxinc"

(function (thisObj) {

    var _ar_scriptFile = new File($.fileName);

    // ----------------------------------------------------------------
    // FUNCTIONS registry — add one line here when #including a new action.
    // The key must match the "function" field in index.json.
    // ----------------------------------------------------------------
    var FUNCTIONS = {
        "addBackdrop":             addBackdrop,
        "add3DBreak":              add3DBreak,
        "addAdditionalAnimationControl": addAdditionalAnimationControl,
        "addLabeledItemsToRenderQueue": addLabeledItemsToRenderQueue,
        "addMarkersAtOutPoints":   addMarkersAtOutPoints,
        "addMarkersAtSelectedKeyframes": addMarkersAtSelectedKeyframes,
        "addMarkersAtWorkArea":    addMarkersAtWorkArea,
        "addPosterizeTimeAdjustmentLayer": addPosterizeTimeAdjustmentLayer,
        "addMarkersToSelectedLayers": addMarkersToSelectedLayers,
        "addPosterizeTimeExpression": addPosterizeTimeExpression,
        "addSelectedCompositionsToRenderQueue": addSelectedCompositionsToRenderQueue,
        "addSelectionToNewFolder": addSelectionToNewFolder,
        "addBeatMarkers":          addBeatMarkers,
        "addCamera":               addCamera,
        "addCameraRig":            addCameraRig,
        "calculateDistanceBetweenLayers": calculateDistanceBetweenLayers,
        "centerComposition":       centerComposition,
        "cleanRenderQueue":        cleanRenderQueue,
        "connectTwoLayersWithALine": connectTwoLayersWithALine,
        "addColorGrade":           addColorGrade,
        "appendToExpression":      appendToExpression,
        "applyMaintainStrokeWidthExpression": applyMaintainStrokeWidthExpression,
        "addExpressionControl":    addExpressionControl,
        "addExpressionRig":        addExpressionRig,
        "addFilmDamageTreatment":  addFilmDamageTreatment,
        "addGlitchIntro":          addGlitchIntro,
        "addLayerFromItem":        addLayerFromItem,
        "addFlicker":              addFlicker,
        "addGateWeave":            addGateWeave,
        "addGrain":                addGrain,
        "addGuidePreset":          addGuidePreset,
        "addLight":                addLight,
        "addMask":                 addMask,
        "addNull":                 addNull,
        "addSimpleLoopExpression": addSimpleLoopExpression,
        "addShapeLayer":           addShapeLayer,
        "addSolid":                addSolid,
        "addStarTrimAnimation":    addStarTrimAnimation,
        "addTextAnimator":         addTextAnimator,
        "addTextLayer":            addTextLayer,
        "addTitleStack":           addTitleStack,
        "addVisibilityController": addVisibilityController,
        "applyEffect":             applyEffect,
        "buildDropdownSelector":   buildDropdownSelector,
        "buildDemoScene":          buildDemoScene,
        "buildMotionGraphicScene": buildMotionGraphicScene,
        "copyCompositionMarkersToLayer": copyCompositionMarkersToLayer,
        "copyLayerMarkersToComposition": copyLayerMarkersToComposition,
        "createCompFromValues":    createCompFromValues,
        "disableSelectedExpressions": disableSelectedExpressions,
        "enableMotionBlur":        enableMotionBlur,
        "enableCollapseTransformations": enableCollapseTransformations,
        "enableSelectedExpressions": enableSelectedExpressions,
        "ensureProjectFolder":     ensureProjectFolder,
        "fillInKeyframes":         fillInKeyframes,
        "findAllExpressions":      findAllExpressions,
        "findSpecificEffect":      findSpecificEffect,
        "flipPath":                flipPath,
        "hardSoloLayers":          hardSoloLayers,
        "incrementCompositionVersions": incrementCompositionVersions,
        "invertSelectedKeyframes": invertSelectedKeyframes,
        "keyframeGroupOpacities":  keyframeGroupOpacities,
        "keyframeCurrentValueFromExpression": keyframeCurrentValueFromExpression,
        "lockAllLayers":           lockAllLayers,
        "makeHoldKeyframes":       makeHoldKeyframes,
        "multiplySelectedKeyframes": multiplySelectedKeyframes,
        "parentSelectedLayersToLayersBelow": parentSelectedLayersToLayersBelow,
        "parentOpacity":           parentOpacity,
        "preCompose":              preCompose,
        "prepareLayerOutPointsForLottie": prepareLayerOutPointsForLottie,
        "queueComp":               queueComp,
        "randomizeLayerStartTime": randomizeLayerStartTime,
        "renameSelectedLayersWithNumbers": renameSelectedLayersWithNumbers,
        "removeRedundantKeyframes": removeRedundantKeyframes,
        "resetCompositionWorkArea": resetCompositionWorkArea,
        "resetLayerNames":         resetLayerNames,
        "roundSelectedKeyframeValues": roundSelectedKeyframeValues,
        "roundSelectedPropertyValues": roundSelectedPropertyValues,
        "selectAllChildren":       selectAllChildren,
        "selectDisabledLayers":    selectDisabledLayers,
        "selectGuideLayers":       selectGuideLayers,
        "selectNonNullLayers":     selectNonNullLayers,
        "selectParentLayer":       selectParentLayer,
        "selectRandomLayers":      selectRandomLayers,
        "selectShapeLayers":       selectShapeLayers,
        "selectTextLayers":        selectTextLayers,
        "selectUnparentedLayers":  selectUnparentedLayers,
        "setLayerParent":          setLayerParent,
        "setSimpleTimeRemapLoop":  setSimpleTimeRemapLoop,
        "setToAveragePosition":    setToAveragePosition,
        "setTrackMatteToAbove":    setTrackMatteToAbove,
        "setWorkAreaToMarkers":    setWorkAreaToMarkers,
        "shiftLayerStartTime":     shiftLayerStartTime,
        "swapPropertyValues":      swapPropertyValues,
        "swapSelectedPropertyDimensions": swapSelectedPropertyDimensions,
        "toggleMaintainScaleExpression": toggleMaintainScaleExpression,
        "toggleOnionSkinning":     toggleOnionSkinning,
        "togglePreserveNestedFrameRate": togglePreserveNestedFrameRate,
        "toggleSpecificEffects":   toggleSpecificEffects,
        "toggleTimecodeAndStartFrames": toggleTimecodeAndStartFrames,
        "transferCompositionWorkArea": transferCompositionWorkArea,
        "unlockAllLayers":         unlockAllLayers,
        "updateStrokeWeightExpressions": updateStrokeWeightExpressions,
        "zeroPosition":            zeroPosition
        // setExpression, setKeyframes, computeDurationFromText, findFootageByPath
        // are manual-only — no entry needed here
    };

    var MAX_PARAM_ROWS = 8;

    // ----------------------------------------------------------------
    // Param parsers — driven by "type" field in runnerMeta params
    // ----------------------------------------------------------------

    function _ar_trim(s) {
        return String(s || "").replace(/^\s+|\s+$/g, "");
    }

    /** "r, g, b" → [r,g,b]  or  null */
    function _ar_parseColor(str) {
        var parts = _ar_trim(str).split(",");
        if (parts.length < 3) return null;
        var r = parseFloat(parts[0]), g = parseFloat(parts[1]), b = parseFloat(parts[2]);
        return (isNaN(r) || isNaN(g) || isNaN(b)) ? null : [r, g, b];
    }

    /** "w, h" → [w,h]  or  null */
    function _ar_parseSize2D(str) {
        var parts = _ar_trim(str).split(",");
        if (parts.length < 2) return null;
        var w = parseFloat(parts[0]), h = parseFloat(parts[1]);
        return (isNaN(w) || isNaN(h)) ? null : [w, h];
    }

    /** "Logo" → "Logo";  "3" → 3 */
    function _ar_parseNameOrIndex(str) {
        var s = _ar_trim(str);
        if (!s) return null;
        var n = parseInt(s, 10);
        return (!isNaN(n) && String(n) === s) ? n : s;
    }

    /** "1, 2, 3" → [1, 2, 3] */
    function _ar_parseCsvIntegers(str) {
        var parts = _ar_trim(str).split(",");
        var result = [];
        for (var i = 0; i < parts.length; i++) {
            var n = parseInt(parts[i], 10);
            if (!isNaN(n)) result.push(n);
        }
        return result;
    }

    /** "50" → 50;  "hello" → "hello" */
    function _ar_parseAuto(str) {
        var s = _ar_trim(str);
        var n = parseFloat(s);
        return isNaN(n) ? s : n;
    }

    function _ar_extractChoiceOptions(paramDef) {
        var typeName = String((paramDef && paramDef.type) || "string").toLowerCase();
        var hint = String((paramDef && paramDef.hint) || "");
        var parts;
        var result = [];
        var i;
        var item;

        if (typeName !== "string") { return null; }
        if (hint.indexOf("|") === -1) { return null; }

        parts = hint.split("|");
        for (i = 0; i < parts.length; i++) {
            item = _ar_trim(parts[i]);
            if (item) {
                result.push(item);
            }
        }

        return result.length ? result : null;
    }

    /**
     * Parses a single param field value by its declared type.
     * Falls back to the hint value string if the field is empty.
     */
    function _ar_parseParamValue(paramDef, rawValue) {
        var raw = (rawValue !== undefined && rawValue !== "") ? rawValue : (paramDef.hint || "");
        var t = String(paramDef.type || "string").toLowerCase();
        if (t === "number") {
            var n = parseFloat(raw);
            return isNaN(n) ? (parseFloat(paramDef.hint) || 0) : n;
        }
        if (t === "boolean") {
            return _ar_trim(raw) === "true";
        }
        if (t === "color") {
            return _ar_parseColor(raw) || _ar_parseColor(paramDef.hint) || [1, 1, 1];
        }
        if (t === "size2d") {
            return _ar_parseSize2D(raw) || _ar_parseSize2D(paramDef.hint) || [200, 200];
        }
        if (t === "nameorindex") {
            return _ar_parseNameOrIndex(raw);
        }
        if (t === "csvintegers") {
            return _ar_parseCsvIntegers(raw);
        }
        if (t === "auto") {
            return _ar_parseAuto(raw);
        }
        // default: string
        return _ar_trim(raw) || _ar_trim(paramDef.hint) || "";
    }

    /**
     * Sets a nested value using a "controls[0].type" style path.
     * Only supports the array[index].key pattern.
     * @private
     */
    function _ar_setNestedValue(obj, path, val) {
        var arrMatch = path.match(/^(\w+)\[(\d+)\]\.(\w+)$/);
        if (arrMatch) {
            var key = arrMatch[1];
            var idx = parseInt(arrMatch[2], 10);
            var subkey = arrMatch[3];
            if (!obj[key]) { obj[key] = []; }
            while (obj[key].length <= idx) { obj[key].push({}); }
            obj[key][idx][subkey] = val;
        } else {
            obj[path] = val;
        }
    }

    /**
     * Builds the opts object from a params spec + field value map.
     * Handles argKey (direct key) and groupAs ("controls[0].type") routing.
     */
    function _ar_buildOpts(params, vals) {
        var opts = {};
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            var val = _ar_parseParamValue(p, vals[p.name]);
            if (p.groupAs) {
                _ar_setNestedValue(opts, p.groupAs, val);
            } else {
                opts[p.argKey || p.name] = val;
            }
        }
        return opts;
    }

    // ----------------------------------------------------------------
    // Catalog loader
    // ----------------------------------------------------------------
    function loadCatalog() {
        try {
            var indexFile = new File(
                _ar_scriptFile.parent.parent.fsName + "/lib/actions/index.json"
            );
            if (!indexFile.exists) { return []; }
            var data = readJsonFile(indexFile);
            return (data && data.actions) ? data.actions : [];
        } catch (e) {
            return [];
        }
    }

    function _ar_catalogMatches(entry, query) {
        if (!entry) { return false; }

        var haystack = [
            entry.name || "",
            entry.category || "",
            entry.description || "",
            entry.whenToUse || "",
            entry["function"] || ""
        ].join(" ").toLowerCase();

        return haystack.indexOf(String(query || "").toLowerCase()) !== -1;
    }

    // ----------------------------------------------------------------
    // Reliability wrapper
    // ----------------------------------------------------------------
    function runAction(label, fn) {
        var step = label;
        var compBefore = null;
        try {
            compBefore = (app.project && app.project.activeItem instanceof CompItem)
                ? app.project.activeItem : null;
        } catch (_) {}

        beginScript(label, compBefore);

        try {
            app.beginUndoGroup(label);
            var result = fn();
            app.endUndoGroup();

            var compAfter = null;
            try {
                compAfter = (app.project && app.project.activeItem instanceof CompItem)
                    ? app.project.activeItem : compBefore;
            } catch (_) { compAfter = compBefore; }

            writeResult("success", step, null, compAfter);
            return result;
        } catch (e) {
            try { app.endUndoGroup(); } catch (_) {}
            writeResult("error", step, e, compBefore);
            alert(label + " failed.\n\n" + e.toString());
            return null;
        }
    }

    // ----------------------------------------------------------------
    // Build panel UI
    // ----------------------------------------------------------------
    function buildUI(container) {
        var catalog = loadCatalog();

        // ---- Build RUNNERS from catalog + FUNCTIONS ----
        // Each entry needs runnerMeta in index.json and its function in FUNCTIONS.
        // "manual" entries need only runnerMeta (no function required).
        var RUNNERS = {};
        var catalogByName = {};

        for (var ci = 0; ci < catalog.length; ci++) {
            var entry = catalog[ci];
            catalogByName[entry.name] = entry;

            var meta = entry.runnerMeta;
            if (!meta) { continue; }

            if (meta.category === "manual") {
                RUNNERS[entry.name] = { category: "manual", note: meta.note || "" };
                continue;
            }

            var fn = FUNCTIONS[entry["function"]];
            if (!fn) { continue; }  // not included — skip silently

            // Capture fn + meta in a closure-safe way (ES3: no let/const)
            RUNNERS[entry.name] = (function (capturedFn, capturedMeta) {
                return {
                    category: capturedMeta.category,
                    params:   capturedMeta.params || [],
                    run: function (arg, vals) {
                        var opts = _ar_buildOpts(capturedMeta.params || [], vals);
                        // "create" / "project" category functions take (opts) only
                        if (capturedMeta.category === "create" ||
                            capturedMeta.category === "project") {
                            return capturedFn(opts);
                        }
                        return capturedFn(arg, opts);
                    }
                };
            })(fn, meta);
        }

        // ---- Layout ----
        container.orientation = "column";
        container.alignChildren = ["fill", "top"];
        container.spacing = 6;
        container.margins = 10;

        var header = container.add("statictext", undefined, "Actions Runner");
        header.graphics.font = ScriptUI.newFont("dialog", "BOLD", 12);
        container.add("panel", undefined, "").preferredSize.height = 2;

        var filteredCatalog = catalog.slice(0);

        // Search filter
        var searchRow = container.add("group");
        searchRow.orientation = "row";
        searchRow.alignChildren = ["left", "center"];
        searchRow.add("statictext", undefined, "Search:");
        var searchInput = searchRow.add("edittext", undefined, "");
        searchInput.preferredSize.width = 190;
        var clearSearchBtn = searchRow.add("button", undefined, "Clear");
        clearSearchBtn.preferredSize.width = 52;

        var filterSummary = container.add("statictext", undefined, "");

        // Action selector
        var selectorRow = container.add("group");
        selectorRow.orientation = "row";
        selectorRow.alignChildren = ["left", "center"];
        selectorRow.add("statictext", undefined, "Action:");
        var actionDropdown = selectorRow.add("dropdownlist", undefined, []);
        actionDropdown.preferredSize.width = 250;

        for (var di = 0; di < catalog.length; di++) {
            actionDropdown.add("item", catalog[di].name);
        }

        // Info area
        var infoBox = container.add("edittext", undefined, "",
            { multiline: true, scrollable: true, readonly: true });
        infoBox.preferredSize = [340, 76];

        // Parameter rows
        var paramsHeader = container.add("statictext", undefined, "Parameters:");
        paramsHeader.visible = false;

        var paramRows = [];
        for (var ri = 0; ri < MAX_PARAM_ROWS; ri++) {
            var row = container.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.visible = false;
            var lbl = row.add("statictext", undefined, "");
            lbl.preferredSize.width = 138;
            lbl.justify = "right";
            var inputHolder = row.add("group");
            inputHolder.orientation = "row";
            inputHolder.alignChildren = ["left", "center"];
            inputHolder.preferredSize.width = 170;
            paramRows.push({
                row: row,
                label: lbl,
                inputHolder: inputHolder,
                field: null,
                inputType: "text"
            });
        }

        // Note area (manual/layer category hints)
        var noteText = container.add("statictext", undefined, "", { multiline: true });
        noteText.preferredSize = [340, 32];
        noteText.visible = false;

        container.add("panel", undefined, "").preferredSize.height = 2;

        // Run button
        var btnRow = container.add("group");
        btnRow.orientation = "row";
        btnRow.alignment = ["fill", "top"];
        btnRow.alignChildren = ["right", "center"];
        var runBtn = btnRow.add("button", undefined, "Run Action");
        runBtn.preferredSize.width = 130;

        function resetParamRow(rowState) {
            var i;
            rowState.row.visible = false;
            rowState.label.text = "";
            rowState.field = null;
            rowState.inputType = "text";
            for (i = rowState.inputHolder.children.length - 1; i >= 0; i--) {
                rowState.inputHolder.remove(rowState.inputHolder.children[i]);
            }
        }

        function setParamRowInput(rowState, paramDef) {
            var options = _ar_extractChoiceOptions(paramDef);
            var field;
            var i;

            resetParamRow(rowState);
            rowState.label.text = paramDef.label + ":";

            if (options && options.length > 0) {
                field = rowState.inputHolder.add("dropdownlist", undefined, []);
                field.preferredSize.width = 170;
                for (i = 0; i < options.length; i++) {
                    field.add("item", options[i]);
                }
                field.selection = 0;
                rowState.inputType = "dropdown";
            } else {
                field = rowState.inputHolder.add("edittext", undefined, paramDef.hint || "");
                field.preferredSize.width = 170;
                rowState.inputType = "text";
            }

            rowState.field = field;
            rowState.row.visible = true;
        }

        function refreshActionList(query, preferredActionName) {
            var normalizedQuery = _ar_trim(query).toLowerCase();
            var i;
            var selectedName = preferredActionName || "";
            var fallbackName = "";

            if (!selectedName && actionDropdown.selection) {
                selectedName = actionDropdown.selection.text;
            }

            filteredCatalog = [];
            actionDropdown.removeAll();

            for (i = 0; i < catalog.length; i++) {
                if (!normalizedQuery || _ar_catalogMatches(catalog[i], normalizedQuery)) {
                    filteredCatalog.push(catalog[i]);
                }
            }

            for (i = 0; i < filteredCatalog.length; i++) {
                actionDropdown.add("item", filteredCatalog[i].name);
                if (!fallbackName) {
                    fallbackName = filteredCatalog[i].name;
                }
            }

            if (normalizedQuery) {
                filterSummary.text = filteredCatalog.length + " of " + catalog.length + " actions";
            } else {
                filterSummary.text = catalog.length + " actions";
            }

            if (filteredCatalog.length === 0) {
                infoBox.text = "No actions matched \"" + _ar_trim(query) + "\".";
                paramsHeader.visible = false;
                noteText.visible = false;
                runBtn.enabled = false;
                for (i = 0; i < MAX_PARAM_ROWS; i++) {
                    resetParamRow(paramRows[i]);
                }
                container.layout.layout(true);
                return;
            }

            for (i = 0; i < filteredCatalog.length; i++) {
                if (filteredCatalog[i].name === selectedName) {
                    actionDropdown.selection = i;
                    break;
                }
            }

            if (!actionDropdown.selection && fallbackName) {
                actionDropdown.selection = 0;
            }

            if (actionDropdown.selection) {
                applySelection(actionDropdown.selection.text);
            }
        }

        // ---- Selection handler ----
        function applySelection(actionName) {
            var catalogEntry = catalogByName[actionName];
            var runner = RUNNERS[actionName];

            var lines = [];
            if (catalogEntry) {
                if (catalogEntry.description) { lines.push(catalogEntry.description); }
                if (catalogEntry.whenToUse)   { lines.push("When: " + catalogEntry.whenToUse); }
                if (catalogEntry.example)     { lines.push("e.g. " + catalogEntry.example); }
            }
            infoBox.text = lines.join("\n");

            for (var i = 0; i < MAX_PARAM_ROWS; i++) {
                resetParamRow(paramRows[i]);
            }
            paramsHeader.visible = false;
            noteText.visible     = false;
            runBtn.enabled       = true;

            if (!runner) {
                runBtn.enabled = false;
                container.layout.layout(true);
                return;
            }

            if (runner.category === "manual") {
                noteText.text    = "\u26A0 " + (runner.note || "Cannot run from panel.");
                noteText.visible = true;
                runBtn.enabled   = false;
                container.layout.layout(true);
                return;
            }

            if (runner.category === "layer") {
                noteText.text    = "Requires a selected layer in the active comp.";
                noteText.visible = true;
            }

            var params = runner.params || [];
            if (params.length > 0) {
                paramsHeader.visible = true;
                for (var p = 0; p < params.length && p < MAX_PARAM_ROWS; p++) {
                    setParamRowInput(paramRows[p], params[p]);
                }
            }

            container.layout.layout(true);
        }

        // ---- Run handler ----
        runBtn.onClick = function () {
            var sel = actionDropdown.selection;
            if (!sel) { alert("Select an action first."); return; }

            var actionName = sel.text;
            var runner = RUNNERS[actionName];
            if (!runner || runner.category === "manual") { return; }

            var vals = {};
            var params = runner.params || [];
            for (var p = 0; p < params.length && p < MAX_PARAM_ROWS; p++) {
                if (paramRows[p].inputType === "dropdown") {
                    vals[params[p].name] = paramRows[p].field && paramRows[p].field.selection
                        ? paramRows[p].field.selection.text
                        : "";
                } else {
                    vals[params[p].name] = paramRows[p].field ? paramRows[p].field.text : "";
                }
            }

            var comp = null;
            var activeLayer = null;

            if (runner.category === "comp") {
                if (!app.project || !(app.project.activeItem instanceof CompItem)) {
                    alert("Open and select a composition first.");
                    return;
                }
                comp = app.project.activeItem;
            } else if (runner.category === "layer") {
                if (!app.project || !(app.project.activeItem instanceof CompItem)) {
                    alert("Open and select a composition first.");
                    return;
                }
                comp = app.project.activeItem;
                var selLayers = comp.selectedLayers;
                if (!selLayers || selLayers.length === 0) {
                    alert("Select a layer in the active composition first.");
                    return;
                }
                activeLayer = selLayers[0];
            }

            var _name   = actionName;
            var _runner = runner;
            var _arg    = (_runner.category === "layer") ? activeLayer : comp;
            var _vals   = vals;

            runAction(_name, function () {
                return _runner.run(_arg, _vals);
            });
        };

        // ---- Dropdown change ----
        actionDropdown.onChange = function () {
            if (actionDropdown.selection) {
                applySelection(actionDropdown.selection.text);
            }
        };

        searchInput.onChanging = function () {
            refreshActionList(searchInput.text, actionDropdown.selection ? actionDropdown.selection.text : "");
        };

        searchInput.onChange = function () {
            refreshActionList(searchInput.text, actionDropdown.selection ? actionDropdown.selection.text : "");
        };

        clearSearchBtn.onClick = function () {
            searchInput.text = "";
            refreshActionList("", actionDropdown.selection ? actionDropdown.selection.text : "");
            try { searchInput.active = true; } catch (_) {}
        };

        refreshActionList("", "");
    }

    // ----------------------------------------------------------------
    // Entry point
    // ----------------------------------------------------------------
    var panel;
    if (thisObj instanceof Panel) {
        panel = thisObj;
        buildUI(panel);
        panel.onResizing = panel.onResize = function () {
            this.layout.resize();
        };
        panel.layout.layout(true);
    } else {
        panel = new Window("palette", "Actions Runner", undefined, { resizable: true });
        panel.preferredSize = [370, 500];
        buildUI(panel);
        panel.onResizing = panel.onResize = function () {
            this.layout.resize();
        };
        panel.center();
        panel.show();
    }

})(this);
