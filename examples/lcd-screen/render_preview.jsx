// LCD Screen -- Preview Renderer
// Run in After Effects via File > Scripts > Run Script File
//
// Saves a handful of frames from the master comp to Scripts/runs/preview/ as PNGs so
// the result can be reviewed visually rather than by verbal description. comp.saveFrameToPng()
// returns before the file is fully written -- after running this, poll for the PNG IEND
// trailer before reading any frame:
//
//   for i in {1..120}; do tail -c 8 Scripts/runs/preview/frame_0000.png | \
//     LC_ALL=C grep -qa IEND && break; sleep 0.5; done

#include "../../Scripts/lib/io.jsxinc"
#include "../../Scripts/lib/prop-walker.jsxinc"
#include "../../Scripts/lib/result-writer.jsxinc"
#include "example_config.jsxinc"

(function () {
    var step = "init";
    var comp = null;
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item instanceof CompItem && item.name === LcdScreenConfig.MASTER_COMP_NAME) {
            comp = item;
            break;
        }
    }
    if (!comp) {
        alert("Could not find comp: " + LcdScreenConfig.MASTER_COMP_NAME + "\nRun setup.jsx first.");
        return;
    }

    beginScript("render_preview.jsx", comp);

    try {
        step = "resolve preview folder";
        var scriptFile = new File($.fileName);
        var scriptsRoot = scriptFile.parent.parent.parent; // examples/lcd-screen/ -> examples/ -> repo root
        var previewDir = new Folder(String(scriptsRoot.fsName) + "/Scripts/runs/preview");
        if (!previewDir.exists) previewDir.create();

        step = "render frames";
        var frameCount = 5;
        var written = [];
        for (var f = 0; f < frameCount; f++) {
            var t = (comp.duration / (frameCount - 1)) * f;
            if (t >= comp.duration) t = comp.duration - comp.frameDuration;
            var outFile = new File(String(previewDir.fsName) + "/frame_" + ("000" + f).slice(-4) + ".png");
            comp.saveFrameToPng(t, outFile);
            written.push(outFile.fsName);
        }

        writeResult("success", step, null, comp);
        alert("Wrote " + written.length + " preview frames to:\n" + previewDir.fsName +
              "\n\nPNGs may still be flushing to disk -- poll for the IEND trailer before reading them (see file header comment).");
    } catch (e) {
        writeResult("error", step, e, comp);
        alert("Error at [" + step + "]: " + e.message);
    }
})();
