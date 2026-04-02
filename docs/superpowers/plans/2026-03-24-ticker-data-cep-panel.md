# Ticker Data CEP Panel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CEP panel example (`examples/ticker-data/`) that fetches live financial data via `yahoo-finance2` and creates After Effects visualizations — sparklines, stock cards, comparison charts, and text value injection.

**Architecture:** CEP panel (Svelte 5 + TypeScript + Vite) handles UI and data fetching. Fetched data is written to `Input/ticker_data.json` via Node.js `fs`. ExtendScript builders (ES3-compiled TypeScript) read the file and create AE layers/comps. CEP triggers builds via `evalTS()` which passes a config object + absolute file path.

**Tech Stack:** Svelte 5, TypeScript, Vite, vite-cep-plugin, yahoo-finance2, types-for-adobe, Rollup/Babel (ES3 ExtendScript compilation)

**Spec:** `docs/plans/2026-03-24-feat-ticker-data-cep-panel-plan.md`

---

## File Map

### CEP (Svelte/TypeScript — runs in Chromium + Node.js)
| File | Responsibility |
|---|---|
| `cep.config.ts` | CEP extension metadata (id, ports, panel size) |
| `package.json` | Dependencies: yahoo-finance2, vite-cep-plugin, svelte |
| `src/shared/types.ts` | All shared TypeScript types (StockData, BuildConfig, etc.) |
| `src/js/lib/ticker-service.ts` | yahoo-finance2 wrapper: fetchQuotes, fetchHistorical, searchTickers |
| `src/js/lib/data-writer.ts` | Get project root via evalTS, write Input/ticker_data.json |
| `src/js/lib/config-store.ts` | Persist watchlist + bindings in localStorage |
| `src/js/components/StatusChip.svelte` | idle/fetching/building/error status indicator |
| `src/js/components/ActivityLog.svelte` | Timestamped scrollable log |
| `src/js/components/TickerSearch.svelte` | Autocomplete search + add to watchlist |
| `src/js/components/Watchlist.svelte` | Ticker chips with remove buttons |
| `src/js/components/BindingTable.svelte` | Placeholder ↔ ticker mapping table |
| `src/js/components/PresetSelector.svelte` | Preset dropdown + description |
| `src/js/components/CustomizePanel.svelte` | Collapsible options |
| `src/js/components/ActionBar.svelte` | Fetch / Build / Update / Refresh All buttons |
| `src/js/main/main.svelte` | Root component, orchestrates all state and actions |

### ExtendScript (TypeScript → compiled ES3 — runs inside AE)
| File | Responsibility |
|---|---|
| `src/jsx/aeft/aeft.ts` | evalTS entry: exports all callable functions |
| `src/jsx/lib/format.ts` | formatPrice, formatVolume, formatMarketCap, formatPercent |
| `src/jsx/builders/text-binder.ts` | Scan text layers for {PLACEHOLDER.field}, populate values |
| `src/jsx/builders/sparkline.ts` | Build shape layer from historical close prices |
| `src/jsx/builders/card.ts` | Build stock card pre-comp |
| `src/jsx/builders/chart.ts` | Build comparison chart comp |
| `src/jsx/builders/preset.ts` | Orchestrate presets: single-card, multi-card, comparison, text-only |

### Copy/adapt from ai-claude (no edits needed)
- `src/js/lib/cep/` — CSInterface, node.ts, vulcan types
- `src/js/lib/utils/bolt.ts` — evalTS helper
- `src/jsx/lib/json2.js` — ES3 JSON polyfill
- `src/jsx/aeft/aeft-utils.ts` — getActiveComp, getProjectDir
- `vite.config.ts`, `vite.es.config.ts`, `tsconfig.json`, `tsconfig-build.json`, `.npmrc`

---

## Task 1: Scaffold from ai-claude

**Files:**
- Create: `examples/ticker-data/` (entire directory)
- Reference: `examples/ai-claude/` (copy structure)

- [ ] **Step 1: Copy the ai-claude example as starting point**

```bash
cp -r examples/ai-claude examples/ticker-data
cd examples/ticker-data
```

- [ ] **Step 2: Remove ai-claude-specific files**

```bash
rm -rf node_modules dist
rm src/js/lib/providers
rm src/js/lib/ai-action.ts
rm src/js/lib/context.ts
rm src/js/lib/provider-config.ts
rm src/js/components/ApiKeySettings.svelte
rm src/js/components/ChatInput.svelte
rm src/js/components/ChatMessage.svelte
rm src/js/components/ActionBar.svelte
```

- [ ] **Step 3: Replace `cep.config.ts`**

```typescript
// examples/ticker-data/cep.config.ts
import { CEP_Config } from "vite-cep-plugin";
import { version } from "./package.json";

const config: CEP_Config = {
  version,
  id: "com.ae-ai-starter.ticker-data",
  displayName: "Ticker Data",
  symlink: "local",
  port: 3002,
  servePort: 5002,
  startingDebugPort: 8862,
  extensionManifestVersion: 6.0,
  requiredRuntimeVersion: 9.0,
  hosts: [{ name: "AEFT", version: "[0.0,99.9]" }],
  type: "Panel",
  iconDarkNormal: "./src/assets/light-icon.svg",
  iconNormal: "./src/assets/dark-icon.svg",
  iconDarkNormalRollOver: "./src/assets/light-icon.svg",
  iconNormalRollOver: "./src/assets/dark-icon.svg",
  parameters: ["--v=0", "--enable-nodejs", "--mixed-context"],
  width: 420,
  height: 720,
  panels: [
    {
      mainPath: "./main/index.html",
      name: "main",
      panelDisplayName: "Ticker Data",
      autoVisible: true,
      width: 420,
      height: 720,
    },
  ],
  build: { jsxBin: "off", sourceMap: true },
  zxp: {
    country: "US",
    province: "CA",
    org: "ae-ai-starter",
    password: "password",
    tsa: ["http://timestamp.digicert.com/", "http://timestamp.apple.com/ts01"],
    allowSkipTSA: false,
    sourceMap: false,
    jsxBin: "off",
  },
  installModules: [],
  copyAssets: [],
  copyZipAssets: [],
};
export default config;
```

- [ ] **Step 4: Replace `package.json`**

```json
{
  "name": "ticker-data",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "watch": "tsc && vite build --watch true",
    "build": "rimraf dist/* && tsc -p \"tsconfig-build.json\" && vite build --watch false",
    "zxp": "rimraf dist/* && tsc -p \"tsconfig-build.json\" && cross-env ZXP_PACKAGE=true vite build --watch false",
    "serve": "cross-env SERVE_PANEL=true vite preview",
    "symlink": "cross-env BOLT_ACTION=symlink vite",
    "delsymlink": "cross-env BOLT_ACTION=delsymlink vite"
  },
  "dependencies": {
    "yahoo-finance2": "^2.11.3"
  },
  "devDependencies": {
    "@babel/core": "^7.19.0",
    "@babel/plugin-proposal-class-properties": "^7.16.0",
    "@babel/plugin-proposal-object-rest-spread": "^7.16.0",
    "@babel/plugin-syntax-dynamic-import": "^7.8.3",
    "@babel/plugin-transform-runtime": "^7.16.4",
    "@babel/preset-env": "^7.19.0",
    "@babel/preset-typescript": "^7.16.0",
    "@babel/runtime": "^7.16.3",
    "@rollup/plugin-babel": "^6.0.4",
    "@rollup/plugin-commonjs": "^28.0.3",
    "@rollup/plugin-image": "^3.0.3",
    "@rollup/plugin-json": "^6.1.0",
    "@rollup/plugin-node-resolve": "^13.1.3",
    "@rollup/plugin-replace": "^6.0.2",
    "@sveltejs/vite-plugin-svelte": "^5.1.0",
    "@tsconfig/svelte": "^5.0.4",
    "@types/fs-extra": "^9.0.13",
    "@types/node": "^16.11.7",
    "@types/trusted-types": "^2.0.2",
    "babel-plugin-transform-scss": "^1.2.0",
    "babel-preset-env": "^1.7.0",
    "core-js": "3",
    "cross-env": "^7.0.3",
    "fs-extra": "^10.0.0",
    "rimraf": "^3.0.2",
    "rollup": "^4.42.0",
    "rollup-plugin-multi-input": "^1.5.0",
    "rollup-plugin-node-copy": "^1.0.4",
    "rollup-plugin-scss": "^4.0.1",
    "sass": "^1.89.1",
    "source-map": "^0.7.4",
    "svelte": "^5.33.14",
    "svelte-check": "^4.2.1",
    "svelte-preprocess": "^6.0.3",
    "types-for-adobe": "^7.2.3",
    "types-for-adobe-extras": "^0.0.9",
    "typescript": "^5.8.3",
    "vite": "^6.3.5",
    "vite-cep-plugin": "^2.2.0"
  }
}
```

- [ ] **Step 5: Stub `main.svelte` (enough to prove the panel loads)**

Replace `src/js/main/main.svelte` content with a minimal placeholder:

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { evalTS } from "../lib/utils/bolt";

  let status = $state("idle");

  onMount(async () => {
    try {
      const root = await evalTS("getProjectRoot");
      status = root ? `connected: ${root}` : "no project saved";
    } catch (e) {
      status = "CEP bridge error";
    }
  });
</script>

<main>
  <h1>Ticker Data</h1>
  <p>{status}</p>
</main>

<style>
  main { padding: 16px; font-family: sans-serif; color: #ccc; background: #1e1e1e; min-height: 100vh; }
  h1 { font-size: 16px; margin: 0 0 8px; }
</style>
```

- [ ] **Step 6: Install and build**

```bash
cd examples/ticker-data
npm install
npm run build
```

Expected: Build succeeds. `dist/` created. No TypeScript errors.

- [ ] **Step 7: Symlink and verify in AE**

```bash
npm run symlink
```

Open After Effects → Window menu → verify "Ticker Data" panel appears. Dock it. The panel should show "Ticker Data" heading and a status line (either a project path or "no project saved").

- [ ] **Step 8: Commit**

```bash
cd ../..
git add examples/ticker-data
git commit -m "feat(ticker-data): scaffold CEP panel from ai-claude"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `examples/ticker-data/src/shared/types.ts`
- Modify: `examples/ticker-data/src/shared/shared.ts` (rename namespace)

- [ ] **Step 1: Update namespace in `src/shared/shared.ts`**

```typescript
// src/shared/shared.ts
export const ns = "__ticker_data__";
```

- [ ] **Step 2: Create `src/shared/types.ts`**

```typescript
// src/shared/types.ts

export interface PriceBar {
  date: string;       // "2026-03-01"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockData {
  symbol: string;
  name: string;
  current: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high52w: number;
  low52w: number;
  regularMarketTime: string;  // ISO string
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED";
  history: PriceBar[];
}

export interface TickerData {
  fetchedAt: string;
  bindings: Record<string, string>;   // { "STOCK": "AAPL" }
  stocks: StockData[];
}

export type Period = "7d" | "30d" | "90d" | "1y";
export type Preset = "single-card" | "multi-card" | "comparison" | "text-only";
export type ColorScheme = "default" | "monochrome";
export type FontSize = "small" | "medium" | "large";
export type SparklineAnimation = "none" | "draw-on";

export interface Customization {
  period: Period;
  colorScheme: ColorScheme;
  fontSize: FontSize;
  sparklineAnimation: SparklineAnimation;
}

export interface BuildConfig {
  preset: Preset;
  dataFilePath: string;
  customization: Customization;
}

export interface TextBindConfig {
  dataFilePath: string;
  bindings: Record<string, string>;
}

export interface BuildResult {
  success: boolean;
  message: string;
  compsCreated?: string[];
}

export interface BindResult {
  success: boolean;
  message: string;
  layersUpdated?: number;
}

export interface LogEntry {
  timestamp: number;
  level: "info" | "success" | "error";
  message: string;
}

export type PanelStatus = "idle" | "fetching" | "building" | "error";
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add examples/ticker-data/src/shared/
git commit -m "feat(ticker-data): add shared TypeScript types"
```

---

## Task 3: Ticker Service (Data Fetching)

**Files:**
- Create: `examples/ticker-data/src/js/lib/ticker-service.ts`

- [ ] **Step 1: Create `ticker-service.ts`**

```typescript
// src/js/lib/ticker-service.ts
import yahooFinance from "yahoo-finance2";
import type { StockData, PriceBar, Period } from "../../../shared/types";

// Suppress yahoo-finance2 validation noise in CEP console
yahooFinance.setGlobalConfig({
  validation: { logErrors: false, logOptionsErrors: false },
  queue: { concurrency: 2, timeout: 15000 },
});

function periodToDateRange(period: Period): { period1: Date; period2: Date } {
  const now = new Date();
  const daysMap: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  const start = new Date(now.getTime() - daysMap[period] * 24 * 60 * 60 * 1000);
  return { period1: start, period2: now };
}

export async function fetchHistorical(symbol: string, period: Period): Promise<PriceBar[]> {
  const { period1, period2 } = periodToDateRange(period);
  const history = await yahooFinance.historical(symbol, { period1, period2, interval: "1d" });
  return history.map((h) => ({
    date: h.date.toISOString().slice(0, 10),
    open: h.open ?? 0,
    high: h.high ?? 0,
    low: h.low ?? 0,
    close: h.close ?? 0,
    volume: h.volume ?? 0,
  }));
}

export async function fetchQuotes(symbols: string[], period: Period = "30d"): Promise<StockData[]> {
  const results = await Promise.allSettled(
    symbols.map(async (symbol): Promise<StockData> => {
      const quote = await yahooFinance.quote(symbol);
      const bars = await fetchHistorical(symbol, period);

      return {
        symbol: quote.symbol ?? symbol,
        name: quote.longName ?? quote.shortName ?? symbol,
        current: quote.regularMarketPrice ?? 0,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
        volume: quote.regularMarketVolume ?? 0,
        marketCap: quote.marketCap ?? 0,
        high52w: quote.fiftyTwoWeekHigh ?? 0,
        low52w: quote.fiftyTwoWeekLow ?? 0,
        regularMarketTime: quote.regularMarketTime?.toISOString() ?? new Date().toISOString(),
        marketState: (quote.marketState as StockData["marketState"]) ?? "CLOSED",
        history: bars,
      };
    })
  );

  const stocks: StockData[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      stocks.push(r.value);
    } else {
      errors.push(`${symbols[i]}: ${r.reason?.message ?? "unknown error"}`);
    }
  });

  if (errors.length > 0) {
    // Partial success — throw with details so UI can report per-ticker failure
    const e = new Error(`Failed to fetch: ${errors.join("; ")}`);
    (e as any).partialResults = stocks;
    (e as any).errors = errors;
    throw e;
  }

  return stocks;
}

export async function searchTickers(query: string): Promise<{ symbol: string; name: string }[]> {
  if (query.length < 2) return [];
  try {
    const result = await yahooFinance.search(query);
    return (result.quotes ?? [])
      .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .slice(0, 8)
      .map((q: any) => ({ symbol: q.symbol ?? "", name: q.shortname ?? q.longname ?? q.symbol ?? "" }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Builds cleanly. Note: `yahoo-finance2` will be bundled by Vite as a CJS module.

- [ ] **Step 3: Commit**

```bash
git add examples/ticker-data/src/js/lib/ticker-service.ts
git commit -m "feat(ticker-data): add ticker-service with yahoo-finance2"
```

---

## Task 4: Data Writer

**Files:**
- Create: `examples/ticker-data/src/js/lib/data-writer.ts`
- Reference: `examples/ai-claude/src/js/lib/ai-action.ts` (fs write pattern)

- [ ] **Step 1: Create `data-writer.ts`**

```typescript
// src/js/lib/data-writer.ts
import { evalTS } from "./utils/bolt";
import type { TickerData } from "../../../shared/types";

// CEP's Node.js fs — accessed via require() in mixed context
declare const window: any;
const fs: typeof import("fs") = typeof window.cep !== "undefined" ? require("fs") : ({} as any);
const path: typeof import("path") = typeof window.cep !== "undefined" ? require("path") : ({} as any);

export async function getProjectRoot(): Promise<string> {
  const root = await evalTS("getProjectRoot");
  return root ?? "";
}

export async function writeTickerData(
  data: TickerData,
  projectRoot: string
): Promise<string> {
  if (!projectRoot) {
    throw new Error("Save your AE project first — needed to determine data file path.");
  }
  const inputDir = path.join(projectRoot, "Input");
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
  }
  const filePath = path.join(inputDir, "ticker_data.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

export function readCachedData(projectRoot: string): TickerData | null {
  if (!projectRoot) return null;
  const filePath = path.join(projectRoot, "Input", "ticker_data.json");
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as TickerData;
    }
  } catch {
    return null;
  }
  return null;
}

export function isCacheStale(data: TickerData | null): boolean {
  if (!data?.fetchedAt) return true;
  const fetchedAt = new Date(data.fetchedAt).getTime();
  const hoursOld = (Date.now() - fetchedAt) / (1000 * 60 * 60);
  return hoursOld > 24;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add examples/ticker-data/src/js/lib/data-writer.ts
git commit -m "feat(ticker-data): add data-writer for Input/ticker_data.json"
```

---

## Task 5: Config Store

**Files:**
- Create: `examples/ticker-data/src/js/lib/config-store.ts`

- [ ] **Step 1: Create `config-store.ts`**

```typescript
// src/js/lib/config-store.ts
// Persists watchlist and bindings in CEP's localStorage.
// Data survives panel reloads but is cleared on extension reinstall.

const WATCHLIST_KEY = "td_watchlist";
const BINDINGS_KEY = "td_bindings";
const LAST_PRESET_KEY = "td_last_preset";

export function loadWatchlist(): string[] {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveWatchlist(symbols: string[]): void {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(symbols));
}

export function loadBindings(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(BINDINGS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveBindings(bindings: Record<string, string>): void {
  localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
}

export function loadLastPreset(): string {
  return localStorage.getItem(LAST_PRESET_KEY) ?? "single-card";
}

export function saveLastPreset(preset: string): void {
  localStorage.setItem(LAST_PRESET_KEY, preset);
}
```

- [ ] **Step 2: Commit**

```bash
git add examples/ticker-data/src/js/lib/config-store.ts
git commit -m "feat(ticker-data): add config-store (localStorage persistence)"
```

---

## Task 6: UI Components — Log, Status, Search, Watchlist

**Files:**
- Create: `src/js/components/StatusChip.svelte`
- Create: `src/js/components/ActivityLog.svelte`
- Create: `src/js/components/TickerSearch.svelte`
- Create: `src/js/components/Watchlist.svelte`

- [ ] **Step 1: Create `StatusChip.svelte`**

```svelte
<!-- src/js/components/StatusChip.svelte -->
<script lang="ts">
  import type { PanelStatus } from "../../../shared/types";
  let { status }: { status: PanelStatus } = $props();
  const label: Record<PanelStatus, string> = {
    idle: "Ready",
    fetching: "Fetching...",
    building: "Building in AE...",
    error: "Error",
  };
  const color: Record<PanelStatus, string> = {
    idle: "#4a9eff",
    fetching: "#f0c040",
    building: "#f0c040",
    error: "#e05555",
  };
</script>

<span class="chip" style:background={color[status]}>{label[status]}</span>

<style>
  .chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    color: #111;
  }
</style>
```

- [ ] **Step 2: Create `ActivityLog.svelte`**

```svelte
<!-- src/js/components/ActivityLog.svelte -->
<script lang="ts">
  import type { LogEntry } from "../../../shared/types";
  let { entries }: { entries: LogEntry[] } = $props();

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
</script>

<div class="log">
  {#each entries.slice().reverse() as entry}
    <div class="entry {entry.level}">
      <span class="time">{formatTime(entry.timestamp)}</span>
      <span class="msg">{entry.message}</span>
    </div>
  {/each}
  {#if entries.length === 0}
    <div class="empty">No activity yet</div>
  {/if}
</div>

<style>
  .log { background: #111; border-radius: 4px; padding: 8px; max-height: 120px; overflow-y: auto; font-size: 11px; }
  .entry { display: flex; gap: 6px; padding: 2px 0; }
  .time { color: #666; flex-shrink: 0; }
  .info .msg { color: #aaa; }
  .success .msg { color: #4caf50; }
  .error .msg { color: #e05555; }
  .empty { color: #555; font-style: italic; }
</style>
```

- [ ] **Step 3: Create `TickerSearch.svelte`**

```svelte
<!-- src/js/components/TickerSearch.svelte -->
<script lang="ts">
  import { searchTickers } from "../lib/ticker-service";

  let { onAdd }: { onAdd: (symbol: string, name: string) => void } = $props();

  let query = $state("");
  let suggestions: { symbol: string; name: string }[] = $state([]);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let errorMsg = $state("");

  function handleInput() {
    clearTimeout(debounceTimer);
    errorMsg = "";
    if (query.length < 2) { suggestions = []; return; }
    debounceTimer = setTimeout(async () => {
      suggestions = await searchTickers(query);
    }, 300);
  }

  function select(s: { symbol: string; name: string }) {
    onAdd(s.symbol, s.name);
    query = "";
    suggestions = [];
  }
</script>

<div class="search-wrap">
  <div class="row">
    <input
      type="text"
      placeholder="Search ticker (e.g. AAPL)"
      bind:value={query}
      oninput={handleInput}
    />
  </div>
  {#if suggestions.length > 0}
    <ul class="suggestions">
      {#each suggestions as s}
        <li><button onclick={() => select(s)}><strong>{s.symbol}</strong> — {s.name}</button></li>
      {/each}
    </ul>
  {/if}
  {#if errorMsg}<p class="err">{errorMsg}</p>{/if}
</div>

<style>
  .search-wrap { position: relative; }
  input { width: 100%; box-sizing: border-box; background: #2a2a2a; border: 1px solid #444; color: #ddd; padding: 6px 8px; border-radius: 4px; font-size: 12px; }
  .suggestions { position: absolute; z-index: 10; background: #252525; border: 1px solid #444; border-radius: 4px; width: 100%; margin: 0; padding: 0; list-style: none; max-height: 160px; overflow-y: auto; }
  .suggestions button { width: 100%; text-align: left; background: none; border: none; color: #ccc; padding: 6px 10px; font-size: 12px; cursor: pointer; }
  .suggestions button:hover { background: #3a3a3a; }
  .err { color: #e05555; font-size: 11px; margin: 4px 0 0; }
</style>
```

- [ ] **Step 4: Create `Watchlist.svelte`**

```svelte
<!-- src/js/components/Watchlist.svelte -->
<script lang="ts">
  let { symbols, onRemove }: { symbols: string[]; onRemove: (s: string) => void } = $props();
</script>

<div class="watchlist">
  {#if symbols.length === 0}
    <p class="empty">No tickers added. Search above to add one.</p>
  {:else}
    {#each symbols as sym}
      <span class="chip">
        {sym}
        <button onclick={() => onRemove(sym)} aria-label="Remove {sym}">×</button>
      </span>
    {/each}
  {/if}
</div>

<style>
  .watchlist { display: flex; flex-wrap: wrap; gap: 6px; min-height: 32px; }
  .empty { color: #555; font-size: 11px; font-style: italic; margin: 0; }
  .chip { display: inline-flex; align-items: center; gap: 4px; background: #2a3a4a; color: #7ec8e3; border-radius: 12px; padding: 3px 10px 3px 10px; font-size: 12px; font-weight: 600; }
  .chip button { background: none; border: none; color: #7ec8e3; font-size: 14px; cursor: pointer; padding: 0; line-height: 1; opacity: 0.7; }
  .chip button:hover { opacity: 1; }
</style>
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add examples/ticker-data/src/js/components/
git commit -m "feat(ticker-data): add StatusChip, ActivityLog, TickerSearch, Watchlist components"
```

---

## Task 7: Binding Table + Preset/Customize Components

**Files:**
- Create: `src/js/components/BindingTable.svelte`
- Create: `src/js/components/PresetSelector.svelte`
- Create: `src/js/components/CustomizePanel.svelte`
- Create: `src/js/components/ActionBar.svelte`

- [ ] **Step 1: Create `BindingTable.svelte`**

```svelte
<!-- src/js/components/BindingTable.svelte -->
<script lang="ts">
  let {
    bindings,
    watchlist,
    onChange,
  }: {
    bindings: Record<string, string>;
    watchlist: string[];
    onChange: (b: Record<string, string>) => void;
  } = $props();

  function addRow() {
    onChange({ ...bindings, "": "" });
  }

  function updateKey(oldKey: string, newKey: string) {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(bindings)) {
      next[k === oldKey ? newKey : k] = v;
    }
    onChange(next);
  }

  function updateValue(key: string, value: string) {
    onChange({ ...bindings, [key]: value });
  }

  function removeRow(key: string) {
    const next = { ...bindings };
    delete next[key];
    onChange(next);
  }
</script>

<div class="binding-table">
  <div class="header-row">
    <span>Placeholder</span>
    <span>→</span>
    <span>Ticker</span>
    <span></span>
  </div>
  {#each Object.entries(bindings) as [key, value]}
    <div class="row" class:warning={value && !watchlist.includes(value)}>
      <input
        type="text"
        value={key}
        placeholder="STOCK"
        onchange={(e) => updateKey(key, (e.target as HTMLInputElement).value)}
      />
      <span class="arrow">→</span>
      <select value={value} onchange={(e) => updateValue(key, (e.target as HTMLSelectElement).value)}>
        <option value="">— pick —</option>
        {#each watchlist as sym}
          <option value={sym}>{sym}</option>
        {/each}
      </select>
      <button onclick={() => removeRow(key)} class="remove">×</button>
    </div>
  {/each}
  <button class="add-row" onclick={addRow}>＋ Add Binding</button>
  <p class="hint">In AE text layers, use <code>{"{STOCK.price}"}</code></p>
</div>

<style>
  .binding-table { font-size: 12px; }
  .header-row, .row { display: grid; grid-template-columns: 1fr 16px 1fr 24px; gap: 4px; align-items: center; margin-bottom: 4px; }
  .header-row { color: #666; font-size: 11px; margin-bottom: 6px; }
  input, select { background: #2a2a2a; border: 1px solid #444; color: #ddd; padding: 4px 6px; border-radius: 3px; font-size: 12px; width: 100%; box-sizing: border-box; }
  .row.warning input, .row.warning select { border-color: #e05555; }
  .arrow { text-align: center; color: #666; }
  .remove { background: none; border: none; color: #666; cursor: pointer; font-size: 14px; }
  .remove:hover { color: #e05555; }
  .add-row { background: none; border: 1px dashed #444; color: #666; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 4px; width: 100%; }
  .add-row:hover { color: #aaa; border-color: #666; }
  .hint { color: #555; font-size: 10px; margin: 6px 0 0; }
  code { background: #1a1a1a; padding: 1px 3px; border-radius: 2px; }
</style>
```

- [ ] **Step 2: Create `PresetSelector.svelte`**

```svelte
<!-- src/js/components/PresetSelector.svelte -->
<script lang="ts">
  import type { Preset } from "../../../shared/types";
  let { value, onChange }: { value: Preset; onChange: (p: Preset) => void } = $props();

  const descriptions: Record<Preset, string> = {
    "single-card": "One stock card with price, change%, and sparkline",
    "multi-card": "Grid of stock cards for all watchlist tickers",
    "comparison": "Overlay all tickers on a normalized % chart",
    "text-only": "Populate existing {PLACEHOLDER.field} text layers",
  };
</script>

<div>
  <select value={value} onchange={(e) => onChange((e.target as HTMLSelectElement).value as Preset)}>
    <option value="single-card">Stock Card</option>
    <option value="multi-card">Multi-Card Grid</option>
    <option value="comparison">Comparison Chart</option>
    <option value="text-only">Text Values Only</option>
  </select>
  <p class="desc">{descriptions[value]}</p>
</div>

<style>
  select { width: 100%; background: #2a2a2a; border: 1px solid #444; color: #ddd; padding: 5px 8px; border-radius: 4px; font-size: 12px; }
  .desc { color: #777; font-size: 11px; margin: 4px 0 0; font-style: italic; }
</style>
```

- [ ] **Step 3: Create `CustomizePanel.svelte`**

```svelte
<!-- src/js/components/CustomizePanel.svelte -->
<script lang="ts">
  import type { Customization } from "../../../shared/types";
  let { value, onChange }: { value: Customization; onChange: (c: Customization) => void } = $props();

  let open = $state(false);
  function update(field: keyof Customization, v: string) {
    onChange({ ...value, [field]: v });
  }
</script>

<div class="panel">
  <button class="toggle" onclick={() => open = !open}>
    {open ? "▾" : "▸"} Options
  </button>
  {#if open}
    <div class="fields">
      <label>Period
        <select value={value.period} onchange={(e) => update("period", (e.target as HTMLSelectElement).value)}>
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
          <option value="90d">90 days</option>
          <option value="1y">1 year</option>
        </select>
      </label>
      <label>Colors
        <select value={value.colorScheme} onchange={(e) => update("colorScheme", (e.target as HTMLSelectElement).value)}>
          <option value="default">Default (green/red)</option>
          <option value="monochrome">Monochrome</option>
        </select>
      </label>
      <label>Font Size
        <select value={value.fontSize} onchange={(e) => update("fontSize", (e.target as HTMLSelectElement).value)}>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <label>Sparkline
        <select value={value.sparklineAnimation} onchange={(e) => update("sparklineAnimation", (e.target as HTMLSelectElement).value)}>
          <option value="none">No animation</option>
          <option value="draw-on">Draw-on</option>
        </select>
      </label>
    </div>
  {/if}
</div>

<style>
  .panel { border-top: 1px solid #333; padding-top: 8px; }
  .toggle { background: none; border: none; color: #888; font-size: 12px; cursor: pointer; padding: 0; }
  .toggle:hover { color: #ccc; }
  .fields { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  label { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: #888; }
  select { background: #2a2a2a; border: 1px solid #444; color: #ddd; padding: 4px 6px; border-radius: 3px; font-size: 12px; }
</style>
```

- [ ] **Step 4: Create `ActionBar.svelte`**

```svelte
<!-- src/js/components/ActionBar.svelte -->
<script lang="ts">
  import type { PanelStatus } from "../../../shared/types";
  let {
    status,
    onFetch,
    onBuild,
    onUpdateText,
    onRefreshAll,
  }: {
    status: PanelStatus;
    onFetch: () => void;
    onBuild: () => void;
    onUpdateText: () => void;
    onRefreshAll: () => void;
  } = $props();

  const busy = $derived(status === "fetching" || status === "building");
</script>

<div class="bar">
  <button onclick={onFetch} disabled={busy}>Fetch Data</button>
  <button onclick={onBuild} disabled={busy}>Build in AE</button>
  <button onclick={onUpdateText} disabled={busy}>Update Text</button>
  <button class="refresh" onclick={onRefreshAll} disabled={busy} title="Fetch then rebuild">↺</button>
</div>

<style>
  .bar { display: flex; gap: 6px; }
  button { flex: 1; background: #2a3a4a; border: 1px solid #4a9eff; color: #4a9eff; padding: 7px 4px; border-radius: 4px; font-size: 12px; cursor: pointer; }
  button:hover:not(:disabled) { background: #3a4a5a; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  .refresh { flex: 0 0 36px; font-size: 16px; }
</style>
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add examples/ticker-data/src/js/components/
git commit -m "feat(ticker-data): add BindingTable, PresetSelector, CustomizePanel, ActionBar components"
```

---

## Task 8: Main.svelte — Wire Everything Together

**Files:**
- Modify: `examples/ticker-data/src/js/main/main.svelte`

- [ ] **Step 1: Replace `main.svelte` with full implementation**

```svelte
<!-- src/js/main/main.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { evalTS } from "../lib/utils/bolt";
  import { fetchQuotes } from "../lib/ticker-service";
  // Sample data is bundled at build time via Vite's JSON import
  import sampleTickerData from "../../../../Input/sample_ticker_data.json";
  import type { TickerData as TickerDataType } from "../../../shared/types";
  const SAMPLE_DATA = sampleTickerData as TickerDataType;
  import { writeTickerData, readCachedData, isCacheStale } from "../lib/data-writer";
  import {
    loadWatchlist, saveWatchlist,
    loadBindings, saveBindings,
    loadLastPreset, saveLastPreset,
  } from "../lib/config-store";
  import StatusChip from "../components/StatusChip.svelte";
  import ActivityLog from "../components/ActivityLog.svelte";
  import TickerSearch from "../components/TickerSearch.svelte";
  import Watchlist from "../components/Watchlist.svelte";
  import BindingTable from "../components/BindingTable.svelte";
  import PresetSelector from "../components/PresetSelector.svelte";
  import CustomizePanel from "../components/CustomizePanel.svelte";
  import ActionBar from "../components/ActionBar.svelte";
  import type { PanelStatus, LogEntry, Customization, Preset, TickerData } from "../../../shared/types";

  let status: PanelStatus = $state("idle");
  let logs: LogEntry[] = $state([]);
  let watchlist: string[] = $state([]);
  let bindings: Record<string, string> = $state({});
  let selectedPreset: Preset = $state("single-card");
  let customization: Customization = $state({
    period: "30d", colorScheme: "default", fontSize: "medium", sparklineAnimation: "none",
  });
  let projectRoot = $state("");
  let cachedData: TickerData | null = $state(null);
  let dataIsOnDisk = $state(false);   // true only when ticker_data.json exists on disk
  let showStaleWarning = $state(false);
  let showUseCachedButton = $state(false);

  function log(level: LogEntry["level"], message: string) {
    logs = [...logs, { timestamp: Date.now(), level, message }];
  }

  onMount(async () => {
    watchlist = loadWatchlist();
    bindings = loadBindings();
    selectedPreset = loadLastPreset() as Preset;

    try {
      projectRoot = await evalTS("getProjectRoot") ?? "";
      if (projectRoot) {
        cachedData = readCachedData(projectRoot);
        showStaleWarning = isCacheStale(cachedData);
        if (cachedData) {
          dataIsOnDisk = true;
          showStaleWarning = isCacheStale(cachedData);
          log("info", "Loaded cached data from Input/ticker_data.json");
        } else {
          // Offline fallback: show sample data for preview only (Build is disabled until real fetch)
          cachedData = SAMPLE_DATA;
          dataIsOnDisk = false;
          log("info", "No data file found — showing sample data. Click Fetch to get live prices and enable Build.");
        }
      } else {
        // No saved project — show sample data for preview only
        cachedData = SAMPLE_DATA;
        dataIsOnDisk = false;
        log("info", "Sample data loaded (demo view). Save your AE project then Fetch to enable Build.");
      }
    } catch (e: any) {
      log("error", "Could not connect to AE: " + (e?.message ?? e));
    }
  });

  function addTicker(symbol: string, _name: string) {
    if (!watchlist.includes(symbol)) {
      watchlist = [...watchlist, symbol];
      saveWatchlist(watchlist);
    }
  }

  function removeTicker(symbol: string) {
    watchlist = watchlist.filter((s) => s !== symbol);
    saveWatchlist(watchlist);
  }

  function updateBindings(b: Record<string, string>) {
    bindings = b;
    saveBindings(b);
  }

  function updatePreset(p: Preset) {
    selectedPreset = p;
    saveLastPreset(p);
  }

  async function handleFetch() {
    if (!watchlist.length) { log("error", "Add at least one ticker first"); return; }
    if (!projectRoot) {
      const r = await evalTS("getProjectRoot") ?? "";
      projectRoot = r;
    }
    if (!projectRoot) { log("error", "Save your AE project first — needed to write data file"); return; }

    status = "fetching";
    log("info", `Fetching ${watchlist.join(", ")}...`);

    let stocks;
    try {
      stocks = await fetchQuotes(watchlist, customization.period);
    } catch (e: any) {
      const partial = e.partialResults ?? [];
      if (partial.length > 0) {
        stocks = partial;
        log("error", "Partial failure: " + (e.errors ?? []).join("; "));
      } else {
        status = "error";
        log("error", "Fetch failed: " + (e?.message ?? e));
        if (dataIsOnDisk) {
          showUseCachedButton = true;
          log("info", "Previous data still available — click 'Use Cached' to continue.");
        }
        return;
      }
    }

    const data: TickerData = {
      fetchedAt: new Date().toISOString(),
      bindings,
      stocks,
    };

    try {
      const filePath = await writeTickerData(data, projectRoot);
      cachedData = data;
      dataIsOnDisk = true;
      showStaleWarning = false;
      showUseCachedButton = false;
      log("success", `Fetched ${stocks.length} ticker(s) → ${filePath}`);
      status = "idle";
    } catch (e: any) {
      status = "error";
      log("error", "Write failed: " + (e?.message ?? e));
    }
  }

  function handleUseCached() {
    showUseCachedButton = false;
    status = "idle";
    log("info", "Using cached data from last successful fetch.");
  }

  async function handleBuild() {
    if (!projectRoot) { log("error", "Save your AE project first"); return; }
    if (!dataIsOnDisk) { log("error", "Click Fetch Data first — Build requires ticker_data.json on disk"); return; }

    status = "building";
    log("info", `Building preset "${selectedPreset}"...`);

    const filePath = projectRoot + "/Input/ticker_data.json";
    try {
      const result = await evalTS("buildFromPreset", {
        preset: selectedPreset,
        dataFilePath: filePath,
        customization,
      });
      if (result.success) {
        log("success", result.message);
      } else {
        log("error", result.message);
      }
    } catch (e: any) {
      log("error", "Build failed: " + (e?.message ?? e));
    } finally {
      status = "idle";
    }
  }

  async function handleUpdateText() {
    if (!projectRoot) { log("error", "Save your AE project first"); return; }
    if (!cachedData) { log("error", "Fetch data first"); return; }

    status = "building";
    log("info", "Updating text bindings...");

    const filePath = projectRoot + "/Input/ticker_data.json";
    try {
      const result = await evalTS("populateTextBindings", {
        dataFilePath: filePath,
        bindings,
      });
      if (result.success) {
        log("success", result.message);
      } else {
        log("error", result.message);
      }
    } catch (e: any) {
      log("error", "Update text failed: " + (e?.message ?? e));
    } finally {
      status = "idle";
    }
  }

  async function handleRefreshAll() {
    await handleFetch();
    if (status !== "error") await handleBuild();
  }
</script>

<main>
  <header>
    <h1>Ticker Data</h1>
    <StatusChip {status} />
  </header>

  {#if showStaleWarning && cachedData}
    <div class="stale-banner">
      ⚠ Data is over 24 hours old.
      <button onclick={handleFetch}>Re-fetch</button>
    </div>
  {/if}

  {#if showUseCachedButton}
    <div class="cached-banner">
      Fetch failed — previous data available.
      <button onclick={handleUseCached}>Use Cached</button>
    </div>
  {/if}

  {#if !dataIsOnDisk}
    <div class="demo-banner">Sample data (demo mode) — Fetch to enable Build</div>
  {/if}

  <section>
    <label class="section-label">Add Ticker</label>
    <TickerSearch onAdd={addTicker} />
  </section>

  <section>
    <label class="section-label">Watchlist</label>
    <Watchlist symbols={watchlist} onRemove={removeTicker} />
  </section>

  <section>
    <label class="section-label">Bindings</label>
    <BindingTable {bindings} {watchlist} onChange={updateBindings} />
  </section>

  <section>
    <label class="section-label">Preset</label>
    <PresetSelector value={selectedPreset} onChange={updatePreset} />
    <CustomizePanel value={customization} onChange={(c) => customization = c} />
  </section>

  <section>
    <ActionBar
      {status}
      onFetch={handleFetch}
      onBuild={handleBuild}
      onUpdateText={handleUpdateText}
      onRefreshAll={handleRefreshAll}
    />
  </section>

  <section>
    <label class="section-label">Activity</label>
    <ActivityLog entries={logs} />
  </section>
</main>

<style>
  main { padding: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #1e1e1e; color: #ccc; min-height: 100vh; display: flex; flex-direction: column; gap: 12px; }
  header { display: flex; justify-content: space-between; align-items: center; }
  h1 { font-size: 14px; font-weight: 600; margin: 0; color: #fff; }
  section { display: flex; flex-direction: column; gap: 6px; }
  .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #555; }
  .stale-banner { background: #3a2e00; border: 1px solid #f0c040; color: #f0c040; padding: 6px 10px; border-radius: 4px; font-size: 11px; display: flex; align-items: center; gap: 8px; }
  .stale-banner button { background: none; border: 1px solid #f0c040; color: #f0c040; padding: 2px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; }
  .cached-banner { background: #2a2010; border: 1px solid #c08030; color: #c08030; padding: 6px 10px; border-radius: 4px; font-size: 11px; display: flex; align-items: center; gap: 8px; }
  .cached-banner button { background: none; border: 1px solid #c08030; color: #c08030; padding: 2px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; }
  .demo-banner { background: #1a2a1a; border: 1px solid #4a8a4a; color: #7ab87a; padding: 5px 10px; border-radius: 4px; font-size: 11px; text-align: center; }
</style>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Smoke test in AE**

Open AE with a saved project. The panel should:
1. Show the header and all sections
2. Display "Ready" status
3. Allow searching and adding tickers
4. Show the binding table
5. Clicking Fetch Data should attempt to call yahoo-finance2 (will log success or error in Activity log)
6. Check `{projectDir}/Input/ticker_data.json` was created

- [ ] **Step 4: Commit**

```bash
git add examples/ticker-data/src/js/main/main.svelte
git commit -m "feat(ticker-data): wire up main.svelte with full UI and action handlers"
```

---

## Task 9: ExtendScript — Format Utilities

**Files:**
- Create: `examples/ticker-data/src/jsx/lib/format.ts`

- [ ] **Step 1: Create `format.ts`**

```typescript
// src/jsx/lib/format.ts
// ES3-compatible number formatters for use in text binding

export function formatPrice(num: number): string {
  if (!num && num !== 0) return "—";
  var formatted = num.toFixed(2);
  var parts = formatted.split(".");
  var intPart = parts[0];
  var decPart = parts[1];
  var result = "";
  var count = 0;
  for (var i = intPart.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) result = "," + result;
    result = intPart[i] + result;
    count++;
  }
  return "$" + result + "." + decPart;
}

export function formatPercent(num: number): string {
  if (!num && num !== 0) return "—";
  var sign = num >= 0 ? "+" : "";
  return sign + num.toFixed(2) + "%";
}

export function formatChange(num: number): string {
  if (!num && num !== 0) return "—";
  var sign = num >= 0 ? "+" : "";
  return sign + num.toFixed(2);
}

export function formatVolume(num: number): string {
  if (!num) return "—";
  if (num >= 1e12) return (num / 1e12).toFixed(1) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(1) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(1) + "K";
  return String(num);
}

export function formatMarketCap(num: number): string {
  if (!num) return "—";
  if (num >= 1e12) return "$" + (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return "$" + (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return "$" + (num / 1e6).toFixed(2) + "M";
  return "$" + num.toFixed(0);
}

export function formatDate(isoString: string): string {
  var d = new Date(isoString);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var hours = d.getHours();
  var minutes = d.getMinutes();
  var ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  var minStr = minutes < 10 ? "0" + minutes : String(minutes);
  return months[d.getMonth()] + " " + d.getDate() + " " + hours + ":" + minStr + " " + ampm;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add examples/ticker-data/src/jsx/lib/format.ts
git commit -m "feat(ticker-data): add ExtendScript number formatters"
```

---

## Task 10: ExtendScript — Text Binder

**Files:**
- Create: `examples/ticker-data/src/jsx/builders/text-binder.ts`

- [ ] **Step 1: Create `text-binder.ts`**

```typescript
// src/jsx/builders/text-binder.ts
import { formatPrice, formatPercent, formatChange, formatVolume, formatMarketCap, formatDate } from "../lib/format";
import type { TickerData, TextBindConfig } from "../../shared/types";

declare const $: any;

function readTickerData(filePath: string): TickerData | null {
  var file = new File(filePath);
  if (!file.exists) return null;
  file.open("r");
  var content = file.read();
  file.close();
  try {
    return JSON.parse(content) as TickerData;
  } catch (e) {
    return null;
  }
}

function resolveField(stockData: any, field: string): string {
  switch (field) {
    case "price": return formatPrice(stockData.current);
    case "change": return formatChange(stockData.change);
    case "changePercent": return formatPercent(stockData.changePercent);
    case "name": return stockData.name ?? "";
    case "symbol": return stockData.symbol ?? "";
    case "volume": return formatVolume(stockData.volume);
    case "marketCap": return formatMarketCap(stockData.marketCap);
    case "high52w": return formatPrice(stockData.high52w);
    case "low52w": return formatPrice(stockData.low52w);
    case "fetchedAt": return formatDate(stockData.regularMarketTime ?? "");
    default: return "";
  }
}

// Pattern: {PLACEHOLDER.field}
var BINDING_PATTERN = /\{([A-Z0-9_]+)\.([a-z0-9A-Z]+)\}/g;

export function scanAndPopulateTextBindings(config: TextBindConfig): { success: boolean; message: string; layersUpdated: number } {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return { success: false, message: "No active composition. Select a comp first.", layersUpdated: 0 };
  }

  var data = readTickerData(config.dataFilePath);
  if (!data) {
    return { success: false, message: "Could not read data file: " + config.dataFilePath, layersUpdated: 0 };
  }

  // Build lookup: symbol → stockData
  var stockMap: Record<string, any> = {};
  for (var i = 0; i < data.stocks.length; i++) {
    stockMap[data.stocks[i].symbol] = data.stocks[i];
  }

  var layersUpdated = 0;

  app.beginUndoGroup("Ticker Data: Update Text Bindings");

  try {
    for (var li = 1; li <= comp.numLayers; li++) {
      var layer = comp.layer(li);
      if (!(layer instanceof TextLayer)) continue;

      var textProp = layer.property("Source Text") as TextDocument & { value: TextDocument };
      if (!textProp) continue;

      var srcText: string;
      try {
        srcText = String((textProp as any).value.text);
      } catch (e) {
        continue;
      }

      var newText = srcText;
      var match: RegExpExecArray | null;
      BINDING_PATTERN.lastIndex = 0;

      while ((match = BINDING_PATTERN.exec(srcText)) !== null) {
        var placeholder = match[1];  // e.g. "STOCK"
        var field = match[2];         // e.g. "price"

        // Resolve placeholder to real ticker via bindings
        var ticker = config.bindings[placeholder];
        if (!ticker) continue;

        var stockData = stockMap[ticker];
        if (!stockData) continue;

        var resolved = resolveField(stockData, field);
        newText = newText.replace(match[0], resolved);
      }

      if (newText !== srcText) {
        try {
          (layer.property("Source Text") as any).setValue(newText);
          layersUpdated++;
        } catch (e) {
          // Layer may be locked or have expressions — skip
        }
      }
    }
  } finally {
    app.endUndoGroup();
  }

  return {
    success: true,
    message: "Updated " + layersUpdated + " text layer(s)",
    layersUpdated,
  };
}
```

- [ ] **Step 2: Export from `aeft.ts`**

Add to `src/jsx/aeft/aeft.ts`:

```typescript
import { scanAndPopulateTextBindings } from "../builders/text-binder";
import type { TextBindConfig, BuildConfig, BuildResult, BindResult } from "../../shared/types";

// ... (keep existing exports: getProjectInfo, getActiveCompInfo, runScriptFile, etc.)

export const populateTextBindings = (config: TextBindConfig): BindResult => {
  return scanAndPopulateTextBindings(config);
};

// Stub buildFromPreset — will be filled in Task 13
export const buildFromPreset = (config: BuildConfig): BuildResult => {
  return { success: false, message: "Builders not yet implemented" };
};
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Manual test in AE**

1. Open AE with a saved project
2. In a comp, create a text layer and type: `{STOCK.price}`
3. In the panel, add AAPL to watchlist, click Fetch Data
4. Set binding: STOCK → AAPL
5. Click Update Text
6. Expected: text layer now shows `$248.30` (or current AAPL price)
7. Change binding STOCK → MSFT, click Update Text
8. Expected: text layer shows MSFT price without touching the layer

- [ ] **Step 5: Commit**

```bash
git add examples/ticker-data/src/jsx/
git commit -m "feat(ticker-data): add text-binder ExtendScript builder"
```

---

## Task 11: ExtendScript — Sparkline Builder

**Files:**
- Create: `examples/ticker-data/src/jsx/builders/sparkline.ts`

- [ ] **Step 1: Create `sparkline.ts`**

```typescript
// src/jsx/builders/sparkline.ts
import type { StockData, Customization } from "../../shared/types";

export interface SparklineOptions {
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
  strokeWidth: number;
  customization: Customization;
}

export function buildSparkline(
  hostComp: CompItem,
  stockData: StockData,
  options: SparklineOptions
): ShapeLayer {
  var history = stockData.history;
  if (!history || history.length < 2) {
    throw new Error("Not enough history data for sparkline (need ≥2 points)");
  }

  // Extract close prices
  var prices: number[] = [];
  for (var i = 0; i < history.length; i++) {
    prices.push(history[i].close);
  }

  // Normalize to [0, 1]
  var minPrice = prices[0];
  var maxPrice = prices[0];
  for (var j = 1; j < prices.length; j++) {
    if (prices[j] < minPrice) minPrice = prices[j];
    if (prices[j] > maxPrice) maxPrice = prices[j];
  }
  var priceRange = maxPrice - minPrice || 1;

  var drawW = options.width - options.paddingX * 2;
  var drawH = options.height - options.paddingY * 2;

  // Build path vertices
  var vertices: [number, number][] = [];
  for (var k = 0; k < prices.length; k++) {
    var x = options.paddingX + (k / (prices.length - 1)) * drawW;
    var y = options.paddingY + drawH - ((prices[k] - minPrice) / priceRange) * drawH;
    vertices.push([x - options.width / 2, y - options.height / 2]);  // center relative
  }

  // Tangents (zero = linear path, keeps things clean)
  var inTangents: [number, number][] = [];
  var outTangents: [number, number][] = [];
  for (var t = 0; t < vertices.length; t++) {
    inTangents.push([0, 0]);
    outTangents.push([0, 0]);
  }

  // Determine color
  var isUp = prices[prices.length - 1] >= prices[0];
  var strokeColor: [number, number, number];
  if (options.customization.colorScheme === "monochrome") {
    strokeColor = [0.8, 0.8, 0.8];
  } else {
    strokeColor = isUp ? [0.22, 0.78, 0.39] : [0.87, 0.21, 0.21];  // green / red
  }

  // Create shape layer
  var shapeLayer = hostComp.layers.addShape();
  shapeLayer.name = "Sparkline - " + stockData.symbol;

  var contents = shapeLayer.property("Contents") as PropertyGroup;
  var shapeGroup = contents.addProperty("ADBE Vector Group") as PropertyGroup;
  (shapeGroup as any).name = "Sparkline Path";

  var groupContents = shapeGroup.property("Contents") as PropertyGroup;

  // Add path
  var pathProp = groupContents.addProperty("ADBE Vector Shape - Group") as PropertyGroup;
  var shapePath = pathProp.property("Path") as Property;
  var newPath = new Shape();
  newPath.vertices = vertices;
  newPath.inTangents = inTangents;
  newPath.outTangents = outTangents;
  newPath.closed = false;
  (shapePath as any).setValue(newPath);

  // Add stroke
  var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke") as PropertyGroup;
  (stroke.property("Color") as Property).setValue(strokeColor);
  var strokeWidthPx = options.strokeWidth;
  if (options.customization.fontSize === "large") strokeWidthPx = options.strokeWidth * 1.5;
  if (options.customization.fontSize === "small") strokeWidthPx = options.strokeWidth * 0.75;
  (stroke.property("Stroke Width") as Property).setValue(strokeWidthPx);
  (stroke.property("Line Cap") as Property).setValue(2);    // Round cap
  (stroke.property("Line Join") as Property).setValue(2);   // Round join

  // Add trim path for draw-on animation
  if (options.customization.sparklineAnimation === "draw-on") {
    var trim = groupContents.addProperty("ADBE Vector Filter - Trim") as PropertyGroup;
    (trim.property("Start") as Property).setValue(0);
    var endProp = trim.property("End") as Property;
    endProp.setValueAtTime(0, 0);
    endProp.setValueAtTime(hostComp.duration * 0.5, 100);
  }

  return shapeLayer;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Manual test in AE**

Wire a quick test by updating `buildFromPreset` in aeft.ts to call the sparkline builder for "single-card" with placeholder stock data, then test in AE. The sparkline shape layer should appear in the active comp with the correct path.

- [ ] **Step 4: Commit**

```bash
git add examples/ticker-data/src/jsx/builders/sparkline.ts
git commit -m "feat(ticker-data): add sparkline ExtendScript builder"
```

---

## Task 12: ExtendScript — Stock Card Builder

**Files:**
- Create: `examples/ticker-data/src/jsx/builders/card.ts`

- [ ] **Step 1: Create `card.ts`**

```typescript
// src/jsx/builders/card.ts
import { buildSparkline } from "./sparkline";
import { formatPrice, formatPercent, formatChange } from "../lib/format";
import type { StockData, Customization } from "../../shared/types";

var CARD_WIDTH = 300;
var CARD_HEIGHT = 160;

function fontSizePx(size: Customization["fontSize"]): number {
  return size === "small" ? 28 : size === "large" ? 48 : 36;
}

export function buildStockCard(
  stockData: StockData,
  customization: Customization,
  parentFolder: FolderItem
): CompItem {
  var compName = "TD: " + stockData.symbol;

  // Populate mode: update existing comp
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.name === compName) {
      return populateCardComp(item, stockData, customization);
    }
  }

  // Create mode
  var comp = app.project.items.addComp(compName, CARD_WIDTH, CARD_HEIGHT, 1, 5, 30);
  if (parentFolder) comp.parentFolder = parentFolder;

  return populateCardComp(comp, stockData, customization);
}

function populateCardComp(comp: CompItem, stockData: StockData, customization: Customization): CompItem {
  // Remove old layers
  while (comp.numLayers > 0) {
    comp.layer(1).remove();
  }

  var isUp = stockData.changePercent >= 0;
  var changeColor: [number, number, number];
  if (customization.colorScheme === "monochrome") {
    changeColor = [0.8, 0.8, 0.8];
  } else {
    changeColor = isUp ? [0.22, 0.78, 0.39] : [0.87, 0.21, 0.21];
  }

  var fsPx = fontSizePx(customization.fontSize);

  // Background
  var bg = comp.layers.addSolid([0.08, 0.08, 0.12], "Background", CARD_WIDTH, CARD_HEIGHT, 1);
  bg.moveToEnd();

  // Symbol text
  var symLayer = comp.layers.addText(stockData.symbol);
  symLayer.name = "Symbol";
  var symDoc = new TextDocument(stockData.symbol);
  symDoc.fontSize = fsPx * 0.8;
  symDoc.fillColor = [1, 1, 1];
  (symLayer.property("Source Text") as Property).setValue(symDoc);
  (symLayer.property("Position") as Property).setValue([20, 30 + fsPx * 0.6]);

  // Price text
  var priceLayer = comp.layers.addText(formatPrice(stockData.current));
  priceLayer.name = "Price";
  var priceDoc = new TextDocument(formatPrice(stockData.current));
  priceDoc.fontSize = fsPx;
  priceDoc.fillColor = [1, 1, 1];
  (priceLayer.property("Source Text") as Property).setValue(priceDoc);
  (priceLayer.property("Position") as Property).setValue([20, 30 + fsPx * 0.6 + fsPx + 8]);

  // Change % text
  var changeText = formatChange(stockData.change) + "  " + formatPercent(stockData.changePercent);
  var changeLayer = comp.layers.addText(changeText);
  changeLayer.name = "Change";
  var changeDoc = new TextDocument(changeText);
  changeDoc.fontSize = fsPx * 0.55;
  changeDoc.fillColor = changeColor;
  (changeLayer.property("Source Text") as Property).setValue(changeDoc);
  (changeLayer.property("Position") as Property).setValue([20, 30 + fsPx * 0.6 + fsPx * 2 + 14]);

  // Sparkline (right side)
  if (stockData.history && stockData.history.length >= 2) {
    var spark = buildSparkline(comp, stockData, {
      width: 120,
      height: 60,
      paddingX: 4,
      paddingY: 4,
      strokeWidth: 2,
      customization,
    });
    (spark.property("Position") as Property).setValue([CARD_WIDTH - 70, CARD_HEIGHT - 40]);
  }

  return comp;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add examples/ticker-data/src/jsx/builders/card.ts
git commit -m "feat(ticker-data): add stock card ExtendScript builder"
```

---

## Task 13: ExtendScript — Comparison Chart Builder

**Files:**
- Create: `examples/ticker-data/src/jsx/builders/chart.ts`

- [ ] **Step 1: Create `chart.ts`**

```typescript
// src/jsx/builders/chart.ts
import type { StockData, Customization } from "../../shared/types";

var CHART_WIDTH = 1280;
var CHART_HEIGHT = 720;
var CHART_PADDING_X = 80;
var CHART_PADDING_Y = 60;

var DEFAULT_COLORS: Array<[number, number, number]> = [
  [0.27, 0.65, 1.0],    // blue
  [0.22, 0.78, 0.39],   // green
  [1.0, 0.65, 0.0],     // orange
  [0.87, 0.21, 0.75],   // pink
  [0.55, 0.87, 0.87],   // teal
];

function getColor(i: number, scheme: Customization["colorScheme"]): [number, number, number] {
  if (scheme === "monochrome") {
    var v = 0.9 - i * 0.15;
    return [v, v, v];
  }
  return DEFAULT_COLORS[i % DEFAULT_COLORS.length];
}

export function buildComparisonChart(
  stocks: StockData[],
  customization: Customization,
  parentFolder: FolderItem
): CompItem {
  var compName = "TD: Comparison";

  // Populate mode
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.name === compName) {
      while (item.numLayers > 0) item.layer(1).remove();
      return populateChart(item, stocks, customization);
    }
  }

  var comp = app.project.items.addComp(compName, CHART_WIDTH, CHART_HEIGHT, 1, 10, 30);
  if (parentFolder) comp.parentFolder = parentFolder;
  return populateChart(comp, stocks, customization);
}

function populateChart(comp: CompItem, stocks: StockData[], customization: Customization): CompItem {
  // Background
  var bg = comp.layers.addSolid([0.06, 0.06, 0.09], "Background", CHART_WIDTH, CHART_HEIGHT, 1);
  bg.moveToEnd();

  var drawW = CHART_WIDTH - CHART_PADDING_X * 2;
  var drawH = CHART_HEIGHT - CHART_PADDING_Y * 2;

  // PASS 1: Compute % change arrays for all stocks, then find GLOBAL min/max
  // This ensures all stocks share the same y-axis scale for a true visual comparison
  var allPctChanges: number[][] = [];
  for (var pi = 0; pi < stocks.length; pi++) {
    var hist = stocks[pi].history;
    if (!hist || hist.length < 2 || !hist[0].close) { allPctChanges.push([]); continue; }
    var base = hist[0].close;
    var changes: number[] = [];
    for (var hi = 0; hi < hist.length; hi++) {
      changes.push((hist[hi].close - base) / base * 100);
    }
    allPctChanges.push(changes);
  }

  var globalMin = Infinity;
  var globalMax = -Infinity;
  for (var ai = 0; ai < allPctChanges.length; ai++) {
    for (var aj = 0; aj < allPctChanges[ai].length; aj++) {
      if (allPctChanges[ai][aj] < globalMin) globalMin = allPctChanges[ai][aj];
      if (allPctChanges[ai][aj] > globalMax) globalMax = allPctChanges[ai][aj];
    }
  }
  // Add 10% padding to the range so lines don't touch edges
  var pctRange = (globalMax - globalMin) || 1;
  var paddedMin = globalMin - pctRange * 0.1;
  var paddedMax = globalMax + pctRange * 0.1;
  var paddedRange = paddedMax - paddedMin;

  // PASS 2: Draw each stock using the shared axis
  for (var si = 0; si < stocks.length; si++) {
    var stock = stocks[si];
    var pctChanges = allPctChanges[si];
    if (pctChanges.length < 2) continue;

    // Build path using shared y-axis scale
    var vertices: [number, number][] = [];
    for (var vi = 0; vi < pctChanges.length; vi++) {
      var x = CHART_PADDING_X + (vi / (pctChanges.length - 1)) * drawW - CHART_WIDTH / 2;
      var y = CHART_PADDING_Y + drawH - ((pctChanges[vi] - paddedMin) / paddedRange * drawH) - CHART_HEIGHT / 2;
      vertices.push([x, y]);
    }

    var color = getColor(si, customization.colorScheme);

    var shapeLayer = comp.layers.addShape();
    shapeLayer.name = stock.symbol + " Line";

    var contents = shapeLayer.property("Contents") as PropertyGroup;
    var grp = contents.addProperty("ADBE Vector Group") as PropertyGroup;
    var grpContents = grp.property("Contents") as PropertyGroup;

    var inT: [number, number][] = [];
    var outT: [number, number][] = [];
    for (var t = 0; t < vertices.length; t++) { inT.push([0,0]); outT.push([0,0]); }

    var pathPropGroup = grpContents.addProperty("ADBE Vector Shape - Group") as PropertyGroup;
    var shapePath = pathPropGroup.property("Path") as Property;
    var newPath = new Shape();
    newPath.vertices = vertices;
    newPath.inTangents = inT;
    newPath.outTangents = outT;
    newPath.closed = false;
    (shapePath as any).setValue(newPath);

    var stroke = grpContents.addProperty("ADBE Vector Graphic - Stroke") as PropertyGroup;
    (stroke.property("Color") as Property).setValue(color);
    (stroke.property("Stroke Width") as Property).setValue(2);
    (stroke.property("Line Cap") as Property).setValue(2);

    // Legend label
    var lastPct = pctChanges[pctChanges.length - 1];
    var sign = lastPct >= 0 ? "+" : "";
    var legendText = stock.symbol + "  " + sign + lastPct.toFixed(1) + "%";
    var legendLayer = comp.layers.addText(legendText);
    legendLayer.name = stock.symbol + " Legend";
    var legendDoc = new TextDocument(legendText);
    legendDoc.fontSize = 22;
    legendDoc.fillColor = color;
    (legendLayer.property("Source Text") as Property).setValue(legendDoc);
    (legendLayer.property("Position") as Property).setValue([
      CHART_PADDING_X + si * 160,
      CHART_HEIGHT - 20,
    ]);
  }

  return comp;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add examples/ticker-data/src/jsx/builders/chart.ts
git commit -m "feat(ticker-data): add comparison chart ExtendScript builder"
```

---

## Task 14: ExtendScript — Preset Orchestrator + aeft.ts Wiring

**Files:**
- Create: `examples/ticker-data/src/jsx/builders/preset.ts`
- Modify: `examples/ticker-data/src/jsx/aeft/aeft.ts`

- [ ] **Step 1: Create `preset.ts`**

```typescript
// src/jsx/builders/preset.ts
import { buildStockCard } from "./card";
import { buildComparisonChart } from "./chart";
import { scanAndPopulateTextBindings } from "./text-binder";
import type { BuildConfig, BuildResult, TickerData } from "../../shared/types";

function readTickerData(filePath: string): TickerData | null {
  var file = new File(filePath);
  if (!file.exists) return null;
  file.open("r");
  var content = file.read();
  file.close();
  try { return JSON.parse(content) as TickerData; } catch (e) { return null; }
}

function ensureProjectFolder(name: string): FolderItem {
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof FolderItem && item.name === name) return item as FolderItem;
  }
  return app.project.items.addFolder(name) as FolderItem;
}

export function runPreset(config: BuildConfig): BuildResult {
  var data = readTickerData(config.dataFilePath);
  if (!data) {
    return { success: false, message: "Could not read data file: " + config.dataFilePath };
  }
  if (!data.stocks || data.stocks.length === 0) {
    return { success: false, message: "No stock data in file. Fetch data first." };
  }

  var folder = ensureProjectFolder("Ticker Data");
  var compsCreated: string[] = [];

  app.beginUndoGroup("Ticker Data: Build " + config.preset);

  try {
    if (config.preset === "single-card") {
      var firstStock = data.stocks[0];
      var comp = buildStockCard(firstStock, config.customization, folder);
      compsCreated.push(comp.name);

    } else if (config.preset === "multi-card") {
      for (var i = 0; i < data.stocks.length; i++) {
        var cardComp = buildStockCard(data.stocks[i], config.customization, folder);
        compsCreated.push(cardComp.name);
      }

    } else if (config.preset === "comparison") {
      if (data.stocks.length < 2) {
        return { success: false, message: "Comparison chart needs at least 2 stocks in watchlist." };
      }
      var chartComp = buildComparisonChart(data.stocks, config.customization, folder);
      compsCreated.push(chartComp.name);

    } else if (config.preset === "text-only") {
      var result = scanAndPopulateTextBindings({
        dataFilePath: config.dataFilePath,
        bindings: data.bindings ?? {},
      });
      return result;
    }

    app.endUndoGroup();
    return {
      success: true,
      message: "Built " + compsCreated.length + " comp(s): " + compsCreated.join(", "),
      compsCreated,
    };
  } catch (e: any) {
    app.endUndoGroup();
    return { success: false, message: "Build failed: " + (e?.message ?? String(e)) };
  }
}
```

- [ ] **Step 2: Replace the full `src/jsx/aeft/aeft.ts`**

```typescript
// src/jsx/aeft/aeft.ts
import { getActiveComp, getProjectDir } from "./aeft-utils";
import { runPreset } from "../builders/preset";
import { scanAndPopulateTextBindings } from "../builders/text-binder";
import type { BuildConfig, BuildResult, BindResult, TextBindConfig } from "../../shared/types";

export const getProjectInfo = () => {
  var projectName = "";
  var projectPath = "";
  if (app.project.file) {
    projectName = app.project.file.name.replace(/\.aep$/i, "");
    projectPath = app.project.file.parent.fsName;
  } else {
    projectName = "(unsaved project)";
    projectPath = "";
  }
  return { projectName, projectPath, numItems: app.project.numItems };
};

export const getProjectRoot = () => {
  var dir = getProjectDir();
  if (dir) return dir.fsName || String(dir);
  return "";
};

export const getActiveCompInfo = () => {
  var comp = getActiveComp();
  if (!comp) return { error: "No active composition. Open a composition first." };
  var MAX_LAYERS = 30;
  function getLayerType(layer: Layer): string {
    if (layer instanceof TextLayer) return "text";
    if (layer instanceof ShapeLayer) return "shape";
    if (layer instanceof AVLayer) return "av";
    return "unknown";
  }
  var count = Math.min(comp.numLayers, MAX_LAYERS);
  var layers: { name: string; type: string; index: number }[] = [];
  for (var j = 1; j <= count; j++) {
    var l = comp.layer(j);
    layers.push({ name: l.name, type: getLayerType(l), index: l.index });
  }
  return { name: comp.name, width: comp.width, height: comp.height, fps: comp.frameRate, duration: comp.duration, numLayers: comp.numLayers, layers };
};

export const buildFromPreset = (config: BuildConfig): BuildResult => {
  return runPreset(config);
};

export const populateTextBindings = (config: TextBindConfig): BindResult => {
  return scanAndPopulateTextBindings(config);
};

export const getActiveCompTextLayers = () => {
  var comp = getActiveComp();
  if (!comp) return [];
  var result: { name: string; index: number; text: string }[] = [];
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer instanceof TextLayer) {
      var text = "";
      try { text = String((layer.property("Source Text") as any).value.text); } catch (e) {}
      result.push({ name: layer.name, index: i, text });
    }
  }
  return result;
};
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Full integration test in AE**

1. Open AE with a saved project
2. Open the "Ticker Data" panel (restart AE to pick up new build)
3. Add AAPL + MSFT to watchlist
4. Click Fetch Data — verify `Input/ticker_data.json` created
5. Select "Stock Card" preset, click Build in AE
6. Expected: "TD: AAPL" comp created in project with symbol, price, change layers + sparkline
7. Select "Comparison" preset, click Build in AE
8. Expected: "TD: Comparison" comp created
9. Add `{STOCK.price}` text layer in a comp, set binding STOCK→AAPL, click Update Text
10. Expected: text layer populated with price

- [ ] **Step 5: Commit**

```bash
git add examples/ticker-data/src/jsx/
git commit -m "feat(ticker-data): add preset orchestrator and wire full aeft.ts"
```

---

## Task 15: Sample Data + Archive + README

**Files:**
- Create: `examples/ticker-data/Input/sample_ticker_data.json`
- Move: `Scripts/demos/stock_ticker/` → `Scripts/demos/_archive/stock_ticker/`
- Modify: `examples/README.md`
- Create: `examples/ticker-data/README.md`

- [ ] **Step 1: Create `examples/ticker-data/Input/sample_ticker_data.json`**

This file is imported as a Vite JSON module in `main.svelte`, so it must exist before building. Write the file with the exact structure below. Use the helper script in Step 1b to generate the 30-day history arrays, or write them manually.

Key requirements:
- 3 stocks: AAPL (trending up ~15%), MSFT (flat ±2%), TSLA (trending down ~20%) — ensures the comparison chart shows visible spread
- 22 daily price bars per stock
- `"bindings": { "STOCK": "AAPL", "STOCK2": "MSFT" }` so text binding demo works immediately
- `fetchedAt` should be a recent date (e.g. `"2026-03-24T18:00:00Z"`)

Concrete structure (write a script to generate or fill manually):

```json
{
  "fetchedAt": "2026-03-24T18:00:00Z",
  "bindings": { "STOCK": "AAPL", "STOCK2": "MSFT" },
  "stocks": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "current": 228.50,
      "change": 4.20,
      "changePercent": 1.87,
      "volume": 54200000,
      "marketCap": 3500000000000,
      "high52w": 260.10,
      "low52w": 164.08,
      "regularMarketTime": "2026-03-24T20:00:00Z",
      "marketState": "REGULAR",
      "history": [
        {"date":"2026-02-19","open":198.00,"high":200.50,"low":197.00,"close":199.00,"volume":48000000},
        {"date":"2026-02-20","open":199.00,"high":202.00,"low":198.50,"close":201.00,"volume":49000000},
        {"date":"2026-02-21","open":201.00,"high":204.00,"low":200.00,"close":203.50,"volume":51000000},
        {"date":"2026-02-24","open":203.50,"high":206.00,"low":202.00,"close":205.00,"volume":47000000},
        {"date":"2026-02-25","open":205.00,"high":207.50,"low":204.00,"close":206.50,"volume":52000000},
        {"date":"2026-02-26","open":206.50,"high":209.00,"low":205.00,"close":208.00,"volume":53000000},
        {"date":"2026-02-27","open":208.00,"high":211.00,"low":207.00,"close":210.00,"volume":55000000},
        {"date":"2026-02-28","open":210.00,"high":212.00,"low":208.50,"close":209.50,"volume":50000000},
        {"date":"2026-03-03","open":209.50,"high":213.00,"low":208.00,"close":212.00,"volume":54000000},
        {"date":"2026-03-04","open":212.00,"high":215.00,"low":211.00,"close":214.00,"volume":56000000},
        {"date":"2026-03-05","open":214.00,"high":217.00,"low":213.00,"close":216.50,"volume":57000000},
        {"date":"2026-03-06","open":216.50,"high":219.00,"low":215.00,"close":218.00,"volume":53000000},
        {"date":"2026-03-07","open":218.00,"high":221.00,"low":217.00,"close":220.50,"volume":58000000},
        {"date":"2026-03-10","open":220.50,"high":223.00,"low":219.00,"close":222.00,"volume":55000000},
        {"date":"2026-03-11","open":222.00,"high":225.00,"low":221.00,"close":223.50,"volume":59000000},
        {"date":"2026-03-12","open":223.50,"high":226.00,"low":222.00,"close":225.00,"volume":57000000},
        {"date":"2026-03-13","open":225.00,"high":227.50,"low":223.50,"close":224.00,"volume":54000000},
        {"date":"2026-03-14","open":224.00,"high":228.00,"low":223.00,"close":226.50,"volume":60000000},
        {"date":"2026-03-17","open":226.50,"high":229.00,"low":225.00,"close":228.00,"volume":56000000},
        {"date":"2026-03-18","open":228.00,"high":231.00,"low":227.00,"close":229.50,"volume":62000000},
        {"date":"2026-03-19","open":229.50,"high":232.00,"low":228.00,"close":227.00,"volume":53000000},
        {"date":"2026-03-24","open":227.00,"high":229.50,"low":226.00,"close":228.50,"volume":54200000}
      ]
    },
    {
      "symbol": "MSFT",
      "name": "Microsoft Corp.",
      "current": 418.00,
      "change": 0.80,
      "changePercent": 0.19,
      "volume": 22000000,
      "marketCap": 3100000000000,
      "high52w": 468.35,
      "low52w": 385.58,
      "regularMarketTime": "2026-03-24T20:00:00Z",
      "marketState": "REGULAR",
      "history": [
        {"date":"2026-02-19","open":410.00,"high":413.00,"low":409.00,"close":411.00,"volume":20000000},
        {"date":"2026-02-20","open":411.00,"high":414.00,"low":410.00,"close":412.50,"volume":21000000},
        {"date":"2026-02-21","open":412.50,"high":415.00,"low":411.00,"close":413.00,"volume":22000000},
        {"date":"2026-02-24","open":413.00,"high":416.00,"low":412.00,"close":414.50,"volume":20000000},
        {"date":"2026-02-25","open":414.50,"high":417.00,"low":413.00,"close":415.00,"volume":21500000},
        {"date":"2026-02-26","open":415.00,"high":418.00,"low":414.00,"close":416.50,"volume":23000000},
        {"date":"2026-02-27","open":416.50,"high":419.00,"low":415.00,"close":417.00,"volume":22500000},
        {"date":"2026-02-28","open":417.00,"high":420.00,"low":416.00,"close":418.50,"volume":24000000},
        {"date":"2026-03-03","open":418.50,"high":421.00,"low":417.00,"close":419.00,"volume":21000000},
        {"date":"2026-03-04","open":419.00,"high":422.00,"low":418.00,"close":420.50,"volume":23500000},
        {"date":"2026-03-05","open":420.50,"high":423.00,"low":419.00,"close":421.00,"volume":22000000},
        {"date":"2026-03-06","open":421.00,"high":422.50,"low":418.50,"close":419.50,"volume":20500000},
        {"date":"2026-03-07","open":419.50,"high":421.00,"low":417.00,"close":418.00,"volume":21000000},
        {"date":"2026-03-10","open":418.00,"high":420.00,"low":416.50,"close":419.00,"volume":22000000},
        {"date":"2026-03-11","open":419.00,"high":421.50,"low":418.00,"close":420.00,"volume":23000000},
        {"date":"2026-03-12","open":420.00,"high":422.00,"low":419.00,"close":421.00,"volume":21500000},
        {"date":"2026-03-13","open":421.00,"high":422.50,"low":419.50,"close":420.00,"volume":22500000},
        {"date":"2026-03-14","open":420.00,"high":422.00,"low":418.50,"close":419.50,"volume":20000000},
        {"date":"2026-03-17","open":419.50,"high":421.00,"low":418.00,"close":420.50,"volume":22000000},
        {"date":"2026-03-18","open":420.50,"high":422.50,"low":419.00,"close":421.00,"volume":23000000},
        {"date":"2026-03-19","open":421.00,"high":423.00,"low":420.00,"close":419.00,"volume":21000000},
        {"date":"2026-03-24","open":419.00,"high":420.50,"low":417.50,"close":418.00,"volume":22000000}
      ]
    },
    {
      "symbol": "TSLA",
      "name": "Tesla, Inc.",
      "current": 175.40,
      "change": -3.20,
      "changePercent": -1.79,
      "volume": 88000000,
      "marketCap": 560000000000,
      "high52w": 299.29,
      "low52w": 138.80,
      "regularMarketTime": "2026-03-24T20:00:00Z",
      "marketState": "REGULAR",
      "history": [
        {"date":"2026-02-19","open":219.00,"high":222.00,"low":217.00,"close":220.00,"volume":82000000},
        {"date":"2026-02-20","open":220.00,"high":221.50,"low":216.00,"close":217.00,"volume":85000000},
        {"date":"2026-02-21","open":217.00,"high":218.50,"low":213.00,"close":214.50,"volume":90000000},
        {"date":"2026-02-24","open":214.50,"high":215.00,"low":210.00,"close":211.00,"volume":88000000},
        {"date":"2026-02-25","open":211.00,"high":213.00,"low":208.00,"close":209.00,"volume":86000000},
        {"date":"2026-02-26","open":209.00,"high":210.50,"low":205.00,"close":206.00,"volume":91000000},
        {"date":"2026-02-27","open":206.00,"high":207.50,"low":202.00,"close":203.50,"volume":89000000},
        {"date":"2026-02-28","open":203.50,"high":205.00,"low":200.00,"close":201.00,"volume":93000000},
        {"date":"2026-03-03","open":201.00,"high":202.50,"low":197.00,"close":198.50,"volume":87000000},
        {"date":"2026-03-04","open":198.50,"high":200.00,"low":195.00,"close":196.00,"volume":90000000},
        {"date":"2026-03-05","open":196.00,"high":197.50,"low":193.00,"close":194.00,"volume":88000000},
        {"date":"2026-03-06","open":194.00,"high":195.50,"low":191.00,"close":192.00,"volume":86000000},
        {"date":"2026-03-07","open":192.00,"high":194.00,"low":189.00,"close":190.00,"volume":92000000},
        {"date":"2026-03-10","open":190.00,"high":191.50,"low":187.00,"close":188.00,"volume":89000000},
        {"date":"2026-03-11","open":188.00,"high":189.50,"low":185.00,"close":186.00,"volume":91000000},
        {"date":"2026-03-12","open":186.00,"high":187.50,"low":183.00,"close":184.00,"volume":88000000},
        {"date":"2026-03-13","open":184.00,"high":185.00,"low":181.00,"close":182.50,"volume":87000000},
        {"date":"2026-03-14","open":182.50,"high":183.50,"low":179.00,"close":180.00,"volume":90000000},
        {"date":"2026-03-17","open":180.00,"high":181.00,"low":177.00,"close":178.60,"volume":86000000},
        {"date":"2026-03-18","open":178.60,"high":180.00,"low":176.00,"close":177.00,"volume":89000000},
        {"date":"2026-03-19","open":177.00,"high":178.50,"low":175.00,"close":178.60,"volume":88000000},
        {"date":"2026-03-24","open":178.60,"high":179.00,"low":174.50,"close":175.40,"volume":88000000}
      ]
    }
  ]
}
```

- [ ] **Step 2: Archive old stock ticker demo**

```bash
mkdir -p Scripts/demos/_archive
mv Scripts/demos/stock_ticker Scripts/demos/_archive/stock_ticker
```

- [ ] **Step 3: Update `examples/README.md`**

Add a new row to the examples table:

```markdown
| ticker-data | CEP panel | Live stock data from Yahoo Finance. Sparklines, stock cards, comparison charts, and text value injection. Supersedes the stock_ticker demo. | AE 2023+, Node 18+ |
```

- [ ] **Step 4: Create `examples/ticker-data/README.md`**

Write a README following the project's established pattern (Architecture → Prerequisites → Setup → Configuration → Usage → How It Works → Yahoo Finance Note). Key sections:

- **Architecture**: CEP panel (Svelte 5) + yahoo-finance2 + JSON file bridge + ES3 ExtendScript builders
- **Prerequisites**: AE 2023+, Node.js 18+, npm, CEP debug mode enabled
- **Setup**: `npm install && npm run symlink && npm run build`
- **Enabling CEP debug mode**: explain setting `PlayerDebugMode = 1` in CSXS.xml
- **Usage**: Explain the 4 presets + text binding workflow with concrete examples
- **How It Works**: numbered pipeline from fetch → JSON → evalTS → builders → AE layers
- **Yahoo Finance Note**: unofficial API, 15-20 min delay, no API key, personal/educational use

- [ ] **Step 5: Final build + full smoke test**

```bash
cd examples/ticker-data
npm run build
```

Open AE, verify all features end-to-end as documented in the spec's Verification section.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add examples/ticker-data/Input/sample_ticker_data.json
git add examples/ticker-data/README.md
git add examples/README.md
git add Scripts/demos/_archive/
git add Scripts/demos/
git commit -m "feat(ticker-data): add sample data, README, archive old stock_ticker demo"
```

---

## Verification Checklist

Before considering implementation complete, confirm all items from the spec pass:

- [ ] `npm install && npm run build` succeeds with no TypeScript errors
- [ ] `npm run symlink` — extension in `~/Library/Application Support/Adobe/CEP/extensions/com.ae-ai-starter.ticker-data/`
- [ ] Panel appears in AE Window menu as "Ticker Data"
- [ ] Panel shows sample watchlist without network (loads `sample_ticker_data.json` on mount if no `ticker_data.json` exists yet)
- [ ] New unsaved AE project → "Save your AE project first" shown, Fetch disabled
- [ ] Live fetch: add TSLA, click Fetch → `{projectDir}/Input/ticker_data.json` created
- [ ] Text binding: `{STOCK.price}` → AAPL price, swap to MSFT → MSFT price, without editing text layer
- [ ] `{STOCK.volume}` shows "54.1M" not raw integer
- [ ] Single card preset creates `TD: AAPL` comp with symbol, price, change, sparkline layers
- [ ] Build on existing `TD: AAPL` comp updates it (populate mode), does not duplicate
- [ ] Comparison preset with 3 stocks creates `TD: Comparison` comp with 3 colored paths + legend
- [ ] Refresh All: fetches then rebuilds last preset in one click
- [ ] Offline fallback: disconnected network → error + "Use cached data" if JSON exists
- [ ] Stale warning: `fetchedAt` set to 2 days ago → yellow banner appears
