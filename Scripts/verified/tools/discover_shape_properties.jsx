// Verified AE Knowledge Base — Shape Layer Property Discovery
// Run in After Effects via File > Scripts > Run Script File
//
// Creates a shape layer with rectangle, ellipse, solid fill, gradient fill,
// and stroke. Walks the full property tree and dumps match-names and types
// to Scripts/verified/properties/shape-layer.json.

(function () {
    var scriptFile = new File($.fileName);
    var toolsFolder = scriptFile.parent;
    var verifiedFolder = toolsFolder.parent;
    var propsFolder = new Folder(verifiedFolder.fsName + "/properties");
    if (!propsFolder.exists) propsFolder.create();
    var outputFile = new File(propsFolder.fsName + "/shape-layer.json");

    // --- Find or create a temp comp ---
    var comp = app.project.activeItem;
    var createdComp = false;
    if (!(comp instanceof CompItem)) {
        comp = app.project.items.addComp(
            "DISCOVER_SHAPE_TEMP", 1920, 1080, 1, 10, 30
        );
        createdComp = true;
    }

    app.beginUndoGroup("Discover Shape Properties");

    try {
        var layer = comp.layers.addShape();
        layer.name = "DISCOVER_SHAPE_TEMP";

        // --- Map propertyValueType ---
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

        // --- Recursive property walker ---
        function walkProperty(prop, maxDepth) {
            if (maxDepth <= 0) return { name: prop.name, matchName: prop.matchName, note: "MAX_DEPTH" };

            var node = {
                name: prop.name,
                matchName: prop.matchName
            };

            if (prop.propertyType === PropertyType.PROPERTY) {
                node.valueType = mapValueType(prop.propertyValueType);
                try { node.defaultValue = prop.value; } catch (e) { node.defaultValue = null; }
            } else {
                // It's a group — recurse into children
                node.type = "group";
                node.numProperties = prop.numProperties;
                node.children = [];
                for (var i = 1; i <= prop.numProperties; i++) {
                    node.children.push(walkProperty(prop.property(i), maxDepth - 1));
                }
            }

            return node;
        }

        // --- Add shapes to the layer ---
        var contents = layer.property("ADBE Root Vectors Group");
        var grp = contents.addProperty("ADBE Vector Group");
        grp.name = "Test Group";
        var grpContents = grp.property("ADBE Vectors Group");

        // Rectangle
        var rect = grpContents.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Size").setValue([100, 200]);

        // Ellipse
        var ellipse = grpContents.addProperty("ADBE Vector Shape - Ellipse");

        // Solid Fill
        var solidFill = grpContents.addProperty("ADBE Vector Graphic - Fill");

        // Gradient Fill
        var gradFill = grpContents.addProperty("ADBE Vector Graphic - G-Fill");

        // Stroke
        var stroke = grpContents.addProperty("ADBE Vector Graphic - Stroke");

        // --- Walk the full tree ---
        var contentsTree = walkProperty(contents, 6);
        var transformTree = walkProperty(layer.property("ADBE Transform Group"), 4);

        // --- Get AE version ---
        var aeVersion = "unknown";
        try { aeVersion = app.version; } catch (e) {}

        // --- Build output ---
        var result = {
            type: "Shape Layer Properties",
            verifiedDate: new Date().toISOString().split("T")[0],
            verifiedAEVersion: aeVersion,
            contents: contentsTree,
            transform: transformTree
        };

        // --- Write JSON ---
        outputFile.encoding = "UTF-8";
        outputFile.open("w");
        outputFile.write(JSON.stringify(result, null, 2));
        outputFile.close();

        // --- Cleanup: undo reverses the entire undo group ---
        app.endUndoGroup();
        app.executeCommand(16); // Undo

        alert(
            "Shape layer discovery complete!\n\n" +
            "Saved to:\n" + outputFile.fsName + "\n\n" +
            "Review the JSON to verify all match-names are correct."
        );

    } catch (e) {
        app.endUndoGroup();
        app.executeCommand(16); // Undo
        alert("Discovery error: " + e.message + "\nLine: " + e.line);
    }
})();
