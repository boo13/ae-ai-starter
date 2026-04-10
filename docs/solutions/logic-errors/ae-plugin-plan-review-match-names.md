---
title: "After Effects Audio Spectrum Plugin — Technical Plan Review"
date: 2026-03-13
category: logic-errors
tags:
  - after-effects
  - extendscript
  - match-names
  - audio-spectrum
  - expressions
  - plan-review
severity: medium
component: docs/plans/2026-03-12-feat-audio-spectrum-plugin.md
symptoms:
  - Missing match-name strings for Rectangle Size, Fill Color, Thickness
  - sampleImage() radius parameter wastefully large
  - Audio Layer property set with name string instead of integer index
  - No distinction between ExtendScript engine (.jsx) and JavaScript expression engine
  - Missing explicit property paths for Scale expression and Fill Color expression injection
root_cause: "Plan authored by LLM from pattern knowledge before the repo had a committed verified-data workflow; match-names, API calling conventions, and engine distinctions needed empirical AE validation"
status: historically-useful-partially-outdated
---

## Problem

An implementation plan for an After Effects Audio Spectrum plugin (`ae-ai-starter/docs/plans/2026-03-12-feat-audio-spectrum-plugin.md`) contained 8 categories of unverified or incorrect technical claims. The plan uses ExtendScript to procedurally generate expression-driven audio spectrum visualizers by:

- Using the stock Audio Spectrum effect on a hidden data layer
- Applying Mosaic effect to create solid-color frequency blocks
- Sampling those blocks via `sampleImage()` expressions on per-bar shape layers

Any single match-name index error would cause the script to **silently set the wrong property** — no error thrown, just wrong behavior.

## Investigation

Each of the 8 flagged categories was researched against Adobe documentation, NLM notebook sources, and known AE scripting patterns. At the time, several items still required empirical AE verification. Since then, this repo has added committed verified effect/property data under `Scripts/verified/`, so parts of this write-up are now historical rather than current process guidance.

### Items Investigated

| # | Item | Verdict |
|---|------|---------|
| 1 | Match-name index numbers | **Now verified in repo** — see `Scripts/verified/effects/` and `Scripts/verified/properties/` |
| 2 | Frequency band distribution | **Uncertain** — likely linear (FFT), needs empirical test |
| 3 | sampleImage() radius parameter | **Fixed** — `[1, 1]` is sufficient for Mosaic blocks |
| 4 | Thickness property & Digital mode | **Fixed** — added match-name, documented gap caveat |
| 5 | hslToRgb() argument format | **Confirmed** — single `[H, S, L, A]` array, all 0–1 |
| 6 | Fill Color expression path | **Fixed** — added `"ADBE Vector Fill Color"` match-name |
| 7 | Guide layer + sampleImage() | **Confirmed** — internal pixel buffer computed regardless of guide status |
| 8 | Expression engine vs ExtendScript | **Confirmed** — .jsx = ES3, expressions = ES6+ (since CC 2019) |

## Root Causes Found

1. **Missing match-name strings.** The plan referenced match-name patterns but omitted `"ADBE Vector Rect Size"`, `"ADBE Vector Fill Color"`, and `"ADBE Audio Spectrum-0012"` (Thickness). Code used these properties without naming them.

2. **sampleImage() radius was oversized.** Expressions used `[1, dl.height * 0.45]` as radius. Since Mosaic with Sharp Colors produces uniform solid-color blocks, `[1, 1]` (single pixel) is sufficient and faster.

3. **Audio Layer property type mismatch.** The Audio Spectrum's Audio Layer property expects an integer layer index, not a name. The plan didn't show the lookup code.

4. **Expression engine confusion.** The plan applied ES3 constraints uniformly without clarifying that `.jsx` scripts (ExtendScript, ES3) and expressions (JavaScript engine, ES6+) run in different engines.

5. **Missing explicit property paths.** Scale expression injection and Fill Color expression injection lacked the match-name chains needed to actually set them.

6. **Performance undocumented.** 64 bars + 64 peak markers = 128 `sampleImage()` calls per frame — a meaningful preview performance concern.

## Fixes Applied

13 targeted edits to the plan file:

1. **sampleImage radius** — `[1, dl.height * 0.45]` → `[1, 1]` in all expression templates (Scale, Peak)
2. **Rectangle Size match-name** — Added `"ADBE Vector Rect Size"` to reference table and inline code
3. **Fill Color match-name** — Added `"ADBE Vector Fill Color"` to reference table and inline code
4. **Thickness match-name** — Added `"ADBE Audio Spectrum-0012"` plus `-0011` (Offset) and `-0013` (Softness)
5. **Audio Layer index lookup** — Added explicit code: `comp.layer(config.AUDIO_LAYER_NAME).index`
6. **Digital mode gap caveat** — Documented that Digital bars may have gaps affecting Mosaic brightness
7. **Fill Color expression injection** — Added `fill.property("ADBE Vector Fill Color").expression = ...`
8. **Scale expression property path** — Added `layer.property("ADBE Transform Group").property("ADBE Scale").expression = ...`
9. **Guide layer clarification** — Documented internal pixel buffer behavior, precompose safety
10. **Two-engine distinction** — Split ES3 Constraints into ExtendScript (.jsx) vs JavaScript (expressions)
11. **Performance guidance** — Recommended 32–64 bars, documented 128 calls/frame at max
12. **Unverified Assumptions rewrite** — Split into resolved (5), still-unverified (3), new risks (2)
13. **Architecture diagram** — Updated guide layer and Mosaic descriptions

## Still Unverified (Requires AE Testing)

1. **Frequency band distribution** — Apply Audio Spectrum with 8 bands, play known-frequency tones, observe which band lights up to confirm linear distribution.
2. **Digital mode gap pixels** — Check visually whether Thickness exactly fills each band or leaves small gaps.
3. **Gradient fill write format** — Shape-layer gradient match-names are now verified in `Scripts/verified/properties/shape-layer.json`, but this note still does not prove the exact scripting payload needed for multi-stop gradient colors.

## Prevention Strategies

### The Core Pattern

LLM-generated After Effects technical details (especially match-name strings) are **plausible but unreliable**. They follow the right conventions but specific index numbers are frequently wrong. The failure mode is silent — wrong property set, no error thrown.

### Current Repo Workflow

This repo now has a better default workflow than the ad hoc verification script below:

- Check `Scripts/verified/` first for committed effect/property JSON.
- Use `Scripts/reports/analysis.json` and its `propertyPaths` entries for project-specific property paths and provenance tags.
- Only write a new discovery script when the effect/property is missing from `Scripts/verified/` or when runtime behavior still needs confirmation.

The older one-off verification script pattern is still useful as a fallback:

```jsx
(function verifyMatchNames() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) { alert("Select a composition."); return; }

    var solid = comp.layers.addSolid([0.5,0.5,0.5], "Verify", comp.width, comp.height, 1, comp.duration);
    var effect = solid.Effects.addProperty("Audio Spectrum"); // change per effect

    var output = [];
    function dump(prop, depth) {
        var indent = ""; for (var i = 0; i < depth; i++) indent += "  ";
        var line = indent + "[" + prop.propertyIndex + "] "
            + "name: \"" + prop.name + "\"  matchName: \"" + prop.matchName + "\"";
        output.push(line);
        if (prop.propertyType !== PropertyType.PROPERTY) {
            for (var j = 1; j <= prop.numProperties; j++) dump(prop.property(j), depth + 1);
        }
    }
    dump(effect, 0);

    var file = new File(Folder.desktop.fsName + "/ae_verify.txt");
    file.open("w"); file.write(output.join("\n")); file.close();
    alert("Output: Desktop/ae_verify.txt");
    solid.remove();
})();
```

### Match-Name Provenance Tags

Every match-name in a plan should be tagged:

| Tag | Meaning |
|-----|---------|
| `[VERIFIED]` | Confirmed by running verification script in AE |
| `[DOCS]` | Found in official Adobe scripting reference |
| `[COMMUNITY]` | From ae-scripting forums (include URL) |
| `[LLM-GENERATED]` | Must be verified before use |

### Trust vs. Verify Matrix

| Claim Type | Trust Level | Action |
|---|---|---|
| Effect menu names ("Audio Spectrum") | High | Spot-check if obscure |
| Top-level match-names (`ADBE Effect Parade`) | Medium | Spot-check |
| Effect property indices (`-0001`, `-0012`) | **Low** | Always verify empirically |
| Expression syntax (basic) | Medium | Trust common patterns |
| sampleImage() parameter semantics | Low | Test empirically |
| Frequency/audio data distribution | Very Low | Verify with test audio |

### Process Checklist for Future AE Plans

Before any AE plan is implementation-ready:

- [ ] All match-names enumerated in a reference table with provenance tags
- [ ] `Scripts/verified/` checked first for the effect/property in question
- [ ] Verification script written and executed only for gaps in `Scripts/verified/` or unresolved runtime behavior
- [ ] Discrepancies resolved — plan updated with empirical values
- [ ] Expression engine explicitly specified (Legacy ExtendScript vs JavaScript)
- [ ] ExtendScript vs Expression boundary documented
- [ ] Domain-specific claims (signal processing, color science) backed by primary sources

## Cross-References

- **Plan file:** `ae-ai-starter/docs/plans/2026-03-12-feat-audio-spectrum-plugin.md`
- **Shape layer patterns:** `ae-ai-starter/docs/plans/2026-03-04-feat-demo-panels-implementation-plan.md`
- **Existing recipe patterns:** `ae-ai-starter/docs/recipes.md` (repeating-elements, image-swap, data-timing)
- **Verified effect/property data:** `ae-ai-starter/Scripts/verified/README.md`
- **ES3 constraints:** `ae-ai-starter/AGENTS.md`
- **Existing solution:** `ae-ai-starter/docs/solutions/integration-issues/extracting-ae-automation-starter-kit-from-project-codebase.md`
