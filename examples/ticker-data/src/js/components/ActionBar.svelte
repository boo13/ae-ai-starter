<!-- src/js/components/ActionBar.svelte -->
<script lang="ts">
  import type { PanelStatus } from "@shared/types";
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
