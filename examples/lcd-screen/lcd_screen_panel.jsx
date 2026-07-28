/**
 * LCD Screen v2
 *
 * Dockable ScriptUI panel. Install this file in After Effects' ScriptUI Panels
 * folder, then open it from Window > LCD Screen v2.
 */

#include "../../Scripts/lib/helpers.jsxinc"
#include "../../Scripts/lib/io.jsxinc"
#include "../../Scripts/lib/prop-walker.jsxinc"
#include "../../Scripts/lib/result-writer.jsxinc"

#include "../../Scripts/lib/actions/layer/solid.jsxinc"
#include "../../Scripts/lib/actions/layer/shape_layer.jsxinc"
#include "../../Scripts/lib/actions/layer/mask.jsxinc"
#include "../../Scripts/lib/actions/layer/camera.jsxinc"
#include "../../Scripts/lib/actions/layer/null_object.jsxinc"
#include "../../Scripts/lib/actions/layer/set_parent.jsxinc"
#include "../../Scripts/lib/actions/property/expression_control.jsxinc"
#include "../../Scripts/lib/actions/property/set_expression.jsxinc"
#include "../../Scripts/lib/actions/presets/expression_rig.jsxinc"

#include "../../Scripts/lib/actions/effects/subpixel_grid.jsxinc"
#include "../../Scripts/lib/actions/effects/scanlines.jsxinc"
#include "../../Scripts/lib/actions/effects/backlight_tint.jsxinc"
#include "../../Scripts/lib/actions/effects/backlight_bleed.jsxinc"
#include "../../Scripts/lib/actions/effects/viewing_angle_falloff.jsxinc"
#include "../../Scripts/lib/actions/scene/glass_surface.jsxinc"
#include "../../Scripts/lib/actions/effects/screen_glow.jsxinc"
#include "../../Scripts/lib/actions/effects/vignette.jsxinc"
#include "../../Scripts/lib/actions/scene/bezel.jsxinc"
#include "../../Scripts/lib/actions/effects/ambient_spill.jsxinc"
#include "../../Scripts/lib/actions/effects/lens_distortion.jsxinc"
#include "../../Scripts/lib/actions/effects/chromatic_aberration.jsxinc"
#include "../../Scripts/lib/actions/presets/lcd_screen.jsxinc"

#include "example_config.jsxinc"
#include "presets.jsxinc"
#include "lib/cleaner.jsxinc"
#include "lib/content-comp.jsxinc"
#include "lib/screen-comp.jsxinc"
#include "lib/autozoom.jsxinc"
#include "lib/camera-rig.jsxinc"
#include "lib/lens-stack.jsxinc"
#include "lib/rig.jsxinc"
#include "lib/links.jsxinc"
#include "lib/quality.jsxinc"
#include "lib/states.jsxinc"
#include "lib/build.jsxinc"

(function (thisObj) {
    var PANEL_TITLE = "LCD Screen v2";
    var controlRows = {};
    var controlDefinitions = getLcdControlDefinitions(LcdScreenConfig);

    function nowStamp() {
        var d = new Date();
        function pad(n) { return (n < 10 ? "0" : "") + n; }
        return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    function cloneConfig() {
        var cfg = {};
        for (var key in LcdScreenConfig) {
            if (LcdScreenConfig.hasOwnProperty(key)) cfg[key] = LcdScreenConfig[key];
        }
        return cfg;
    }

    function findMaster() {
        return findLcdMasterComp(LcdScreenConfig.MASTER_COMP_NAME);
    }

    function requireMaster() {
        var master = findMaster();
        if (!master) throw new Error("Build the LCD Screen first.");
        return master;
    }

    function requireRig(master) {
        var rigNull = findLcdControlsNull(master);
        if (!rigNull) throw new Error("LCD CONTROLS null was not found.");
        return rigNull;
    }

    function controlProperty(rigNull, name) {
        var effect = rigNull.property("ADBE Effect Parade").property(name);
        if (!effect) throw new Error("Control not found: " + name);
        return effect.property(1);
    }

    function clampNumber(value, minValue, maxValue) {
        return Math.max(minValue, Math.min(maxValue, value));
    }

    function formatNumber(value) {
        var rounded = Math.round(Number(value) * 100) / 100;
        return String(rounded);
    }

    var win;
    try {
        win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", PANEL_TITLE, undefined, { resizeable: true });
    } catch (_) {
        win = new Window("palette", PANEL_TITLE, undefined, { resizeable: true });
    }
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 7;
    win.margins = 10;

    var titleRow = win.add("group");
    titleRow.orientation = "column";
    titleRow.alignChildren = ["fill", "top"];
    titleRow.add("statictext", undefined, "Physical LCD macro camera");
    var statusText = titleRow.add("statictext", undefined, "Ready");

    var logPanel = null;
    var logList = null;

    function setStatus(message, color) {
        statusText.text = message;
        try {
            var graphics = statusText.graphics;
            graphics.foregroundColor = graphics.newPen(
                graphics.PenType.SOLID_COLOR,
                color || [0.9, 0.9, 0.9],
                1
            );
        } catch (_) {}
    }

    function pushLog(message) {
        if (!logList) return;
        var item = logList.add("item", nowStamp() + "  " + message);
        if (logList.items.length > 30) logList.remove(logList.items[0]);
        try { logList.selection = item; } catch (_) {}
    }

    function runAction(label, fn) {
        var step = label;
        var compBefore = null;
        try {
            compBefore = (app.project && app.project.activeItem instanceof CompItem)
                ? app.project.activeItem
                : null;
        } catch (_) {}

        beginScript(label, compBefore);
        try {
            app.beginUndoGroup(label);
            var result = fn();
            app.endUndoGroup();

            var compAfter = null;
            try {
                compAfter = (app.project && app.project.activeItem instanceof CompItem)
                    ? app.project.activeItem
                    : compBefore;
            } catch (_) {
                compAfter = compBefore;
            }
            writeResult("success", step, null, compAfter);
            setStatus(label + " complete", [0.2, 0.75, 0.35]);
            pushLog(label + " complete");
            return result;
        } catch (e) {
            try { app.endUndoGroup(); } catch (_) {}
            writeResult("error", step, e, compBefore);
            setStatus(label + " failed", [0.85, 0.2, 0.2]);
            pushLog(label + " failed: " + e.message);
            alert(label + " failed.\n\n" + e.toString());
            return null;
        }
    }

    var actionsPanel = win.add("panel", undefined, "Actions");
    actionsPanel.orientation = "column";
    actionsPanel.alignChildren = ["fill", "top"];
    actionsPanel.margins = 8;

    var sourceRow = actionsPanel.add("group");
    sourceRow.add("statictext", undefined, "Source");
    var sourceDropdown = sourceRow.add("dropdownlist", undefined, []);
    sourceDropdown.preferredSize.width = 210;
    var refreshSourceBtn = sourceRow.add("button", undefined, "Refresh");

    function refreshSourceList() {
        var selectedName = sourceDropdown.selection ? sourceDropdown.selection.text : "";
        sourceDropdown.removeAll();
        var selectedIndex = -1;
        var count = 0;
        if (app.project) {
            for (var i = 1; i <= app.project.numItems; i++) {
                var item = app.project.item(i);
                if (!(item instanceof FootageItem)) continue;
                sourceDropdown.add("item", item.name);
                if (item.name === selectedName) selectedIndex = count;
                count++;
            }
        }
        if (count > 0) sourceDropdown.selection = selectedIndex >= 0 ? selectedIndex : 0;
    }

    function resolveSource() {
        if (!sourceDropdown.selection) return null;
        var selectedName = sourceDropdown.selection.text;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof FootageItem && item.name === selectedName) return item;
        }
        return null;
    }

    var buildRow = actionsPanel.add("group");
    var buildBtn = buildRow.add("button", undefined, "Build");
    var rebuildBtn = buildRow.add("button", undefined, "Rebuild Structure");
    var renderBtn = buildRow.add("button", undefined, "Render Previews");

    var presetRow = actionsPanel.add("group");
    presetRow.add("statictext", undefined, "Preset");
    var presetDropdown = presetRow.add("dropdownlist", undefined, getLcdPresetNames());
    presetDropdown.preferredSize.width = 180;
    presetDropdown.selection = LcdScreenPresetOrder.length - 1;
    var applyPresetBtn = presetRow.add("button", undefined, "Apply");

    var qualityRow = actionsPanel.add("group");
    qualityRow.add("statictext", undefined, "Quality");
    var qualityDropdown = qualityRow.add("dropdownlist", undefined, ["Draft", "Normal", "Full"]);
    qualityDropdown.selection = 2;
    var applyQualityBtn = qualityRow.add("button", undefined, "Apply");
    var loadCurrentBtn = qualityRow.add("button", undefined, "Load Current");

    function buildFromPanel(rebuild) {
        var existing = findMaster();
        if (existing && !rebuild) {
            throw new Error("LCD Screen already exists. Use Rebuild Structure to replace managed comps.");
        }
        var source = resolveSource();
        if (!source) throw new Error("Import and select a footage item first.");
        var cfg = cloneConfig();
        cfg.PRESET = presetDropdown.selection
            ? presetDropdown.selection.text
            : "Static Default";
        var result = buildLcdScreen(source, cfg);
        applyLcdQuality(
            result.master.comp,
            qualityDropdown.selection ? qualityDropdown.selection.text : "Full"
        );
        try { result.master.comp.openInViewer(); } catch (_) {}
        refreshControlUi();
        pushLog("Built " + result.master.comp.name + " with " + cfg.PRESET);
        return result;
    }

    refreshSourceBtn.onClick = function () { refreshSourceList(); };
    buildBtn.onClick = function () {
        runAction("Build LCD Screen", function () { return buildFromPanel(false); });
    };
    rebuildBtn.onClick = function () {
        runAction("Rebuild LCD Structure", function () { return buildFromPanel(true); });
    };
    applyPresetBtn.onClick = function () {
        runAction("Apply LCD Preset", function () {
            var master = requireMaster();
            var rigNull = requireRig(master);
            var name = presetDropdown.selection
                ? presetDropdown.selection.text
                : "Static Default";
            var report = applyPreset(name, rigNull);
            if (report.createdCompCount !== 0) {
                throw new Error("Preset unexpectedly created a composition.");
            }
            refreshControlUi();
            pushLog(name + ": " + report.intent);
            return report;
        });
    };
    applyQualityBtn.onClick = function () {
        runAction("Apply LCD Quality", function () {
            var report = applyLcdQuality(
                requireMaster(),
                qualityDropdown.selection ? qualityDropdown.selection.text : "Full"
            );
            refreshControlUi();
            return report;
        });
    };
    renderBtn.onClick = function () {
        runAction("Render LCD Preset Previews", function () {
            var master = requireMaster();
            var rigNull = requireRig(master);
            var entryFile = new File($.fileName);
            var report = renderLcdStates(
                master,
                rigNull,
                "m6",
                getLcdStateSet("m6"),
                getLcdPreviewFolder(entryFile)
            );
            pushLog("Rendered " + report.stateCount + " quality and preset previews");
            return report;
        });
    };

    var tabs = win.add("tabbedpanel");
    tabs.alignChildren = ["fill", "fill"];
    tabs.preferredSize = [480, 540];
    var tabSpecs = [
        { title: "Camera", groups: ["Camera", "Target"] },
        { title: "Focus", groups: ["Focus", "Framing", "Blur"] },
        { title: "Pixels", groups: ["Pixels", "Lens"] },
        { title: "Color", groups: ["Color"] },
        { title: "Motion", groups: ["Motion"] }
    ];
    var groupParents = {};

    for (var ts = 0; ts < tabSpecs.length; ts++) {
        var tab = tabs.add("tab", undefined, tabSpecs[ts].title);
        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.margins = 8;
        for (var tg = 0; tg < tabSpecs[ts].groups.length; tg++) {
            var groupName = tabSpecs[ts].groups[tg];
            var groupPanel = tab.add("panel", undefined, groupName);
            groupPanel.orientation = "column";
            groupPanel.alignChildren = ["fill", "top"];
            groupPanel.margins = 7;
            groupParents[groupName] = groupPanel;
        }
    }
    tabs.selection = 0;

    function writeControl(definition, value) {
        runAction("Set " + definition.name, function () {
            var master = requireMaster();
            var rigNull = requireRig(master);
            controlProperty(rigNull, definition.name).setValue(value);
            setResultData("lcdControlChange", {
                name: definition.name,
                value: value
            });
        });
    }

    function addNumericControl(parent, definition) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var label = row.add("statictext", undefined, definition.name.substring(4));
        label.preferredSize.width = 125;
        var slider = row.add(
            "slider",
            undefined,
            Number(definition.value),
            Number(definition.min),
            Number(definition.max)
        );
        slider.preferredSize.width = 210;
        var input = row.add("edittext", undefined, formatNumber(definition.value));
        input.characters = 7;
        controlRows[definition.name] = {
            definition: definition,
            slider: slider,
            input: input
        };

        slider.onChanging = function () {
            input.text = formatNumber(slider.value);
        };
        slider.onChange = function () {
            var value = clampNumber(
                Number(slider.value),
                Number(definition.min),
                Number(definition.max)
            );
            input.text = formatNumber(value);
            writeControl(definition, value);
        };
        input.onChange = function () {
            var value = Number(input.text);
            if (isNaN(value)) value = Number(definition.value);
            value = clampNumber(value, Number(definition.min), Number(definition.max));
            input.text = formatNumber(value);
            slider.value = value;
            writeControl(definition, value);
        };
    }

    function addCheckboxControl(parent, definition) {
        var check = parent.add("checkbox", undefined, definition.name.substring(4));
        check.value = !!definition.value;
        controlRows[definition.name] = {
            definition: definition,
            checkbox: check
        };
        check.onClick = function () {
            writeControl(definition, check.value ? 1 : 0);
        };
    }

    function addColorControl(parent, definition) {
        var row = parent.add("group");
        row.alignChildren = ["left", "center"];
        var label = row.add("statictext", undefined, definition.name.substring(4));
        label.preferredSize.width = 125;
        var red = row.add("edittext", undefined, formatNumber(definition.value[0]));
        var green = row.add("edittext", undefined, formatNumber(definition.value[1]));
        var blue = row.add("edittext", undefined, formatNumber(definition.value[2]));
        red.characters = green.characters = blue.characters = 4;
        var pick = row.add("button", undefined, "Pick");
        var colorRow = {
            definition: definition,
            red: red,
            green: green,
            blue: blue,
            pick: pick
        };
        controlRows[definition.name] = colorRow;

        function currentColor() {
            return [
                clampNumber(Number(red.text) || 0, 0, 1),
                clampNumber(Number(green.text) || 0, 0, 1),
                clampNumber(Number(blue.text) || 0, 0, 1),
                1
            ];
        }
        function applyColor() {
            var color = currentColor();
            red.text = formatNumber(color[0]);
            green.text = formatNumber(color[1]);
            blue.text = formatNumber(color[2]);
            writeControl(definition, color);
        }
        red.onChange = green.onChange = blue.onChange = applyColor;
        pick.onClick = function () {
            var picked = $.colorPicker();
            if (picked < 0) return;
            red.text = formatNumber(((picked >> 16) & 255) / 255);
            green.text = formatNumber(((picked >> 8) & 255) / 255);
            blue.text = formatNumber((picked & 255) / 255);
            applyColor();
        };
    }

    for (var cd = 0; cd < controlDefinitions.length; cd++) {
        var definition = controlDefinitions[cd];
        if (definition.group === "Quality") continue;
        var parent = groupParents[definition.group];
        if (!parent) continue;
        if (definition.type === "checkbox") {
            addCheckboxControl(parent, definition);
        } else if (definition.type === "color") {
            addColorControl(parent, definition);
        } else {
            addNumericControl(parent, definition);
        }
    }

    function setRowValue(row, value) {
        if (row.checkbox) {
            row.checkbox.value = Number(value) >= 0.5;
        } else if (row.red) {
            row.red.text = formatNumber(value[0]);
            row.green.text = formatNumber(value[1]);
            row.blue.text = formatNumber(value[2]);
        } else {
            row.slider.value = Number(value);
            row.input.text = formatNumber(value);
        }
    }

    function refreshControlUi() {
        var master = findMaster();
        if (!master) return false;
        var rigNull = findLcdControlsNull(master);
        if (!rigNull) return false;
        for (var name in controlRows) {
            if (!controlRows.hasOwnProperty(name)) continue;
            try {
                setRowValue(controlRows[name], controlProperty(rigNull, name).value);
            } catch (_) {}
        }
        try {
            qualityDropdown.selection = getLcdQualityLevel(
                controlProperty(rigNull, "QUAL Level").value
            );
        } catch (_) {}
        return true;
    }

    loadCurrentBtn.onClick = function () {
        runAction("Load LCD Controls", function () {
            if (!refreshControlUi()) throw new Error("Build the LCD Screen first.");
        });
    };

    logPanel = win.add("panel", undefined, "Activity");
    logPanel.orientation = "column";
    logPanel.alignChildren = ["fill", "fill"];
    logPanel.margins = 7;
    logPanel.preferredSize.height = 90;
    logList = logPanel.add("listbox", undefined, [], { multiselect: false });
    logList.preferredSize.height = 60;

    refreshSourceList();
    refreshControlUi();
    pushLog("Panel loaded");

    win.onResizing = win.onResize = function () {
        this.layout.resize();
    };
    if (win instanceof Window) {
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
    }
})(this);
