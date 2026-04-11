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
#include "../lib/actions/backdrop.jsxinc"
#include "../lib/actions/beat_markers.jsxinc"
#include "../lib/actions/camera_rig.jsxinc"
#include "../lib/actions/create_comp.jsxinc"
#include "../lib/actions/demo_scene.jsxinc"
#include "../lib/actions/film_damage_treatment.jsxinc"
#include "../lib/actions/guide_preset.jsxinc"
#include "../lib/actions/queue_comp.jsxinc"
#include "../lib/actions/star_trim_animation.jsxinc"
#include "../lib/actions/title_stack.jsxinc"
#include "../lib/actions/image_swap.jsxinc"
#include "../lib/actions/data_timing.jsxinc"

(function (thisObj) {

    // Capture script path at parse time ($.fileName is reliable here)
    var _ar_scriptFile = new File($.fileName);

    // ----------------------------------------------------------------
    // Action runner definitions
    // category "comp"   = needs active CompItem, run against it
    // category "create" = creates its own comp, no active comp needed
    // category "manual" = cannot be run from the panel (needs data/File)
    // ----------------------------------------------------------------
    var RUNNERS = {
        "Add Backdrop": {
            category: "comp",
            params: [],
            run: function (comp, v) { return addBackdrop(comp, {}); }
        },
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
        "Add Camera Rig": {
            category: "comp",
            params: [],
            run: function (comp, v) { return addCameraRig(comp, {}); }
        },
        "Add Film Damage Treatment": {
            category: "comp",
            params: [],
            run: function (comp, v) { return addFilmDamageTreatment(comp, {}); }
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
        "Add Star Trim Animation": {
            category: "comp",
            params: [],
            run: function (comp, v) { return addStarTrimAnimation(comp, {}); }
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
                    name:           safeTrim(v.name)      || "Demo Scene",
                    width:          parseFloat(v.width)   || 1920,
                    height:         parseFloat(v.height)  || 1080,
                    duration:       parseFloat(v.duration)|| 8,
                    fps:            parseFloat(v.fps)     || 24,
                    spacingSeconds: parseFloat(v.spacingSeconds) || 1
                });
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
                    name:     safeTrim(v.name)      || "My Comp",
                    width:    parseFloat(v.width)   || 1920,
                    height:   parseFloat(v.height)  || 1080,
                    duration: parseFloat(v.duration)|| 8,
                    fps:      parseFloat(v.fps)     || 24
                });
            }
        },
        "Data Timing": {
            category: "manual",
            note: "Operates on JSON data objects — call recalculateDurationsOnJson() in a script."
        },
        "Image Swap": {
            category: "manual",
            note: "Requires a File path — call replaceLayerSource() in a script."
        },
        "Queue Comp": {
            category: "comp",
            params: [],
            run: function (comp, v) { return queueComp(comp); }
        }
    };

    var MAX_PARAM_ROWS = 6;

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

            // Resolve comp for comp-category actions
            var comp = null;
            if (runner.category === "comp") {
                if (!app.project || !(app.project.activeItem instanceof CompItem)) {
                    alert("Open and select a composition first.");
                    return;
                }
                comp = app.project.activeItem;
            }

            // Closure-safe captures
            var _name   = actionName;
            var _runner = runner;
            var _comp   = comp;
            var _vals   = vals;

            runAction(_name, function () {
                return _runner.run(_comp, _vals);
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
        panel.preferredSize = [370, 460];
        buildUI(panel);
        panel.center();
        panel.show();
    }

})(this);
