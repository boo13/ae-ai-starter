#include "lib/io.jsxinc"
#include "lib/prop-walker.jsxinc"
#include "lib/result-writer.jsxinc"

(function () {
    var step = "init";
    var comp = app.project.activeItem;
    beginScript("filmDamageTreatment.jsx", comp);
    app.beginUndoGroup("Film Damage Treatment");
    try {
        if (!(comp && comp instanceof CompItem)) {
            throw new Error("Select a composition before running filmDamageTreatment.jsx");
        }

        step = "create adjustment layers";
        var width = comp.width;
        var height = comp.height;
        var pixelAspect = comp.pixelAspect;
        var duration = comp.duration;
        var targetOrder = ["GATE WEAVE", "GRAIN", "FLICKER", "COLOR GRADE"];
        var added = {};

        for (var idx = targetOrder.length - 1; idx >= 0; idx -= 1) {
            var layerName = targetOrder[idx];
            var solid = comp.layers.addSolid([1, 1, 1], layerName, width, height, pixelAspect, duration);
            solid.adjustmentLayer = true;
            solid.blendingMode = BlendingMode.NORMAL;
            added[layerName] = solid;
        }

        step = "apply gate weave transform";
        var gateLayer = added["GATE WEAVE"];
        var gateFx = gateLayer.property("ADBE Effect Parade").addProperty("ADBE Geometry");
        gateFx.property("ADBE Geometry-0011").setValue(1); // Uniform Scale on
        gateFx.property("ADBE Geometry-0003").setValue(101.5);
        gateFx.property("ADBE Geometry-0002").expression = "x = wiggle(12, .5)[0]; y = wiggle(3, .15, 3, 4)[1]; [x, y];";

        step = "apply grain stack";
        var grainLayer = added["GRAIN"];
        var noiseFx = grainLayer.property("ADBE Effect Parade").addProperty("ADBE Noise");
        noiseFx.property("ADBE Noise-0001").setValue(10);

        var blurFx = grainLayer.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
        blurFx.property("ADBE Gaussian Blur 2-0001").setValue(6);

        var unsharpFx = grainLayer.property("ADBE Effect Parade").addProperty("ADBE Unsharp Mask");
        unsharpFx.property("ADBE Unsharp Mask-0001").setValue(300);
        unsharpFx.property("ADBE Unsharp Mask-0002").setValue(3);

        step = "add flicker exposure";
        var flickerLayer = added["FLICKER"];
        var exposureFx = flickerLayer.property("ADBE Effect Parade").addProperty("ADBE Exposure");
        exposureFx.property("ADBE Exposure-0003").expression = "wiggle(12, .1)";

        step = "build color grade stack";
        var colorLayer = added["COLOR GRADE"];
        var colorParade = colorLayer.property("ADBE Effect Parade");

        var glowFx = colorParade.addProperty("ADBE Glo2");
        glowFx.property("ADBE Glo2-0002").setValue(50);
        glowFx.property("ADBE Glo2-0003").setValue(500);
        glowFx.property("ADBE Glo2-0004").setValue(0.2);
        glowFx.property("ADBE Glo2-0006").setValue(2); // Screen

        var vignetteFx = colorParade.addProperty("CS Vignette");
        vignetteFx.property("CS Vignette-0001").setValue(50);

        var levelsFx = colorParade.addProperty("ADBE Easy Levels");
        levelsFx.property("ADBE Easy Levels-0006").setValue(10);
        levelsFx.property("ADBE Easy Levels-0007").setValue(235);

        step = "done";
        writeResult("success", step, null, comp);
    } catch (e) {
        writeResult("error", step, e, comp);
        alert("Error at [" + step + "]: " + e.message);
    } finally {
        app.endUndoGroup();
    }
})();
