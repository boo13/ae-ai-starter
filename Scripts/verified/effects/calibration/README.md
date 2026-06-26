# Effect Enum Calibration

Sidecar JSON files written by `../../tools/calibrate_effect.jsx`. Each maps an
effect's dropdown/enum UI labels to their **empirically verified** integer values
on the installed AE version, and lists controls that are not scriptable.

One file per effect, named by the effect match-name (e.g. `ADBE-Fractal-Noise.json`).

## Format

```json
{
  "displayName": "Fractal Noise",
  "matchName": "ADBE Fractal Noise",
  "verifiedAEVersion": "26.0x67",
  "enums": {
    "ADBE Fractal Noise-0001": {
      "name": "Fractal Type",
      "valueType": "OneD",
      "values": { "Basic": 1, "Dynamic": 4, "Smeary": 7 }
    }
  },
  "unsupported": [
    { "label": "Creative Look", "note": "only changed an unreadable CUSTOM_VALUE property; not scriptable" }
  ]
}
```

## How it's consumed

The downstream `ae-ai-chat` generator (`scripts/generate-knowledge.mjs`) merges
these by match-name: `enums` become per-property `enum` maps in the effect
records the model sees, and `unsupported` entries become effect warnings.

Never hand-write integers here. Only values captured through the UI by
`calibrate_effect.jsx` belong in these files.
