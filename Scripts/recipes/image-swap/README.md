# Image Swap Recipe

Automates the workflow of importing image files from disk into an After Effects project and replacing layer sources with those images, scaled to fit or fill the target composition.

## When to Use This

Use this recipe when your AE template has:

- **Placeholder image layers** that need to be swapped out per project (hero images, thumbnails, logos, backgrounds)
- A need to **batch-import** images from a folder on disk into the AE Project panel
- **Scaling requirements** where images must fit within or fill a composition regardless of source dimensions

## Files

| File | Purpose |
|---|---|
| `example_config.jsxinc` | Configuration for folder names |
| `imaging.jsxinc` | Import footage, replace layer sources, scale to fit/fill |
| `assets.jsxinc` | AE Project panel folder management and batch import |

## How It Works

### Import + Replace + Scale

The core workflow is three steps:

1. **Import**: `getOrImportFootage(file)` brings an image into the AE project (or finds it if already imported)
2. **Replace**: `replaceLayerSource(comp, layerName, file, mode)` swaps a layer's source with the imported footage
3. **Scale**: `fitLayerToComp(layer, width, height, mode)` scales the layer to "fit" (letterbox) or "fill" (crop) the composition

The convenience function `replaceLayerSource` combines all three steps into a single call.

### Batch Import

Use `importFolderAssets(sourceFolder, destinationFolder)` to bring all supported images from a filesystem folder into a specific AE Project panel folder. Already-imported files are detected by path and skipped.

### Project Organization

`ensureProjectFolder(name)` creates (or finds) a folder at the root level of the AE Project panel, keeping imported assets organized.

## What to Customize

### Config Values

- `ASSETS_FOLDER_NAME` -- name of the AE Project panel folder for imported assets
- `INPUT_FOLDER_NAME` -- filesystem folder name containing your source images

### Scaling Mode

The `fitMode` parameter controls how images are scaled:

- `"fit"` -- the entire image is visible, with possible letterboxing
- `"fill"` -- the composition is fully covered, with possible cropping at edges

### Extending the Recipe

Common extensions:

- **Auto-assignment**: Add logic to match filenames to specific layers (e.g. files starting with "hero" go to the "Hero Image" layer)
- **Subfolder support**: Import from nested folders into matching AE Project panel subfolders
- **Video footage**: The import functions work with any footage type AE supports, not just still images

## Usage Example

```javascript
#include "../../lib/helpers.jsxinc"
#include "config.jsxinc"
#include "assets.jsxinc"
#include "imaging.jsxinc"

// Set up the project folder
var assetsFolder = ensureProjectFolder(Config.ASSETS_FOLDER_NAME);

// Batch import all images from the Input folder
var inputPath = File($.fileName).parent.parent.fsName + "/" + Config.INPUT_FOLDER_NAME;
var inputFolder = new Folder(inputPath);
var newItems = importFolderAssets(inputFolder, assetsFolder);
alert("Imported " + newItems.length + " new files.");

// Replace a specific layer's source
var heroFile = new File(inputFolder.fsName + "/hero_image.jpg");
app.beginUndoGroup("Swap Hero Image");
var success = replaceLayerSource(
    app.project.activeItem,  // current comp
    "Hero Image",            // layer name
    heroFile,
    "fill"                   // scale to fill
);
app.endUndoGroup();

if (success) {
    alert("Hero image replaced.");
} else {
    alert("Could not replace hero image.");
}
```

## Dependencies

- `Scripts/lib/helpers.jsxinc` -- provides `isSupportedImageExtension` for filtering files during batch import
