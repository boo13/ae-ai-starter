# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

> If you see `{{placeholders}}` above, the user hasn't run `Scripts/setup.jsx` yet. Ask them to run it in After Effects first.

## AI Workflow

1. Read `Scripts/reports/analysis.json` (preferred) or `analysis.md` to understand the AE project — use the `propertyPaths` key for exact ADBE match-names; trust `[VERIFIED]` and `[DOCS]` tags
2. Write ScriptUI panels (primary) or headless scripts using `Scripts/lib/` helpers — see Required Reliability Pattern below
3. User runs scripts in AE via File > Scripts > Run Script File
4. Read `Scripts/runs/last_run.json` — verify `scriptName`, check `status`, read `diff` entries
5. If `status` is `"started"` — script crashed before completing; ask user to re-run
6. If `status` is `"success"` — ask user: "Does the result look correct?"
7. After AE template changes, ask user to re-run `Scripts/analyze/run_analysis.jsx`

## Required Reliability Pattern

Every ScriptUI panel and generated script MUST use `beginScript`/`writeResult` so Claude can read `Scripts/runs/last_run.json` after each action instead of requiring a verbal description.

### ScriptUI Panel (primary output)

The panel pattern hooks into the `runAction` wrapper that every panel should have. The includes go at the top; all button handlers stay unchanged:

```javascript
// Scripts/panel/my_panel.jsx
#include "../lib/helpers.jsxinc"
#include "../lib/io.jsxinc"
#include "../lib/prop-walker.jsxinc"
#include "../lib/result-writer.jsxinc"

// runAction — wrap every button's onClick with this
function runAction(label, fn) {
    var step = label;
    var compBefore = null;
    try {
        compBefore = (app.project && app.project.activeItem instanceof CompItem)
            ? app.project.activeItem : null;
    } catch (_) {}

    beginScript(label, compBefore);  // writes "started" immediately

    try {
        app.beginUndoGroup(label);
        var result = fn();
        app.endUndoGroup();

        // After create-comp actions the active item may have changed
        var compAfter = null;
        try {
            compAfter = (app.project && app.project.activeItem instanceof CompItem)
                ? app.project.activeItem : compBefore;
        } catch (_) { compAfter = compBefore; }

        writeResult("success", step, null, compAfter);
        return result;
    } catch (e) {
        try { app.endUndoGroup(); } catch (_) {}
        writeResult("error", step, e, compBefore);
        alert(label + " failed.\n\n" + e.toString());
        return null;
    }
}

// All button handlers call runAction — no changes needed there:
myBtn.onClick = function () {
    runAction("My Action", function () {
        // ... action logic ...
    });
};
```

### Headless Script (one-off, no panel)

Use only when the task doesn't belong in a panel. See `Scripts/recipes/reliability-template/`.

```javascript
// Scripts/my_script.jsx
#include "lib/io.jsxinc"
#include "lib/prop-walker.jsxinc"
#include "lib/result-writer.jsxinc"

(function () {
    var step = "init";
    var comp = app.project.activeItem;
    beginScript("my_script.jsx", comp);
    app.beginUndoGroup("My Script");
    try {
        step = "step description";
        // ... script logic ...
        writeResult("success", step, null, comp);
    } catch (e) {
        writeResult("error", step, e, comp);
        alert("Error at [" + step + "]: " + e.message);
    } finally {
        app.endUndoGroup();
    }
})();
```

**Feedback protocol — after the user clicks a panel button or runs a script:**
1. Read `Scripts/runs/last_run.json`
2. Verify `scriptName` matches the action you just triggered (stale detection)
3. If `status` is `"started"` — crashed before completing; ask user to re-run
4. If `status` is `"error"` — use `step`, `error`, `errorLine` to diagnose
5. If `status` is `"success"` — read `diff`, then ask user if the result looks correct
6. Only mark the task complete when the user confirms the result is correct

**Pre-comp limitation:** Changes inside nested pre-comps are NOT captured in the diff. Note this in any action that modifies pre-comp internals.

## ExtendScript (ES3) Language Constraints

**CRITICAL**: All scripts must be compatible with ExtendScript, which is based on ECMAScript 3.

- Use `var` for all variable declarations (no `let` or `const`)
- Use `function` keyword syntax (no arrow functions)
- Use traditional `for` loops (no `for...of`, `for...in` is limited)
- Use string concatenation with `+` (no template literals)
- Use `Array.prototype` methods explicitly or loops (limited array methods)
- No spread operator, destructuring, or modern JS features
- File I/O uses Adobe's `File` and `Folder` objects

## Scripting Patterns

- Wrap all changes in `app.beginUndoGroup("Label"); ... app.endUndoGroup()`
- Use `#include` directives to load libraries -- NOT `import` or `require`
- Access layers: `comp.layer(index)` (1-based) or `comp.layer("Name")`
- Access properties: `layer.property("Transform").property("Position")`
  - **Do not use shortcuts** like `layer.property("Position")` — they may return a detached property in some AE versions
  - **Shape layer properties** must use ADBE match names: `"ADBE Vector Stroke Color"`, `"ADBE Vector Shape"`, `"ADBE Vector Stroke Line Cap"` — display names are unreliable
- File paths: use `new File(path)` and `new Folder(path)`, not Node.js APIs

## TextDocument Rules

- **Get TextDocument from the layer**, not standalone: `var doc = layer.property("Text").property("Source Text").value;`
- Set `doc.applyFill = true` before `doc.fillColor = [r, g, b]` — AE throws otherwise
- Set `doc.justification = ParagraphJustification.LEFT_JUSTIFY` explicitly — default varies by AE version and causes text to be positioned off-canvas
- Reset anchor point to `[0,0]` after adding text layers: `layer.property("Transform").property("Anchor Point").setValue([0,0])`

## Debugging ExtendScript

- Wrap complex functions with a step variable to identify exactly which `setValue` call fails:
  `var step = "init"; try { step = "add layer"; ...; step = "set position"; ... } catch(e) { throw new Error("[step: " + step + "] " + e.message); }`

## CEP Panel Development (`examples/`)

- **`__dirname` is undefined** in CEP when the bundle loads via `<script>` tag (even with `--enable-nodejs`). Use `decodeURI(window.__adobe_cep__.getSystemPath("extension"))` for extension-relative paths.
- **Browser `fetch` blocks `Set-Cookie` response headers** (forbidden response header names). Libraries that rely on cookies (e.g. yahoo-finance2 crumb auth) must use a Node.js `https`-based fetch wrapper passed as a custom fetch option.
- Build command: `cd examples/ticker-data && npm run build`

## Project Structure

- `Scripts/analyze/` -- Project analysis system (generates reports)
- `Scripts/lib/` -- Shared ES3 utilities (including prop-walker and result-writer)
- `Scripts/recipes/` -- Automation patterns (start with reliability-template)
- `Scripts/panel/` -- ScriptUI panel (if enabled)
- `Scripts/reports/` -- Generated analysis reports (committed to git)
- `Scripts/runs/` -- Ephemeral script run output (gitignored; `last_run.json` written here)
- `Scripts/tests/` -- Unit tests (run in AE via File > Scripts)
- `Input/` -- Data files (JSON, etc.)
- `docs/` -- Workflow guides and recipe reference
- `examples/` -- Standalone example projects (social-card, etc.)

## Shared Libraries (`Scripts/lib/`)

Each library is a separate file. Include only the ones you need:

- **io.jsxinc** -- `readJsonFile(file)`, `writeJsonFile(file, data)`, `writeTextFile(file, content)`, `ensureFolder(path)`, `formatTimestamp()`, `formatTimestampISO(d)`
  - Include with `#include "lib/io.jsxinc"`
- **helpers.jsxinc** -- `setTextPropertyValue(prop, text)`, `isSupportedImageExtension(ext)`, `countWords(str)`, `safeTrim(s)`, `getNumericValue(prop)`, `findNestedPropertyByName(group, targetName)`
  - Include with `#include "lib/helpers.jsxinc"`
- **report_writer.jsxinc** -- `createReportWriter()` returns a builder with `addMarkdown`, `addSection`, `addSubsection`, `addList`, `addTable`, `setJson`, `build` methods
  - Include with `#include "lib/report_writer.jsxinc"`
- **prop-walker.jsxinc** -- `walkPropertyGroup(group, matchPrefix, displayPrefix, maxDepth, visitor)`, `getGroupMaxDepth(group)`, `serializePropertyValue(prop)` — shared property tree walker used by both analysis and result-writer
  - Include with `#include "lib/prop-walker.jsxinc"`
- **result-writer.jsxinc** -- `beginScript(scriptName, comp)`, `writeResult(status, step, error, comp)` — required reliability layer; writes `Scripts/runs/last_run.json`
  - Include with `#include "lib/result-writer.jsxinc"` (requires io.jsxinc and prop-walker.jsxinc first)

## Recipes (`Scripts/recipes/`)

Copy and adapt these patterns instead of writing from scratch:

- **reliability-template** -- Required boilerplate for every generated script (beginScript + writeResult)
  - *Use when:* Always — copy `template.jsx` as the starting point for any new script
- **repeating-elements** -- Populate N layers from a data array
  - *Use when:* You need to populate multiple similar layers from a data array (list items, cards, slides, credits)
- **image-swap** -- Import images, replace layer sources with fit/fill scaling
  - *Use when:* You need to import external images and replace layer sources with proper scaling (photo galleries, thumbnails, product shots)
- **data-timing** -- Calculate display durations from word counts
  - *Use when:* Display duration should vary based on text length (subtitle timing, auto-paced slideshows, narration sync)

Each recipe has a README with usage instructions.

## AE Project Analysis

**Prefer `Scripts/reports/analysis.json`** (machine-readable, structured) over `analysis.md`. Both are generated by `Scripts/analyze/run_analysis.jsx`.

Key JSON keys:
- `propertyPaths` — full ADBE match-name paths per layer, with provenance tags (`[VERIFIED]`, `[DOCS]`, `[COMMUNITY]`, `[LLM-GENERATED]`). Trust `[VERIFIED]` and `[DOCS]`; verify `[LLM-GENERATED]` before use.
- `properties` — Essential Properties, effect params (now including `matchName`), Source Text values
- `layers` — layer types, names, indices
- `comps` — composition dimensions, frame rates, durations

If the analysis seems out of date, ask the user to re-run `Scripts/analyze/run_analysis.jsx`.

## Main Compositions

The primary composition is **{{MAIN_COMP}}**.

{{MAIN_COMP_DETAILS}}

## After Effects Scripting Reference

- **Community Scripting Guide**: <https://ae-scripting.docsforadobe.dev/>
- **Adobe AE User Guide**: <https://helpx.adobe.com/after-effects/user-guide.html>
