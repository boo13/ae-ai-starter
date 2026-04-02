---
status: pending
priority: p3
issue_id: "008"
tags: [code-review, typescript, ticker-data, svelte]
dependencies: []
---

# main.svelte: Manually Synchronized Derived State + Flow Control via Side-Effect

## Problem Statement

Two related issues in `main.svelte` make the reactive state harder to reason about: (1) `dataIsOnDisk` and `showStaleWarning` are manually set in three different handlers instead of being derived from `cachedData`; (2) `handleRefreshAll` uses the `status` reactive variable as a side-channel for flow control, coupling two independent async functions through shared mutable state.

## Findings

**Finding 1 — Manually synchronized derived booleans:**
- `dataIsOnDisk` is always `true` iff `cachedData !== null && cachedData !== SAMPLE_DATA`
- `showStaleWarning` is always `isCacheStale(cachedData)` when `dataIsOnDisk` is true
- Both are set/cleared manually in `onMount`, `handleFetch`, and `handleUseCached` — three synchronization points that can drift
- `main.svelte:53`: `showStaleWarning = isCacheStale(cachedData)` is dead code (overwritten on line 56)

**Finding 2 — `handleRefreshAll` flow control via `$state`:**
- `main.svelte:204-207`:
```ts
async function handleRefreshAll() {
  await handleFetch();
  if (status !== "error") await handleBuild();
}
```
- If `handleFetch` ever defers its `status = "error"` assignment, the guard silently stops working
- Flagged by: kieran-typescript-reviewer (IMPORTANT items 7 and 10), code-simplicity-reviewer

## Proposed Solutions

### Option 1: Convert to $derived, return result from handleFetch (Recommended)

```ts
// Replace manual state with derived
let dataIsOnDisk = $derived(cachedData !== null && cachedData !== SAMPLE_DATA);
let showStaleWarning = $derived(dataIsOnDisk && isCacheStale(cachedData));

// handleFetch returns a boolean result
async function handleFetch(): Promise<boolean> {
  // ... existing logic ...
  return status !== "error";
}

async function handleRefreshAll() {
  const fetchOk = await handleFetch();
  if (fetchOk) await handleBuild();
}
```

Pros: Eliminates 3 synchronization points, removes dead code on line 53, makes flow control explicit.
Cons: Minor refactor to handleFetch signature.

### Option 2: Keep manual state, just fix the dead assignment and add explicit result

Remove line 53 (`showStaleWarning = isCacheStale(cachedData)` before the if-branch). Add a `let fetchSucceeded = false` flag inside `handleFetch` and return it.

Pros: Smaller diff.
Cons: Doesn't address the root synchronization problem.

## Recommended Action

Option 1. The `$derived` approach is idiomatic Svelte 5 and removes the most complexity.

## Technical Details

- Affected file: `examples/ticker-data/src/js/main/main.svelte` (lines 34-38, 53, 56, 204-207)
- PR: #5 `feature/ticker-data-cep-panel`

## Acceptance Criteria

- [ ] `dataIsOnDisk` is `$derived` from `cachedData`
- [ ] `showStaleWarning` is `$derived` from `cachedData`
- [ ] Dead `showStaleWarning = isCacheStale(cachedData)` on line 53 removed
- [ ] `handleRefreshAll` does not read `status` to decide whether to build
- [ ] Manual assignments to `dataIsOnDisk`/`showStaleWarning` removed from all handlers

## Work Log

### 2026-03-25 — Identified in PR #5 code review

Flagged by kieran-typescript-reviewer (items 7, 10) and code-simplicity-reviewer.
