# LCD Screen

Turns a flat screen recording into a photoreal shot of a physical LCD monitor — a
native-AE, ExtendScript-only alternative to
[ProductionCrate Perfect Screen](https://www.productioncrate.com/plugins/perfect-screen).

## Why this isn't just a clone

Perfect Screen is a compiled GPU plugin that simulates a **camera looking at a flat
panel**: 3D framing, depth of field with focus pull, lens distortion, chromatic
aberration, vignette, surface dust, backlight tinting, Auto Zoom, Auto Exposure, and
keyframe-free "Animate Movements." It has **no bezel, no monitor body, no glass
reflections, no scanlines, no backlight bleed, no viewing-angle falloff, and no
screen-off state** — those live in ProductionCrate's separate CRT Factory product, or
aren't attempted at all.

This example builds a superset: everything Perfect Screen does (via a real AE 3D camera
+ native effects), plus the physical-monitor layer it skips.

| Perfect Screen feature | This example |
|---|---|
| 3D camera + look-at target | Real AE camera, Point of Interest |
| Depth of field + focus pull | Camera's native Aperture/Focus Distance |
| Optic distortion (glass bulge) | `Scripts/lib/actions/effects/lens_distortion.jsxinc` (Optics Compensation) |
| Chromatic aberration | `chromatic_aberration.jsxinc` ("subtle" mode here — see Known limitations) |
| Vignette | `vignette.jsxinc` (native, no third-party dependency) |
| Auto Zoom | `lib/autozoom.jsxinc` (script-side bake, see below) |
| Auto Exposure | **Not implemented** — would need a `sampleImage()` pass per frame |
| Keyframe-free motion | Seeded `wiggle()` on camera Point of Interest / Orientation / Focus Distance |
| — (not in Perfect Screen) | RGB subpixel grid, scanlines, monitor bezel + rounded corners, glass reflections/dust/smudges, backlight bleed + tint, viewing-angle falloff, ambient light spill |

## Prerequisites

- After Effects with a project open
- A screen-recording footage item imported into the project (any video or image)

## Setup

1. Import your screen recording into the AE project.
2. Open `example_config.jsxinc` and adjust `SOURCE_ITEM_NAME` (or leave `null` to use
   the item selected in the Project panel), plus `PRESET` if you want to start from one
   of the 16 in `presets.jsxinc`.
3. Run `setup.jsx` via **File → Scripts → Run Script File**.
4. Open the built comp (name from `MASTER_COMP_NAME`, default `"LCD Screen Master"`) and
   press spacebar to preview.

For interactive tweaking instead of editing the config file, install the dockable panel
(`lcd_screen_panel.jsx`) — ask Claude to "install example lcd-screen" for guided setup,
or symlink it manually the same way as `Scripts/panel/*.jsx`.

## What gets built

```
LCD_Content   raw footage, isolated so subpixel pitch math is computed from the real
              source resolution
LCD_Panel     content + full physical-panel treatment (addLcdScreen compound):
              glow, subpixel grid, scanlines, viewing-angle falloff, backlight tint,
              backlight bleed + mura, glass surface (dust/smudge/sheen/sweep), vignette
LCD_Screen    LCD_Panel as one layer (so the rounded-corner mask clips everything in a
              single pass) + bezel frame + ambient light spill onto "surroundings"
<Master>      LCD_Screen as a 3D layer + real AE camera (orbit/tilt/distance/zoom,
              native Depth of Field) + LENS adjustment layer (distortion, chromatic
              aberration, grain) + the LCD CONTROLS expression rig
```

## Live vs. config-time controls

The **LCD CONTROLS** null (on the master comp) carries ~20 expression-linked
controls — tweak these directly in the Effect Controls panel, or via the panel's
**Live Controls** section, and the render updates immediately, no rebuild:

Lens Distortion, Chromatic Aberration, Vignette, Bloom, Bloom Threshold, Grain,
Subpixel Amount, Scanline Amount, Backlight Tint, Backlight Bleed, Panel Mura,
Viewing Angle Falloff, Glass Reflection, Ambient Spill, Aperture (DoF).

**Config-time only** (edit `example_config.jsxinc`, re-run `setup.jsx` or the panel's
Build button): subpixel mode/pixel size, scanline pitch/roll-bar, bezel geometry/color,
dust/smudge amounts, backlight tint color preset, procedural motion amounts, and camera
framing (distance/orbit/tilt/zoom — see below).

Camera framing has its own **Rebuild Camera** button rather than a live expression link,
because its 3D position math feeds the Auto Zoom bake — see `lib/autozoom.jsxinc` for
why a live expression there would be self-referential.

## Auto Zoom

Perfect Screen's Auto Zoom solves, per frame, the minimum scale that keeps the tilted
panel filling the frame with no transparent edges. This example computes the same thing
but as a **script-side bake**, not a live expression: an invisible "ghost" duplicate of
the screen layer (unparented, so it isn't affected by the very scale being computed)
gets projected through the camera, and the result is written onto an `AUTO ZOOM` parent
null. Re-run the panel's **Bake Auto Zoom** button after changing camera framing.

Two details are easy to get wrong here:

- **`toComp()` is expression-only.** `AVLayer` has no `toComp` scripting method, so the
  projection is read through temporary Point3D Controls carrying a `toComp()` expression,
  sampled with `valueAtTime()` — the same bridge
  `Scripts/lib/actions/utility/calculate_distance_between_layers.jsxinc` uses.
- **A bounding box isn't enough.** Under perspective the projected panel is a trapezoid,
  so its axis-aligned bbox can cover the frame while a slanted edge still cuts a
  transparent wedge out of a corner. The solver tests each frame corner against the
  quad's actual edges instead, iterating because the projected expansion isn't linear in
  the layer's scale.

When the camera doesn't move, the required scale is constant, so a single static value is
written rather than one keyframe per frame.

## Presets

16 in `presets.jsxinc`. The first 11 match Perfect Screen's own named presets (the only
11 of its 20 that are publicly documented): Static Default, Static Tinted, Reading
Front, Reading Move, Reading Angle, Reading Tilted, Side Focus Pull, Close Up Low,
Sideways, Pan Down, Orbit Wides. The last 5 are original presets exercising the panel
half Perfect Screen doesn't have: Retro LCD, OLED Night, Desk Setup, Kiosk, Screen Off.

## Re-running

`setup.jsx` (and the panel's Build button) call `cleanLcdScreen()` first, which removes
every `LCD_*` comp by exact name — safe to re-run after changing the config or picking a
different preset.

## New reusable actions

This example promoted its building blocks into the shared action library rather than
keeping them example-local — any project in this repo can use them. See
`Scripts/lib/actions/index.json` (categories `effect` and `scene`) for the full list:
`subpixel_grid`, `scanlines`, `backlight_tint`, `backlight_bleed`,
`viewing_angle_falloff`, `vignette`, `screen_glow`, `bezel`, `glass_surface`,
`ambient_spill`, `lens_distortion`, `chromatic_aberration`, `depth_of_field_rake`, and
the `presets/lcd_screen.jsxinc` compound that composes the panel-tier ones.

## File structure

```
examples/lcd-screen/
├── README.md
├── example_config.jsxinc      Copy + adjust to taste
├── presets.jsxinc             16 named presets, merged over the config
├── setup.jsx                  Entry point (File > Scripts > Run Script File)
├── render_preview.jsx         Saves preview PNGs to Scripts/runs/preview/
├── lcd_screen_panel.jsx       Dockable panel: Build, Camera, Live Controls, Render
└── lib/
    ├── build.jsxinc           Shared orchestrator (used by setup.jsx and the panel)
    ├── cleaner.jsxinc         Removes previous LCD_* comps
    ├── content-comp.jsxinc    Wraps raw footage
    ├── screen-comp.jsxinc     Panel treatment + bezel + spill
    ├── camera-rig.jsxinc      Master comp, 3D camera, procedural motion
    ├── autozoom.jsxinc        Auto Zoom projection + bake
    ├── lens-stack.jsxinc      Distortion + chromatic aberration + grain
    └── rig.jsxinc             LCD CONTROLS expression rig + linking
```

## Known limitations

- Chromatic aberration's "lens" mode (three tinted, scale-offset duplicates) **cannot be
  used on this example's `LENS` adjustment layer**: an adjustment layer re-processes the
  whole composite beneath it, so three duplicates would apply lens distortion and grain
  four times over. `LENS_CA_MODE` is therefore `"subtle"` (Channel Blur) here, and
  `addChromaticAberration` now throws if `"lens"` is aimed at an adjustment layer. Getting
  the duplicate-based look would mean precomposing the camera render into a single 2D
  layer first — not attempted in this build.
- The subpixel grid's registration technique is a documented approximation, not a
  photoreal render — see the `@note` tags in the relevant action files under
  `Scripts/lib/actions/effects/`.
- Auto Exposure is **not** implemented (it needs a `sampleImage` pass per frame). The
  feature table below lists it as a Perfect Screen feature, not as one of this example's.
- Effect enum values that couldn't be verified against `Scripts/verified/effects/` (a
  couple of camera property match names) are set defensively and won't abort the build
  if AE rejects them — see the inline comments in `lib/camera-rig.jsxinc` and
  `lib/rig.jsxinc`.
- Dust/smudge amounts on the glass layer are config-time only in this build (not rig-
  linked); only the sweep/sheen "Glass Reflection" control is live.
