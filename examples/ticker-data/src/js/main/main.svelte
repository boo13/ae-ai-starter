<script lang="ts">
  import { onMount } from "svelte";
  import { evalTS } from "../lib/utils/bolt";

  let status = $state("idle");

  onMount(async () => {
    try {
      const root = await evalTS("getProjectRoot");
      status = root ? `connected: ${root}` : "no project saved";
    } catch (e) {
      status = "CEP bridge error";
    }
  });
</script>

<main>
  <h1>Ticker Data</h1>
  <p>{status}</p>
</main>

<style>
  main { padding: 16px; font-family: sans-serif; color: #ccc; background: #1e1e1e; min-height: 100vh; }
  h1 { font-size: 16px; margin: 0 0 8px; }
</style>
