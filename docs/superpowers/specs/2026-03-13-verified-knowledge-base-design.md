# Verified AE Knowledge Base & Diagnostic Framework — Design Spec

**Date:** 2026-03-13
**Status:** Approved

## Problem

AI assistants writing ExtendScript for After Effects consistently produce code that looks syntactically correct but fails silently at runtime. The root cause: AE's scripting API has undocumented match-names, 1-indexed enums, property type quirks, and runtime behaviors (like layer index shifting) that don't appear in any official documentation. AI models guess these values and get them wrong. AE doesn't error — it just doesn't work.

Errors encountered on the audio-spectrum project alone:
- Wrong effect match-name (`"ADBE Audio Spectrum"` doesn't work; `"ADBE AudSpect"` does)
- Wrong enum value (Display Options is 1-indexed, not 0-indexed)
- Third-party plugin name collision (HitFilm intercepting `"Audio Spectrum"`)
- Layer index mutation after `addSolid()` invalidating previously-looked-up indices
- Expressions compiling without error but evaluating to zero (sampleImage returning black)

All of these are silent failures. The script "succeeds" but produces wrong visual results.

## Solution

A three-part system that eliminates AI guessing by providing empirically verified ground truth:

1. **Verified Knowledge Base** (`Scripts/verified/`) — JSON files containing match-names, property types, enum values, and warnings, verified by running discovery scripts in AE
2. **Discovery & Diagnostic Tooling** (`Scripts/verified/tools/`) — Scripts the maintainer runs to populate the knowledge base and diagnose runtime issues
3. **CLAUDE.md Integration** — Instructions that tell the AI to read verified data before writing code, and to never guess match-names

### Design Principles

- **Maintainer does the hard work, users get it for free.** The repo maintainer (template author) runs discovery scripts and commits verified JSON. Future users open the project and the AI reads verified data from day one.
- **Never guess what you can verify.** If an effect isn't in the database, the AI should generate a discovery script — not guess match-names.
- **Compound over time.** Every effect catalogued benefits all future projects that use this template.
- **Fail loudly.** Diagnostic scripts surface exactly what went wrong instead of leaving the user staring at motionless layers.

---

## Part 1: Verified Knowledge Base

### Location

`Scripts/verified/`

### Structure

```
Scripts/verified/
├── README.md                         # Explains the system (for AI and humans)
├── effects/
│   ├── ADBE-AudSpect.json           # Audio Spectrum
│   ├── ADBE-Mosaic.json             # Mosaic
│   ├── ADBE-Glo2.json               # Glow
│   └── ...                          # One file per verified effect
├── properties/
│   ├── shape-layer.json             # Shape layer property tree
│   └── ...                          # Future: text-layer.json, camera.json, etc.
├── gotchas.md                        # Runtime pitfalls not tied to a specific effect
└── tools/
    ├── discover_effect.jsx           # Universal effect discovery (maintainer tool)
    ├── discover_shape_properties.jsx # Shape layer property discovery (maintainer tool)
    └── diagnose_audio_spectrum.jsx   # Post-setup diagnostic for audio-spectrum example
```

**Filename convention:** Effect JSON files replace spaces in the match-name with hyphens (e.g., `ADBE AudSpect` → `ADBE-AudSpect.json`).

### Effect JSON Schema

Each file in `effects/` follows this structure.

**Field notes:**
- `addPropertyName`: The string to pass to `addProperty()`. Always use the match-name, never the display name, to avoid third-party plugin interception.
- `knownAliases` and `warnings`: Not auto-discoverable. The discovery script outputs these as empty — the maintainer fills them in from experience.
- `verifiedAEVersion`: The AE version used when running the discovery script. If more than one major version behind the user's AE, the AI should suggest re-running discovery.

```json
{
  "displayName": "Audio Spectrum",
  "matchName": "ADBE AudSpect",
  "addPropertyName": "ADBE AudSpect",
  "category": "Effect",
  "verifiedDate": "2026-03-13",
  "verifiedAEVersion": "25.2",
  "totalProperties": 24,
  "properties": [
    {
      "index": 1,
      "name": "Audio Layer",
      "matchName": "ADBE AudSpect-0001",
      "valueType": "integer",
      "defaultValue": 0,
      "notes": "Layer index (1-based integer), NOT layer name string"
    }
  ],
  "knownAliases": {
    "work": ["ADBE AudSpect", "Audio Spectrum"],
    "doNotUse": ["ADBE Audio Spectrum"]
  },
  "warnings": [
    "Third-party plugins (e.g., HitFilm) may intercept the display name 'Audio Spectrum' via addProperty() — always use matchName 'ADBE AudSpect'",
    "Display Options enum: 1=Digital, 2=Analog Lines, 3=Analog Dots (1-indexed, NOT 0-indexed)",
    "Inside/Outside Color are RGBA 4-element arrays [r,g,b,a], not RGB 3-element"
  ]
}
```

### Shape Layer Properties JSON

`properties/shape-layer.json` captures the property tree for shape layers (not an effect, so it gets its own file):

```json
{
  "type": "Shape Layer Properties",
  "verifiedDate": "2026-03-13",
  "verifiedAEVersion": "25.2",
  "tree": {
    "contents": {
      "matchName": "ADBE Root Vectors Group",
      "children": {
        "group": {
          "matchName": "ADBE Vector Group",
          "addPropertyName": "ADBE Vector Group",
          "children": {
            "groupContents": {
              "matchName": "ADBE Vectors Group",
              "children": {
                "rectangle": { "matchName": "ADBE Vector Shape - Rect", "addPropertyName": "ADBE Vector Shape - Rect" },
                "ellipse": { "matchName": "ADBE Vector Shape - Ellipse", "addPropertyName": "ADBE Vector Shape - Ellipse" },
                "solidFill": { "matchName": "ADBE Vector Graphic - Fill", "addPropertyName": "ADBE Vector Graphic - Fill" },
                "gradientFill": { "matchName": "ADBE Vector Graphic - G-Fill", "addPropertyName": "ADBE Vector Graphic - G-Fill" }
              }
            }
          }
        }
      }
    },
    "transform": {
      "matchName": "ADBE Transform Group",
      "children": {
        "anchorPoint": { "matchName": "ADBE Anchor Point" },
        "position": { "matchName": "ADBE Position" },
        "scale": { "matchName": "ADBE Scale" },
        "rotation": { "matchName": "ADBE Rotate Z" },
        "opacity": { "matchName": "ADBE Opacity" }
      }
    }
  },
  "propertyDetails": [
    { "matchName": "ADBE Vector Rect Size", "parent": "ADBE Vector Shape - Rect", "valueType": "array2d" },
    { "matchName": "ADBE Vector Rect Roundness", "parent": "ADBE Vector Shape - Rect", "valueType": "number" },
    { "matchName": "ADBE Vector Ellipse Size", "parent": "ADBE Vector Shape - Ellipse", "valueType": "array2d" },
    { "matchName": "ADBE Vector Fill Color", "parent": "ADBE Vector Graphic - Fill", "valueType": "array4d", "notes": "RGBA [r,g,b,a] in expression context; RGB [r,g,b] via setValue() in script context" },
    { "matchName": "ADBE Vector Grad Type", "parent": "ADBE Vector Graphic - G-Fill", "valueType": "integer", "notes": "1=Linear, 2=Radial" },
    { "matchName": "ADBE Vector Grad Start Pt", "parent": "ADBE Vector Graphic - G-Fill", "valueType": "array2d" },
    { "matchName": "ADBE Vector Grad End Pt", "parent": "ADBE Vector Graphic - G-Fill", "valueType": "array2d" },
    { "matchName": "ADBE Vector Grad Colors", "parent": "ADBE Vector Graphic - G-Fill", "valueType": "NO_VALUE", "notes": "Cannot be read/set via getValue/setValue. Proprietary format — requires workaround." }
  ]
}
```

### Gotchas Document

`Scripts/verified/gotchas.md` — runtime pitfalls for AI to read:

```markdown
# AE Scripting Gotchas (Verified)

## Layer Index Shifting
Adding a layer via addSolid(), addShape(), etc. pushes all existing layers
down by one index. If you looked up an audio layer index BEFORE adding a new
layer, that index is now stale. Always re-lookup layer indices by name AFTER
all layer creation is complete.

## Expression Engine vs Script Engine
- .jsx scripts run in ExtendScript (ES3): var only, no arrow functions, etc.
- Expressions run in AE's JavaScript engine (ES6+ by default since CC 2019)
- Expressions CAN use const/let but use var for compatibility with users
  on the legacy ExtendScript expression engine

## sampleImage() Behavior
- sampleImage(point, radius, postEffect, time)
- postEffect=true (default) samples AFTER all effects on the layer
- Only applies to effects on the sampled layer — adjustment layers above
  are NOT included
- Guide layers: UNVERIFIED — Phase 2 diagnose will test this and update this entry

## setValue() Type Mismatches
- setValue() silently accepts wrong-length arrays
- RGBA properties (Inside Color, Outside Color) need 4-element arrays
- Setting a 3-element [r,g,b] on a 4-element property may silently fail
  or produce unexpected results

## Effect Enum Values
- Many AE effect enums are 1-indexed, not 0-indexed
- Always verify enum values via discovery scripts — do not assume 0-based
- Example: Audio Spectrum Display Options: 1=Digital, 2=Analog Lines, 3=Analog Dots
```

---

## Part 2: Discovery & Diagnostic Tooling

### Location

`Scripts/verified/tools/` — all tooling lives inside the verified directory tree.

### Scripts

#### `tools/discover_effect.jsx`

Universal effect discovery script. Applies an effect to a temp solid, dumps every property to a JSON file in `Scripts/verified/effects/`, cleans up.

**Input:** Effect match-name (configured at top of script or via prompt).

**Output:** JSON file in `Scripts/verified/effects/<matchName-with-hyphens>.json` following the schema above (spaces replaced with hyphens in filename).

**Behavior:**
1. Find or create a temp comp
2. Add a temp solid
3. Apply the effect via `addProperty(matchName)`
4. Iterate all properties: log index, name, matchName, propertyValueType, and current value
5. Write structured JSON to `Scripts/verified/effects/` — includes empty `knownAliases` object (with empty `work` and `doNotUse` arrays) and an empty `warnings` array for the maintainer to fill in manually
6. Clean up temp layers/comp
7. Show summary alert with property count and output file path

#### `tools/discover_shape_properties.jsx`

Same concept for shape layer property trees. Creates a shape layer, adds rectangle, ellipse, solid fill, gradient fill, stroke — dumps all match-names and property types. Writes to `Scripts/verified/properties/shape-layer.json`.

#### Diagnostic Scripts

Diagnostic scripts are **project-specific** — each example or project gets its own diagnose script that lives alongside its setup script. The diagnostic follows a standard pattern but includes project-specific checks.

**Location convention:** `examples/<project>/diagnose.jsx` (not in `Scripts/verified/tools/`).

For the audio-spectrum example: `examples/audio-spectrum/diagnose.jsx`.

**Standard checks (all diagnostic scripts should include):**
1. Layer existence by name
2. Effect presence and match-name confirmation on each layer
3. Property values match expected (compare against config)
4. Expression presence and expression error checking
5. sampleImage() evaluation test — create a temp layer with a test expression, read back actual sample values at multiple time points

**Audio-spectrum specific checks:**
1. AS_DATA layer exists, is a guide layer, is enabled
2. Audio Spectrum effect on AS_DATA has correct audio layer index
3. Mosaic effect has correct block count
4. AS BAR 1 scale expression exists, has no error
5. sampleImage() of AS_DATA at bar 1's sample coordinate returns non-zero brightness at a time point where audio is playing

**Output:** Results saved to a text file next to the diagnose script (e.g., `examples/audio-spectrum/diagnose_results.txt`) — structured, readable by both humans and AI.

**Shared helpers:** For now, each diagnostic script is self-contained (copy-paste the standard checks). If a pattern emerges across multiple examples, extract shared helpers into `Scripts/verified/tools/diagnose_helpers.jsxinc` later. Don't over-abstract before there are multiple consumers.

---

## Part 3: CLAUDE.md Integration

Add to CLAUDE.md:

```markdown
## Verified AE Data (`Scripts/verified/`)

Before writing any script that applies an AE effect or accesses shape layer properties:

1. **Check `Scripts/verified/effects/` for the effect's JSON file**
   - Use the exact `matchName` and `addPropertyName` from the JSON
   - Use property match-names from the `properties` array — never guess indices
   - Read the `warnings` array for known pitfalls

2. **Check `Scripts/verified/properties/shape-layer.json`** for shape layer property trees

3. **Read `Scripts/verified/gotchas.md`** for runtime pitfalls (layer index shifting,
   expression engine differences, silent type mismatches)

4. **If an effect is NOT in the verified database:**
   - Do NOT guess match-names — they will likely be wrong
   - Generate a discovery script for the user to run in AE
   - Wait for the verified JSON before writing implementation code

5. **Staleness check:** If the `verifiedAEVersion` in a JSON file is more than one
   major version behind the user's AE version, suggest re-running the discovery
   script to confirm nothing has changed.

## Diagnostic Workflow

If a script runs but produces unexpected visual results:

1. Ask the user to run the project's `diagnose.jsx` script in AE
   (e.g., `examples/audio-spectrum/diagnose.jsx` for the audio-spectrum example)
2. Read the results from the diagnose output file next to the script
3. Debug from actual runtime data, not assumptions
```

---

## Implementation Order

### Phase 1: Discovery tooling + initial knowledge base
1. `Scripts/verified/tools/discover_effect.jsx` — universal effect discovery
2. `Scripts/verified/tools/discover_shape_properties.jsx` — shape layer discovery
3. Run discovery for ADBE AudSpect, ADBE Mosaic, ADBE Glo2 (user runs in AE)
4. Commit generated JSON files to `Scripts/verified/effects/`
5. Write `Scripts/verified/gotchas.md` from lessons learned
6. Write `Scripts/verified/README.md`

### Phase 2: Diagnostic tooling + audio-spectrum fix
7. `examples/audio-spectrum/diagnose.jsx` — rewrite with sampleImage evaluation test
8. User runs diagnose on current audio-spectrum setup
9. Fix the scale bug using actual diagnostic data
10. Update `Scripts/verified/gotchas.md` with whatever the root cause turns out to be (especially sampleImage + guide layer behavior)

### Phase 3: CLAUDE.md integration
11. Add verified data instructions to CLAUDE.md
12. Update CLAUDE.md diagnostic workflow section

### Phase 4: Cleanup
13. Remove pre-framework files from examples/audio-spectrum/: verify.jsx, verify_stock.jsx, verify_results_*.txt, verify_stock_results.txt
14. Commit data-layer.jsxinc fixes
