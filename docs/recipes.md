# Recipes Guide

Recipes are reusable automation patterns in `Scripts/recipes/`. Each recipe is a self-contained folder with its own README, configuration template, and library modules. Copy what you need into your project and customize.

## Advanced demos

If you want fully built examples instead of copy-and-adapt recipes, start with these:

- [`Scripts/demos/flow_field/flow_field_panel.jsx`](../Scripts/demos/flow_field/flow_field_panel.jsx) — generative shape-layer art driven by Perlin noise, path generation, and trim-path expressions.
- [`examples/ticker-data/`](../examples/ticker-data) — the current stock-data example, with a CEP panel that fetches ticker data and builds cards, sparklines, and comparison charts in After Effects.

The older `stock_ticker` ScriptUI demo is archived in `Scripts/demos/_archive/stock_ticker/` and should be treated as historical reference rather than the primary stock-data workflow.

## repeating-elements

**When to use:** Your AE template has N similarly-named layers (e.g., `CARD 1`, `CARD 2`, ..., `CARD 10`) that each expose the same Essential Properties and need to be populated from a data array.

This is the most common pattern in data-driven After Effects work. It covers scorecards, text lists, schedule items, leaderboard entries, and any layout where the same visual element repeats with different content.

**Key files:**

- `registry.jsxinc` -- Walks the composition once at startup, collecting layer references and Essential Property handles into a registry object. Avoids repeated lookups during the update loop.
- `updater.jsxinc` -- Iterates a data array, maps JSON field names to Essential Property names via a property map, sets values on each layer, and hides unused slots.
- `example_config.jsxinc` -- Configuration template. Set your comp name, layer prefix, max element count, and the list of Essential Properties to gather.

**What to customize:** Copy `example_config.jsxinc`, set `MAIN_COMP_NAME` to your composition name, set `ELEMENT_PREFIX` to match your layer naming convention (include the trailing space), and list your Essential Property names in `ESSENTIAL_PROPERTIES`.

## image-swap

**When to use:** Your template has placeholder image layers that need to be replaced with specific images from disk, scaled to fit or fill the composition.

This handles hero images, thumbnails, logos, backgrounds -- any layer whose footage source should come from an external file. It also supports batch-importing an entire folder of images into the AE Project panel.

**Key files:**

- `imaging.jsxinc` -- Core functions: `getOrImportFootage` (import or find existing), `fitLayerToComp` (scale to fit or fill), and `replaceLayerSource` (combines import + replace + scale in one call).
- `assets.jsxinc` -- Project panel folder management (`ensureProjectFolder`) and batch import (`importFolderAssets`).
- `example_config.jsxinc` -- Configuration for folder names.

**What to customize:** Set `ASSETS_FOLDER_NAME` for your AE Project panel folder and `INPUT_FOLDER_NAME` for the filesystem folder containing source images. Choose `"fit"` or `"fill"` mode when calling `replaceLayerSource`.

## data-timing

**When to use:** Your data includes text elements that need screen time proportional to their word count, with configurable pacing parameters.

This calculates how long each element should be visible based on a seconds-per-word model with a minimum duration floor. It also supports bidirectional sync: when timing parameters change, auto-generated durations are recalculated while manually-set durations are preserved.

**Key files:**

- `timing.jsxinc` -- Duration computation (`computeDurationFromText`, `resolveElementDuration`), analysis of existing durations (`analyzeExistingDurations`), and recalculation (`recalculateDurationsOnJson`).
- `transcript_loader.jsxinc` -- JSON loading with settings overrides (`loadDataFile`, `applySettingsOverrides`) and a pluggable text file converter (`convertSimpleTextFile`).
- `example_config.jsxinc` -- Default timing parameters (base start, seconds per word, minimum duration).

**What to customize:** Adjust `DEFAULT_SECONDS_PER_WORD` for reading pace and `DEFAULT_MIN_DURATION` to prevent short items from flashing by. Supply a custom `lineParser` function to `convertSimpleTextFile` if you need to import plain text files.
