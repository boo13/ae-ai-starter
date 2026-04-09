// Verified AE Knowledge Base -- Mask, Camera, and Light Property Discovery
// Run in After Effects via File > Scripts > Run Script File
//
// Creates one mask, one camera, and one light, then dumps verified
// match-names and property types to Scripts/verified/properties/.

(function () {
    var scriptFile = new File($.fileName);
    var toolsFolder = scriptFile.parent;
    var verifiedFolder = toolsFolder.parent;
    var propsFolder = new Folder(verifiedFolder.fsName + "/properties");
    if (!propsFolder.exists) propsFolder.create();

    var maskFile = new File(propsFolder.fsName + "/mask.json");
    var cameraFile = new File(propsFolder.fsName + "/camera.json");
    var lightFile = new File(propsFolder.fsName + "/light.json");

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
            try {
                node.defaultValue = prop.value;
            } catch (e) {
                node.defaultValue = null;
            }
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

    function verifiedDateString() {
        var d = new Date();
        var m = d.getMonth() + 1;
        var day = d.getDate();
        return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
    }

    function getAEVersion() {
        try {
            return app.version;
        } catch (e) {
            return "unknown";
        }
    }

    function ensureComp(name) {
        var comp = app.project.activeItem;
        if (comp instanceof CompItem) {
            return comp;
        }

        return app.project.items.addComp(name, 1920, 1080, 1, 10, 30);
    }

    function writeJson(file, payload) {
        file.encoding = "UTF-8";
        file.open("w");
        file.write(JSON.stringify(payload, null, 2));
        file.close();
    }

    var comp = ensureComp("DISCOVER_LAYER_TEMP");
    var verifiedDate = verifiedDateString();
    var aeVersion = getAEVersion();

    app.beginUndoGroup("Discover Mask Properties");
    try {
        var maskSolid = comp.layers.addSolid(
            [0, 0, 0], "DISCOVER_MASK_TEMP",
            comp.width, comp.height, 1, comp.duration
        );
        var maskParade = maskSolid.property("ADBE Mask Parade");
        var mask = maskParade.addProperty("ADBE Mask Atom");

        writeJson(maskFile, {
            type: "Mask Properties",
            verifiedDate: verifiedDate,
            verifiedAEVersion: aeVersion,
            maskParade: walkProperty(maskParade, 5),
            mask: walkProperty(mask, 6)
        });

        app.endUndoGroup();
        app.executeCommand(16);
    } catch (e) {
        app.endUndoGroup();
        app.executeCommand(16);
        alert("Mask discovery error: " + e.message + "\nLine: " + e.line);
        return;
    }

    app.beginUndoGroup("Discover Camera Properties");
    try {
        var camera = comp.layers.addCamera("Cam", [960, 540]);
        var cameraOptions = camera.property("ADBE Camera Options Group");

        writeJson(cameraFile, {
            type: "Camera Properties",
            verifiedDate: verifiedDate,
            verifiedAEVersion: aeVersion,
            cameraOptions: walkProperty(cameraOptions, 6)
        });

        app.endUndoGroup();
        app.executeCommand(16);
    } catch (e) {
        app.endUndoGroup();
        app.executeCommand(16);
        alert("Camera discovery error: " + e.message + "\nLine: " + e.line);
        return;
    }

    app.beginUndoGroup("Discover Light Properties");
    try {
        var light = comp.layers.addLight("Light", [960, 540]);
        var lightOptions = light.property("ADBE Light Options Group");

        writeJson(lightFile, {
            type: "Light Properties",
            verifiedDate: verifiedDate,
            verifiedAEVersion: aeVersion,
            lightOptions: walkProperty(lightOptions, 6)
        });

        app.endUndoGroup();
        app.executeCommand(16);
    } catch (e) {
        app.endUndoGroup();
        app.executeCommand(16);
        alert("Light discovery error: " + e.message + "\nLine: " + e.line);
        return;
    }

    alert(
        "Layer property discovery complete!\n\n" +
        "Saved to:\n" +
        maskFile.fsName + "\n" +
        cameraFile.fsName + "\n" +
        lightFile.fsName + "\n\n" +
        "Review the JSON files to verify all match-names are correct."
    );
})();
