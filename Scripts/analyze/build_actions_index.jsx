/**
 * build_actions_index.jsx
 *
 * Parses JSDoc headers from Scripts/lib/actions/*.jsxinc and writes
 * Scripts/lib/actions/index.json — the machine-readable action catalog.
 *
 * Run via: File > Scripts > Run Script File...
 * Also invoked automatically by run_analysis.jsx.
 *
 * After adding or modifying an action file, re-run this script
 * (or run_analysis.jsx) and commit the updated index.json.
 *
 * All code is ES3/ExtendScript compatible.
 */

#include "../lib/io.jsxinc"
#include "../lib/prop-walker.jsxinc"
#include "../lib/result-writer.jsxinc"
#include "lib/actions_indexer.jsxinc"

(function () {
    var step = "init";
    beginScript("build_actions_index.jsx", null);
    try {
        // $.fileName is reliable here — we are the entry script
        step = "resolve paths";
        var entryFile = new File($.fileName);
        var scriptsDir = entryFile.parent.parent;  // Scripts/analyze/ -> Scripts/
        var actionsDir = new Folder(scriptsDir.fsName + "/lib/actions");
        var outFile = new File(scriptsDir.fsName + "/lib/actions/index.json");

        step = "parse action files";
        var result = buildActionsIndex(actionsDir, outFile);

        step = "done";
        var msg = "Action index built: " + result.actionCount + " action(s).";
        if (result.warnings.length > 0) {
            msg += "\nWarnings:\n  " + result.warnings.join("\n  ");
        }

        writeResult("success", step, null, null);
        alert(msg);
    } catch (e) {
        writeResult("error", step, e, null);
        alert("build_actions_index failed at [" + step + "]:\n" + e.message);
    }
})();
