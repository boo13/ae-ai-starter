# Example: Social Media Card Automation

This example demonstrates how to use the ae-ai-starter recipes to automate a hypothetical social media card template in After Effects.

## The AE Template (Hypothetical)

The example assumes an After Effects project with this structure:

```
SOCIAL CARD TEMPLATE (main comp, 1920x1080)
  |-- Control (null layer)
  |-- CARD 1 (pre-comp)
  |     |-- Image (placeholder footage layer)
  |     |-- Text layers (driven by Essential Properties)
  |-- CARD 2 (pre-comp)
  |     |-- Image
  |     |-- Text layers
  |-- CARD 3 (pre-comp)
  ...
```

Each card pre-comp exposes three Essential Properties:

- **Headline** -- Large text at the top of the card
- **Body Text** -- Descriptive paragraph below the headline
- **Category** -- Small label (e.g., "Science", "Business")

Each card also contains an **Image** layer that serves as a placeholder for per-card imagery.

## How update_card.jsx Works

The script follows five steps:

### 1. Load JSON Data

Reads `Input/sample_data.json`, which contains a `settings` object (timing parameters) and a `cards` array (content for each card).

### 2. Build a Registry

Uses the **repeating-elements** recipe to walk the composition once and collect references to every `CARD N` layer and its Essential Properties. This avoids repeated layer lookups during the update loop.

### 3. Update Text Properties

A property map links JSON field names to Essential Property names:

```javascript
var propertyMap = {
    "headline": "Headline",     // data.headline  ->  EP "Headline"
    "body": "Body Text",        // data.body      ->  EP "Body Text"
    "category": "Category"      // data.category  ->  EP "Category"
};
```

The updater iterates the cards array, sets each property on the matching layer, and hides unused card slots.

### 4. Import and Place Images

Uses the **image-swap** recipe to import each card's image file into the AE Project panel and replace the placeholder "Image" layer inside the card pre-comp. Images are scaled to fill the composition.

### 5. Calculate Timing

Uses the **data-timing** recipe to compute display durations from word counts. Each card's `inPoint` and `outPoint` are set so cards appear sequentially, with duration proportional to their text content.

## Which Recipes Are Used

| Recipe | Purpose in This Example |
|---|---|
| `repeating-elements` | Discovers CARD 1..N layers and their Essential Properties |
| `image-swap` | Imports images and replaces placeholder footage layers |
| `data-timing` | Computes per-card display duration from word counts |

## Adapting for Your Project

1. **Change the config.** Copy `Scripts/config.jsxinc` and adjust `MAIN_COMP_NAME`, `ELEMENT_PREFIX`, and `ESSENTIAL_PROPERTIES` to match your template.

2. **Change the data format.** Edit `Input/sample_data.json` to match your content structure. Update the property map in `update_card.jsx` to link your JSON fields to your Essential Property names.

3. **Change the image handling.** If your template does not use images, remove the image import section. If images are on the main comp instead of inside pre-comps, call `replaceLayerSource` on the main comp directly.

4. **Change the timing model.** Adjust `seconds_per_word` and `min_duration` in the settings, or replace word-count timing with fixed durations or frame-based timing.

## Running the Script

This script will not run without the matching AE template. It serves as a readable reference for how to combine the recipes into a complete automation workflow. To adapt it:

1. Create an AE template following the structure above (or your own variation).
2. Run `Scripts/setup.jsx` from the repo root to configure the project.
3. Copy and modify `update_card.jsx` to match your template.
4. Run your script via `File > Scripts > Run Script File...` in After Effects.
