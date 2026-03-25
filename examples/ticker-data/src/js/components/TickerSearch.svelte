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
