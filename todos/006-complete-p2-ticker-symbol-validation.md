---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, security, ticker-data, input-validation]
dependencies: []
---

# No Ticker Symbol Format Validation Before Use

## Problem Statement

Symbols added to the watchlist pass through `addTicker` without any format validation. They are then passed to `yahoo-finance2` API calls and written verbatim into `ticker_data.json`. A symbol containing unexpected characters could influence HTTP URL construction in yahoo-finance2 or produce malformed JSON field names. More importantly, `loadLastPreset` similarly performs no validation when reading back from localStorage — a stale or malformed value is cast directly to the `Preset` type.

## Findings

- `main.svelte:75-84`: `addTicker(symbol, name)` adds to watchlist with no format check
- `config-store.ts:34` + `main.svelte:47`: `loadLastPreset()` returns `string`, caller casts `as Preset` — any string in localStorage becomes a valid `Preset` at the type level, but `runPreset` in ExtendScript won't match any branch
- Ticker symbols are well-defined: 1-5 uppercase letters, optionally `.<1-2 letter exchange suffix>`
- Flagged by: security-sentinel (IMPORTANT item 3), kieran-typescript-reviewer (IMPORTANT item 4)

## Proposed Solutions

### Option 1: Allowlist regex in addTicker + validate in loadLastPreset (Recommended)

```ts
// main.svelte or a shared validation helper
const TICKER_RE = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/;
function addTicker(symbol: string, name: string) {
  if (!TICKER_RE.test(symbol)) {
    log("error", `Invalid ticker symbol: ${symbol}`);
    return;
  }
  // ...
}

// config-store.ts
const VALID_PRESETS: Preset[] = ["single-card", "multi-card", "comparison", "text-only"];
export function loadLastPreset(): Preset {
  const raw = localStorage.getItem(LAST_PRESET_KEY) ?? "single-card";
  return VALID_PRESETS.includes(raw as Preset) ? (raw as Preset) : "single-card";
}
```

Pros: Prevents unexpected characters, teaches validation at system boundary, fixes the `as Preset` cast.
Cons: Regex must cover international exchange suffixes (e.g. `BRK.B`, `BF.A`).

### Option 2: Validate only in the service layer

Add validation in `ticker-service.ts` before passing to yahoo-finance2.

Pros: Centralizes at the network boundary.
Cons: Invalid symbols still enter localStorage and the UI watchlist.

## Recommended Action

Option 1. Validate at the entry point (`addTicker`) so invalid symbols never enter the watchlist, and fix `loadLastPreset` to return a validated `Preset`.

## Technical Details

- Affected files: `examples/ticker-data/src/js/main/main.svelte` (lines 75-84), `examples/ticker-data/src/js/lib/config-store.ts` (lines 30-34)
- PR: #5 `feature/ticker-data-cep-panel`

## Acceptance Criteria

- [ ] `addTicker` rejects symbols that don't match the allowlist regex with a logged error
- [ ] `loadLastPreset` validates the stored value against `VALID_PRESETS` and falls back to `"single-card"` for unknown values
- [ ] No bare `as Preset` cast at the `main.svelte` call site

## Work Log

### 2026-03-25 — Identified in PR #5 code review

Flagged by security-sentinel (no ticker validation) and kieran-typescript-reviewer (unsafe `as Preset` cast).
