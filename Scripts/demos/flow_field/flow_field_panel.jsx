/**
 * flow_field_panel.jsx
 *
 * Dockable ScriptUI panel for generating flow-field line art.
 */

#include "../../lib/helpers.jsxinc"
#include "flow_field_engine.jsxinc"
#include "flow_field_builder.jsxinc"

(function (thisObj) {
    var PANEL_TITLE = "Flow Field Generator";
    var latestComp = null;
    var latestSeed = 1000;

    function ensureProject() {
        if (!app.project) {
            throw new Error("Open After Effects with a project loaded first.");
        }
        return app.project;
    }

    function isValidComp(comp) {
        try {
            return !!(comp && comp instanceof CompItem && comp.name);
        } catch (_) {
            return false;
        }
    }

    function nowStamp() {
        var d = new Date();
        function pad(n) {
            return (n < 10 ? "0" : "") + n;
        }
        return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    function addSliderRow(parent, label, min, max, defaultVal, decimalPlaces) {
        var row = parent.add("group");
        var labelText = row.add("statictext", undefined, label);
        var slider = row.add("slider", undefined, defaultVal, min, max);
        var valueText = row.add("statictext", undefined, defaultVal.toFixed(decimalPlaces));
        row.orientation = "row";
        row.alignChildren = ["fill", "center"];
        labelText.characters = 12;
        slider.preferredSize.width = 160;
        valueText.characters = 6;
        slider.onChanging = function () {
            valueText.text = slider.value.toFixed(decimalPlaces);
        };
        return { slider: slider, valueText: valueText };
    }

    var win;
    try {
        win = (thisObj instanceof Panel) ? thisObj :
            new Window("palette", PANEL_TITLE, undefined, { resizeable: true });
    } catch (_) {
        win = new Window("palette", PANEL_TITLE, undefined, { resizeable: true });
    }

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 12;

    var header = win.add("panel", undefined, PANEL_TITLE);
    header.orientation = "column";
    header.alignChildren = ["fill", "top"];
    header.margins = 10;
    header.add("statictext", undefined, "Perlin noise-driven streamline art with live expression controls.");

    var statusText = win.add("statictext", undefined, "Ready");
    statusText.alignment = ["fill", "top"];

    function setStatus(message, color) {
        statusText.text = message;
        try {
            var graphics = statusText.graphics;
            graphics.foregroundColor = graphics.newPen(graphics.PenType.SOLID_COLOR, color || [0.92, 0.92, 0.92], 1);
        } catch (_) {}
    }

    function getLatestControlLayer() {
        if (!isValidComp(latestComp)) {
            return null;
        }
        return latestComp.layer(CTRL.LAYER_NAME);
    }

    function syncLiveControl(effectName, value) {
        var controlLayer = getLatestControlLayer();
        if (!controlLayer) {
            setStatus("Generate a flow field first to use live controls.", [0.9, 0.45, 0.15]);
            return;
        }
        setControlValue(controlLayer, effectName, value);
        setStatus("Updated " + effectName + " on " + latestComp.name, [0.2, 0.75, 0.35]);
    }

    function selectedColorMode() {
        if (colorWarm.value) return 1;
        if (colorCool.value) return 2;
        if (colorRainbow.value) return 3;
        return 0;
    }

    function readGenerationSettings() {
        return {
            turbulence: turbulenceRow.slider.value,
            density: Math.round(densityRow.slider.value),
            lineLength: Math.round(lineLengthRow.slider.value),
            speed: speedRow.slider.value,
            colorMode: selectedColorMode()
        };
    }

    function updateControlLayerFromPanel(controlLayer) {
        var settings = readGenerationSettings();
        setControlValue(controlLayer, CTRL.TURBULENCE, settings.turbulence);
        setControlValue(controlLayer, CTRL.DENSITY, settings.density);
        setControlValue(controlLayer, CTRL.LINE_LENGTH, settings.lineLength);
        setControlValue(controlLayer, CTRL.SPEED, settings.speed);
        setControlValue(controlLayer, CTRL.COLOR_MODE, settings.colorMode);
        return settings;
    }

    function nextSeed() {
        latestSeed += 97;
        return latestSeed;
    }

    function runAction(label, fn) {
        try {
            app.beginUndoGroup(label);
            var result = fn();
            app.endUndoGroup();
            return result;
        } catch (e) {
            try { app.endUndoGroup(); } catch (_) {}
            setStatus(label + " failed: " + e.toString(), [0.85, 0.2, 0.2]);
            alert(label + " failed.\n\n" + e.toString());
            return null;
        }
    }

    var generateBtn = win.add("button", undefined, "Generate Flow Field");

    var generationPanel = win.add("panel", undefined, "Generation Controls");
    generationPanel.orientation = "column";
    generationPanel.alignChildren = ["fill", "top"];
    generationPanel.margins = 10;

    var turbulenceRow = addSliderRow(generationPanel, "Turbulence", 0.5, 10, 4.0, 1);
    var densityRow = addSliderRow(generationPanel, "Density", 50, 300, 150, 0);
    var lineLengthRow = addSliderRow(generationPanel, "Line Length", 50, 300, 150, 0);

    var livePanel = win.add("panel", undefined, "Live Controls");
    livePanel.orientation = "column";
    livePanel.alignChildren = ["fill", "top"];
    livePanel.margins = 10;

    var speedRow = addSliderRow(livePanel, "Speed", 0.5, 5, 2.0, 1);

    var colorRow = livePanel.add("group");
    colorRow.orientation = "row";
    colorRow.alignChildren = ["left", "center"];
    colorRow.add("statictext", undefined, "Color");
    var colorMono = colorRow.add("radiobutton", undefined, "Mono");
    var colorWarm = colorRow.add("radiobutton", undefined, "Warm");
    var colorCool = colorRow.add("radiobutton", undefined, "Cool");
    var colorRainbow = colorRow.add("radiobutton", undefined, "Rainbow");
    colorMono.value = true;

    var regenerateBtn = win.add("button", undefined, "Regenerate");
    regenerateBtn.enabled = false;

    var activityPanel = win.add("panel", undefined, "Activity");
    activityPanel.orientation = "column";
    activityPanel.alignChildren = ["fill", "fill"];
    activityPanel.margins = 10;
    activityPanel.preferredSize.height = 120;
    var logList = activityPanel.add("listbox", undefined, [], { multiselect: false });
    logList.preferredSize.height = 88;

    function pushLog(message) {
        var item = logList.add("item", nowStamp() + "  " + message);
        if (logList.items.length > 18) {
            logList.remove(logList.items[0]);
        }
        try { logList.selection = item; } catch (_) {}
    }

    function afterGenerate(count) {
        regenerateBtn.enabled = true;
        setStatus("Complete! " + count + " streamlines created.", [0.2, 0.75, 0.35]);
        pushLog("Built " + count + " streamlines in " + latestComp.name);
    }

    generateBtn.onClick = function () {
        runAction("Generate Flow Field", function () {
            var settings = readGenerationSettings();
            var seed = nextSeed();
            var controlLayer;
            var count;

            ensureProject();
            setStatus("Generating " + settings.density + " streamlines...", [0.96, 0.75, 0.2]);
            try { win.update(); } catch (_) {}

            latestComp = createFlowFieldComp();
            controlLayer = addFlowControlLayer(latestComp, settings);
            updateControlLayerFromPanel(controlLayer);
            count = buildStreamlineLayers(latestComp, controlLayer, { seed: seed });
            wireFlowExpressions(latestComp, count);
            afterGenerate(count);
        });
    };

    regenerateBtn.onClick = function () {
        runAction("Regenerate Flow Field", function () {
            var controlLayer;
            var settings;
            var count;

            if (!isValidComp(latestComp)) {
                throw new Error("Generate a comp first.");
            }

            controlLayer = getLatestControlLayer();
            if (!controlLayer) {
                throw new Error("Flow Control layer not found in the latest comp.");
            }

            settings = updateControlLayerFromPanel(controlLayer);
            setStatus("Generating " + settings.density + " streamlines...", [0.96, 0.75, 0.2]);
            try { win.update(); } catch (_) {}

            removeStreamlineLayers(latestComp);
            count = buildStreamlineLayers(latestComp, controlLayer, { seed: nextSeed() });
            wireFlowExpressions(latestComp, count);
            afterGenerate(count);
        });
    };

    speedRow.slider.onChanging = function () {
        speedRow.valueText.text = speedRow.slider.value.toFixed(1);
        syncLiveControl(CTRL.SPEED, speedRow.slider.value);
    };

    function onColorClick() {
        syncLiveControl(CTRL.COLOR_MODE, selectedColorMode());
    }

    colorMono.onClick = onColorClick;
    colorWarm.onClick = onColorClick;
    colorCool.onClick = onColorClick;
    colorRainbow.onClick = onColorClick;

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
