# Ticker Data CEP Panel

A CEP panel for After Effects that fetches live stock market data and builds motion graphics compositions: stock cards, sparklines, and comparison charts.

## Features

- Live data from Yahoo Finance (no API key required)
- Stock search with autocomplete
- Watchlist management
- Text binding: `{STOCK.price}` → live value in any text layer
- Four presets: Stock Card, Multi-Card, Comparison Chart, Text Only
- Offline support with cached data

## Prerequisites

- After Effects CC 2019 or later
- Node.js 18+
- CEP debug mode enabled

## Setup

```bash
cd examples/ticker-data
npm install
npm run symlink    # Symlinks panel into AE's CEP extensions folder
```

Before packaging for distribution, change the `zxp.password` value in `cep.config.ts` to a secure value.

Then in After Effects: Window → Extensions → Ticker Data

## Development

```bash
npm run dev        # Hot-reload dev server on port 3002
npm run build      # Production build
```

## Usage

1. Search for a ticker symbol and click Add
2. Click **Fetch Data** to pull live prices and history
3. Select a preset and click **Build in AE** to create compositions
4. For text binding: add text layers with `{STOCK.price}` placeholders, configure bindings in the panel, click **Update Text**

## Text Binding Fields

| Field | Example | Description |
|-------|---------|-------------|
| `{STOCK.price}` | `248.30` | Current price |
| `{STOCK.change}` | `+4.85` | Price change |
| `{STOCK.changePercent}` | `+1.97%` | Percent change |
| `{STOCK.name}` | `Apple Inc.` | Company name |
| `{STOCK.volume}` | `54.1M` | Trading volume |
| `{STOCK.marketCap}` | `$3.8T` | Market cap |

## Architecture

- **CEP Panel** (Svelte 5 + TypeScript): fetches data, writes `Input/ticker_data.json`
- **ExtendScript builders**: read JSON from disk, create AE compositions
- **JSON file bridge**: decouples data fetching from AE scripting

## Sample Data

`Input/sample_ticker_data.json` ships with AAPL, MSFT, and TSLA data for demo use without network access.
