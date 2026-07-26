# Perfect Screen v2 — Definitive Rebuild Plan

> Executor: this plan is self-contained — you have no access to the conversation that produced it. Rename this file to `docs/plans/2026-07-25-feat-perfect-screen-v2.md` as your first action.

## Context

The goal is an `examples/` project that recreates ProductionCrate's **Perfect Screen** plugin (https://www.productioncrate.com/plugins/perfect-screen): turn a flat screen recording into a hyper-realistic **macro photograph of a physical LCD** — tight framing, visible RGB pixel structure, thin-slice depth of field, lens distortion/chromatic aberration, dust, exposure, handheld camera motion.

A first attempt exists at `examples/lcd-screen/`. An independent review judged it a strong engineering scaffold but a weak recreation: it optimized for breadth (bezels, backlight bleed, mura, glass sweeps, ambient spill) over the defining macro visual, left its 4 camera controls dead (rebuild-only), never ran a visual verification loop, and shipped a dangerous name-based comp cleaner. This plan rebuilds the example around the actual product's control surface with **everything live** and a **visual-first acceptance loop**, treating the existing work as a parts library.

**Git strategy (user-decided): commit the entire current working tree as a baseline first**, before any rebuild work. Then one commit per milestone. Never amend published commits; never `--no-verify`.

## Execution Status

- [x] Baseline working tree committed
- [x] M0 — Infra & safety
- [x] M1 — Core macro image + live camera + live auto zoom
- [x] M2 — Lens realism
- [ ] M3 — Exposure, Auto Exposure, tint
- [ ] M4 — Animate Movements under auto zoom
- [ ] M5 — 20 live presets + panel v2
- [ ] M6 — Quality dropdown, opt-in extras path, docs, contact sheet

## The feedback loop (read this before writing any code)

The human user runs scripts in After Effects (File > Scripts > Run Script File); you cannot. Your only feedback channels are:
1. `Scripts/runs/last_run.json` — written by the mandatory `beginScript`/`writeResult` reliability contract (see `AGENTS.md`). Verify `scriptName`, check `status`, read `diff`.
2. **Rendered PNG preview frames** in `Scripts/runs/preview/` which you read as images. `comp.saveFrameToPng()` returns before the file is written — **always poll for the PNG `IEND` trailer before reading**: `for i in {1..120}; do tail -c 8 f.png | LC_ALL=C grep -qa IEND && break; sleep 0.5; done` (documented in `Scripts/verified/gotchas.md`).

Each iteration costs a human round-trip, so every milestone's build script **ends by auto-rendering its acceptance frames** — one run yields both the build and the evidence. A milestone is complete only when you have inspected the frames against its acceptance criteria AND the user confirms the look.

**Reference stills (optional, ask once at M0):** ask the user to screenshot 2–3 stills from the Perfect Screen demo (https://public.productioncrate.com/videos/product_pages/laforge/perfect-screen/PerfectScreen_Edit_Button.mp4) into `Scripts/runs/reference/`. If provided, judge previews side-by-side; if not, use the textual criteria below. Do not block on this.

## Parity target (Perfect Screen's actual control surface)

| Group | Controls |
|---|---|
| Camera | orbit, tilt, distance, zoom, **roll**, target position / focus point |
| Focus | thin-slice DoF (aperture), **base blur**, **extra radial blur** |
| Panel | **live pixel density**, Auto Zoom (no empty edges, live) |
| Motion | Animate Movements (handheld wiggle, live amounts) |
| Surface | dust **strength AND density** |
| Color/Optics | tint (warm/cool/green), optic distortion, chromatic aberration |
| Exposure | Exposure slider + **Auto Exposure toggle** |
| Performance | quality control |
| Presets | 20, applyable live without rebuild |

## Inventory of the existing attempt

### Keep (parts library)
- **14 shared actions**: `Scripts/lib/actions/effects/{ambient_spill,backlight_bleed,backlight_tint,chromatic_aberration,depth_of_field_rake,lens_distortion,scanlines,screen_glow,subpixel_grid,viewing_angle_falloff,vignette}.jsxinc`, `scene/{bezel,glass_surface}.jsxinc`, `presets/lcd_screen.jsxinc`. All follow the action contract; all bake values via `setValue()` (live-linking happens in the example's rig).
- **Auto-zoom solver math** (`examples/lcd-screen/lib/autozoom.jsxinc`): the ray-exit cover-scale computation (lines ~93–115) ports into the new live expression; the ghost/probe bake machinery becomes a fallback only.
- **Live-link technique** (`examples/lcd-screen/lib/rig.jsxinc`): `setExpression` linking with correct cross-comp scoping — nested-comp layers must use `comp("<master>").layer("LCD CONTROLS")...`, master-comp layers use `thisComp` (verified gotcha: `thisComp` cannot reach parent-comp layers).
- Reliability plumbing, panel `runAction` pattern, ES3 discipline.

### Fix (verified defects)
- 4 dead `CAM *` sliders; camera changes require destructive "Rebuild Camera"; no roll, no target/focus-point control.
- Missing: Exposure/Auto Exposure, base+radial blur, dust density, live pixel density, quality control, real CA (downgraded to Channel Blur), live presets (4 of 20 missing; the rest need full rebuilds).
- Zero visual verification ever ran (`Scripts/runs/preview/` never created).
- **Cleaner** (`lib/cleaner.jsxinc`) deletes any comp in the whole project matching hard-coded names + user-configurable `MASTER_COMP_NAME` — no ownership check, errors swallowed.
- Vignette strength baked into a ramp color (only opacity linkable); `depth_of_field_rake` orphaned; panel uses raw `edittext`s; `Scripts/lib/actions/index.json` regenerated as one 143 KB line (unreviewable); all 14 new actions have `runnerMeta: null`.

### Gotchas that constrain every mapping (`Scripts/verified/gotchas.md`)
- Glow Threshold `ADBE Glo2-0002` is 0–255 (UI percent × 2.55); `ADBE Threshold2-0001` and Camera Lens Blur Highlight Threshold are 0–1 fractions.
- `addProperty()` invalidates sibling effect references — set immediately or re-fetch by match name.
- `toComp()` is expression-only (scripting bridge = temporary `ADBE Point3D Control`).
- Motion Tile percentages are layer-relative — tile in a comp-sized layer.
- Duplicating an adjustment layer compounds its effects (never channel-split CA on adjustment layers).
- Effect enums are 1-indexed, non-contiguous (Photo Filter Custom = 20, Glow operation Screen = 6, Optics Comp Resize 1–4).
- Effect `enabled` is NOT expression-drivable; comp `resolutionFactor` is script-only.

## Architecture

### Comp structure (5 comps default; bezel wrapper comp only when enabled)

```
LCD_Content            footage fit/loop (reuse content-comp.jsxinc)
LCD_Panel              PIXEL STRUCTURE ONLY by default: Mosaic (live density) +
                       subpixel stripe overlay (live density + amount) + glow + tint.
                       Bleed/mura/viewing-angle/glass/scanlines: built OFF by default.
LCD_SubpixelPattern    (hidden) pattern pre-tiled ONCE at reference pitch 12px in a
                       2x-panel-sized comp; live density = layer Scale expression
                       (sidesteps the Motion Tile percent-range constraint)
LCD_Scene              3D stage at 1.5x master resolution: LCD_Panel as 3D layer +
                       LCD Camera (fully expression-driven). NO zoom null, NO ghost.
LCD Master             2D finishing comp:
  [bottom] CA RED/GREEN/BLUE   three instances of LCD_Scene, channel-isolated via
                               ADBE CHANNEL MIXER (numeric sliders only — zero the
                               unwanted X-X gains), ADD blend; Scale expression =
                               liveAutoZoom * (1 + caSlider * k_ch), k = ±0.0002 / 0.
                               AE caches nested-comp renders, so ~1x 3D render cost.
  DUST                         comp-sized solid: Noise HLS Auto2 + Threshold2 + 1-2px
                               blur, Screen blend. Density = Threshold Level expression
                               (0-1 range!); Strength = Opacity link. Both live.
  LENS (adjustment)            Optics Compensation (distortion), Box Blur2 (base blur),
                               CC Radial Fast Blur (radial blur), ADBE Exposure2, Noise (grain)
  VIGNETTE                     black solid + feathered elliptical mask; Opacity live
                               (fixes the baked-ramp-color defect)
  LCD CONTROLS (null)          single source of truth, ~30 controls
```

Structural shifts vs. v1, each load-bearing:
- **Auto Zoom moves out of the 3D transform chain** into a 2D Scale expression on the Scene instances in Master. v1's bake was forced by self-reference (zoom on a parent null in the screen layer's own chain); in Master the Scale lives in the *outer* comp while `toComp()` evaluates in the *inner* comp — no cycle, and the expression never reads its own Scale (closed-form solve from static geometry).
- **Dust/vignette/grain move to lens space (Master)** — a macro photo shows dust on the lens, not painted on the panel.
- **CA duplicates real precomp instances, not adjustment layers** — the compounding gotcha no longer applies, and channel-isolated ADD reconstructs the original exactly at amount 0 (v1's Tint+Screen could not).
- 1.5x oversampled Scene so the auto-zoom upscale (typically 100–160%) doesn't soften pixel structure.

### Control model — everything live, one null

All controls on `LCD CONTROLS`; expressions installed **at build time** by a **table-driven linker** (`lib/links.jsxinc`): one array of `{getProp(refs), control, subProp, mapExpr}` entries iterated in a single loop — every range mapping (×2.55, 0–1, etc.) lives in this one auditable table. Replaces `rig.jsxinc`'s ad-hoc if-chain.

| Group | Controls | Mechanism |
|---|---|---|
| CAMERA | Distance, Orbit, Tilt, Roll, Zoom | camera Position expression = spherical orbit around target: `[tx + sin(orbit)*d, ty - sin(tilt)*d, -cos(orbit)*cos(tilt)*d]` (port v1's script-side math from `camera-rig.jsxinc:43-48` verbatim into the expression); Roll on camera **Z Rotation** (auto-orient to PoI leaves it free); Zoom direct link |
| TARGET | Target X/Y, Focus Offset, DoF on, Aperture | Point of Interest = `[tx, ty, 0]` + live wiggle; Focus Distance = `length(position, pointOfInterest) + focusOffset + focusWiggle` |
| FRAMING | Auto Zoom on, Padding % | live Scale expression on Scene instances (see below) |
| BLUR | Base Blur, Radial Blur | Box Blur2 radius, CC Radial Fast Blur amount on LENS |
| PIXELS | Pixel Density, Pixel Amount, Glow, Glow Threshold | shared snap `s = 3*Math.round(slider/3)`: Mosaic blocks = `max(1, round(panelW/s))`; pattern layer Scale = `s/12*100`; Glow Threshold ×2.55 |
| LENS | Distortion, CA, Vignette, Grain, Dust Strength, Dust Density | per architecture above |
| COLOR | Tint Amount, Exposure, Auto Exposure ☑ | Photo Filter density; Exposure2 with branching expression (below). Tint preset color = structural |
| MOTION | Target Amt/Speed, Angle Amt/Speed, Focus Amt/Speed, Seed | always-installed `seedRandom(seed,true); base + (wiggle(speed,1)-value)*amtSlider` — amount 0 = static, no rebuild ever |

**Live Auto Zoom expression** (on each Scene instance's Scale in Master): reference `L = comp("LCD_Scene").layer(<panel 3D layer>)`, project its 4 corners with `L.toComp(corner)` (expressions CAN call toComp on cross-comp layer references — the scripting-API limitation does not apply), then closed-form cover scale about frame center using v1's ray-exit math: for each master frame corner t, `s_needed = 1/u` where u is the ray-exit parameter of center→t against the projected quad; `s = max(1, padding * max(s_needed_i)) * baseFit` (baseFit compensates the 1.5x oversample). Evaluates per frame → stays correct under Animate Movements, which v1's bake never did.

**Auto Exposure**: expression on the LENS Exposure property, branching on the checkbox. When on: `sampleImage` the **CA GREEN Scene layer** (a real layer below the adjustment stack — no feedback loop through Exposure) at frame center, radius ≈ [w/4, h/4], luminance → `manualSlider + clamp(log(target/lum)/log(2), -3, 3)`. When off: returns the slider. Fallback if too slow: baked keyframe solve in the autozoom-solver style.

**Quality control**: effect `enabled` isn't expression-drivable, so a live QUAL slider would be dishonest. Panel **Quality dropdown (Draft/Normal/Full)** applied by script in one click: sets `resolutionFactor`, toggles `effect.enabled` on Glow/blurs/grain, toggles the DoF checkbox control, and zeroes CA RED/BLUE via a hidden QUAL slider their Opacity expressions read.

**Presets = maps of control values only** (no structural keys, by design), applied live by `applyPreset(name)` looping `setValue` over the null. 20 presets: Reading (Front, Move, Angle, Tilted, Warm Reading), Close-ups (Macro Extreme, Close Up Low, Pixel Peep), Angles (Sideways, Steep Side, Pan Down, Dutch Roll), Moves (Side Focus Pull, Handheld Drift, Slow Push, Focus Hunt), Stylized (Orbit Wide, Cool Night, Dusty Lens, Static Default). Seed values from v1's `presets.jsxinc`, re-tuned against renders in M5.

**Defaults read as macro photograph**: ON — Mosaic+stripes (amount ~70), glow, thin DoF (high aperture), auto zoom, distortion, subtle CA, vignette, grain, light dust, exposure. OFF (kept, one config flag away) — bezel + wrapper comp, ambient spill, glass sweep/smudge, backlight bleed, mura, viewing-angle falloff, scanlines.

**Safety**: every created comp gets `comp.comment = "ae:lcd-screen:v2"`; cleaner v2 deletes ONLY marker-tagged items (name match is a secondary AND-condition), reports removed names + errors into `last_run.json`, never silently swallows.

## Milestones (6 AE round-trips; commit after each)

Every milestone's build script ends by invoking the **`render_states.jsx` harness** (evolves `render_preview.jsx`): takes `[{name, overrides:{control:value}, time}]`, per state sets sliders → renders one frame to `Scripts/runs/preview/<milestone>_<name>.png` → restores values; writes the state↔settings map into `last_run.json`.

**M0 — Infra & safety (no AE run; verified during M1's run).**
Commit baseline first. Then: rewrite `examples/lcd-screen/lib/cleaner.jsxinc` (marker-tagged); make `Scripts/analyze/build_actions_index.jsx` pretty-print (2-space, stable key order) + regenerate `index.json`; author `runnerMeta` for the 14 new actions; build `render_states.jsx` + `lib/states.jsxinc`; ask user for optional reference stills; write a probe fragment into M1's setup that (a) verifies the cross-comp `toComp` expression by reading its output back through a slider into `last_run.json`, (b) dumps `ADBE CHANNEL MIXER` and `ADBE Exposure2` property match names/defaults (record findings in `Scripts/verified/gotchas.md`).

**M1 — Core macro image + live camera + live auto zoom.** Restructure `lib/build.jsxinc` to the new comp chain; expression camera in `lib/camera-rig.jsxinc`; single Scene instance in Master + live auto-zoom Scale; Optics Comp + Exposure on LENS; `lib/links.jsxinc` + full controls null. States: front-close, orbit25, tilt15+roll8, wide, density-3 vs density-12.
*Accept:* RGB stripe triplets resolvable at frame center in close states; density frames show visibly different pitch; orbit frame shows perspective convergence + soft far edge (thin DoF); **zero empty/transparent edge pixels in all frames**; probes confirm toComp + match names.

**M2 — Lens realism.** 3-instance Channel Mixer CA, base+radial blurs, vignette solid, grain, DUST layer. States: CA-0 vs CA-70, radial-on, dust density 10 vs 80 (equal strength), vignette heavy.
*Accept:* CA-0 frame color-identical to M1 baseline (ADD reconstruction exact); CA-70 fringing grows toward edges, none at center; dust frames differ in speck count at equal brightness; no compounding artifacts.

**M3 — Exposure, Auto Exposure, tint.** States: exposure −2/0/+2; auto-exposure over darkest and brightest source frames; tint warm/cool at 60.
*Accept:* correct stop sweep; auto-exposure frames land at comparable mid brightness from different source luminance; tint reads as white balance, not a wash over blacks.

**M4 — Animate Movements under auto zoom.** Tune motion ranges; render t = 0/2.5/5/7.5/10 s with target+angle+focus motion on.
*Accept:* framing drifts naturally between frames; focus breathing visible; **no empty edges at any sampled time** (the decisive test v1's bake failed).

**M5 — 20 live presets + panel v2.** Rewrite `presets.jsxinc` (slider-space) + `applyPreset`; rebuild panel: groups per the control table, slider+edittext pairs bound to the null, top row Build / Rebuild(structural) / Preset+Apply / Quality / Render Previews; delete "Rebuild Camera"; "Bake Auto Zoom (fallback)" only in an Advanced disclosure if the live expression failed M1. Render 8 representative preset frames.
*Accept:* each frame matches its one-line intent in the states spec; `last_run.json` confirms presets create zero comps (no rebuild).

**M6 — Quality dropdown, opt-in extras path, docs, contact sheet.** Verify bezel/glass/spill opt-in still builds; full 20-preset contact sheet at draft res; update `examples/lcd-screen/README.md` (accurate file tree, honest limitations), `examples/README.md`, install-example skill if paths changed.
*Accept:* Draft vs Full compositionally identical (fidelity only); bezel path doesn't break auto zoom.

## Risks & mitigations

1. **Cross-comp `toComp()` in expressions unverified in this repo** (highest risk — live auto zoom hinges on it). M1 probe reads it back; fallback = retained baked solver writing Master-layer Scale behind one panel button.
2. **Channel Mixer / Exposure2 match names unverified.** M1 probe dumps them; record in gotchas.md; CA fallback = v1's subtle Channel Blur mode.
3. **Per-frame sampleImage too slow for Auto Exposure.** Checkbox-gated; fallback baked keyframe solve.
4. **2D upscale softens pixels.** 1.5x oversample; density slider min 3 keeps stripes ≥2px post-scale.
5. **Master comp rename breaks cross-comp expressions.** Bake the name in at build; document; panel refresh detects broken expressions.
6. **Truncated preview PNGs misread as render bugs.** IEND poll is mandatory before every PNG read.
7. **Range traps (×2.55, 0–1).** All mappings live only in the links table; audit it against gotchas.md once.
8. **Cleaner data loss.** Marker tagging lands in M0, before any build runs.

## Verification (end-to-end)

- Per milestone: user runs one script → check `last_run.json` (`scriptName`, `status`, `diff`, probe values) → IEND-poll → read PNGs → judge against that milestone's acceptance list → user confirms look → commit.
- Failure modes to exercise before calling it done (M6): build twice in a row (no duplicate comps, cleaner removes only tagged); mismatched source aspect ratio; all optional toggles off; preset spam (apply 5 presets in a row, no drift/rebuild).
- ES3 everywhere (including expression code style); entry `.jsx` files ASCII-only; every script/panel wraps work in the `beginScript`/`writeResult` contract with caller-owned undo groups.
