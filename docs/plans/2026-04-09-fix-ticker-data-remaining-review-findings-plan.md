# Ticker Data Remaining Review Findings — Implementation Plan

**Date:** 2026-04-09

## Context

[`todos/ticker-data-review.md`](/Users/randycounsman/Git/ae-ai-starter/todos/ticker-data-review.md) is no longer an accurate backlog. Several findings in that review have already been fixed in the current `examples/ticker-data` implementation, including:

- data file path normalization and traversal guard in [`data-writer.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/lib/data-writer.ts)
- `evalFile()` path escaping in [`bolt.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/lib/utils/bolt.ts)
- typed partial-fetch errors in [`ticker-service.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/lib/ticker-service.ts)
- ticker symbol input validation in [`main.svelte`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/main/main.svelte)
- derived cache warning state in [`main.svelte`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/main/main.svelte)
- manifest host version and ZXP password documentation in [`cep.config.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/cep.config.ts) and [`README.md`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/README.md)

This plan covers only the issues that still appear to be open in the current codebase.

## Remaining Issues

### 1. Replace Residual Unsafe Preset Narrowing

Current code still relies on unchecked `Preset` casts in two places:

- [`config-store.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/lib/config-store.ts:39)
- [`PresetSelector.svelte`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/components/PresetSelector.svelte:13)

The stored preset value from `localStorage` is untrusted runtime data, and the `<select>` value is still a raw string from the DOM. Both are being narrowed with `as Preset` instead of being validated.

**Plan**

- Add a shared preset guard in the ticker-data JS layer, for example `isPreset(value: string): value is Preset`.
- Update `loadLastPreset()` to validate the stored value via that guard and fall back to `"single-card"` without a cast.
- Update `PresetSelector.svelte` to validate the DOM value before calling `onChange`.
- Keep invalid preset handling conservative: ignore unknown UI values and fall back to the default for persisted values.

**Acceptance Criteria**

- No unchecked `as Preset` cast remains in the ticker-data panel code.
- Invalid `localStorage` preset values fall back to `"single-card"`.
- Invalid DOM values from the preset selector do not propagate into state.

### 2. Remove `status` as a Flow-Control Side Channel in `handleRefreshAll`

[`main.svelte`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/main/main.svelte:227) still decides whether to build by reading `status !== "error"` after `handleFetch()`.

This couples sequencing to shared UI state. If `handleFetch()` changes its internal status transitions later, refresh-all can silently regress.

**Plan**

- Change `handleFetch()` to return an explicit result, preferably `Promise<boolean>` for success/failure.
- Return `false` for validation failures, fetch failures, and write failures.
- Return `true` after cached data is written successfully.
- Update `handleRefreshAll()` to branch on the returned boolean instead of inspecting `status`.
- Keep `status` responsible only for UI display, not business-flow signaling.

**Acceptance Criteria**

- `handleRefreshAll()` no longer reads `status` to decide whether to continue.
- `handleFetch()` returns an explicit success/failure signal.
- Fetch/build orchestration still preserves current user-visible logging and status behavior.

### 3. Tighten `toMarketState()` So Runtime Validation Does Not End in an Assertion

[`ticker-service.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/lib/ticker-service.ts:146) improved market-state handling by introducing `toMarketState()`, but the function still ends in `raw as StockData["marketState"]`.

That is better than the prior direct cast, but the remaining assertion still weakens the guarantee the helper is supposed to provide.

**Plan**

- Replace the current `includes(...)? raw as ... : "CLOSED"` approach with a real type predicate or a map-based lookup that returns the union type without an assertion.
- Keep the fallback behavior as `"CLOSED"` for unknown Yahoo Finance values.
- Prefer a pattern that makes the narrowing self-contained and obvious to the compiler.

**Acceptance Criteria**

- `toMarketState()` performs runtime validation without using `as StockData["marketState"]`.
- Unknown external values still normalize to `"CLOSED"`.
- `fetchQuotes()` keeps the same external behavior and output shape.

### 4. Audit and Reduce Production `console.log` Noise in the Example

The original review item about a specific unconditional log in `bolt.ts` is now outdated, because the argument logging inside `evalTS()` is already gated by `NODE_ENV !== "production"` in [`bolt.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/lib/utils/bolt.ts:81).

However, the broader production logging concern is still partially valid. There are still unconditional `console.log` calls in the example code, including:

- [`debug-log.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/lib/debug-log.ts)
- [`init-cep.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/lib/utils/init-cep.ts)
- [`utils/cep.ts`](/Users/randycounsman/Git/ae-ai-starter/examples/ticker-data/src/js/lib/utils/cep.ts)
- build config files such as `vite.es.config.ts` may also contain dev-only logs that should be reviewed separately

Not every `console.log` is necessarily wrong, but the remaining logs should be classified instead of left accidental.

**Plan**

- Audit remaining `console.log` usage in the ticker-data example.
- Keep logs that are intentionally developer-facing and only run in dev/build workflows.
- Gate panel-runtime diagnostic logs behind an explicit dev/debug condition, or route them through the existing debug logger if they are user-support relevant.
- Avoid changing bundled third-party CEP shims unless there is a clear reason.

**Acceptance Criteria**

- Runtime panel code no longer emits accidental unconditional debug logs in production.
- Dev-only logging remains available where useful for local development.
- Third-party vendor files are left untouched unless a specific fix is required.

## Suggested Order

1. Preset validation cleanup
2. `handleFetch()` / `handleRefreshAll()` control-flow cleanup
3. `toMarketState()` narrowing cleanup
4. Logging audit and targeted cleanup

This order front-loads the safest correctness improvements and leaves the broader logging sweep for last.

## Validation

- Run the ticker-data TypeScript build after changes.
- Smoke-test preset selection, persisted preset reload, fetch, refresh-all, and build flows in the CEP panel.
- Confirm invalid localStorage preset data does not break startup.
- Confirm partial-fetch behavior still surfaces per-symbol errors.

## Out of Scope

- Reopening already-fixed items from the stale review document
- Reinstating the deleted `actions.ts` scaffold
- Applying changes to `examples/ai-claude`, which is not present in this repository
