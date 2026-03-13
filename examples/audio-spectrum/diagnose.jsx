// Audio Spectrum -- Post-Setup Diagnostic
// Run AFTER setup.jsx in AE with Main Comp selected.
//
// Validates: layer existence, effect properties, expression errors,
// and -- critically -- whether sampleImage() returns non-zero brightness.
//
// Output: diagnose_results.txt next to this script.

#include "example_config.jsxinc"

(function () {
    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;
    var outputFile = new File(scriptFolder.fsName + "/diagnose_results.txt");
    var results = [];
    var passed = 0;
    var failed = 0;
    var warnings = 0;

    function log(msg) { results.push(msg); }
    function logPass(test) { passed++; log("  PASS: " + test); }
    function logFail(test, detail) { failed++; log("  FAIL: " + test + (detail ? " -- " + detail : "")); }
    function logWarn(test, detail) { warnings++; log("  WARN: " + test + (detail ? " -- " + detail : "")); }
    function logSection(title) { log(""); log("=== " + title + " ==="); }

    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Select Main Comp first.");
        return;
    }

    log("Audio Spectrum -- Diagnostic Results");
    log("Date: " + new Date().toString());
    log("Comp: " + comp.name + " (" + comp.width + "x" + comp.height + ")");
    log("Config: NUM_BARS=" + AudioSpectrumConfig.NUM_BARS +
        ", DISPLAY_MODE=" + AudioSpectrumConfig.DISPLAY_MODE);

    // Wrap in undo group so guide layer test can be safely reverted
    app.beginUndoGroup("Audio Spectrum Diagnostic");

    // =======================================================
    // 1. Layer existence
    // =======================================================
    logSection("1. Layer Existence");

    var dataLayer = null;
    try { dataLayer = comp.layer("AS_DATA"); } catch (e) {}
    if (dataLayer) {
        logPass("AS_DATA layer found at index " + dataLayer.index);
    } else {
        logFail("AS_DATA layer not found", "Run setup.jsx first");
    }

    var bar1 = null;
    try { bar1 = comp.layer("AS BAR 1"); } catch (e) {}
    if (bar1) {
        logPass("AS BAR 1 layer found at index " + bar1.index);
    } else {
        logFail("AS BAR 1 layer not found", "Run setup.jsx first");
    }

    if (!dataLayer || !bar1) {
        // Can't continue without these layers
        outputFile.open("w");
        outputFile.write(results.join("\n"));
        outputFile.close();
        alert("Diagnostic aborted -- missing layers.\nResults: " + outputFile.fsName);
        return;
    }

    // =======================================================
    // 2. AS_DATA layer properties
    // =======================================================
    logSection("2. AS_DATA Layer Properties");

    log("  Guide layer: " + dataLayer.guideLayer);
    log("  Enabled: " + dataLayer.enabled);
    log("  Active at time 0: " + dataLayer.activeAtTime(0));

    var effects = dataLayer.property("ADBE Effect Parade");
    log("  Effects count: " + effects.numProperties);

    // Check Audio Spectrum effect
    var asFx = null;
    for (var e = 1; e <= effects.numProperties; e++) {
        var fx = effects.property(e);
        if (fx.matchName === "ADBE AudSpect") {
            asFx = fx;
            break;
        }
    }

    if (asFx) {
        logPass("Audio Spectrum effect found (ADBE AudSpect)");

        // Dump key property values
        var propsToCheck = [
            ["ADBE AudSpect-0001", "Audio Layer"],
            ["ADBE AudSpect-0002", "Start Point"],
            ["ADBE AudSpect-0003", "End Point"],
            ["ADBE AudSpect-0006", "Start Frequency"],
            ["ADBE AudSpect-0007", "End Frequency"],
            ["ADBE AudSpect-0008", "Frequency Bands"],
            ["ADBE AudSpect-0009", "Maximum Height"],
            ["ADBE AudSpect-0010", "Audio Duration"],
            ["ADBE AudSpect-0012", "Thickness"],
            ["ADBE AudSpect-0014", "Inside Color"],
            ["ADBE AudSpect-0015", "Outside Color"],
            ["ADBE AudSpect-0020", "Display Options"]
        ];

        for (var p = 0; p < propsToCheck.length; p++) {
            var prop = asFx.property(propsToCheck[p][0]);
            if (prop) {
                var val;
                try {
                    val = prop.value;
                    if (val instanceof Array) val = "[" + val.join(", ") + "]";
                } catch (err) { val = "(unreadable)"; }
                log("  " + propsToCheck[p][1] + " (" + propsToCheck[p][0] + ") = " + val);
            } else {
                logFail(propsToCheck[p][1], "property " + propsToCheck[p][0] + " not found");
            }
        }

        // Verify audio layer reference
        var audioIdx = asFx.property("ADBE AudSpect-0001").value;
        log("");
        log("  Audio layer index from effect: " + audioIdx);
        try {
            var audioLayer = comp.layer(audioIdx);
            log("  Layer at index " + audioIdx + ": '" + audioLayer.name + "'");
            log("  Has audio: " + audioLayer.hasAudio);
            if (audioLayer.hasAudio) {
                logPass("Audio layer reference is valid");
            } else {
                logFail("Audio layer at index " + audioIdx + " has no audio",
                    "Layer '" + audioLayer.name + "' is not an audio layer");
            }
        } catch (err) {
            logFail("Audio layer lookup", "No layer at index " + audioIdx + " -- " + err.message);
        }
    } else {
        logFail("Audio Spectrum effect not found on AS_DATA",
            "Expected effect with matchName 'ADBE AudSpect'");
        // List what effects ARE on the layer
        for (var e2 = 1; e2 <= effects.numProperties; e2++) {
            log("  Found: " + effects.property(e2).name + " (" + effects.property(e2).matchName + ")");
        }
    }

    // Check Mosaic effect
    var mosaicFx = null;
    for (var e3 = 1; e3 <= effects.numProperties; e3++) {
        var fx3 = effects.property(e3);
        if (fx3.matchName === "ADBE Mosaic") {
            mosaicFx = fx3;
            break;
        }
    }

    if (mosaicFx) {
        logPass("Mosaic effect found");
        var hBlocks = mosaicFx.property("ADBE Mosaic-0001").value;
        var vBlocks = mosaicFx.property("ADBE Mosaic-0002").value;
        var sharp = mosaicFx.property("ADBE Mosaic-0003").value;
        log("  Horizontal Blocks: " + hBlocks + " (expected: " + AudioSpectrumConfig.NUM_BARS + ")");
        log("  Vertical Blocks: " + vBlocks + " (expected: 1)");
        log("  Sharp Colors: " + sharp + " (expected: true)");
        if (hBlocks !== AudioSpectrumConfig.NUM_BARS) {
            logFail("Mosaic horizontal blocks", "Got " + hBlocks + ", expected " + AudioSpectrumConfig.NUM_BARS);
        }
    } else {
        logFail("Mosaic effect not found on AS_DATA");
    }

    // =======================================================
    // 3. Bar expression check
    // =======================================================
    logSection("3. AS BAR 1 Expression Check");

    var scaleProp = bar1.property("ADBE Transform Group").property("ADBE Scale");
    var hasExpr = scaleProp.expression !== "";
    log("  Has expression: " + hasExpr);
    if (hasExpr) {
        logPass("Scale expression is set");
        log("  Expression:\n    " + scaleProp.expression.split("\n").join("\n    "));
        var exprError = scaleProp.expressionError;
        if (exprError && exprError !== "") {
            logFail("Expression error", exprError);
        } else {
            logPass("No expression error");
        }
    } else {
        logFail("AS BAR 1 has no scale expression");
    }

    // =======================================================
    // 4. sampleImage() evaluation test (THE CRITICAL TEST)
    // =======================================================
    logSection("4. sampleImage() Evaluation Test");

    log("  This test reads the ACTUAL value the bar expression produces");
    log("  by calling valueAtTime() on the expression-driven Scale property.");
    log("");

    // Test at multiple time points
    var testTimes = [0.5, 1.0, 2.0, 3.0, 5.0];
    var allZero = true;

    for (var t = 0; t < testTimes.length; t++) {
        var time = testTimes[t];
        if (time >= comp.duration) continue;
        try {
            var scaleVal = scaleProp.valueAtTime(time, false);
            var yScale = (scaleVal instanceof Array && scaleVal.length >= 2) ? scaleVal[1] : scaleVal;
            log("  t=" + time + "s: Scale Y = " + yScale);
            if (yScale > 0) allZero = false;
        } catch (err) {
            logFail("valueAtTime(" + time + ")", err.message);
        }
    }

    if (allZero) {
        logFail("Scale Y is 0 at ALL tested time points",
            "sampleImage() is returning black from AS_DATA");
        log("");
        log("  POSSIBLE CAUSES:");
        log("  1. Guide layer prevents sampleImage() from reading pixel data");
        log("  2. Audio Spectrum effect is not producing visible output");
        log("  3. Audio layer reference is wrong (stale index)");
        log("  4. Expression samples the wrong coordinates");
    } else {
        logPass("Scale Y is non-zero at some time points -- sampleImage() is working");
    }

    // =======================================================
    // 5. Guide layer isolation test
    // =======================================================
    logSection("5. Guide Layer Isolation Test");

    log("  Testing if disabling guide layer mode changes sampleImage results...");

    var wasGuide = dataLayer.guideLayer;
    var guideTestAllZero = true;
    try {
        dataLayer.guideLayer = false;

        for (var t2 = 0; t2 < testTimes.length; t2++) {
            var time2 = testTimes[t2];
            if (time2 >= comp.duration) continue;
            try {
                var scaleVal2 = scaleProp.valueAtTime(time2, false);
                var yScale2 = (scaleVal2 instanceof Array && scaleVal2.length >= 2) ? scaleVal2[1] : scaleVal2;
                log("  t=" + time2 + "s (guide=false): Scale Y = " + yScale2);
                if (yScale2 > 0) guideTestAllZero = false;
            } catch (err) {
                logFail("valueAtTime(" + time2 + ") guide=false", err.message);
            }
        }
    } catch (guideErr) {
        logFail("Guide layer test error", guideErr.message);
    } finally {
        // Always restore guide layer state
        dataLayer.guideLayer = wasGuide;
    }

    if (allZero && !guideTestAllZero) {
        logFail("GUIDE LAYER IS THE PROBLEM",
            "sampleImage() returns 0 with guide=true but non-zero with guide=false");
        log("  FIX: Use layer.enabled=false instead of guideLayer=true, or");
        log("  use an adjustment layer approach to hide the data layer.");
    } else if (allZero && guideTestAllZero) {
        logWarn("Scale Y is 0 even with guide=false",
            "The problem is NOT guide layer mode. Check audio layer and effect setup.");
    } else {
        logPass("Guide layer mode does not affect sampleImage (both produce data)");
    }

    // =======================================================
    // SUMMARY
    // =======================================================
    logSection("SUMMARY");
    log("  Passed:   " + passed);
    log("  Failed:   " + failed);
    log("  Warnings: " + warnings);

    // Undo any changes made during diagnostic (guide layer test)
    app.endUndoGroup();
    app.executeCommand(16); // Undo

    // Write results to file
    outputFile.encoding = "UTF-8";
    outputFile.open("w");
    outputFile.write(results.join("\n"));
    outputFile.close();

    alert(
        "Diagnostic complete!\n\n" +
        "Passed: " + passed + "  |  Failed: " + failed + "  |  Warnings: " + warnings + "\n\n" +
        "Results saved to:\n" + outputFile.fsName + "\n\n" +
        "Share the results file with your AI assistant for debugging."
    );
})();
