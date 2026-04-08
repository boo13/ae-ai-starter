# Ticker Data CEP Panel — Code Review Backlog

Code review findings from PR #5 (`feature/ticker-data-cep-panel`), identified 2026-03-25.

---

## P1 — Critical

### 001 File Path: Windows-Breaking Construction + Path Traversal Risk

**Files:** `examples/ticker-data/src/js/main/main.svelte` (lines 160, 186), `examples/ticker-data/src/js/lib/data-writer.ts` (lines 25, 32)

`main.svelte` constructs the data file path via string concatenation (`projectRoot + "/Input/ticker_data.json"`), which breaks on Windows where `projectRoot` contains backslashes. `data-writer.ts` uses `path.join` correctly. Additionally, `projectRoot` is never validated — a crafted path with `../` segments can traverse outside `Input/`.

**Fix:** Add `getDataFilePath(projectRoot: string): string` to `data-writer.ts` using `path.join` with a traversal guard (`path.resolve` check). Update both `main.svelte` call sites to use it.

- [ ] Single `getDataFilePath(projectRoot)` helper in `data-writer.ts` with path traversal validation
- [ ] `main.svelte` lines 160 and 186 use the helper instead of string concatenation
- [ ] No bare `"/Input/ticker_data.json"` string literals outside `data-writer.ts`
- [ ] Traversal guard throws on malformed `projectRoot`

---

### 002 evalFile String Injection via Unsanitized Path

**File:** `examples/ticker-data/src/js/lib/utils/bolt.ts` (lines 117–124); same pattern in `examples/ai-claude/src/js/lib/utils/bolt.ts`

`evalFile` concatenates the `file` argument directly into an `evalScript` string. A path containing `"` or `)` escapes the string literal and allows injection into executed ExtendScript. Current call site is safe (Adobe-controlled path) but the exported function is a latent injection surface.

**Fix:** Replace string concatenation with `JSON.stringify(file)`. Apply same fix to `ai-claude` example.

- [ ] `evalFile` uses `JSON.stringify(file)` instead of bare string concatenation
- [ ] Corresponding fix applied to `ai-claude` example's `bolt.ts`

---

## P2 — Important

### 003 Untyped Partial-Failure Error + marketState Unsafe Cast

**File:** `examples/ticker-data/src/js/lib/ticker-service.ts` (lines 47, 65–68), `examples/ticker-data/src/js/main/main.svelte` (lines 112–115)

Two type-safety violations: (1) partial-fetch failure attaches properties to `Error` via `(e as any)`, creating an untyped side channel; (2) `marketState` is cast from `string | undefined` to a union type with `as`, lying to the compiler about external API data.

**Fix:** Create a `PartialFetchError` class with typed fields. Add a `toMarketState()` narrowing function that validates against `VALID_MARKET_STATES`.

- [ ] No `(e as any)` in `ticker-service.ts`
- [ ] Partial fetch failure uses a typed error class or discriminated union
- [ ] `marketState` uses a runtime narrowing function, not an `as` cast
- [ ] Call site in `main.svelte` uses type-safe narrowing

---

### 004 data-writer.ts: Fake-Typed CEP Environment Fallback

**File:** `examples/ticker-data/src/js/lib/data-writer.ts` (lines 5–7)

`fs` and `path` are typed as `typeof import("fs")` / `typeof import("path")` but assigned `{} as any` outside CEP. The compiler believes these are functional modules when they are empty objects that crash on any method call.

**Fix:** Remove the fake fallback. Use `require("fs")` and `require("path")` directly (available in CEP's Node.js). Add an early-throw guard at each exported function boundary.

- [ ] No `{} as any` assigned to a `typeof import(...)` type
- [ ] CEP-only contract is explicit at function boundaries (throw with clear message)
- [ ] TypeScript types accurately reflect what is actually available at runtime

---

### 005 No Ticker Symbol Format Validation + Unsafe Preset Cast

**Files:** `examples/ticker-data/src/js/main/main.svelte` (lines 75–84), `examples/ticker-data/src/js/lib/config-store.ts` (lines 30–34)

Symbols pass through `addTicker` with no format validation before reaching the yahoo-finance2 API and being written to JSON. `loadLastPreset` casts any string from localStorage directly to `Preset` without checking validity.

**Fix:** Add `TICKER_RE = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/` validation in `addTicker`. Add allowlist check in `loadLastPreset` with `"single-card"` fallback.

- [ ] `addTicker` rejects symbols that don't match the allowlist regex
- [ ] `loadLastPreset` validates stored value against `VALID_PRESETS` and falls back to `"single-card"`
- [ ] No bare `as Preset` cast at the `main.svelte` call site

---

### 006 text-binder.ts: any Types Suppress Useful Diagnostics

**File:** `examples/ticker-data/src/jsx/builders/text-binder.ts` (lines 6, 8, 39)

`resolveField` accepts `stockData: any` instead of `StockData`. `stockMap` is `Record<string, any>` instead of `Record<string, StockData>`. `declare const $: any` is unused. `StockData` is available via the existing import chain.

**Fix:** Substitute `StockData` for `any` in both places. Remove unused `declare const $: any`.

- [ ] `resolveField` parameter typed as `StockData`, not `any`
- [ ] `stockMap` typed as `Record<string, StockData>`, not `Record<string, any>`
- [ ] `declare const $: any` removed (unused)

---

## P3 — Minor

### 007 main.svelte: Manually Synchronized Derived State + Flow Control Side-Effect

**File:** `examples/ticker-data/src/js/main/main.svelte` (lines 34–38, 53, 56, 204–207)

`dataIsOnDisk` and `showStaleWarning` are manually synchronized in three handlers instead of being derived from `cachedData`. `handleRefreshAll` reads the `status` reactive variable as a flow-control side-channel — if `handleFetch` defers its `status = "error"` assignment, the guard silently breaks. Line 53 is dead code (overwritten by line 56).

**Fix:** Convert to `$derived`. Have `handleFetch` return a boolean result; use it in `handleRefreshAll` instead of reading `status`.

- [ ] `dataIsOnDisk` is `$derived` from `cachedData`
- [ ] `showStaleWarning` is `$derived` from `cachedData`
- [ ] Dead `showStaleWarning = isCacheStale(cachedData)` on line 53 removed
- [ ] `handleRefreshAll` does not read `status` to decide whether to build
- [ ] Manual assignments to `dataIsOnDisk`/`showStaleWarning` removed from all handlers

---

### 008 Minor Cleanup Batch

**Files:** `src/js/lib/actions.ts`, `src/js/lib/utils/bolt.ts:81`, `cep.config.ts:37`, `src/js/lib/config-store.ts:10–27`, `src/js/lib/data-writer.ts:47`, `dist/cep/CSXS/manifest.xml`

Six small issues:
1. `actions.ts` — dead scaffold stub, no consumer
2. `bolt.ts:81` — unconditional `console.log` leaks filesystem paths in production
3. `cep.config.ts:37` — hardcoded ZXP password `"password"` with no README callout
4. Manifest AE version range `[0.0,99.9]` — should be `[22.0,99.9]` (AE 2022+/CEP 11)
5. `config-store.ts` — `loadWatchlist`/`loadBindings` parse localStorage JSON without shape validation
6. `data-writer.ts:47` — magic number `24` (stale hours) should be a named constant

- [ ] `actions.ts` deleted or has explanatory comment
- [ ] `bolt.ts` debug log guarded by `NODE_ENV !== "production"`
- [ ] README mentions changing ZXP password before distribution
- [ ] CEP manifest minimum version set to `22.0` or later
- [ ] `loadWatchlist` validates parsed value is an Array before returning
- [ ] `loadBindings` validates parsed value is a plain Object before returning
- [ ] `CACHE_STALE_HOURS = 24` constant extracted in `data-writer.ts`
