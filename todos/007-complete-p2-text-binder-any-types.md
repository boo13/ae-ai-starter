---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, typescript, ticker-data, type-safety]
dependencies: []
---

# text-binder.ts: any Types Suppress Useful Diagnostics

## Problem Statement

`text-binder.ts` uses `any` in two places where a concrete type is available: `resolveField` accepts `stockData: any` instead of `StockData`, and `stockMap` is `Record<string, any>` instead of `Record<string, StockData>`. These suppress autocomplete, hide typos in field names, and make the function untestable without casting. Since this is a learning example, the `any` pattern will be copied.

## Findings

- `text-binder.ts:8`: `function resolveField(stockData: any, field: string): string`
  - `StockData` is available via the same import chain — no reason for `any`
- `text-binder.ts:39`: `var stockMap: Record<string, any> = {}`
  - Should be `Record<string, StockData>` — `StockData[]` is the type of `data.stocks`
- `text-binder.ts:6`: `declare const $: any` — unused, never referenced in the file
- Flagged by: kieran-typescript-reviewer (IMPORTANT items 5 and 8, MINOR item 11)

## Proposed Solutions

### Option 1: Replace any with StockData (Recommended)

```ts
import type { StockData, TickerData, TextBindConfig, BindResult } from "../../shared/types";

function resolveField(stockData: StockData, field: string): string { ... }

var stockMap: Record<string, StockData> = {};
```

Remove the unused `declare const $: any` declaration on line 6.

Pros: Minimal change, full type coverage, removes unused code.
Cons: None.

## Recommended Action

Option 1. Direct substitution — `StockData` is already imported transitively.

## Technical Details

- Affected file: `examples/ticker-data/src/jsx/builders/text-binder.ts` (lines 6, 8, 39)
- PR: #5 `feature/ticker-data-cep-panel`

## Acceptance Criteria

- [ ] `resolveField` parameter typed as `StockData`, not `any`
- [ ] `stockMap` typed as `Record<string, StockData>`, not `Record<string, any>`
- [ ] `declare const $: any` removed (unused)

## Work Log

### 2026-03-25 — Identified in PR #5 code review

Flagged by kieran-typescript-reviewer as IMPORTANT items 5 and 8 and MINOR item 11.
