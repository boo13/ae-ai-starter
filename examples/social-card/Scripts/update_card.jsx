/**
 * update_card.jsx
 *
 * Example automation script for a social media card template.
 *
 * Demonstrates the complete workflow:
 *   1. Load JSON data from a file
 *   2. Build a registry of card layers and their Essential Properties
 *   3. Update text properties on each card from the data
 *   4. Import and place images on card layers
 *   5. Calculate display timing from word counts
 *
 * This script requires a matching AE template with:
 *   - A composition named "SOCIAL CARD TEMPLATE"
 *   - A "Control" layer
 *   - Card layers named "CARD 1", "CARD 2", etc.
 *   - Essential Properties: "Headline", "Body Text", "Category"
 *
 * Run via File > Scripts > Run Script File... in After Effects.
 *
 * All code is ES3/ExtendScript compatible.
 */

// --- Shared libraries ---
#include "../../Scripts/lib/helpers.jsxinc"
#include "../../Scripts/lib/io.jsxinc"

// --- Recipes ---
#include "../../Scripts/recipes/repeating-elements/registry.jsxinc"
#include "../../Scripts/recipes/repeating-elements/updater.jsxinc"
#include "../../Scripts/recipes/image-swap/assets.jsxinc"
#include "../../Scripts/recipes/image-swap/imaging.jsxinc"
#include "../../Scripts/recipes/data-timing/timing.jsxinc"

// --- Project config ---
#include "config.jsxinc"

(function () {
    // ------------------------------------------------------------------
    // 1. Load JSON data
    // ------------------------------------------------------------------
    var scriptFile = new File($.fileName);
    var scriptsDir = scriptFile.parent;              // example/Scripts/
    var exampleDir = scriptsDir.parent;              // example/
    var inputDir = exampleDir.fsName + "/Input";

    var dataFile = new File(inputDir + "/sample_data.json");
    if (!dataFile.exists) {
        alert("Data file not found:\n" + dataFile.fsName);
        return;
    }

    var data = readJsonFile(dataFile);
    var cards = data.cards;
    if (!cards || !cards.length) {
        alert("No cards found in data file.");
        return;
    }

    // Extract timing settings with fallbacks
    var settings = data.settings || {};
    var secondsPerWord = settings.seconds_per_word || Config.DEFAULT_SECONDS_PER_WORD;
    var minDuration = settings.min_duration || Config.DEFAULT_MIN_DURATION;
    var baseStart = (typeof settings.base_start === "number")
        ? settings.base_start : Config.DEFAULT_BASE_START;

    // ------------------------------------------------------------------
    // 2. Build the registry
    //    The registry walks the comp once to collect layer and property
    //    references, avoiding repeated lookups in the update loop.
    // ------------------------------------------------------------------
    var registry;
    try {
        registry = buildElementRegistry(
            Config.MAIN_COMP_NAME,
            Config.CONTROL_LAYER_NAME,
            Config.ELEMENT_PREFIX,
            Config.MAX_ELEMENTS,
            Config.ESSENTIAL_PROPERTIES
        );
    } catch (e) {
        alert("Registry error:\n" + e.toString());
        return;
    }

    // Verify that each populated card slot has the required properties
    try {
        verifyElementRegistry(registry, ["Headline", "Body Text"]);
    } catch (e) {
        alert("Registry verification failed:\n" + e.toString());
        return;
    }

    // ------------------------------------------------------------------
    // 3. Update text properties
    //    The property map decouples JSON field names from AE property names.
    //    This means you can rename fields in either place independently.
    // ------------------------------------------------------------------
    var propertyMap = {
        "headline": "Headline",
        "body": "Body Text",
        "category": "Category"
    };

    app.beginUndoGroup("Update Social Cards");

    var populated = updateAllElements(registry, cards, propertyMap);

    // ------------------------------------------------------------------
    // 4. Import and place images
    //    For each card that specifies an image, import the file and
    //    replace the layer source. Images are organized into a project
    //    folder to keep the AE Project panel tidy.
    // ------------------------------------------------------------------
    var assetsFolder = ensureProjectFolder("Card Images");

    for (var i = 0; i < cards.length; i++) {
        if (!cards[i].image) continue;

        var imageFile = new File(inputDir + "/" + cards[i].image);
        if (!imageFile.exists) {
            $.writeln("Image not found, skipping: " + cards[i].image);
            continue;
        }

        // Import the image (or find it if already imported)
        var footage = getOrImportFootage(imageFile);
        if (footage) {
            // Move to organized folder
            try { footage.parentFolder = assetsFolder; } catch (_) {}
        }

        // If the card layer has a nested image layer, replace its source.
        // This assumes card pre-comps contain a layer named "Image".
        var entry = registry.elements[i];
        if (entry && entry.info && entry.info.layer) {
            var cardSource = entry.info.layer.source;
            if (cardSource instanceof CompItem) {
                replaceLayerSource(cardSource, "Image", imageFile, "fill");
            }
        }
    }

    // ------------------------------------------------------------------
    // 5. Calculate and apply timing
    //    Each card's display duration is based on the combined word count
    //    of its headline and body text.
    // ------------------------------------------------------------------
    var currentTime = baseStart;

    for (var t = 0; t < cards.length; t++) {
        // Combine headline and body for word count
        var combinedText = (cards[t].headline || "") + " " + (cards[t].body || "");
        var duration = computeDurationFromText(combinedText, secondsPerWord, minDuration);
        duration = roundDurationValue(duration);

        // Store computed timing back on the data (useful for debugging)
        cards[t].startTime = currentTime;
        cards[t].duration = duration;

        // Set layer in/out points to match the computed timing
        var cardEntry = registry.elements[t];
        if (cardEntry && cardEntry.info && cardEntry.info.layer) {
            try {
                cardEntry.info.layer.startTime = 0;
                cardEntry.info.layer.inPoint = currentTime;
                cardEntry.info.layer.outPoint = currentTime + duration;
            } catch (_) {}
        }

        currentTime += duration;
    }

    app.endUndoGroup();

    // ------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------
    var totalDuration = roundDurationValue(currentTime - baseStart);
    alert(
        "Update complete!\n\n" +
        "Cards populated: " + populated + "\n" +
        "Total duration: " + totalDuration + "s"
    );
})();
