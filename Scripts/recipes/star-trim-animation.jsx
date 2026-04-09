#include "../lib/io.jsxinc"
#include "../lib/prop-walker.jsxinc"
#include "../lib/result-writer.jsxinc"

function ensure(value, message) {
    if (!value) {
        throw new Error(message);
    }
    return value;
}

(function () {
    var step = "init";
    var comp = app.project.activeItem;

    beginScript("star-trim-animation.jsx", comp);

    if (!comp || !(comp instanceof CompItem)) {
        writeResult("error", step, "No active composition found.", null);
        alert("Open a composition before running this script.");
        return;
    }

    app.beginUndoGroup("Create Star Trim");

    try {
        step = "add shape layer";
        var starLayer = comp.layers.addShape();
        starLayer.name = "Animated Star Trim";
        starLayer.property("Transform").property("Position").setValue([
            comp.width / 2,
            comp.height / 2
        ]);

        step = "get root contents";
        var contents = ensure(
            starLayer.property("ADBE Root Vectors Group"),
            "Failed to get root contents"
        );
        step = "add star group";
        var starGroup = ensure(
            contents.addProperty("ADBE Vector Group"),
            "Failed to add star group"
        );
        starGroup.name = "Star";

        step = "get star vectors";
        var vectors = ensure(
            starGroup.property("ADBE Vectors Group"),
            "Failed to get star vectors"
        );
        step = "add star path";
        var starPath = ensure(
            vectors.addProperty("ADBE Vector Shape - Star"),
            "Failed to add star path"
        );
        starPath.property("ADBE Vector Star Points").setValue(5);
        starPath.property("ADBE Vector Star Inner Radius").setValue(60);
        starPath.property("ADBE Vector Star Outer Radius").setValue(120);
        starPath.property("ADBE Vector Star Inner Roundness").setValue(20);
        starPath.property("ADBE Vector Star Outer Roundness").setValue(10);

        step = "add stroke";
        var stroke = ensure(
            vectors.addProperty("ADBE Vector Graphic - Stroke"),
            "Failed to add stroke"
        );
        stroke.property("ADBE Vector Stroke Color").setValue([1, 0.6, 0.1, 1]);
        stroke.property("ADBE Vector Stroke Width").setValue(12);
        stroke.property("ADBE Vector Stroke Line Cap").setValue(2);

        step = "add fill";
        var fill = ensure(
            vectors.addProperty("ADBE Vector Graphic - Fill"),
            "Failed to add fill"
        );
        fill.property("ADBE Vector Fill Color").setValue([0, 0, 0, 1]);
        fill.property("ADBE Vector Fill Opacity").setValue(0);

        step = "add trim paths";
        var trim = ensure(
            contents.addProperty("ADBE Vector Filter - Trim"),
            "Failed to add trim paths"
        );
        step = "set trim end";
        var endProp = ensure(
            trim.property("ADBE Vector Trim End"),
            "Failed to get trim end"
        );
        endProp.setValueAtTime(0, 0);
        endProp.setValueAtTime(1, 100);

        step = "set trim start";
        var startProp = ensure(
            trim.property("ADBE Vector Trim Start"),
            "Failed to get trim start"
        );
        startProp.setValue(0);

        writeResult("success", step, null, comp);
    } catch (e) {
        writeResult("error", step, e, comp);
        alert("Script error at step [" + step + "]:\n" + e.message);
    } finally {
        app.endUndoGroup();
    }
})();
