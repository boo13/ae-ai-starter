# Scripts/lib/actions/

Vetted, callable actions for After Effects automation. Each file is a `.jsxinc` that exposes one function (or occasionally a small group) following the **action contract**. LLMs and panel buttons use these instead of authoring the same logic from scratch.

## Directory structure

```
Scripts/lib/actions/
  index.json          generated catalog — read this before writing scripts
  README.md           this file

  comp/               Composition-level operations (create comp, add guides)
  effects/            Visual effects applied as adjustment layers (grain, flicker, glow, etc.)
  layer/              Individual layer creation and manipulation (footage import, shape layers)
  marker/             Timeline markers and beat grids
  render/             Render queue and output operations
  scene/              Multi-layer scene building blocks (backdrop, title stack, camera rig)
  utility/            Data processing and non-AE helpers
  presets/            Compound actions composing multiple blocks into curated looks or scenes
```

## Two tiers

**Block** (`@tier block`) — Standalone action. Does one thing. No dependencies on other actions. The atoms.

**Compound** (`@tier compound`) — Thin orchestration calling two or more blocks. Lives in `presets/`. Declares its dependencies via `@requires`. The function body is pure glue code.

LLM selection heuristic:
- User wants a specific effect → use a block
- User wants a complete look or scene → use a compound
- User wants to customize → read the compound's `requires` array, call the blocks individually with custom opts

## Quick start — using an action

```javascript
// In a headless script or panel button:
#include "lib/helpers.jsxinc"               // required if action uses setTextDocValue
#include "lib/io.jsxinc"                    // required by result-writer
#include "lib/prop-walker.jsxinc"           // required by result-writer
#include "lib/result-writer.jsxinc"         // required for beginScript / writeResult / setStep

#include "lib/actions/scene/backdrop.jsxinc"

// Wrap in runAction (panel) or beginScript/writeResult (headless):
runAction("Add backdrop", function () {
    addBackdrop(comp);
});
```

For panels, the `runAction` wrapper (already in every panel) handles `beginScript`, `writeResult`, and the undo group. Actions never call those directly.

For headless scripts, use the `reliability-template` recipe and call actions inside its `try` block.

## Action contract

Every action file:

1. **Signature**: `actionName(comp, opts)` where `comp` is a `CompItem`. Actions that create a comp use `actionName(opts)` (no `comp` arg).
2. **No undo group**: caller wraps with `app.beginUndoGroup`/`endUndoGroup` via `runAction`.
3. **No reliability writes**: caller calls `beginScript`/`writeResult`.
4. **May call `setStep("label")`** at key sub-operations for fine-grained diagnostics.
5. **Validates inputs on entry** — throws an `Error("Action Name: ...")` on bad input.
6. **Returns a useful value** — the created layer(s), count, new comp, etc.
7. **ES3/ExtendScript-clean** — `var` only, no arrow functions, no template literals.

## Discovering actions (for LLMs)

Read `Scripts/lib/actions/index.json`:

1. Scan the `categories` object at the top to identify relevant categories
2. Read `whenToUse` for actions in those categories
3. Check `tier`: prefer `"compound"` for complete looks, `"block"` for individual effects
4. Check `requires`: a compound's block dependencies — call these individually for custom control
5. Check `pluginDeps`: non-`ADBE` entries are third-party plugins

## Adding a new action

### Block action

1. Create `Scripts/lib/actions/<category>/my_action.jsxinc`
2. Add the JSDoc header (all fields required):

```javascript
/**
 * @name Human-Readable Name
 * @description One-line description of what it does.
 * @category effect|scene|layer|comp|marker|render|utility
 * @tier block
 * @inputs comp: CompItem; opts: { field: type, ... }
 * @outputs ReturnType — description
 * @whenToUse One-line disambiguation for the LLM.
 * @example functionName(comp, { field: value });
 * @pluginDeps ADBE MatchName, ThirdPartyName  (omit if only standard AE)
 */
function myActionName(comp, opts) {
    if (!comp || !(comp instanceof CompItem)) {
        throw new Error("My Action Name: comp must be a CompItem.");
    }
    // ...
}
```

3. Implement following the action contract above.
4. Run `Scripts/analyze/build_actions_index.jsx` to regenerate `index.json`.
5. Commit both the new `.jsxinc` and the updated `index.json`.

### Compound action

1. Create `Scripts/lib/actions/presets/my_preset.jsxinc`
2. Add the JSDoc header with `@tier compound` and `@requires`:

```javascript
/**
 * @name My Preset
 * @description Combines block_a + block_b into a curated look.
 * @category preset
 * @tier compound
 * @inputs comp: CompItem; opts: { }
 * @outputs Object — { layerA, layerB }
 * @whenToUse You want the full curated look without choosing individual effects.
 * @example var layers = myPreset(comp);
 * @requires block_a.jsxinc, block_b.jsxinc
 * @pluginDeps (union of all block pluginDeps)
 */
function myPreset(comp, opts) {
    if (!comp || !(comp instanceof CompItem)) {
        throw new Error("My Preset: comp must be a CompItem.");
    }
    return {
        layerA: addBlockA(comp),
        layerB: addBlockB(comp)
    };
}
```

3. The caller must `#include` all files in `@requires` before including the compound.
4. Run `Scripts/analyze/build_actions_index.jsx` to regenerate `index.json`.

## JSDoc tag reference

| Tag | Required | Description |
|-----|----------|-------------|
| `@name` | Yes | Human-readable display name |
| `@description` | Yes | One-line description |
| `@category` | Yes | `comp`, `effect`, `layer`, `marker`, `preset`, `render`, `scene`, `utility` |
| `@tier` | Yes | `block` or `compound` |
| `@inputs` | Yes | Parameter types and defaults |
| `@outputs` | Yes | Return type and description |
| `@whenToUse` | Yes | One-line LLM disambiguation |
| `@example` | Yes | Minimal usage example |
| `@requires` | For compounds | Comma-separated filenames of block dependencies |
| `@pluginDeps` | Recommended | Comma-separated AE effect matchNames (flag non-ADBE ones) |
| `@note` | Optional | Caveats, limitations, version requirements |

## Available actions

See `index.json` for the current machine-readable list.
