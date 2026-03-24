# ae-ai-starter
## 🚧🚧 This repo is under heavy development 🚧🚧

Use AI assistants to automate your After Effects projects.

## What This Does

This template gives AI coding assistants the context they need to write ExtendScript automation for your AE projects. You describe what you want in plain language, the AI writes the script, and you run it in After Effects. It includes an analysis system that extracts your project structure into a report the AI can read, shared libraries for common scripting tasks, and reusable recipes for patterns like populating repeated layers or swapping images.

## Quick Start

1. Clone this repo (or click **Use this template** on GitHub)
2. Open your After Effects project (`.aep`)
3. Run `Scripts/setup.jsx` via **File > Scripts > Run Script File**
4. Follow the setup dialog to configure your project name, main composition, and optional UI panel
5. Open your AI assistant and follow **[Your First Automation](docs/first-automation.md)**

## How It Works

The core workflow is a loop:

- **Analyze** — `setup.jsx` scans your AE project and produces a plain-text report that the AI can read. Since AI assistants can't open After Effects directly, this report is their window into your project.
- **Describe** — Tell the AI what you want to automate. It knows your compositions, layers, and properties from the report.
- **Run** — The AI writes an ExtendScript. You run it in AE via **File > Scripts > Run Script File**.
- **Iterate** — When your template changes, re-run analysis (`Scripts/analyze/run_analysis.jsx`) to keep the report current.

## What's Included

- `Scripts/analyze/` — Project analysis system (generates structure reports)
- `Scripts/lib/` — Shared ES3 utilities for AI-generated scripts
- `Scripts/recipes/` — Copy-and-adapt patterns for common automation tasks
- `Scripts/panel/` — Optional ScriptUI panel with utility actions (configured during setup)
- `Scripts/demos/` — Advanced demo panels that showcase generative art and data-driven motion graphics
- `docs/` — Workflow guides and recipe reference
- `examples/` — Standalone example projects (social-card, etc.)

## Demo Panels

The template now includes two standalone demo panels under `Scripts/demos/`:

- [`Scripts/demos/flow_field/flow_field_panel.jsx`](/Users/randy/Git/ae-ai-starter/.worktrees/feat-demo-panels/Scripts/demos/flow_field/flow_field_panel.jsx) — a generative Flow Field panel that builds Perlin noise-driven streamline art with live speed and palette controls.
- [`Scripts/demos/stock_ticker/stock_ticker_panel.jsx`](/Users/randy/Git/ae-ai-starter/.worktrees/feat-demo-panels/Scripts/demos/stock_ticker/stock_ticker_panel.jsx) — a Stock Ticker panel that creates a scrolling ticker and sparkline chart from bundled or live market data.

Install them the same way as any ScriptUI panel in this repo: symlink the `.jsx` file into After Effects' `Scripts/ScriptUI Panels` folder, restart AE, then open the panel from the **Window** menu.

## Requirements

- After Effects (any recent version)
- An AI assistant ([Claude Code](https://claude.ai/download), ChatGPT, Cursor, Gemini, etc.)

## Learn More

- **[Your First Automation](docs/first-automation.md)** — Step-by-step walkthrough from setup to first script
- **[AI Workflow Guide](docs/ai-workflow.md)** — Advanced tips, symlink patterns, and development practices
- **[Recipes Reference](docs/recipes.md)** — When to use each recipe and how to customize them
- **[Examples](examples/)** — Standalone projects showing what you can build
