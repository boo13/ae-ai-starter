// Verified AE Knowledge Base — Effect Discovery Script
// Run in After Effects via File > Scripts > Run Script File
//
// Prompts for an effect match-name, applies it to a temp layer,
// dumps all properties to a JSON file in Scripts/verified/effects/.
// The generated JSON is a starting point — fill in knownAliases
// and warnings manually after reviewing.

(function () {
    // --- Prompt for match-name ---
    var matchName = prompt(
        "Enter the effect match-name to discover:\n\n" +
        "Examples:\n" +
        "  ADBE AudSpect    (Audio Spectrum)\n" +
        "  ADBE Mosaic      (Mosaic)\n" +
        "  ADBE Glo2        (Glow)\n" +
        "  ADBE Gaussian Blur 2  (Gaussian Blur)",
        "ADBE AudSpect"
    );
    if (!matchName) return;

    // --- Resolve output path ---
    var scriptFile = new File($.fileName);
    var toolsFolder = scriptFile.parent;
    var verifiedFolder = toolsFolder.parent;
    var effectsFolder = new Folder(verifiedFolder.fsName + "/effects");
    if (!effectsFolder.exists) effectsFolder.create();

    var safeFileName = matchName.replace(/ /g, "-") + ".json";
    var outputFile = new File(effectsFolder.fsName + "/" + safeFileName);

    // --- Find or create a temp comp ---
    var comp = app.project.activeItem;
    var createdComp = false;
    if (!(comp instanceof CompItem)) {
        comp = app.project.items.addComp(
            "DISCOVER_TEMP", 1920, 1080, 1, 10, 30
        );
        createdComp = true;
    }

    app.beginUndoGroup("Discover Effect: " + matchName);

    try {
        // --- Create temp solid and apply effect ---
        var solid = comp.layers.addSolid(
            [0, 0, 0], "DISCOVER_TEMP_SOLID",
            comp.width, comp.height, 1, comp.duration
        );

        var fx;
        try {
            fx = solid.property("ADBE Effect Parade").addProperty(matchName);
        } catch (e) {
            app.endUndoGroup();
            app.executeCommand(16); // Undo reverses everything
            alert(
                "Failed to apply effect '" + matchName + "':\n" +
                e.message + "\n\n" +
                "Check that the match-name is correct."
            );
            return;
        }

        // --- Map propertyValueType to readable string ---
        function mapValueType(pvt) {
            if (pvt === PropertyValueType.NO_VALUE) return "NO_VALUE";
            if (pvt === PropertyValueType.ThreeD_SPATIAL) return "ThreeD_SPATIAL";
            if (pvt === PropertyValueType.ThreeD) return "ThreeD";
            if (pvt === PropertyValueType.TwoD_SPATIAL) return "TwoD_SPATIAL";
            if (pvt === PropertyValueType.TwoD) return "TwoD";
            if (pvt === PropertyValueType.OneD) return "OneD";
            if (pvt === PropertyValueType.COLOR) return "COLOR";
            if (pvt === PropertyValueType.CUSTOM_VALUE) return "CUSTOM_VALUE";
            if (pvt === PropertyValueType.MARKER) return "MARKER";
            if (pvt === PropertyValueType.LAYER_INDEX) return "LAYER_INDEX";
            if (pvt === PropertyValueType.MASK_INDEX) return "MASK_INDEX";
            if (pvt === PropertyValueType.SHAPE) return "SHAPE";
            if (pvt === PropertyValueType.TEXT_DOCUMENT) return "TEXT_DOCUMENT";
            return "UNKNOWN_" + String(pvt);
        }

        // --- Read a property value safely ---
        function safeReadValue(prop) {
            try {
                var v = prop.value;
                if (v instanceof Array) return v;
                return v;
            } catch (e) {
                return null;
            }
        }

        // --- Iterate properties ---
        var properties = [];
        for (var i = 1; i <= fx.numProperties; i++) {
            var prop = fx.property(i);
            // Skip the built-in compositing options group
            if (prop.matchName === "ADBE Effect Built In Params") continue;

            var entry = {
                index: i,
                name: prop.name,
                matchName: prop.matchName
            };

            if (prop.propertyType === PropertyType.PROPERTY) {
                entry.valueType = mapValueType(prop.propertyValueType);
                entry.defaultValue = safeReadValue(prop);
            } else {
                // Property group — note it but don't recurse for effects
                entry.valueType = "GROUP";
                entry.numChildren = prop.numProperties;
            }

            properties.push(entry);
        }

        // --- Get AE version ---
        var aeVersion = "unknown";
        try { aeVersion = app.version; } catch (e) {}

        // --- Build output object ---
        var result = {
            displayName: fx.name,
            matchName: fx.matchName,
            addPropertyName: matchName,
            category: "Effect",
            verifiedDate: (function () { var d = new Date(); var m = d.getMonth() + 1; var day = d.getDate(); return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day; })(),
            verifiedAEVersion: aeVersion,
            totalProperties: properties.length,
            properties: properties,
            knownAliases: {
                work: [matchName],
                doNotUse: []
            },
            warnings: []
        };

        // --- Write JSON ---
        outputFile.encoding = "UTF-8";
        outputFile.open("w");
        outputFile.write(JSON.stringify(result, null, 2));
        outputFile.close();

        // --- Cleanup: undo reverses the entire undo group (solid, effect, comp) ---
        app.endUndoGroup();
        app.executeCommand(16); // Undo

        alert(
            "Discovery complete!\n\n" +
            "Effect: " + fx.name + " (" + fx.matchName + ")\n" +
            "Properties: " + properties.length + "\n\n" +
            "Saved to:\n" + outputFile.fsName + "\n\n" +
            "Next steps:\n" +
            "1. Review the JSON file\n" +
            "2. Fill in knownAliases.doNotUse (names that DON'T work)\n" +
            "3. Fill in warnings (gotchas specific to this effect)\n" +
            "4. Commit the file"
        );

    } catch (e) {
        app.endUndoGroup();
        app.executeCommand(16); // Undo
        alert("Discovery error: " + e.message + "\nLine: " + e.line);
    }
})();
