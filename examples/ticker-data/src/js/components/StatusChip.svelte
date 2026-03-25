<!-- src/js/components/StatusChip.svelte -->
<script lang="ts">
  import type { PanelStatus } from "@shared/types";
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
