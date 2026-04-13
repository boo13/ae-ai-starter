/**
 * actions_runner_panel.jsx
 *
 * Loads the action catalog from Scripts/lib/actions/index.json and provides
 * a UI for running any action with adjustable inputs. Use this for testing
 * actions and exploring the catalog — it stays current as new actions are added.
 *
 * Run via: File > Scripts > Run Script File... or docked as a ScriptUI panel.
 */

#include "../lib/helpers.jsxinc"
#include "../lib/io.jsxinc"
#include "../lib/prop-walker.jsxinc"
#include "../lib/result-writer.jsxinc"

// Comp / utility
#include "../lib/actions/comp/create_comp.jsxinc"
#include "../lib/actions/comp/guide_preset.jsxinc"
#include "../lib/actions/comp/pre_compose.jsxinc"
#include "../lib/actions/utility/data_timing.jsxinc"
#include "../lib/actions/utility/project_folder.jsxinc"

// Marker / render
#include "../lib/actions/marker/beat_markers.jsxinc"
#include "../lib/actions/render/queue_comp.jsxinc"

// Layer primitives (no external deps)
#include "../lib/actions/layer/solid.jsxinc"
#include "../lib/actions/layer/null_object.jsxinc"
#include "../lib/actions/layer/text_layer.jsxinc"
#include "../lib/actions/layer/shape_layer.jsxinc"
#include "../lib/actions/layer/light.jsxinc"
#include "../lib/actions/layer/camera.jsxinc"
#include "../lib/actions/layer/image_swap.jsxinc"
#include "../lib/actions/layer/set_parent.jsxinc"
#include "../lib/actions/layer/mask.jsxinc"

// Property actions
#include "../lib/actions/property/set_keyframes.jsxinc"
#include "../lib/actions/property/set_expression.jsxinc"
#include "../lib/actions/property/expression_control.jsxinc"

// Effects
#include "../lib/actions/effects/gate_weave.jsxinc"
#include "../lib/actions/effects/grain.jsxinc"
#include "../lib/actions/effects/flicker.jsxinc"
#include "../lib/actions/effects/color_grade.jsxinc"
#include "../lib/actions/effects/star_trim_animation.jsxinc"
#include "../lib/actions/effects/apply_effect.jsxinc"

// Scene blocks
#include "../lib/actions/scene/backdrop.jsxinc"
#include "../lib/actions/scene/camera_rig.jsxinc"
#include "../lib/actions/scene/title_stack.jsxinc"

// Presets / compounds (depend on blocks above)
#include "../lib/actions/presets/demo_scene.jsxinc"
#include "../lib/actions/presets/film_damage_treatment.jsxinc"
#include "../lib/actions/presets/text_animator.jsxinc"
#include "../lib/actions/presets/expression_rig.jsxinc"
#include "../lib/actions/presets/motion_graphic_scene.jsxinc"

(function (thisObj) {

    // Capture script path at parse time ($.fileName is reliable here)
    var _ar_scriptFile = new File($.fileName);

    // ----------------------------------------------------------------
    // Helper: parse "r, g, b" string into [r, g, b] array
    // ----------------------------------------------------------------
    function _ar_parseColor(str) {
        if (!str) return null;
        var parts = String(str).split(",");
        if (parts.length < 3) return null;
        var r = parseFloat(parts[0]);
        var g = parseFloat(parts[1]);
        var b = parseFloat(parts[2]);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        return [r, g, b];
    }

    // ----------------------------------------------------------------
    // Action runner definitions
    // category "comp"    = needs active CompItem, run against it
    // category "create"  = creates its own comp, no active comp needed
    // category "layer"   = needs first selected layer in active comp
    // category "project" = needs an open project only (no active comp)
    // category "manual"  = cannot be run from the panel (needs data/File/Property)
    // ----------------------------------------------------------------
    var RUNNERS = {

        // ---- Comp-level: layer creation ----
        "Add Backdrop": {
            category: "comp",
            params: [],
            run: function (comp, v) { return addBackdrop(comp, {}); }
        },
        "Add Camera": {
            category: "comp",
            params: [
                { name: "name",         label: "Name",          hint: "Camera" },
                { name: "depthOfField", label: "Depth of Field", hint: "false" }
            ],
            run: function (comp, v) {
                return addCamera(comp, {
                    name:         safeTrim(v.name) || "Camera",
                    depthOfField: safeTrim(v.depthOfField) === "true"
                });
            }
        },
        "Add Camera Rig": {
            category: "comp",
            params: [],
            run: function (comp, v) { return addCameraRig(comp, {}); }
        },
        "Add Light": {
            category: "comp",
            params: [
                { name: "type",      label: "Type",      hint: "point  |  spot  |  parallel  |  ambient" },
                { name: "name",      label: "Name",      hint: "Light" },
                { name: "intensity", label: "Intensity", hint: "100" }
            ],
            run: function (comp, v) {
                var intensity = parseFloat(v.intensity);
                return addLight(comp, {
                    type:      safeTrim(v.type) || "point",
                    name:      safeTrim(v.name) || "Light",
                    intensity: isNaN(intensity) ? 100 : intensity
                });
            }
        },
        "Add Null": {
            category: "comp",
            params: [
                { name: "name", label: "Name",      hint: "Null Controller" },
                { name: "is3D", label: "3D Layer",  hint: "false" }
            ],
            run: function (comp, v) {
                return addNull(comp, {
                    name: safeTrim(v.name) || "Null Controller",
                    is3D: safeTrim(v.is3D) === "true"
                });
            }
        },
        "Add Shape Layer": {
            category: "comp",
            params: [
                { name: "shape",     label: "Shape",           hint: "rectangle  |  ellipse  |  polygon  |  star" },
                { name: "name",      label: "Name",            hint: "Shape Layer" },
                { name: "width",     label: "Width (px)",      hint: "200" },
                { name: "height",    label: "Height (px)",     hint: "200" },
                { name: "fillColor", label: "Fill (r, g, b)",  hint: "0.2, 0.4, 1.0" }
            ],
            run: function (comp, v) {
                var w    = parseFloat(v.width)  || 200;
                var h    = parseFloat(v.height) || 200;
                var fill = _ar_parseColor(v.fillColor) || [0.2, 0.4, 1.0];
                return addShapeLayer(comp, {
                    shape:       safeTrim(v.shape) || "rectangle",
                    name:        safeTrim(v.name)  || "Shape Layer",
                    size:        [w, h],
                    fillColor:   fill,
                    strokeColor: null
                });
            }
        },
        "Add Solid": {
            category: "comp",
            params: [
                { name: "name",         label: "Name",             hint: "Solid" },
                { name: "color",        label: "Color (r, g, b)",  hint: "0.1, 0.1, 0.1" },
                { name: "isAdjustment", label: "Adjustment Layer", hint: "false" }
            ],
            run: function (comp, v) {
                var color = _ar_parseColor(v.color) || [0.1, 0.1, 0.1];
                return addSolid(comp, {
                    name:         safeTrim(v.name) || "Solid",
                    color:        color,
                    isAdjustment: safeTrim(v.isAdjustment) === "true"
                });
            }
        },
        "Add Star Trim Animation": {
            category: "comp",
            params: [],
            run: function (comp, v) { return addStarTrimAnimation(comp, {}); }
        },
        "Add Text Layer": {
            category: "comp",
            params: [
                { name: "text",          label: "Text",           hint: "Hello World" },
                { name: "fontSize",      label: "Font Size",      hint: "48" },
                { name: "justification", label: "Justification",  hint: "center  |  left  |  right" }
            ],
            run: function (comp, v) {
                var fs = parseFloat(v.fontSize) || 48;
                return addTextLayer(comp, {
                    text:          v.text          || "Hello World",
                    fontSize:      fs,
                    justification: safeTrim(v.justification) || "center"
                });
            }
        },
        "Add Title Stack": {
            category: "comp",
            params: [
                { name: "title",    label: "Title",    hint: "My Project" },
                { name: "subtitle", label: "Subtitle", hint: "A short description" }
            ],
            run: function (comp, v) {
                return addTitleStack(comp, { title: v.title, subtitle: v.subtitle });
            }
        },
        "Set Layer Parent": {
            category: "comp",
            params: [
                { name: "child",  label: "Child (name or index)",              hint: "Logo" },
                { name: "parent", label: "Parent (name, index, or blank=none)", hint: "Null Controller" }
            ],
            run: function (comp, v) {
                var childStr  = safeTrim(v.child);
                var parentStr = safeTrim(v.parent);
                var child  = childStr  ? (isNaN(parseInt(childStr,  10)) ? childStr  : parseInt(childStr,  10)) : null;
                var parent = parentStr ? (isNaN(parseInt(parentStr, 10)) ? parentStr : parseInt(parentStr, 10)) : null;
                if (!child) throw new Error("Set Layer Parent: child is required.");
                return setLayerParent(comp, { child: child, parent: parent });
            }
        },

        // ---- Comp-level: effects ----
        "Add Beat Markers": {
            category: "comp",
            params: [
                { name: "spacingSeconds", label: "Spacing (sec)", hint: "1.0" }
            ],
            run: function (comp, v) {
                var spw = parseFloat(v.spacingSeconds);
                return addBeatMarkers(comp, { spacingSeconds: isNaN(spw) ? 1.0 : spw });
            }
        },
        "Add Color Grade": {
            category: "comp",
            params: [
                { name: "glowIntensity",  label: "Glow Intensity (0-1)", hint: "0.2" },
                { name: "vignetteAmount", label: "Vignette (0-100)",     hint: "50" }
            ],
            run: function (comp, v) {
                var gi = parseFloat(v.glowIntensity);
                var va = parseFloat(v.vignetteAmount);
                return addColorGrade(comp, {
                    glowIntensity:  isNaN(gi) ? 0.2 : gi,
                    vignetteAmount: isNaN(va) ? 50  : va
                });
            }
        },
        "Add Film Damage Treatment": {
            category: "comp",
            params: [],
            run: function (comp, v) { return addFilmDamageTreatment(comp, {}); }
        },
        "Add Flicker": {
            category: "comp",
            params: [
                { name: "speed",  label: "Speed (Hz)",     hint: "12" },
                { name: "amount", label: "Amount (stops)", hint: "0.1" }
            ],
            run: function (comp, v) {
                var spd = parseFloat(v.speed);
                var amt = parseFloat(v.amount);
                return addFlicker(comp, {
                    speed:  isNaN(spd) ? 12  : spd,
                    amount: isNaN(amt) ? 0.1 : amt
                });
            }
        },
        "Add Gate Weave": {
            category: "comp",
            params: [
                { name: "intensity", label: "Intensity", hint: "1.0" }
            ],
            run: function (comp, v) {
                var i = parseFloat(v.intensity);
                return addGateWeave(comp, { intensity: isNaN(i) ? 1.0 : i });
            }
        },
        "Add Grain": {
            category: "comp",
            params: [
                { name: "amount",     label: "Amount (0-100)", hint: "10" },
                { name: "blurRadius", label: "Blur Radius",    hint: "6" }
            ],
            run: function (comp, v) {
                var amt = parseFloat(v.amount);
                var br  = parseFloat(v.blurRadius);
                return addGrain(comp, {
                    amount:     isNaN(amt) ? 10 : amt,
                    blurRadius: isNaN(br)  ? 6  : br
                });
            }
        },
        "Add Guide Preset": {
            category: "comp",
            params: [
                { name: "preset", label: "Preset", hint: "thirds  |  safe  |  center" }
            ],
            run: function (comp, v) {
                return addGuidePreset(comp, { preset: safeTrim(v.preset) || "thirds" });
            }
        },

        // ---- Comp-level: comp ops ----
        "Pre Compose": {
            category: "comp",
            params: [
                { name: "layerIndices", label: "Layer indices (e.g. 1,2,3)", hint: "1, 2" },
                { name: "name",         label: "Pre-comp name",               hint: "Pre-comp" }
            ],
            run: function (comp, v) {
                var raw = String(v.layerIndices || "").split(",");
                var indices = [];
                for (var i = 0; i < raw.length; i++) {
                    var n = parseInt(raw[i], 10);
                    if (!isNaN(n)) indices.push(n);
                }
                if (!indices.length) throw new Error("Pre Compose: enter at least one layer index.");
                return preCompose(comp, { layerIndices: indices, name: safeTrim(v.name) || "Pre-comp" });
            }
        },
        "Queue Comp": {
            category: "comp",
            params: [],
            run: function (comp, v) { return queueComp(comp); }
        },

        // ---- Layer-level: operate on first selected layer ----
        "Add Mask": {
            category: "layer",
            params: [
                { name: "shape", label: "Shape",              hint: "rectangle  |  ellipse" },
                { name: "name",  label: "Mask Name (optional)", hint: "" }
            ],
            run: function (layer, v) {
                var opts = { shape: safeTrim(v.shape) || "rectangle" };
                if (safeTrim(v.name)) { opts.name = safeTrim(v.name); }
                return addMask(layer, opts);
            }
        },
        "Add Expression Control": {
            category: "layer",
            params: [
                { name: "type",  label: "Type",          hint: "slider  |  angle  |  checkbox  |  color  |  point" },
                { name: "name",  label: "Control Name",  hint: "Speed" },
                { name: "value", label: "Initial Value", hint: "0" }
            ],
            run: function (layer, v) {
                var rawVal = safeTrim(v.value);
                var val = parseFloat(rawVal);
                if (isNaN(val)) { val = rawVal; }
                return addExpressionControl(layer, {
                    type:  safeTrim(v.type)  || "slider",
                    name:  safeTrim(v.name)  || "Control",
                    value: val
                });
            }
        },
        "Apply Effect": {
            category: "layer",
            params: [
                { name: "matchName", label: "Match Name (ADBE...)", hint: "ADBE Gaussian Blur 2" }
            ],
            run: function (layer, v) {
                var mn = safeTrim(v.matchName);
                if (!mn) throw new Error("Apply Effect: match name is required.");
                return applyEffect(layer, { matchName: mn });
            }
        },
        "Add Text Animator": {
            category: "layer",
            params: [
                { name: "preset",   label: "Preset",   hint: "typeOn  |  fadeUp  |  trackingIn  |  scaleBounce" },
                { name: "duration", label: "Duration (sec)", hint: "1.0" },
                { name: "stagger",  label: "Stagger (0-1)",  hint: "0.05" }
            ],
            run: function (layer, v) {
                var dur = parseFloat(v.duration);
                var stg = parseFloat(v.stagger);
                return addTextAnimator(layer, {
                    preset:   safeTrim(v.preset) || "typeOn",
                    duration: isNaN(dur) ? 1.0  : dur,
                    stagger:  isNaN(stg) ? 0.05 : stg
                });
            }
        },

        // ---- Project-level: no active comp needed ----
        "Ensure Project Folder": {
            category: "project",
            params: [
                { name: "name", label: "Folder path", hint: "Assets/Images" }
            ],
            run: function (comp, v) {
                return ensureProjectFolder({ name: safeTrim(v.name) || "Assets" });
            }
        },

        // ---- Create: makes its own comp ----
        "Build Demo Scene": {
            category: "create",
            params: [
                { name: "name",           label: "Name",              hint: "Demo Scene" },
                { name: "width",          label: "Width (px)",         hint: "1920" },
                { name: "height",         label: "Height (px)",        hint: "1080" },
                { name: "duration",       label: "Duration (sec)",     hint: "8" },
                { name: "fps",            label: "FPS",                hint: "24" },
                { name: "spacingSeconds", label: "Beat Spacing (sec)", hint: "1" }
            ],
            run: function (comp, v) {
                return buildDemoScene({
                    name:           safeTrim(v.name)     || "Demo Scene",
                    width:          parseFloat(v.width)  || 1920,
                    height:         parseFloat(v.height) || 1080,
                    duration:       parseFloat(v.duration) || 8,
                    fps:            parseFloat(v.fps)    || 24,
                    spacingSeconds: parseFloat(v.spacingSeconds) || 1
                });
            }
        },
        "Build Motion Graphic Scene": {
            category: "create",
            params: [
                { name: "name",     label: "Name",          hint: "MG Scene" },
                { name: "title",    label: "Title text",    hint: "Title" },
                { name: "subtitle", label: "Subtitle text", hint: "Subtitle" },
                { name: "style",    label: "Style",         hint: "minimal  |  bold  |  tech" },
                { name: "width",    label: "Width (px)",    hint: "1920" },
                { name: "height",   label: "Height (px)",   hint: "1080" },
                { name: "duration", label: "Duration (sec)", hint: "8" },
                { name: "fps",      label: "FPS",           hint: "24" }
            ],
            run: function (comp, v) {
                return buildMotionGraphicScene({
                    name:     safeTrim(v.name)     || "MG Scene",
                    title:    v.title    || "Title",
                    subtitle: v.subtitle || "Subtitle",
                    style:    safeTrim(v.style)    || "minimal",
                    width:    parseFloat(v.width)  || 1920,
                    height:   parseFloat(v.height) || 1080,
                    duration: parseFloat(v.duration) || 8,
                    fps:      parseFloat(v.fps)    || 24
                });
            }
        },
        "Add Expression Rig": {
            category: "create",
            params: [
                { name: "nullName",    label: "Null name",          hint: "Expression Controls" },
                { name: "ctrl1Type",   label: "Control 1 type",     hint: "slider" },
                { name: "ctrl1Name",   label: "Control 1 name",     hint: "Speed" },
                { name: "ctrl1Value",  label: "Control 1 value",    hint: "50" }
            ],
            run: function (comp, v) {
                if (!app.project || !(app.project.activeItem instanceof CompItem)) {
                    throw new Error("Add Expression Rig: open and select a composition first.");
                }
                var c = app.project.activeItem;
                var controls = [];
                var t1 = safeTrim(v.ctrl1Type);
                if (t1) {
                    var val1 = parseFloat(v.ctrl1Value);
                    controls.push({ type: t1, name: safeTrim(v.ctrl1Name) || t1, value: isNaN(val1) ? 0 : val1 });
                }
                if (!controls.length) { controls.push({ type: "slider", name: "Speed", value: 50 }); }
                return addExpressionRig(c, { nullName: safeTrim(v.nullName) || "Expression Controls", controls: controls });
            }
        },
        "Create Comp": {
            category: "create",
            params: [
                { name: "name",     label: "Name",          hint: "My Comp" },
                { name: "width",    label: "Width (px)",     hint: "1920" },
                { name: "height",   label: "Height (px)",    hint: "1080" },
                { name: "duration", label: "Duration (sec)", hint: "8" },
                { name: "fps",      label: "FPS",            hint: "24" }
            ],
            run: function (comp, v) {
                return createCompFromValues({
                    name:     safeTrim(v.name)     || "My Comp",
                    width:    parseFloat(v.width)  || 1920,
                    height:   parseFloat(v.height) || 1080,
                    duration: parseFloat(v.duration) || 8,
                    fps:      parseFloat(v.fps)    || 24
                });
            }
        },

        // ---- Manual: require data/File/Property, can't run from panel ----
        "Data Timing": {
            category: "manual",
            note: "Operates on JSON data objects — call recalculateDurationsOnJson() in a script."
        },
        "Image Swap": {
            category: "manual",
            note: "Requires a File path — call replaceLayerSource() in a script."
        },
        "Set Expression": {
            category: "manual",
            note: "Operates on a specific Property — call setExpression(prop, { expression: '...' }) in a script."
        },
        "Set Keyframes": {
            category: "manual",
            note: "Operates on a specific Property — call setKeyframes(prop, { keyframes: [...] }) in a script."
        }
    };

    var MAX_PARAM_ROWS = 8;

    // ----------------------------------------------------------------
    // Load action catalog from index.json (for the dropdown list)
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

    // ----------------------------------------------------------------
    // Reliability wrapper (same pattern as automation_lab_panel.jsx)
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

        container.orientation = "column";
        container.alignChildren = ["fill", "top"];
        container.spacing = 6;
        container.margins = 10;

        // Header
        var header = container.add("statictext", undefined, "Actions Runner");
        header.graphics.font = ScriptUI.newFont("dialog", "BOLD", 12);

        container.add("panel", undefined, "").preferredSize.height = 2;

        // --- Action selector ---
        var selectorRow = container.add("group");
        selectorRow.orientation = "row";
        selectorRow.alignChildren = ["left", "center"];
        selectorRow.add("statictext", undefined, "Action:");
        var actionDropdown = selectorRow.add("dropdownlist", undefined, []);
        actionDropdown.preferredSize.width = 250;

        // Populate dropdown from catalog
        var catalogByName = {};
        for (var ci = 0; ci < catalog.length; ci++) {
            var entry = catalog[ci];
            actionDropdown.add("item", entry.name);
            catalogByName[entry.name] = entry;
        }

        // --- Info area ---
        var infoBox = container.add("edittext", undefined, "",
            { multiline: true, scrollable: true, readonly: true });
        infoBox.preferredSize = [340, 76];

        // --- Parameters section ---
        var paramsHeader = container.add("statictext", undefined, "Parameters:");
        paramsHeader.visible = false;

        // Pre-allocate MAX_PARAM_ROWS rows (label + edittext)
        var paramRows = [];
        for (var ri = 0; ri < MAX_PARAM_ROWS; ri++) {
            var row = container.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.visible = false;
            var lbl = row.add("statictext", undefined, "");
            lbl.preferredSize.width = 138;
            lbl.justify = "right";
            var fld = row.add("edittext", undefined, "");
            fld.preferredSize.width = 170;
            paramRows.push({ row: row, label: lbl, field: fld });
        }

        // Manual-only note
        var manualNote = container.add("statictext", undefined, "", { multiline: true });
        manualNote.preferredSize = [340, 32];
        manualNote.visible = false;

        container.add("panel", undefined, "").preferredSize.height = 2;

        // --- Run button ---
        var btnRow = container.add("group");
        btnRow.orientation = "row";
        btnRow.alignment = "right";
        var runBtn = btnRow.add("button", undefined, "Run Action");
        runBtn.preferredSize.width = 130;

        // ---- Update UI when selection changes ----
        function applySelection(actionName) {
            var catalogEntry = catalogByName[actionName];
            var runner = RUNNERS[actionName];

            // Info text
            var lines = [];
            if (catalogEntry) {
                if (catalogEntry.description) { lines.push(catalogEntry.description); }
                if (catalogEntry.whenToUse)   { lines.push("When: " + catalogEntry.whenToUse); }
                if (catalogEntry.example)     { lines.push("e.g. " + catalogEntry.example); }
            }
            infoBox.text = lines.join("\n");

            // Reset all param rows
            for (var i = 0; i < MAX_PARAM_ROWS; i++) {
                paramRows[i].row.visible = false;
                paramRows[i].label.text = "";
                paramRows[i].field.text = "";
            }
            paramsHeader.visible = false;
            manualNote.visible = false;
            runBtn.enabled = true;

            if (!runner) {
                runBtn.enabled = false;
                container.layout.layout(true);
                return;
            }

            if (runner.category === "manual") {
                manualNote.text = "\u26A0 " + (runner.note || "Cannot run from panel.");
                manualNote.visible = true;
                runBtn.enabled = false;
                container.layout.layout(true);
                return;
            }

            if (runner.category === "layer") {
                manualNote.text = "Requires a selected layer in the active comp.";
                manualNote.visible = true;
            }

            // Show param rows
            var params = runner.params || [];
            if (params.length > 0) {
                paramsHeader.visible = true;
                for (var p = 0; p < params.length && p < MAX_PARAM_ROWS; p++) {
                    paramRows[p].label.text = params[p].label + ":";
                    paramRows[p].field.text = params[p].hint || "";
                    paramRows[p].row.visible = true;
                }
            }

            container.layout.layout(true);
        }

        // ---- Run button handler ----
        runBtn.onClick = function () {
            var sel = actionDropdown.selection;
            if (!sel) { alert("Select an action first."); return; }

            var actionName = sel.text;
            var runner = RUNNERS[actionName];
            if (!runner || runner.category === "manual") { return; }

            // Collect field values
            var vals = {};
            var params = runner.params || [];
            for (var p = 0; p < params.length && p < MAX_PARAM_ROWS; p++) {
                vals[params[p].name] = paramRows[p].field.text;
            }

            // Resolve comp / layer based on category
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
            // "create" and "project" categories need neither comp nor layer

            // Closure-safe captures
            var _name    = actionName;
            var _runner  = runner;
            var _comp    = comp;
            var _layer   = activeLayer;
            var _vals    = vals;

            runAction(_name, function () {
                var arg = (_runner.category === "layer") ? _layer : _comp;
                return _runner.run(arg, _vals);
            });
        };

        // ---- Dropdown change ----
        actionDropdown.onChange = function () {
            if (actionDropdown.selection) {
                applySelection(actionDropdown.selection.text);
            }
        };

        // Select first item on load
        if (actionDropdown.items.length > 0) {
            actionDropdown.selection = 0;
            applySelection(actionDropdown.items[0].text);
        }
    }

    // ----------------------------------------------------------------
    // Entry point — works as floating palette or docked panel
    // ----------------------------------------------------------------
    var panel;
    if (thisObj instanceof Panel) {
        panel = thisObj;
        buildUI(panel);
        panel.layout.layout(true);
    } else {
        panel = new Window("palette", "Actions Runner", undefined, { resizable: true });
        panel.preferredSize = [370, 500];
        buildUI(panel);
        panel.center();
        panel.show();
    }

})(this);
