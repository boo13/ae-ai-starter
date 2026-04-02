/**
 * template.jsx — Reliability-template recipe
 *
 * COPY THIS FILE and rename it before modifying.
 * This is the required boilerplate for all Claude-authored AE scripts.
 *
 * The three includes + beginScript/writeResult pattern enable:
 *   - Immediate crash detection (status: "started" written before any AE work)
 *   - Before/after property diff written to Scripts/runs/last_run.json
 *   - Exact step-level error location in the diff
 *
 * IMPORTANT: Call beginScript() BEFORE app.beginUndoGroup() so that a
 * crash during the undo group still leaves a "started" record on disk.
 *
 * Claude reads Scripts/runs/last_run.json after the user runs this script.
 * See AGENTS.md for the full feedback protocol.
 *
 * All code is ES3/ExtendScript compatible.
 */

#include "lib/io.jsxinc"
#include "lib/prop-walker.jsxinc"
#include "lib/result-writer.jsxinc"

(function () {
    var step = "init";
    var comp = app.project.activeItem;

    // Write "started" immediately — detects crashes if writeResult never runs
    beginScript("template.jsx", comp);

    // Validate active comp
    if (!comp || !(comp instanceof CompItem)) {
        writeResult("error", step, "No active composition. Open a comp and run again.", null);
        alert("Please open a composition before running this script.");
        return;
    }

    app.beginUndoGroup("Template Script");

    try {
        // ------------------------------------------------------------------
        // Step 1: [describe first step]
        // ------------------------------------------------------------------
        step = "step 1 label";

        // TODO: replace this block with actual script logic
        // Example: move layer 1 to center
        var layer = comp.layer(1);
        layer.property("Transform").property("Position").setValue([comp.width / 2, comp.height / 2]);

        // ------------------------------------------------------------------
        // Step 2: [describe second step]
        // ------------------------------------------------------------------
        step = "step 2 label";
        // TODO: add more steps here

        writeResult("success", step, null, comp);

    } catch (e) {
        writeResult("error", step, e, comp);
        alert("Script error at step [" + step + "]:\n" + e.message);
    } finally {
        app.endUndoGroup();
    }
})();
