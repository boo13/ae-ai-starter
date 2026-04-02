---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, security, architecture, ticker-data, windows]
dependencies: []
---

# File Path Construction: Windows-Breaking Inconsistency + Path Traversal Risk

## Problem Statement

The data file path (`Input/ticker_data.json`) is constructed in three separate places using two different methods. `main.svelte` uses string concatenation with a forward-slash literal, while `data-writer.ts` uses `path.join`. On Windows, `projectRoot` contains backslashes — the string concatenation in `main.svelte` produces a mixed-separator path that breaks the File object in ExtendScript. Additionally, `projectRoot` (sourced from AE via `evalTS`) is never validated, allowing a crafted project path containing `../` to traverse outside the intended `Input/` directory.

This is a silent failure on Windows that will not appear during macOS development.

## Findings

- `main.svelte:160` — `const filePath = projectRoot + "/Input/ticker_data.json"` (string concat)
- `main.svelte:186` — same string concatenation pattern repeated
- `data-writer.ts:25` — `path.join(inputDir, "ticker_data.json")` (correct)
- `data-writer.ts:32` — `path.join(projectRoot, "Input", "ticker_data.json")` (correct)
- `path.join` normalizes separators but does NOT strip `..` segments — `path.join("/foo/../../etc", "Input")` resolves to `/etc/Input`
- No validation that `resolved inputDir` is a subdirectory of `projectRoot`
- Three separate files each independently encode `"ticker_data.json"` and `"Input"` with no shared constant

## Proposed Solutions

### Option 1: Export a helper from data-writer.ts (Recommended)

Add `export function getDataFilePath(projectRoot: string): string` to `data-writer.ts` that uses `path.join` and validates the result stays under `projectRoot`. Have both `main.svelte` call sites use this helper.

```ts
// data-writer.ts
export function getDataFilePath(projectRoot: string): string {
  const filePath = path.join(projectRoot, "Input", "ticker_data.json");
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(projectRoot))) {
    throw new Error("Path traversal detected in project root");
  }
  return filePath;
}
```

Pros: Single source of truth, fixes Windows separators, adds traversal guard, minimal change surface.
Cons: Adds one exported function.

### Option 2: Move path construction entirely into data-writer.ts

Have `main.svelte` never construct the path — only pass `projectRoot` to `writeTickerData` / `readCachedData`, which return the resolved path alongside their result.

Pros: Stronger encapsulation.
Cons: Larger interface change, affects more call sites.

### Option 3: Add a module-level constant

```ts
// data-writer.ts
const DATA_FILE_RELATIVE = path.join("Input", "ticker_data.json");
```

Import and reuse in `main.svelte` via `path.join(projectRoot, DATA_FILE_RELATIVE)`. Still requires `main.svelte` to use `path.join` instead of string concatenation.

Pros: Very small change.
Cons: Doesn't add the traversal guard.

## Recommended Action

Option 1. Add `getDataFilePath(projectRoot)` with traversal guard to `data-writer.ts`, update both `main.svelte` call sites to use it.

## Technical Details

- Affected files: `examples/ticker-data/src/js/main/main.svelte` (lines 160, 186), `examples/ticker-data/src/js/lib/data-writer.ts` (lines 25, 32)
- PR: #5 `feature/ticker-data-cep-panel`
- Flagged by: security-sentinel (path traversal), architecture-strategist (Windows separators)

## Acceptance Criteria

- [ ] Single `getDataFilePath(projectRoot)` helper in `data-writer.ts` with path traversal validation
- [ ] `main.svelte` lines 160 and 186 use the helper instead of string concatenation
- [ ] No bare `"/Input/ticker_data.json"` string literals outside `data-writer.ts`
- [ ] Traversal guard throws on malformed `projectRoot`

## Work Log

### 2026-03-25 — Identified in PR #5 code review

Flagged independently by security-sentinel (path traversal) and architecture-strategist (Windows path separators). Combined into one finding since root cause and fix are the same.
