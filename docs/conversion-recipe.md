# Action Conversion Recipe

How to port a standalone After Effects script from the community into a vetted, reusable action in this library.

---

## The Action Contract

Every action must follow this contract. Deviating from it breaks the reliability layer and makes actions harder to compose.

| Rule | Why |
|------|-----|
| Signature is `actionName(comp, opts)`, `actionName(layer, opts)`, or `actionName(opts)` | Consistent call sites; caller always knows what to pass |
| **Caller owns the undo group** — no `beginUndoGroup` inside the action | Lets callers wrap multiple actions in one undo step |
| **Caller owns reliability** — no `beginScript`/`writeResult` inside the action | Panels and scripts use `runAction` wrapper; actions stay pure |
| Validate inputs, throw `Error("Action Name: reason")` on bad args | Descriptive errors surface to `last_run.json` automatically |
| Call `setStep("label")` at key sub-operations | Fine-grained diagnostics when the action crashes mid-way |
| Return a useful value (layer, count, boolean, array, object) | Callers can chain actions or inspect results |
| Private helpers use `_prefix_` convention (e.g. `_mao_` for `mark_at_out`) | Prevents name collisions across included files |
| ES3/ExtendScript only — `var`, `function`, no arrow functions, no template literals | AE's scripting engine is stuck at ECMAScript 3 |

---

## Step 1 — Read the Source Script

Before writing anything, understand the original:

- What does it operate on? (comp, selected layers, selected properties, the project?)
- What are the hardcoded values? (amounts, names, colors, flags)
- What do the UI dialogs ask for? (these become `opts` fields)
- Does it loop over selected items or all items?
- What does it produce or change?
- Are there third-party plugin dependencies?

If the script uses `app.project.activeItem`, your action takes `comp`.  
If it uses `comp.selectedLayers`, your action still takes `comp` — you access `comp.selectedLayers` inside.  
If it operates on a single layer passed in, your action takes `layer`.  
If it creates a new comp, your action takes only `opts`.

---

## Step 2 — Choose the Signature

```javascript
// Creates or modifies something in an existing comp
function actionName(comp, opts) { ... }

// Operates on a specific layer
function actionName(layer, opts) { ... }

// Creates its own comp (no existing comp needed)
function actionName(opts) { ... }
```

**Validate the first argument first:**

```javascript
function addFoo(comp, opts) {
    if (!comp || !(comp instanceof CompItem)) {
        throw new Error("Add Foo: comp must be a CompItem.");
    }
    var o = opts || {};
    // ...
}
```

```javascript
function addBar(layer, opts) {
    if (!layer) {
        throw new Error("Add Bar: layer is required.");
    }
    var o = opts || {};
    // ...
}
```

---

## Step 3 — Parameterize

Replace every hardcoded value and UI dialog with an `opts` field. Always provide a sensible default.

**Before (source script):**
```javascript
var offset = prompt("Enter offset in frames:", "10");
var randomRange = 30;
comp.layer(i).startTime -= (Math.random() * randomRange) / comp.frameRate;
```

**After (action):**
```javascript
function randomizeLayerStartTime(comp, opts) {
    var o = opts || {};
    var range = (o.rangeFrames !== undefined) ? o.rangeFrames : 30;  // frames
    var seed  = (o.seed  !== undefined)       ? o.seed  : 0;
    // ...
}
```

**Common parameterization patterns:**

| Source pattern | Action opts pattern |
|----------------|---------------------|
| `prompt("Enter name", "default")` | `opts.name \|\| "default"` |
| `var speed = 12;` (hardcoded) | `opts.speed !== undefined ? opts.speed : 12` |
| `var color = [1,0,0];` | `opts.color \|\| [1, 0, 0]` |
| `comp.selectedLayers` | `opts.layers \|\| comp.selectedLayers` (allow override) |
| Boolean flag | `opts.enabled ? true : false` |

---

## Step 4 — Strip What Doesn't Belong in an Action

Remove these from the ported code:

| Remove | Replace with |
|--------|-------------|
| `app.beginUndoGroup(...)` / `app.endUndoGroup()` | Nothing — caller owns this |
| `beginScript(...)` / `writeResult(...)` | Nothing — caller owns this |
| `alert(...)` confirmation dialogs | `throw new Error(...)` for real errors; nothing for informational |
| `prompt(...)` or custom dialog windows | `opts` fields with defaults |
| `var comp = app.project.activeItem;` | Received as first argument |
| `var layers = comp.selectedLayers;` | Use `opts.layers \|\| comp.selectedLayers` |

---

## Step 5 — Add `setStep()` Calls

Call `setStep("label")` before each meaningful sub-operation. This writes the step name to `last_run.json` so when the action crashes you know exactly where.

```javascript
function randomizeLayerStartTime(comp, opts) {
    if (!comp || !(comp instanceof CompItem)) {
        throw new Error("Randomize Layer Start Time: comp must be a CompItem.");
    }
    var o = opts || {};
    var rangeFrames = (o.rangeFrames !== undefined) ? o.rangeFrames : 30;
    var layers = o.layers || comp.selectedLayers;

    setStep("validate layers");
    if (!layers || layers.length === 0) {
        throw new Error("Randomize Layer Start Time: no layers to process.");
    }

    setStep("randomize start times");
    var count = 0;
    for (var i = 0; i < layers.length; i++) {
        var offsetSec = (Math.random() * rangeFrames) / comp.frameRate;
        layers[i].startTime -= offsetSec;
        count++;
    }

    return count;
}
```

---

## Step 6 — Write the JSDoc Header

All 8 tags are required. The indexer skips files missing `@name` or `@description`.

```javascript
/**
 * @name Randomize Layer Start Time
 * @description Applies random time offsets to layer start times within a specified frame range. Useful for stagger effects and organic timing.
 * @category layer
 * @tier block
 * @inputs comp: CompItem; opts: { rangeFrames: number (default 30, max random offset in frames), layers: AVLayer[] (default comp.selectedLayers) }
 * @outputs number — count of layers shifted
 * @whenToUse You want to break up lockstep layer timing with organic variation (intro stagger, particle-like offsets).
 * @example var count = randomizeLayerStartTime(comp, { rangeFrames: 15 });
 * @requires (none)
 */
```

**Tag reference:**

| Tag | Content |
|-----|---------|
| `@name` | Display name — title case, matches the action catalog |
| `@description` | One or two sentences. What it does + why it's useful |
| `@category` | `layer`, `effect`, `comp`, `property`, `scene`, `utility`, `render`, `marker`, `preset` |
| `@tier` | `block` for single-purpose actions; `compound` for actions that call other actions |
| `@inputs` | List each parameter with type and default. Follow existing format |
| `@outputs` | Return value type and description |
| `@whenToUse` | When should a script author reach for this vs. doing it manually |
| `@example` | One working call — copy-pasteable |
| `@requires` | Comma-separated filenames of other actions this one `#include`s (compound only) |

---

## Step 7 — Full File Template

```javascript
/**
 * @name Action Name
 * @description What it does in one or two sentences.
 * @category layer
 * @tier block
 * @inputs comp: CompItem; opts: { param: type (default value, description) }
 * @outputs ReturnType — description
 * @whenToUse When you need X and don't want to do Y manually.
 * @example var result = actionName(comp, { param: value });
 */

/**
 * Private helper description.
 * @private
 */
function _an_helperName(arg) {
    // ...
}

function actionName(comp, opts) {
    if (!comp || !(comp instanceof CompItem)) {
        throw new Error("Action Name: comp must be a CompItem.");
    }
    var o = opts || {};
    var param = (o.param !== undefined) ? o.param : defaultValue;

    setStep("describe first operation");
    // ... logic ...

    setStep("describe second operation");
    // ... logic ...

    return result;
}
```

**Private helper prefix:** use the initials of the function name, e.g.:
- `randomizeLayerStartTime` → `_rlst_`
- `makeHoldKeyframes` → `_mhk_`
- `invertSelectedKeyframes` → `_isk_`

---

## Step 8 — Register the Action

**A. Add to `index.json`**

Run `Scripts/analyze/build_actions_index.jsx` in AE. This parses the JSDoc header and adds the action to the catalog. Then add `runnerMeta` to the new entry:

```json
"runnerMeta": {
    "category": "comp",
    "params": [
        { "name": "rangeFrames", "label": "Range (frames)", "hint": "30", "type": "number", "argKey": "rangeFrames" }
    ]
}
```

`runnerMeta.category` options:
- `"comp"` — needs active CompItem (passed as first arg)
- `"layer"` — needs selected layer in active comp (passed as first arg)
- `"create"` — creates its own comp, no active comp needed (opts only)
- `"project"` — needs open project only
- `"manual"` — can't run from panel (needs File/Property/data); add a `"note"` field

`runnerMeta.params` field types: `string`, `number`, `boolean`, `color` ("r,g,b"), `size2d` ("w,h"), `nameOrIndex`, `csvIntegers`, `auto` (tries number, falls back to string)

**B. Add to `actions_runner_panel.jsx`**

Two edits:

```javascript
// 1. Add #include at the top (in dependency order)
#include "../lib/actions/layer/randomize_layer_start_time.jsxinc"

// 2. Add one line to FUNCTIONS registry
"randomizeLayerStartTime": randomizeLayerStartTime,
```

---

## Step 9 — Common Pitfalls

**Property access — always use full paths:**
```javascript
// Wrong — may return detached property in some AE versions
layer.property("Position")

// Right
layer.property("Transform").property("Position")
```

**TextDocument — set applyFill before fillColor:**
```javascript
var doc = sourceProp.value;
doc.applyFill = true;       // MUST come before fillColor
doc.fillColor = [1, 1, 1];
```

**Shape layer properties — use ADBE match names:**
```javascript
// Wrong — display names are unreliable
fill.property("Color")

// Right
fill.property("ADBE Vector Fill Color")
```

**Selected layers — returns a live array, copy it if iterating while modifying:**
```javascript
var layers = [];
var sel = comp.selectedLayers;
for (var i = 0; i < sel.length; i++) { layers.push(sel[i]); }
// now iterate `layers` safely
```

**ES3 — no let, const, arrow functions, template literals, for-of, spread:**
```javascript
// Wrong
const x = layers.map(l => l.name);
for (const layer of layers) { ... }

// Right
var x = [];
for (var i = 0; i < layers.length; i++) { x.push(layers[i].name); }
```

**Wrap risky property access in try/catch when the property may not exist:**
```javascript
try {
    layer.property("Transform").property("Opacity").setValue(100);
} catch (_) {}
```

---

## Step 10 — Worked Example

**Source script** (`Select_Text_Layers.jsx`):
```javascript
var comp = app.project.activeItem;
for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i) instanceof TextLayer) {
        comp.layer(i).selected = true;
    }
}
```

**Ported action** (`Scripts/lib/actions/layer/select_text_layers.jsxinc`):
```javascript
/**
 * @name Select Text Layers
 * @description Selects all text layers in a comp, optionally deselecting everything else first.
 * @category layer
 * @tier block
 * @inputs comp: CompItem; opts: { deselectOthers: boolean (default true) }
 * @outputs number — count of text layers selected
 * @whenToUse You need to bulk-select text layers for a batch operation (style change, export, etc.).
 * @example var count = selectTextLayers(comp);
 */
function selectTextLayers(comp, opts) {
    if (!comp || !(comp instanceof CompItem)) {
        throw new Error("Select Text Layers: comp must be a CompItem.");
    }
    var o = opts || {};
    var deselectOthers = (o.deselectOthers !== false);  // default true

    setStep("deselect others");
    if (deselectOthers) {
        for (var i = 1; i <= comp.numLayers; i++) {
            try { comp.layer(i).selected = false; } catch (_) {}
        }
    }

    setStep("select text layers");
    var count = 0;
    for (var i = 1; i <= comp.numLayers; i++) {
        if (comp.layer(i) instanceof TextLayer) {
            comp.layer(i).selected = true;
            count++;
        }
    }

    return count;
}
```

**`runnerMeta`:**
```json
{
    "category": "comp",
    "params": [
        { "name": "deselectOthers", "label": "Deselect others first", "hint": "true", "type": "boolean", "argKey": "deselectOthers" }
    ]
}
```

---

## Quick Checklist

Before committing a new action:

- [ ] Signature matches contract (`comp/layer/opts` first arg)
- [ ] Input validation at top, throws `Error("Action Name: ...")`
- [ ] `setStep()` at each key sub-operation
- [ ] No `beginUndoGroup`, `beginScript`, `writeResult`, `alert`, `prompt`
- [ ] All hardcoded values replaced with `opts` fields with defaults
- [ ] Returns a useful value
- [ ] Private helpers use `_prefix_` convention
- [ ] ES3 only (var, function keyword, classic for loops)
- [ ] JSDoc header has all 8 tags
- [ ] `build_actions_index.jsx` run in AE — action appears in catalog
- [ ] `runnerMeta` added to `index.json` entry
- [ ] `#include` added to panel (dependency order)
- [ ] One line added to panel `FUNCTIONS` registry
