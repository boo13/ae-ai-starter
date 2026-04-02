---
status: pending
priority: p2
issue_id: "004"
tags: [code-review, typescript, ticker-data, type-safety]
dependencies: []
---

# Untyped Partial-Failure Error + marketState Unsafe Cast

## Problem Statement

Two related type-safety violations in `ticker-service.ts` sidestep TypeScript entirely: (1) the partial-fetch failure attaches non-standard properties to a plain `Error` via `(e as any)`, creating an ad-hoc channel outside the typed interface; (2) `marketState` is cast directly from `string | undefined` to a union type with `as`, lying to the compiler about a value that comes from an external API. Both patterns will be copied by learners reading this example.

## Findings

**Finding 1 — `(e as any)` partial error:**
- `ticker-service.ts:65-68`: `(e as any).partialResults = stocks; (e as any).errors = errors;`
- `main.svelte:112-115`: accesses `e.partialResults` and `e.errors` with no type guard
- If this error reaches any other catch block, both fields silently disappear with no TypeScript diagnostic

**Finding 2 — marketState unsafe cast:**
- `ticker-service.ts:47`: `marketState: (quote.marketState as StockData["marketState"]) ?? "CLOSED"`
- `quote.marketState` is typed as `string | undefined` by yahoo-finance2
- If Yahoo returns an unexpected string (e.g. `"PREPRE"`), invalid data silently flows into AE

Both flagged by: kieran-typescript-reviewer, architecture-strategist, code-simplicity-reviewer.

## Proposed Solutions

### Option 1: Typed custom error class + runtime narrowing guard (Recommended)

**For partial error:**
```ts
class PartialFetchError extends Error {
  constructor(
    message: string,
    public readonly partialResults: StockData[],
    public readonly errors: string[]
  ) {
    super(message);
    this.name = "PartialFetchError";
  }
}
// catch site:
if (err instanceof PartialFetchError) {
  // type-safe access to err.partialResults, err.errors
}
```

**For marketState:**
```ts
const VALID_MARKET_STATES = ["REGULAR", "PRE", "POST", "CLOSED"] as const;
function toMarketState(raw: string | undefined): StockData["marketState"] {
  return (VALID_MARKET_STATES as readonly string[]).includes(raw ?? "")
    ? (raw as StockData["marketState"])
    : "CLOSED";
}
```

Pros: Type-safe, testable in isolation, teaches the right pattern.
Cons: Slightly more code.

### Option 2: Discriminated union return type

Replace throw with a return:
```ts
type FetchResult =
  | { ok: true; stocks: StockData[] }
  | { ok: false; errors: string[]; partialStocks: StockData[] };
```
Have `fetchQuotes` return this and remove the try/catch in `main.svelte` for the partial case.

Pros: No exceptions for expected partial failure.
Cons: Larger interface change; call site in main.svelte needs rework.

## Recommended Action

Option 1 for `marketState` (minimal change, direct fix). Either Option 1 or 2 for partial error — Option 2 is architecturally cleaner but Option 1 is a smaller diff. Either is acceptable.

## Technical Details

- Affected files: `examples/ticker-data/src/js/lib/ticker-service.ts` (lines 47, 65-68), `examples/ticker-data/src/js/main/main.svelte` (lines 112-115)
- PR: #5 `feature/ticker-data-cep-panel`

## Acceptance Criteria

- [ ] No `(e as any)` in `ticker-service.ts`
- [ ] Partial fetch failure uses a typed error class or discriminated union
- [ ] `marketState` uses a runtime narrowing function, not an `as` cast
- [ ] Call site in `main.svelte` uses type-safe narrowing (instanceof or discriminant check)

## Work Log

### 2026-03-25 — Identified in PR #5 code review

Flagged by kieran-typescript-reviewer (CRITICAL items 1 and 2), architecture-strategist (IMPORTANT item 5), and code-simplicity-reviewer (observation 4).
