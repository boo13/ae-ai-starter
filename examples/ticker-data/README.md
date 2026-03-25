# Ticker Data for After Effects

A CEP panel that fetches live stock data and builds After Effects visualizations — sparklines, stock cards, comparison charts, and text value injection.

## Architecture

- **CEP Panel** (Chromium + Node.js) docked inside After Effects
- **Svelte 5** for the UI
- **yahoo-finance2** for live stock quotes (no API key required)
- **JSON file bridge** — panel writes `Input/ticker_data.json`, ExtendScript reads it
- **ExtendScript builders** — create shape layers, comps, and text layers in AE

## Prerequisites

- After Effects 2023 or later (CEP 11+)
- Node.js 18 or later
- npm

## Setup

```bash
cd examples/ticker-data
npm install
npm run symlink   # Symlink into AE's CEP extensions folder
npm run build
```

Then open After Effects → Window menu → "Ticker Data".

## Development

```bash
npm run dev   # Hot-reload dev server
```

## Usage

1. Search for a ticker symbol (e.g. AAPL) and add it to the watchlist
2. Click **Fetch Data** — downloads live quotes and writes `Input/ticker_data.json`
3. Select a preset and click **Build in AE** — creates comps with stock visualizations
4. Use **Update Text** to populate `{PLACEHOLDER.field}` text layers

See `docs/plans/2026-03-24-feat-ticker-data-cep-panel-plan.md` for full architecture details.
