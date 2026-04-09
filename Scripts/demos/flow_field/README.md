# Flow Field Generator

Dockable ScriptUI panel that generates Perlin noise-driven flowing line art in a new After Effects comp.

## Files

- `flow_field_panel.jsx` — installable dockable panel
- `flow_field_engine.jsxinc` — pure Perlin noise and streamline math
- `flow_field_builder.jsxinc` — comp, shape layer, and expression construction

## Install

1. Symlink [`flow_field_panel.jsx`](flow_field_panel.jsx) into After Effects' `Scripts/ScriptUI Panels` folder, or use an equivalent path in your own clone such as `/path/to/repo/Scripts/demos/flow_field/flow_field_panel.jsx`.
2. Restart After Effects.
3. Open it from **Window > Flow Field Generator**.

## Controls

- `Turbulence` — noise frequency; lower values create broader currents
- `Density` — target streamline count, capped at 300
- `Line Length` — maximum integration steps per line
- `Speed` — live trim-path animation speed
- `Color Mode` — live palette switching across mono, warm, cool, and rainbow

## Notes

- `Generate Flow Field` creates a new comp each time.
- `Regenerate` rebuilds the streamline layers in the most recently generated comp.
- The generated comp exposes a `Flow Control` null so the expression controls remain editable in AE.
