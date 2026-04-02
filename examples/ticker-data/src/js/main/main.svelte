<!-- src/js/main/main.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { evalTS } from "../lib/utils/bolt";
  import { fetchQuotes, PartialFetchError } from "../lib/ticker-service";
  // Sample data is bundled at build time via Vite's JSON import
  import sampleTickerData from "../../../Input/sample_ticker_data.json";
  import type { TickerData as TickerDataType } from "@shared/types";
  const SAMPLE_DATA = sampleTickerData as TickerDataType;
  import { writeTickerData, readCachedData, isCacheStale, getDataFilePath } from "../lib/data-writer";
  import { debugLog, clearDebugLog, setLogProjectRoot } from "../lib/debug-log";
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
  import type { PanelStatus, LogEntry, Customization, Preset, TickerData } from "@shared/types";

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
  let dataIsOnDisk = $derived(cachedData !== null && cachedData !== SAMPLE_DATA);
  let showStaleWarning = $derived(dataIsOnDisk && isCacheStale(cachedData));
  let showUseCachedButton = $state(false);

  function log(level: LogEntry["level"], message: string) {
    logs = [...logs, { timestamp: Date.now(), level, message }];
  }

  onMount(async () => {
    clearDebugLog();
    watchlist = loadWatchlist();
    bindings = loadBindings();
    selectedPreset = loadLastPreset();

    try {
      projectRoot = await evalTS("getProjectRoot") ?? "";
      if (projectRoot) setLogProjectRoot(projectRoot);
      debugLog("INFO", "projectRoot:", projectRoot || "(empty — no AE project saved)");
      if (projectRoot) {
        const fromDisk = readCachedData(projectRoot);
        if (fromDisk) {
          cachedData = fromDisk;
          log("info", "Loaded cached data from Input/ticker_data.json");
          debugLog("INFO", "readCachedData: loaded", fromDisk.stocks?.length, "stocks");
        } else {
          cachedData = SAMPLE_DATA;
          log("info", "No data file found — showing sample data. Click Fetch to get live prices and enable Build.");
          debugLog("INFO", "readCachedData: no file found, using sample data");
        }
      } else {
        cachedData = SAMPLE_DATA;
        log("info", "Sample data loaded (demo view). Save your AE project then Fetch to enable Build.");
        debugLog("INFO", "No AE project, using sample data");
      }
    } catch (e: any) {
      log("error", "Could not connect to AE: " + (e?.message ?? e));
      debugLog("ERROR", "onMount evalTS error:", e?.message ?? e);
    }
  });

  const TICKER_RE = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/;

  function addTicker(symbol: string, _name: string) {
    if (!TICKER_RE.test(symbol)) {
      log("error", `Invalid ticker symbol: ${symbol}`);
      return;
    }
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
    } catch (err: unknown) {
      if (err instanceof PartialFetchError && err.partialResults.length > 0) {
        stocks = err.partialResults;
        err.errors.forEach(e => log("error", e));
      } else {
        status = "error";
        const fetchErrMsg = err instanceof Error ? err.message : String(err);
        log("error", "Fetch failed: " + fetchErrMsg);
        debugLog("ERROR", "handleFetch failed:", fetchErrMsg);
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
    if (!cachedData) { log("error", "No data available — click Fetch Data first"); return; }

    status = "building";
    log("info", `Building preset "${selectedPreset}"...`);

    // Always write data to disk before building so ExtendScript can read it
    const filePath = getDataFilePath(projectRoot);
    debugLog("INFO", "handleBuild: writing data to", filePath);
    try {
      await writeTickerData(cachedData, projectRoot);
      debugLog("INFO", "handleBuild: write succeeded");
    } catch (e: any) {
      status = "error";
      const msg = "Could not write data file: " + (e?.message ?? e);
      log("error", msg);
      debugLog("ERROR", "handleBuild write failed:", e?.message ?? e);
      return;
    }

    debugLog("INFO", "handleBuild: calling evalTS buildFromPreset, preset:", selectedPreset, "path:", filePath);
    try {
      const result = await evalTS("buildFromPreset", {
        preset: selectedPreset,
        dataFilePath: filePath,
        customization,
      });
      debugLog("INFO", "handleBuild: evalTS result:", result);
      if (result.success) {
        log("success", result.message);
      } else {
        log("error", result.message);
      }
    } catch (e: any) {
      log("error", "Build failed: " + (e?.message ?? e));
      debugLog("ERROR", "handleBuild evalTS threw:", e?.message ?? e);
    } finally {
      status = "idle";
    }
  }

  async function handleUpdateText() {
    if (!projectRoot) { log("error", "Save your AE project first"); return; }
    if (!cachedData) { log("error", "Fetch data first"); return; }

    status = "building";
    log("info", "Updating text bindings...");

    const filePath = getDataFilePath(projectRoot);
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
