# Advanced Audio Spectrum Plugin — Implementation Plan

**Date:** 2026-03-12

## Context

The stock After Effects Audio Spectrum effect has five critical limitations that professional motion designers hit constantly:

1. **Ignores audio effects/retiming** — reads raw source, not the processed audio
2. **No frequency data output** — can't drive other layers by specific frequency bands
3. **Only 3 display styles** — Digital, Analog Lines, Analog Dots (no rounded bars, gradients, glow)
4. **Strictly 2D** — no radial/circular modes without painful workarounds
5. **Linear frequency scale** — crams all musically relevant info (bass, mids, vocals) into the leftmost bars

Our solution: a self-contained demo in `examples/audio-spectrum/` that uses ExtendScript to procedurally generate a fully custom, expression-driven audio spectrum. Key insight: we use the stock effect as a hidden **data layer** (sampled via `sampleImage()` expressions) while building fully styleable shape layers for the visible bars.

---

## Target Location

`examples/audio-spectrum/`

> **Why not `Scripts/recipes/`?** The audio spectrum is a showcase example, not a core recipe. The `examples/` directory signals "optional, deletable, here for fun/learning." This example is fully self-contained — it does not depend on `Scripts/lib/` or any other part of the repo. Delete the folder if you don't need it.

---

## How It Works (Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│  setup.jsx (run once in AE via File > Scripts)              │
│    1. Read config.jsxinc                                     │
│    2. Run cleaner (remove existing AS_ layers)               │
│    3. Create hidden data layer (AS_DATA)                     │
│    4. Create N bar shape layers (AS BAR 1..N)                │
│       - Each bar gets a pre-calculated sampleImage() expr    │
│    5. Done — bars animate automatically via expressions       │
└─────────────────────────────────────────────────────────────┘

Hidden layer (guide layer, computes internally but excluded from output):
  AS_DATA = black solid + Audio Spectrum effect (white, N bands)
            + Mosaic effect (N columns × 1 row, Sharp Colors)
  → Each mosaic block is a uniform solid color; brightness = amplitude of that freq band

Visible layers (shape layers, fully styleable):
  AS BAR 1..N = Rectangle shape, anchor at bottom center
  Scale Y expression = sampleImage(AS_DATA at bar's freq position)
  Color expression = gradient/hue based on bar index position
```

The `sampleImage()` approach is the standard workaround for reading per-frequency data from AE. By applying a Mosaic effect on top of the Audio Spectrum effect, we get N solid-color blocks where each block's brightness = amplitude of one frequency band. Per-bar expressions then sample the correct block.

**Key detail:** `sampleImage(point, radius, postEffect, time)` — the third parameter `postEffect` must be `true` (its default) to sample pixels *after* all effects on the layer are applied. With `postEffect=true`, the expression sees the final Mosaic output, not the raw solid. This only applies to effects directly on the sampled layer — adjustment layers above are not included.
<!-- source: NLM notebook, answer to: "does sampleImage() sample the final rendered pixels including all effects?" — confirmed. postEffect=true (default) guarantees sampling after Audio Spectrum + Mosaic are both applied. -->

---

## File Structure

```
examples/
├── README.md                         # Explains the examples directory
└── audio-spectrum/
    ├── example_config.jsxinc         # All user settings (copy & customize)
    ├── setup.jsx                     # Main entry point — run this in AE
    ├── verify.jsx                    # Phase 1 verification script (temporary)
    ├── README.md                     # Usage documentation
    └── lib/
        ├── data-layer.jsxinc         # Creates hidden AS_DATA layer
        ├── bar-factory.jsxinc        # Creates shape layers + injects expressions
        ├── expressions.jsxinc        # Expression template strings
        └── cleaner.jsxinc            # Removes existing AS_ layers (for re-runs)
```

---

## example_config.jsxinc — All User-Facing Settings

```javascript
var AudioSpectrumConfig = {
    // --- Target ---
    COMP_NAME: "Main Comp",          // Comp to build spectrum in
    AUDIO_LAYER_NAME: "Audio",       // Name of audio layer in that comp

    // --- Spectrum shape ---
    NUM_BARS: 64,                    // Number of frequency bars (32-64 recommended; higher = slower preview)
    MIN_FREQ: 20,                    // Hz (lowest displayed frequency)
    MAX_FREQ: 20000,                 // Hz (highest displayed frequency)
    FREQ_SCALE: "LOG",               // "LOG" (musical) or "LINEAR"

    // --- Layout ---
    DISPLAY_MODE: "BARS_UP",         // "BARS_UP" | "BARS_DOWN" | "MIRROR" | "RADIAL"
    START_X: null,                   // null = auto (left edge with padding)
    END_X: null,                     // null = auto (right edge with padding)
    BASELINE_Y: null,                // null = comp center Y
    MAX_HEIGHT: 300,                 // Max bar height in pixels
    RADIAL_RADIUS: 200,              // Inner radius for RADIAL mode

    // --- Bar styling ---
    BAR_WIDTH: null,                 // null = auto (fills available width with GAP)
    BAR_GAP: 2,                      // Pixels between bars
    CORNER_RADIUS: 3,                // Rounded corners (0 = square)

    // --- Color ---
    COLOR_MODE: "HUE_SPECTRUM",      // "SOLID" | "GRADIENT" | "HUE_SPECTRUM"
    BAR_COLOR: [0, 0.8, 1.0],        // SOLID mode: [r, g, b] in 0-1 range
    GRADIENT_START: [0.2, 0.6, 1.0], // GRADIENT mode: bottom color [r,g,b]
    GRADIENT_END: [1.0, 0.2, 0.5],   // GRADIENT mode: top color [r,g,b]
    HUE_RANGE: [200, 320],           // HUE_SPECTRUM: [startDeg, endDeg] across bars

    // --- Glow ---
    GLOW_ENABLED: true,
    GLOW_THRESHOLD: 0.4,             // 0-1
    GLOW_INTENSITY: 60,              // 0-100

    // --- Reactivity ---
    SMOOTHING: 0.05,                 // Audio Spectrum duration averaging (seconds, 0-0.5)

    // --- Peak markers ---
    PEAK_MARKERS: true,              // Show floating peak dot above each bar
    PEAK_COLOR: [1, 1, 1],           // Peak dot color [r,g,b]
    PEAK_SIZE: 4,                    // Peak dot radius in pixels
};
```

---

## lib/cleaner.jsxinc

**Function:** `cleanAudioSpectrum(comp)`

Removes all layers in the comp whose name starts with `"AS "` or equals `"AS_DATA"`. This allows `setup.jsx` to be re-run safely after changing config — old bars are removed before new ones are created.

---

## lib/data-layer.jsxinc

**Function:** `createDataLayer(comp, config)` → returns the created layer

Creates the hidden frequency data source:

1. `comp.layers.addSolid([0,0,0], "AS_DATA", comp.width, comp.height, 1, comp.duration)`
2. Apply `"ADBE Audio Spectrum"` effect via `layer.property("ADBE Effect Parade").addProperty("ADBE Audio Spectrum")` with:
   <!-- source: NLM notebook, answer to: "What is the correct ADBE match-name string for the Audio Spectrum effect?" — confirmed "ADBE Audio Spectrum" is correct, applied via Effect Parade. NLM flagged this as outside its sources; verify in AE. -->
   - Audio Layer → **layer index** (integer) of the audio layer, looked up by name:
     ```javascript
     var audioLayerIndex = comp.layer(config.AUDIO_LAYER_NAME).index;
     fx.property("ADBE Audio Spectrum-0001").setValue(audioLayerIndex);
     ```
   - Start Point → `[blockW / 2, comp.height/2]` where `blockW = comp.width / config.NUM_BARS`
   - End Point → `[comp.width - blockW / 2, comp.height/2]`
   - Thickness (`"ADBE Audio Spectrum-0012"`) → `blockW` (= `comp.width / config.NUM_BARS`)
   <!-- source: NLM notebook, answer to: "Does the Audio Spectrum effect have a Thickness property?" — Thickness must equal exactly 1/N of the layer width, and Start/End Points must be inset by half a block width, to ensure each frequency band fills exactly one Mosaic block without cross-talk or amplitude dilution. -->
   > **Digital mode gap caveat:** Digital mode draws discrete bars with small gaps between them. The Mosaic effect averages across the entire block including any black gap pixels, slightly lowering brightness vs true amplitude. This is consistent across all bars so the relative scaling is correct. If exact amplitude matters, test setting Thickness slightly larger than blockW to eliminate gaps.
   - Frequency Bands → `config.NUM_BARS`
   - Max Height → `comp.height * 0.49`
   - Inside Color / Outside Color → `[1,1,1]` (white)
   - Duration Averaging → `config.SMOOTHING`
   - Display Options → Digital (0)
   - Start Frequency → `config.MIN_FREQ`
   - End Frequency → `config.MAX_FREQ`
3. Apply `"ADBE Mosaic"` effect via `layer.property("ADBE Effect Parade").addProperty("ADBE Mosaic")` with:
   <!-- source: NLM notebook, answer to: "What is the correct ADBE match-name string for the Mosaic effect?" — confirmed "ADBE Mosaic" is correct. Properties: "ADBE Mosaic-0001" (Horizontal Blocks), "ADBE Mosaic-0002" (Vertical Blocks), "ADBE Mosaic-0003" (Sharp Colors). NLM flagged these as outside its sources; verify in AE. -->
   - Horizontal Blocks (`"ADBE Mosaic-0001"`) → `config.NUM_BARS`
   - Vertical Blocks (`"ADBE Mosaic-0002"`) → `1`
   - Sharp Colors (`"ADBE Mosaic-0003"`) → `true`
4. Set `layer.guideLayer = true` — the layer's internal pixel buffer is still computed (so `sampleImage()` with `postEffect=true` can read the post-effects pixels), but the layer is excluded from final composite output and from parent compositions when precomposed. `sampleImage()` reads the layer's internal render buffer, not the composited frame, so guide layer status does not affect sampling.
   <!-- source: NLM notebook, answer to: "does layer.guideLayer = true work?" — confirmed valid. Guide layers compute their pixel buffer internally for sampleImage() regardless of guide status; they are simply excluded from composite output. -->
   > **Precompose safety:** If the user precomposes the main comp into a parent comp, the guide layer disappears from the parent (expected). The `sampleImage()` expressions on bar layers continue to work because `thisComp.layer("AS_DATA")` resolves within the nested comp, not the parent.
   <!-- source: NLM notebook, answer to: "does sampleImage() see the result AFTER both effects?" — confirmed. sampleImage(point, radius, postEffect, time) with postEffect=true (default) samples after all masks and effects on the layer. postEffect only applies to effects directly on the sampled layer, not adjustment layers above it. -->

---

## lib/expressions.jsxinc

Expression templates as string arrays. During setup, the bar factory replaces `{{TOKEN}}` placeholders with per-bar computed values.

### Scale expression — BARS_UP mode
```javascript
var SCALE_EXPR_BARS_UP = [
    'var dl = thisComp.layer("AS_DATA");',
    'var col = dl.sampleImage([{{SAMPLE_X}}, dl.height * 0.5], [1, 1], true, time);',
    'var b = col[0];',
    '[100, ease(b, 0.05, 0.85, 0, 100)]'
].join('\n');
```

`{{SAMPLE_X}}` is the pre-calculated x coordinate on the data layer corresponding to this bar's log-mapped frequency (see logarithmic mapping below).

> **Note on `[1, 1]` radius:** Since Mosaic with Sharp Colors averages each block to a uniform solid color, sampling a single pixel at the block center produces the same result as a large area sample — but faster (fewer pixels evaluated per expression per frame).

### Scale expression — BARS_DOWN mode
Same as above; anchor point is set to top-center of the bar instead of bottom-center.

### Scale expression — MIRROR mode
`[100, ease(b, 0.05, 0.85, 0, 100)]` with anchor point at vertical center of bar.

### Fill color expression — HUE_SPECTRUM mode
```javascript
var COLOR_EXPR_HUE = [
    'var t = {{BAR_FRACTION}};',
    'var h = linear(t, 0, 1, {{HUE_START}}, {{HUE_END}});',
    'hslToRgb([h/360, 0.8, 0.6, 1.0])'
].join('\n');
// NOTE: hslToRgb() takes a single 4-element array [H, S, L, A], all normalized 0-1.
// Returns a 4-element RGBA array. The old snake_case hsl_to_rgb() is deprecated.
```
<!-- source: NLM notebook, answer to: "Is hslToRgb() a built-in function in AE expressions?" — confirmed built-in, but takes a single [H,S,L,A] array, NOT separate arguments. All values must be 0.0-1.0. Use camelCase hslToRgb, not deprecated hsl_to_rgb. If called from eval() or .jsx, prefix with thisLayer.hslToRgb(). -->

`{{BAR_FRACTION}}` = `i / (NUM_BARS - 1)` (0.0 for first bar, 1.0 for last).

### Peak marker position expression
```javascript
var PEAK_EXPR = [
    'var dl = thisComp.layer("AS_DATA");',
    'var col = dl.sampleImage([{{SAMPLE_X}}, dl.height * 0.5], [1, 1], true, time);',
    'var b = col[0];',
    'var h = ease(b, 0.05, 0.85, 0, {{MAX_HEIGHT}});',
    '[{{BAR_CENTER_X}}, {{BASELINE_Y}} - h - 4]'
].join('\n');
```

---

## lib/bar-factory.jsxinc

**Function:** `createBars(comp, dataLayer, config)`

### Logarithmic frequency → sample x mapping

This is the key improvement over the stock effect. Instead of evenly spacing bars across the frequency range (linear), we map bar `i` to the musically correct log-scaled frequency:

```javascript
var blockW = comp.width / config.NUM_BARS;

// Log-scaled frequency for bar i
var f_i = config.MIN_FREQ * Math.pow(config.MAX_FREQ / config.MIN_FREQ, i / (config.NUM_BARS - 1));

// Linear position of that frequency on the data layer
// Note: Start/End Points are inset by blockW/2, so the renderable range is
// [blockW/2, comp.width - blockW/2]. Map f_i into that range.
var t = (f_i - config.MIN_FREQ) / (config.MAX_FREQ - config.MIN_FREQ);
var sampleX = blockW / 2 + t * (comp.width - blockW);
```
<!-- source: NLM notebook, answer to: "Does Frequency Bands map 1:1 to Mosaic blocks?" — confirmed, but Start/End Points must be inset by half a block width and Thickness must equal one block width for exact alignment. sampleX must therefore map into the inset range, not 0..comp.width. -->

For `FREQ_SCALE: "LINEAR"`, the sample point is simply the center of each Mosaic block:
```javascript
var blockW = comp.width / config.NUM_BARS;
var sampleX = blockW / 2 + i * blockW;
// This lands exactly at the center of mosaic block i
```

### Per-bar shape layer creation

For each bar `i` (0-indexed):

1. Calculate display position:
   ```
   barWidth = (compWidth - (NUM_BARS - 1) * BAR_GAP) / NUM_BARS
   centerX  = startX + i * (barWidth + BAR_GAP) + barWidth / 2
   ```

2. Create shape layer: `comp.layers.addShape()`, name `"AS BAR " + (i+1)`

3. Add Contents → Vector Group → Rectangle via match-names:
   <!-- source: NLM notebook, answer to: "what are the exact match-name strings for rectangle path on shape layers?" — confirmed hierarchy: Root Vectors Group → Vector Group → Vectors Group → Shape/Fill. NLM flagged as outside sources; verify in AE. -->
   ```javascript
   var contents = layer.property("ADBE Root Vectors Group");
   var grp = contents.addProperty("ADBE Vector Group");
   var grpContents = grp.property("ADBE Vectors Group");
   var rect = grpContents.addProperty("ADBE Vector Shape - Rect");
   rect.property("ADBE Vector Rect Size").setValue([barWidth, config.MAX_HEIGHT]);
   rect.property("ADBE Vector Rect Roundness").setValue(config.CORNER_RADIUS);
   ```
   - Size: `[barWidth, MAX_HEIGHT]` (via `"ADBE Vector Rect Size"`)
   - Roundness: `CORNER_RADIUS` (via `"ADBE Vector Rect Roundness"`)
   - Position: `[0, 0]` (layer position handles placement)

4. Add Fill to the group — the property depends on the color mode:

   **SOLID mode:** Add a solid fill, set color directly.
   ```javascript
   var fill = grpContents.addProperty("ADBE Vector Graphic - Fill");
   fill.property("ADBE Vector Fill Color").setValue(config.BAR_COLOR);
   ```

   **HUE_SPECTRUM mode:** Add a solid fill, inject a color expression.
   ```javascript
   var fill = grpContents.addProperty("ADBE Vector Graphic - Fill");
   fill.property("ADBE Vector Fill Color").expression = colorExprString;
   ```

   **GRADIENT mode:** Add a Gradient Fill instead of a solid Fill. This uses entirely different match-names and property structures.
   ```javascript
   var gFill = grpContents.addProperty("ADBE Vector Graphic - G-Fill");
   // Type: 1 = Linear gradient (not radial)
   gFill.property("ADBE Vector Grad Type").setValue(1);
   // Start point (bottom of bar) and end point (top of bar)
   gFill.property("ADBE Vector Grad Start Pt").setValue([0, config.MAX_HEIGHT / 2]);
   gFill.property("ADBE Vector Grad End Pt").setValue([0, -config.MAX_HEIGHT / 2]);
   // Colors: set via the gradient color stops property
   // Note: Gradient color stops use a proprietary array format — verify in Phase 1
   // Expected format is an array encoding color stops and opacity stops,
   // but the exact structure must be confirmed empirically.
   gFill.property("ADBE Vector Grad Colors").setValue(/* verified format from Phase 1 */);
   ```

   > **Gradient color stop format caveat:** The gradient color stops API in ExtendScript is notoriously tricky — it uses a proprietary format for the color/opacity arrays that is not well-documented. The exact array structure must be verified during Phase 1 (see verification step 8). Do not implement GRADIENT mode until the format is confirmed.

5. Set anchor point: `[barWidth/2, MAX_HEIGHT]` (bottom center → bar grows upward)

6. Set position: `[centerX, baselineY]`

7. If `GLOW_ENABLED`: add `"ADBE Glo2"` effect (NOT `"ADBE Glow"`) with config values via `layer.property("ADBE Effect Parade").addProperty("ADBE Glo2")`. Properties: Threshold = `"ADBE Glo2-0001"`, Radius = `"ADBE Glo2-0002"`, Intensity = `"ADBE Glo2-0003"`
   <!-- source: NLM notebook, answer to: "What is the correct match-name string for the Glow effect?" — confirmed "ADBE Glo2" (not "ADBE Glow"). NLM flagged this as outside its sources; verify in AE. -->

8. Inject Scale expression: replace `{{SAMPLE_X}}` with the computed `sampleX` value, then apply:
   ```javascript
   layer.property("ADBE Transform Group").property("ADBE Scale").expression = scaleExprString;
   ```

9. If `PEAK_MARKERS`: create `"AS PEAK " + (i+1)` circle shape layer, inject peak position expression

### RADIAL display mode

```javascript
var theta = (i / config.NUM_BARS) * 2 * Math.PI;
var x = compCenterX + config.RADIAL_RADIUS * Math.cos(theta);
var y = compCenterY + config.RADIAL_RADIUS * Math.sin(theta);
layer.transform.position.setValue([x, y]);
layer.transform.rotation.setValue(theta * 180 / Math.PI + 90);
// Bar grows outward from circle edge
// Anchor point at bottom center of bar (the inner edge)
```

### MIRROR display mode

- Anchor point at vertical center: `[barWidth/2, MAX_HEIGHT/2]`
- Position at `[centerX, baselineY]`
- Scale Y grows symmetrically up and down from center

---

## setup.jsx — Main Entry Point

```javascript
#include "example_config.jsxinc"
#include "lib/cleaner.jsxinc"
#include "lib/data-layer.jsxinc"
#include "lib/expressions.jsxinc"
#include "lib/bar-factory.jsxinc"

(function() {
    // Find target composition
    var comp = null;
    for (var i = 1; i <= app.project.items.length; i++) {
        var item = app.project.items[i];
        if (item instanceof CompItem && item.name === AudioSpectrumConfig.COMP_NAME) {
            comp = item;
            break;
        }
    }
    if (!comp) {
        alert("Could not find comp: " + AudioSpectrumConfig.COMP_NAME);
        return;
    }

    app.beginUndoGroup("Audio Spectrum Setup");
    try {
        cleanAudioSpectrum(comp);
        var dataLayer = createDataLayer(comp, AudioSpectrumConfig);
        createBars(comp, dataLayer, AudioSpectrumConfig);
        app.endUndoGroup();
        alert("Audio Spectrum created: " + AudioSpectrumConfig.NUM_BARS + " bars (" + AudioSpectrumConfig.DISPLAY_MODE + ")");
    } catch (e) {
        app.endUndoGroup();
        alert("Error: " + e.message);
    }
})();
```

---

## Improvements Over Stock Effect

| Feature | Stock AE | Our Plugin |
|---------|----------|------------|
| Frequency scale | Linear only | **Logarithmic** (musical) or Linear |
| Display modes | 3 rigid presets | **BARS_UP, BARS_DOWN, MIRROR, RADIAL** |
| Bar shape | No control | **Width, gap, corner radius** |
| Color | Inside/outside + hue rotation | **SOLID, GRADIENT, or HUE_SPECTRUM** |
| Glow | None built-in | **Built-in Glow effect per bar** |
| Peak markers | None | **Optional floating dots** |
| Individual layer control | No (single flat render) | **Yes — each bar is a shape layer** |
| Pre-comped audio | Must manually precompose | **Works as-is** (just name the layer) |
| Easing/smoothing | Duration Averaging only | **`ease()` expression + Duration Averaging** |
| Re-configurable | Must delete layers manually | **Re-run setup.jsx — auto-cleans old layers** |

---

## Match-Name Reference
<!-- source: NLM notebook, answers to multiple questions about match-names. All match-names below were flagged by NLM as outside its primary sources; verify each in AE by running `effect.matchName` or checking the Scripting Guide "First-Party Effect Match Names" section. -->

### Effect application pattern
```javascript
var fx = layer.property("ADBE Effect Parade").addProperty("MATCH_NAME");
```

### Audio Spectrum (`"ADBE AudSpect"`) — VERIFIED 2026-03-13
| Property | Match-Name | Notes |
|----------|-----------|-------|
| Audio Layer | `"ADBE AudSpect-0001"` | Integer layer index |
| Start Point | `"ADBE AudSpect-0002"` | |
| End Point | `"ADBE AudSpect-0003"` | |
| Start Frequency | `"ADBE AudSpect-0006"` | Hz |
| End Frequency | `"ADBE AudSpect-0007"` | Hz |
| Frequency Bands | `"ADBE AudSpect-0008"` | |
| Maximum Height | `"ADBE AudSpect-0009"` | pixels |
| Audio Duration (ms) | `"ADBE AudSpect-0010"` | milliseconds, not seconds |
| Audio Offset (ms) | `"ADBE AudSpect-0011"` | milliseconds |
| Thickness | `"ADBE AudSpect-0012"` | |
| Softness | `"ADBE AudSpect-0013"` | |
| Inside Color | `"ADBE AudSpect-0014"` | **RGBA** [r,g,b,a] 4-element |
| Outside Color | `"ADBE AudSpect-0015"` | **RGBA** [r,g,b,a] 4-element |
| Hue Interpolation | `"ADBE AudSpect-0017"` | |
| Display Options | `"ADBE AudSpect-0020"` | 0=Digital, 1=Analog Lines, 2=Analog Dots |
| Side Options | `"ADBE AudSpect-0021"` | |
| Duration Averaging | `"ADBE AudSpect-0022"` | |
| Composite On Original | `"ADBE AudSpect-0023"` | |

### Mosaic (`"ADBE Mosaic"`)
| Property | Match-Name |
|----------|-----------|
| Horizontal Blocks | `"ADBE Mosaic-0001"` |
| Vertical Blocks | `"ADBE Mosaic-0002"` |
| Sharp Colors | `"ADBE Mosaic-0003"` |

### Glow (`"ADBE Glo2"`) — VERIFIED 2026-03-13
| Property | Match-Name |
|----------|-----------|
| Glow Based On | `"ADBE Glo2-0001"` |
| Glow Threshold | `"ADBE Glo2-0002"` |
| Glow Radius | `"ADBE Glo2-0003"` |
| Glow Intensity | `"ADBE Glo2-0004"` |

### Shape Layer — VERIFIED 2026-03-13
| Element | Match-Name |
|---------|-----------|
| Contents group | `"ADBE Root Vectors Group"` |
| Vector Group | `"ADBE Vector Group"` |
| Group Contents | `"ADBE Vectors Group"` |
| Rectangle Path | `"ADBE Vector Shape - Rect"` |
| Rectangle Size | `"ADBE Vector Rect Size"` |
| Rectangle Roundness | `"ADBE Vector Rect Roundness"` |
| Fill | `"ADBE Vector Graphic - Fill"` |
| Fill Color | `"ADBE Vector Fill Color"` |
| Gradient Fill | `"ADBE Vector Graphic - G-Fill"` |
| Gradient Type | `"ADBE Vector Grad Type"` |
| Gradient Start Point | `"ADBE Vector Grad Start Pt"` |
| Gradient End Point | `"ADBE Vector Grad End Pt"` |
| Gradient Colors | `"ADBE Vector Grad Colors"` |
| Transform Group | `"ADBE Transform Group"` |
| Anchor Point | `"ADBE Anchor Point"` |
| Position | `"ADBE Position"` |
| Scale | `"ADBE Scale"` |
| Rotation (Z) | `"ADBE Rotate Z"` |

---

## Unverified Assumptions & Caveats

### Still unverified — must test empirically in AE

1. **Frequency band distribution is unconfirmed (HIGH RISK).** The plan assumes the stock Audio Spectrum distributes N frequency bands linearly across the Hz range (equal Hz per band), consistent with standard FFT binning. This is likely correct but not confirmed by Adobe documentation. If the stock effect applies any non-linear distribution internally, the log-remapping math in `bar-factory.jsxinc` would double-apply the transform and produce wrong results.
   **Empirical test:** Create a comp with a tone generator. Apply Audio Spectrum with 8 bands, Start Freq = 100, End Freq = 900. Play single-frequency tones at 200, 300, 500, 700 Hz. If band positions are at (freq - 100) / 800 of the way across, distribution is linear. If band 4 lights up for a 300 Hz tone, it's logarithmic.
   <!-- source: NLM notebook — sources cannot confirm; only Adobe docs say "divides displayed frequencies" without specifying the math. -->

2. **All match-name index numbers need AE verification (HIGH RISK).** Match-name patterns follow Adobe's `-XXXX` convention, but every specific index number comes from LLM knowledge, not primary documentation. If any index is off by one, the script silently sets the wrong property. **The first implementation task must be a verification script** that applies each effect and logs `effect.matchName` and `effect.property(i).matchName` for all properties to confirm every index.

3. **Gradient fill match-names and color stop format (HIGH RISK).** Gradient fill properties on shape layers use a different structure than solid fills. The match-names above (`"ADBE Vector Graphic - G-Fill"`, `"ADBE Vector Grad Type"`, etc.) follow the ADBE naming convention but are unverified. The color stop format may require `setValueAtTime` or a specific array structure. Verify during Phase 1.

4. **Digital mode gap pixels.** Digital display mode may draw bars with small gaps between them. If so, Mosaic averaging includes black gap pixels, slightly reducing brightness values. This is consistent across all bars (relative scaling is unaffected) but may need Thickness adjustment if absolute amplitude matters. Test visually with a loud passage and check for brightness underreporting.

### Resolved (previously unverified)

- **`sampleImage()` radius** — `[1, 1]` is sufficient and preferred. Mosaic with Sharp Colors produces uniform solid-color blocks; single-pixel sampling is faster and equally accurate. Expressions updated throughout.
- **`hslToRgb()` format** — Takes a single `[H, S, L, A]` array (all 0–1). Returns `[R, G, B, A]`. Works directly on shape fill color properties (4-channel in expression engine). Confirmed correct as written.
- **`"ADBE Glo2"` vs `"ADBE Glow"`** — `"ADBE Glo2"` is correct. The original Glow was superseded internally; modern AE's Effect > Stylize > Glow maps to `"ADBE Glo2"`.
- **Guide layer + sampleImage()** — Guide layers compute their internal pixel buffer regardless of guide status. `sampleImage()` reads the internal buffer, not the composited frame. Works in both RAM preview and Render Queue. Safe when precomposed — expressions resolve `thisComp.layer()` within the nested comp.
- **Expression engine vs ExtendScript** — `.jsx` scripts = ES3 (ExtendScript). Expressions = ES6+ (JavaScript engine, default since AE CC 2019). Expressions could use `const`/`let` but plan uses `var` for legacy compatibility.

### Additional risks identified during review

5. **Performance at 64+ bars.** Each bar layer evaluates a `sampleImage()` expression every frame. With 64 bars + 64 peak markers, that's 128 `sampleImage()` calls per frame. Expect noticeable preview slowdown. Recommend 32–64 bars as the practical range and document this in README.md.

6. **Audio Layer property expects an integer layer index**, not a layer name. The data-layer code must look up the index: `comp.layer(config.AUDIO_LAYER_NAME).index`. This is now shown explicitly in the data-layer section.

---

## Implementation Phases

### Phase 1: Verification Script (do this first)
**File:** `examples/audio-spectrum/verify.jsx` (temporary, can be deleted after verification)

Purpose: Confirm all assumptions before building the real demo.

Tasks:
1. Create a test comp with a solid layer
2. Apply `"ADBE Audio Spectrum"` — log all property match-names and indices via:
   ```javascript
   var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Audio Spectrum");
   for (var i = 1; i <= fx.numProperties; i++) {
       $.writeln(i + ": " + fx.property(i).name + " = " + fx.property(i).matchName);
   }
   ```
3. Apply `"ADBE Mosaic"` — log all property match-names
4. Apply `"ADBE Glo2"` — log all property match-names
5. Create a shape layer — log rectangle, fill, and gradient fill match-names
6. Test frequency band distribution:
   - Set up Audio Spectrum with 8 bands, Start=100Hz, End=900Hz
   - Apply Mosaic (8 horizontal, 1 vertical, Sharp Colors)
   - Use a tone generator or known audio to verify which bands light up at specific frequencies
7. Test `sampleImage()` on a guide layer — confirm it still returns pixel data
8. Test gradient fill color stop format — verify how to set a two-color linear gradient via scripting
9. **Update the plan** with any corrections before proceeding to Phase 2

### Phase 2: Core Implementation
Build the demo in this order:
1. `examples/README.md` — update with audio-spectrum entry (file already exists)
2. `examples/audio-spectrum/example_config.jsxinc` — all user settings
3. `examples/audio-spectrum/lib/cleaner.jsxinc` — layer cleanup
4. `examples/audio-spectrum/lib/data-layer.jsxinc` — hidden data layer
5. `examples/audio-spectrum/lib/expressions.jsxinc` — expression templates
6. `examples/audio-spectrum/lib/bar-factory.jsxinc` — shape layer creation (BARS_UP mode only first)
7. `examples/audio-spectrum/setup.jsx` — main entry point
8. Test end-to-end with a real AE project

### Phase 3: Display Modes & Polish
1. Add BARS_DOWN, MIRROR, RADIAL modes to bar-factory
2. Add GRADIENT and HUE_SPECTRUM color modes
3. Add peak markers
4. Add glow effect
5. `examples/audio-spectrum/README.md` — usage documentation
6. Full verification against all 10 verification steps in the plan

---

## Future Features (Not in V1)
<!-- source: NLM notebook, answer to: "What advanced audio spectrum features are NOT covered in this plan?" -->

These features were identified by NLM as commonly used by professional motion designers. Consider for future iterations:

1. **Custom path tracing** — map the spectrum to an arbitrary mask/path drawn with the Pen tool, instead of a straight line or circle. The stock Audio Spectrum supports this natively via its Path property.
2. **Beat counting / sequential triggers** — expression that counts audio peaks exceeding a threshold over time, enabling one-at-a-time layer reveals synced to kick drum hits.
3. **Linear keyframe integration** — calculus-based expression that accumulates audio amplitude over time for continuous forward motion (rotation, time remap) rather than bounce-back behavior.
4. **Echo/trail effects** — apply the Echo effect to bars for trailing afterglow, simulating analog oscilloscope aesthetics.
5. **Venetian Blinds block hack** — apply Venetian Blinds at 50% completion over the stock effect to create blocky equalizer segments without Mosaic.
6. **Wiggle drift** — add `wiggle(freq, amp)` to bar position/scale for organic movement during quiet passages, preventing the visualizer from going dead-still.

---

## ES3 Constraints (ae-ai-starter standard)

**Two different engines are in play:**

- **`.jsx` scripts** (setup.jsx, all lib/*.jsxinc) run in the **ExtendScript engine (ES3)**. Must use `var`, no arrow functions, no template literals, no destructuring.
- **Expressions** (strings assigned to `.expression` properties) run in the **JavaScript engine (ES6+)** by default in AE CC 2019+. Expressions *could* use `const`/`let`, but we use `var` everywhere for compatibility with users who have switched their project to the legacy ExtendScript expression engine.

ExtendScript (.jsx) rules:

- `var` only — no `let` or `const`
- No arrow functions — use `function(x) { return x; }`
- No template literals — use string `+` concatenation
- No spread/destructuring
- `#include "path/file.jsxinc"` for library loading (not `import`)
- Shape layer properties accessed via Adobe match-name strings (e.g. `"ADBE Vector Shape - Rect"`)
- Wrap all project changes in `app.beginUndoGroup()` / `app.endUndoGroup()`

---

## Verification Steps

1. Open any `.aep` that has an audio layer in a composition
2. Copy `examples/audio-spectrum/example_config.jsxinc` and update `COMP_NAME` and `AUDIO_LAYER_NAME`
3. Run `File > Scripts > Run Script File...` → select `setup.jsx`
4. Verify in the Timeline:
   - One `AS_DATA` guide layer created (eye icon shows guide layer badge)
   - `AS BAR 1` through `AS BAR N` shape layers created
5. Press spacebar to preview — bars should animate to audio
6. Change `DISPLAY_MODE` to `"MIRROR"`, re-run setup — verify bars grow in both directions
7. Change `DISPLAY_MODE` to `"RADIAL"`, re-run — verify circular arrangement
8. Run setup twice in a row — verify old layers are cleaned before new ones are created
9. Render a frame — verify `AS_DATA` does **not** appear in the rendered output
10. Set `FREQ_SCALE: "LOG"` and compare vs `"LINEAR"` — log should show more low-frequency detail
