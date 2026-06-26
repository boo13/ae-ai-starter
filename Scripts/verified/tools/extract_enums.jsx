// Verified AE Knowledge Base -- Automated Enum Extractor
// Run in After Effects via File > Scripts > Run Script File
//
// Requires After Effects 26.0+ (adds Property.propertyParameters + valueText).
// Fully automated: applies each effect to a temp layer and, for every dropdown
// property, reads the menu labels and their integer values directly from AE --
// NO manual clicking or labeling.
//
// For each dropdown it sweeps value 1..N, setting the property and reading
// Property.valueText, so the label->integer map is exactly what AE reports on
// the installed version (robust to menu dividers and non-contiguous values).
//
// Output: verified/effects/calibration/<safe-matchName>.json -- the same sidecar
// format the manual probe writes; the generator (generate-knowledge.mjs) merges
// it into the effect records.
//
// Pre-26 fallback: if propertyParameters is unavailable, this reports 0 dropdowns
// -- use calibrate_effect.jsx (manual) instead.

(function () {
    // ================= config =================
    // "installed" = every non-hidden effect AE reports (app.effects)
    // "verified"  = only effects already in ../effects/*.json
    var TARGET_MODE = "verified";
    var SKIP_EXISTING = false;   // skip effects that already have a sidecar
    var MAX_EFFECTS = 0;         // 0 = no limit
    var MAX_MENU_ITEMS = 256;    // safety cap per dropdown
    var SUMMARY_FILE_NAME = "_enum-extraction-summary.txt";
    // Effects that pop a modal dialog (or error) on bare apply -- skipped so the
    // run doesn't block. Pseudo/* effects also can't be added directly.
    var SKIP_MATCHNAMES = {
        "ADBE Path Text": true,    // modal font dialog
        "ADBE Numbers": true,      // modal dialog
        "ADBE Numbers2": true,     // modal dialog
        "ADBE PM System 2": true   // requires setup; errors on bare apply
    };
    // ==========================================

    // ---- folders ----------------------------------------------------------
    function toolsFolder() { return new File($.fileName).parent; }
    function verifiedFolder() { return toolsFolder().parent; }
    function effectsFolder() { return new Folder(verifiedFolder().fsName + "/effects"); }
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

    // ---- target effect list ----------------------------------------------
    function listVerifiedMatchNames() {
        var names = [];
        var seen = {};
        var folder = effectsFolder();
        var files = folder.getFiles("*.json");
        for (var i = 0; i < files.length; i++) {
            var f = files[i];
            if (!(f instanceof File)) continue;
            var base = f.name;
            if (base.charAt(0) === "_") continue;
            var data = readJson(f);
            if (!data || !data.matchName) continue;
            if (seen[data.matchName]) continue;
            seen[data.matchName] = true;
            names.push(data.matchName);
        }
        return names;
    }
    function listInstalledMatchNames() {
        var names = [];
        var seen = {};
        var installed = null;
        try { installed = app.effects; } catch (e) { installed = null; }
        if (installed && installed.length) {
            for (var i = 0; i < installed.length; i++) {
                var info = installed[i];
                if (!info || !info.matchName) continue;
                if (info.category === "") continue; // hidden/internal
                if (seen[info.matchName]) continue;
                seen[info.matchName] = true;
                names.push(info.matchName);
            }
        }
        return names;
    }

    // ---- dropdown extraction ---------------------------------------------
    function isDivider(label) {
        return label.length === 0 || label.indexOf("(-") === 0;
    }

    // Returns a label->integer map for a dropdown property, or null if the
    // property is not a dropdown / API unavailable.
    function extractDropdown(prop) {
        var items = null;
        try { items = prop.propertyParameters; } catch (e) { items = null; }
        if (!items || !items.length) return null;

        var n = items.length;
        if (n > MAX_MENU_ITEMS) n = MAX_MENU_ITEMS;

        var values = {};
        var original = null;
        try { original = prop.value; } catch (e) { original = null; }

        var sweptAny = false;
        var sweepOk = true;
        for (var v = 1; v <= n; v++) {
            var label = null;
            try {
                prop.setValue(v);
                label = prop.valueText;
                sweptAny = true;
            } catch (e) {
                sweepOk = false;
                break;
            }
            if (label === undefined || label === null) { sweepOk = false; break; }
            label = String(label);
            if (isDivider(label)) continue;
            values[label] = v;
        }

        if (!sweepOk || !sweptAny) {
            // Fallback: positional mapping straight from the label list.
            values = {};
            for (var k = 0; k < n; k++) {
                var lab = String(items[k]);
                if (isDivider(lab)) continue;
                values[lab] = k + 1;
            }
        }

        try { if (original !== null) prop.setValue(original); } catch (e) {}

        var count = 0;
        for (var key in values) { if (values.hasOwnProperty(key)) count++; }
        return count > 0 ? values : null;
    }

    // Walk an effect's property tree; collect dropdown maps keyed by matchName.
    function walkEffect(group, enums, depth) {
        if (depth > 8) return;
        for (var i = 1; i <= group.numProperties; i++) {
            var prop = group.property(i);
            if (prop.matchName === "ADBE Effect Built In Params") continue;
            if (prop.propertyType === PropertyType.PROPERTY) {
                var map = extractDropdown(prop);
                if (map) {
                    enums[prop.matchName] = {
                        name: String(prop.name || ""),
                        valueType: "OneD",
                        values: map
                    };
                }
            } else {
                walkEffect(prop, enums, depth + 1);
            }
        }
    }

    function mergeSidecar(matchName, displayName, enums, aeVersion) {
        var file = sidecarFile(matchName);
        var sidecar = readJson(file);
        if (!sidecar || sidecar.matchName !== matchName) {
            sidecar = {
                displayName: displayName,
                matchName: matchName,
                verifiedAEVersion: aeVersion,
                enums: {},
                unsupported: []
            };
        }
        sidecar.verifiedAEVersion = aeVersion;
        if (!sidecar.enums) sidecar.enums = {};
        if (!sidecar.unsupported) sidecar.unsupported = [];
        for (var mn in enums) {
            if (enums.hasOwnProperty(mn)) sidecar.enums[mn] = enums[mn];
        }
        writeJson(file, sidecar);
    }

    // ---- main -------------------------------------------------------------
    var apiOk = false;
    try {
        // Probe presence of the 26.0 API without needing an effect yet.
        apiOk = (typeof PropertyType !== "undefined");
    } catch (e) { apiOk = false; }
    if (!apiOk) { alert("This script needs After Effects scripting objects."); return; }

    var aeVersion = "unknown";
    try { aeVersion = app.version; } catch (e) {}

    var targets = TARGET_MODE === "installed"
        ? listInstalledMatchNames()
        : listVerifiedMatchNames();
    if (!targets.length) { alert("No target effects found for mode: " + TARGET_MODE); return; }

    // temp comp + solid
    var createdComp = false;
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        comp = app.project.items.addComp("ENUM_EXTRACT_TEMP", 1920, 1080, 1, 10, 30);
        createdComp = true;
    }

    var summaryFile = new File(calibrationFolder().fsName + "/" + SUMMARY_FILE_NAME);
    summaryFile.encoding = "UTF-8";
    summaryFile.open("w");
    summaryFile.write("Enum extraction -- AE " + aeVersion + "\nMode: " + TARGET_MODE +
        "\nTargets: " + targets.length + "\n\n");
    summaryFile.close();

    function appendSummary(line) {
        summaryFile.open("a");
        summaryFile.write(line + "\n");
        summaryFile.close();
    }

    app.beginUndoGroup("Extract Enums");

    var processed = 0, withDropdowns = 0, totalDropdowns = 0, failed = 0;
    var firstFew = [];

    for (var t = 0; t < targets.length; t++) {
        if (MAX_EFFECTS > 0 && processed >= MAX_EFFECTS) break;
        var matchName = targets[t];
        if (SKIP_MATCHNAMES[matchName] || matchName.indexOf("Pseudo/") === 0) {
            appendSummary("SKIP " + matchName + " - dialog/setup prompt");
            continue;
        }
        if (SKIP_EXISTING && sidecarFile(matchName).exists) continue;

        var solid = null;
        try {
            solid = comp.layers.addSolid([0, 0, 0], "ENUM_TMP", comp.width, comp.height, 1, comp.duration);
            var fx = solid.property("ADBE Effect Parade").addProperty(matchName);
            var displayName = String(fx.name || matchName);

            var enums = {};
            walkEffect(fx, enums, 0);

            var ddCount = 0;
            for (var mn in enums) { if (enums.hasOwnProperty(mn)) ddCount++; }

            if (ddCount > 0) {
                mergeSidecar(matchName, displayName, enums, aeVersion);
                withDropdowns++;
                totalDropdowns += ddCount;
                if (firstFew.length < 12) firstFew.push(displayName + ": " + ddCount + " dropdown(s)");
                appendSummary("OK  " + displayName + " (" + matchName + ") - " + ddCount + " dropdown(s)");
            } else {
                appendSummary("--  " + displayName + " (" + matchName + ") - no dropdowns");
            }
            processed++;
        } catch (e) {
            failed++;
            appendSummary("ERR " + matchName + " - " + (e.message || e));
        } finally {
            try { if (solid) solid.remove(); } catch (e2) {}
        }
    }

    app.endUndoGroup();
    if (createdComp) { try { comp.remove(); } catch (e) {} }

    appendSummary("\nProcessed: " + processed + " | with dropdowns: " + withDropdowns +
        " | total dropdowns: " + totalDropdowns + " | failed: " + failed);

    alert(
        "Enum extraction complete (AE " + aeVersion + ")\n\n" +
        "Effects processed: " + processed + "\n" +
        "Effects with dropdowns: " + withDropdowns + "\n" +
        "Dropdowns captured: " + totalDropdowns + "\n" +
        "Failed: " + failed + "\n\n" +
        (firstFew.length ? firstFew.join("\n") + "\n\n" : "") +
        (withDropdowns === 0
            ? "No dropdowns captured. If this is AE 26.0+, the API may not cover\n" +
              "built-in effect popups -- fall back to calibrate_effect.jsx.\n\n"
            : "") +
        "Sidecars + summary in:\n" + calibrationFolder().fsName + "\n\n" +
        "Re-run generate-knowledge.mjs to merge."
    );
})();
