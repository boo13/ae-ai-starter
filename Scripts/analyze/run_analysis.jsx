/**
 * run_analysis.jsx
 *
 * Entry point for the AE project analysis system.
 * Runs all snapshot modules and writes the results to:
 *   - Scripts/reports/analysis.md
 *   - Scripts/reports/analysis.json
 *
 * Reports use stable filenames (overwritten each run, not timestamped).
 *
 * Usage:
 *   Open an After Effects project, then run this script via
 *   File > Scripts > Run Script File...
 *
 * All code is ES3/ExtendScript compatible.
 */

// --- Shared library ---
#include "../lib/io.jsxinc"
#include "../lib/helpers.jsxinc"
#include "../lib/report_writer.jsxinc"

// --- Snapshot modules ---
#include "lib/snapshot_project.jsxinc"
#include "lib/snapshot_comps.jsxinc"
#include "lib/snapshot_layers.jsxinc"
#include "lib/snapshot_properties.jsxinc"
#include "lib/snapshot_expressions.jsxinc"

(function () {
    try {
        // ------------------------------------------------------------------
        // Preflight: ensure a project is open
        // ------------------------------------------------------------------
        if (!app.project || app.project.items.length < 1) {
            alert("No After Effects project is open.\nPlease open a project and run this script again.");
            return;
        }
        var project = app.project;

        // ------------------------------------------------------------------
        // Helper: detect items inside z_OLD folders
        // ------------------------------------------------------------------
        /**
         * Returns true if the given item (or any ancestor folder) has
         * "z_OLD" in its name. Used to filter deprecated/archived items.
         *
         * @param {Item} item - AE project item to check.
         * @returns {boolean} True if item is inside a z_OLD folder.
         */
        function isInOldFolder(item) {
            if (!item || !item.parentFolder) return false;
            var folder = item.parentFolder;
            while (folder && folder !== app.project.rootFolder) {
                if (folder.name && folder.name.indexOf("z_OLD") !== -1) {
                    return true;
                }
                folder = folder.parentFolder;
            }
            return false;
        }

        // ------------------------------------------------------------------
        // Set up report writer and output paths
        // ------------------------------------------------------------------
        var timestamp = formatTimestamp();
        var writer = createReportWriter();

        // Resolve paths relative to this script file:
        //   scriptFile.parent  = Scripts/analyze/
        //   .parent            = Scripts/
        //   + /reports/        = Scripts/reports/
        // FALLBACK: When eval'd from CEP, $.fileName may be empty or wrong.
        var scriptFilePath = $.fileName || $.__evalFileDir__ || "";
        if (!scriptFilePath) {
            throw new Error("Unable to resolve script path. Run from AE File > Scripts or ensure __evalFileDir__ is set.");
        }
        var scriptFile = new File(scriptFilePath);
        var scriptsDir = scriptFile.parent.parent;
        var reportsDir = ensureFolder(String(scriptsDir.fsName) + "/reports");

        var mdPath = reportsDir.fsName + "/analysis.md";
        var jsonPath = reportsDir.fsName + "/analysis.json";

        // ------------------------------------------------------------------
        // Report header
        // ------------------------------------------------------------------
        writer.addMarkdown("# AE Project Analysis Report\n\n");
        writer.addMarkdown("_Generated: " + timestamp + "_\n");
        writer.addMarkdown("_After Effects " + app.version + "_\n");

        // ------------------------------------------------------------------
        // Build context
        // ------------------------------------------------------------------
        var context = {
            project: project,
            writer: writer,
            isInOldFolder: isInOldFolder,
            timestamp: timestamp
        };

        // ------------------------------------------------------------------
        // Run each snapshot module
        // ------------------------------------------------------------------
        var allWarnings = [];
        var compCount = 0;
        var totalLayers = 0;
        var expressionCount = 0;

        // 1. Project overview
        var resProject = SnapshotProject.capture(context);
        if (resProject && resProject.warnings) {
            allWarnings = allWarnings.concat(resProject.warnings);
        }

        // 2. Compositions list
        var resComps = SnapshotComps.capture(context);
        if (resComps && resComps.warnings) {
            allWarnings = allWarnings.concat(resComps.warnings);
        }
        if (resComps && resComps.compCount !== undefined) {
            compCount = resComps.compCount;
        }

        // 3. Layer details
        var resLayers = SnapshotLayers.capture(context);
        if (resLayers && resLayers.warnings) {
            allWarnings = allWarnings.concat(resLayers.warnings);
        }
        if (resLayers && resLayers.totalLayers !== undefined) {
            totalLayers = resLayers.totalLayers;
        }

        // 4. Properties (Essential Properties, Effects, Source Text)
        var resProperties = SnapshotProperties.capture(context);
        if (resProperties && resProperties.warnings) {
            allWarnings = allWarnings.concat(resProperties.warnings);
        }

        // 5. Expressions inventory
        var resExpressions = SnapshotExpressions.capture(context);
        if (resExpressions && resExpressions.warnings) {
            allWarnings = allWarnings.concat(resExpressions.warnings);
        }
        if (resExpressions && resExpressions.expressionCount !== undefined) {
            expressionCount = resExpressions.expressionCount;
        }

        // ------------------------------------------------------------------
        // Warnings section
        // ------------------------------------------------------------------
        if (allWarnings.length > 0) {
            writer.addSection("Warnings");
            writer.addList(allWarnings);
        }

        // ------------------------------------------------------------------
        // Build _meta for JSON
        // ------------------------------------------------------------------
        writer.setJson(["_meta"], {
            generated: timestamp,
            aeVersion: app.version,
            projectFile: project.file ? project.file.fsName : "",
            compCount: compCount,
            totalLayers: totalLayers,
            expressionCount: expressionCount,
            warnings: allWarnings
        });

        // ------------------------------------------------------------------
        // Write report files
        // ------------------------------------------------------------------
        var built = writer.build();

        // Markdown report
        var mdFile = new File(mdPath);
        writeTextFile(mdFile, built.markdown);

        // JSON report
        var jsonFile = new File(jsonPath);
        writeJsonFile(jsonFile, built.json);

        // ------------------------------------------------------------------
        // Console summary
        // ------------------------------------------------------------------
        $.writeln("Analysis complete \u2014 " +
            compCount + " comps, " +
            totalLayers + " layers, " +
            expressionCount + " expressions.");
        $.writeln("Reports written to: " + reportsDir.fsName);

    } catch (err) {
        alert("Analysis error:\n" + err.toString());
        $.writeln("Analysis error: " + err.toString());
    }
})();
