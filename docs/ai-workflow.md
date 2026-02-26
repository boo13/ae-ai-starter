# AI Workflow Guide

This guide explains how to use an AI coding assistant (Claude, Cursor, etc.) to build After Effects automation scripts with this starter kit.

## Why Analysis Reports Matter

AI assistants cannot open After Effects or inspect your project file directly. The analysis report (`Scripts/reports/analysis.md`) is the AI's window into your AE project. It contains a complete snapshot of every composition, layer, property, and expression in your project.

Without the report, the AI is working blind. With it, the AI can write scripts that reference the correct layer names, property paths, and composition structures.

## The Workflow Loop

The core development loop has four steps:

1. **Run analysis** -- Open your AEP in After Effects and run `Scripts/analyze/run_analysis.jsx`. This writes a fresh report to `Scripts/reports/`.

2. **AI reads the report** -- Share the report with your AI assistant (or let it read `Scripts/reports/analysis.md` directly if it has file access). The AI now knows your project structure.

3. **AI writes scripts** -- Describe what you want automated. The AI writes ExtendScript code using the layer names and properties from the report, pulling in shared libraries and recipes as needed.

4. **Test in AE** -- Run the generated script in After Effects. If something is off, describe the result to the AI and iterate.

Repeat this loop as your template evolves. When you change the AE template (add layers, rename things, restructure comps), re-run analysis so the report stays current.

## Keeping CLAUDE.md Updated

The `CLAUDE.md` file is populated by `Scripts/setup.jsx` during initial setup. It records your project name, main composition, and key structural details. AI assistants that support project-level context files (like Claude Code) read this file automatically.

If your project evolves significantly -- new main compositions, changed structure, different workflows -- update `CLAUDE.md` to reflect the current state. You can re-run `setup.jsx` or edit the file directly.

## Symlink Development Pattern

After Effects loads scripts from specific directories. During development, use symlinks so you can edit scripts in your code editor while AE reads them from its expected location.

For ScriptUI panels:

```bash
# macOS
ln -s "/path/to/repo/Scripts/panel/project_panel.jsx" \
  "$HOME/Library/Preferences/Adobe/After Effects/<version>/Scripts/ScriptUI Panels/project_panel.jsx"

# Windows
mklink "C:\...\ScriptUI Panels\project_panel.jsx" "C:\path\to\repo\Scripts\panel\project_panel.jsx"
```

The `setup.jsx` script offers to create this symlink automatically.

For standalone scripts, you can run them directly via `File > Scripts > Run Script File...` without any symlink.

## Tips

**Keep scripts modular.** One concern per file. Put reusable logic in `Scripts/lib/` as `.jsxinc` files and pull them in with `#include`. This makes scripts easier for the AI to understand and modify.

**Re-analyze after template changes.** Any time you add, remove, or rename layers or compositions in After Effects, run the analysis again. Stale reports lead to scripts that reference things that no longer exist.

**Use the test harness for pure functions.** Logic that does not depend on After Effects (string processing, math, data transforms) can be tested with `Scripts/tests/test_helpers.jsx`. Keep testable logic in `Scripts/lib/` so it can be validated outside of AE.

**Start with recipes.** Before writing automation from scratch, check whether a recipe covers your pattern. The repeating-elements recipe alone handles a large percentage of data-driven AE workflows.

**Commit reports to git.** The analysis reports in `Scripts/reports/` are plain text and diff well. Committing them lets you (and the AI) see how the AE project has changed over time.
