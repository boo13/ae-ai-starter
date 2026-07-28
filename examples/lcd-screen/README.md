# LCD Screen v2

Turns a flat screen recording into a macro photograph of a physical LCD using only
native After Effects layers, effects, a 3D camera, and expressions.

This is a dockable **ScriptUI panel**, not a compiled `.aex` plug-in. After installation
it opens from **Window → LCD Screen v2**. The panel builds and controls an ordinary,
editable After Effects composition rig.

## Requirements

- After Effects 2026 or another version with the bundled Cycore effects
- An open project
- A screen recording or still image imported as footage
- **Allow Scripts to Write Files and Access Network** enabled in AE preferences

No npm install, package build, or third-party effect is required.

## Install the panel

Symlink the checked-in panel into the running AE version's ScriptUI Panels folder:

```bash
ln -sf "$PWD/examples/lcd-screen/lcd_screen_panel.jsx" \
  "/Applications/Adobe After Effects 2026/Scripts/ScriptUI Panels/LCD Screen v2.jsx"
```

Restart After Effects, then open **Window → LCD Screen v2**. During development the
symlink keeps the installed panel pointed at the repository, but AE still needs a restart
to reload panel code changed after launch.

The one-off builder remains available at `setup.jsx` through
**File → Scripts → Run Script File…**.

## Quick start

1. Import a screen recording and select it in the Project panel.
2. Open **Window → LCD Screen v2**.
3. Select the footage under **Source** and click **Build**.
4. Choose a preset and click **Apply**.
5. Adjust the live Camera, Focus, Pixels, Color, and Motion controls.

Use **Rebuild Structure** only after changing config-time extras or switching the source.
Camera framing, focus, pixels, lens treatment, exposure, and presets do not require a
rebuild.

## What gets built

The default build creates five marker-owned comps:

```text
LCD_Content
  └─ isolated source footage
LCD_Panel
  ├─ live Mosaic pixel pitch
  ├─ RGB subpixel pattern
  ├─ glow
  └─ tint
LCD_SubpixelPattern
  └─ hidden reference-pitch RGB pattern
LCD_Scene
  ├─ LCD_Panel as a 3D layer
  └─ expression-driven camera
LCD Master
  ├─ isolated red, green, and blue LCD_Scene layers
  ├─ lens-space dust
  ├─ distortion, blur, exposure, and grain
  ├─ vignette
  └─ LCD CONTROLS
```

When bezel or ambient spill is enabled, a sixth `LCD_Screen` wrapper sits between
`LCD_Panel` and `LCD_Scene`. Auto Zoom solves against that wrapper, so the physical frame
remains covered during camera motion.

Every managed comp carries the marker `ae:lcd-screen:v2`. Rebuilds delete only marked
items with exact managed names; an unrelated comp that happens to share a name is reported
as a conflict and left untouched.

## Live controls

`LCD CONTROLS` is the single source of truth for 36 values:

| Group | Controls |
|---|---|
| Camera | Distance, Orbit, Tilt, Roll, Zoom |
| Target | Target X, Target Y |
| Focus | Focus Offset, Depth of Field, Aperture |
| Framing | Auto Zoom, Padding |
| Blur | Base Blur, Radial Blur |
| Pixels | Pixel Density, Pixel Amount, Glow, Glow Threshold |
| Lens | Distortion, Chromatic Aberration, Vignette, Grain, Dust Strength, Dust Density |
| Color | Tint Color, Tint Amount, Exposure, Auto Exposure |
| Motion | Target, angle, and focus amount/speed plus Seed |

The panel binds sliders and numeric fields directly to this null. Live Auto Zoom runs on
the three outer scene layers, so it follows camera and handheld expressions without a
bake or self-reference cycle.

## Quality modes

Quality is applied by the panel because AE does not allow expressions to drive an
effect's enabled state or a comp's `resolutionFactor`.

| Mode | Resolution | Treatment |
|---|---:|---|
| Draft | Quarter | Single reconstructed color pass; DoF, glow, blurs, grain, and CA disabled |
| Normal | Half | DoF, glow, blurs, and CA enabled; grain disabled |
| Full | Full | Complete treatment |

Changing quality affects fidelity and speed, not framing or the underlying preset.

## Presets

All 20 presets are maps of the 35 live visual control values. Applying one never creates,
removes, or rebuilds a composition, and it preserves the selected quality mode.

- Reading: Reading Front, Reading Move, Reading Angle, Reading Tilted, Warm Reading
- Close-up: Macro Extreme, Close Up Low, Pixel Peep
- Angles: Sideways, Steep Side, Pan Down, Dutch Roll
- Motion: Side Focus Pull, Handheld Drift, Slow Push, Focus Hunt
- Stylized: Orbit Wide, Cool Night, Dusty Lens, Static Default

Each application resets all 35 visual controls to the shared baseline before applying the
named overrides, so preset order does not cause drift.

## Optional physical-screen extras

Perfect Screen-style camera and lens behavior is the default. The older physical-monitor
features remain available as an explicit config-time path in `example_config.jsxinc`:

```javascript
EXTRAS_ENABLED: true,
BEZEL_ENABLED: true,
AMBIENT_SPILL_ENABLED: true,
GLASS_ENABLED: true
```

Backlight bleed, viewing-angle falloff, and scanlines have their own flags. Extras are
off by default because bezel, reflections, scanlines, and panel bleed are different
creative choices from a pure macro-camera treatment.

After changing these flags, use **Rebuild Structure**.

## Validation

`verify_m6.jsx` is the final acceptance harness. It:

- renders a Full/Draft comparison;
- renders all 20 presets at Draft resolution;
- applies five presets in sequence and proves they create zero comps;
- rebuilds with all optional defaults off;
- builds a portrait source through the bezel/glass/ambient-spill path;
- verifies Auto Zoom on the six-comp wrapper;
- restores the normal five-comp default build.

Run it through **File → Scripts → Run Script File…**. Reports go to
`Scripts/runs/last_run.json`; PNGs go to `Scripts/runs/preview/`.

## Files

```text
examples/lcd-screen/
├── README.md
├── example_config.jsxinc
├── presets.jsxinc
├── setup.jsx
├── verify_m6.jsx
├── render_states.jsx
├── render_preview.jsx
├── lcd_screen_panel.jsx
└── lib/
    ├── autozoom.jsxinc
    ├── build.jsxinc
    ├── camera-rig.jsxinc
    ├── cleaner.jsxinc
    ├── content-comp.jsxinc
    ├── lens-stack.jsxinc
    ├── links.jsxinc
    ├── probes.jsxinc
    ├── quality.jsxinc
    ├── rig.jsxinc
    ├── screen-comp.jsxinc
    └── states.jsxinc
```

## Limitations

- This is an editable native-AE approximation, not ProductionCrate's GPU implementation.
- Auto Exposure uses `sampleImage()` on the ungraded green scene pass and can be slower
  than manual exposure on long or high-resolution comps.
- Renaming `LCD Master`, `LCD_Scene`, or `LCD CONTROLS` after building breaks expressions
  that intentionally reference those names.
- The RGB stripe overlay is procedural and can alias differently across preview zoom
  levels; judge it at 100% or in a render.
- Glass extras use effects bundled with standard AE/Cycore installations. If an
  installation omits those effects, leave `GLASS_ENABLED` off.
- The reliability diff cannot see changes inside nested precomps; the acceptance PNGs
  are the visual verification source.
