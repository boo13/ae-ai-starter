---
title: "refactor: ai-chat security and UX improvements"
type: refactor
status: completed
date: 2026-03-23
---

# refactor: ai-chat security and UX improvements

## Overview

Address eleven issues identified in the `examples/ai-chat` code review, spanning security hardening, UX improvements (cancel, streaming), conversation history quality, platform documentation, and minor Svelte/TypeScript correctness fixes.

One review item (#11, `.session/` missing from `.gitignore`) is already resolved — line 9 of `.gitignore` already contains `.session`. No action needed.

---

## Problem Statement

The `examples/ai-chat` CEP panel works well but has rough edges:

- **Security**: `runScriptFile` in `aeft.ts:95-111` accepts arbitrary paths; only the call site in `ai-action.ts` is safe today. `parseAiActionResponse` extracts and executes script content with no validation.
- **UX**: No way to cancel a spawned process. Claude Opus requests can take 5 minutes with no escape except timeout.
- **History quality**: `MAX_MSG_LENGTH = 500` in `shared.ts:4` truncates code blocks mid-syntax, degrading multi-turn usefulness.
- **Streaming**: All responses are buffered before display. A spinner for 5 minutes is poor UX.
- **Platform**: `findClaudePath()` / `findCodexPath()` only know macOS paths; README doesn't say macOS-only.
- **Minor**: `$derived` function syntax in `ChatMessage.svelte`, hardcoded model list, undocumented Node ≥25 skip, `as any` casts in `main.svelte`.

---

## Implementation Phases

### Phase 1 — Security (no interface changes)

**Scope**: Harden the script execution path without touching `ProviderDefinition`.

#### 1a. Validate runScriptFile at the call site

The spec-flow analysis revealed a constraint: `runScriptFile` is used by both `runAiAction` (`.session/ai-action.jsx`) and `runAnalysisScript` (`Scripts/analyze/run_analysis.jsx`). Applying a guard inside the ExtendScript function would break analysis. The correct fix is at the call site in `ai-action.ts`.

**File**: `src/js/lib/ai-action.ts`

```typescript
// ai-action.ts — runAiAction()
// Before calling evalTS, verify the resolved path is inside the .session/ directory
export async function runAiAction(projectRoot: string): Promise<...> {
  const paths = resolveAiActionPaths(projectRoot);
  if (!paths) throw new Error("AI Action storage could not be resolved");

  const { actionDir, actionFile } = paths;
  const resolvedPath = path.resolve(actionFile);
  const resolvedDir = path.resolve(actionDir);

  // Guard: path must be inside .session/
  if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
    throw new Error("AI Action path is outside the session directory");
  }

  // ... existing evalTS call
}
```

#### 1b. Log script content before execution

Add a `console.log` of the script content (capped at 500 chars) before writing to disk. This is an audit trail in the CEP developer console, not a security block — it satisfies the review's minimum bar of "at minimum logging what's about to execute."

**File**: `src/js/lib/ai-action.ts` — `saveAiAction()`

#### 1c. Handle multiple `<ai-action>` blocks gracefully

Replace the single-match regex with a global match. If more than one block is found, execute the first (as today) and surface a warning system message: "Multiple AI Action blocks found — only the first was applied."

**File**: `src/js/lib/ai-action.ts` — `parseAiActionResponse()`

```typescript
// Replace: /<ai-action(?:\s+run="(true|false)")?>([\s\S]*?)<\/ai-action>/i
// With global flag:
const AI_ACTION_REGEX = /<ai-action(?:\s+run="(true|false)")?>([\s\S]*?)<\/ai-action>/gi;
```

---

### Phase 2 — Interface revision: Cancel + Streaming (together)

Cancel and streaming both require changes to `ProviderDefinition.sendMessage`. Design them together to avoid two sequential breaking changes.

**Decision**: Use `AbortSignal` for cancel (minimal interface change, standard Web API) and an `onChunk` callback for streaming (avoids changing the return type, simpler than AsyncIterable in the CEP environment).

#### 2a. Update `ProviderDefinition` interface

**File**: `src/js/lib/providers/provider.ts`

```typescript
export interface SendMessageOptions {
  context: string;
  imagePath?: string;
  signal?: AbortSignal;       // NEW: cancel support
  onChunk?: (chunk: string) => void;  // NEW: streaming support
}
```

`sendMessage` return type stays `Promise<ProviderResult>` — `onChunk` delivers incremental text, the resolved value is the final complete result (for history storage).

#### 2b. Add cancel button to `main.svelte`

**File**: `src/js/main/main.svelte`

```typescript
let abortController: AbortController | null = $state(null);

async function handleSend() {
  abortController = new AbortController();
  // ... pass abortController.signal to provider
}

function handleCancel() {
  abortController?.abort();
  abortController = null;
}
```

Show a "Cancel" button (replacing Send) when `isLoading` is true.

#### 2c. Implement cancel in `claude.ts`

**File**: `src/js/lib/providers/claude.ts` — `sendClaudeMessage()`

```typescript
// Wire AbortSignal to proc.kill()
options.signal?.addEventListener("abort", () => {
  proc.kill();
  reject(new Error("Cancelled"));
});
```

#### 2d. Implement streaming in `claude.ts`

Remove `--print` flag and parse stdout incrementally. Claude CLI without `--print` streams tokens to stdout in real time.

**File**: `src/js/lib/providers/claude.ts`

```typescript
// Remove: args.push("--print")
// Add stdout streaming:
proc.stdout.on("data", (chunk: Buffer) => {
  const text = chunk.toString();
  fullText += text;
  options.onChunk?.(text);
});
```

Update `main.svelte` to append chunks to the last assistant message using a streaming placeholder approach:

```typescript
// In handleSend, after provider call starts:
let streamingMessageId = addMessage("assistant", "");
provider.sendMessage(prompt, {
  ...options,
  onChunk: (chunk) => updateMessage(streamingMessageId, chunk)
});
```

This requires adding `updateMessage(id, chunk)` to the message state helpers.

> **Note on Codex**: Codex CLI output uses sentinel-delimited framing (`\nuser\n`, `\ncodex\n`) that makes incremental streaming harder to parse. Implement streaming for Claude only in Phase 2; Codex can remain buffered (it already has much shorter latency for most models).

#### 2e. Implement cancel in `codex.ts`

Wire `AbortSignal` to `proc.kill()` as in claude.ts. No streaming needed.

---

### Phase 3 — Conversation history

#### 3a. Raise message truncation limit

**File**: `src/js/lib/providers/shared.ts`

`MAX_MSG_LENGTH = 500` is too aggressive — a single line of ExtendScript can exceed this. Raise to `4000` (approximately 1000 tokens), which preserves most code blocks while still providing an upper bound.

```typescript
// shared.ts:4
const MAX_MSG_LENGTH = 4000; // was 500
```

#### 3b. Decide on `--resume` (document the decision)

The spec-flow analysis identified that `--resume` would require significant changes to session lifecycle (how context is injected, what happens on panel close). For now, **document the current approach** rather than implementing `--resume`:

Add a comment in `claude.ts:sendClaudeMessage()` explaining why `--print` is used instead of `--resume`: the system context (AE project state) must be injected fresh every call because it may change between messages (layers added, comp switched, etc.). A `--resume` session would receive the system context only on the first call. This is a known trade-off.

If `--resume` is revisited in future, the approach would be: start a session with system context only, then `--resume` for subsequent turns. This would require storing session IDs across calls.

---

### Phase 4 — Platform, docs, minor fixes

These are independent and can be done in any order.

#### 4a. Document macOS-only limitation in README

**File**: `examples/ai-chat/README.md`

Add a "Requirements" or "Platform Support" section near the top:

```markdown
**Platform**: macOS only. Windows support is not implemented — binary discovery
(`findClaudePath`, `findCodexPath`) only searches macOS/Linux paths.
```

#### 4b. Document Node ≥25 skip

**File**: `src/js/lib/providers/claude.ts:79`

Add a comment explaining why versions >= 25 are skipped:

```typescript
// Skip Node >= 25: CEP's embedded Chromium (v74 era) has known incompatibilities
// with native modules compiled against Node 25+ ABI. Conservative guard.
```

(If the actual reason differs, update accordingly before merging.)

#### 4c. Fix `$derived` usage in `ChatMessage.svelte`

**File**: `src/js/components/ChatMessage.svelte:19-41`

Replace `$derived(() => { ... })` (creates a derived function) with `$derived.by(() => { ... })` (creates a derived value from a multi-statement block):

```svelte
// Before:
const timeStr = $derived(() => { ... });
// In template: {timeStr()}

// After:
const timeStr = $derived.by(() => { ... });
// In template: {timeStr}
```

Apply to `timeStr`, `renderedContent`, and `metaStr`.

#### 4d. Type the ExtendScript bridge returns in `main.svelte`

**File**: `src/js/main/main.svelte`

The `aeft.ts` functions already return typed objects. Replace `as any` casts with proper types:

```typescript
// Before:
const result = await evalTS("getActiveCompInfo");
if ((result as any).error) { ... }

// After: evalTS return type should be inferred or cast to the known return type
const result = await evalTS("getActiveCompInfo") as Awaited<ReturnType<typeof getActiveCompInfo>>;
if (result.error) { ... }
```

If `evalTS`'s generic typing makes this awkward, at minimum replace `as any` with the specific return interface from `aeft.ts`.

#### 4e. Make model list configurable

**File**: `src/js/lib/providers/claude.ts:230-233`

Move the model list to a configuration array that can be extended without touching provider logic:

```typescript
// claude.ts
export const claudeModels: ProviderModel[] = [
  { id: "haiku", label: "Claude Haiku" },
  { id: "sonnet", label: "Claude Sonnet" },
  { id: "opus", label: "Claude Opus" },
];
```

---

## Design Decisions

| Question | Decision | Rationale |
|---|---|---|
| runScriptFile guard location | Call site in `ai-action.ts`, not ExtendScript | `runScriptFile` is also used by `runAnalysisScript` with a different path |
| Cancel architecture | AbortSignal in SendMessageOptions | Standard Web API, minimal interface change, same pattern for all providers |
| Streaming return type | `onChunk` callback, Promise resolves to final text | Avoids breaking return type; simpler than AsyncIterable in CEP env |
| Streaming: Codex | Buffered (no streaming) | Sentinel-delimited format makes incremental parsing complex; Codex latency is lower |
| History: `--resume` | Document trade-off, keep `--print` | AE context must be injected fresh every call; `--resume` incompatible with per-call system context |
| .gitignore (#11) | Already resolved | `.session` is on line 9 of `.gitignore` |

---

## Acceptance Criteria

### Security
- [x] `runAiAction` validates resolved path starts with resolved `.session/` dir before calling `evalTS("runScriptFile", ...)`
- [x] Script content is logged to console before write/execution
- [x] Multiple `<ai-action>` blocks produce a warning system message; only first is executed

### Cancel
- [x] A "Cancel" button is visible (replacing Send) while `isLoading` is true
- [x] Clicking Cancel kills the spawned CLI process and resets `isLoading` to false
- [x] Cancel works for both Claude and Codex providers
- [x] Timeout kill path still works independently of cancel

### Streaming
- [x] Claude responses appear incrementally in the chat as tokens arrive
- [x] Streaming does not block history storage (full response still stored on resolve)
- [x] Codex continues to work in buffered mode (no regression)

### History
- [x] `MAX_MSG_LENGTH` raised to 4000 (or removed with a sensible cap)
- [x] Code blocks in history are no longer silently truncated mid-syntax for typical ExtendScript snippets

### Svelte / TypeScript
- [x] `$derived.by()` used for all multi-statement derived blocks in `ChatMessage.svelte`
- [x] No `as any` casts remain in `main.svelte` for ExtendScript bridge returns
- [x] `claudeProvider.models` includes haiku, sonnet, opus (at minimum)

### Docs / Platform
- [x] README documents macOS-only limitation
- [x] `findPreferredNodeDir` ≥25 skip has an explanatory comment

---

## Dependencies

- Phase 2 depends on Phase 1 (interface must be stable before streaming/cancel implementation)
- Phase 3 and Phase 4 are independent of each other and of Phase 2 (can be parallelized)
- No changes to the ExtendScript (`src/jsx/`) side except potentially Phase 1 (no change needed given call-site guard approach)

---

## References

### Internal Files

- `src/js/lib/ai-action.ts:78-97` — `parseAiActionResponse`, single-block regex
- `src/js/lib/ai-action.ts:163-174` — `runAiAction`, call site for path guard
- `src/jsx/aeft/aeft.ts:95-111` — `runScriptFile`, ExtendScript function (no change needed)
- `src/jsx/aeft/aeft.ts:73-93` — `runAnalysisScript`, the other caller of $.evalFile
- `src/js/lib/providers/provider.ts` — `ProviderDefinition`, `SendMessageOptions` interfaces
- `src/js/lib/providers/shared.ts:4-5` — `MAX_HISTORY`, `MAX_MSG_LENGTH` constants
- `src/js/lib/providers/claude.ts:18-50` — `findClaudePath`, macOS paths
- `src/js/lib/providers/claude.ts:79` — Node ≥25 skip
- `src/js/lib/providers/claude.ts:119-225` — `sendClaudeMessage`, process spawn
- `src/js/components/ChatMessage.svelte:19-41` — `$derived` function syntax
- `src/js/main/main.svelte` — `as any` casts, UI orchestration
- `.gitignore:9` — `.session` already present (item #11 closed)

### External
- [Svelte 5 $derived.by() docs](https://svelte.dev/docs/svelte/$derived)
- [AbortSignal API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
- [Claude CLI --print flag](https://docs.anthropic.com/en/docs/claude-code/cli-reference)
