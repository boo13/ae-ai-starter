# reliability-template

Required boilerplate for all Claude-authored AE scripts. Provides crash detection, before/after property diff, and step-level error location.

## Use When

For one-off headless scripts. For ScriptUI panels (the primary pattern), see the `runAction` wrapper in AGENTS.md instead.

## What It Provides

- **Crash detection** — `beginScript()` writes `status: "started"` before any AE work. If AE crashes, Claude reads the "started" status and knows to ask for a re-run rather than treating stale data as success.
- **Before/after diff** — `writeResult()` captures the comp's property state before and after, then writes a `diff` array to `Scripts/runs/last_run.json`.
- **Step-level error location** — the `step` variable pinpoints exactly which `setValue` call failed, eliminating the need for verbal error descriptions.

## Usage

Copy `template.jsx` to your working `Scripts/` directory, rename it, then fill in the step blocks:

```javascript
#include "lib/io.jsxinc"
#include "lib/prop-walker.jsxinc"
#include "lib/result-writer.jsxinc"

(function () {
    var step = "init";
    var comp = app.project.activeItem;
    beginScript("my_script.jsx", comp);   // write "started" immediately

    if (!comp || !(comp instanceof CompItem)) {
        writeResult("error", step, "No active composition.", null);
        return;
    }

    app.beginUndoGroup("My Script");

    try {
        step = "set position";
        comp.layer(1).property("Transform").property("Position").setValue([100, 200]);

        step = "set opacity";
        comp.layer(1).property("Transform").property("Opacity").setValue(50);

        writeResult("success", step, null, comp);
    } catch (e) {
        writeResult("error", step, e, comp);
        alert("Error at step [" + step + "]: " + e.message);
    } finally {
        app.endUndoGroup();
    }
})();
```

## Output

After the user runs the script, Claude reads `Scripts/runs/last_run.json`:

```json
{
  "status": "success",
  "scriptName": "my_script.jsx",
  "timestamp": "2026-03-27T21:23:01.042Z",
  "step": "set opacity",
  "error": null,
  "errorLine": null,
  "errorFile": null,
  "warnings": [],
  "diff": [
    {
      "path": "Title > ADBE Transform Group > ADBE Position",
      "matchPath": "Title > ADBE Transform Group > ADBE Position",
      "before": [960, 540],
      "after": [100, 200]
    }
  ],
  "changeCount": 1,
  "snapshotMs": 312
}
```

## Feedback Protocol (for Claude)

After the user runs a script:

1. Read `Scripts/runs/last_run.json`
2. Verify `scriptName` matches the script you wrote (stale detection)
3. If `status` is `"started"` — script crashed before completing; ask user to re-run
4. Read `diff` entries to understand exactly what changed
5. If `status` is `"error"` — use `step`, `error`, `errorLine` to diagnose and fix
6. If `status` is `"success"` — ask user: "Does the result look correct?" (`status: "success"` means AE didn't throw, not that the output is visually right)

## Pre-comp Limitation

Changes inside nested pre-comps are **not** captured in the diff. If your script modifies a pre-comp's internal layers, add a comment noting this so Claude knows to ask about those results separately.
