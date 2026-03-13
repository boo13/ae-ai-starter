// Verified AE Knowledge Base — Bulk Effect Discovery
// Run in After Effects via File > Scripts > Run Script File
//
// Discovers multiple effects in one run. Edit the EFFECTS array below
// to add or remove effects.

var _DISCOVER_EFFECT_INCLUDED = true;
#include "discover_effect.jsx"

(function () {
    // ==========================================
    // Edit this list to discover different effects
    // ==========================================
    var EFFECTS = [
        "ADBE AudSpect",
        "ADBE Mosaic",
        "ADBE Glo2"
    ];

    var summary = [];
    var successCount = 0;
    var failCount = 0;

    for (var i = 0; i < EFFECTS.length; i++) {
        var r = discoverEffect(EFFECTS[i]);
        if (r.success) {
            successCount++;
            summary.push("OK  " + r.displayName + " (" + r.matchName + ") — " + r.propertyCount + " props");
        } else {
            failCount++;
            summary.push("ERR " + EFFECTS[i] + " — " + r.error);
        }
    }

    alert(
        "Bulk discovery complete!\n\n" +
        "Success: " + successCount + "  |  Failed: " + failCount + "\n\n" +
        summary.join("\n")
    );
})();
