---
title: "feat: Add AE Scripting Reliability System"
type: feat
status: active
date: 2026-03-27
deepened: 2026-03-27
---

# feat: Add AE Scripting Reliability System

## Enhancement Summary

**Deepened on:** 2026-03-27
**Research agents used:** architecture-strategist, performance-oracle, security-sentinel, code-simplicity-reviewer, agent-native-reviewer, pattern-recognition-specialist, best-practices-researcher, framework-docs-researcher, spec-flow-analyzer, match-name learning, CEP bridge learning, ES3 JSON serialization research

### Key Improvements Over Original Plan

1. **API collapsed to 1 function** — `writeResult(status, step, error, comp)` replaces `createResult` + `createSnapshot` + `writeResult`. One `#include`, one concept, 10 lines of boilerplate.
2. **`last_run.json` schema defined upfront** — schema is the contract; define before implementation. Adds `_meta.scriptName` (stale detection), `userApproved` (loop end-condition), `error.line`, `snapshotMs` (performance data).
3. **Shared `prop-walker.jsxinc`** — both Layer A and Layer C walk the property tree; extract into one shared walker in `Scripts/lib/` rather than duplicating.
4. **Output location fixed** — `last_run.json` → `Scripts/runs/last_run.json` (not `Scripts/reports/`; that directory is committed to git). Add `Scripts/runs/` to `.gitignore`.
5. **4-tag provenance scheme** — `[VERIFIED]`, `[DOCS]`, `[COMMUNITY]`, `[LLM-GENERATED]` instead of binary. Match-names from live AE runtime → `[VERIFIED]`. verified/ files need a `"source"` field.
6. **Lazy verified/ loading** — read one file per effect encountered, not all 337 upfront. Per-run in-memory cache prevents re-reading.
7. **Depth varies by group type** — Transform=2, Effects=3, Shape Contents=6 (not global depth-3). Per-group property cap of 20 prevents explosion on complex shapes.
8. **Markdown sanitization** — strip `*`, `` ` ``, `#`, `[`, `]` from AE-sourced strings before `addMarkdown()` to prevent prompt injection in AI-consumed reports.
9. **No `#include` inside `.jsxinc` files** — the established codebase invariant. Dependency declared in JSDoc `@requires` only.
10. **`beginScript(scriptName)` for crash detection** — write `status: "started"` at script top; stale "started" status = crash before writeResult.

### New Considerations Discovered

- `snapshot_properties.jsxinc` already captures effect names/values but NOT `param.matchName` — add this field to existing module as part of Phase 1 (not a new file)
- Pre-comp modifications are out of scope for v1 diff tracking — must be documented in generated script comments
- Visual correctness cannot be detected by any file-based approach — the `userApproved` field and CLAUDE.md protocol covers this boundary
- `prop.value` is the correct accessor (not `getValue()` — not in official docs); use `PropertyType.PROPERTY` check, not duck-typing

---

## Overview

A layered reliability system that reduces Claude-authored AE script errors from the current multi-attempt norm to ≤2 attempts for the majority of tasks. The dominant failure mode is **silent wrong output** — scripts execute without error but produce incorrect results, with no signal back to Claude about what actually changed.

Three integrated layers address this:

| Layer | Name | Role |
|-------|------|------|
| A | Enriched Context | Prevent errors — give Claude authoritative AE ground-truth *before* writing |
| B+C | Result + Snapshot | Catch and surface errors — every script reports status and a before/after diff |

These are a progression, not alternatives: **A prevents, B+C catches and surfaces.**

## Problem Statement

The current dev loop:

```
Claude writes script → user runs in AE → user describes what went wrong → repeat
```

Claude has no feedback channel. Every correction cycle requires the user to manually translate AE behavior into words. The error spectrum:

- **Wrong property paths** — shortcuts vs. full paths, AE-version-specific behavior
- **Wrong ADBE match-names** — LLM-generated match-names are plausible but unverified
- **ES3 syntax violations** — modern JS constructs that fail silently or with cryptic errors
- **Wrong layer/comp references** — stale assumptions about what's in the project
- **Silent wrong output** — AE doesn't complain, but the result is wrong (requires a diff to surface)

## Proposed Solution

### Target Loop

```
Claude reads analysis.json (Layer A) → writes script with #include result-writer →
user runs script → script writes Scripts/runs/last_run.json (diff + status) →
Claude reads last_run.json → self-corrects with actual data → ≤2 attempts
```

### Layer A — Enriched Context

Extend `Scripts/analyze/run_analysis.jsx` with a new snapshot module that captures the **full ADBE match-name paths** Claude should write, plus provenance tags, for all layers.

**New module:** `Scripts/analyze/lib/snapshot_property_paths.jsxinc` (follows IIFE + `typeof SnapshotPropertyPaths` guard pattern)

**Also update:** `Scripts/analyze/lib/snapshot_properties.jsxinc` — add `param.matchName` to every effect parameter entry (currently captures `param.name` and `param.value` but NOT `param.matchName`).

What `snapshot_property_paths.jsxinc` captures per layer:
- Transform properties: ADBE match-name, display-name path string, current value, provenance tag
- Effects: per-effect `param.matchName` and provenance tag (cross-referenced against `Scripts/verified/`)
- Shape groups: ADBE match-names for contents at depth 6 (stroke color, fill color, shape path, line cap)
- Text: Source Text path and current value

Output added to `analysis.json` under `"propertyPaths"` key. Output added to `analysis.md` as new "### Property Paths" and "### ADBE Match-Names" sections per comp.

**Note on Layer A scope:** Walk all comps (consistent with existing modules), applying the existing `isInOldFolder` filter. The walk uses the shared `prop-walker.jsxinc` (see Architecture section).

### Layer B+C — Result + Snapshot (Merged)

**Single file:** `Scripts/lib/result-writer.jsxinc`

**Exports two public functions (bare globals, no IIFE, no `typeof` guard — consistent with `Scripts/lib/` pattern):**

```javascript
/**
 * result-writer.jsxinc
 * Writes Scripts/runs/last_run.json with execution status and before/after diff.
 * @requires io.jsxinc  (include io.jsxinc BEFORE this file in your .jsx entry point)
 * @requires prop-walker.jsxinc  (include prop-walker.jsxinc BEFORE this file)
 */

// Call ONCE at the very top of every script, before beginUndoGroup.
// Writes status: "started" immediately — detects crashes if final writeResult never runs.
// scriptName should match the .jsx filename (e.g. "fix_title.jsx").
function beginScript(scriptName, comp) { /* ... */ }

// Call ONCE at the end — in success path and in catch block.
// status: "success" | "error" | "partial"
// step: the current step variable value
// error: e.message in catch, null on success
// comp: app.project.activeItem (same reference passed to beginScript)
function writeResult(status, step, error, comp) { /* ... */ }
```

**Required pattern for every generated script:**

```javascript
// Scripts/my_script.jsx
#include "lib/io.jsxinc"
#include "lib/prop-walker.jsxinc"
#include "lib/result-writer.jsxinc"

var step = "init";
var comp = app.project.activeItem;
beginScript("my_script.jsx", comp);   // writes "started" immediately

app.beginUndoGroup("My Script");

try {
    step = "set position";
    // ... script logic ...
    writeResult("success", step, null, comp);
} catch (e) {
    writeResult("error", step, e.message, comp);
} finally {
    app.endUndoGroup();
}
```

**Why `beginScript` before `beginUndoGroup`:** If AE crashes during a long operation, `beginScript` has already written `status: "started"`. Claude reads this and knows to ask the user to re-run rather than treating stale data as success.

**Path resolution:** `$.fileName` gives the main script's path. `result-writer` walks up to find `Scripts/` directory, then writes to `Scripts/runs/last_run.json`. Guard: if `$.fileName` is empty (CEP context), show an alert and skip the write.

### CLAUDE.md Updates

Add to `AGENTS.md`:

1. **Required pattern** — every generated script must `#include "lib/io.jsxinc"`, `#include "lib/prop-walker.jsxinc"`, `#include "lib/result-writer.jsxinc"` and follow the template above
2. **Feedback protocol** — after user runs a script:
   - Read `Scripts/runs/last_run.json` using the Read tool
   - Verify `_meta.scriptName` matches the script you just wrote (stale detection)
   - If `status` is `"started"`, the script crashed before completion — ask user to re-run
   - Read `diff` entries to understand exactly what changed
   - Ask user `"Does the result look correct?"` — `status: "success"` means AE didn't error, not that the result is visually correct; user confirmation ends the loop
3. **Layer A usage** — before writing any script, read `Scripts/reports/analysis.json` for authoritative property paths; match-names tagged `[VERIFIED]` or `[DOCS]` can be trusted; `[LLM-GENERATED]` must be verified
4. **Pre-comp limitation** — changes inside nested pre-comps are NOT captured in the diff; generated scripts that modify pre-comp internals should include a comment noting this

## last_run.json Schema

Define this schema before implementing the library — it is the contract between ExtendScript and Claude.

```json
{
  "_meta": {
    "schemaVersion": 1,
    "scriptName": "my_script.jsx",
    "startedAt": "2026-03-27T21:23:00.000Z",
    "completedAt": "2026-03-27T21:23:01.042Z",
    "snapshotMs": 340,
    "aeVersion": "24.0.0",
    "analysisTimestamp": "2026-03-27T14:30:00.000Z"
  },
  "status": "started|success|error|partial",
  "error": {
    "message": "",
    "step": "",
    "line": 0,
    "fileName": ""
  },
  "warnings": [],
  "diff": [
    {
      "path": "Layer 1 > Transform > Position",
      "matchPath": "ADBE Transform Group > ADBE Position",
      "before": [960, 540],
      "after": [100, 200]
    }
  ],
  "changeCount": 2,
  "postRunLayers": [
    { "index": 1, "name": "Title" },
    { "index": 2, "name": "Background" }
  ]
}
```

**Field notes:**
- `_meta.scriptName` — enables stale detection: Claude verifies this matches the script it wrote
- `_meta.snapshotMs` — timing field for validation gate performance measurement; zero cost to add
- `_meta.analysisTimestamp` — copied from `analysis.json._meta.generated`; lets Claude detect when analysis may be stale relative to the run
- `error.line` / `error.fileName` — ExtendScript `Error` object exposes these; captures them in the catch block
- `postRunLayers` — lightweight layer-count snapshot (index + name only, no property walk); lets Claude detect if the script added/removed layers without a full re-analysis
- `diff.matchPath` — stable, locale-independent ADBE match-name path alongside the human-readable `path`

## Architecture

### Shared Property Walker

**Critical finding from architecture review:** Both `snapshot_property_paths.jsxinc` (Layer A) and `result-writer.jsxinc` (Layer B+C diff) need to walk the AE property tree. Implementing two independent walkers creates a maintenance liability where logic diverges over time.

**Solution:** Extract a single `Scripts/lib/prop-walker.jsxinc` that both layers use.

```javascript
/**
 * prop-walker.jsxinc
 * Shared property tree walker. ES3, no IIFE, bare global.
 * @param {PropertyGroup} group - The PropertyGroup to walk
 * @param {String} pathPrefix - Current human-readable path (e.g. "Layer 1")
 * @param {Number} maxDepth - Max recursion depth (use group-type-specific limits)
 * @param {Function} visitor - Called for each leaf: visitor(matchPath, displayPath, prop)
 */
function walkPropertyGroup(group, pathPrefix, maxDepth, visitor) { /* ... */ }
```

The walker uses `prop.propertyType === PropertyType.PROPERTY` to detect leaves (never duck-type `numProperties`), and `prop.matchName` as the stable key. Display names are locale-sensitive and must not be used as keys.

**Depth limits by group type** (not a global depth-3):

| Group | Match Name | Max Depth |
|-------|-----------|-----------|
| Transform | `ADBE Transform Group` | 2 |
| Effects | `ADBE Effect Parade` | 3 |
| Masks | `ADBE Mask Parade` | 3 |
| Shape Contents | `ADBE Root Vectors Group` | 6 |
| Text | `ADBE Text Properties` | 3 |
| Audio | `ADBE Audio Group` | 2 |

**Per-group property count cap:** If `group.numProperties > 20`, record `"<group:TooManyProperties:N>"` and skip children. This prevents explosion on shape layers with many keyframed paths.

**Skip always:** `ADBE Effect Built In Params` — the internal "Compositing Options" sub-group that appears on every effect; accessing it throws in some AE versions.

### Output File Location

**`Scripts/reports/`** contains committed, project-level snapshots that Claude reads for context. These are regenerated by `run_analysis.jsx` on demand.

**`Scripts/runs/last_run.json`** is ephemeral per-run output — it overwrites every run and must NOT be committed to git. Add `Scripts/runs/` to `.gitignore`.

This separation keeps `git status` clean and makes clear which files are ground truth vs. transient.

### Module Pattern Compliance

Based on the established codebase invariants:

| File | Location | Pattern |
|------|----------|---------|
| `prop-walker.jsxinc` | `Scripts/lib/` | Bare globals, no IIFE, no `typeof` guard |
| `result-writer.jsxinc` | `Scripts/lib/` | Bare globals, no IIFE, no `typeof` guard |
| `snapshot_property_paths.jsxinc` | `Scripts/analyze/lib/` | IIFE with `typeof SnapshotPropertyPaths === "undefined"` guard |

**Critical rule:** No `#include` directives inside any `.jsxinc` file — the entry-point `.jsx` owns the include chain. Dependencies are declared in JSDoc `@requires` comments only.

**Entry-point include order:**
```javascript
#include "lib/io.jsxinc"             // must be first (used by result-writer)
#include "lib/prop-walker.jsxinc"    // must precede result-writer
#include "lib/result-writer.jsxinc"  // last
```

### Recipe File

The required boilerplate template must live in `Scripts/recipes/reliability-template/` as a copy-paste recipe file — not just in AGENTS.md prose. A recipe file is versioned alongside the libraries it references and easier for Claude to locate.

## Technical Considerations

### Property Tree Walking

All property walks use `prop.propertyType` (not duck-typing) and `prop.value` (not `getValue()` — not in official AE scripting docs):

```javascript
if (prop.propertyType === PropertyType.PROPERTY) {
    // Safe to read: prop.value, prop.propertyValueType, prop.isTimeVarying
    var val;
    try { val = prop.value; } catch (e) { val = null; }
}
```

**Value serialization by `PropertyValueType`:**

| Type | Serializable? | Action |
|------|--------------|--------|
| `OneD`, `TwoD`, `ThreeD`, `COLOR` | Yes | JSON directly |
| `LAYER_INDEX`, `MASK_INDEX` | Yes (number) | JSON directly |
| `TEXT_DOCUMENT` | No | Serialize: `{ text, fontSize, font, fillColor, justification }` |
| `SHAPE` | No | Serialize: `{ vertices, inTangents, outTangents, closed }` |
| `MARKER` | No | Serialize: `{ comment, duration, chapter, url }` |
| `CUSTOM_VALUE` | No | Store `"<type:CUSTOM_VALUE>"` placeholder |
| `NO_VALUE` | — | Skip entirely |

**AE array-likes:** Some AE property values are array-like objects (not true `Array` instances). Convert before `JSON.stringify`:
```javascript
function toNativeArray(val) {
    var arr = [];
    for (var i = 0; i < val.length; i++) arr.push(val[i]);
    return arr;
}
```

**Color formats:** AE uses 3-element `[r, g, b]` for TextDocument colors and 4-element `[r, g, b, a]` for shape strokes/fills and some effects. All values are `0.0–1.0` floats. Preserve the original format — never normalize or change element count.

**ISO timestamp in ES3** — `toISOString()` is ES5 and not available in ExtendScript. Must implement manually using `getUTCFullYear()` etc.:
```javascript
function formatTimestampISO(d) {
    function pad(n, len) { var s = String(n); while (s.length < (len || 2)) s = "0" + s; return s; }
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) +
           "T" + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" +
           pad(d.getUTCSeconds()) + "." + pad(d.getUTCMilliseconds(), 3) + "Z";
}
```
Add this to `Scripts/lib/io.jsxinc` as `formatTimestampISO()` alongside the existing `formatTimestamp()`.

**Native JSON available:** AE CC 2019+ includes native `JSON.parse`/`JSON.stringify`. No polyfill needed for the CC 2019+ target.

**File read error detection:** After `file.read()`, check `file.error` — `File.read()` does not throw on read errors:
```javascript
var raw = file.read();
if (file.error) throw new Error("Read error: " + file.error);
```

### Layer A — ADBE Match-Name Path Format

Property path entries in `analysis.json` must use ADBE match-names (not display names) as the stable key, with both the match-name path and the display-name path included:

```json
{
  "matchPath": "ADBE Transform Group > ADBE Position",
  "displayPath": "Transform > Position",
  "scriptPath": "layer.property(\"ADBE Transform Group\").property(\"ADBE Position\")",
  "value": [960, 540],
  "provenance": "[DOCS]"
}
```

**Transform match-names (authoritative):**
- `ADBE Anchor Point` — anchor point
- `ADBE Position` — position (2D or 3D)
- `ADBE Scale` — scale
- `ADBE Rotate Z` — standard 2D rotation
- `ADBE Opacity` — opacity (0–100)

### Layer A — Provenance Tagging

Replace the binary `[VERIFIED]`/`[LLM-GENERATED]` scheme with a 4-tag system:

| Tag | Meaning | When to apply |
|-----|---------|---------------|
| `[VERIFIED]` | Confirmed by running in AE | Match-names read from live AE project via `prop.matchName`; verified/ files with `"source": "empirical"` |
| `[DOCS]` | In official Adobe scripting reference | Transform ADBE match-names; shape layer match-names from ae-scripting.docsforadobe.dev |
| `[COMMUNITY]` | From ae-scripting forums (include URL) | verified/ files with `"source": "community:<url>"` |
| `[LLM-GENERATED]` | Not empirically confirmed | verified/ files with `"source": "llm"` or no source field; effect property index suffixes (e.g., `ADBE Blur-0012`) not in verified/ |

**Running `run_analysis.jsx` IS the verification step** — match-names in `analysis.json` produced by walking a live AE project are `[VERIFIED]` by definition. Claude should treat these as authoritative.

**verified/ files need a `"source"` field** — add to each of the 337 JSON files: `"empirical"`, `"adobe-docs"`, `"community:<url>"`, or `"llm"`. This is what Layer A reads to assign the provenance tag.

### Layer A — Lazy verified/ Loading

**Do NOT read all 337 files upfront.** Read one file per unique effect matchName encountered in the project, with a per-run in-memory cache:

```javascript
var _verifiedCache = {};

function loadVerified(matchName, verifiedDir) {
    if (_verifiedCache[matchName] !== undefined) return _verifiedCache[matchName];
    var safeName = matchName.replace(/[^A-Za-z0-9._-]+/g, "-");
    var f = new File(verifiedDir + "/" + safeName + ".json");
    if (!f.exists) {
        _verifiedCache[matchName] = null;
        return null;
    }
    try {
        _verifiedCache[matchName] = readJsonFile(f);
    } catch (e) {
        _verifiedCache[matchName] = null;
    }
    return _verifiedCache[matchName];
}
```

A typical project has 5–20 distinct effects, not 337. This reduces file I/O from ~337 reads to ~5–20.

### Snapshot Diff (Layer B+C)

The before-snapshot and after-snapshot use `prop.matchName` as the stable key (not display name — locale-sensitive; not layer index — shifts when layers are added/removed).

**Diff path format:**
```json
{
  "path": "Layer 1 > Transform > Position",
  "matchPath": "ADBE Transform Group > ADBE Position",
  "before": [960, 540],
  "after": [100, 200]
}
```

**Layer additions/deletions** detected by comparing before/after layer name arrays (keyed by name, not index):
```json
{ "path": "Layer \"Logo\" (added at index 3)", "before": null, "after": "ShapeLayer" }
{ "path": "Layer \"Old Text\" (removed)", "before": "TextLayer", "after": null }
```

**Eager snapshot (correctness requirement):** `beginScript` must capture the before-snapshot immediately, before `app.beginUndoGroup`. If the walk were deferred to `writeResult`, the "before" state would already reflect the script's changes. This is a correctness requirement, not a performance choice.

**`writeResult` exception masking prevention:** The `writeResult` call is in try/catch, NOT in `finally`. Putting it in `finally` would mask the original exception if the file write throws (ES3 `finally` replaces pending exceptions). The pattern above (success path + catch block) prevents this.

### Security

**Markdown prompt injection risk:** `analysis.md` is consumed by Claude. Layer names, effect names, and source text from AE projects are embedded verbatim. A maliciously crafted `.aep` could embed Markdown formatting or prompt-injection payloads.

**Fix:** Sanitize all AE-sourced string values before passing to `writer.addMarkdown()`:
```javascript
function sanitizeForMarkdown(str) {
    return String(str).replace(/[*`#\[\]]/g, function(c) { return "\\" + c; });
}
```
Apply to layer names, effect names, source text values, and any user-editable AE content before inclusion in the Markdown report.

**Path traversal:** No risk — `$.fileName` is set by AE's engine, not user input, and the suffix is a hardcoded literal. Mirror the existing guard from `run_analysis.jsx:73-76`:
```javascript
var scriptFilePath = $.fileName || "";
if (!scriptFilePath) throw new Error("Unable to resolve script path. Run from AE File > Scripts.");
```

**JSON serialization:** `JSON.stringify` handles all injection escaping for the JSON output files. No additional escaping needed.

### Performance Targets

| Comp size | Expected `beginScript` + `writeResult` combined cost |
|-----------|------------------------------------------------------|
| ≤10 layers, ≤2 effects/layer | ≤200ms |
| 10–30 layers, ≤4 effects/layer | ≤500ms |
| 30–50 layers | 500ms–1,500ms (document in AGENTS.md, don't hide it) |

**`snapshotMs` field in `last_run.json`** — measure actual elapsed time inside `writeResult` and write it to `_meta.snapshotMs`. This costs nothing and provides real measurement data from the validation gate.

**Layer type gating:** Skip full property walk for camera/light/null layers — only walk Transform for these types. Detect via `instanceof`:
```javascript
var isShapeLayer = layer instanceof ShapeLayer;
var isTextLayer  = layer instanceof TextLayer;
var isCameraOrLight = layer instanceof CameraLayer || layer instanceof LightLayer;
```

**At depth truncation:** Record `"<group:HasChildren:N>"` rather than silently stopping when a group has children that would be at depth > max:
```json
{ "matchPath": "...", "value": "<group:HasChildren:8>" }
```
This gives Claude a signal that nesting was truncated rather than the property not existing.

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No active comp | `beginScript(name, null)` proceeds; `writeResult` writes `diff: []` and `warnings: ["No active comp — snapshot skipped"]` |
| `Scripts/runs/` directory missing | `writeResult` calls `ensureFolder()` from `io.jsxinc` before writing |
| `last_run.json` write failure | `writeResult` wraps write in try/catch; on failure, shows `alert("Could not write last_run.json: " + e.message)` and logs to `$.writeln`. Does NOT throw (would mask the original error). |
| AE crash mid-write (partial JSON) | Next read fails JSON parse; Claude treats this as "script crashed" and asks user to re-run. The "started" status from `beginScript` provides the correct diagnostic. |
| Layers added mid-script | Diff compares before/after by layer name — added layers appear as `before: null`; removed layers as `after: null` |
| Nested pre-comp modifications | Not captured in diff — script must include a comment: `// Note: changes to pre-comp internals are not tracked in last_run.json diff` |
| Unserializable property values | Stored as type-tagged placeholder (e.g. `"<type:TextDocument>"`) in both before and after; diff shows placeholder values |
| Property access throws | Skip that property path, add `"skipped: Layer X > Property Y (access error)"` to `warnings[]` |
| Script in subdirectory | `result-writer` checks if `reports/` exists at parent; walks up one level if not found |
| RGBA 4-element vs 3-element color | Preserve original array format from `prop.value`; diff compares element-by-element |
| `$.fileName` empty (CEP context) | Show alert: "result-writer.jsxinc requires a file path. Run via File > Scripts, not from CEP."; skip write |
| `last_run.json` is stale (scriptName mismatch) | Claude's feedback protocol: verify `_meta.scriptName` before trusting diff. If mismatch, prompt user to run the script first. |
| Status is "started" when Claude reads it | Claude's protocol: script crashed before completing. Ask user to check AE for error and re-run. |

## Acceptance Criteria

### Functional Requirements

**Layer A:**
- [ ] `snapshot_properties.jsxinc` updated to include `param.matchName` for every effect parameter entry
- [ ] `run_analysis.jsx` produces `analysis.json` with a `"propertyPaths"` section containing ADBE match-name paths, display-name paths, scripting paths, current values, and provenance tags for every layer
- [ ] `analysis.md` includes "### Property Paths" and "### ADBE Match-Names" sections per comp, with AE-sourced strings sanitized for Markdown
- [ ] Effects cross-referenced against `Scripts/verified/` using lazy per-effect loading with per-run cache
- [ ] Provenance tags use 4-tag scheme: `[VERIFIED]`, `[DOCS]`, `[COMMUNITY]`, `[LLM-GENERATED]`
- [ ] verified/ files each have a `"source"` field (`"empirical"`, `"adobe-docs"`, `"community:<url>"`, or `"llm"`) — **deferred: requires a one-time migration script across 337 files; default behavior (absent source field → `[LLM-GENERATED]`) makes this non-blocking**
- [ ] Depth limits are group-type-specific (Transform=2, Effects=3, Shape=6); per-group cap of 20 props applied
- [ ] Size-gating from existing modules (`COMP_THRESHOLD`, `LAYER_LIMIT`) applied to new walker

**Layer B+C (`result-writer.jsxinc`):**
- [ ] Exports `beginScript(scriptName, comp)` and `writeResult(status, step, error, comp)` as bare globals
- [ ] `beginScript` writes `status: "started"` to `Scripts/runs/last_run.json` before undo group opens
- [ ] `writeResult` writes the full schema (all `_meta` fields, diff, postRunLayers) on completion
- [ ] Diff uses ADBE match-name as stable key; includes `matchPath` and human-readable `path` per entry
- [ ] `error.line` and `error.fileName` captured from ExtendScript `Error` object
- [ ] `_meta.snapshotMs` measures and records actual snapshot+diff elapsed time
- [ ] Write failure shows alert, logs to `$.writeln`, does NOT throw (preserves original error)
- [ ] `Scripts/runs/` directory created by `ensureFolder()` if missing
- [ ] Path resolution uses `$.fileName` with guard for empty value; does NOT use `#include` inside the file
- [ ] Library is ES3-compatible

**Shared infrastructure:**
- [ ] `Scripts/lib/prop-walker.jsxinc` — single shared walker used by both Layer A and B+C
- [ ] `Scripts/lib/io.jsxinc` — `formatTimestampISO()` function added
- [ ] `Scripts/runs/` added to `.gitignore`
- [ ] Recipe file in `Scripts/recipes/reliability-template/` with complete boilerplate

**CLAUDE.md:**
- [ ] Required pattern documented (3 `#include` lines + `beginScript` + try/catch template)
- [ ] Feedback protocol documented: scriptName verification, stale-status handling, `userApproved` loop end-condition
- [ ] Layer A usage documented with trust hierarchy for provenance tags
- [ ] Pre-comp limitation documented with example comment for generated scripts

### Non-Functional Requirements

- [ ] `beginScript` + `writeResult` combined ≤200ms for a 10-layer comp; ≤500ms for a 30-layer comp (measured via `snapshotMs` field)
- [ ] `analysis.json` with property paths ≤500KB for a typical 30-layer project
- [ ] verified/ loading adds ≤50ms overhead (lazy loading ensures this for typical 5–20-effect projects)
- [ ] All new `.jsxinc` files AE CC 2019+ compatible (ES3 strict)
- [ ] No new NPM dependencies

### Quality Gates

- [ ] All new libraries tested via `Scripts/tests/test_*.jsx` unit test pattern
- [ ] Property path strings verified by running in AE (use `discover_effect.jsx` / `discover_shape_properties.jsx` patterns)
- [ ] Snapshot diff validated against a known AE project state (pre-change vs. post-change)
- [ ] Stale detection verified: run script A, then run script B, confirm Claude detects scriptName mismatch

## Success Metrics

- Claude gets it right in ≤2 attempts for ≥80% of scripting tasks (validated in Phase 1 gate)
- Silent wrong output surfaces as an explicit diff entry, not a verbal description
- Match-name errors are eliminated for effects in `Scripts/verified/` (provenance-tagged)
- Zero additional user steps required beyond "run script"
- Feedback loop end-condition is explicit (user verbally confirms result looks correct) rather than relying on silence

## Implementation Phases

### Phase 1 — Foundation (required)

1. **Infrastructure:** Add `formatTimestampISO()` to `io.jsxinc`; add `Scripts/runs/` to `.gitignore`

2. **Shared walker:** `Scripts/lib/prop-walker.jsxinc` — `walkPropertyGroup(group, pathPrefix, maxDepth, visitor)` with group-type-specific depth limits and per-group cap

3. **Layer A: update `snapshot_properties.jsxinc`** — add `param.matchName` to every effect parameter entry

4. **Layer A: `snapshot_property_paths.jsxinc`** — IIFE module; uses `walkPropertyGroup`; lazy verified/ loading with cache; 4-tag provenance; Markdown sanitization; size-gated

5. **Layer A: extend `run_analysis.jsx`** — register `SnapshotPropertyPaths` module in orchestration sequence

6. **Layer B+C: `result-writer.jsxinc`** — `beginScript` + `writeResult`; full schema output; eager before-snapshot in `beginScript`; diff computation in `writeResult`; `snapshotMs` measurement

7. **Recipe file:** `Scripts/recipes/reliability-template/` with complete boilerplate template

8. **CLAUDE.md (`AGENTS.md`) update** — all four sections above

**Validation gate** — run 3–5 real scripting tasks:
- Did Layer A eliminate property-path and match-name errors?
- Did Layer B+C surface silent wrong output as explicit diff entries?
- Is ≤2 attempts the norm?
- Does `snapshotMs` stay within budget for typical project sizes?

If gate passes, Phase 1 is sufficient. Proceed to Phase 2 only if the panel adds measurable value over the file-based loop.

### Phase 2 — CEP Debug Panel (optional, gated on Phase 1 validation)

Scaffold `examples/ae-debug/` using `ae-add-ui-panel` skill.

**CEP bridge patterns (from `cep-panel-svelte-streaming-ai-responses.md` learning):**

- **Inspect button** — calls `evalTS("runSnapshot")` to trigger on-demand comp snapshot; show loading state before call; wrap ExtendScript handler in step-variable diagnostic
- **Read `last_run.json`** — use `require("fs").readFileSync(path, "utf8")` directly (not through bridge); requires `--mixed-context` in CEP manifest parameters
- **Resolve file path** — call `evalTS("getProjectRoot")` once at panel init; then `path.join(projectRoot, "Scripts", "runs", "last_run.json")`
- **`__dirname` undefined** — use `decodeURI(window.__adobe_cep__.getSystemPath("extension"))` for extension-relative paths
- **Diff expansion UI** — `$state<Set<string>>` for tracking expanded rows; `$derived.by()` for formatting before/after values with JSON.parse try/catch fallback
- **Inspect results** — reload `last_run.json` via `fs.readFileSync` after ExtendScript handler completes

**CEP manifest requirements:** `["--v=0", "--enable-nodejs", "--mixed-context"]`

## Dependencies & Prerequisites

- `Scripts/lib/io.jsxinc` — already exists; `result-writer.jsxinc` depends on it (include first)
- `Scripts/analyze/lib/snapshot_comps.jsxinc` — established IIFE pattern to follow for `snapshot_property_paths.jsxinc`
- `Scripts/verify/tools/discover_shape_properties.jsx` — existing depth-6 shape walker to reference (not duplicate)
- `Scripts/verified/` — effect database; needs `"source"` field added to each of the 337 files
- No new NPM packages or build steps required

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Property walk crashes on specific layer types | Medium | High | try/catch on every `prop.value` access; skip and add to warnings |
| `Scripts/runs/` write failure | Low | High | alert to user; log to `$.writeln`; does NOT throw |
| verified/ "source" field missing (337 files) | Medium | Low | Default to `[LLM-GENERATED]` if source field absent |
| Snapshot latency exceeds 500ms budget on large comps | Medium | Medium | Group-type depth limits + per-group cap + layer-type gating; validate in gate |
| `$.fileName` empty in edge cases | Low | Medium | Guard with alert; documented in recipe file |
| Stale `last_run.json` from previous session | Low | Medium | `_meta.scriptName` verification in CLAUDE.md protocol |
| Phase 1 gate fails — new error type dominant | Medium | Medium | Add targeted Phase 1.5 fix; don't rush to Phase 2 |

## References & Research

### Internal References

- Analysis orchestrator + path resolution: `Scripts/analyze/run_analysis.jsx:73-80`
- Existing snapshot module pattern: `Scripts/analyze/lib/snapshot_comps.jsxinc` — IIFE + `capture(context)` + `{ warnings, count }` return
- Existing property snapshot (needs param.matchName addition): `Scripts/analyze/lib/snapshot_properties.jsxinc`
- File I/O utilities: `Scripts/lib/io.jsxinc` — `writeJsonFile`, `formatTimestamp`, `ensureFolder`
- Verified effect database: `Scripts/verified/effects/` (337 files — needs `"source"` field)
- Existing property walkers to reference: `Scripts/verified/tools/discover_shape_properties.jsx` (depth-6), `Scripts/verified/tools/discover_effect.jsx` (safeReadValue + ADBE Effect Built In Params skip)
- Property gotchas: `Scripts/verified/gotchas.md` — RGBA 4-element arrays, layer index shifting, setValue type mismatches
- Step-variable diagnostic pattern: `examples/ticker-data/src/jsx/builders/card.ts:59-117`
- Test pattern: `Scripts/tests/test_helpers.jsx` — `addTest` / run loop with PASS/FAIL to `$.writeln`

### AE ExtendScript API Key Facts

- `PropertyType.PROPERTY` — leaf node (has `prop.value`)
- `PropertyType.INDEXED_GROUP` / `NAMED_GROUP` — container (has `prop.numProperties`, iterate 1-based)
- `prop.value` — correct accessor (NOT `getValue()`, which is not in official docs)
- `prop.matchName` — stable, locale-independent; use as diff key
- Transform root: `layer.property("ADBE Transform Group")` — shortcuts are unreliable
- Shape contents root: `layer.property("ADBE Root Vectors Group")`
- Layer type: `instanceof TextLayer`, `instanceof ShapeLayer`, `instanceof CameraLayer`, `instanceof LightLayer`
- Skip: `ADBE Effect Built In Params` group (internal; throws in some AE versions)

### Related Solutions

- `docs/solutions/logic-errors/ae-plugin-plan-review-match-names.md` — 4-tag provenance scheme; verification script template; trust hierarchy for match-names
- `docs/solutions/ui-architecture/cep-panel-svelte-streaming-ai-responses.md` — CEP bridge (`evalTS`), `--mixed-context` requirement, `$state`/`$derived` patterns (Phase 2)
