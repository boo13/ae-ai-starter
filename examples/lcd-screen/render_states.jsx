// LCD Screen - Acceptance State Renderer
// Run in After Effects via File > Scripts > Run Script File.

#include "../../Scripts/lib/io.jsxinc"
#include "../../Scripts/lib/prop-walker.jsxinc"
#include "../../Scripts/lib/result-writer.jsxinc"
#include "example_config.jsxinc"
#include "lib/states.jsxinc"

var LCD_RENDER_MILESTONE = "m1";

(function () {
    var step = "init";
    var comp = null;
    var rigNull = null;
    var entryFile = new File($.fileName);

    beginScript("render_states.jsx", null);
    app.beginUndoGroup("Render LCD Acceptance States");
    try {
        step = "find tagged master";
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem &&
                item.name === LcdScreenConfig.MASTER_COMP_NAME &&
                item.comment === "ae:lcd-screen:v2") {
                comp = item;
                break;
            }
        }
        if (!comp) {
            throw new Error("Could not find the tagged comp: " + LcdScreenConfig.MASTER_COMP_NAME + ". Run setup.jsx first.");
        }

        step = "find controls";
        try { rigNull = comp.layer("LCD CONTROLS"); } catch (_) {}
        if (!rigNull) {
            throw new Error("LCD CONTROLS was not found in " + comp.name + ".");
        }

        step = "render states";
        var previewDir = getLcdPreviewFolder(entryFile);
        var states = getLcdStateSet(LCD_RENDER_MILESTONE);
        var report = renderLcdStates(comp, rigNull, LCD_RENDER_MILESTONE, states, previewDir);

        app.endUndoGroup();
        writeResult("success", step, null, comp);
        alert(
            "Rendered " + report.stateCount + " " + LCD_RENDER_MILESTONE.toUpperCase() +
            " acceptance frames to:\n" + report.previewDir +
            "\n\nWait for each PNG's IEND trailer before reviewing."
        );
    } catch (e) {
        try { app.endUndoGroup(); } catch (_) {}
        writeResult("error", step, e, comp);
        alert("Render states failed at [" + step + "]:\n" + e.message);
    }
})();
