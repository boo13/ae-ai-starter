// Audio Spectrum Plugin — Main Entry Point
// Run in After Effects via File > Scripts > Run Script File
//
// 1. Reads config from example_config.jsxinc
// 2. Removes any existing AS_ layers (safe for re-runs)
// 3. Creates hidden data layer (AS_DATA) with Audio Spectrum + Mosaic
// 4. Creates N bar shape layers with sampleImage() expressions
//
// Bars animate automatically via expressions — no keyframes needed.

#include "../../Scripts/lib/io.jsxinc"
#include "../../Scripts/lib/prop-walker.jsxinc"
#include "../../Scripts/lib/result-writer.jsxinc"
#include "example_config.jsxinc"
#include "lib/cleaner.jsxinc"
#include "lib/data-layer.jsxinc"
#include "lib/expressions.jsxinc"
#include "lib/bar-factory.jsxinc"

(function () {
    var step = "init";

    // Find target composition
    var comp = null;
    for (var i = 1; i <= app.project.items.length; i++) {
        var item = app.project.items[i];
        if (item instanceof CompItem && item.name === AudioSpectrumConfig.COMP_NAME) {
            comp = item;
            break;
        }
    }
    if (!comp) {
        alert("Could not find comp: " + AudioSpectrumConfig.COMP_NAME);
        return;
    }

    beginScript("setup.jsx", comp);

    app.beginUndoGroup("Audio Spectrum Setup");
    try {
        step = "clean existing layers";
        var removed = cleanAudioSpectrum(comp);

        step = "create data layer";
        var dataLayer = createDataLayer(comp, AudioSpectrumConfig);

        step = "create bars";
        createBars(comp, dataLayer, AudioSpectrumConfig);

        app.endUndoGroup();
        writeResult("success", step, null, comp);
        alert(
            "Audio Spectrum created!\n\n" +
            "Bars: " + AudioSpectrumConfig.NUM_BARS + "\n" +
            "Mode: " + AudioSpectrumConfig.DISPLAY_MODE + "\n" +
            "Color: " + AudioSpectrumConfig.COLOR_MODE + "\n" +
            (removed > 0 ? "Cleaned " + removed + " old layers.\n" : "") +
            "\nPress spacebar to preview."
        );
    } catch (e) {
        app.endUndoGroup();
        writeResult("error", step, e, comp);
        alert("Error at step [" + step + "]: " + e.message + "\nLine: " + e.line);
    }
})();
