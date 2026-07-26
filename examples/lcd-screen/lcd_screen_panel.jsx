/**
 * lcd_screen_panel.jsx
 *
 * Dockable ScriptUI panel for the LCD Screen example. Install by symlinking this file
 * into AE's ScriptUI Panels folder, or run once via File > Scripts > Run Script File.
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
#include "lib/build.jsxinc"

(function (thisObj) {
    var PANEL_TITLE = "LCD Screen";

    function nowStamp() {
        var d = new Date();
        function pad(n) { return (n < 10 ? "0" : "") + n; }
        return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
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
    header.add("statictext", undefined, "Builds a physical LCD-monitor mockup from a screen recording.");
    header.add("statictext", undefined, "Build once below, then use Live Controls to tweak without rebuilding.");

    var statusText = win.add("statictext", undefined, "Ready");
    statusText.alignment = ["fill", "top"];

    function setStatus(msg, color) {
        statusText.text = msg;
        try {
            var graphics = statusText.graphics;
            var pen = graphics.newPen(graphics.PenType.SOLID_COLOR, color || [0.9, 0.9, 0.9], 1);
            graphics.foregroundColor = pen;
        } catch (_) {}
    }

    function runAction(label, fn) {
        var step = label;
        var compBefore = null;
        try {
            compBefore = (app.project && app.project.activeItem instanceof CompItem) ? app.project.activeItem : null;
        } catch (_) {}

        beginScript(label, compBefore);

        try {
            app.beginUndoGroup(label);
            var result = fn();
            app.endUndoGroup();

            var compAfter = null;
            try {
                compAfter = (app.project && app.project.activeItem instanceof CompItem) ? app.project.activeItem : compBefore;
            } catch (_) { compAfter = compBefore; }

            writeResult("success", step, null, compAfter);
            setStatus(label + " complete", [0.2, 0.75, 0.35]);
            pushLog(label + " complete");
            return result;
        } catch (e) {
            try { app.endUndoGroup(); } catch (_) {}
            writeResult("error", step, e, compBefore);
            setStatus(label + " failed: " + e.toString(), [0.85, 0.2, 0.2]);
            pushLog(label + " failed");
            alert(label + " failed.\n\n" + e.toString());
            return null;
        }
    }

    // --- Build ---
    var buildPanel = win.add("panel", undefined, "Build");
    buildPanel.orientation = "column";
    buildPanel.alignChildren = ["fill", "top"];
    buildPanel.margins = 10;

    var sourceRow = buildPanel.add("group");
    sourceRow.add("statictext", undefined, "Source");
    var sourceDropdown = sourceRow.add("dropdownlist", undefined, []);
    sourceDropdown.preferredSize.width = 200;
    var refreshBtn = sourceRow.add("button", undefined, "Refresh");

    function refreshSourceList() {
        sourceDropdown.removeAll();
        var count = 0;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof FootageItem) { sourceDropdown.add("item", item.name); count++; }
        }
        if (count > 0) sourceDropdown.selection = 0;
    }
    refreshBtn.onClick = function () { refreshSourceList(); };
    refreshSourceList();

    var presetRow = buildPanel.add("group");
    presetRow.add("statictext", undefined, "Preset");
    var presetDropdown = presetRow.add("dropdownlist", undefined, []);
    for (var pName in LcdScreenPresets) {
        if (LcdScreenPresets.hasOwnProperty(pName)) presetDropdown.add("item", pName);
    }
    presetDropdown.selection = 0;

    var buildBtn = buildPanel.add("button", undefined, "Build / Rebuild");

    function resolveSelectedSource() {
        if (!sourceDropdown.selection) return null;
        var name = sourceDropdown.selection.text;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof FootageItem && item.name === name) return item;
        }
        return null;
    }

    function cloneConfig() {
        var cfg = {};
        for (var k in LcdScreenConfig) { if (LcdScreenConfig.hasOwnProperty(k)) cfg[k] = LcdScreenConfig[k]; }
        return cfg;
    }

    buildBtn.onClick = function () {
        runAction("Build LCD Screen", function () {
            var source = resolveSelectedSource();
            if (!source) throw new Error("Select a source footage item first (or import one and click Refresh).");
            var cfg = cloneConfig();
            cfg.PRESET = presetDropdown.selection ? presetDropdown.selection.text : LcdScreenConfig.PRESET;
            var result = buildLcdScreen(source, cfg);
            try { result.master.comp.openInViewer(); } catch (_) {}
            pushLog("Built " + result.cfg.MASTER_COMP_NAME + " (" + result.cfg.PRESET + ")");
            if (result.lens && result.lens.caDowngraded) {
                pushLog("Chromatic aberration: \"lens\" mode downgraded to \"subtle\" on the LENS adjustment layer");
            }
            if (result.camera && result.camera.autoZoom) {
                pushLog(result.camera.autoZoom.staticScale !== null
                    ? "Auto zoom: static " + Math.round(result.camera.autoZoom.staticScale) + "%"
                    : "Auto zoom: " + result.camera.autoZoom.keyframes + " keyframes");
            }
        });
    };

    // --- Camera ---
    var cameraPanel = win.add("panel", undefined, "Camera");
    cameraPanel.orientation = "column";
    cameraPanel.alignChildren = ["fill", "top"];
    cameraPanel.margins = 10;

    var camRow1 = cameraPanel.add("group");
    camRow1.add("statictext", undefined, "Distance");
    var distInput = camRow1.add("edittext", undefined, String(LcdScreenConfig.CAMERA_DISTANCE));
    distInput.characters = 6;
    camRow1.add("statictext", undefined, "Zoom");
    var zoomInput = camRow1.add("edittext", undefined, String(LcdScreenConfig.CAMERA_ZOOM));
    zoomInput.characters = 6;

    var camRow2 = cameraPanel.add("group");
    camRow2.add("statictext", undefined, "Orbit");
    var orbitInput = camRow2.add("edittext", undefined, String(LcdScreenConfig.CAMERA_ORBIT_DEG));
    orbitInput.characters = 5;
    camRow2.add("statictext", undefined, "Tilt");
    var tiltInput = camRow2.add("edittext", undefined, String(LcdScreenConfig.CAMERA_TILT_DEG));
    tiltInput.characters = 5;

    var camRow3 = cameraPanel.add("group");
    var autoZoomCheck = camRow3.add("checkbox", undefined, "Auto Zoom");
    autoZoomCheck.value = !!LcdScreenConfig.AUTO_ZOOM;

    var camButtons = cameraPanel.add("group");
    var rebuildCameraBtn = camButtons.add("button", undefined, "Rebuild Camera");
    var bakeAutoZoomBtn = camButtons.add("button", undefined, "Bake Auto Zoom");

    var CAMERA_RIG_LAYER_NAMES = ["LCD Camera", "AUTO ZOOM", "AUTO ZOOM GHOST (do not delete)"];

    rebuildCameraBtn.onClick = function () {
        runAction("Rebuild camera", function () {
            var master = findLcdMasterComp(LcdScreenConfig.MASTER_COMP_NAME);
            if (!master) throw new Error("Build the LCD Screen first.");
            var screenLayer = null;
            try { screenLayer = master.layer("LCD Screen"); } catch (_) {}
            if (!screenLayer) throw new Error("Could not find the \"LCD Screen\" layer -- rebuild from scratch.");

            for (var i = master.numLayers; i >= 1; i--) {
                var nm = master.layer(i).name;
                for (var r = 0; r < CAMERA_RIG_LAYER_NAMES.length; r++) {
                    if (nm === CAMERA_RIG_LAYER_NAMES[r]) { master.layer(i).remove(); break; }
                }
            }
            try { screenLayer.parent = null; } catch (_) {}

            var cfg = cloneConfig();
            cfg.CAMERA_DISTANCE = Number(distInput.text) || cfg.CAMERA_DISTANCE;
            cfg.CAMERA_ZOOM = Number(zoomInput.text) || cfg.CAMERA_ZOOM;
            cfg.CAMERA_ORBIT_DEG = Number(orbitInput.text) || 0;
            cfg.CAMERA_TILT_DEG = Number(tiltInput.text) || 0;
            cfg.AUTO_ZOOM = autoZoomCheck.value;

            var camera = buildCameraRig(master, screenLayer, cfg);

            // Rebuilding deletes the old camera, taking its Depth of Field / Aperture
            // expressions with it. Re-link them or those two live controls go dead.
            linkCameraControls(master, "LCD CONTROLS", camera);

            pushLog("Camera rebuilt: distance=" + cfg.CAMERA_DISTANCE + " orbit=" + cfg.CAMERA_ORBIT_DEG + " tilt=" + cfg.CAMERA_TILT_DEG);
            if (camera.autoZoom) {
                pushLog(camera.autoZoom.staticScale !== null
                    ? "Auto zoom: static " + Math.round(camera.autoZoom.staticScale) + "%"
                    : "Auto zoom: " + camera.autoZoom.keyframes + " keyframes");
            }
        });
    };

    bakeAutoZoomBtn.onClick = function () {
        runAction("Bake auto zoom", function () {
            var master = findLcdMasterComp(LcdScreenConfig.MASTER_COMP_NAME);
            if (!master) throw new Error("Build the LCD Screen first.");
            var zoomNull = null, ghost = null;
            try { zoomNull = master.layer("AUTO ZOOM"); } catch (_) {}
            try { ghost = master.layer("AUTO ZOOM GHOST (do not delete)"); } catch (_) {}
            if (!zoomNull || !ghost) throw new Error("Auto zoom rig not found -- click Rebuild Camera first.");
            var az = bakeAutoZoom(master, ghost, zoomNull, { paddingPercent: LcdScreenConfig.AUTO_ZOOM_PADDING_PERCENT });
            pushLog(az.staticScale !== null
                ? "Baked auto zoom: static " + Math.round(az.staticScale) + "% (camera is not moving)"
                : "Baked " + az.keyframes + " auto-zoom keyframes");
        });
    };

    // --- Live Controls ---
    var livePanel = win.add("panel", undefined, "Live Controls");
    livePanel.orientation = "column";
    livePanel.alignChildren = ["fill", "top"];
    livePanel.margins = 10;
    livePanel.add("statictext", undefined, "Edits the LCD CONTROLS null directly -- no rebuild needed.");

    var liveControls = [
        { label: "Lens Distortion", name: "LEN Distortion" },
        { label: "Chromatic Aberration", name: "LEN Chromatic Aberration" },
        { label: "Vignette", name: "LEN Vignette" },
        { label: "Bloom", name: "LEN Bloom" },
        { label: "Bloom Threshold", name: "LEN Bloom Threshold" },
        { label: "Grain", name: "LEN Grain" },
        { label: "Subpixel Amount", name: "PNL Subpixel Amount" },
        { label: "Scanline Amount", name: "PNL Scanline Amount" },
        { label: "Backlight Tint", name: "BKL Tint Amount" },
        { label: "Backlight Bleed", name: "BKL Bleed Amount" },
        { label: "Panel Mura", name: "BKL Mura" },
        { label: "Viewing Angle Falloff", name: "BKL View Angle Falloff" },
        { label: "Glass Reflection", name: "GLS Reflection" },
        { label: "Ambient Spill", name: "BDY Ambient Spill" },
        { label: "Aperture (DoF)", name: "FOC Aperture" }
    ];

    var liveInputs = {};
    for (var ci = 0; ci < liveControls.length; ci++) {
        var c = liveControls[ci];
        var row = livePanel.add("group");
        var lbl = row.add("statictext", undefined, c.label);
        lbl.preferredSize.width = 140;
        var input = row.add("edittext", undefined, "");
        input.characters = 6;
        liveInputs[c.name] = input;
    }

    var liveButtons = livePanel.add("group");
    var loadLiveBtn = liveButtons.add("button", undefined, "Load Current");
    var applyLiveBtn = liveButtons.add("button", undefined, "Apply");

    loadLiveBtn.onClick = function () {
        runAction("Load live control values", function () {
            var master = findLcdMasterComp(LcdScreenConfig.MASTER_COMP_NAME);
            if (!master) throw new Error("Build the LCD Screen first.");
            var rigNull = findLcdControlsNull(master);
            if (!rigNull) throw new Error("LCD CONTROLS null not found.");
            for (var name in liveInputs) {
                if (!liveInputs.hasOwnProperty(name)) continue;
                try {
                    var subProp = (name === "FOC Depth Of Field") ? "Checkbox" : "Slider";
                    var val = rigNull.effect(name).property(subProp).value;
                    liveInputs[name].text = String(val);
                } catch (_) {}
            }
            pushLog("Loaded current live control values");
        });
    };

    applyLiveBtn.onClick = function () {
        runAction("Apply live controls", function () {
            var master = findLcdMasterComp(LcdScreenConfig.MASTER_COMP_NAME);
            if (!master) throw new Error("Build the LCD Screen first.");
            var rigNull = findLcdControlsNull(master);
            if (!rigNull) throw new Error("LCD CONTROLS null not found.");
            var applied = 0;
            for (var name in liveInputs) {
                if (!liveInputs.hasOwnProperty(name)) continue;
                var text = liveInputs[name].text;
                if (text === "") continue;
                var num = Number(text);
                if (isNaN(num)) continue;
                try {
                    rigNull.effect(name).property("Slider").setValue(num);
                    applied++;
                } catch (_) {}
            }
            pushLog("Applied " + applied + " live control value(s)");
        });
    };

    // --- Render ---
    var renderPanel = win.add("panel", undefined, "Render");
    renderPanel.orientation = "column";
    renderPanel.alignChildren = ["fill", "top"];
    renderPanel.margins = 10;
    var renderButtons = renderPanel.add("group");
    var bakeExprBtn = renderButtons.add("button", undefined, "Bake Expressions");
    var previewBtn = renderButtons.add("button", undefined, "Render Preview Frames");

    bakeExprBtn.onClick = function () {
        runAction("Bake expressions", function () {
            var master = findLcdMasterComp(LcdScreenConfig.MASTER_COMP_NAME);
            if (!master) throw new Error("Build the LCD Screen first.");
            var count = bakeAllExpressions(master);
            pushLog("Baked " + count + " expression(s) to static values");
        });
    };

    previewBtn.onClick = function () {
        runAction("Render preview frames", function () {
            var master = findLcdMasterComp(LcdScreenConfig.MASTER_COMP_NAME);
            if (!master) throw new Error("Build the LCD Screen first.");
            var scriptFile = new File($.fileName);
            var repoRoot = scriptFile.parent.parent.parent; // examples/lcd-screen/ -> examples/ -> repo root
            var previewDir = new Folder(String(repoRoot.fsName) + "/Scripts/runs/preview");
            if (!previewDir.exists) previewDir.create();
            var frameCount = 5;
            for (var f = 0; f < frameCount; f++) {
                var t = (master.duration / (frameCount - 1)) * f;
                if (t >= master.duration) t = master.duration - master.frameDuration;
                var outFile = new File(previewDir.fsName + "/frame_" + ("000" + f).slice(-4) + ".png");
                master.saveFrameToPng(t, outFile);
            }
            pushLog("Wrote " + frameCount + " preview frames to " + previewDir.fsName);
        });
    };

    // --- Activity log ---
    var logPanel = win.add("panel", undefined, "Activity");
    logPanel.orientation = "column";
    logPanel.alignChildren = ["fill", "fill"];
    logPanel.margins = 10;
    logPanel.preferredSize.height = 140;
    var logList = logPanel.add("listbox", undefined, [], { multiselect: false });
    logList.preferredSize.height = 100;

    function pushLog(message) {
        var item = logList.add("item", nowStamp() + "  " + message);
        if (logList.items.length > 30) logList.remove(logList.items[0]);
        try { logList.selection = item; } catch (_) {}
    }

    win.onResizing = win.onResize = function () { this.layout.resize(); };

    setStatus("Ready", [0.9, 0.9, 0.9]);
    pushLog("Panel loaded");

    if (win instanceof Window) { win.center(); win.show(); }
    else { win.layout.layout(true); }
})(this);
