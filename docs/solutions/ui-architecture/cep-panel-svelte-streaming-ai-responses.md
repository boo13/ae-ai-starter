---
title: "CEP Panel with Svelte and Streaming AI Responses"
date: 2026-03-23
category: ui-architecture
tags:
  - cep-panel
  - svelte-5
  - streaming-responses
  - provider-adapters
  - after-effects
  - typescript
  - vite
  - extendscript-bridge
  - child-process-cli
  - ai-action-protocol
severity: informational
component: examples/ai-chat/README.md
status: verified
---

# CEP Panel with Svelte and Streaming AI Responses

The `examples/ai-chat/` panel embeds a real-time AI chat interface directly inside After Effects using CEP (Common Extensibility Platform). It connects to Claude or Codex via local CLI subprocesses, streams responses chunk-by-chunk, auto-injects AE project context, and can generate and execute temporary ExtendScript from AI responses.

This document captures the non-obvious architectural decisions and patterns for developers extending or replicating this panel.

## Architecture Overview

```
User types message
        │
        ▼
buildContext()          ← evalTS() calls to ExtendScript
        │                 queries active comp, layers, selection
        ▼
activeProvider.sendMessage(prompt, options, history)
        │
        ▼
child_process.spawn(claude --print ...)
        │                 stdin ← full prompt (system + history + user)
        │                 stdout → chunks
        ▼
onChunk(chunk)          ← fires on each OS-delivered stdout buffer
        │
        ▼
appendToMessage()       ← Svelte $state mutation → UI re-renders
        │
        ▼
parseAiActions(response)
        │
        ▼
write .session/ai-action.jsx → optionally evalTS("runScriptFile", path)
```

## Key Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| UI framework | Svelte 5 | Compiles down to vanilla JS compatible with CEP Chromium v74 |
| Language | TypeScript 5.8 strict | Type-safe ExtendScript bridge, provider interfaces |
| Bundler | Vite 6 + vite-cep-plugin | Handles dual build: panel JS + ExtendScript JSX |
| AI backends | Claude CLI, Codex CLI | Avoids storing API keys in panel; uses existing CLI auth |
| Markdown | marked + DOMPurify | Real-time rendering of streamed AI output with XSS sanitization |
| ExtendScript target | ES3 (Babel + jsxPonyfill) | Required by After Effects |

## Pattern 1: Type-Safe CEP Bridge (`evalTS`)

The bridge wraps all ExtendScript calls in JSON serialization and Promise APIs.

**`src/js/lib/utils/bolt.ts`**:
```typescript
export const evalTS = <Key extends string & keyof Scripts>(
  functionName: Key,
  ...args: ArgTypes<Scripts[Key]>
): Promise<ReturnType<Scripts[Key]>> => {
  return new Promise((resolve, reject) => {
    const formattedArgs = args.map((arg) => `${JSON.stringify(arg)}`).join(",");
    csi.evalScript(
      `try {
        var host = typeof $ !== 'undefined' ? $ : window;
        var res = host["${ns}"].${functionName}(${formattedArgs});
        JSON.stringify(res);
      } catch(e) {
        e.fileName = new File(e.fileName).fsName;
        JSON.stringify(e);
      }`,
      (res: string) => {
        const parsed = JSON.parse(res);
        if (typeof parsed.name === "string" && parsed.name.toLowerCase().includes("error")) {
          reject(parsed);
        } else {
          resolve(parsed);
        }
      }
    );
  });
};
```

**Gotchas:**
- Arguments are `JSON.stringify`'d — functions, circular refs, and DOM nodes are silently lost.
- ExtendScript errors lose their stack trace (JSON serialization is lossy). The error `.message` and `.name` are preserved but not `.stack`.
- `--mixed-context` CEP parameter is required to call `require("fs")` from Svelte components. Without it, Node.js APIs are unavailable in the browser context.
- All `evalTS` calls are effectively synchronous in ExtendScript. Long-running AE operations block the UI thread.

**ExtendScript handlers are registered in `src/jsx/index.ts`** under a namespace (`$ae`) to avoid global collisions.

## Pattern 2: Streaming via `onChunk` Callback

The provider interface uses a callback rather than a stream object to decouple delivery from rendering.

**`src/js/lib/providers/provider.ts`**:
```typescript
export interface SendMessageOptions {
  model: string;
  systemContext: string;
  imagePath?: string;
  projectRoot?: string;
  signal?: AbortSignal;       // for user cancellation
  onChunk?: (chunk: string) => void;  // fires on each stdout buffer
}
```

**Provider implementation** (`claude.ts`):
```typescript
proc.stdout.on("data", (chunk: Buffer) => {
  const text = chunk.toString();
  stdout += text;
  options.onChunk?.(text);  // real-time forward to UI
});
```

**UI accumulation** (`main.svelte`):
```typescript
let streamingIdx = -1;

onChunk: (chunk) => {
  if (streamingIdx === -1) {
    streamingIdx = addMessage("assistant", chunk);  // create message slot
  } else {
    appendToMessage(streamingIdx, chunk);           // append to existing slot
  }
}
```

**Why `--print` not `--resume`:** The Claude CLI `--resume` flag would preserve session history on the CLI side, but AE project context (comp state, layer selection) changes between calls. Using `--print` forces a fresh invocation each time so the system prompt always reflects current AE state. This means conversation "memory" is maintained by the panel (last 10 messages, 4000 chars each) — not by the CLI.

**Cancellation:** An `AbortController` is created per-send. The signal is passed to the provider, which calls `proc.kill()` on abort. Partial streamed content remains visible in the chat — the message is not removed on cancel.

**Chunk delivery is OS-dependent.** No batching or throttling is applied; chunks arrive as stdout buffers are filled. This is "real-time enough" for chat but means chunk sizes vary.

## Pattern 3: Svelte 5 Runes for Reactive State

The panel uses Svelte 5 runes (`$state`, `$derived.by`) instead of the older reactive store pattern.

**Message rendering** (`ChatMessage.svelte`):
```typescript
const renderedContent = $derived.by(() => {
  try {
    return DOMPurify.sanitize(marked.parse(content, { async: false }) as string);
  } catch {
    return DOMPurify.sanitize(content);  // fallback: plain sanitized text
  }
});
```

Rendered via `{@html renderedContent}` — Svelte's escape bypass is safe here because DOMPurify runs first. If `marked.parse()` throws on malformed markdown, the fallback prevents a rendering crash.

**Build target is `chrome74`** (the CEP-embedded Chromium version). Svelte 5 runes compile to vanilla JS that runs on v74, but you cannot use native `chrome74`-era APIs that were later deprecated or removed.

## Pattern 4: Provider Abstraction

Providers are selected at **build time** via an environment variable, not at runtime.

**`src/js/lib/provider-config.ts`**:
```typescript
// Resolved by Vite at build time via VITE_AI_CHAT_PROVIDER env var
export const activeProvider = import.meta.env.VITE_AI_CHAT_PROVIDER === "codex"
  ? codexProvider
  : claudeProvider;
```

Build commands:
```bash
npm run build:claude   # bundles with Claude provider
npm run build:codex    # bundles with Codex provider
npm run dev:claude     # dev server with Claude provider
```

Each provider discovers its CLI binary by searching known macOS paths:
- `/opt/homebrew/bin`
- `/usr/local/bin`
- `~/.nvm/versions/node/{version}/bin/` (Node 18–24 only; see gotcha below)
- `~/.local/bin`

**This panel is macOS-only.** Binary discovery does not include Windows paths.

## Pattern 5: AI Action Protocol

The panel implements a protocol for AI-generated ExtendScript execution:

1. AI responses are scanned for `<ai-action run="true">...</ai-action>` XML blocks.
2. The first matching block is extracted (additional blocks are silently ignored).
3. Script is written to `.session/ai-action.jsx` relative to the git root.
4. If `run="true"`, `evalTS("runScriptFile", path)` executes it immediately in AE.
5. The "AI Action" button in the action bar re-runs the last saved script.

**Security:** Even though `resolveAiActionPaths()` always constructs safe paths, the code validates that the resolved script path starts with the session directory:
```typescript
const resolvedScript = path.resolve(paths.scriptPath);
const resolvedDir = path.resolve(paths.actionDir);
if (!resolvedScript.startsWith(resolvedDir + path.sep)) {
  throw new Error("AI Action path is outside the session directory.");
}
```
This is defense-in-depth against future refactoring mistakes.

## Pattern 6: AE Context Building

The context builder queries AE state on every send (not cached) to ensure freshness.

**`src/js/lib/context.ts`** calls these ExtendScript functions:
- `getProjectInfo()` — project name, item count
- `getProjectRoot()` — git root of the AE project directory
- `getActiveCompInfo()` — comp dimensions, fps, duration, layer stack (first 30), selected layers

The result is assembled into a markdown-formatted system prompt that includes:
- Current AE project state
- ES3 language constraints reminder
- AI Action protocol documentation (XML format, run attribute)

This context is prepended to every `sendMessage` call, so the AI always has current comp state regardless of conversation length.

## Build Setup

Two separate Vite pipelines run in parallel:

| Pipeline | Config | Output | Format |
|----------|--------|--------|--------|
| Panel (JS/TS/Svelte) | `vite.config.ts` | `dist/cep/main/` | CommonJS (required by CEP) |
| ExtendScript | `vite.es.config.ts` | `dist/cep/jsx/index.js` | IIFE via Rollup + Babel |

**CEP manifest** is generated from `cep.config.ts` by `vite-cep-plugin`. Key parameters:
```typescript
parameters: ["--v=0", "--enable-nodejs", "--mixed-context"]
```
- `--enable-nodejs` — allows `require()` in the panel
- `--mixed-context` — puts browser and Node.js in the same JS context (required for `require("child_process")` from Svelte components)

**Development symlink:** `npm run symlink` creates a symlink from the CEP extensions folder to `dist/cep/`. Hot-reload (`npm run dev:claude`) watches Svelte components; ExtendScript changes require a separate `npm run build:jsx` or full rebuild. After Effects must be **restarted** to pick up ExtendScript changes (panel HTML hot-reloads, but `jsx/index.js` does not).

## Gotchas Reference

| Issue | Location | Impact |
|-------|----------|--------|
| Node 25+ skipped in binary discovery | `claude.ts:81` | If only Node 25+ installed, binary not found |
| `--resume` intentionally not used | `claude.ts:145` | Fresh CLI spawn each message; no persistent session |
| History truncated silently | `shared.ts:4-5` | Last 10 messages, 4000 chars each — no UI indicator |
| Multiple `<ai-action>` blocks: only first runs | `ai-action.ts:94-96` | Others silently discarded |
| Cancelled request leaves partial text | `main.svelte:147` | Truncated response visible in chat |
| ExtendScript error stacks lost | `bolt.ts:91-92` | Only `.name` and `.message` survive JSON round-trip |
| Codex output parsing format-dependent | `codex.ts:148-156` | Splits on `\nuser\n` / `\ncodex\n`; breaks if CLI format changes |
| Arrow key navigation patched for macOS only | `cep.ts:38-68` | Windows relies on Chromium native behavior |
| `dropDisable()` blocks all drag-drop | `cep.ts:74-77` | No file drag into panel inputs (global, not scoped) |

## Key File Reference

```
examples/ai-chat/
├── cep.config.ts                         extension metadata, panel dimensions, CEP params
├── vite.config.ts                        panel build (Svelte, CJS, chrome74 target)
├── vite.es.config.ts                     ExtendScript build (Rollup + Babel ES3)
├── src/js/
│   ├── main/main.svelte                  root component: message state, send/cancel, streaming
│   ├── components/
│   │   ├── ChatMessage.svelte            markdown rendering with DOMPurify
│   │   ├── ChatInput.svelte             auto-resize textarea, send/cancel buttons
│   │   └── ActionBar.svelte            quick actions: Run Analysis, Fix Error, AI Action
│   └── lib/
│       ├── providers/provider.ts         SendMessageOptions interface (onChunk, AbortSignal)
│       ├── providers/claude.ts           Claude CLI: spawn, stream, timeout, cancel
│       ├── providers/codex.ts            Codex CLI: spawn, parse, image attachment
│       ├── providers/shared.ts           prompt building, history truncation, env sanitization
│       ├── provider-config.ts            build-time provider selection
│       ├── context.ts                    AE project context builder
│       ├── ai-action.ts                  <ai-action> extraction, storage, path validation
│       ├── actions.ts                    quick action definitions
│       └── utils/bolt.ts                evalTS / evalES / listenTS CEP bridge
└── src/jsx/
    ├── index.ts                          registers $ae namespace handlers
    └── aeft/
        ├── aeft.ts                       getProjectInfo, getActiveCompInfo, runScriptFile, etc.
        └── aeft-utils.ts                 layer type detection, comp resolution
```

## Related Documentation

- `examples/ai-chat/README.md` — setup, provider configuration, development workflow
- `docs/ai-workflow.md` — how AI assistants integrate with the starter template
- `docs/solutions/logic-errors/ae-plugin-plan-review-match-names.md` — example solution doc format
- `examples/README.md` — example overview and installation instructions
