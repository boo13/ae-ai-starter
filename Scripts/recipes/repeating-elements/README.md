# Repeating Elements Recipe

Automates After Effects templates that contain multiple similarly-named layers driven by external data. For example, a list of text cards named "CARD 1", "CARD 2", ..., "CARD 20" where each card has Essential Properties like "Text Content" and "Visibility".

## When to Use This

Use this recipe when your AE template has:

- **N identically-structured layers** with a shared naming pattern (e.g. `ELEMENT 1`, `ELEMENT 2`, ...)
- **Essential Properties** exposed on each layer that need to be set from data
- A **control layer** that drives animation or visibility
- A **JSON data file** providing the content for each slot

This is the foundation for any "data-driven repeated content" workflow: scorecards, text lists, chat messages, leaderboard entries, schedule items, etc.

## Files

| File | Purpose |
|---|---|
| `example_config.jsxinc` | Configuration constants to customize for your template |
| `registry.jsxinc` | Discovers layers and caches Essential Property references |
| `updater.jsxinc` | Applies data to layers and hides unused slots |

## How It Works

### 1. Registry Phase

The script walks the composition once at startup:

1. Finds the main comp by name (`Config.MAIN_COMP_NAME`)
2. Finds the control layer (`Config.CONTROL_LAYER_NAME`)
3. Iterates `ELEMENT 1` through `ELEMENT N`, collecting Essential Property references for each

This avoids repeated layer lookups during the update loop.

### 2. Update Phase

For each entry in your data array, the updater:

1. Maps data field names to Essential Property names via a **property map**
2. Sets each property value on the corresponding layer
3. Hides any unused element slots (sets opacity to 0, disables the layer)

## What to Customize

### Config Values

Copy `example_config.jsxinc` and adjust:

- `MAIN_COMP_NAME` -- the exact name of your template composition
- `CONTROL_LAYER_NAME` -- the name of your control/driver layer
- `ELEMENT_PREFIX` -- how your layers are named (include trailing space)
- `MAX_ELEMENTS` -- how many slots to scan
- `ESSENTIAL_PROPERTIES` -- array of EP names to gather

### Property Map

The updater uses a property map to decouple your JSON field names from AE property names:

```javascript
var propertyMap = {
    "text": "Text Content",     // dataEntry.text  -->  EP "Text Content"
    "visible": "Visibility"     // dataEntry.visible --> EP "Visibility"
};
```

This means you can change your JSON schema without touching the AE template, or vice versa.

### Adding Custom Logic

Common extensions:

- **Stacking/positioning**: After updating, loop through populated elements and adjust their Position property based on content height
- **Control layer effects**: Toggle checkboxes or sliders on the control layer to trigger animations
- **Conditional visibility**: Add logic in `applyDataToElement` to show/hide based on data values

## Usage Example

```javascript
#include "../../lib/helpers.jsxinc"
#include "config.jsxinc"
#include "registry.jsxinc"
#include "updater.jsxinc"

// Build the registry
var reg = buildElementRegistry(
    Config.MAIN_COMP_NAME,
    Config.CONTROL_LAYER_NAME,
    Config.ELEMENT_PREFIX,
    Config.MAX_ELEMENTS,
    Config.ESSENTIAL_PROPERTIES
);

// Verify required properties are present
verifyElementRegistry(reg, ["Text Content"]);

// Your data (typically loaded from JSON)
var data = [
    { text: "First item",  visible: 1 },
    { text: "Second item", visible: 1 },
    { text: "Third item",  visible: 1 }
];

// Map data fields to Essential Property names
var propertyMap = {
    "text": "Text Content",
    "visible": "Visibility"
};

// Apply data to elements
app.beginUndoGroup("Update Elements");
var count = updateAllElements(reg, data, propertyMap);
app.endUndoGroup();

alert("Updated " + count + " elements.");
```

## Dependencies

- `Scripts/lib/helpers.jsxinc` -- provides `setTextPropertyValue` for safe text property updates
