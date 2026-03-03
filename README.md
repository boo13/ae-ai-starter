# ae-ai-starter

An AI-friendly starter kit for After Effects automation. It gives AI coding assistants the context they need to write ExtendScript for your AE projects by providing an analysis system, shared libraries, and reusable automation recipes.

## Quick Start

1. Clone this repo (or use it as a template) into your project directory.
2. Open your After Effects project file (`.aep`).
3. Run `Scripts/setup.jsx` via `File > Scripts > Run Script File...`.
4. The setup dialog will ask for a project name, main composition, and whether to create a UI panel.
5. Setup generates `Scripts/config.jsxinc`, populates `CLAUDE.md` with your project details, and runs the analysis system.

After setup, your AI assistant can read `CLAUDE.md` and `Scripts/reports/analysis.md` to understand your AE project structure and start writing automation scripts.

## How It Works

### Analysis System

The analysis system (`Scripts/analyze/run_analysis.jsx`) captures a complete snapshot of your After Effects project: compositions, layers, properties, effects, and expressions. The report is written to `Scripts/reports/analysis.md` (human-readable) and `Scripts/reports/analysis.json` (machine-readable).

Since AI assistants cannot open After Effects directly, this report is their primary source of truth about your project.

### Shared Libraries

`Scripts/lib/` contains ES3-compatible utility modules:

- **helpers.jsxinc** -- Text property handling, word counting, numeric value extraction, nested property search
- **io.jsxinc** -- JSON read/write, text file output, folder management, timestamps
- **report_writer.jsxinc** -- Dual Markdown/JSON report generation

Include these in your scripts with `#include "lib/helpers.jsxinc"`.

### Recipes

`Scripts/recipes/` contains reusable automation patterns. Each recipe is a self-contained folder you can copy and customize:

- **repeating-elements** -- Populate N similarly-named layers from a data array
- **image-swap** -- Import images and replace layer sources with fit/fill scaling
- **data-timing** -- Calculate display durations from word counts with configurable pacing

See [docs/recipes.md](docs/recipes.md) for details on each recipe.

### Optional UI Panel

Setup can generate a dockable ScriptUI panel that acts as an AE automation lab. It includes one-click actions to create comps, add guide presets, build title stacks, create a simple camera rig, add timing markers, and queue the active comp for render. A ready-to-run version also lives at `Scripts/panel/automation_lab_panel.jsx`.

## AI Workflow

The development loop is: run analysis, let the AI read the report, have it write scripts, test in AE, iterate. See [docs/ai-workflow.md](docs/ai-workflow.md) for the full guide.

## Secret Scanning

This repo includes a GitHub Actions workflow at `.github/workflows/gitleaks.yml` that runs Gitleaks on every push, pull request, manual run, and a weekly schedule. It scans the full git history available in the workflow checkout, so secrets introduced in commits are caught even if they are removed later in the branch.

To make it a hard publishing gate for `main`:

1. Push this workflow to GitHub and let it complete successfully once.
2. In GitHub, open `Settings > Branches` for this repository.
3. Add or edit the protection rule for `main`.
4. Enable `Require a pull request before merging`.
5. Enable `Require status checks to pass before merging` and select the `gitleaks` check.
6. Disable direct pushes to `main` unless you intentionally want an admin bypass.

If this repository is owned by a personal GitHub account, no extra Gitleaks license secret is required. If you move it to a GitHub organization later, add a `GITLEAKS_LICENSE` repository secret before using `gitleaks/gitleaks-action@v2`.

GitHub Actions cannot block the very first push of a new branch, because workflows run after GitHub receives the push. If you want server-side push blocking for any branch, pair this workflow with GitHub push protection or a local pre-push hook.

## File Structure

```
Scripts/
  setup.jsx              -- Interactive project setup (run this first)
  config.jsxinc          -- Generated project configuration
  analyze/
    run_analysis.jsx     -- Analysis entry point
    lib/                 -- Snapshot modules (project, comps, layers, properties, expressions)
  lib/
    helpers.jsxinc       -- Shared utility functions
    io.jsxinc            -- File I/O utilities
    report_writer.jsxinc -- Report generation
  recipes/
    repeating-elements/  -- Data-driven repeated layers
    image-swap/          -- Footage import and replacement
    data-timing/         -- Word-count-based timing
  panel/
    README.md            -- Panel setup instructions
  reports/
    analysis.md          -- Generated analysis report (Markdown)
    analysis.json        -- Generated analysis report (JSON)
  tests/
    test_helpers.jsx     -- Unit tests for helper functions
Input/                   -- Data files (JSON, images, etc.)
docs/
  ai-workflow.md         -- AI-assisted development guide
  recipes.md             -- Recipe reference
CLAUDE.md                -- AI context file (populated by setup.jsx)
```

## Requirements

- Adobe After Effects (any version with ExtendScript support)
- All scripts are ES3/ExtendScript compatible -- no modern JavaScript features

## Example

The `example/` directory contains a complete working example of a social media card automation project. See [example/README.md](example/README.md) for a walkthrough.
