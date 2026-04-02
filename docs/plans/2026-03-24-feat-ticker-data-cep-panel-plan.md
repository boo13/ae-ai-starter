---
title: feat: Ticker Data CEP Panel
type: feat
status: active
date: 2026-03-24
---

# feat: Ticker Data CEP Panel

## Overview

A new CEP panel example (`examples/ticker-data/`) that fetches live financial data via `yahoo-finance2` and builds flexible data visualizations inside After Effects — sparklines, stock cards, comparison charts, and text value injection. Supersedes `Scripts/demos/stock_ticker/` (curl/Alpha Vantage, macOS-only, fragile).

**Key capabilities:**
- Fetch live quotes + historical data for any ticker via Yahoo Finance (no API key)
- Abstract text binding: write `{STOCK.price}` in AE text layers, map `STOCK → AAPL` in the panel, click Update — swap tickers without touching the comp
- Preset layouts: single stock card, multi-card grid, comparison chart, text-only
- Create comps from scratch OR populate existing comps/layers (template workflow)

---

## Architecture

### Stack
- **CEP Panel**: Svelte 5 + TypeScript + Vite + vite-cep-plugin (same as `examples/ai-claude/`)
- **Data**: `yahoo-finance2` npm package — pure Node.js, MIT license, no API key required
- **Bridge**: JSON file bridge (CEP writes `Input/ticker_data.json`, ExtendScript reads from disk)

### Why JSON File Bridge (not raw evalTS data passing)

| Concern | JSON File Bridge |
|---|---|
| Size limits | None — files can be any size |
| Persistence | Data survives panel reloads and AE crashes |
| Debugging | Inspect `Input/ticker_data.json` directly |
| ExtendScript testability | Builders run independently via File > Scripts |
| Project patterns | Matches social-card, existing stock ticker pattern |

### Data Path Resolution (Critical)

CEP and ExtendScript are separate processes. To write a file that ExtendScript can find:

1. **CEP** calls `evalTS("getProjectRoot")` → returns `"/path/to/project"` (or `""` if unsaved)
2. **CEP** checks for empty string → shows "Save your AE project first" if empty
3. **CEP** writes to `{projectRoot}/Input/ticker_data.json` using Node.js `fs`
4. **ExtendScript** reads from the same absolute path via `readJsonFile(new File(path))`

The `getProjectRoot()` function already exists in `examples/ai-claude/src/jsx/aeft/aeft.ts` — reuse it.

### yahoo-finance2 + CEP Fetch Context

CEP runs in "mixed context" (`--mixed-context` flag in `cep.config.ts`) where Chromium's `window.fetch` is globally available. `yahoo-finance2` uses native fetch when available — this should work out of the box in CEP. If issues arise with the bundled Node.js version, the fallback is `node-fetch` as a polyfill. Requires **AE 2023+** (bundles Node.js 16+).

---

## evalTS Function Registry

These are the functions exported from `src/jsx/aeft/aeft.ts` (callable via evalTS):

```typescript
// Reused from ai-claude:
getProjectRoot(): string                           // AE project parent dir, "" if unsaved
getActiveCompInfo(): CompInfo | { error: string }  // Active comp metadata

// New for ticker-data:
buildFromPreset(config: BuildConfig): BuildResult
populateTextBindings(config: TextBindConfig): BindResult
getActiveCompTextLayers(): TextLayerInfo[]         // For binding table preview
```

Where:

```typescript
// Passed from CEP as one JSON payload (no size issue — stays small)
interface BuildConfig {
  preset: "single-card" | "multi-card" | "comparison" | "text-only"
  dataFilePath: string         // absolute path to ticker_data.json
  customization: Customization
}

interface TextBindConfig {
  dataFilePath: string
  bindings: Record<string, string>  // { "STOCK": "AAPL", "STOCK2": "SCHD" }
}

interface Customization {
  period: "7d" | "30d" | "90d" | "1y"
  colorScheme: "default" | "monochrome"
  fontSize: "small" | "medium" | "large"
  sparklineAnimation: "none" | "draw-on"
}
```

The `dataFilePath` is passed explicitly (CEP knows it from step 2 of path resolution), so ExtendScript doesn't need to discover it — it just opens the file at the given path.

---

## Visual Building Blocks

### 1. Stock Card (`builders/card.ts`)

Function: `buildStockCard(stockData: StockData, config: Customization, compRoot: string)`

Creates a pre-comp named `TD: {SYMBOL}` containing:
- Symbol text layer (`{SYMBOL}`)
- Price text layer (formatted: `$248.30`)
- Change% text layer (formatted: `+1.97%`, colored green/red)
- Arrow indicator shape layer (triangle, green/red)
- Optional nested sparkline comp
- "Card Control" null with sliders for font size, spacing, width

**Create vs Populate:** If comp named `TD: {SYMBOL}` exists, update its text layers. Otherwise create from scratch.

### 2. Sparkline (`builders/sparkline.ts`)

Function: `buildSparkline(stockData: StockData, config: Customization, hostComp: CompItem)`

Creates a shape layer with path vertices from `history[].close` prices:
- Y: normalized `(close - min) / (max - min) * height`
- X: evenly spaced across width
- Stroke: green if `history.last > history.first`, red otherwise
- Optional Trim Path effect for draw-on animation
- Uses **close prices only** (intentional: historical adjusted close, not OHLC)

### 3. Comparison Chart (`builders/chart.ts`)

Function: `buildComparisonChart(stocks: StockData[], config: Customization, compRoot: string)`

Creates a comp named `TD: Comparison` containing:
- One sparkline path per stock, **normalized to % change from period start** (not absolute price — enables overlay of different-priced stocks)
- Color-coded per stock (up to 5 colors)
- Legend text layers (symbol + period return%)
- Optional grid lines shape layer
- "Chart Control" null with sliders

### 4. Text Value Binder (`builders/text-binder.ts`)

Function: `scanAndPopulateTextBindings(comp: CompItem, data: TickerData, bindings: Record<string, string>)`

Scans all text layers in `comp` for `{PLACEHOLDER.field}` patterns:

| Pattern | Resolves to |
|---|---|
| `{STOCK.price}` | `$248.30` |
| `{STOCK.change}` | `+4.85` |
| `{STOCK.changePercent}` | `+1.97%` |
| `{STOCK.name}` | `Apple Inc.` |
| `{STOCK.symbol}` | `AAPL` |
| `{STOCK.volume}` | `54.1M` |
| `{STOCK.marketCap}` | `$3.8T` |
| `{STOCK.high52w}` | `$260.10` |
| `{STOCK.low52w}` | `$164.08` |
| `{STOCK.fetchedAt}` | `Mar 24 2:00 PM` |

**Number formatting happens in ExtendScript** at bind time (not in the JSON file) — keeps raw numbers in the data file for maximum reusability.

**Binding Table:** Abstract names map to real tickers. `STOCK` → `AAPL`. User writes `{STOCK.price}` in AE, changes `STOCK` to `MSFT` in the panel, clicks Update Text — source text layers untouched.

### 5. Preset Orchestrator (`builders/preset.ts`)

| Preset | What it builds |
|---|---|
| `"single-card"` | One stock card comp with embedded sparkline |
| `"multi-card"` | Grid of stock cards, one per watchlist ticker |
| `"comparison"` | Comparison chart with all watchlist tickers |
| `"text-only"` | Runs text binder on active comp only |

### Create vs Populate Naming Convention

| Element | "Create" names it | "Populate" detects this name |
|---|---|---|
| Stock card comp | `TD: AAPL` | Any comp named `TD: {SYMBOL}` |
| Comparison chart comp | `TD: Comparison` | Comp named `TD: Comparison` |
| Card grid comp | `TD: Grid` | Comp named `TD: Grid` |
| Text layers | n/a | Any text layer in active comp |

Prefix `TD:` stands for "Ticker Data" — avoids collision with user's own comp names.

---

## Data Layer

### ticker-service.ts

```typescript
fetchQuotes(symbols: string[]): Promise<StockQuote[]>     // yahoo-finance2.quote()
fetchHistorical(symbol: string, period: Period): Promise<PriceBar[]>  // yahoo-finance2.historical()
searchTickers(query: string): Promise<TickerMatch[]>       // yahoo-finance2.search() — for autocomplete
```

Uses Chromium's global `fetch` (available via CEP mixed context). Rate limit: ~1-2 req/sec sustained. Implements 30-second backoff on 429.

### data-writer.ts

```typescript
// Two-step flow — project must be saved
async writeTickerData(data: TickerData, bindings: Bindings): Promise<void> {
  const projectRoot = await evalTS("getProjectRoot")
  if (!projectRoot) throw new Error("Save your AE project first")
  const inputDir = path.join(projectRoot, "Input")
  fs.mkdirSync(inputDir, { recursive: true })
  fs.writeFileSync(path.join(inputDir, "ticker_data.json"), JSON.stringify(payload, null, 2))
}
```

### Data File Schema (`Input/ticker_data.json`)

```json
{
  "fetchedAt": "2026-03-24T12:00:00Z",
  "bindings": { "STOCK": "AAPL", "STOCK2": "SCHD" },
  "stocks": [{
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "current": 248.30,
    "change": 4.85,
    "changePercent": 1.97,
    "volume": 54123456,
    "marketCap": 3800000000000,
    "high52w": 260.10,
    "low52w": 164.08,
    "regularMarketTime": "2026-03-24T20:00:00Z",
    "marketState": "REGULAR",
    "history": [
      { "date": "2026-03-01", "open": 241.00, "high": 245.00, "low": 240.00, "close": 243.50, "volume": 48000000 }
    ]
  }]
}
```

**Market state note:** Yahoo Finance data is delayed 15-20 min for US equities. `marketState` can be `REGULAR`, `PRE`, `POST`, or `CLOSED`. The `current` price field always reflects the most recent price for the current session type (regular, pre, or post market) — no special handling needed.

### Config Persistence (`config-store.ts`)

Stores watchlist and binding table in CEP's `localStorage` (Chromium built-in, survives panel reloads, lost on extension reinstall). If localStorage is empty on load, shows empty state with "Add a ticker to get started."

### Sample Data (`Input/sample_ticker_data.json`)

Ships with 5 stocks (AAPL, MSFT, GOOGL, AMZN, TSLA), 30 days history, one positive and one negative gainer, so all presets work out of the box without network access. Included in the repo.

---

## CEP Panel UI

**Dimensions:** 420 × 720 (slightly wider/taller than ai-claude to fit binding table)

**Sections (top to bottom):**

1. **Header** — "Ticker Data" + status chip: `idle` / `fetching` / `building` / `error`
2. **Ticker Search** — Autocomplete field (`searchTickers()` on input), Add button → watchlist
3. **Watchlist** — Chips/rows for added tickers, with × remove buttons
4. **Binding Table** — Editable rows: Placeholder Name (text input) ↔ Ticker (dropdown from watchlist). "＋ Add Binding" link. If a ticker is removed from watchlist while referenced here, that row turns red with warning.
5. **Preset Selector** — Dropdown: Single Stock Card / Multi-Card Grid / Comparison Chart / Text Values Only. Brief description updates below dropdown.
6. **Customization** (collapsible `▸ Options`) — Chart period, color scheme, font size, sparkline animation
7. **Action Bar** — Three buttons: **Fetch Data** / **Build in AE** / **Update Text** + a **↺ Refresh All** button (fetches then rebuilds last preset in one click)
8. **Activity Log** — Scrollable, timestamped log entries (success green, error red, info gray)

**Loading state:** During `evalTS()` calls that block AE, the panel disables all action buttons and shows a spinner in the status chip. The Activity Log shows "Building... (AE is busy)". Buttons re-enable when the evalTS Promise resolves.

---

## Error Handling

| Scenario | Response |
|---|---|
| Invalid ticker symbol | Inline error under search field; don't add to watchlist |
| Network / Yahoo down | Error in log; show "Use cached data" button if `ticker_data.json` exists |
| Rate limit (429) | "Yahoo rate limit hit — waiting 30s" in log; fetch button disabled 30s |
| AE project unsaved | "Save your AE project first — needed to determine data file path"; disables Fetch/Build/Update |
| No AE project open | "Open an After Effects project"; disables Fetch/Build/Update |
| No active comp (text-only) | "Select a composition first" in log |
| No text bindings found | "No `{PLACEHOLDER.field}` patterns found in active comp" in log |
| Ticker removed from watchlist while in binding | Binding row turns red; "SCHD not in watchlist — re-add or delete this binding" |
| Stale data >24h | Yellow warning banner: "Data last fetched 2 days ago" with re-fetch button |
| Partial fetch failure | Log per-ticker status; write only successful ones to JSON |

---

## Project Structure

```
examples/ticker-data/
  README.md
  LICENSE
  package.json                     # yahoo-finance2, vite-cep-plugin, svelte 5
  package-lock.json
  cep.config.ts                    # id: com.ae-ai-starter.ticker-data; port: 3002/5002/8862
  vite.config.ts                   # adapted from ai-claude
  vite.es.config.ts                # adapted from ai-claude
  tsconfig.json
  tsconfig-build.json
  .env.production
  .gitignore
  .npmrc
  Input/
    sample_ticker_data.json        # shipped sample: AAPL MSFT GOOGL AMZN TSLA, 30d
  src/
    assets/
      dark-icon.svg
      light-icon.svg
    js/
      main/
        index.html
        main.svelte
        index-svelte.ts
      components/
        TickerSearch.svelte        # Autocomplete input + add to watchlist
        Watchlist.svelte           # Ticker chips with remove
        BindingTable.svelte        # Placeholder ↔ ticker mapping table
        PresetSelector.svelte      # Preset dropdown + description
        CustomizePanel.svelte      # Collapsible options
        ActionBar.svelte           # Fetch / Build / Update / Refresh All
        ActivityLog.svelte         # Timestamped log
        StatusChip.svelte          # idle / fetching / building / error
      lib/
        ticker-service.ts          # yahoo-finance2 wrapper (fetch quotes, history, search)
        data-writer.ts             # get project root via evalTS, write JSON to Input/
        config-store.ts            # localStorage: persist watchlist + bindings
        cep/                       # copy from ai-claude (CSInterface, node.ts, vulcan types)
        utils/                     # copy from ai-claude (bolt.ts evalTS helper)
    jsx/
      aeft/
        aeft.ts                    # evalTS entry: exports buildFromPreset, populateTextBindings, getActiveCompTextLayers (+ reused getProjectRoot, getActiveCompInfo)
      builders/
        card.ts                    # buildStockCard()
        sparkline.ts               # buildSparkline()
        chart.ts                   # buildComparisonChart()
        text-binder.ts             # scanAndPopulateTextBindings()
        preset.ts                  # runPreset() orchestrator
      lib/
        json2.js                   # copy from ai-claude (ES3 JSON polyfill)
        format.ts                  # formatPrice(), formatVolume(), formatMarketCap(), formatPercent()
    shared/
      types.ts                     # StockData, TickerData, BuildConfig, TextBindConfig, etc.
```

## Files to Copy/Adapt from ai-claude

| Source | Destination | Action |
|---|---|---|
| `examples/ai-claude/src/js/lib/cep/` | `src/js/lib/cep/` | Copy unchanged |
| `examples/ai-claude/src/js/lib/utils/bolt.ts` | `src/js/lib/utils/bolt.ts` | Copy unchanged |
| `examples/ai-claude/src/jsx/lib/json2.js` | `src/jsx/lib/json2.js` | Copy unchanged |
| `examples/ai-claude/src/jsx/aeft/aeft-utils.ts` | `src/jsx/aeft/aeft-utils.ts` | Copy unchanged |
| `examples/ai-claude/cep.config.ts` | `cep.config.ts` | Adapt: new id/ports |
| `examples/ai-claude/vite.config.ts` | `vite.config.ts` | Adapt: rename |
| `examples/ai-claude/vite.es.config.ts` | `vite.es.config.ts` | Adapt: rename |
| `examples/ai-claude/package.json` | `package.json` | Adapt: replace `@anthropic-ai/sdk` with `yahoo-finance2` |
| `getProjectRoot()` from aeft.ts | `src/jsx/aeft/aeft.ts` | Reuse function |

---

## Old Demo Cleanup

- **Move** `Scripts/demos/stock_ticker/` → `Scripts/demos/_archive/stock_ticker/` (archive, not delete)
- **Keep** `Input/sample_stock_data.json` in the archive alongside the old scripts
- **Update** `examples/README.md` — add ticker-data entry, note it supersedes the old demo
- Historical design doc at `docs/plans/2026-03-03-demo-panels-design.md` — leave as-is

---

## Implementation Phases

### Phase 1: Boilerplate (get panel loading in AE)
- Copy/adapt build config from ai-claude: `cep.config.ts`, `vite.config.ts`, `vite.es.config.ts`, `package.json`, `tsconfig`, `.npmrc`
- Copy utility files: `cep/`, `utils/bolt.ts`, `jsx/lib/json2.js`, `jsx/aeft/aeft-utils.ts`
- Scaffold `main.svelte` with placeholder UI and one evalTS test call
- `npm install && npm run symlink && npm run build` — panel appears in AE Window menu

### Phase 2: Data layer
- `src/js/lib/ticker-service.ts` — yahoo-finance2 quote + historical + search
- `src/js/lib/data-writer.ts` — get project root, write to Input/ticker_data.json
- Test: fetch AAPL, write file, inspect JSON on disk

### Phase 3: Basic UI + activity log
- `TickerSearch.svelte` — autocomplete with `searchTickers()`
- `Watchlist.svelte` — add/remove tickers
- `ActionBar.svelte` — Fetch Data button wired up
- `ActivityLog.svelte` — log fetch events
- `config-store.ts` — persist watchlist to localStorage
- Test: add tickers, click Fetch, verify `Input/ticker_data.json` written

### Phase 4: Text binder (simplest, most useful builder)
- `src/jsx/builders/text-binder.ts`
- `src/jsx/lib/format.ts` — number formatters (shared across builders)
- `BindingTable.svelte`
- evalTS: `populateTextBindings()`
- Update Text button wired up
- Test: create text layer `{STOCK.price}`, bind STOCK→AAPL, Update Text → price appears

### Phase 5: Sparkline
- `src/jsx/builders/sparkline.ts`
- Wire into `buildFromPreset("single-card")` as the first preset to exercise sparkline
- Test: verify path vertices match historical data shape

### Phase 6: Stock card
- `src/jsx/builders/card.ts`
- `PresetSelector.svelte` + `CustomizePanel.svelte`
- Build in AE button wired to single-card preset
- Test: build card, verify layers, populate mode (existing `TD: AAPL` comp)

### Phase 7: Comparison chart
- `src/jsx/builders/chart.ts`
- `src/jsx/builders/preset.ts` orchestrator
- multi-card and comparison presets
- Test: build comparison chart for 3 stocks, verify normalized paths

### Phase 8: Polish + sample data
- `StatusChip.svelte` — loading state during evalTS
- `↺ Refresh All` button
- Stale data warning (>24h)
- Write `Input/sample_ticker_data.json` with realistic data
- Move old stock ticker to archive
- Write README.md

---

## Setup & Installation

**Prerequisites:**
- After Effects 2023 or later (CEP with Node.js 16+)
- Node.js 18+ (for building — not for the CEP runtime)
- npm
- CEP debug mode enabled: set `PlayerDebugMode` to `1` in CSXS preferences (see README for exact steps)

```bash
cd examples/ticker-data
npm install
npm run symlink    # Symlink into ~/Library/Application Support/Adobe/CEP/extensions/
npm run build      # Production build
# OR
npm run dev        # Dev mode with hot reload (requires dev server running)
```

**First run:** Panel appears under Window menu in AE. Sample data is pre-loaded — all presets work offline immediately.

---

## Important Notes

- **Yahoo Finance ToS:** `yahoo-finance2` uses Yahoo Finance's unofficial internal API. This is for personal/educational use. May break if Yahoo changes their endpoints. Not suitable for production financial applications.
- **Data delay:** US equity quotes are delayed 15-20 minutes. Not real-time.
- **No API key:** This is intentional — the example should work without any configuration.

---

## Verification

1. `cd examples/ticker-data && npm install && npm run build` — succeeds with no errors
2. `npm run symlink` — extension appears in `~/Library/Application Support/Adobe/CEP/extensions/com.ae-ai-starter.ticker-data/`
3. **Panel loads** — Open AE → Window menu shows "Ticker Data"
4. **Offline sample data** — Panel displays sample ticker watchlist without network
5. **Live fetch** — Search "TSLA", add to watchlist, click Fetch → `Input/ticker_data.json` written with TSLA data
6. **Unsaved project guard** — New unsaved project → "Save your AE project first" shown, Fetch disabled
7. **Text binding** — Create text layer `{STOCK.price}`, set binding STOCK→AAPL, Update Text → `$248.30` appears
8. **Swap ticker** — Change STOCK→MSFT, Update Text → MSFT price appears without touching text layer
9. **Volume formatting** — `{STOCK.volume}` shows `54.1M` not `54123456`
10. **Single card preset** — Select Single Stock Card, Build in AE → comp `TD: AAPL` created with symbol, price, change, arrow layers
11. **Populate mode** — Manually rename existing comp `TD: AAPL`, Build again → existing comp updated, not duplicated
12. **Sparkline** — Sparkline shape layer path vertices visually match price trend in chart
13. **Comparison chart** — Add 3 stocks, Comparison preset, Build → `TD: Comparison` comp with 3 paths, legend, normalized %
14. **Refresh All** — Click ↺ Refresh All → fetches, then rebuilds last preset in sequence
15. **Offline fallback** — Disconnect network, click Fetch → "Yahoo Finance unavailable", "Use cached data" button works
16. **Stale data** — Manually set `fetchedAt` to 2 days ago in JSON → yellow stale warning appears in panel
17. **Partial failure** — Add a delisted/invalid ticker alongside valid ones → valid tickers write to JSON, failure reported per-ticker in log
