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
