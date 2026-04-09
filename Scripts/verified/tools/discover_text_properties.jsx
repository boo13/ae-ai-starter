// Verified AE Knowledge Base -- Text Layer Property Discovery
// Run in After Effects via File > Scripts > Run Script File
//
// Creates a text layer, walks the text property tree, adds one text animator,
// and dumps verified match-names and types to
// Scripts/verified/properties/text-layer.json.

(function () {
    var scriptFile = new File($.fileName);
    var toolsFolder = scriptFile.parent;
    var verifiedFolder = toolsFolder.parent;
    var propsFolder = new Folder(verifiedFolder.fsName + "/properties");
    if (!propsFolder.exists) propsFolder.create();
    var outputFile = new File(propsFolder.fsName + "/text-layer.json");

    var comp = app.project.activeItem;
    var createdComp = false;
    if (!(comp instanceof CompItem)) {
        comp = app.project.items.addComp(
            "DISCOVER_TEXT_TEMP", 1920, 1080, 1, 10, 30
        );
        createdComp = true;
    }

    app.beginUndoGroup("Discover Text Properties");

    try {
        var layer = comp.layers.addText("Sample");
        layer.name = "DISCOVER_TEXT_TEMP";

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

        function safeReadValue(prop) {
            try {
                if (prop.propertyValueType === PropertyValueType.TEXT_DOCUMENT) {
                    var doc = prop.value;
                    var summary = {};
                    try { summary.text = doc.text; } catch (e1) {}
                    try { summary.font = doc.font; } catch (e2) {}
                    try { summary.fontSize = doc.fontSize; } catch (e3) {}
                    try { summary.applyFill = doc.applyFill; } catch (e4) {}
                    try { summary.applyStroke = doc.applyStroke; } catch (e5) {}
                    try { summary.justification = String(doc.justification); } catch (e6) {}
                    return summary;
                }

                return prop.value;
            } catch (e) {
                return null;
            }
        }

        function walkProperty(prop, maxDepth) {
            if (maxDepth <= 0) {
                return { name: prop.name, matchName: prop.matchName, note: "MAX_DEPTH" };
            }

            var node = {
                name: prop.name,
                matchName: prop.matchName
            };

            if (prop.propertyType === PropertyType.PROPERTY) {
                node.valueType = mapValueType(prop.propertyValueType);
                node.defaultValue = safeReadValue(prop);
            } else {
                node.type = "group";
                node.numProperties = prop.numProperties;
                node.children = [];
                for (var i = 1; i <= prop.numProperties; i++) {
                    node.children.push(walkProperty(prop.property(i), maxDepth - 1));
                }
            }

            return node;
        }

        var textProps = layer.property("ADBE Text Properties");
        var sourceText = textProps.property("ADBE Text Document");
        var pathOptions = textProps.property("ADBE Text Path Options");
        var moreOptions = textProps.property("ADBE Text More Options");
        var animators = textProps.property("ADBE Text Animators");
        var animator = animators.addProperty("ADBE Text Animator");
        animator.name = "Discovery Animator";
        var animatorProperties = animator.property("ADBE Text Animator Properties");
        var animatorSelectors = animator.property("ADBE Text Selectors");

        var aeVersion = "unknown";
        try {
            aeVersion = app.version;
        } catch (e) {}

        var result = {
            type: "Text Layer Properties",
            verifiedDate: (function () {
                var d = new Date();
                var m = d.getMonth() + 1;
                var day = d.getDate();
                return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
            })(),
            verifiedAEVersion: aeVersion,
            textProperties: walkProperty(sourceText, 4),
            pathOptions: walkProperty(pathOptions, 5),
            moreOptions: walkProperty(moreOptions, 5),
            animator: walkProperty(animator, 6),
            animatorProperties: walkProperty(animatorProperties, 6),
            animatorSelectors: walkProperty(animatorSelectors, 6),
            transform: walkProperty(layer.property("ADBE Transform Group"), 4)
        };

        outputFile.encoding = "UTF-8";
        outputFile.open("w");
        outputFile.write(JSON.stringify(result, null, 2));
        outputFile.close();

        app.endUndoGroup();
        app.executeCommand(16);

        alert(
            "Text layer discovery complete!\n\n" +
            "Saved to:\n" + outputFile.fsName + "\n\n" +
            "Review the JSON to verify all match-names are correct."
        );
    } catch (e) {
        app.endUndoGroup();
        app.executeCommand(16);
        alert("Discovery error: " + e.message + "\nLine: " + e.line);
    }
})();
