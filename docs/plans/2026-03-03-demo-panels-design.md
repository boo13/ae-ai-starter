# Demo Panels Design

**Date:** 2026-03-03
**Brainstorm:** `docs/brainstorms/2026-03-03-demo-panels-brainstorm.md`
**Status:** Approved

## Summary

Two standalone demo panels for ae-ai-starter that showcase AI-assisted After Effects scripting to potential users:

1. **Flow Field Generator** — Perlin noise-driven generative art with organic flowing lines
2. **Stock Ticker + Sparkline** — Broadcast-style scrolling ticker with animated chart from financial data

Both are separate dockable ScriptUI panels with ~5 slider/checkbox controls each. They use the standard AE control rig pattern (expressions reading Slider/Checkbox Controls on a null layer) for real-time feedback.

## File Structure

```
Scripts/demos/flow_field/
  flow_field_panel.jsx        ← Panel UI + generation orchestration
  flow_field_engine.jsxinc    ← Perlin noise + streamline tracing math
  flow_field_builder.jsxinc   ← AE comp/layer/expression construction

Scripts/demos/stock_ticker/
  stock_ticker_panel.jsx      ← Panel UI + build orchestration
  ticker_builder.jsxinc       ← Ticker bar + sparkline layer construction
  data_fetcher.jsxinc         ← JSON file reader + optional live API fetch

Input/
  sample_stock_data.json      ← Bundled realistic stock data (~8 stocks, 30 days)
```

## Demo 1: Flow Field Generator

### Generation Pipeline

1. Create comp (1920x1080, user's FPS) or use active comp
2. Create "Flow Control" null layer with Slider Controls
3. Compute 2D Perlin noise field (ES3 implementation)
4. Trace N streamlines via Euler integration through the noise field
5. Convert point sequences to smooth Bezier paths
6. Create shape layers with computed paths, trim paths, and stroke expressions
7. Wire all expressions to the Flow Control layer's sliders

### Math Components (flow_field_engine.jsxinc)

- **Perlin noise:** Permutation table (256 entries), gradient vectors, fade/lerp interpolation. Standard implementation adapted to ES3.
- **Streamline tracing:** For each seed point, step through the noise field. At each step: sample noise at current position → compute angle → move in that direction by step size → accumulate point. Stop at max steps or when leaving bounds.
- **Bezier smoothing:** Convert raw point array to cubic Bezier control points using Catmull-Rom-to-Bezier conversion.

### Controls → Expressions

| Control | Expression reads | Updates |
|---------|-----------------|---------|
| Turbulence | Used at generation time only | Regenerate |
| Density | Used at generation time only | Regenerate |
| Line Length | Used at generation time only | Regenerate |
| Speed | `effect("Speed")("Slider")` | Live |
| Color Mode | `effect("Color Mode")("Slider")` | Live |

Speed: `trimEnd = time * speed * 100 / totalDuration`
Color: Expression maps mode 0-3 to palette arrays, assigns based on streamline index.

## Demo 2: Stock Ticker + Sparkline

### Build Pipeline

1. Read `Input/sample_stock_data.json`
2. Create "Stock Dashboard" main comp (1920x1080)
3. Create "Ticker Bar" sub-comp — wide comp with text layers per stock, positioned side by side
4. Nest Ticker Bar in main comp with scroll expression
5. Create sparkline shape layer — path from price data, trim path for draw-on
6. Create background elements (grid lines if enabled)
7. Create "Ticker Control" null with sliders/checkboxes
8. Wire expressions

### Data Format (sample_stock_data.json)

```json
{
  "stocks": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "prices": [
        { "date": "2026-02-01", "close": 243.50 },
        { "date": "2026-02-02", "close": 245.10 }
      ],
      "current": 248.30,
      "change": "+1.97%"
    }
  ]
}
```

### Sparkline Path Construction

- Y mapping: `y = compHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight`
- X mapping: `x = (index / totalPoints) * chartWidth`
- Shape path: array of [x, y] vertices → shape layer path property

### Controls → Expressions

| Control | Expression reads | Updates |
|---------|-----------------|---------|
| Scroll Speed | `effect("Scroll Speed")("Slider")` | Live |
| Chart Days | Used at build time (filters data) | Rebuild |
| Line Weight | `effect("Line Weight")("Slider")` | Live |
| Gain/Loss Colors | `effect("Gain/Loss Colors")("Checkbox")` | Live |
| Show Grid | `effect("Show Grid")("Checkbox")` | Live |

### Optional Live Fetch (data_fetcher.jsxinc)

Uses ExtendScript `Socket` object:
1. Open socket to API host
2. Send HTTP GET request
3. Read response, parse JSON
4. Write to `Input/sample_stock_data.json` (overwrites bundled data)
5. Re-run build

API candidate: Alpha Vantage (free tier, 25 requests/day) or similar.

## Shared Patterns

Both panels follow these conventions:
- `app.beginUndoGroup()` / `app.endUndoGroup()` wrapping
- `#include` for library loading
- Control null layer with named Slider/Checkbox Controls
- Expressions use `thisComp.layer("Control Layer Name").effect("Control Name")("Slider")`
- Existing `Scripts/lib/io.jsxinc` for JSON reading
- Existing `Scripts/lib/helpers.jsxinc` for utility functions
