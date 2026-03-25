<!-- src/js/components/PresetSelector.svelte -->
<script lang="ts">
  import type { Preset } from "@shared/types";
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
