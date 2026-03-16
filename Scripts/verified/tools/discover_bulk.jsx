// Verified AE Knowledge Base — Bulk Effect Discovery
// Run in After Effects via File > Scripts > Run Script File
//
// Discovers as many effects as possible in one run by combining a
// manual priority list with the installed effects reported by app.effects.

var _DISCOVER_EFFECT_INCLUDED = true;
#include "discover_effect.jsx"

(function () {
    // ==========================================
    // Bulk discovery settings
    // ==========================================
    var MANUAL_EFFECTS = [
        "ADBE AudSpect",
        "ADBE Mosaic",
        "ADBE Glo2"
    ];
    var INCLUDE_INSTALLED_EFFECTS = true;
    var INCLUDE_HIDDEN_EFFECTS = false;
    var SKIP_ALREADY_VERIFIED = true;
    var MAX_EFFECTS = 0; // 0 = all queued effects
    var SUMMARY_FILE_NAME = "_bulk-discovery-summary.txt";

    function addUnique(list, seen, matchName) {
        var key;
        if (!matchName) return;
        key = "|" + matchName;
        if (seen[key]) return;
        seen[key] = true;
        list.push(matchName);
    }

    function collectEffects() {
        var list = [];
        var seen = {};
        var installed;
        var info;
        var i;

        for (i = 0; i < MANUAL_EFFECTS.length; i++) {
            addUnique(list, seen, MANUAL_EFFECTS[i]);
        }

        if (INCLUDE_INSTALLED_EFFECTS) {
            try {
                installed = app.effects;
            } catch (e) {
                installed = null;
            }

            if (installed && installed.length) {
                for (i = 0; i < installed.length; i++) {
                    info = installed[i];
                    if (!info || !info.matchName) continue;
                    if (!INCLUDE_HIDDEN_EFFECTS && info.category === "") continue;
                    addUnique(list, seen, info.matchName);
                }
            }
        }

        return list;
    }

    function getSummaryFile() {
        return new File(_discoverEffectEffectsFolder().fsName + "/" + SUMMARY_FILE_NAME);
    }

    function writeSummaryHeader(summaryFile, queuedCount) {
        summaryFile.encoding = "UTF-8";
        summaryFile.open("w");
        summaryFile.write(
            "Bulk effect discovery\n" +
            "Queued: " + queuedCount + "\n" +
            "Skip existing: " + (SKIP_ALREADY_VERIFIED ? "yes" : "no") + "\n" +
            "Include installed effects: " + (INCLUDE_INSTALLED_EFFECTS ? "yes" : "no") + "\n" +
            "Include hidden/internal effects: " + (INCLUDE_HIDDEN_EFFECTS ? "yes" : "no") + "\n" +
            "Max effects: " + (MAX_EFFECTS > 0 ? MAX_EFFECTS : "all") + "\n\n"
        );
        summaryFile.close();
    }

    function appendSummaryLine(summaryFile, line) {
        summaryFile.encoding = "UTF-8";
        summaryFile.open("a");
        summaryFile.write(line + "\n");
        summaryFile.close();
    }

    function ensureTargetComp() {
        var comp = app.project.activeItem;
        if (comp instanceof CompItem) {
            return { comp: comp, created: false };
        }

        comp = app.project.items.addComp(
            "DISCOVER_BULK_TEMP", 1920, 1080, 1, 10, 30
        );
        return { comp: comp, created: true };
    }

    function removeTempComp(tempComp) {
        if (!(tempComp instanceof CompItem)) return;
        try {
            tempComp.remove();
        } catch (e) {}
    }

    var effects = collectEffects();
    var queue = [];
    var summaryFile = getSummaryFile();
    var targetCompInfo;
    var i;
    var effectName;

    var summary = [];
    var successCount = 0;
    var failCount = 0;
    var skipCount = 0;

    for (i = 0; i < effects.length; i++) {
        effectName = effects[i];
        if (SKIP_ALREADY_VERIFIED && getDiscoveredEffectOutputFile(effectName).exists) {
            skipCount++;
            continue;
        }
        queue.push(effectName);
        if (MAX_EFFECTS > 0 && queue.length >= MAX_EFFECTS) break;
    }

    if (queue.length === 0) {
        alert(
            "Bulk discovery complete!\n\n" +
            "Nothing queued.\n" +
            "Skipped existing: " + skipCount + "\n\n" +
            "Toggle SKIP_ALREADY_VERIFIED or MAX_EFFECTS in discover_bulk.jsx to force another pass."
        );
        return;
    }

    writeSummaryHeader(summaryFile, queue.length);
    targetCompInfo = ensureTargetComp();

    for (i = 0; i < queue.length; i++) {
        effectName = queue[i];
        var r = discoverEffect(effectName, targetCompInfo.comp);
        if (r.success) {
            successCount++;
            summary.push("OK  " + r.displayName + " (" + r.matchName + ") - " + r.propertyCount + " props");
            appendSummaryLine(
                summaryFile,
                "OK  " + r.displayName + " (" + r.matchName + ") - " + r.propertyCount + " props"
            );
        } else {
            failCount++;
            summary.push("ERR " + effectName + " - " + r.error);
            appendSummaryLine(summaryFile, "ERR " + effectName + " - " + r.error);
        }
    }

    removeTempComp(targetCompInfo.comp && targetCompInfo.created ? targetCompInfo.comp : null);

    alert(
        "Bulk discovery complete!\n\n" +
        "Queued: " + queue.length + "\n" +
        "Success: " + successCount + "\n" +
        "Failed: " + failCount + "\n" +
        "Skipped existing: " + skipCount + "\n\n" +
        "Summary saved to:\n" + summaryFile.fsName + "\n\n" +
        summary.slice(0, 15).join("\n") +
        (summary.length > 15 ? "\n...and " + (summary.length - 15) + " more." : "")
    );
})();
