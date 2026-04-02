---
name: install-demo-stock-ticker
description: This skill should be used when installing the stock_ticker demo panel into After Effects. Handles symlinking the panel file into the correct ScriptUI Panels folder. Triggers on "install stock ticker", "setup stock ticker demo", or "install the demo".
---

# Install Stock Ticker Demo

Installs `stock_ticker_panel.jsx` from the ae-ai-starter repo into After Effects as a dockable ScriptUI panel.

## Steps

1. Find the installed AE year:
   ```bash
   ls /Applications/ | grep "After Effects"
   ```

2. Check if the symlink already exists:
   ```bash
   ls "/Applications/Adobe After Effects <YEAR>/Scripts/ScriptUI Panels/stock_ticker_panel.jsx"
   ```

3. If not present, create the symlink (requires sudo — ask the user to run it in their terminal):
   ```bash
   sudo ln -s "/Users/randycounsman/Git/ae-ai-starter/Scripts/demos/stock_ticker/stock_ticker_panel.jsx" "/Applications/Adobe After Effects <YEAR>/Scripts/ScriptUI Panels/stock_ticker_panel.jsx"
   ```

   **Critical:** The folder is `ScriptUI Panels` — two words with a space. Omitting the space is the most common mistake.

4. Tell the user to restart After Effects, then open the panel from **Window > Stock Ticker**.

## Notes

- Bundled data lives in `Input/sample_stock_data.json` — no API key needed for "Build Ticker".
- "Fetch Live Data" requires an Alpha Vantage API key.
