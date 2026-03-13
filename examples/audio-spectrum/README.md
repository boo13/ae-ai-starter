# Audio Spectrum

A fully custom, expression-driven audio spectrum visualizer for After Effects. Uses the stock Audio Spectrum effect as a hidden data source and builds styleable shape layers for the visible bars.

## What it does

- Creates a hidden data layer (`AS_DATA`) that converts audio into per-frequency brightness values
- Generates N shape layers (`AS BAR 1..N`) that sample the data layer via `sampleImage()` expressions
- Bars animate automatically — no keyframes needed

## Improvements over stock Audio Spectrum

- **Logarithmic frequency scale** — musically correct spacing (bass gets more room)
- **4 display modes** — BARS_UP, BARS_DOWN, MIRROR, RADIAL
- **Per-bar styling** — width, gap, corner radius, color, glow
- **Color modes** — SOLID color or HUE_SPECTRUM across bars
- **Individual layer control** — each bar is its own shape layer
- **Re-runnable** — change config and re-run; old layers are auto-cleaned

## Prerequisites

- An AE project with a composition containing an audio layer
- The audio layer can be a precomp, audio file, or any layer with audio

## Setup

1. Open `example_config.jsxinc` and set:
   - `COMP_NAME` — name of your target composition
   - `AUDIO_LAYER_NAME` — name of the audio layer in that comp
   - Adjust other settings to taste

2. Run `File > Scripts > Run Script File...` → select `setup.jsx`

3. Press spacebar to preview

## Configuration

All settings are in `example_config.jsxinc`. Key options:

| Setting | Default | Description |
|---------|---------|-------------|
| `NUM_BARS` | 32 | Number of frequency bars (32-64 recommended) |
| `FREQ_SCALE` | `"LOG"` | `"LOG"` (musical) or `"LINEAR"` |
| `DISPLAY_MODE` | `"BARS_UP"` | `"BARS_UP"`, `"BARS_DOWN"`, `"MIRROR"`, `"RADIAL"` |
| `COLOR_MODE` | `"HUE_SPECTRUM"` | `"SOLID"` or `"HUE_SPECTRUM"` |
| `MAX_HEIGHT` | 300 | Maximum bar height in pixels |
| `SMOOTHING` | 50 | Audio duration averaging in ms (higher = smoother) |
| `GLOW_ENABLED` | true | Add glow effect to each bar |
| `PEAK_MARKERS` | false | Floating dots above bars |

## Re-running

Change any config value and re-run `setup.jsx`. The script removes all existing `AS_` layers before creating new ones.

## Display modes

- **BARS_UP** — bars grow upward from a baseline
- **BARS_DOWN** — bars grow downward from a baseline
- **MIRROR** — bars grow both up and down from center
- **RADIAL** — bars arranged in a circle, growing outward

## Performance

Each bar evaluates a `sampleImage()` expression every frame. With peak markers enabled, that doubles. Expect slower RAM previews at higher bar counts:

- 32 bars: smooth on most systems
- 64 bars: noticeable lag during preview
- 128+ bars: not recommended

## File structure

```
audio-spectrum/
├── example_config.jsxinc    # All user settings
├── setup.jsx                # Run this in AE
├── README.md                # This file
└── lib/
    ├── cleaner.jsxinc       # Removes existing AS_ layers
    ├── data-layer.jsxinc    # Creates hidden AS_DATA layer
    ├── expressions.jsxinc   # Expression template strings
    └── bar-factory.jsxinc   # Creates shape layers + expressions
```

## Future work

- GRADIENT color mode (gradient fill color stop format needs verification)
- Custom path tracing (map spectrum to arbitrary mask path)
- Beat counting / sequential triggers
- Echo/trail effects
