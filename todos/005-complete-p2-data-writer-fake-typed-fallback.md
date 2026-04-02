---
status: pending
priority: p2
issue_id: "005"
tags: [code-review, typescript, security, ticker-data, cep]
dependencies: []
---

# data-writer.ts: Fake-Typed CEP Environment Fallback

## Problem Statement

`data-writer.ts` declares `fs` and `path` as `typeof import("fs")` and `typeof import("path")` but assigns `{} as any` when outside a CEP context. The declared type is a lie — the compiler believes these are fully-functional modules but they are empty objects that will crash on any method call. This creates a false safety guarantee and misleads future readers about what's actually available.

## Findings

- `data-writer.ts:5-7`:
```ts
declare const window: any;
const fs: typeof import("fs") = typeof window.cep !== "undefined" ? require("fs") : ({} as any);
const path: typeof import("path") = typeof window.cep !== "undefined" ? require("path") : ({} as any);
```
- The type annotation `typeof import("fs")` on `{} as any` is incorrect — TypeScript believes `fs.writeFileSync` exists when it doesn't
- In the non-CEP build/test environment, any call to these stubs crashes at runtime with no diagnostic from TypeScript
- Flagged by: kieran-typescript-reviewer (CRITICAL item 3)

## Proposed Solutions

### Option 1: Guard at function boundaries, remove the fake fallback (Recommended)

Drop the conditional module assignment. Use `require("fs")` and `require("path")` directly (they exist in CEP's Node.js), and add an early-throw guard at the top of each exported function:

```ts
const fs = require("fs") as typeof import("fs");
const path = require("path") as typeof import("path");

export function writeTickerData(...) {
  if (typeof window === "undefined" || typeof window.cep === "undefined") {
    throw new Error("writeTickerData requires CEP environment");
  }
  // ...
}
```

Pros: Honest about the CEP-only contract. `require` is available in CEP's Node.js. Fails loudly outside CEP instead of silently returning `{}`.
Cons: Loses the ability to import the module in a non-CEP test environment (but that was already broken anyway).

### Option 2: Create a typed stub interface

Define a minimal typed stub that matches only the methods actually used:

```ts
interface FsLike { writeFileSync(p: string, d: string, e: string): void; readFileSync(p: string, e: string): string; mkdirSync(p: string, o?: object): void; existsSync(p: string): boolean; }
```

Assign the stub in non-CEP contexts. At least the type claim is truthful.

Pros: Allows non-CEP import without crashing.
Cons: More boilerplate; still misleads about availability.

## Recommended Action

Option 1. The functions are only meaningful in CEP; the guard makes that explicit and fail-fast.

## Technical Details

- Affected file: `examples/ticker-data/src/js/lib/data-writer.ts` lines 5-7
- PR: #5 `feature/ticker-data-cep-panel`

## Acceptance Criteria

- [ ] No `{} as any` assigned to a `typeof import(...)` type
- [ ] CEP-only contract is explicit at function boundaries (throw or early return with clear message)
- [ ] TypeScript types accurately reflect what is actually available at runtime

## Work Log

### 2026-03-25 — Identified in PR #5 code review

Flagged by kieran-typescript-reviewer as CRITICAL item 3.
