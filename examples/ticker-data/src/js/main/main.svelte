<!-- src/js/main/main.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { evalTS } from "../lib/utils/bolt";
  import { fetchQuotes } from "../lib/ticker-service";
  // Sample data is bundled at build time via Vite's JSON import
  import sampleTickerData from "../../../Input/sample_ticker_data.json";
  import type { TickerData as TickerDataType } from "@shared/types";
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
