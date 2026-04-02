---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, security, ticker-data, cep]
dependencies: []
---

# evalFile String Injection via Unsanitized Path

## Problem Statement

`bolt.ts` exports an `evalFile(file: string)` function that concatenates the `file` argument directly into an `evalScript` string using string concatenation. A path containing `"` or `)` characters would escape the string literal and allow injection into the executed ExtendScript. While the current call site (`initBolt`) derives the path from `csi.getSystemPath("extension")` (controlled by Adobe), the function is exported and callable by any future code that passes an untrusted argument.

## Findings

- `examples/ticker-data/src/js/lib/utils/bolt.ts:117-124`:
```ts
export const evalFile = (file: string) => {
  return evalES(
    "typeof $ !== 'undefined' ? $.evalFile(\"" + file + '") : ...',
    true
  );
};
```
- `file` is concatenated with `\"` around it — a path containing `"` terminates the string early
- The exported function has no sanitization or documentation of the constraint
- Same pattern exists in the `ai-claude` example (pre-existing, not introduced by this PR)

## Proposed Solutions

### Option 1: Use JSON.stringify for embedding (Recommended)

```ts
export const evalFile = (file: string) => {
  const safeFile = JSON.stringify(file); // produces "path" with proper escaping
  return evalES(
    `typeof $ !== 'undefined' ? $.evalFile(${safeFile}) : ...`,
    true
  );
};
```

`JSON.stringify` handles `"`, `\`, and all special characters correctly.

Pros: Minimal change, correct fix, matches how `evalTS` already serializes arguments.
Cons: None.

### Option 2: Validate path before embedding

Add an assertion that `file` contains only safe filesystem characters before concatenating.

Pros: Explicit error message for invalid paths.
Cons: Character allowlist is harder to get right than JSON.stringify; still fragile.

## Recommended Action

Option 1. Replace string concatenation with `JSON.stringify(file)` in `evalFile`. Also fix the same pattern in `ai-claude` example for consistency.

## Technical Details

- Affected file: `examples/ticker-data/src/js/lib/utils/bolt.ts` lines 117-124
- Same pattern in: `examples/ai-claude/src/js/lib/utils/bolt.ts` (pre-existing)
- PR: #5 `feature/ticker-data-cep-panel`
- Flagged by: security-sentinel

## Acceptance Criteria

- [ ] `evalFile` uses `JSON.stringify(file)` instead of bare string concatenation
- [ ] Corresponding fix applied to `ai-claude` example's `bolt.ts`

## Work Log

### 2026-03-25 — Identified in PR #5 code review

Flagged by security-sentinel. Current call site is safe (Adobe-controlled path), but the exported function's unsafe signature is a latent injection surface.
