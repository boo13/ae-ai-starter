---
name: install-starter
description: First-time project setup for ae-ai-starter. Guides the user through running setup.jsx in After Effects, which configures the project name, main comp, CLAUDE.md, analysis reports, and optionally creates a dockable ScriptUI panel. Triggers on "install starter", "initial setup", "set up project", "first time setup", "run setup", "get started".
---

# Install Starter

Run first-time project setup for this ae-ai-starter repo.

## Step 1: Check setup status

Look at `CLAUDE.md` for `{{placeholders}}`:

```bash
grep -c "{{PROJECT_NAME}}" CLAUDE.md
```

- **Non-zero** → setup hasn't been run yet (go to Step 2)
- **Zero** → setup already completed (skip to Step 4 to verify)

## Step 2: Run setup.jsx in After Effects

Tell the user:

1. Open After Effects with your `.aep` project file open.
2. Go to **File → Scripts → Run Script File…**
3. Navigate to `Scripts/setup.jsx` in this repo and run it.

The setup dialog will ask for:
- **Project Name** — a short name for your project (e.g. "My Promo")
- **Main Composition** — pick the comp you'll be automating
- **Create UI Panel** — check this box if you want a dockable ScriptUI panel in AE's Window menu

Click **OK**. The script will:
- Write `Scripts/config.jsxinc`
- Update `CLAUDE.md` with your project name and comp details
- Run the analysis system (generates `Scripts/reports/`)
- Optionally create `Scripts/panel/<project>_panel.jsx` and offer to symlink it

## Step 3: Symlink the panel (if created)

If the user checked "Create UI Panel", `setup.jsx` will prompt them to create a symlink. If they skipped that prompt, they can still add the panel manually:

```bash
bash ".claude/skills/ae-add-ui-panel/scripts/create_panel.sh" "$(pwd)" "<Project Name>"
```

Tell the user to **restart After Effects**, then open the panel from **Window → \<Project Name\> Automation Lab**.

## Step 4: Verify

Check that setup completed:

```bash
grep "{{PROJECT_NAME}}" CLAUDE.md && echo "NOT YET DONE" || echo "Setup complete"
ls Scripts/reports/
ls Scripts/panel/ 2>/dev/null || echo "(no panel created)"
```

If `Scripts/reports/` is missing or empty, ask the user to run `Scripts/analyze/run_analysis.jsx` in After Effects.

## What's ready after setup

- `CLAUDE.md` — updated with project name, main comp name and dimensions
- `Scripts/config.jsxinc` — machine-readable project config
- `Scripts/reports/analysis.json` + `analysis.md` — layer/comp/property maps for AI context
- `Scripts/panel/<name>_panel.jsx` *(if created)* — dockable panel with status bar and `runAction` wrapper

The user is now ready to describe what they want automated. Remind them of the core workflow:

1. Describe the task in plain language.
2. Claude writes the script.
3. Run it in AE via **File → Scripts → Run Script File** or the panel button.
4. Read `Scripts/runs/last_run.json` to verify the result.
