<!-- src/js/components/TickerSearch.svelte -->
<script lang="ts">
  import { searchTickers } from "../lib/ticker-service";

  let { onAdd }: { onAdd: (symbol: string, name: string) => void } = $props();

  let query = $state("");
  let suggestions: { symbol: string; name: string }[] = $state([]);
  let debounceTimer: ReturnType<typeof setTimeout>;
  let errorMsg = $state("");

  const TICKER_RE = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/;

  function handleInput() {
    clearTimeout(debounceTimer);
    errorMsg = "";
    const upper = query.toUpperCase();
    if (upper !== query) query = upper;
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

  function addDirect() {
    const sym = query.trim().toUpperCase();
    if (!TICKER_RE.test(sym)) { errorMsg = "Enter a valid symbol (e.g. AAPL)"; return; }
    onAdd(sym, sym);
    query = "";
    suggestions = [];
    errorMsg = "";
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); addDirect(); }
  }
</script>

<div class="search-wrap">
  <div class="row">
    <input
      type="text"
      placeholder="Ticker symbol (e.g. AAPL)"
      bind:value={query}
      oninput={handleInput}
      onkeydown={handleKeydown}
    />
    <button class="add-btn" onclick={addDirect}>Add</button>
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
  .row { display: flex; gap: 6px; }
  input { flex: 1; min-width: 0; box-sizing: border-box; background: #2a2a2a; border: 1px solid #444; color: #ddd; padding: 6px 8px; border-radius: 4px; font-size: 12px; }
  .add-btn { background: #2a3a4a; border: 1px solid #4a9eff; color: #4a9eff; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; white-space: nowrap; }
  .add-btn:hover { background: #3a4a5a; }
  .suggestions { position: absolute; z-index: 10; background: #252525; border: 1px solid #444; border-radius: 4px; width: 100%; margin: 0; padding: 0; list-style: none; max-height: 160px; overflow-y: auto; }
  .suggestions button { width: 100%; text-align: left; background: none; border: none; color: #ccc; padding: 6px 10px; font-size: 12px; cursor: pointer; }
  .suggestions button:hover { background: #3a3a3a; }
  .err { color: #e05555; font-size: 11px; margin: 4px 0 0; }
</style>
