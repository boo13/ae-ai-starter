// LCD Screen -- Main Entry Point
// Run in After Effects via File > Scripts > Run Script File
//
// Builds a complete LCD-monitor mockup from a screen-recording footage item:
//   LCD_Content -> LCD_Panel (physical panel treatment) -> LCD_Screen (bezel + spill)
//   -> <MASTER_COMP_NAME> (3D camera rig + lens stack + control rig)
//
// 1. Resolves the source footage item (config, or the selected Project panel item)
// 2. Removes any previous LCD_* comps (safe for re-runs)
// 3. Applies the configured preset over example_config.jsxinc
// 4. Builds all four comps and wires the LCD CONTROLS expression rig
//
// After running, open <MASTER_COMP_NAME> and press spacebar to preview.

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
#include "lib/states.jsxinc"
#include "lib/probes.jsxinc"
#include "lib/build.jsxinc"

/**
 * Resolves the source footage item: by config name, else the selected Project panel
 * item, else the first FootageItem found in the project.
 */
function _lcd_resolveSource(cfg) {
    if (cfg.SOURCE_ITEM_NAME) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item.name === cfg.SOURCE_ITEM_NAME) return item;
        }
        return null;
    }
    if (app.project.selection && app.project.selection.length > 0) {
        for (var s = 0; s < app.project.selection.length; s++) {
            if (app.project.selection[s] instanceof FootageItem) return app.project.selection[s];
        }
    }
    for (var j = 1; j <= app.project.numItems; j++) {
        var it = app.project.item(j);
        if (it instanceof FootageItem) return it;
    }
    return null;
}

(function () {
    var step = "init";
    var entryFile = new File($.fileName);
    beginScript("setup.jsx", null);

    var source = _lcd_resolveSource(LcdScreenConfig);
    if (!source) {
        var sourceError = new Error("No source footage found. Import and select a screen recording, or set SOURCE_ITEM_NAME.");
        writeResult("error", "resolve source", sourceError, null);
        alert("LCD Screen: " + sourceError.message);
        return;
    }

    app.beginUndoGroup("LCD Screen Setup");
    try {
        step = "build";
        var result = buildLcdScreen(source, LcdScreenConfig);

        step = "run M1 probes";
        runLcdM1Probes({
            masterComp: result.master.comp,
            rigNull: result.rig["null"],
            scenePanelLayer: result.scene.panelLayer,
            masterSceneLayer: result.master.sceneLayer,
            exposureEffect: result.lens.exposure
        });

        step = "find M3 auto exposure extremes";
        var m3States = getLcdStateSet("m3");
        var exposureExtremes = findLcdAutoExposureExtremes(
            result.master.comp,
            result.rig["null"],
            result.lens.exposure
        );
        setLcdAutoExposureStateTimes(m3States, exposureExtremes);

        step = "render M3 acceptance states";
        var previewDir = getLcdPreviewFolder(entryFile);
        var stateReport = renderLcdStates(
            result.master.comp,
            result.rig["null"],
            "m3",
            m3States,
            previewDir
        );

        step = "open master comp";
        try { result.master.comp.openInViewer(); } catch (_) {}

        app.endUndoGroup();
        writeResult("success", step, null, result.master.comp);
        alert(
            "LCD Screen built!\n\n" +
            "Preset: " + (result.cfg.PRESET || "(none)") + "\n" +
            "Source: " + source.name + "\n" +
            (result.removedCount > 0 ? "Cleaned " + result.removedCount + " previous comp(s).\n" : "") +
            "Rendered " + stateReport.stateCount + " M3 acceptance frames.\n\n" +
            "Open \"" + result.cfg.MASTER_COMP_NAME + "\" and tweak LCD CONTROLS for live camera, focus, framing, pixel, and lens adjustments."
        );
    } catch (e) {
        try { app.endUndoGroup(); } catch (_) {}
        writeResult("error", step, e, null);
        alert("Error at step [" + step + "]: " + e.message + (e.line ? ("\nLine: " + e.line) : ""));
    }
})();
