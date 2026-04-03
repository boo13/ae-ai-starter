# Ticker Data CEP Panel

A CEP panel for After Effects that fetches live stock market data and builds motion graphics compositions: stock cards, sparklines, and comparison charts.

This example replaces the older `stock_ticker` ScriptUI demo that now lives in `Scripts/demos/_archive/stock_ticker/`.

## Features

- Live data from Yahoo Finance (no API key required)
- Stock search with autocomplete
- Watchlist management
- Text binding: `{STOCK.price}` → live value in any text layer
- Four presets: Stock Card, Multi-Card, Comparison Chart, Text Only
- Offline support with cached data

## Prerequisites

- After Effects CC 2022 or later
- Node.js 18+

## Step 1: Enable CEP Debug Mode (required once per machine)

Adobe blocks unsigned CEP extensions by default. **Without this step the panel opens as a blank white window.**

Run in Terminal, then restart After Effects:

```bash
# AE 2022–2023 (CEP 11)
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
# AE 2024+ (CEP 12)
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

You only need to do this once per machine. To verify: reopen the panel — you should see the Ticker Data UI instead of a blank window.

> Alternatively, install [ZXP Installer](https://aescripts.com/learn/zxp-installer/) and enable debugging via Settings.

## Step 2: Install, Build, and Symlink

```bash
cd examples/ticker-data
npm install
npm run build
npm run symlink    # Links panel into AE's CEP extensions folder
```

Then in After Effects: **Window → Extensions → Ticker Data**

> Before packaging for distribution, change `zxp.password` in `cep.config.ts` to a real value.

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
