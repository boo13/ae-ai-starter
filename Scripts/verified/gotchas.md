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

## setValueAtTime Uses Absolute Composition Time

`setValueAtTime(time, value)` takes **absolute composition time in seconds**,
not a time relative to the playhead. Using `comp.time` as the first argument
anchors keyframes to the current playhead position -- running the script at
frame 30 creates keyframes 30 seconds in, not at the start.

**Wrong:**
```jsx
opacity.setValueAtTime(comp.time, 0);
opacity.setValueAtTime(comp.time + 2, 100);
```

**Right:**
```jsx
opacity.setValueAtTime(0, 0);
opacity.setValueAtTime(2, 100);
```

**Fix:** Use literal seconds (`0`, `1`, `2`, etc.) for keyframe times unless
the user explicitly asks to start the animation at the current playhead
position.
