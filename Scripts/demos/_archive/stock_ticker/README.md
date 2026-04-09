# Stock Ticker + Sparkline

This ScriptUI demo is archived. The supported stock-data example now lives in [`examples/ticker-data/`](../../examples/ticker-data/).

Dockable ScriptUI panel that builds a scrolling market ticker and featured sparkline chart from bundled or live stock data.

## Files

- `stock_ticker_panel.jsx` — installable dockable panel
- `ticker_builder.jsxinc` — comp, ticker bar, sparkline, and expression construction
- `data_fetcher.jsxinc` — bundled JSON loading and optional live fetch via `curl`

## Install

1. Symlink [`stock_ticker_panel.jsx`](stock_ticker_panel.jsx) into After Effects' `Scripts/ScriptUI Panels` folder if you explicitly want to run the archived panel.
2. Restart After Effects.
3. Open it from **Window > Stock Ticker**.

## Controls

- `Scroll Speed` — live ticker crawl speed in pixels per second
- `Chart Days` — sparkline lookback window
- `Line Weight` — live sparkline stroke thickness
- `Gain/Loss Colors` — toggles green/red market coloring
- `Show Grid` — toggles sparkline grid lines

## Data Format

Bundled data lives in [`Input/sample_stock_data.json`](../../../Input/sample_stock_data.json) with this structure:

```json
{
  "stocks": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "prices": [
        { "date": "2025-12-01", "close": 244.29 }
      ],
      "current": 275.41,
      "change": "-0.48%"
    }
  ]
}
```

## Notes

- `Build Ticker` uses bundled JSON immediately, with no network dependency.
- `Fetch Live Data` requires macOS `curl`, an Alpha Vantage API key, and the AE preference that allows network/file access.
- The generated comp exposes a `Ticker Control` null so live-expression controls remain editable in AE.
