# AI Workflow Guide

This guide explains how to use an AI coding assistant (Claude, Cursor, etc.) to build After Effects automation scripts with this starter kit.

## Why Analysis Reports Matter

AI assistants cannot open After Effects or inspect your project file directly. The analysis reports are the AI's window into your AE project.

Prefer `Scripts/reports/analysis.json` over `analysis.md`. The JSON report is machine-readable and includes `propertyPaths`, which gives the AI exact ADBE match-name paths plus provenance tags like `[VERIFIED]` and `[DOCS]`.

Without the report, the AI is working blind. With it, the AI can write scripts that reference the correct layer names, property paths, and composition structures.

## The Workflow Loop

The core development loop has six steps:

1. **Run analysis** -- Open your AEP in After Effects and run `Scripts/analyze/run_analysis.jsx`. This writes a fresh report to `Scripts/reports/`.

2. **AI reads the report** -- Share `Scripts/reports/analysis.json` with your AI assistant (or let it read the file directly if it has file access). Use `analysis.md` only as a fallback.

3. **AI writes scripts** -- Describe what you want automated. The AI writes ExtendScript code using the layer names and properties from the report, pulling in shared libraries and recipes as needed. Prefer ScriptUI panels when the action belongs in a reusable tool; use headless scripts for one-off tasks.

4. **Run it in AE** -- Run the generated script in After Effects via **File > Scripts > Run Script File...**, or click the button on your custom panel.

5. **Read the machine result** -- After each run, read `Scripts/runs/last_run.json`. Verify `scriptName`, check `status`, and inspect the `diff`.

6. **Confirm the visual result** -- If `status` is `"error"`, use `step`, `error`, and `errorLine` to diagnose. If `status` is `"started"`, the script likely crashed before finishing, so re-run it. If `status` is `"success"`, ask whether the result looks correct before considering the task done.

Repeat this loop as your template evolves. When you change the AE template (add layers, rename things, restructure comps), re-run analysis so the report stays current.

## Keeping AI Project Instructions Updated

`Scripts/setup.jsx` updates the repo's AI instruction file during initial setup. In this template, `CLAUDE.md` is a symlink to `AGENTS.md`, so both names refer to the same project instructions. Claude Code and similar tools can use this file to pick up project name, main composition, and workflow details automatically.

If your project evolves significantly -- new main compositions, changed structure, different workflows -- update that instruction file to reflect the current state. You can re-run `setup.jsx` or edit `AGENTS.md` directly.

## Symlink Development Pattern

After Effects loads scripts from specific directories. During development, use symlinks so you can edit scripts in your code editor while AE reads them from its expected location.

For ScriptUI panels:

```bash
# macOS
ln -s "/path/to/repo/Scripts/panel/my_project_panel.jsx" \
  "/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/my_project_panel.jsx"

# Windows
mklink "C:\...\ScriptUI Panels\my_project_panel.jsx" "C:\path\to\repo\Scripts\panel\my_project_panel.jsx"
```

`setup.jsx` generates a panel file named after your project (for example, `my_project_panel.jsx`) and offers to create this symlink automatically. If you want a checked-in example panel instead, use `Scripts/panel/automation_lab_panel.jsx`.

For standalone scripts, you can run them directly via `File > Scripts > Run Script File...` without any symlink.

## Tips

**Keep scripts modular.** One concern per file. Put reusable logic in `Scripts/lib/` as `.jsxinc` files and pull them in with `#include`. This makes scripts easier for the AI to understand and modify.

**Use the reliability pattern.** Every generated script or panel action should use `beginScript()` and `writeResult()` from `Scripts/lib/result-writer.jsxinc`. That writes `Scripts/runs/last_run.json`, which is the main feedback channel after each run.

**Re-analyze after template changes.** Any time you add, remove, or rename layers or compositions in After Effects, run the analysis again. Stale reports lead to scripts that reference things that no longer exist.

**Use the test harness for pure functions.** Logic that does not depend on After Effects (string processing, math, data transforms) can be tested with `Scripts/tests/test_helpers.jsx`. Keep testable logic in `Scripts/lib/` so it can be validated outside of AE.

**Start with recipes.** Before writing automation from scratch, check whether a recipe covers your pattern. The repeating-elements recipe alone handles a large percentage of data-driven AE workflows.

**Commit reports to git.** The analysis reports in `Scripts/reports/` diff well. Committing them lets you and the AI see how the AE project has changed over time.

**Remember the diff limitation.** `Scripts/runs/last_run.json` does not capture changes made inside nested pre-comps. If a script modifies pre-comp internals, you still need a visual check in After Effects.
