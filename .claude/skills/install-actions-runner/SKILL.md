---
name: install-actions-runner
description: Install the Actions Runner panel (Scripts/panel/actions_runner_panel.jsx) as a dockable ScriptUI panel in After Effects. Triggers on "install actions runner", "dock actions runner", "set up actions runner panel", "actions runner panel not in window menu".
---

# Install Actions Runner Panel

Make `actions_runner_panel.jsx` available as a dockable panel in After Effects by symlinking it into AE's ScriptUI Panels folder.

The panel file already exists in the repo — no build step is needed.

## Step 1: Verify the panel file exists

```bash
ls Scripts/panel/actions_runner_panel.jsx
```

If missing, something is wrong with the repo. Ask the user to check git status.

## Step 2: Check folder permissions

The ScriptUI Panels folder is owned by root by default. Claude's Bash tool can't use `sudo`, so check whether the folder is already writable:

```bash
AE_VERSION=$(ls -1d "/Applications/Adobe After Effects"* 2>/dev/null | sed 's|.*/Adobe After Effects ||' | sort -rn | head -1) && \
ls -ld "/Applications/Adobe After Effects $AE_VERSION/Scripts/ScriptUI Panels" 2>/dev/null || echo "NOT FOUND"
```

- If the owner shown is your username → skip to Step 3.
- If the owner is `root` → tell the user to run this **once** in their terminal to fix it permanently, then continue:

```
sudo chown -R $(whoami) "/Applications/Adobe After Effects 2025/Scripts/ScriptUI Panels"
```

(Replace `2025` with the detected version year.)

## Step 3: Create the symlink

```bash
AE_VERSION=$(ls -1d "/Applications/Adobe After Effects"* 2>/dev/null | sed 's|.*/Adobe After Effects ||' | sort -rn | head -1) && \
TARGET="$(pwd)/Scripts/panel/actions_runner_panel.jsx" && \
LINK="/Applications/Adobe After Effects $AE_VERSION/Scripts/ScriptUI Panels/actions_runner_panel.jsx" && \
if [ -L "$LINK" ]; then
  echo "Already installed: $LINK"
elif [ -e "$LINK" ]; then
  echo "WARNING: regular file already exists at $LINK — remove it first"
else
  ln -s "$TARGET" "$LINK" && echo "Symlinked → AE $AE_VERSION"
fi
```

## Step 4: Verify and finish

Tell the user to **restart After Effects**, then open the panel from **Window → actions_runner_panel**.

## What the panel does

The Actions Runner panel reads `Scripts/lib/actions/index.json` and builds a UI from it automatically. It lets you:

- Browse and run any action in the catalog by name
- Fill in parameter fields driven by each action's `runnerMeta` in `index.json`
- See action descriptions and usage hints inline

To add a new action to the runner, follow the three-step instructions at the top of `Scripts/panel/actions_runner_panel.jsx`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Panel not in Window menu | AE not restarted after symlink — restart AE |
| "No actions loaded" or empty dropdown | Check that `Scripts/lib/actions/index.json` exists; run `Scripts/analyze/build_actions_index.jsx` to regenerate it |
| Symlink command: `ln: already exists` | Panel is already installed; restart AE if it's still not visible |
| Action button stays disabled | The action has `"category": "manual"` in `runnerMeta` — it can't be run from the panel |
