# AE Scripting Gotchas (Verified)

Runtime pitfalls discovered empirically. Read this before writing ExtendScript
that touches effects, expressions, or layer properties.

## Non-ASCII Characters in .jsx Files

ExtendScript's parser rejects files containing non-ASCII characters. The file
will not appear in AE's File > Scripts > Run Script File dialog at all -- no
error, it simply doesn't load.

Common offenders: em dashes (`--` the Unicode U+2014 kind), curly quotes,
accented characters, or any multi-byte UTF-8 sequences.

**Fix:** Use only ASCII in `.jsx` files. Use `--` instead of em dashes, straight
quotes instead of curly quotes. Verify with:

```bash
LC_ALL=C tr -d '[:print:][:space:]' < script.jsx | wc -c
# Should output 0
```

## Layer Index Shifting

Adding a layer via `addSolid()`, `addShape()`, etc. inserts at the TOP of the
layer stack (index 1), pushing all existing layers down by one. If you looked up
a layer's index BEFORE adding a new layer, that index is now stale.

**Fix:** Always look up layer indices by name AFTER all layer creation is complete.

```javascript
// WRONG — audioIdx is stale after addSolid:
var audioIdx = comp.layer("Audio").index;
var solid = comp.layers.addSolid(...);
fx.property("ADBE AudSpect-0001").setValue(audioIdx); // off by 1!

// RIGHT — re-lookup after adding:
var solid = comp.layers.addSolid(...);
var audioIdx = comp.layer("Audio").index;
fx.property("ADBE AudSpect-0001").setValue(audioIdx); // correct
```

## Expression Engine vs Script Engine

Two different JavaScript engines are in play:

- `.jsx` scripts run in **ExtendScript (ES3)**: `var` only, no arrow functions,
  no template literals, no destructuring.
- Expressions (assigned to `.expression` properties) run in **AE's JavaScript
  engine (ES6+)** by default since AE CC 2019.

Expressions could use `const`/`let`, but use `var` everywhere for compatibility
with users who have switched their project to the legacy ExtendScript expression
engine (Project Settings > Expressions > Expression Engine).

## sampleImage() Behavior

```
sampleImage(point, radius, postEffect, time)
```

- `postEffect=true` (default) samples AFTER all effects on the sampled layer
- Only applies to effects directly on the sampled layer — adjustment layers
  above are NOT included in the sample
- `sampleImage()` reads the layer's internal render buffer, not the composited
  frame — it works the same whether the layer is visible or hidden

**Guide layers:** VERIFIED -- `sampleImage()` returns the same results regardless
of whether the sampled layer has `guideLayer = true` or `false`. Guide layer mode
does NOT prevent `sampleImage()` from reading pixel data. (Tested via
audio-spectrum `diagnose.jsx`, 2026-03-13.)

## setValue() Type Mismatches

`setValue()` often silently accepts wrong-length arrays without erroring:

- RGBA properties (Inside Color, Outside Color) need **4-element** arrays `[r,g,b,a]`
- Setting a 3-element `[r,g,b]` on a 4-element property may silently succeed
  but produce unexpected visual results (e.g., alpha = 0 = invisible)

**Fix:** Always check the verified JSON for the property's `valueType` before
calling `setValue()`.

## Effect Enum Values

Many AE effect enum properties are **1-indexed**, not 0-indexed. Do not assume
0-based indexing.

**Example:** Audio Spectrum Display Options:
- `1` = Digital
- `2` = Analog Lines
- `3` = Analog Dots

**Fix:** Always check enum values in the verified effect JSON. If the effect
hasn't been discovered yet, test empirically before writing code.

**Enum integers are not contiguous, and an index from one effect never transfers
to another.** Photo Filter's "Custom" is `20`, not the `2` you would get by
counting; `2` is "Warming Filter (81)". Glow's "Screen" operation is `6`, not the
`2` that a blending-mode list would suggest -- `2` is "Normal". Optics
Compensation's Resize looks like a checkbox but is a 4-value enum
(1=Off, 2=Max 2X, 3=Max 4X, 4=Unlimited), so writing `0` for "off" is out of
range. Levels (`ADBE Easy Levels2`) Gamma is `-0005`; `-0006` is Output Black,
and a plausible gamma value written there blows the image out to near-white.
Read the map in `effects/calibration/<effect>.json` for the specific effect --
never reuse an index or an integer that worked on a similar-looking one.

**Reading dropdown labels.** Never guess which integer a named option maps to
(e.g. Fractal Type "Dynamic", CC Toner "Pentone"). On **AE 26.0+**, labels are
readable via `Property.propertyParameters` (all item strings) and
`Property.valueText` (current selection); `tools/extract_enums.jsx` uses them to
build label→integer maps for the whole catalog automatically. On older AE the
labels are not scriptable — fall back to `tools/calibrate_effect.jsx` (manual).
Verified maps land in `effects/calibration/`.

**Some controls only write unreadable CUSTOM_VALUE blobs.** A control whose value
type is `CUSTOM_VALUE` cannot be read or set via scripting. Lumetri Color's
Creative Look (data lives in `LookAsset`, CUSTOM_VALUE), curves, color wheels, and
Split Toning are all CUSTOM_VALUE — they are **not scriptable**. Do not fabricate
a numeric assignment for them; report them as unsupported and have the user set
them manually.

## setTemporalEaseAtKey Ease-Array Arity

AE throws `Unable to call "setTemporalEaseAtKey" because of parameter 2. Value
array does not have N elements.` when the in/out ease arrays have the wrong
length. Use one `KeyframeEase` object per value dimension, except for spatial
properties such as Position and Anchor Point, which take exactly one
`KeyframeEase` per side regardless of dimensions. (Verified empirically in live
AE 2026 via the ae-ai-chat panel error log, 2026-07-12.)

**Fix:** Build both ease arrays with a dimension-safe ES3 helper:

```javascript
function easeArray(prop, speed, influence) {
  var n = prop.isSpatial ? 1 : (prop.value instanceof Array ? prop.value.length : 1);
  var arr = [];
  for (var i = 0; i < n; i++) arr.push(new KeyframeEase(speed, influence));
  return arr;
}
```

## addProperty() Invalidates Sibling References

After calling `addProperty()` on a shape-layer group, such as adding a Stroke
after an Ellipse Path, previously obtained references to sibling properties in
that group can become stale. Touching them throws `ReferenceError: Object is
invalid`. (Verified empirically in live AE 2026 via the ae-ai-chat panel error
log, 2026-07-12.)

**Fix:** Set each property's values immediately after its `addProperty()` call,
or re-fetch references by match name after all `addProperty()` calls are done.
Never hold a reference across a later `addProperty()` on the same group.

## CC Star Burst Uses Source Pixels

CC Star Burst scatters the source layer's pixels as star particles. Applied to a
black solid, it renders invisibly as black stars on black. (Verified empirically
in live AE 2026 via the ae-ai-chat panel error log, 2026-07-12.)

**Fix:** Apply CC Star Burst to a white solid, then tint it with the Tint effect
if colored stars are needed. Never apply it to a black solid.

## Percent-Styled Sliders Can Be 0-1 Fractions

CC Toner's "Blend w. Original" (`CC Toner-0004`) takes a 0-1 fraction via
scripting even though the UI displays a percent. `setValue(65)` throws
`Unable to call "setValue" because of parameter 1. Value 65 out of range 0 to
1.` and aborts the whole script. (Verified empirically in live AE 2026 via the
ae-ai-chat panel error log, 2026-07-12.)

**Fix:** Write UI percents as fractions for CC Toner: 65% -> `setValue(0.65)`.
If any percent-styled slider throws "out of range 0 to 1", divide the value
by 100.

Levels (`ADBE Easy Levels2`) channel values (Input/Output Black/White) are the
same: normalized 0-1 in scripting (defaults 0 and 1) even though the UI shows
0-255 (8-bpc) or 0-32768 (16-bpc). Writing `30000` throws `out of range -10000
to 10000`; smaller UI-scale values silently produce garbage. Divide 16-bpc UI
values by 32768 (e.g. 30000 -> 0.916).

Threshold (`ADBE Threshold2-0001`, default 0.5) and Camera Lens Blur's Highlight
Threshold (`ADBE Camera Lens Blur-0018`, default 0.8) are the same: normalized
0-1 in scripting while the UI shows 0-255 / 0-100. A `240` or `90` written there
throws and, inside a `try/catch`, leaves the control at its default with no sign
anything went wrong. **The default value in the verified JSON is the tell** -- a
default of `0.5` or `0.8` on a control the UI shows as a percent means the
scripting range is 0-1.

Glow (`ADBE Glo2`) "Glow Threshold" (`ADBE Glo2-0002`) is the opposite trap:
the UI shows a percent but scripting stores 0-255 (default 153 = 60%). Writing
a UI percent like `50` sets the threshold to ~20% and blooms the whole frame
into milk. Multiply UI percents by 2.55.

## saveFrameToPng() Returns Before the File Is Written

`comp.saveFrameToPng(time, file)` queues the render and returns immediately;
AE keeps writing the PNG for seconds afterward (longer for effect-heavy
comps). Reading the file too early yields a truncated image -- typically the
bottom of the frame is solid white with a razor-straight edge, which is easy
to misread as a rendering bug in an effect. (Verified empirically in live AE
2026, 2026-07-12: the same frame produced a "flooded" and a clean image
depending only on read timing.)

**Fix:** Poll until the file ends with the PNG `IEND` trailer before reading:

```bash
for i in {1..120}; do
  tail -c 8 frame.png | LC_ALL=C grep -qa IEND && break
  sleep 0.5
done
```

## Variable Font Axes Are Not Added by Match-Name

`animatorProps.addProperty("ADBE Text VF Axis 1")` throws `Can not add a
property with name "ADBE Text VF Axis 1" to this PropertyGroup.` The eight
`ADBE Text VF Axis 1-8` slots visible in the property tree are display-only --
they cannot be created via `addProperty()`. (Verified empirically in live AE
2026 via the ae-ai-chat panel error log, 2026-07-21.)

**Fix:** Use the AE 26.0+ scripting method instead, called on
`"ADBE Text Animator Properties"` within a text animator:

```javascript
var animatorProps = animator.property("ADBE Text Animator Properties");
var axis = animatorProps.addVariableFontAxis("wght"); // "wdth","slnt","ital","opsz"
axis.setValueAtTime(0, 100);
axis.setValueAtTime(2, 900);
```

The returned property holds the axis's **absolute** value (e.g. weight
100-900), not an offset from the base font. The layer's font must actually be
a variable font exposing that axis, or `addVariableFontAxis()` throws --
check `doc.fontObject.hasDesignAxes` / `designAxesData` first, or wrap the
call in try/catch per axis. As with any `addProperty()` call, fully keyframe
each axis before adding the next -- see "addProperty() Invalidates Sibling
References" above.

## Variable Font Axis Keyframes Must Stay Inside designAxesData Range

A naive "animate from half the current value" guess (`target * 0.5`) can write
a keyframe **below the font's real axis minimum**. Example: BricolageGrotesque
reports `wdth` range 75-100; a text layer at width 100 halved to 50 is an
invalid design-space coordinate for that font. AE appeared to crash shortly
after scrubbing/editing a keyframe holding such an out-of-range value
(observed empirically via the ae-ai-chat panel, 2026-07-21; not reproduced
from a captured crash log, so treat as a strong correlation rather than a
proven root cause).

**Fix:** Never guess a fraction of the current value. Read the font's real
range first and clamp to it:

```javascript
var fontObj = doc.fontObject; // AE 24.0+
if (!fontObj && app.fonts.getFontsByPostScriptName) {
  var matches = app.fonts.getFontsByPostScriptName(doc.font);
  if (matches.length) fontObj = matches[0];
}
var range; // { min, max } for the tag, e.g. "wdth"
for (var i = 0; i < fontObj.designAxesData.length; i++) {
  if (fontObj.designAxesData[i].tag === tag) range = fontObj.designAxesData[i];
}
var low = Math.max(range.min, Math.min(range.max, target * 0.5));
if (low >= target) low = range.min;
```

If `designAxesData` is unavailable, fall back to the axis property's own
`minValue`/`maxValue` -- never a blind `* 0.5` with no floor.

## toComp() / toWorld() Are Expression-Only

`AVLayer` has **no** `toComp`, `toWorld`, `fromComp`, or `fromWorld` scripting
method. Adobe's AVLayer method list does not include them -- they exist only in
the expression language. Calling `layer.toComp(point, time)` from a `.jsx` throws
`undefined is not a function` and aborts the script. (Found in the lcd-screen
auto-zoom bake, 2026-07-25.)

**Fix:** Bridge through a temporary expression control, the pattern already used
by `Scripts/lib/actions/utility/calculate_distance_between_layers.jsxinc`: add a
Point3D Control, give it a `toComp()` expression, read the value, remove it.

```javascript
var ctrl = layer.property("ADBE Effect Parade").addProperty("ADBE Point3D Control");
ctrl.property(1).expression = "toComp([0, 0, 0])"; // toComp is in scope on the layer itself
var projected = ctrl.property(1).valueAtTime(t, false); // false = post-expression
ctrl.remove();
```

`valueAtTime(t, false)` re-evaluates the expression at any time, so one control
can be sampled across every frame instead of one per frame. For a 3D layer the
result includes the active camera's projection.

## Mask Vertices Are in Layer Space, Not Comp Space

`ADBE Mask Shape` coordinates are relative to the **layer's own** source bounds
(origin at its top-left, extending to source width/height), not the composition.
Passing comp coordinates to a layer whose source is smaller than the comp offsets
the mask by exactly the difference -- a rounded-corner crop lands off-centre and
clips one edge while missing the opposite one.

**Fix:** Build the rect from the layer's source dimensions:

```javascript
var srcW = layer.source.width, srcH = layer.source.height;
var rect = [(srcW - w) / 2, (srcH - h) / 2, w, h]; // centred in LAYER space
```

## Shape Fills Default to Non-Zero Winding

A shape group with one closed path and a Fill renders **solid**. Adding a second,
inner path does not automatically cut a hole: `ADBE Vector Fill Rule` defaults to
`1` (Non-Zero Winding), which fills both. A "frame" built this way is an opaque
rectangle sitting on top of whatever it was supposed to frame.

**Fix:** Add both paths to the same Vectors Group, then set the fill's rule to
Even-Odd:

```javascript
fill.property("ADBE Vector Fill Rule").setValue(2); // 2 = Even-Odd
```

## Fractal Noise Ignores Scale Width/Height Unless Uniform Scaling Is Off

`ADBE Fractal Noise-0009` ("Uniform Scaling") defaults to **on**, in which case
`Scale` (`-0010`) drives both axes and writes to `Scale Width` (`-0011`) /
`Scale Height` (`-0012`) are silently ignored -- no error, just the default 100.

**Fix:** `fractal.property("ADBE Fractal Noise-0009").setValue(0);` before setting
either axis.

## Motion Tile Percentages Are Relative to the Layer

`ADBE Tile`'s Tile Width/Height **and** Output Width/Height are percentages of the
layer, not the comp. Tiling a 6px cell across a 1920px comp therefore needs an
Output Width of ~32000%, which is outside the property's range: `setValue` throws,
and if the call is wrapped in a `try/catch` the result is one unreplicated cell
sitting in the middle of the frame.

**Fix:** Make the tiled layer comp-sized and put the pattern in a small region of
it, then set Tile Center/Tile Width to that region and leave Output at 100%. Every
percentage stays inside 0-100.

## Duplicating an Adjustment Layer Compounds Its Effects

An adjustment layer processes the live composite of everything beneath it. Three
duplicates of an adjustment layer are four adjustment layers stacked, so every
effect already on it (lens distortion, grain, blur) is applied to the whole frame
once per copy. Any "duplicate the layer N times and blend" technique -- channel-
split chromatic aberration, prism effects, glow stacking -- is only valid on a
normal footage/precomp layer.

**Fix:** Guard the block: `if (layer.adjustmentLayer) throw ...`, and use a
single-effect route (e.g. Channel Blur for CA) on adjustment layers.

## thisComp Does Not Reach a Parent Comp's Layers

In an expression on a layer inside a nested comp, `thisComp` is the **nested**
comp. A control rig whose null lives in the master comp is invisible to it, so
`thisComp.layer("CONTROLS")` silently fails on every nested-comp property -- which
is most of them in a multi-comp build.

**Fix:** Scope by name from the nested side, and keep `thisComp` only for layers
that genuinely sit in the same comp as the null:

```javascript
'comp("Master Comp").layer("CONTROLS").effect("Amount")("Slider")'
```

Referencing an outer comp from an inner one is not a cycle as long as the target
is a plain control value that does not itself depend on the nested comp's render.

The same scope trap applies to any "bake every expression before render" pass: a
walk over `comp.numLayers` only reaches the master comp. Recurse into
`layer.source` when it is a `CompItem` (with a visited set) or the nested-comp
expressions are left live.

## Cross-Comp toComp() Works in Expressions

An expression can resolve a layer in another comp and call `toComp()` on it:

```javascript
comp("LCD_Scene").layer("LCD PANEL 3D").toComp([0, 0, 0])[0]
```

Verified in After Effects 26.3 on 2026-07-26. The LCD v2 probe returned the
expected scene-center X value of `1440` with no expression error. This does not
change the scripting limitation above; `.jsx` code still needs an expression
bridge.

## Channel Mixer and Exposure2 Property IDs

Verified in After Effects 26.3 on 2026-07-26:

- Channel Mixer is `ADBE CHANNEL MIXER`; RGB gains are `-0001` through `-0012`
  in Red, Green, Blue output groups of four, and Monochrome is `-0013`.
- Exposure is `ADBE Exposure2`; master Exposure is `ADBE Exposure2-0003`,
  Offset is `-0004`, and Gamma Correction is `-0005`.

Only write the numeric properties. The intervening Master/Red/Green/Blue entries
are non-value group headers.
