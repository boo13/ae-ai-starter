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
