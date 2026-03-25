<!-- src/js/components/CustomizePanel.svelte -->
<script lang="ts">
  import type { Customization } from "@shared/types";
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
