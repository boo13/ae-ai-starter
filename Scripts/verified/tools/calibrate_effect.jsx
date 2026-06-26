// Verified AE Knowledge Base -- Effect Enum Calibration Probe
// Run in After Effects via File > Scripts > Run Script File
//
// Empirically captures the integer values behind effect dropdown/enum controls
// (and flags controls that only write unreadable CUSTOM_VALUE blobs) by diffing
// the effect's property tree before and after ONE maintainer-made UI change.
//
// Workflow (per effect):
//   1. Select the layer, then select the effect in Effect Controls.
//   2. Run this script. It captures a baseline snapshot and tells you so.
//   3. Change exactly ONE control in the UI (e.g. Fractal Type -> Dynamic).
//   4. Run this script again. It diffs against the baseline, asks for the
//      label of the change you made, records the verified mapping, then
//      re-baselines so you can capture the next value.
//
// Output: verified/effects/calibration/<safe-matchName>.json -- a machine-
// readable label->integer map plus an "unsupported" list for controls whose
// change only touched an unreadable CUSTOM_VALUE property. The generator
// (generate-knowledge.mjs) merges these sidecars into the effect records.
//
// Nothing is guessed. Only values the maintainer actually set in the UI are
// recorded, against the installed AE version.

(function () {
    // ---- folders ----------------------------------------------------------
    function toolsFolder() {
        return new File($.fileName).parent;
    }
    function verifiedFolder() {
        return toolsFolder().parent;
    }
    function calibrationFolder() {
        var f = new Folder(verifiedFolder().fsName + "/effects/calibration");
        if (!f.exists) f.create();
        return f;
    }
    function safeFileName(matchName) {
        var s = String(matchName).replace(/[^A-Za-z0-9._-]+/g, "-");
        s = s.replace(/^-+/, "").replace(/-+$/, "");
        return s || "effect";
    }
    function sidecarFile(matchName) {
        return new File(calibrationFolder().fsName + "/" + safeFileName(matchName) + ".json");
    }
    function baselineFile(matchName) {
        return new File(Folder.temp.fsName + "/ae-calibration-baseline-" + safeFileName(matchName) + ".json");
    }

    // ---- json io ----------------------------------------------------------
    function readJson(file) {
        if (!file.exists) return null;
        file.encoding = "UTF-8";
        file.open("r");
        var text = file.read();
        file.close();
        if (!text) return null;
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    }
    function writeJson(file, obj) {
        file.encoding = "UTF-8";
        file.open("w");
        file.write(JSON.stringify(obj, null, 2));
        file.close();
    }

    // ---- value type mapping ----------------------------------------------
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

    function serializeValue(v) {
        try {
            if (v instanceof Array) {
                var parts = [];
                for (var i = 0; i < v.length; i++) parts.push(String(v[i]));
                return "[" + parts.join(",") + "]";
            }
            return String(v);
        } catch (e) {
            return null;
        }
    }

    function readLeafValue(prop, valueType) {
        if (valueType === "CUSTOM_VALUE" || valueType === "NO_VALUE") return null;
        try {
            return serializeValue(prop.value);
        } catch (e) {
            return null;
        }
    }

    // ---- snapshot (recurses into real sub-groups) -------------------------
    function snapshot(group, leaves, depth) {
        if (depth > 8) return;
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            if (prop.matchName === "ADBE Effect Built In Params") continue;

            if (prop.propertyType === PropertyType.PROPERTY) {
                var vt = mapValueType(prop.propertyValueType);
                leaves.push({
                    matchName: prop.matchName,
                    name: String(prop.name || ""),
                    valueType: vt,
                    value: readLeafValue(prop, vt)
                });
            } else {
                snapshot(prop, leaves, depth + 1);
            }
        }
    }

    function snapshotEffect(fx) {
        var leaves = [];
        snapshot(fx, leaves, 0);
        return leaves;
    }

    function indexByMatchName(leaves) {
        var map = {};
        for (var i = 0; i < leaves.length; i++) map[leaves[i].matchName] = leaves[i];
        return map;
    }

    // ---- effect resolution from selection --------------------------------
    function climbToEffect(prop) {
        var cur = prop;
        var guard = 0;
        while (cur && guard < 50) {
            guard++;
            var parent = null;
            try { parent = cur.parentProperty; } catch (e) { parent = null; }
            if (!parent) return null;
            if (parent.matchName === "ADBE Effect Parade") return cur;
            cur = parent;
        }
        return null;
    }

    function resolveEffect(layer) {
        var sel = [];
        try { sel = layer.selectedProperties; } catch (e) { sel = []; }
        for (var i = 0; i < sel.length; i++) {
            var fx = climbToEffect(sel[i]);
            if (fx) return fx;
        }

        var parade = layer.property("ADBE Effect Parade");
        if (!parade || parade.numProperties === 0) return null;
        if (parade.numProperties === 1) return parade.property(1);

        var listing = [];
        for (var j = 1; j <= parade.numProperties; j++) {
            listing.push(j + ": " + parade.property(j).name);
        }
        var answer = prompt(
            "No effect selected. Enter the effect number to calibrate:\n\n" + listing.join("\n"),
            "1"
        );
        if (!answer) return null;
        var idx = parseInt(answer, 10);
        if (!(idx >= 1 && idx <= parade.numProperties)) return null;
        return parade.property(idx);
    }

    // ---- main -------------------------------------------------------------
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Open a composition and select a layer with the effect to calibrate.");
        return;
    }
    var layer = comp.selectedLayers[0];
    if (!layer) {
        alert("Select the layer that has the effect to calibrate.");
        return;
    }

    var fx = resolveEffect(layer);
    if (!fx) {
        alert("Could not resolve an effect. Select the effect in Effect Controls and try again.");
        return;
    }

    var effectDisplayName = fx.name;
    var effectMatchName = fx.matchName;
    var aeVersion = "unknown";
    try { aeVersion = app.version; } catch (e) {}

    var current = snapshotEffect(fx);
    var baseFile = baselineFile(effectMatchName);
    var baseline = readJson(baseFile);

    // ---- first pass: capture baseline ------------------------------------
    if (!baseline || baseline.matchName !== effectMatchName) {
        writeJson(baseFile, { matchName: effectMatchName, leaves: current });
        alert(
            "Baseline captured for:\n" + effectDisplayName + " (" + effectMatchName + ")\n\n" +
            "Now change EXACTLY ONE control in the UI, then run this script again."
        );
        return;
    }

    // ---- second pass: diff ------------------------------------------------
    var before = indexByMatchName(baseline.leaves);
    var changedReadable = [];
    var customCount = 0;

    for (var k = 0; k < current.length; k++) {
        var leaf = current[k];
        var prev = before[leaf.matchName];
        if (!prev) continue;

        if (leaf.valueType === "CUSTOM_VALUE") {
            customCount++;
            continue;
        }
        if (leaf.value !== prev.value) {
            changedReadable.push({
                matchName: leaf.matchName,
                name: leaf.name,
                valueType: leaf.valueType,
                before: prev.value,
                after: leaf.value
            });
        }
    }

    // Re-baseline regardless, so the next change can be captured cleanly.
    writeJson(baseFile, { matchName: effectMatchName, leaves: current });

    // ---- load / init sidecar ---------------------------------------------
    var outFile = sidecarFile(effectMatchName);
    var sidecar = readJson(outFile);
    if (!sidecar || sidecar.matchName !== effectMatchName) {
        sidecar = {
            displayName: effectDisplayName,
            matchName: effectMatchName,
            verifiedAEVersion: aeVersion,
            enums: {},
            unsupported: []
        };
    }
    sidecar.verifiedAEVersion = aeVersion;

    // ---- no readable change: unsupported / CUSTOM_VALUE only -------------
    if (changedReadable.length === 0) {
        var label0 = prompt(
            "No readable property changed.\n\n" +
            "If you DID change a control, it only modified an unreadable " +
            "CUSTOM_VALUE property (e.g. a Lumetri look / curve / toning blob) " +
            "and is NOT scriptable.\n\n" +
            "Enter a label to record this control as UNSUPPORTED (or Cancel):",
            ""
        );
        if (label0) {
            sidecar.unsupported.push({
                label: label0,
                note: "Changing this control did not alter any readable property (" +
                    customCount + " CUSTOM_VALUE properties present); not scriptable."
            });
            writeJson(outFile, sidecar);
            alert("Recorded UNSUPPORTED: \"" + label0 + "\"\nSaved to:\n" + outFile.fsName);
        } else {
            alert("No change detected and nothing recorded.\nRe-baselined; change one control and run again.");
        }
        return;
    }

    // ---- one or more readable changes ------------------------------------
    var oneD = [];
    for (var c = 0; c < changedReadable.length; c++) {
        if (changedReadable[c].valueType === "OneD") oneD.push(changedReadable[c]);
    }

    var summaryLines = [];
    for (var s = 0; s < changedReadable.length; s++) {
        var ch = changedReadable[s];
        summaryLines.push(ch.name + " (" + ch.matchName + ", " + ch.valueType + "): " +
            ch.before + " -> " + ch.after);
    }

    if (oneD.length !== 1) {
        alert(
            "Detected " + changedReadable.length + " changed propert(ies); " +
            "need exactly one OneD/enum change to record a mapping.\n\n" +
            summaryLines.join("\n") + "\n\n" +
            "Change only ONE dropdown/enum control at a time, then run again. " +
            "(Re-baselined.)"
        );
        return;
    }

    var target = oneD[0];
    var label = prompt(
        "Changed control:\n" + target.name + " (" + target.matchName + ")\n" +
        "Value is now: " + target.after + "\n\n" +
        "Enter the EXACT UI label for this option (e.g. \"Dynamic\"):",
        ""
    );
    if (!label) {
        alert("No label entered; mapping not recorded. (Re-baselined.)");
        return;
    }

    if (!sidecar.enums[target.matchName]) {
        sidecar.enums[target.matchName] = {
            name: target.name,
            valueType: target.valueType,
            values: {}
        };
    }
    var intVal = parseInt(target.after, 10);
    sidecar.enums[target.matchName].values[label] = isNaN(intVal) ? target.after : intVal;
    writeJson(outFile, sidecar);

    alert(
        "Recorded:\n" + target.name + " -> \"" + label + "\" = " + target.after + "\n\n" +
        "Saved to:\n" + outFile.fsName + "\n\n" +
        "Change the NEXT option (or a different control) and run again."
    );
})();
