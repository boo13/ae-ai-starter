// LCD Screen v2 - Final Acceptance Harness

#include "../../Scripts/lib/helpers.jsxinc"
#include "../../Scripts/lib/io.jsxinc"
#include "../../Scripts/lib/prop-walker.jsxinc"
#include "../../Scripts/lib/result-writer.jsxinc"

#include "../../Scripts/lib/actions/layer/solid.jsxinc"
#include "../../Scripts/lib/actions/layer/shape_layer.jsxinc"
#include "../../Scripts/lib/actions/layer/mask.jsxinc"
#include "../../Scripts/lib/actions/layer/camera.jsxinc"
#include "../../Scripts/lib/actions/layer/null_object.jsxinc"
#include "../../Scripts/lib/actions/layer/set_parent.jsxinc"
#include "../../Scripts/lib/actions/property/expression_control.jsxinc"
#include "../../Scripts/lib/actions/property/set_expression.jsxinc"
#include "../../Scripts/lib/actions/presets/expression_rig.jsxinc"

#include "../../Scripts/lib/actions/effects/subpixel_grid.jsxinc"
#include "../../Scripts/lib/actions/effects/scanlines.jsxinc"
#include "../../Scripts/lib/actions/effects/backlight_tint.jsxinc"
#include "../../Scripts/lib/actions/effects/backlight_bleed.jsxinc"
#include "../../Scripts/lib/actions/effects/viewing_angle_falloff.jsxinc"
#include "../../Scripts/lib/actions/scene/glass_surface.jsxinc"
#include "../../Scripts/lib/actions/effects/screen_glow.jsxinc"
#include "../../Scripts/lib/actions/effects/vignette.jsxinc"
#include "../../Scripts/lib/actions/scene/bezel.jsxinc"
#include "../../Scripts/lib/actions/effects/ambient_spill.jsxinc"
#include "../../Scripts/lib/actions/effects/lens_distortion.jsxinc"
#include "../../Scripts/lib/actions/effects/chromatic_aberration.jsxinc"
#include "../../Scripts/lib/actions/presets/lcd_screen.jsxinc"

#include "example_config.jsxinc"
#include "presets.jsxinc"
#include "lib/cleaner.jsxinc"
#include "lib/content-comp.jsxinc"
#include "lib/screen-comp.jsxinc"
#include "lib/autozoom.jsxinc"
#include "lib/camera-rig.jsxinc"
#include "lib/lens-stack.jsxinc"
#include "lib/rig.jsxinc"
#include "lib/links.jsxinc"
#include "lib/quality.jsxinc"
#include "lib/states.jsxinc"
#include "lib/build.jsxinc"

function _lcdM6ResolveSource(cfg) {
    if (cfg.SOURCE_ITEM_NAME) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var named = app.project.item(i);
            if (named instanceof FootageItem && named.name === cfg.SOURCE_ITEM_NAME) {
                return named;
            }
        }
        return null;
    }
    if (app.project.selection && app.project.selection.length > 0) {
        for (var s = 0; s < app.project.selection.length; s++) {
            if (app.project.selection[s] instanceof FootageItem) {
                return app.project.selection[s];
            }
        }
    }
    for (var j = 1; j <= app.project.numItems; j++) {
        var item = app.project.item(j);
        if (item instanceof FootageItem) return item;
    }
    return null;
}

function _lcdM6CloneConfig() {
    var cfg = {};
    for (var key in LcdScreenConfig) {
        if (LcdScreenConfig.hasOwnProperty(key)) cfg[key] = LcdScreenConfig[key];
    }
    return cfg;
}

function _lcdM6CreatePortraitSource(source, cfg) {
    var portrait = app.project.items.addComp(
        "LCD_M6_Portrait_Source",
        1080,
        1920,
        1,
        cfg.DURATION,
        cfg.FRAME_RATE
    );
    var layer = portrait.layers.add(source);
    layer.name = "Portrait Source";
    var sourceWidth = source.width || 1920;
    var sourceHeight = source.height || 1080;
    var scale = Math.max(1080 / sourceWidth, 1920 / sourceHeight) * 100;
    layer.property("Transform").property("Position").setValue([540, 960]);
    layer.property("Transform").property("Scale").setValue([scale, scale]);
    return portrait;
}

function _lcdM6PresetSpam(rigNull) {
    var names = [
        "Reading Front",
        "Macro Extreme",
        "Sideways",
        "Cool Night",
        "Static Default"
    ];
    var before = _lcdPresetCompCount();
    var reports = [];
    for (var i = 0; i < names.length; i++) {
        reports.push(applyPreset(names[i], rigNull));
    }
    var after = _lcdPresetCompCount();
    if (after !== before) {
        throw new Error("Preset spam created " + (after - before) + " composition(s).");
    }
    return {
        names: names,
        count: reports.length,
        compCountBefore: before,
        compCountAfter: after,
        createdCompCount: after - before
    };
}

function _lcdM6FindState(report, name) {
    for (var i = 0; i < report.states.length; i++) {
        if (report.states[i].name === name) return report.states[i];
    }
    return null;
}

(function () {
    var step = "init";
    var source = null;
    var portraitSource = null;
    var extrasCfg = null;
    var finalComp = null;
    var entryFile = new File($.fileName);

    beginScript("verify_m6.jsx", null);
    source = _lcdM6ResolveSource(LcdScreenConfig);
    if (!source) {
        var sourceError = new Error(
            "No source footage found. Import and select a screen recording, or set SOURCE_ITEM_NAME."
        );
        writeResult("error", "resolve source", sourceError, null);
        alert("LCD M6 verification: " + sourceError.message);
        return;
    }

    app.beginUndoGroup("Verify LCD Screen M6");
    try {
        step = "build default";
        var defaultCfg = _lcdM6CloneConfig();
        defaultCfg.EXTRAS_ENABLED = false;
        defaultCfg.BEZEL_ENABLED = false;
        defaultCfg.AMBIENT_SPILL_ENABLED = false;
        defaultCfg.GLASS_ENABLED = false;
        defaultCfg.BACKLIGHT_BLEED_ENABLED = false;
        defaultCfg.VIEWING_ANGLE_ENABLED = false;
        defaultCfg.SCANLINES_ENABLED = false;
        buildLcdScreen(source, defaultCfg);

        step = "rebuild default";
        var defaultBuild = buildLcdScreen(source, defaultCfg);
        if (defaultBuild.cleanup.removedCount < 5) {
            throw new Error("Consecutive default build did not replace all five managed comps.");
        }
        if (defaultBuild.screen) {
            throw new Error("Default build unexpectedly created LCD_Screen.");
        }

        step = "render quality and preset states";
        var previewDir = getLcdPreviewFolder(entryFile);
        var contactReport = renderLcdStates(
            defaultBuild.master.comp,
            defaultBuild.rig["null"],
            "m6",
            getLcdStateSet("m6"),
            previewDir
        );
        if (contactReport.stateCount !== 22) {
            throw new Error("Expected 22 M6 states, rendered " + contactReport.stateCount + ".");
        }
        if (!contactReport.presetApplications ||
            contactReport.presetApplications.createdCompCount !== 0) {
            throw new Error("M6 preset states changed the project composition count.");
        }

        step = "spam live presets";
        var presetSpam = _lcdM6PresetSpam(defaultBuild.rig["null"]);

        step = "build portrait extras path";
        portraitSource = _lcdM6CreatePortraitSource(source, defaultCfg);
        extrasCfg = _lcdM6CloneConfig();
        extrasCfg.PRESET = "Reading Angle";
        extrasCfg.EXTRAS_ENABLED = true;
        extrasCfg.BEZEL_ENABLED = true;
        extrasCfg.AMBIENT_SPILL_ENABLED = true;
        extrasCfg.GLASS_ENABLED = true;
        extrasCfg.BACKLIGHT_BLEED_ENABLED = false;
        extrasCfg.VIEWING_ANGLE_ENABLED = false;
        extrasCfg.SCANLINES_ENABLED = false;
        extrasCfg.BEZEL_WIDTH = 24;
        extrasCfg.AMBIENT_SPILL_OPACITY = 15;
        extrasCfg.GLASS_DUST = 8;
        extrasCfg.GLASS_SMUDGE = 8;
        extrasCfg.GLASS_SHEEN = 12;
        extrasCfg.GLASS_SWEEP = false;

        var extrasBuild = buildLcdScreen(portraitSource, extrasCfg);
        if (!extrasBuild.screen ||
            !extrasBuild.screen.bezel ||
            !extrasBuild.screen.spillLayer ||
            !extrasBuild.panel.extras.glass) {
            throw new Error("The bezel/glass/ambient-spill opt-in path is incomplete.");
        }

        step = "render extras state";
        var extrasReport = renderLcdStates(
            extrasBuild.master.comp,
            extrasBuild.rig["null"],
            "m6-extras",
            [
                {
                    name: "portrait-bezel-glass-spill",
                    preset: "Reading Angle",
                    quality: "Full",
                    time: 0,
                    overrides: {}
                }
            ],
            previewDir
        );
        var extrasScale = extrasBuild.master.sceneLayer
            .property("Transform")
            .property("Scale")
            .valueAtTime(0, false);
        if (!extrasScale || !isFinite(extrasScale[0]) || extrasScale[0] <= 0) {
            throw new Error("Auto Zoom returned an invalid scale for the extras wrapper.");
        }
        var extrasSnapshot = {
            sourceSize: [1080, 1920],
            sourceAspect: 1080 / 1920,
            masterAspect: extrasBuild.master.comp.width / extrasBuild.master.comp.height,
            compNames: [
                extrasBuild.content.comp.name,
                extrasBuild.panel.comp.name,
                extrasBuild.panel.pattern.comp.name,
                extrasBuild.screen.comp.name,
                extrasBuild.scene.comp.name,
                extrasBuild.master.comp.name
            ],
            bezel: true,
            glass: true,
            ambientSpill: true,
            autoZoomScale: extrasScale,
            preview: extrasReport.states[0].output
        };

        step = "restore final default build";
        var finalBuild = buildLcdScreen(source, defaultCfg);
        finalComp = finalBuild.master.comp;
        if (finalBuild.cleanup.removedCount < 6 || finalBuild.screen) {
            throw new Error("Final rebuild did not cleanly replace the six-comp extras build.");
        }
        try {
            portraitSource.remove();
            portraitSource = null;
        } catch (_) {}

        var fullState = _lcdM6FindState(contactReport, "quality-full");
        var draftState = _lcdM6FindState(contactReport, "quality-draft");
        var report = {
            repeatedBuild: {
                removedCount: defaultBuild.cleanup.removedCount,
                passed: defaultBuild.cleanup.removedCount >= 5
            },
            optionalDefaultsOff: {
                screenWrapper: !!defaultBuild.screen,
                panelExtrasEnabled: !!defaultBuild.panel.extras.enabled,
                passed: !defaultBuild.screen && !defaultBuild.panel.extras.enabled
            },
            quality: {
                full: fullState ? fullState.qualityApplication : null,
                draft: draftState ? draftState.qualityApplication : null
            },
            contactSheet: {
                stateCount: contactReport.stateCount,
                presetCount: getLcdPresetNames().length,
                createdCompCount: contactReport.presetApplications.createdCompCount
            },
            presetSpam: presetSpam,
            extras: extrasSnapshot,
            finalBuild: {
                cleanedExtrasCompCount: finalBuild.cleanup.removedCount,
                compCount: 5,
                preset: finalBuild.cfg.PRESET
            }
        };
        setResultData("lcdM6", report);

        step = "open final master";
        try { finalComp.openInViewer(); } catch (_) {}

        app.endUndoGroup();
        writeResult("success", step, null, finalComp);
        alert(
            "LCD Screen M6 verified!\n\n" +
            "Rendered 20 Draft preset frames, a Draft/Full pair, and one extras frame.\n" +
            "Preset applications created 0 comps.\n" +
            "Restored the five-comp default build."
        );
    } catch (e) {
        try { app.endUndoGroup(); } catch (_) {}
        if (portraitSource) {
            try { portraitSource.remove(); } catch (_) {}
        }
        writeResult("error", step, e, finalComp);
        alert(
            "LCD M6 verification failed at [" + step + "]:\n" +
            e.message +
            (e.line ? ("\nLine: " + e.line) : "")
        );
    }
})();
