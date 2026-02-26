# Data Timing Recipe

Calculates display durations for text-based elements using a words-per-second model. Supports bidirectional sync: when timing parameters change, auto-generated durations are recalculated while manually-set durations are preserved.

## When to Use This

Use this recipe when your data includes:

- **Text elements** that need screen time proportional to their length
- **Timing parameters** (seconds-per-word, minimum duration) that the user may adjust
- **A mix of auto-calculated and manually-overridden durations** that need to coexist
- **Text files** that need to be converted into structured JSON data

## Files

| File | Purpose |
|---|---|
| `example_config.jsxinc` | Default timing parameters |
| `timing.jsxinc` | Duration computation, analysis, and recalculation |
| `transcript_loader.jsxinc` | JSON loading, settings merging, and text file conversion |

## How It Works

### Timing Model

Duration for each element is calculated as:

```
duration = max(wordCount * secondsPerWord, minDuration)
```

- `secondsPerWord` controls reading pace (default: 0.38s)
- `minDuration` prevents very short items from flashing by (default: 1.5s)
- Elements can override the computed value with an explicit `duration` field

### Bidirectional Sync

When timing parameters change, the system needs to know which durations to update. The sync logic:

1. **Analyzes** existing durations to reverse-engineer the previous timing parameters
2. **Identifies** which elements have auto-generated durations (matching the old model) vs. manually-set ones
3. **Recalculates** only the auto-generated durations using the new parameters
4. **Preserves** manually-set durations untouched

Elements can be explicitly locked by setting `duration_locked`, `durationLocked`, or `manualDuration` to `true` in their data.

### Text File Conversion

The `convertSimpleTextFile` function reads a plain text file and applies a user-provided line parser function to each line. This keeps the recipe generic -- you define the parsing logic for your specific format.

## What to Customize

### Config Values

- `DEFAULT_BASE_START` -- starting time offset in seconds
- `DEFAULT_SECONDS_PER_WORD` -- reading pace (lower = faster)
- `DEFAULT_MIN_DURATION` -- floor for short elements

### Data Field Names

The timing functions expect `duration` and `text` fields on each data element. If your schema uses different names, either rename when loading or wrap the timing functions.

### Text File Parser

Supply your own `lineParser` function to `convertSimpleTextFile`:

```javascript
// Tab-separated: "Label\tContent"
var entries = convertSimpleTextFile(txtFile, function(line, idx) {
    var tab = line.indexOf("\t");
    if (tab === -1) return null;
    return {
        label: safeTrim(line.substring(0, tab)),
        text: safeTrim(line.substring(tab + 1))
    };
});
```

### Settings Overrides

Use `applySettingsOverrides` to merge UI-driven values over JSON defaults:

```javascript
var settings = applySettingsOverrides(data.settings, {
    seconds_per_word: 0.30,  // faster pace from user input
    min_duration: 2.0        // longer minimum from user input
});
```

## Usage Example

```javascript
#include "../../lib/helpers.jsxinc"
#include "config.jsxinc"
#include "timing.jsxinc"
#include "transcript_loader.jsxinc"

// Load data file with overrides
var result = loadDataFile({
    seconds_per_word: 0.35,
    min_duration: 1.0
});

var data = result.data;
var settings = result.settings;
var items = data.elements || data.messages || [];

// Compute durations for each element
var currentTime = settings.base_start || Config.DEFAULT_BASE_START;
for (var i = 0; i < items.length; i++) {
    var dur = resolveElementDuration(
        items[i],
        settings.seconds_per_word,
        settings.min_duration
    );
    items[i].startTime = currentTime;
    items[i].duration = roundDurationValue(dur);
    currentTime += dur;
}

// Later, if the user changes timing parameters:
var changed = recalculateDurationsOnJson(data, 0.30, 2.0);
if (changed) {
    alert("Durations recalculated with new timing.");
}
```

## Dependencies

- `Scripts/lib/helpers.jsxinc` -- provides `countWords` for word counting and `safeTrim` for string trimming
- `Scripts/lib/io.jsxinc` -- provides `readJsonFile` (optional; `parseJsonDataFile` includes its own reading logic)
