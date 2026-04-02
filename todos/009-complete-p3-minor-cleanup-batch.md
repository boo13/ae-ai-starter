---
status: pending
priority: p3
issue_id: "009"
tags: [code-review, ticker-data, cleanup, security]
dependencies: []
---

# Minor Cleanup Batch: Dead Code, Debug Logging, Config Housekeeping

## Problem Statement

Several small issues identified across the PR: dead scaffold code, unconditional debug logging that leaks filesystem paths, missing documentation for a security-relevant config value, and overly broad CEP manifest version range.

## Findings

1. **`actions.ts` — dead stub file** (`src/js/lib/actions.ts`): exports an empty `quickActions` array with a `QuickAction` interface. No consumer exists. Inherited from bolt-cep scaffold. Confusing in a learning example.

2. **`bolt.ts:81` — unconditional `console.log`**: Every `evalTS` call logs its full serialized argument to the CEP debug console, including absolute filesystem paths (e.g. `BuildConfig.dataFilePath`). Should be guarded by `NODE_ENV !== "production"`.

3. **`cep.config.ts:37` — hardcoded ZXP password** (`password: "password"`): The README has no callout that this must be changed before signing and distributing a packaged extension. Not a security issue for the example itself, but learners will copy it into production code.

4. **Manifest AE version range** (`dist/cep/CSXS/manifest.xml:14`): `[0.0,99.9]` loads the extension in any AE version including very old releases with known bugs. Minimum should be `[22.0,99.9]` (AE 2022+) to match the CEP 11 baseline.

5. **`localStorage` parsed without shape validation** (`config-store.ts:10-14, 22-27`): `loadWatchlist` and `loadBindings` parse JSON from localStorage without verifying the result is an Array / plain Object. A corrupted or cross-extension-written value silently propagates to `fetchQuotes` and `evalTS` arguments.

6. **`stale threshold magic number`** (`data-writer.ts:47`): `hoursOld > 24` hardcodes 24 without a named constant. Since the stale-warning banner in the UI and the cache logic must agree, this should be `const CACHE_STALE_HOURS = 24`.

## Proposed Solutions

### Fix each item independently (all small):

1. **Delete `actions.ts`** or add a comment: `// Extension point: add quick-action buttons here`
2. **Guard console.log in bolt.ts**: `if (process.env.NODE_ENV !== 'production') { console.log(...) }`
3. **Add README note**: Under Setup section — "Before packaging: change `zxp.password` in `cep.config.ts` to a real value"
4. **Update manifest range**: Change `[0.0,99.9]` to `[22.0,99.9]` in `vite.config.ts` or `cep.config.ts` where the manifest is generated
5. **Add minimal shape checks in config-store**: `Array.isArray(parsed)` for watchlist, `parsed !== null && typeof parsed === "object"` for bindings
6. **Extract constant**: `const CACHE_STALE_HOURS = 24;` at top of `data-writer.ts`

## Recommended Action

Fix all 6 in a single cleanup commit. Each is a 1-3 line change.

## Technical Details

- `examples/ticker-data/src/js/lib/actions.ts`
- `examples/ticker-data/src/js/lib/utils/bolt.ts:81`
- `examples/ticker-data/cep.config.ts:37`
- `examples/ticker-data/src/js/lib/config-store.ts:10-27`
- `examples/ticker-data/src/js/lib/data-writer.ts:47`
- Manifest source in `cep.config.ts` or generated `dist/cep/CSXS/manifest.xml`
- PR: #5 `feature/ticker-data-cep-panel`

## Acceptance Criteria

- [ ] `actions.ts` deleted or has explanatory comment, no longer a confusing stub
- [ ] `bolt.ts` debug log guarded by `NODE_ENV !== "production"`
- [ ] README mentions changing ZXP password before distribution
- [ ] CEP manifest minimum version set to `22.0` or later
- [ ] `loadWatchlist` validates parsed value is an Array before returning
- [ ] `loadBindings` validates parsed value is a plain Object before returning
- [ ] `CACHE_STALE_HOURS = 24` constant extracted in `data-writer.ts`

## Work Log

### 2026-03-25 — Identified in PR #5 code review

Aggregated from: security-sentinel (items 4, 5, 7), kieran-typescript-reviewer (items 6, 12), architecture-strategist (items 6, 9).
