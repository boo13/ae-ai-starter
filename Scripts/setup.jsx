/**
 * setup.jsx
 *
 * Interactive setup script for ae-ai-starter.
 * Run from After Effects via File > Scripts > Run Script File...
 *
 * This script:
 *   1. Verifies an AEP is open
 *   2. Probes the project for compositions
 *   3. Shows a setup dialog for project configuration
 *   4. Generates Scripts/config.jsxinc
 *   5. Updates CLAUDE.md with project details
 *   6. Runs the analysis system
 *   7. Optionally generates a dockable ScriptUI panel
 *
 * All code is ES3/ExtendScript compatible.
 */

#include "lib/io.jsxinc"

(function () {
    // ------------------------------------------------------------------
    // Locate script and repo paths
    // ------------------------------------------------------------------
    var scriptFile = new File($.fileName);
    var scriptsDir = scriptFile.parent;           // Scripts/
    var repoRoot = scriptsDir.parent;             // repo root

    // ------------------------------------------------------------------
    // 1. Verify AEP is open
    // ------------------------------------------------------------------
    if (!app.project) {
        alert(
            "No After Effects project is open.\n\n" +
            "Please open your AEP file first, then run setup.jsx again."
        );
        return;
    }

    if (app.project.numItems < 1) {
        alert(
            "The open project appears to be empty.\n\n" +
            "Please open a project with at least one composition."
        );
        return;
    }

    // ------------------------------------------------------------------
    // 2. Probe the project -- collect comp names
    // ------------------------------------------------------------------

    /**
     * Returns true if the given item (or any ancestor folder) has
     * "z_OLD" in its name. Used to filter deprecated/archived items.
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

    /**
     * Converts a project name to a filesystem-safe lowercase identifier.
     * E.g. "My Cool Project" -> "my_cool_project"
     */
    function toFileName(str) {
        return str
            .replace(/[^a-zA-Z0-9 _-]/g, "")
            .replace(/[\s-]+/g, "_")
            .toLowerCase();
    }

    var compNames = [];
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem && !isInOldFolder(item)) {
            compNames.push(item.name);
        }
    }

    compNames.sort(function (a, b) {
        var la = a.toLowerCase();
        var lb = b.toLowerCase();
        if (la < lb) return -1;
        if (la > lb) return 1;
        return 0;
    });

    if (compNames.length === 0) {
        alert(
            "No compositions found in the open project.\n\n" +
            "Please open a project that contains at least one composition."
        );
        return;
    }

    // ------------------------------------------------------------------
    // Derive default project name from AEP filename
    // ------------------------------------------------------------------
    var defaultName = "MyProject";
    if (app.project.file) {
        var aepName = app.project.file.displayName;
        defaultName = aepName.replace(/\.(aep|aepx)$/i, "");
    }

    // ------------------------------------------------------------------
    // 3. Show setup dialog
    // ------------------------------------------------------------------
    var dlg = new Window("dialog", "ae-ai-starter Setup", undefined, { resizeable: false });

    // -- Title --
    var titleGroup = dlg.add("group");
    titleGroup.alignment = ["fill", "top"];
    var titleText = titleGroup.add("statictext", undefined, "Configure your project");
    titleText.alignment = ["center", "center"];
    try { titleText.graphics.font = ScriptUI.newFont("dialog", "BOLD", 14); } catch (_) {}

    dlg.add("panel", undefined, "");  // visual separator

    // -- Project Name --
    var nameGroup = dlg.add("group");
    nameGroup.alignment = ["fill", "top"];
    nameGroup.add("statictext", undefined, "Project Name:");
    var nameInput = nameGroup.add("edittext", undefined, defaultName);
    nameInput.characters = 30;
    nameInput.alignment = ["fill", "center"];

    // -- Main Composition --
    var compGroup = dlg.add("group");
    compGroup.alignment = ["fill", "top"];
    compGroup.add("statictext", undefined, "Main Composition:");
    var compDropdown = compGroup.add("dropdownlist", undefined, compNames);
    compDropdown.alignment = ["fill", "center"];
    compDropdown.selection = 0;

    dlg.add("panel", undefined, "");  // visual separator

    // -- Create UI Panel --
    var panelGroup = dlg.add("group");
    panelGroup.alignment = ["fill", "top"];
    var panelCheckbox = panelGroup.add("checkbox", undefined, "Create UI Panel (dockable ScriptUI palette)");
    panelCheckbox.value = false;

    dlg.add("panel", undefined, "");  // visual separator

    // -- Buttons --
    var btnGroup = dlg.add("group");
    btnGroup.alignment = ["right", "bottom"];
    var cancelBtn = btnGroup.add("button", undefined, "Cancel", { name: "cancel" });
    var okBtn = btnGroup.add("button", undefined, "OK", { name: "ok" });

    var result = dlg.show();
    if (result !== 1) return;  // user cancelled

    // ------------------------------------------------------------------
    // Gather dialog values
    // ------------------------------------------------------------------
    var projectName = nameInput.text;
    var mainCompName = compDropdown.selection ? compDropdown.selection.text : compNames[0];
    var createPanel = panelCheckbox.value;

    if (!projectName || projectName.replace(/\s/g, "").length === 0) {
        alert("Project name cannot be empty.");
        return;
    }

    // ------------------------------------------------------------------
    // Look up the selected comp for details
    // ------------------------------------------------------------------
    var mainComp = null;
    for (var c = 1; c <= app.project.numItems; c++) {
        var ci = app.project.item(c);
        if (ci instanceof CompItem && ci.name === mainCompName) {
            mainComp = ci;
            break;
        }
    }

    var compWidth = mainComp ? mainComp.width : 0;
    var compHeight = mainComp ? mainComp.height : 0;
    var compDuration = mainComp ? mainComp.duration : 0;
    var compFps = mainComp ? mainComp.frameRate : 0;

    // Format duration as seconds with 1 decimal
    var durationStr = compDuration.toFixed(1) + "s";

    // ------------------------------------------------------------------
    // 4a. Write Scripts/config.jsxinc
    // ------------------------------------------------------------------
    var configContent = [
        "/**",
        " * config.jsxinc \u2014 Project configuration",
        " * Generated by setup.jsx",
        " */",
        "var ProjectConfig = {",
        "    PROJECT_NAME: " + JSON.stringify(projectName) + ",",
        "    MAIN_COMP_NAME: " + JSON.stringify(mainCompName),
        "};"
    ].join("\n") + "\n";

    var configFile = new File(scriptsDir.fsName + "/config.jsxinc");
    writeTextFile(configFile, configContent);

    // ------------------------------------------------------------------
    // 4b. Update CLAUDE.md
    // ------------------------------------------------------------------
    var claudePath = repoRoot.fsName + "/CLAUDE.md";
    var claudeFile = new File(claudePath);
    var claudeUpdated = false;

    if (claudeFile.exists) {
        claudeFile.encoding = "UTF-8";
        claudeFile.open("r");
        var claudeContent = claudeFile.read();
        claudeFile.close();

        var compDetails = "- **Main Comp**: " + mainCompName +
            " (" + compWidth + "x" + compHeight +
            ", " + durationStr +
            ", " + compFps + "fps)";

        claudeContent = claudeContent.split("{{PROJECT_NAME}}").join(projectName);
        claudeContent = claudeContent.split("{{MAIN_COMP}}").join(mainCompName);
        claudeContent = claudeContent.split("{{PROJECT_DESCRIPTION}}").join("After Effects automation project");
        claudeContent = claudeContent.split("{{MAIN_COMP_DETAILS}}").join(compDetails);

        writeTextFile(claudeFile, claudeContent);
        claudeUpdated = true;
    }

    // ------------------------------------------------------------------
    // 4c. Run the analysis system
    // ------------------------------------------------------------------
    var analysisScript = new File(scriptsDir.fsName + "/analyze/run_analysis.jsx");
    var analysisRan = false;
    if (analysisScript.exists) {
        try {
            $.evalFile(analysisScript);
            analysisRan = true;
        } catch (e) {
            $.writeln("Analysis error: " + e.toString());
        }
    }

    // ------------------------------------------------------------------
    // 4d. Optionally create the UI panel
    // ------------------------------------------------------------------
    var panelCreated = false;
    var panelFileName = "";
    if (createPanel) {
        panelFileName = toFileName(projectName) + "_panel.jsx";
        var panelDir = ensureFolder(scriptsDir.fsName + "/panel");
        var panelFile = new File(panelDir.fsName + "/" + panelFileName);
        var panelContent = buildPanelScript(projectName, panelFileName);
        writeTextFile(panelFile, panelContent);
        panelCreated = true;

        // Ask about symlink
        showSymlinkDialog(panelFile);
    }

    // ------------------------------------------------------------------
    // 5. Completion message
    // ------------------------------------------------------------------
    var summary = "Setup complete!\n\n";
    summary += "- Config generated: Scripts/config.jsxinc\n";
    if (claudeUpdated) {
        summary += "- CLAUDE.md updated with project details\n";
    }
    if (analysisRan) {
        summary += "- Analysis report ready: Scripts/reports/\n";
    }
    if (panelCreated) {
        summary += "- Panel created: Scripts/panel/" + panelFileName + "\n";
    }

    alert(summary);

    // ==================================================================
    // Helper: Build the panel script content
    // ==================================================================

    /**
     * Generates the full source code for a dockable ScriptUI panel.
     * The project name is baked into the panel title.
     *
     * @param {string} name - Project name to embed in the panel title.
     * @param {string} fileName - Generated filename for the panel script.
     * @returns {string} Complete panel script source code.
     */
    function buildPanelScript(name, fileName) {
        var lines = [];

        lines.push("/**");
        lines.push(" * " + fileName);
        lines.push(" *");
        lines.push(" * Dockable ScriptUI panel for " + name + ".");
        lines.push(" * Generated by setup.jsx -- customize freely.");
        lines.push(" *");
        lines.push(" * Install: place in AE's ScriptUI Panels folder or symlink.");
        lines.push(" * All code is ES3/ExtendScript compatible.");
        lines.push(" */");
        lines.push("");
        lines.push('#include "../lib/helpers.jsxinc"');
        lines.push('#include "../lib/io.jsxinc"');
        lines.push("");
        lines.push("(function (thisObj) {");
        lines.push("    var PANEL_TITLE = " + JSON.stringify(name + " Tools") + ";");
        lines.push("");
        lines.push("    // ---- Create window or attach to panel ----");
        lines.push("    var win;");
        lines.push("    try {");
        lines.push("        win = (thisObj instanceof Panel) ? thisObj :");
        lines.push('            new Window("palette", PANEL_TITLE, undefined, { resizeable: true });');
        lines.push("    } catch (_) {");
        lines.push('        win = new Window("palette", PANEL_TITLE, undefined, { resizeable: true });');
        lines.push("    }");
        lines.push("");
        lines.push("    win.orientation = \"column\";");
        lines.push("    win.alignChildren = [\"fill\", \"top\"];");
        lines.push("    win.spacing = 6;");
        lines.push("");
        lines.push("    // ---- Status line ----");
        lines.push('    var statusText = win.add("statictext", undefined, "Ready");');
        lines.push('    statusText.alignment = ["fill", "top"];');
        lines.push("");
        lines.push("    /**");
        lines.push("     * Updates the status line text and optional color.");
        lines.push("     * @param {string} msg - Status message to display.");
        lines.push("     * @param {Array} color - Optional [r, g, b] array (0-1 range).");
        lines.push("     */");
        lines.push("    function setStatus(msg, color) {");
        lines.push("        statusText.text = msg;");
        lines.push("        if (color) {");
        lines.push("            try {");
        lines.push("                var g = statusText.graphics;");
        lines.push("                var pen = g.newPen(g.PenType.SOLID_COLOR, color, 1);");
        lines.push("                g.foregroundColor = pen;");
        lines.push("            } catch (_) {}");
        lines.push("        }");
        lines.push("    }");
        lines.push("");
        lines.push("    // ---- Refresh Analysis button ----");
        lines.push('    var refreshBtn = win.add("button", undefined, "Refresh Analysis");');
        lines.push("    refreshBtn.onClick = function () {");
        lines.push("        try {");
        lines.push("            setStatus(\"Running analysis...\");");
        lines.push("            var panelScript = new File($.fileName);");
        lines.push('            var analysisPath = panelScript.parent.parent.fsName + "/analyze/run_analysis.jsx";');
        lines.push("            var analysisFile = new File(analysisPath);");
        lines.push("            if (analysisFile.exists) {");
        lines.push("                $.evalFile(analysisFile);");
        lines.push("                setStatus(\"Analysis complete\", [0, 0.6, 0]);");
        lines.push("            } else {");
        lines.push("                setStatus(\"Analysis script not found\", [0.8, 0, 0]);");
        lines.push("            }");
        lines.push("        } catch (e) {");
        lines.push("            setStatus(\"Error: \" + e.toString(), [0.8, 0, 0]);");
        lines.push("        }");
        lines.push("    };");
        lines.push("");
        lines.push("    // ---- Data file selector ----");
        lines.push('    var fileGroup = win.add("group");');
        lines.push('    fileGroup.alignment = ["fill", "top"];');
        lines.push('    var selectFileBtn = fileGroup.add("button", undefined, "Select Data File...");');
        lines.push('    var fileLabel = fileGroup.add("statictext", undefined, "No file selected");');
        lines.push('    fileLabel.alignment = ["fill", "center"];');
        lines.push("");
        lines.push("    var loadedData = null;");
        lines.push("");
        lines.push("    selectFileBtn.onClick = function () {");
        lines.push("        try {");
        lines.push('            var f = File.openDialog("Select a JSON data file", "JSON:*.json;All:*.*");');
        lines.push("            if (!f) return;");
        lines.push("            fileLabel.text = f.displayName;");
        lines.push("            loadedData = readJsonFile(f);");
        lines.push("            updateDebugSummary(loadedData);");
        lines.push("            setStatus(\"Loaded: \" + f.displayName, [0, 0.6, 0]);");
        lines.push("        } catch (e) {");
        lines.push("            setStatus(\"Load error: \" + e.toString(), [0.8, 0, 0]);");
        lines.push("            loadedData = null;");
        lines.push("        }");
        lines.push("    };");
        lines.push("");
        lines.push("    // ---- Separator ----");
        lines.push('    win.add("panel", undefined, "");');
        lines.push("");
        lines.push("    // ---- Debug section (collapsible) ----");
        lines.push('    var debugPanel = win.add("panel", undefined, "Debug");');
        lines.push('    debugPanel.alignment = ["fill", "top"];');
        lines.push('    debugPanel.alignChildren = ["fill", "top"];');
        lines.push("    debugPanel.maximumSize = [9999, 30];");
        lines.push("");
        lines.push("    var debugExpanded = false;");
        lines.push('    var debugSummary = debugPanel.add("statictext", [0, 0, 300, 100],');
        lines.push('        "Load a data file to see summary here.",');
        lines.push("        { multiline: true });");
        lines.push("    debugSummary.visible = false;");
        lines.push("");
        lines.push("    debugPanel.addEventListener(\"click\", function () {");
        lines.push("        debugExpanded = !debugExpanded;");
        lines.push("        debugSummary.visible = debugExpanded;");
        lines.push("        debugPanel.maximumSize = debugExpanded ? [9999, 9999] : [9999, 30];");
        lines.push("        win.layout.layout(true);");
        lines.push("    });");
        lines.push("");
        lines.push("    /**");
        lines.push("     * Updates the debug summary text from loaded JSON data.");
        lines.push("     * @param {Object} data - Parsed JSON data object.");
        lines.push("     */");
        lines.push("    function updateDebugSummary(data) {");
        lines.push("        if (!data) {");
        lines.push('            debugSummary.text = "No data loaded.";');
        lines.push("            return;");
        lines.push("        }");
        lines.push("        var lines = [];");
        lines.push('        lines.push("Keys: " + getObjectKeys(data).join(", "));');
        lines.push("        if (data.messages && data.messages.length !== undefined) {");
        lines.push('            lines.push("Messages: " + data.messages.length);');
        lines.push("        }");
        lines.push("        if (data.settings) {");
        lines.push('            lines.push("Settings: " + getObjectKeys(data.settings).join(", "));');
        lines.push("        }");
        lines.push('        debugSummary.text = lines.join("\\n");');
        lines.push("    }");
        lines.push("");
        lines.push("    /**");
        lines.push("     * Returns an array of an object's own enumerable keys.");
        lines.push("     * ES3-compatible replacement for Object.keys().");
        lines.push("     * @param {Object} obj - Object to inspect.");
        lines.push("     * @returns {string[]} Array of key names.");
        lines.push("     */");
        lines.push("    function getObjectKeys(obj) {");
        lines.push("        var keys = [];");
        lines.push("        for (var k in obj) {");
        lines.push("            if (obj.hasOwnProperty(k)) {");
        lines.push("                keys.push(k);");
        lines.push("            }");
        lines.push("        }");
        lines.push("        return keys;");
        lines.push("    }");
        lines.push("");
        lines.push("    // ---- Resizing ----");
        lines.push("    win.onResizing = win.onResize = function () {");
        lines.push("        this.layout.resize();");
        lines.push("    };");
        lines.push("");
        lines.push("    // ---- Show (floating window mode) ----");
        lines.push("    if (win instanceof Window) {");
        lines.push("        win.center();");
        lines.push("        win.show();");
        lines.push("    } else {");
        lines.push("        win.layout.layout(true);");
        lines.push("    }");
        lines.push("})(this);");

        return lines.join("\n") + "\n";
    }

    // ==================================================================
    // Helper: Show symlink dialog
    // ==================================================================

    /**
     * Shows a dialog offering to create a symlink from the panel file
     * to AE's ScriptUI Panels folder.
     *
     * @param {File} sourceFile - The panel .jsx file to symlink.
     */
    function showSymlinkDialog(sourceFile) {
        // Detect AE ScriptUI Panels path
        var aeScriptUIPath = "";

        // Try user-level path on macOS first
        if ($.os.indexOf("Mac") !== -1 || $.os.indexOf("mac") !== -1) {
            var versionParts = app.version.split(".");
            var majorVersion = versionParts[0];

            // User preferences path
            var userPath = Folder("~/Library/Preferences/Adobe/After Effects/" +
                majorVersion + ".0/Scripts/ScriptUI Panels").fsName;

            // App-level path
            var appPath = Folder(app.path).fsName + "/Scripts/ScriptUI Panels";

            // Prefer user path if the parent exists, otherwise app path
            var userParent = new Folder(Folder("~/Library/Preferences/Adobe/After Effects/" +
                majorVersion + ".0/Scripts").fsName);
            if (userParent.exists) {
                aeScriptUIPath = userPath;
            } else {
                aeScriptUIPath = appPath;
            }
        } else {
            // Windows -- app-level path
            aeScriptUIPath = Folder(app.path).fsName + "\\Scripts\\ScriptUI Panels";
        }

        var symlinkDlg = new Window("dialog", "Install Panel", undefined, { resizeable: false });

        symlinkDlg.add("statictext", undefined, "Create a symlink to the AE ScriptUI Panels folder?");
        symlinkDlg.add("statictext", undefined, "This makes the panel available in AE's Window menu.");

        var pathGroup = symlinkDlg.add("group");
        pathGroup.alignment = ["fill", "top"];
        pathGroup.add("statictext", undefined, "Target folder:");
        var pathInput = pathGroup.add("edittext", undefined, aeScriptUIPath);
        pathInput.characters = 45;
        pathInput.alignment = ["fill", "center"];

        var symBtnGroup = symlinkDlg.add("group");
        symBtnGroup.alignment = ["right", "bottom"];
        var symCancelBtn = symBtnGroup.add("button", undefined, "Skip", { name: "cancel" });
        var symOkBtn = symBtnGroup.add("button", undefined, "Create Symlink", { name: "ok" });

        var symResult = symlinkDlg.show();
        if (symResult !== 1) return;

        var targetDir = pathInput.text;
        if (!targetDir) return;

        // Ensure target directory exists
        var targetFolder = new Folder(targetDir);
        if (!targetFolder.exists) {
            try {
                targetFolder.create();
            } catch (e) {
                alert("Could not create target folder:\n" + targetDir + "\n\n" + e.toString());
                return;
            }
        }

        var linkDest = targetDir + "/" + sourceFile.displayName;

        try {
            if ($.os.indexOf("Mac") !== -1 || $.os.indexOf("mac") !== -1) {
                var cmd = 'ln -s "' + sourceFile.fsName + '" "' + linkDest + '"';
                system.callSystem(cmd);
                alert("Symlink created!\n\n" + linkDest + "\n\nRestart After Effects to see the panel in the Window menu.");
            } else {
                // Windows: use mklink
                var winCmd = 'cmd /c mklink "' + linkDest + '" "' + sourceFile.fsName + '"';
                system.callSystem(winCmd);
                alert("Symlink created!\n\n" + linkDest + "\n\nRestart After Effects to see the panel in the Window menu.");
            }
        } catch (e) {
            alert(
                "Could not create symlink.\n\n" +
                "You can manually create it by running:\n" +
                'ln -s "' + sourceFile.fsName + '" "' + linkDest + '"\n\n' +
                "Error: " + e.toString()
            );
        }
    }

})();
