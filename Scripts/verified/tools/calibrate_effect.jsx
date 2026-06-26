// Verified AE Knowledge Base -- Effect Enum Calibration Probe (batch)
// Run in After Effects via File > Scripts > Run Script File
//
// Captures the integer values behind effect dropdown/enum controls in ONE pass.
// No baseline, no per-change round trips.
//
// Workflow:
//   1. Apply the effect(s) and set each dropdown to the option you want to
//      capture (e.g. Fractal Type -> Dynamic, Tones -> Pentone).
//   2. In Effect Controls, SELECT the property names you set (click a name;
//      Cmd-click to add more). You can select properties across several effects
//      and several layers at once.
//   3. Run this script. It lists every selected dropdown value in one dialog.
//      Type the UI label next to each, then click Save.
//
// To capture a second option of the same dropdown (e.g. Smeary as well as
// Dynamic), switch the dropdown, re-select it, and run again -- it merges.
//
// CUSTOM_VALUE properties (Lumetri looks/curves/toning) cannot be read; selecting
// one lets you record it as UNSUPPORTED (label it, leave it routed to unsupported).
//
// Output: verified/effects/calibration/<safe-matchName>.json -- one file per
// effect, a label->integer map plus an "unsupported" list. The downstream
// generator (generate-knowledge.mjs) merges these into the effect records.
//
// Nothing is guessed. Only values set in the UI on the installed AE version.

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

    // ---- json io ----------------------------------------------------------
    function readJson(file) {
        if (!file.exists) return null;
        file.encoding = "UTF-8";
        file.open("r");
        var text = file.read();
        file.close();
        if (!text) return null;
        try { return JSON.parse(text); } catch (e) { return null; }
    }
    function writeJson(file, obj) {
        file.encoding = "UTF-8";
        file.open("w");
        file.write(JSON.stringify(obj, null, 2));
        file.close();
    }

    // ---- value type mapping ----------------------------------------------
    function mapValueType(pvt) {
        if (pvt === PropertyValueType.OneD) return "OneD";
        if (pvt === PropertyValueType.CUSTOM_VALUE) return "CUSTOM_VALUE";
        if (pvt === PropertyValueType.COLOR) return "COLOR";
        if (pvt === PropertyValueType.TwoD) return "TwoD";
        if (pvt === PropertyValueType.TwoD_SPATIAL) return "TwoD_SPATIAL";
        if (pvt === PropertyValueType.ThreeD) return "ThreeD";
        if (pvt === PropertyValueType.ThreeD_SPATIAL) return "ThreeD_SPATIAL";
        if (pvt === PropertyValueType.LAYER_INDEX) return "LAYER_INDEX";
        if (pvt === PropertyValueType.NO_VALUE) return "NO_VALUE";
        return "OTHER";
    }
    function readInt(prop) {
        try { return parseInt(prop.value, 10); } catch (e) { return null; }
    }

    // ---- effect resolution -----------------------------------------------
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

    // Collect OneD / CUSTOM_VALUE leaves from a selected property (or a selected
    // group, expanded to its leaf children). Each row carries its owning effect.
    function collectFromProp(prop, rows, depth) {
        if (depth > 8 || rows.length >= 80) return;
        if (prop.propertyType === PropertyType.PROPERTY) {
            var vt = mapValueType(prop.propertyValueType);
            if (vt !== "OneD" && vt !== "CUSTOM_VALUE") return;
            var fx = climbToEffect(prop);
            if (!fx) return;
            rows.push({
                effectName: String(fx.name || ""),
                effectMatchName: String(fx.matchName || ""),
                propName: String(prop.name || ""),
                matchName: String(prop.matchName || ""),
                valueType: vt,
                value: vt === "OneD" ? readInt(prop) : null
            });
        } else {
            for (var i = 1; i <= prop.numProperties; i++) {
                collectFromProp(prop.property(i), rows, depth + 1);
            }
        }
    }

    function dedupeRows(rows) {
        var seen = {};
        var out = [];
        for (var i = 0; i < rows.length; i++) {
            var key = rows[i].effectMatchName + "|" + rows[i].matchName;
            if (seen[key]) continue;
            seen[key] = true;
            out.push(rows[i]);
        }
        return out;
    }

    // ---- batch label dialog ----------------------------------------------
    function showDialog(rows) {
        var dlg = new Window("dialog", "Calibrate Enum Values");
        dlg.alignChildren = "fill";
        dlg.margins = 14;
        dlg.spacing = 10;

        var info = dlg.add("statictext", undefined,
            "Type the exact UI label for each value, then click Save. Leave a row " +
            "blank to skip it. CUSTOM_VALUE rows are recorded as UNSUPPORTED.",
            { multiline: true });
        info.preferredSize = [520, 34];

        var panel = dlg.add("panel");
        panel.alignChildren = "left";
        panel.margins = 12;
        panel.spacing = 6;

        var fields = [];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var grp = panel.add("group");
            grp.orientation = "row";
            grp.alignment = "left";
            var shown = r.effectName + " / " + r.propName + "  " +
                (r.valueType === "CUSTOM_VALUE" ? "[CUSTOM_VALUE]" : "= " + r.value) + "   ->";
            var st = grp.add("statictext", undefined, shown);
            st.preferredSize.width = 360;
            var et = grp.add("edittext", undefined, "");
            et.characters = 18;
            fields.push(et);
        }

        var btns = dlg.add("group");
        btns.alignment = "right";
        btns.add("button", undefined, "Cancel", { name: "cancel" });
        var okBtn = btns.add("button", undefined, "Save", { name: "ok" });

        var saved = false;
        okBtn.onClick = function () {
            for (var j = 0; j < rows.length; j++) {
                rows[j].label = String(fields[j].text || "");
            }
            saved = true;
            dlg.close();
        };

        dlg.show();
        return saved ? rows : null;
    }

    // ---- write sidecars ---------------------------------------------------
    function recordRows(rows) {
        var aeVersion = "unknown";
        try { aeVersion = app.version; } catch (e) {}

        // Group by effect so each effect gets one merged sidecar.
        var byEffect = {};
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var label = (r.label || "").replace(/^\s+|\s+$/g, "");
            if (!label) continue;
            if (!byEffect[r.effectMatchName]) {
                byEffect[r.effectMatchName] = { effectName: r.effectName, rows: [] };
            }
            r.label = label;
            byEffect[r.effectMatchName].rows.push(r);
        }

        var summary = [];
        var recorded = 0;
        for (var matchName in byEffect) {
            if (!byEffect.hasOwnProperty(matchName)) continue;
            var grp = byEffect[matchName];
            var file = sidecarFile(matchName);
            var sidecar = readJson(file);
            if (!sidecar || sidecar.matchName !== matchName) {
                sidecar = {
                    displayName: grp.effectName,
                    matchName: matchName,
                    verifiedAEVersion: aeVersion,
                    enums: {},
                    unsupported: []
                };
            }
            sidecar.verifiedAEVersion = aeVersion;
            if (!sidecar.enums) sidecar.enums = {};
            if (!sidecar.unsupported) sidecar.unsupported = [];

            for (var k = 0; k < grp.rows.length; k++) {
                var row = grp.rows[k];
                if (row.valueType === "CUSTOM_VALUE") {
                    sidecar.unsupported.push({
                        label: row.label,
                        note: row.propName + " is CUSTOM_VALUE; not scriptable."
                    });
                    summary.push(grp.effectName + " / " + row.propName + " -> \"" +
                        row.label + "\" UNSUPPORTED");
                } else {
                    if (!sidecar.enums[row.matchName]) {
                        sidecar.enums[row.matchName] = {
                            name: row.propName,
                            valueType: "OneD",
                            values: {}
                        };
                    }
                    sidecar.enums[row.matchName].values[row.label] = row.value;
                    summary.push(grp.effectName + " / " + row.propName + " -> \"" +
                        row.label + "\" = " + row.value);
                }
                recorded++;
            }
            writeJson(file, sidecar);
        }
        return { recorded: recorded, summary: summary };
    }

    // ---- main -------------------------------------------------------------
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        alert("Open a composition with the effect(s) to calibrate.");
        return;
    }

    var layers = comp.selectedLayers;
    if (!layers || layers.length === 0) {
        alert("Select the layer(s) holding the effects, then select the dropdown " +
              "properties in Effect Controls.");
        return;
    }

    var rows = [];
    for (var li = 0; li < layers.length; li++) {
        var sel = [];
        try { sel = layers[li].selectedProperties; } catch (e) { sel = []; }
        for (var si = 0; si < sel.length; si++) {
            collectFromProp(sel[si], rows, 0);
        }
    }
    rows = dedupeRows(rows);

    if (rows.length === 0) {
        alert("No dropdown/enum properties are selected.\n\n" +
              "In Effect Controls, click the NAME of each dropdown you set " +
              "(Cmd-click to add more), then run this script again.");
        return;
    }

    var labeled = showDialog(rows);
    if (!labeled) return; // cancelled

    var result = recordRows(labeled);
    if (result.recorded === 0) {
        alert("Nothing recorded (all rows left blank).");
        return;
    }

    alert("Calibration saved (" + result.recorded + " value(s)):\n\n" +
          result.summary.join("\n") + "\n\n" +
          "Saved to:\n" + calibrationFolder().fsName + "\n\n" +
          "Re-run generate-knowledge.mjs to merge.");
})();
