# Glitch Intro Action — Implementation Notes

Issues encountered converting the tutorial to a runnable action, in order of severity.

---

## Custom Code Written (no existing action covered it)

### `addLayerFromItem` — adding a comp/footage as a layer
Now a proper block action at `Scripts/lib/actions/layer/layer_from_item.jsxinc`.
`_gi_addItemLayer` in the preset delegates to it. Supports `inPoint`, `duration`,
`blendingMode`, `opacity`, and `preserveTransparency` in a single call.

### `_gi_applyHoldFlicker` — building timed hold-keyframe arrays
The `setKeyframes` action supports `easing: "hold"` but has no helper for generating
evenly-spaced flicker timing arrays from a frame interval. Wrote a small private helper.
Could become a reusable block: `addHoldFlicker(layer, { interval: 2/fps, duration: 4 })`.

### Triangle positions and sizes
The tutorial gives no coordinates. Guessed outerRadius values (28, 65, 800, 520px) and
positions relative to comp center. These are almost certainly wrong for a real project
and need manual adjustment. A `analysis.json` with the comp's existing layers would have
helped place triangles relative to real artwork bounds.

### `layer.preserveTransparency = true`
No existing action sets this. Inlined the property assignment. If the property name is
wrong it fails silently (try/catch). A dedicated block or a flag on `addLayerFromItem`
would make this reliable.

---

## Uncertain Changes (flagged inline with `// UNCERTAIN:` comments)

### Effect match names — most critical

| Effect | Used match name | Confidence | Notes |
|--------|----------------|------------|-------|
| Fractal Noise | `ADBE Fractal Noise` | High | Standard |
| Displacement Map | `ADBE Displacement Map` | High | Standard |
| Fill | `ADBE Fill` | High | Standard |
| Colorama | `ADBE Colorama` | Medium | Applied OK; input layer wiring is uncertain |
| **Posterize Time** | `ADBE Posterize` | **Low** | This is the *color* Posterize. Time > Posterize Time likely uses `ADBE PosterizeTime`. If the wrong effect appears, delete it and apply manually. |
| **CC Ball Action** | `CC Ball Action` | **Low** | Cycore effects don't use ADBE prefix. May be `CS Ball Action` or version-suffixed. Apply manually if script fails: Effects > Simulation > CC Ball Action. |
| Glow (×2) | `ADBE Glo2` | High | Built-in Stylize > Glow. Applied twice — wide ambient + tight core to approximate Deep Glow's soft bloom. |

### Fractal Noise sub-property match names
AE doesn't publish index-based ADBE match names for effect sub-properties. Used display
names (`"Noise Type"`, `"Scale Width"`, `"Evolution"`, `"Brightness"`, `"Contrast"`) via
`effect.property(displayName)`. This works in most AE versions but can break on localized
installs or renamed effects. If properties silently fail, adjust manually.

### Noise Type enum values
The tutorial specifies "Block" noise for the texture comp and "Soft Linear" for the wipe.
Used integer enum values `3` (Block) and `0` (Soft Linear) — these are guesses based on
the order they appear in the AE UI dropdown. Verify and correct manually.

### Displacement Map "Use For Horizontal/Vertical Displacement" enum
Set to integer `1` assuming Luminance. The actual enum may differ by AE version.

### Colorama input layer wiring
Colorama's "Get Phase From" layer reference is nested under `"Input Phase"` > `"Get Phase From"`.
The exact property path in ExtendScript is undocumented in public references. The code
attempts `coloramaFx.property("Input Phase").property("Get Phase From").setValue(idx)`.
This is expected to fail in some AE versions. **Set the fractal layer source manually
after running the script.**

### `TrackMatteType.LUMA` vs `LUMA_INVERTED`
The logo top layer uses `TrackMatteType.LUMA`. Whether black areas of the fractal matte
create holes (correct) or the inverse depends on the fractal's tonal range. The code
falls back to `LUMA_INVERTED` if `LUMA` throws. Confirm visually — toggle between the
two if the logo is fully transparent instead of partially punched.

### `BlendingMode.STENCIL_LUMA`
Used for the fractal wipe layer. This is a standard ExtendScript constant and should
be correct, but confirm if the blend mode appears as "Stencil Luma" in the AE layer panel.

---

## Context That Would Have Enabled One-Shot Confidence

1. **`analysis.json` with comp dimensions and existing layer list** — would let me place
   triangles relative to real artwork bounds instead of guessing comp-center positions.

2. **An effect match-name reference** — a local lookup table of `displayName → matchName`
   for common AE effects (especially Posterize Time, CC suite, and third-party plugins).
   This would replace every "UNCERTAIN" comment on effect match names.

3. **A `addLayerFromItem` block action** — adding a project item (comp or footage) to
   another comp with inPoint/duration control is the most common operation in multi-comp
   builds. Without it, every usage is inlined raw ExtendScript.

4. **Known third-party plugin match names** — Deep Glow, Deep Glow's exact property
   names (Glow Radius, Falloff, Alpha mode). Without this, the Deep Glow step is
   effectively a no-op and must be applied manually.

5. **Triangle layout spec** — the tutorial describes 4 triangles but gives no positions,
   sizes, or rotations. Even rough pixel values (e.g. "cursor triangle is ~50×50px,
   positioned 20% from center") would have made the geometry scriptable with confidence.
