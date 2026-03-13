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
