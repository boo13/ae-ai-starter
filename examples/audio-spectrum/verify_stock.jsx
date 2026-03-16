// Read match-names from the stock Audio Spectrum effect already applied to "Spectrum" layer
// Run in AE via File > Scripts > Run Script File

(function () {
    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;
    var outputFile = new File(scriptFolder.fsName + "/verify_stock_results.txt");
    var results = [];

    function log(msg) {
        results.push(msg);
        $.writeln(msg);
    }

    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Please select the Main Comp first.");
        return;
    }

    var spectrumLayer = null;
    try {
        spectrumLayer = comp.layer("Spectrum");
    } catch (e) {}

    if (!spectrumLayer) {
        alert("No layer named 'Spectrum' found in " + comp.name);
        return;
    }

    log("Stock Audio Spectrum — Match-Name Dump");
    log("Date: " + new Date().toString());
    log("Comp: " + comp.name);
    log("Layer: " + spectrumLayer.name + " (index " + spectrumLayer.index + ")");
    log("");

    // Dump all effects on the layer
    var effects = spectrumLayer.property("ADBE Effect Parade");
    log("Effects on layer (" + effects.numProperties + " total):");
    for (var e = 1; e <= effects.numProperties; e++) {
        var fx = effects.property(e);
        log("");
        log("=== Effect " + e + ": " + fx.name + " ===");
        log("  matchName: " + fx.matchName);
        log("  Properties (" + fx.numProperties + "):");
        for (var i = 1; i <= fx.numProperties; i++) {
            var prop = fx.property(i);
            var valStr = "";
            try {
                var v = prop.value;
                if (v instanceof Array) {
                    valStr = " = [" + v.join(", ") + "]";
                } else {
                    valStr = " = " + String(v);
                }
            } catch (e2) {
                valStr = " (no value)";
            }
            log("    [" + i + "] " + prop.name + " | " + prop.matchName + valStr);
        }
    }

    // Also check: can we add this effect by its matchName?
    log("");
    log("=== Attempting to add effect by matchName ===");

    app.beginUndoGroup("AS Verify Stock");

    var testSolid = comp.layers.addSolid(
        [0, 0, 0], "AS_VERIFY_TEMP", comp.width, comp.height, 1, comp.duration
    );

    // Try the matchName we found on the existing effect
    var existingMatchName = effects.property(1).matchName;
    log("Existing effect matchName: " + existingMatchName);

    var tries = [existingMatchName, "ADBE Audio Spectrum", "Audio Spectrum"];
    for (var t = 0; t < tries.length; t++) {
        try {
            var newFx = testSolid.property("ADBE Effect Parade").addProperty(tries[t]);
            log("SUCCESS: addProperty('" + tries[t] + "') worked!");
            log("  Applied matchName: " + newFx.matchName);
            // Remove it to try next
            newFx.remove();
        } catch (e) {
            log("FAILED: addProperty('" + tries[t] + "') — " + e.message);
        }
    }

    testSolid.remove();
    app.endUndoGroup();
    app.executeCommand(16); // Undo

    // Write results
    outputFile.open("w");
    outputFile.write(results.join("\n"));
    outputFile.close();

    alert("Done! Results saved to:\n" + outputFile.fsName);
})();
