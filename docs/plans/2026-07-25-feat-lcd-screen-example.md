# LCD Screen — a native-AE alternative to ProductionCrate Perfect Screen

## Context

The goal is a new example in this repo that turns a flat screen recording into a photoreal shot of a physical LCD monitor, matching the feature set of [ProductionCrate Perfect Screen](https://www.productioncrate.com/plugins/perfect-screen).

Research finding that shapes the whole design: **Perfect Screen is a camera/lens simulator, not a monitor simulator.** It ships as a compiled GPU `.aex` (runs in Premiere too, so no ExtendScript inside it), and its real feature set is:

| Perfect Screen feature | Notes |
|---|---|
| 3D camera + look-at target, on-screen handles | Core of the product |
| Depth of Field ("thin slice of focus") + animated focus pull | Macro-lens look |
| Optic Distortion ("glass bulge") | Lens barrel, whole-frame |
| Chromatic Aberration | "prism-like edge fringing", radial |
| Vignette | Lens vignette |
| Dust | Particles on a separate depth plane from the image |
| Color tinting (warm / cool / green) | LCD backlight temperature |
| Auto Zoom | Solves scale so the tilted plane never shows empty edges |
| Auto Exposure + Exposure | Per-frame brightness normalization |
| Animate Movements: Moving Target / Animate Angle / Moving Focus Point | Keyframe-free procedural motion |
| Quality | Sample count; low quality = visible stochastic grain |
| 20 presets | 11 named publicly: Static Default, Static Tinted, Reading Front, Reading Move, Reading Angle, Reading Tilted, Side Focus Pull, Close Up Low, Sideways, Pan Down, Orbit Wides |

It has **no** bezel, monitor body, glass reflections, glare, scanlines, backlight bleed, viewing-angle falloff, dead pixels, or screen-off state. Its subpixel grid is implied but never exposed as a control — ProductionCrate punts pixel structure to their separate CRT Factory product.

That matters because the things Perfect Screen *can't* do are exactly the things native After Effects does cheaply and well (gradients, solids, shape layers, blend modes, track mattes), while the things it does well (raytraced DoF, per-pixel shading) map onto AE's real 3D camera surprisingly cleanly:

| Perfect Screen | Native AE equivalent |
|---|---|
| Camera position handle | Camera layer Position |
| Look-at target / Moving Target | Camera **Point of Interest** (AE cameras are natively look-at rigs) |
| Focal length / FOV | Camera Zoom |
| DoF + focus pull | Camera Depth of Field / Aperture / Focus Distance |
| Keyframe-free motion | Seeded `wiggle()` on those three properties |

So the outcome is **not a degraded clone** — it is a superset. Confirmed scope decisions with the user:

- **Scope:** superset — everything Perfect Screen does, plus the physical-monitor layer it omits.
- **Form factor:** pure ExtendScript. `setup.jsx` + config file + a dockable ScriptUI panel. No npm, no build step, installs via the existing `install-example` skill.
- **Control model:** one `LCD CONTROLS` null carrying expression controls, with every parameter in the stack expression-linked back to it. Gives the single-panel feel of a real plugin and stays animatable after build.
- **Reuse:** the building blocks are promoted into `Scripts/lib/actions/` as vetted actions so the whole repo benefits; the example is a thin consumer.

---

## Architecture

Three comps, built by `setup.jsx` from a source footage item or the active comp:

```
LCD_Master  (delivery comp)
├── LCD CONTROLS            null  — all expression controls (top layer, guide layer)
├── LENS                    adjustment layer — Optics Compensation, CA, Glow, Vignette, Grain, Exposure
├── LCD_Screen              precomp layer, 3D — the monitor object
├── LCD Camera              camera — position + point of interest + DoF
└── AMBIENT SPILL           duplicate of LCD_Screen, huge Fast Box Blur, scaled up, Add, behind everything

LCD_Screen  (the monitor object — 2D compositing, no camera)
├── GLASS                   dust + smudges + CC Light Sweep + reflection ramp   (Screen/Add)
├── BEZEL                   rounded-rect shape layer + Bevel Alpha
├── VIEWING ANGLE           ramp → Levels gamma via Set Matte
├── BACKLIGHT BLEED         corner ramps + Fractal Noise mura                   (Add/Overlay)
├── BACKLIGHT TINT          Photo Filter adjustment layer
├── SCANLINES               black solid + Venetian Blinds                       (Multiply)
├── SUBPIXEL GRID           RGB stripe tile (Motion Tile)                       (Multiply)
└── LCD_Content             precomp layer — Mosaic quantization + rounded-corner mask + PSL Inner Shadow

LCD_Content  (the raw screen recording, isolated so Mosaic block count is deterministic)
└── <user footage>
```

**Why the three-comp split:** the panel simulation must be finished and flattened *before* the camera pass, otherwise the subpixel grid gets sampled by the 3D renderer in a way you can't control, and the lens stack would re-distort the bezel independently of the screen. `LCD_Content` is separate from `LCD_Screen` so the Mosaic block count can be computed from footage pixel dimensions rather than from a comp that also contains the bezel padding.

**3D layer + real camera, not CC Power Pin.** True perspective, true optical DoF, and Point of Interest is a free look-at target. Corner-pin approaches are affine (textures swim) and would need a hand-rolled DoF ramp.

**Auto Zoom** is the one genuinely tricky piece. Naive `toComp()` projection is circular — the panel's scale feeds back into its own projection. Approach: an analytic expression on a parent null's Scale that computes the four panel corners in camera view space directly from the camera's Position, Point of Interest, and Zoom (no `toComp`), perspective-divides, takes the bounding box, and solves `scale = max(compW/bboxW, compH/bboxH)`. **Fallback if the analytic expression proves unstable:** a "Bake Auto Zoom" panel button that walks the comp frame by frame in ExtendScript, computes the same projection, and writes keyframes. Build the fallback either way — it doubles as the "bake for render performance" path.

**Auto Exposure** uses `sampleImage()` in an expression on the LENS layer's Exposure effect, sampling `LCD_Screen` at a 3×3 grid of points with a large radius to approximate mean luminance, then compensating toward a target. Per `Scripts/verified/gotchas.md`, `sampleImage(postEffect=true)` reads the layer's internal render buffer, so the probe works even if the layer is hidden, and adjustment layers above are correctly excluded. This is expensive — ship it **off by default** behind a checkbox, matching Perfect Screen's own toggle.

---

## Deliverables

### A. New action blocks in `Scripts/lib/actions/`

All follow the contract in `Scripts/lib/actions/README.md`: `actionName(comp, opts)` (or `(layer, opts)`), no undo group, no `beginScript`/`writeResult`, validate-and-throw with `"Action Name: ..."` prefix, `setStep()` at sub-operations, ES3 only. Model the JSDoc header and structure on `Scripts/lib/actions/effects/color_grade.jsxinc` and `Scripts/lib/actions/effects/apply_effect.jsxinc`.

**Panel-side (`effects/` unless noted):**

| File | Function | Effects used (verified match names) |
|---|---|---|
| `effects/subpixel_grid.jsxinc` | `addSubpixelGrid(comp, opts)` | `ADBE Mosaic` on content + generated RGB stripe solid tiled with `ADBE Tile`, Multiply. Modes: `stripe` (LCD), `grille` (`CC Griddler`), `dot` (`CC Ball Action`). Compute Mosaic block count and tile width from comp dims in script so the two register — this is the alignment problem tutorials warn about, solved by owning both numbers. |
| `effects/scanlines.jsxinc` | `addScanlines(comp, opts)` | Black solid + `ADBE Venetian Blinds` (Direction 0, Width = pitch, Completion ~50, Feather 1–3), Multiply. Optional roll-bar: second wide/feathered instance with a `time % period` position expression. |
| `effects/backlight_bleed.jsxinc` | `addBacklightBleed(comp, opts)` | N corner solids with radial `ADBE Ramp`, feathered masks, Add + `ADBE Fractal Noise` mura layer (low Contrast, Overlay, ~4%). |
| `effects/viewing_angle_falloff.jsxinc` | `addViewingAngleFalloff(comp, opts)` | `ADBE Ramp` oriented along tilt axis → `ADBE Pro Levels2` Gamma via `ADBE Set Matte3`, plus a low-opacity desaturating `ADBE Tint`. Perfect Screen's biggest omission; genuine differentiator. |
| `scene/bezel.jsxinc` | `addBezel(comp, opts)` | Rounded-rect shape layer (`ADBE Vector Shape`, `ADBE Vector Stroke Color` — match names only) + `ADBE Bevel Alpha`, and `ADBE PSL Inner Shadow` applied to the screen layer to sell the recess. |
| `scene/glass_surface.jsxinc` | `addGlassSurface(comp, opts)` | One GLASS layer: dust via `ADBE Noise HLS Auto2` + `ADBE Threshold2`, smudges via `CC Glass` with a fractal bump map, sheen via `ADBE Ramp` (Screen), moving specular via `CC Light Sweep`. |

**Lens/camera-side:**

| File | Function | Effects used |
|---|---|---|
| `effects/lens_distortion.jsxinc` | `addLensDistortion(layer, opts)` | `ADBE Optics Compensation` — `-0001` FOV, `-0002` Reverse, `-0006` Resize. Perfect Screen's "Distortion". |
| `effects/chromatic_aberration.jsxinc` | `addChromaticAberration(comp, opts)` | Two modes. `subtle`: single `ADBE Channel Blur` (`-0001`/`-0002`/`-0003` per channel). `lens`: three duplicate layers, each `ADBE Shift Channels` isolating one channel (`-0002`/`-0003`/`-0004`), Screen blend, **scale** offsets (100 / 100.3 / 100.6) — scale, not position; position offsets give a glitch split, which is physically wrong for a lens. |
| `effects/depth_of_field_rake.jsxinc` | `addDepthOfFieldRake(comp, opts)` | `ADBE Ramp` blur-map layer + `ADBE Camera Lens Blur` wired to it: `-0010` Layer, `-0013` Blur Focal Distance, `-0001` Blur Radius, `-0017`/`-0018` Highlight Gain/Threshold for bokeh bloom. The effect-based DoF path, used when the user opts out of the real camera. |
| `effects/vignette.jsxinc` | `addVignette(comp, opts)` | **Native by default** — solid + radial `ADBE Ramp`, Multiply — to avoid the `CS Vignette` third-party dependency that `color_grade.jsxinc` already carries. Optional `useCS: true` path applies `CS Vignette` (`-0001` Amount, `-0002` Angle of View, `-0003` Center, `-0005` Pin Highlights). |
| `effects/screen_glow.jsxinc` | `addScreenGlow(layer, opts)` | `ADBE Glo2`. **Takes `thresholdPercent` (0–100) and multiplies by 2.55 internally** — see gotchas. `-0002` Threshold, `-0003` Radius, `-0004` Intensity. |
| `effects/ambient_spill.jsxinc` | `addAmbientSpill(comp, opts)` | Duplicate of the screen layer + `ADBE Fast Box Blur` at huge radius, scaled ~130%, Add at 20–40%, moved behind. Bias-lighting trick. |
| `effects/backlight_tint.jsxinc` | `addBacklightTint(comp, opts)` | `ADBE Photo Filter` (`-0001` Filter preset, `-0002` Color, `-0003` Density) — physically-correct warming/cooling. Maps Perfect Screen's warm/cool/green. |

**Reused as-is, do not rewrite:** `effects/apply_effect.jsxinc`, `effects/grain.jsxinc` (sensor grain), `effects/flicker.jsxinc`, `layer/solid.jsxinc` (`isAdjustment: true` for adjustment layers), `layer/shape_layer.jsxinc` (`roundness` for the bezel), `layer/mask.jsxinc`, `layer/camera.jsxinc`, `layer/null_object.jsxinc`, `layer/set_parent.jsxinc`, `layer/set_track_matte_to_above.jsxinc`, `layer/layer_from_item.jsxinc`, `comp/pre_compose.jsxinc`, `comp/create_comp.jsxinc`, `comp/add_3d_break.jsxinc`, `presets/expression_rig.jsxinc`, `property/expression_control.jsxinc`, `property/set_expression.jsxinc`, `property/set_keyframes.jsxinc`.

### B. New compound preset

`Scripts/lib/actions/presets/lcd_screen.jsxinc` → `addLcdScreen(opts)`. `@tier compound`, `@requires` listing every block above plus the reused ones, `@pluginDeps` as the union. Thin glue only — builds the three comps and returns `{ master, screenComp, contentComp, controls, camera }`.

### C. New example: `examples/lcd-screen/`

```
examples/lcd-screen/
├── README.md                  — Prerequisites, Setup, control reference table, preset list, file tree
├── example_config.jsxinc      — var LcdScreenConfig = { ... }  (audio-spectrum pattern)
├── presets.jsxinc             — var LcdScreenPresets = { "Static Default": {...}, ... }
├── setup.jsx                  — entry point
├── render_preview.jsx         — saves frames to Scripts/runs/preview/ for visual verification
├── lcd_screen_panel.jsx       — dockable ScriptUI panel
└── lib/
    ├── cleaner.jsxinc         — cleanLcdScreen(project) — removes LCD_* comps/layers, safe re-runs
    ├── rig.jsxinc             — buildControlRig(comp, config)
    ├── content-comp.jsxinc    — buildContentComp(footageItem, config)
    ├── screen-comp.jsxinc     — buildScreenComp(contentComp, config)
    ├── camera-rig.jsxinc      — buildCameraRig(masterComp, config)  incl. auto-zoom + procedural motion
    ├── lens-stack.jsxinc      — buildLensStack(masterComp, config)
    ├── autozoom.jsxinc        — projection math, shared by the expression generator and the bake path
    └── expressions.jsxinc     — expression templates with {{TOKEN}} placeholders
```

Follow `examples/audio-spectrum/` exactly for conventions: `#include "../../Scripts/lib/..."` for shared libs in order `io` → `prop-walker` → `result-writer`, bare relative includes for local files, single global config object, IIFE with `step` threading and `beginScript`/`writeResult`/`app.beginUndoGroup`.

`setup.jsx` structure:

```javascript
(function () {
    var step = "init";
    var footage = resolveSource(LcdScreenConfig);   // by name from config, else active item
    beginScript("setup.jsx", null);
    app.beginUndoGroup("LCD Screen Setup");
    try {
        step = "clean existing";     cleanLcdScreen(app.project);
        step = "apply preset";       var cfg = mergePreset(LcdScreenConfig);
        step = "build content comp"; var content = buildContentComp(footage, cfg);
        step = "build screen comp";  var screen  = buildScreenComp(content, cfg);
        step = "build master comp";  var master  = buildMasterComp(screen, cfg);
        step = "build control rig";  var rig     = buildControlRig(master, cfg);
        step = "build camera rig";   buildCameraRig(master, rig, cfg);
        step = "build lens stack";   buildLensStack(master, rig, cfg);
        step = "link expressions";   linkAllControls(master, screen, content, rig, cfg);
        app.endUndoGroup();
        writeResult("success", step, null, master);
    } catch (e) { app.endUndoGroup(); writeResult("error", step, e, null); alert(...); }
})();
```

### D. Control rig

One `LCD CONTROLS` null via `addExpressionRig`. Grouped by name prefix since AE has no control grouping:

| Group | Controls |
|---|---|
| Camera | `CAM Distance`, `CAM Height`, `CAM Orbit` (angle), `CAM Tilt` (angle), `CAM Zoom`, `CAM Auto Zoom` (checkbox), `CAM Auto Zoom Pad` |
| Focus | `FOC Depth of Field` (checkbox), `FOC Aperture`, `FOC Distance`, `FOC Bokeh Gain` |
| Motion | `MOT Target Amount`, `MOT Target Speed`, `MOT Angle Amount`, `MOT Angle Speed`, `MOT Focus Amount`, `MOT Focus Speed`, `MOT Seed` |
| Lens | `LEN Distortion`, `LEN Chromatic Aberration`, `LEN Vignette`, `LEN Bloom`, `LEN Bloom Threshold`, `LEN Grain`, `LEN Exposure`, `LEN Auto Exposure` (checkbox), `LEN Auto Exposure Target` |
| Panel | `PNL Subpixel Amount`, `PNL Subpixel Pitch`, `PNL Subpixel Mode` (dropdown), `PNL Scanline Amount`, `PNL Scanline Pitch`, `PNL Roll Bar` |
| Backlight | `BKL Brightness`, `BKL Tint` (color), `BKL Tint Amount`, `BKL Bleed`, `BKL Mura`, `BKL View Angle Falloff` |
| Glass | `GLS Reflection`, `GLS Sweep Position`, `GLS Dust`, `GLS Smudge` |
| Body | `BDY Bezel Width`, `BDY Corner Radius`, `BDY Bezel Color` (color), `BDY Drop Shadow`, `BDY Ambient Spill` |
| Power | `PWR On` (checkbox), `PWR Flicker` |

Every effect parameter in the stack gets a `setExpression` link back to these — mostly one-liners like `thisComp.layer("LCD CONTROLS").effect("PNL Scanline Amount")("Slider")`.

### E. Presets

`presets.jsxinc` exports a map of partial config overrides merged over `LcdScreenConfig`. Cover Perfect Screen's 11 named presets plus originals that exercise the panel half it lacks:

`Static Default`, `Static Tinted`, `Reading Front`, `Reading Move`, `Reading Angle`, `Reading Tilted`, `Side Focus Pull`, `Close Up Low`, `Sideways`, `Pan Down`, `Orbit Wide`, `Retro LCD`, `OLED Night`, `Desk Setup`, `Kiosk`, `Screen Off`.

### F. ScriptUI panel

`examples/lcd-screen/lcd_screen_panel.jsx`, modeled on `Scripts/panel/automation_lab_panel.jsx` — same `runAction(label, fn)` wrapper (this is what satisfies contract rules 2 and 3, so no action may open its own undo group). Sections:

- **Build** — source dropdown, preset dropdown, Build / Rebuild buttons
- **Camera** — orbit / tilt / distance / zoom sliders, Auto Zoom checkbox, Bake Auto Zoom button
- **Panel** — subpixel mode + amount, scanlines, backlight tint
- **Body** — bezel width, corner radius, drop shadow, ambient spill
- **Render** — Bake Expressions button (freeze to static values for render perf), Render Preview button
- Status line + log, same recolor idiom as the existing panel

Panel sliders write through to the control-rig effects on the existing rig rather than rebuilding — so tweaking is instant.

### G. Registry and doc updates

| File | Change |
|---|---|
| `examples/README.md` | Add row to the "What's Here" table |
| `README.md` (root, ~lines 36–43) | Add row to the Examples table |
| `.claude/skills/install-example/SKILL.md` | Add `install-lcd-screen` to the `description:` trigger list |
| `AGENTS.md` (~line 176) | Mention in the Project Structure bullet. **`CLAUDE.md` and `GEMINI.md` are symlinks to `AGENTS.md`** — edit `AGENTS.md` only |
| `Scripts/lib/actions/index.json` | Regenerate by running `Scripts/analyze/build_actions_index.jsx` in AE; commit alongside the new `.jsxinc` files |
| `Scripts/lib/actions/index.json` `runnerMeta` | Optionally add param metadata for the new blocks so they appear in the Actions Runner panel. `runnerMeta` is preserved across rebuilds, keyed by `@name` — renaming an action silently drops it |

---

## Gotchas that will bite this specific build

From `Scripts/verified/gotchas.md` — all verified against AE 26.x:

1. **`ADBE Glo2` "Glow Threshold" (`-0002`) is stored 0–255 while the UI shows percent.** Default 153 = 60%. Multiply UI percents by 2.55. `color_grade.jsxinc` currently sets 50 (~20%), which blooms the frame into milk — don't copy that value.
2. **`CC Toner` "Blend w. Original" (`CC Toner-0004`) takes a 0–1 fraction; `setValue(65)` throws and aborts the entire script.** Same for `ADBE Easy Levels2` channel values (0–1, divide 16-bpc UI values by 32768).
3. **`ADBE Drop Shadow` Opacity defaults to 127.5 on a 0–255 scale** — another normalization trap.
4. **`addProperty()` invalidates sibling references on shape-layer groups** (`ReferenceError: Object is invalid`). Building the bezel with rounded rect + fill + stroke will hit this. Fix: set each property's values immediately after its own `addProperty()`, or re-fetch by match name afterward.
5. **Layer index shifting** — `addSolid`/`addShape` insert at index 1 and push everything down. The screen comp stacks ~8 layers; look up every layer **by name after all creation is complete**, especially for `Set Matte` / `Compound Blur` / `Camera Lens Blur` blur-map source references.
6. **Effect enum values are often 1-indexed, and `CUSTOM_VALUE` controls aren't scriptable at all.** Read the verified JSON in `Scripts/verified/effects/` before setting any dropdown; never guess. On AE 26.0+ use `Property.propertyParameters` to confirm.
7. **`CS Vignette` is the match name; "CC Vignette" is the display name.** The repo flags it as a third-party dep — hence the native ramp default.
8. **No non-ASCII characters in the entry `.jsx` files** (em dashes, curly quotes). ExtendScript silently refuses to list the file in the Run Script File dialog. Verify with `LC_ALL=C tr -d '[:print:][:space:]' < setup.jsx | wc -c` → must be 0.
9. **`comp.saveFrameToPng()` returns before the file is written.** `render_preview.jsx` must be paired with an `IEND`-trailer poll before any PNG is read, or you get a truncated image with a razor-straight white bottom that reads as an effect bug.
10. **Use `var` in expressions too**, not `let`/`const` — keeps them working on AE's legacy expression engine.
11. **Shape-layer properties must use ADBE match names** (`ADBE Vector Shape`, `ADBE Vector Stroke Color`) — display names are unreliable.

---

## Implementation order

Each phase ends in a runnable, verifiable state.

1. **Panel blocks** — `subpixel_grid`, `scanlines`, `backlight_tint`, `vignette`, `screen_glow`. Regenerate `index.json`. Verify each in isolation via the Actions Runner panel.
2. **Body blocks** — `bezel`, `glass_surface`, `backlight_bleed`, `viewing_angle_falloff`, `ambient_spill`.
3. **Lens blocks** — `lens_distortion`, `chromatic_aberration`, `depth_of_field_rake`.
4. **Compound** — `presets/lcd_screen.jsxinc`, wiring blocks 1–3 into the three-comp structure. No control rig yet, literal values.
5. **Example scaffold** — config, `setup.jsx`, `lib/content-comp`, `lib/screen-comp`, `lib/cleaner`, `render_preview.jsx`. First end-to-end build.
6. **Camera rig** — 3D layer, camera, Point of Interest, DoF. Procedural motion expressions. **Auto Zoom analytic expression + bake fallback** (highest-risk item; timebox the expression, fall back to bake).
7. **Control rig** — all ~45 controls, `linkAllControls` expression wiring. Auto Exposure behind its checkbox.
8. **Presets** — 16 entries, verified visually one at a time.
9. **ScriptUI panel** — sections, live write-through, Bake buttons.
10. **Docs + registry** — README tables, skill trigger, `AGENTS.md`, final `index.json` regen.

---

## Verification

**Per-step (required by the repo's reliability protocol):** after every run, read `Scripts/runs/last_run.json`, confirm `scriptName` matches the action just triggered (stale detection), check `status`, read `diff`. `status: "started"` means the script crashed before completing.

**Visual, and the thing that makes this plan self-checking:** `render_preview.jsx` calls `comp.saveFrameToPng()` for a set of frames into `Scripts/runs/preview/`, polling for the `IEND` trailer:

```bash
for i in {1..120}; do tail -c 8 preview/f0000.png | LC_ALL=C grep -qa IEND && break; sleep 0.5; done
```

Those PNGs are then read directly, so each phase can be visually confirmed rather than relying on a verbal description. Concretely:

- Phase 1: render a checkerboard/color-bars source and confirm the subpixel stripes are pixel-aligned to Mosaic blocks (zoom in — misregistration shows as beating).
- Phase 3: confirm CA fringing grows toward frame edges (radial), not uniform — proves scale-offset rather than position-offset.
- Phase 6: render frames 0/12/24 of an orbit and confirm no transparent edge ever enters frame (Auto Zoom working) and that perspective converges correctly (parallel screen edges must not stay parallel).
- Phase 8: one preview frame per preset, reviewed as a contact sheet.

**Failure-mode checks to run explicitly:**
- Build twice in a row — `cleanLcdScreen` must make re-runs idempotent, no `LCD_ 2` duplicate comps.
- Build with a source whose aspect ratio differs from the master comp.
- Toggle every checkbox control off — the rig must degrade to a flat, unmodified screen, not error.
- Bake Expressions, then confirm the render matches the live rig frame-for-frame.

**Regression:** run `Scripts/analyze/build_actions_index.jsx` and confirm `actionCount` increases by exactly the number of new blocks and that no existing action's `runnerMeta` was dropped.
