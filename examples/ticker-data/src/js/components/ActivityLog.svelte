<!-- src/js/components/ActivityLog.svelte -->
<script lang="ts">
  import type { LogEntry } from "@shared/types";
  let { entries }: { entries: LogEntry[] } = $props();

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
</script>

<div class="log">
  {#each entries.slice().reverse() as entry}
    <div class="entry {entry.level}">
      <span class="time">{formatTime(entry.timestamp)}</span>
      <span class="msg">{entry.message}</span>
    </div>
  {/each}
  {#if entries.length === 0}
    <div class="empty">No activity yet</div>
  {/if}
</div>

<style>
  .log { background: #111; border-radius: 4px; padding: 8px; max-height: 120px; overflow-y: auto; font-size: 11px; }
  .entry { display: flex; gap: 6px; padding: 2px 0; }
  .time { color: #666; flex-shrink: 0; }
  .info .msg { color: #aaa; }
  .success .msg { color: #4caf50; }
  .error .msg { color: #e05555; }
  .empty { color: #555; font-style: italic; }
</style>
