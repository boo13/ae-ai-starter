---
name: ae-add-ui-panel
description: This skill should be used when adding a new ScriptUI panel to an ae-ai-starter repo. It scaffolds a dockable panel .jsx file in Scripts/panel/ and symlinks it into After Effects' ScriptUI Panels folder. Triggers on "add a panel", "create a UI panel", "new AE panel", or "add ScriptUI panel".
---

# Add AE UI Panel

Scaffold a dockable ScriptUI panel in an ae-ai-starter repo and symlink it to After Effects.

## Workflow

1. Ask the user for a **panel name** (e.g. "My Tool"). If they already provided one, use it.
2. Run the bundled script (do **not** ask for the AE version — it auto-detects):

```bash
bash ".claude/skills/ae-add-ui-panel/scripts/create_panel.sh" "$(pwd)" "<Panel Name>"
```

3. If the script fails because no AE installation was found, **then** ask the user for the version year and re-run with it as the third argument.
4. Confirm the output — the script reports the created file and symlink paths.
5. Tell the user to restart After Effects and open the panel from the **Window** menu.

## Error Handling

The script exits with an error message if:
- `Scripts/` folder is missing (not an ae-ai-starter repo)
- The panel file already exists
- No After Effects installation is found
- The ScriptUI Panels folder doesn't exist for the given version
- A regular file (not symlink) already occupies the symlink target

## What Gets Created

- `Scripts/panel/<name>_panel.jsx` — ES3-compatible dockable panel with:
  - Panel/palette window setup
  - Status bar
  - `getActiveComp()` and `runAction()` helpers
  - An example button (replace with real actions)
  - `#include` for `lib/helpers.jsxinc` and `lib/io.jsxinc`
- Symlink in `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`

## After Creation

Edit the generated `.jsx` file to add panel sections and buttons. The skeleton includes a marked section (`ADD YOUR PANEL SECTIONS AND BUTTONS BELOW`) showing where to add UI elements. Use the `runAction(label, fn)` wrapper for all button handlers to get undo grouping and error handling.
