---
title: "feat: Add Flow Field and Stock Ticker demo panels"
type: feat
status: active
date: 2026-03-04
brainstorm: docs/brainstorms/2026-03-03-demo-panels-brainstorm.md
design: docs/plans/2026-03-03-demo-panels-design.md
---

# feat: Add Flow Field and Stock Ticker Demo Panels

## Overview

Two standalone dockable ScriptUI panels that showcase AI-assisted After Effects scripting. Each demonstrates something a motion designer couldn't easily build alone — generative math art and data-driven broadcast graphics.

**Flow Field Generator** — Perlin noise-driven organic flowing lines with real-time expression controls.
**Stock Ticker + Sparkline** — Scrolling ticker bar with animated sparkline chart from financial data.

## Problem Statement

The ae-ai-starter template needs compelling demos to show potential users what's possible. The existing panel (`automation_lab_panel.jsx`) creates basic comps and guides — useful but not impressive. These demos showcase complex math, data pipelines, and expression-driven interactivity that would be difficult to build without AI assistance.

## Technical Approach

### Architecture

Both demos follow the same pattern: **Panel UI → Builder Script → AE Comp with Control Null → Expressions read controls → Real-time feedback**.

```
Scripts/demos/
  flow_field/
    flow_field_panel.jsx        ← ScriptUI panel (UI + orchestration)
    flow_field_engine.jsxinc    ← Perlin noise + streamline math
    flow_field_builder.jsxinc   ← AE comp/layer/expression creation
  stock_ticker/
    stock_ticker_panel.jsx      ← ScriptUI panel (UI + orchestration)
    ticker_builder.jsxinc       ← Ticker bar + sparkline creation
    data_fetcher.jsxinc         ← JSON loader + HTTPS fetch via curl
Scripts/tests/
    test_shape_layer.jsx        ← Shape layer API proof-of-concept
    test_perlin.jsx             ← Perlin noise unit tests
Input/
    sample_stock_data.json      ← Bundled realistic stock data
```

### Key Technical Decisions

1. **Each "Generate" click creates a new comp** (e.g., "Flow Field 1", "Flow Field 2"). No state tracking needed. "Regenerate" updates layers in the most recently created comp (tracked by variable reference in panel session; lost on panel close — acceptable since user can just Generate again).

2. **Live fetch uses `system.callSystem("curl ...")`** for HTTPS support. Works on macOS out of the box. Requires AE preference "Allow Scripts to Write Files and Access Network".

3. **Panel controls are ScriptUI slider + statictext combos** for visual polish (this is a demo, not a utility panel). Sliders map to AE Slider Controls on the control null layer.

4. **Performance cap at 300 streamlines** with status feedback during generation. Default density ~150 for fast generation.

5. **Shape layer paths use Catmull-Rom → Bezier conversion** with Ramer-Douglas-Peucker simplification to reduce vertex count by ~50%.

6. **Expression strings use array.join("\n") pattern** for readability. Effect names defined in a single config object to prevent name mismatches.

### New Patterns Introduced

These patterns don't exist in the codebase yet and need careful implementation:

- **Shape layer creation** via `comp.layers.addShape()` + `addProperty("ADBE Vector Group")` etc.
- **Expression setting** via `property.expression = "string"`
- **Effect controls on null layers** via `addProperty("ADBE Slider Control")`
- **ScriptUI slider controls** (existing panel uses only edittext)
- **Perlin noise in ES3** (pure math, no dependencies)
- **system.callSystem("curl")** for HTTPS API fetch

## Implementation Phases

### Phase 1: Foundation & Proof of Concept

Validate the new patterns before building full features. This phase de-risks the entire project.

#### 1.1 Create directory structure

Create `Scripts/demos/flow_field/` and `Scripts/demos/stock_ticker/` directories.

**File:** `Scripts/demos/.gitkeep`

#### 1.2 Shape layer proof-of-concept

Write a minimal test script that validates the shape layer API works as expected in ExtendScript.

**File:** `Scripts/tests/test_shape_layer.jsx`

Must validate:
- `comp.layers.addShape()` creates a shape layer
- Adding `"ADBE Vector Group"` to Contents
- Adding `"ADBE Vector Shape - Group"` with a `new Shape()` object (vertices, inTangents, outTangents, closed)
- Adding `"ADBE Vector Graphic - Stroke"` with color and width
- Adding `"ADBE Vector Filter - Trim"` with Start/End values
- Setting `.expression` on the trim path End property
- Adding `"ADBE Slider Control"` to a null layer's Effects
- Reading the slider value in an expression: `thisComp.layer("Control").effect("Test Slider")("Slider")`

Success criteria: Script runs without errors in AE, produces a visible animated shape layer driven by a slider expression.

#### 1.3 Perlin noise engine

Implement the core math library. Pure functions, no AE dependencies — testable outside AE context.

**File:** `Scripts/demos/flow_field/flow_field_engine.jsxinc`

Functions to implement:
- `createPerlinNoise(seed)` — returns noise generator with `.get(x, y)` method
  - Canonical 256-entry permutation table, optional seeded shuffle via LCG
  - 8 gradient vectors for 2D, fade (quintic: 6t^5 - 15t^4 + 10t^3), lerp
- `flowAngle(noiseGen, x, y, scale)` — maps noise value to angle [0, 2π]
- `traceStreamline(noiseGen, startX, startY, scale, stepSize, maxSteps, width, height, margin)` — Euler integration through noise field, returns array of [x, y] points
- `generateStreamlines(config)` — generates multiple streamlines with spatial occupancy grid for minimum separation. Config: width, height, scale, stepSize, maxSteps, separation, margin, seed, seedSpacing, jitter
- `simplifyPoints(points, epsilon)` — Ramer-Douglas-Peucker polyline simplification
- `pointsToBezierPath(points, tension)` — Catmull-Rom to Bezier conversion, returns {vertices, inTangents, outTangents, closed}

Performance target: 200 streamlines × 150 steps in < 5 seconds on ExtendScript.

#### 1.4 Perlin noise unit tests

**File:** `Scripts/tests/test_perlin.jsx`

Test cases:
- Noise output is in [-1, 1] range for various inputs
- Same seed produces same output (deterministic)
- Different seeds produce different output
- Noise varies smoothly (adjacent samples differ by less than a threshold)
- `simplifyPoints` reduces point count while preserving endpoints
- `pointsToBezierPath` produces arrays of equal length (vertices, inTangents, outTangents)
- `generateStreamlines` produces non-empty result for valid config

#### 1.5 Bundled stock data

**File:** `Input/sample_stock_data.json`

Create realistic data for 8 stocks with 90 days of closing prices (supports full range of Chart Days slider). Include recognizable symbols:

```json
{
  "stocks": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "prices": [{"date": "2025-12-01", "close": 243.50}, ...],
      "current": 248.30,
      "change": "+1.97%"
    },
    ...
  ]
}
```

Stocks: AAPL, GOOGL, MSFT, AMZN, TSLA, NVDA, META, NFLX. Prices should be realistic ranges for each, with plausible day-to-day variation (random walk with drift).

**Success criteria for Phase 1:** Shape layer test passes in AE, Perlin noise tests pass in AE, JSON file loads with `readJsonFile()`.

---

### Phase 2: Flow Field Generator

Build the complete flow field demo, working from engine → builder → panel.

#### 2.1 Flow field builder

**File:** `Scripts/demos/flow_field/flow_field_builder.jsxinc`

Depends on: `flow_field_engine.jsxinc`, `../../lib/helpers.jsxinc`

Functions to implement:

**`createFlowFieldComp(name, index)`**
- Creates a 1920×1080 comp at 30fps, 10 seconds
- Names it "Flow Field {index}" (incrementing)
- Sets dark background color
- Returns the CompItem

**`addFlowControlLayer(comp, config)`**
- Creates a guide null layer named "Flow Control"
- Adds Slider Controls: "Turbulence" (default 4.0), "Density" (default 150), "Line Length" (default 150), "Speed" (default 2.0), "Color Mode" (default 0)
- Moves to top of layer stack
- Returns the layer reference

Effect name constants (single source of truth):
```javascript
var CTRL = {
    LAYER_NAME: "Flow Control",
    TURBULENCE: "Turbulence",
    DENSITY: "Density",
    LINE_LENGTH: "Line Length",
    SPEED: "Speed",
    COLOR_MODE: "Color Mode"
};
```

**`buildStreamlineLayers(comp, controlLayer, config)`**
- Reads Turbulence, Density, Line Length from control layer slider values
- Calls `generateStreamlines()` with appropriate config mapping:
  - scale = 1 / (Turbulence * 40) — maps slider 0.5-10 to frequency 0.05-0.0025
  - Density as-is (capped at 300)
  - maxSteps = Line Length
  - separation = 10, stepSize = 3, margin = 30
- For each streamline:
  - Simplify points (epsilon 1.5)
  - Convert to Bezier path
  - Create shape layer with `new Shape()`
  - Add stroke (2px, white default)
  - Add trim paths
- Returns count of created streamlines

**`wireFlowExpressions(comp, streamlineCount)`**
- For each streamline shape layer, set expressions:
  - **Trim End:** `clamp(time * speed * (100 / duration), 0, 100)` where speed reads from control slider
  - **Stroke Color:** expression that maps Color Mode (0-3) to palette, using streamline index for variation within palette
  - **Stroke Width:** reads from a base value, slightly randomized per line

Color palettes:
- 0 (Mono): white with slight opacity variation
- 1 (Warm): [1,0.3,0.1] → [1,0.8,0.2] interpolated by index
- 2 (Cool): [0.1,0.3,1] → [0.2,0.8,0.9] interpolated by index
- 3 (Rainbow): hue rotation by index, `hslToRgb(index/total, 0.7, 0.6)`

**`removeStreamlineLayers(comp)`**
- Finds and removes all layers named "Streamline *" in the comp
- Used by Regenerate flow

#### 2.2 Flow field panel

**File:** `Scripts/demos/flow_field/flow_field_panel.jsx`

Depends on: `flow_field_engine.jsxinc`, `flow_field_builder.jsxinc`, `../../lib/helpers.jsxinc`

Structure (following existing panel IIFE pattern):

```javascript
(function (thisObj) {
    var PANEL_TITLE = "Flow Field Generator";
    // #include directives
    // UI setup
    // Event handlers
    // Window finalization
})(this);
```

**Panel UI layout:**
```
┌─ Flow Field Generator ──────────┐
│                                  │
│  [Generate Flow Field]           │
│                                  │
│  ── Generation Controls ───      │
│  Turbulence   [====●=====] 4.0  │  ← slider + statictext
│  Density      [====●=====] 150  │
│  Line Length  [====●=====] 150  │
│                                  │
│  ── Live Controls ─────────      │
│  Speed        [====●=====] 2.0  │
│  Color:  ○Mono ○Warm ○Cool ○🌈  │  ← radio buttons
│                                  │
│  [Regenerate]                    │
│                                  │
│  Status: Ready                   │
└──────────────────────────────────┘
```

**UI helper function:**
```javascript
function addSliderRow(parent, label, min, max, defaultVal, decimalPlaces) {
    var row = parent.add("group");
    row.orientation = "row";
    row.alignChildren = ["fill", "center"];
    row.add("statictext", undefined, label);
    var slider = row.add("slider", undefined, defaultVal, min, max);
    var valueText = row.add("statictext", undefined, defaultVal.toFixed(decimalPlaces));
    valueText.characters = 6;
    slider.onChanging = function () {
        valueText.text = slider.value.toFixed(decimalPlaces);
    };
    return { slider: slider, valueText: valueText };
}
```

**Event handlers:**

"Generate Flow Field" button:
1. `runAction("Generate Flow Field", function() { ... })`
2. Create comp with `createFlowFieldComp()`
3. Add control layer with `addFlowControlLayer()`
4. Set control layer slider values from panel slider values
5. `buildStreamlineLayers()`
6. `wireFlowExpressions()`
7. Store comp reference in panel-scoped variable
8. Update status text with streamline count
9. Enable "Regenerate" button

"Regenerate" button:
1. Check if stored comp reference is still valid
2. Read current panel slider values
3. Update control layer slider values
4. `removeStreamlineLayers(comp)`
5. `buildStreamlineLayers()` with new values
6. `wireFlowExpressions()`
7. Update status

Live controls (Speed, Color Mode):
- On panel slider change → find control layer in stored comp → update AE slider value
- If no stored comp, show status message

**Status feedback during generation:**
- Show "Generating N streamlines..." before computation
- Use `app.beginSuppressDialogs()` / `app.endSuppressDialogs()` if available
- Show "Complete! N streamlines created" when done

#### 2.3 Flow field integration test

Manual test script for validating the full pipeline end-to-end without the panel.

**File:** `Scripts/tests/test_flow_field_integration.jsx`

Creates a comp, runs the builder, validates layers were created, checks expressions are set without errors.

**Success criteria for Phase 2:** Panel generates a visible flow field with animated trim paths. Speed and Color Mode sliders update live. Regenerate produces a different pattern.

---

### Phase 3: Stock Ticker + Sparkline

Build the complete stock ticker demo.

#### 3.1 Data fetcher

**File:** `Scripts/demos/stock_ticker/data_fetcher.jsxinc`

Depends on: `../../lib/io.jsxinc`

Functions:

**`loadStockData(scriptFile)`**
- Resolves path from `$.fileName` → repo root → `Input/sample_stock_data.json`
- Path: `scriptFile.parent.parent.parent.parent.fsName + "/Input/sample_stock_data.json"`
  - parent chain: stock_ticker/ → demos/ → Scripts/ → repo root
- Calls `readJsonFile()`
- Validates structure: checks for `stocks` array, each with `symbol`, `prices`, `current`, `change`
- Returns parsed data object or throws descriptive error

**`fetchLiveData(scriptFile, apiKey)`**
- Uses `system.callSystem()` with curl to hit a free stock API via HTTPS
- API candidate: Alpha Vantage (free tier, 25 req/day) or Yahoo Finance
- Command: `curl -s "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&apikey=KEY&outputsize=compact"`
- Parses response, transforms to project JSON format
- Creates backup of existing file first: copies `sample_stock_data.json` → `sample_stock_data.backup.json`
- Writes new data to `sample_stock_data.json`
- Returns parsed data

**`filterByDays(stockData, days)`**
- Filters each stock's prices array to the most recent N days
- Returns filtered copy (does not mutate original)

#### 3.2 Ticker builder

**File:** `Scripts/demos/stock_ticker/ticker_builder.jsxinc`

Depends on: `../../lib/helpers.jsxinc`

Config constants:
```javascript
var TICKER_CTRL = {
    LAYER_NAME: "Ticker Control",
    SCROLL_SPEED: "Scroll Speed",
    CHART_DAYS: "Chart Days",
    LINE_WEIGHT: "Line Weight",
    GAIN_LOSS: "Gain Loss Colors",
    SHOW_GRID: "Show Grid"
};
```

Functions:

**`createStockDashboardComp(name, index)`**
- Creates 1920×1080 comp, 30fps, 30 seconds (longer for scrolling)
- Dark background (near-black with slight blue tint)
- Returns CompItem

**`addTickerControlLayer(comp, config)`**
- Creates guide null "Ticker Control" with:
  - Slider: "Scroll Speed" (default 200, range conceptually 50-500)
  - Slider: "Chart Days" (default 30, range 7-90)
  - Slider: "Line Weight" (default 4, range 2-8)
  - Checkbox: "Gain Loss Colors" (default on)
  - Checkbox: "Show Grid" (default on)

**`buildTickerBar(comp, stockData)`**
- Creates a pre-comp "Ticker Bar" — wide horizontal strip
- Width = number of stocks × spacing (e.g., 8 stocks × 300px = 2400px)
- For each stock: create text layer with "SYMBOL  $PRICE  CHANGE%"
  - Font: monospace or clean sans-serif
  - Position: evenly spaced horizontally
  - Green/red coloring expression based on Gain/Loss checkbox and change value
- Nest Ticker Bar pre-comp into main comp
- Position at bottom of frame (y ≈ 950)
- Set scroll expression on position: `[value[0] - time * scrollSpeed, value[1]]`
  - When ticker scrolls fully off-screen, loop via modulo: `x % tickerWidth`
- Add semi-transparent dark background bar behind ticker

**`buildSparkline(comp, stockData, chartDays)`**
- Use first stock in array as featured stock
- Filter prices to most recent `chartDays` entries
- Map prices to path vertices:
  - X: evenly spaced across chart width (e.g., 800px)
  - Y: normalized between min/max price, mapped to chart height (e.g., 300px)
- Create shape layer with computed Bezier path (using `pointsToBezierPath` from flow field engine, or inline equivalent)
- Add stroke with color expression (green if current > first price, red if lower)
- Line Weight driven by expression reading control slider
- Add trim path for draw-on animation (0% to 100% over 3 seconds)
- Position in upper-right area of comp
- Add "SYMBOL" label text above sparkline
- Add current price text below sparkline

**`buildGridLines(comp, stockData, chartDays)`**
- Create shape layers for horizontal grid lines (3-5 lines at price intervals)
- Create shape layers for vertical grid lines (date markers)
- Opacity expression reads "Show Grid" checkbox: `showGrid ? 30 : 0`
- Subtle, thin lines (1px, low opacity)

**`wireTickerExpressions(comp)`**
- Set all expression references on ticker bar scroll, sparkline stroke, grid opacity
- All expressions reference `thisComp.layer("Ticker Control")`

**`rebuildSparkline(comp, stockData, chartDays)`**
- Remove existing sparkline and grid layers
- Rebuild with new chart days filter
- Re-wire expressions

#### 3.3 Stock ticker panel

**File:** `Scripts/demos/stock_ticker/stock_ticker_panel.jsx`

Depends on: `ticker_builder.jsxinc`, `data_fetcher.jsxinc`, `../../lib/io.jsxinc`, `../../lib/helpers.jsxinc`

**Panel UI layout:**
```
┌─ Stock Ticker ───────────────────┐
│                                   │
│  [Build Ticker]                   │
│                                   │
│  ── Controls ───────────────      │
│  Scroll Speed  [====●====] 200   │
│  Chart Days    [====●====]  30   │
│  Line Weight   [====●====]   4   │
│  ☑ Gain/Loss Colors               │
│  ☑ Show Grid                      │
│                                   │
│  [Update Sparkline]               │  ← rebuilds sparkline for new Chart Days
│                                   │
│  ── Data ───────────────────      │
│  [Fetch Live Data]                │
│  API Key: [____________]          │  ← edittext, optional
│  Status: Using bundled data       │
│                                   │
└───────────────────────────────────┘
```

**Event handlers:**

"Build Ticker" button:
1. `runAction("Build Ticker", function() { ... })`
2. Load stock data via `loadStockData()`
3. Create dashboard comp
4. Add control layer
5. Build ticker bar, sparkline, grid lines
6. Wire expressions
7. Store comp reference
8. Update status with stock count

"Update Sparkline" button:
1. Read Chart Days from panel slider
2. Rebuild sparkline in stored comp
3. Update status

"Fetch Live Data" button:
1. Read API key from edittext (warn if empty)
2. Call `fetchLiveData()` with try/catch
3. On success: update status "Fetched live data for N stocks", auto-rebuild if comp exists
4. On failure: show error in status, keep existing data

Live controls (Scroll Speed, Line Weight, checkboxes):
- On change → find control layer → update corresponding effect value
- Checkboxes map to 1/0 on the Checkbox Control

#### 3.4 Stock ticker integration test

**File:** `Scripts/tests/test_stock_ticker_integration.jsx`

Validates: data loads, comp creates, ticker bar has correct number of text layers, sparkline shape layer exists, expressions are valid.

**Success criteria for Phase 3:** Panel builds a scrolling ticker with sparkline. Sliders update live. Gain/Loss colors toggle works. Grid toggles on/off. Chart Days rebuild works.

---

### Phase 4: Polish & Documentation

#### 4.1 Performance safeguards

In `flow_field_builder.jsxinc`:
- Hard cap density at 300 streamlines
- Default to 150 for comfortable generation speed
- Show generation count in status before starting

In `ticker_builder.jsxinc`:
- Validate stock data has expected fields before building
- Graceful fallback if a stock has fewer prices than Chart Days

#### 4.2 Error handling

Both panels:
- Wrap all actions in `runAction()` (existing pattern from `automation_lab_panel.jsx`)
- Validate `app.project` exists before any operation
- Check `comp instanceof CompItem` when referencing stored comp
- Catch and display expression errors: check `prop.expressionError` after setting expressions
- Show descriptive status messages (green for success, red for errors)

#### 4.3 Documentation

Update `docs/recipes.md` to mention the demos as advanced examples.

Add a brief section to `README.md` about the demo panels (where to find them, how to install).

Each demo directory gets a brief README:
- `Scripts/demos/flow_field/README.md` — what it does, how to install, controls reference
- `Scripts/demos/stock_ticker/README.md` — what it does, how to install, controls reference, data format

#### 4.4 Shared utility extraction

If both demos share significant Bezier/path code, extract to:
- `Scripts/lib/shapes.jsxinc` — `pointsToBezierPath()`, `simplifyPoints()`, `createShapeFromPoints()`

Only do this if there's genuine duplication. Don't create preemptively.

## Acceptance Criteria

### Functional Requirements

- [ ] Flow Field panel generates visible organic flowing lines in a new comp
- [ ] Flow Field Speed slider updates trim path animation in real-time
- [ ] Flow Field Color Mode changes stroke colors in real-time
- [ ] Flow Field Regenerate produces a different pattern with new settings
- [ ] Stock Ticker panel builds scrolling ticker bar from bundled JSON data
- [ ] Stock Ticker sparkline draws on with animated trim path
- [ ] Scroll Speed, Line Weight update in real-time via expressions
- [ ] Gain/Loss Colors checkbox toggles green/red text
- [ ] Show Grid checkbox toggles grid line visibility
- [ ] Update Sparkline button rebuilds sparkline for new Chart Days value
- [ ] Both panels work in docked and floating modes

### Non-Functional Requirements

- [ ] All code is ES3/ExtendScript compatible (no let, const, arrow functions, template literals)
- [ ] Flow field generation completes in < 10 seconds at default settings
- [ ] Both panels follow the existing IIFE + dockable panel pattern
- [ ] All changes wrapped in `app.beginUndoGroup()` / `app.endUndoGroup()`
- [ ] Expression effect names match between builder code and expression strings (single config object)

### Quality Gates

- [ ] `Scripts/tests/test_shape_layer.jsx` passes in AE
- [ ] `Scripts/tests/test_perlin.jsx` passes in AE
- [ ] Both integration tests pass in AE
- [ ] Flow field renders correctly at 1920×1080
- [ ] Stock ticker renders correctly at 1920×1080

## Dependencies & Prerequisites

- After Effects CC 2020+ (shape layer scripting API)
- AE preference "Allow Scripts to Write Files and Access Network" (for live data fetch)
- macOS with curl (for HTTPS fetch — Windows would need PowerShell equivalent)

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Shape layer API behaves differently than documented | Medium | High | Phase 1 proof-of-concept validates before building full features |
| Perlin noise runs too slow in ExtendScript | Low | High | Point simplification reduces vertex count. Cap at 300 streamlines. |
| Expression string escaping issues | Medium | Medium | Use single quotes inside expressions, array.join("\n") pattern |
| AE freezes during high-density generation | Low | Medium | Hard cap at 300, status feedback, reasonable defaults |
| curl not available on user's system | Low | Low | Live fetch is optional; bundled data always works |
| Alpha Vantage API changes or rate limits | Medium | Low | Bundled data is primary; live fetch is bonus feature |

## File Summary

| File | Phase | New/Edit | Purpose |
|------|-------|----------|---------|
| `Scripts/demos/flow_field/flow_field_engine.jsxinc` | 1 | New | Perlin noise + streamline math |
| `Scripts/demos/flow_field/flow_field_builder.jsxinc` | 2 | New | AE comp/layer/expression creation |
| `Scripts/demos/flow_field/flow_field_panel.jsx` | 2 | New | ScriptUI panel UI |
| `Scripts/demos/stock_ticker/stock_ticker_panel.jsx` | 3 | New | ScriptUI panel UI |
| `Scripts/demos/stock_ticker/ticker_builder.jsxinc` | 3 | New | Ticker + sparkline layer creation |
| `Scripts/demos/stock_ticker/data_fetcher.jsxinc` | 3 | New | JSON loading + HTTPS fetch |
| `Input/sample_stock_data.json` | 1 | New | Bundled stock price data |
| `Scripts/tests/test_shape_layer.jsx` | 1 | New | Shape layer API proof-of-concept |
| `Scripts/tests/test_perlin.jsx` | 1 | New | Perlin noise unit tests |
| `Scripts/tests/test_flow_field_integration.jsx` | 2 | New | Flow field end-to-end test |
| `Scripts/tests/test_stock_ticker_integration.jsx` | 3 | New | Stock ticker end-to-end test |
| `Scripts/demos/flow_field/README.md` | 4 | New | Installation + usage guide |
| `Scripts/demos/stock_ticker/README.md` | 4 | New | Installation + usage guide |
| `docs/recipes.md` | 4 | Edit | Mention demos as advanced examples |

## References & Research

### Internal References
- Panel pattern: `Scripts/panel/automation_lab_panel.jsx` (IIFE, runAction, ScriptUI layout)
- JSON loading: `Scripts/lib/io.jsxinc:18-33` (readJsonFile)
- Include paths: `example/Scripts/update_card.jsx:24-36`
- Test pattern: `Scripts/tests/test_helpers.jsx`
- Config pattern: `Scripts/recipes/repeating-elements/example_config.jsxinc`

### External References
- AE Scripting Guide: https://ae-scripting.docsforadobe.dev/
- Shape layer match names: https://ae-scripting.docsforadobe.dev/matchnames/layer/shapelayer.html
- Ken Perlin's Improved Noise: https://mrl.cs.nyu.edu/~perlin/noise/

### Design Documents
- Brainstorm: `docs/brainstorms/2026-03-03-demo-panels-brainstorm.md`
- Design: `docs/plans/2026-03-03-demo-panels-design.md`
