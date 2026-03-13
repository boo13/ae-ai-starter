// Audio Spectrum Plugin — Phase 1 Verification Script
// Run in After Effects via File > Scripts > Run Script File
//
// PURPOSE: Confirm all match-names, property indices, and assumptions
// before building the real implementation.
//
// PREREQUISITES:
//   - An open AE project with at least one composition
//   - That composition should have an audio layer (for frequency test)
//
// OUTPUT: Results written to a text file next to this script AND shown in alert.

(function () {
    var scriptFile = new File($.fileName);
    var scriptFolder = scriptFile.parent;
    var outputFile = new File(scriptFolder.fsName + "/verify_results.txt");
    var results = [];
    var passed = 0;
    var failed = 0;
    var warnings = 0;

    function log(msg) {
        results.push(msg);
        $.writeln(msg);
    }

    function logSection(title) {
        log("");
        log("=== " + title + " ===");
    }

    function logPass(test) {
        passed++;
        log("  PASS: " + test);
    }

    function logFail(test, detail) {
        failed++;
        log("  FAIL: " + test + (detail ? " — " + detail : ""));
    }

    function logWarn(test, detail) {
        warnings++;
        log("  WARN: " + test + (detail ? " — " + detail : ""));
    }

    // --- Find a comp to work with ---
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
        // Try to find any comp
        for (var i = 1; i <= app.project.items.length; i++) {
            if (app.project.items[i] instanceof CompItem) {
                comp = app.project.items[i];
                break;
            }
        }
    }

    if (!comp) {
        alert("No composition found. Please open a project with at least one comp.");
        return;
    }

    log("Audio Spectrum Plugin — Verification Results");
    log("Date: " + new Date().toString());
    log("Comp: " + comp.name + " (" + comp.width + "x" + comp.height + ")");

    app.beginUndoGroup("AS Verify");

    try {
        // =============================================
        // TEST 1: Audio Spectrum effect match-names
        // =============================================
        logSection("1. Audio Spectrum Effect Match-Names");

        var testSolid = comp.layers.addSolid(
            [0, 0, 0], "AS_VERIFY_SOLID", comp.width, comp.height, 1, comp.duration
        );

        var asFx;
        var asMatchNames = [
            "ADBE Audio Spectrum",
            "Audio Spectrum",
            "ADBE AudSpectrum",
            "ADBE AudSpec",
            "audioSpectrum"
        ];
        var asAppliedName = null;
        for (var n = 0; n < asMatchNames.length; n++) {
            try {
                asFx = testSolid.property("ADBE Effect Parade").addProperty(asMatchNames[n]);
                asAppliedName = asMatchNames[n];
                logPass("Applied Audio Spectrum via '" + asMatchNames[n] + "'");
                break;
            } catch (e) {
                log("  tried '" + asMatchNames[n] + "' — " + e.message);
            }
        }
        if (!asFx) {
            logFail("Apply Audio Spectrum", "None of the attempted names worked");
        }

        if (asFx) {
            log("  Properties found (" + asFx.numProperties + " total):");
            var expectedAS = {
                "ADBE Audio Spectrum-0001": "Audio Layer",
                "ADBE Audio Spectrum-0002": "Start Point",
                "ADBE Audio Spectrum-0003": "End Point",
                "ADBE Audio Spectrum-0006": "Start Frequency",
                "ADBE Audio Spectrum-0007": "End Frequency",
                "ADBE Audio Spectrum-0008": "Frequency Bands",
                "ADBE Audio Spectrum-0009": "Maximum Height",
                "ADBE Audio Spectrum-0010": "Audio Duration",
                "ADBE Audio Spectrum-0011": "Audio Offset",
                "ADBE Audio Spectrum-0012": "Thickness",
                "ADBE Audio Spectrum-0013": "Softness",
                "ADBE Audio Spectrum-0014": "Inside Color",
                "ADBE Audio Spectrum-0015": "Outside Color",
                "ADBE Audio Spectrum-0017": "Hue Interpolation",
                "ADBE Audio Spectrum-0020": "Display Options"
            };

            for (var i = 1; i <= asFx.numProperties; i++) {
                var prop = asFx.property(i);
                log("    [" + i + "] " + prop.name + " = " + prop.matchName);
            }

            log("");
            log("  Checking expected match-names:");
            for (var matchName in expectedAS) {
                try {
                    var p = asFx.property(matchName);
                    if (p) {
                        logPass(matchName + " -> " + p.name);
                    } else {
                        logFail(matchName + " (" + expectedAS[matchName] + ")", "property() returned null");
                    }
                } catch (e) {
                    logFail(matchName + " (" + expectedAS[matchName] + ")", e.message);
                }
            }
        }

        // =============================================
        // TEST 2: Mosaic effect match-names
        // =============================================
        logSection("2. Mosaic Effect Match-Names");

        var mosaicFx;
        try {
            mosaicFx = testSolid.property("ADBE Effect Parade").addProperty("ADBE Mosaic");
            logPass("Applied 'ADBE Mosaic' effect");
        } catch (e) {
            logFail("Apply 'ADBE Mosaic'", e.message);
        }

        if (mosaicFx) {
            log("  Properties found (" + mosaicFx.numProperties + " total):");
            for (var i = 1; i <= mosaicFx.numProperties; i++) {
                var prop = mosaicFx.property(i);
                log("    [" + i + "] " + prop.name + " = " + prop.matchName);
            }

            var expectedMosaic = {
                "ADBE Mosaic-0001": "Horizontal Blocks",
                "ADBE Mosaic-0002": "Vertical Blocks",
                "ADBE Mosaic-0003": "Sharp Colors"
            };

            log("");
            log("  Checking expected match-names:");
            for (var matchName in expectedMosaic) {
                try {
                    var p = mosaicFx.property(matchName);
                    if (p) {
                        logPass(matchName + " -> " + p.name);
                    } else {
                        logFail(matchName + " (" + expectedMosaic[matchName] + ")", "property() returned null");
                    }
                } catch (e) {
                    logFail(matchName + " (" + expectedMosaic[matchName] + ")", e.message);
                }
            }
        }

        // =============================================
        // TEST 3: Glow effect match-names
        // =============================================
        logSection("3. Glow Effect Match-Names (ADBE Glo2)");

        var glowFx;
        try {
            glowFx = testSolid.property("ADBE Effect Parade").addProperty("ADBE Glo2");
            logPass("Applied 'ADBE Glo2' effect");
        } catch (e) {
            logFail("Apply 'ADBE Glo2'", e.message);
            logWarn("Trying 'ADBE Glow' as fallback");
            try {
                glowFx = testSolid.property("ADBE Effect Parade").addProperty("ADBE Glow");
                logWarn("'ADBE Glow' worked instead — update plan to use 'ADBE Glow'");
            } catch (e2) {
                logFail("Apply 'ADBE Glow' fallback", e2.message);
            }
        }

        if (glowFx) {
            log("  Effect matchName: " + glowFx.matchName);
            log("  Properties found (" + glowFx.numProperties + " total):");
            for (var i = 1; i <= glowFx.numProperties; i++) {
                var prop = glowFx.property(i);
                log("    [" + i + "] " + prop.name + " = " + prop.matchName);
            }

            var glowPrefix = glowFx.matchName;
            var expectedGlow = [
                [glowPrefix + "-0001", "Glow Threshold"],
                [glowPrefix + "-0002", "Glow Radius"],
                [glowPrefix + "-0003", "Glow Intensity"]
            ];

            log("");
            log("  Checking expected match-names:");
            for (var g = 0; g < expectedGlow.length; g++) {
                try {
                    var p = glowFx.property(expectedGlow[g][0]);
                    if (p) {
                        logPass(expectedGlow[g][0] + " -> " + p.name);
                    } else {
                        logFail(expectedGlow[g][0] + " (" + expectedGlow[g][1] + ")", "property() returned null");
                    }
                } catch (e) {
                    logFail(expectedGlow[g][0] + " (" + expectedGlow[g][1] + ")", e.message);
                }
            }
        }

        // =============================================
        // TEST 4: Shape layer match-names
        // =============================================
        logSection("4. Shape Layer Match-Names");

        var shapeLayer = comp.layers.addShape();
        shapeLayer.name = "AS_VERIFY_SHAPE";

        var contents = shapeLayer.property("ADBE Root Vectors Group");
        if (contents) {
            logPass("'ADBE Root Vectors Group' found on shape layer");
        } else {
            logFail("'ADBE Root Vectors Group'", "not found");
        }

        if (contents) {
            var grp, grpContents, rect, fill;

            try {
                grp = contents.addProperty("ADBE Vector Group");
                logPass("Added 'ADBE Vector Group'");
            } catch (e) {
                logFail("Add 'ADBE Vector Group'", e.message);
            }

            if (grp) {
                grpContents = grp.property("ADBE Vectors Group");
                if (grpContents) {
                    logPass("'ADBE Vectors Group' found in group");
                } else {
                    logFail("'ADBE Vectors Group'", "not found in group");
                }
            }

            if (grpContents) {
                // Rectangle
                try {
                    rect = grpContents.addProperty("ADBE Vector Shape - Rect");
                    logPass("Added 'ADBE Vector Shape - Rect'");

                    var rectSize = rect.property("ADBE Vector Rect Size");
                    if (rectSize) {
                        rectSize.setValue([50, 200]);
                        logPass("'ADBE Vector Rect Size' — set to [50, 200]");
                    } else {
                        logFail("'ADBE Vector Rect Size'", "not found");
                    }

                    var rectRound = rect.property("ADBE Vector Rect Roundness");
                    if (rectRound) {
                        rectRound.setValue(5);
                        logPass("'ADBE Vector Rect Roundness' — set to 5");
                    } else {
                        logFail("'ADBE Vector Rect Roundness'", "not found");
                    }
                } catch (e) {
                    logFail("Add rectangle", e.message);
                }

                // Solid Fill
                try {
                    fill = grpContents.addProperty("ADBE Vector Graphic - Fill");
                    logPass("Added 'ADBE Vector Graphic - Fill'");

                    var fillColor = fill.property("ADBE Vector Fill Color");
                    if (fillColor) {
                        fillColor.setValue([1, 0, 0]);
                        logPass("'ADBE Vector Fill Color' — set to [1,0,0]");
                    } else {
                        logFail("'ADBE Vector Fill Color'", "not found");
                    }
                } catch (e) {
                    logFail("Add solid fill", e.message);
                }

                // Gradient Fill (Phase 2 — just verify match-names exist)
                log("");
                log("  --- Gradient Fill (Phase 2 verification) ---");
                try {
                    // Remove the solid fill first to avoid conflicts
                    if (fill) {
                        grpContents.property(fill.propertyIndex).remove();
                    }
                    var gFill = grpContents.addProperty("ADBE Vector Graphic - G-Fill");
                    logPass("Added 'ADBE Vector Graphic - G-Fill'");

                    log("  Gradient fill properties:");
                    for (var i = 1; i <= gFill.numProperties; i++) {
                        var prop = gFill.property(i);
                        log("    [" + i + "] " + prop.name + " = " + prop.matchName);
                    }

                    var gradType = gFill.property("ADBE Vector Grad Type");
                    if (gradType) {
                        logPass("'ADBE Vector Grad Type' found");
                        log("    Current value: " + gradType.value);
                    } else {
                        logFail("'ADBE Vector Grad Type'", "not found");
                    }

                    var gradStart = gFill.property("ADBE Vector Grad Start Pt");
                    if (gradStart) {
                        logPass("'ADBE Vector Grad Start Pt' found");
                    } else {
                        logFail("'ADBE Vector Grad Start Pt'", "not found");
                    }

                    var gradEnd = gFill.property("ADBE Vector Grad End Pt");
                    if (gradEnd) {
                        logPass("'ADBE Vector Grad End Pt' found");
                    } else {
                        logFail("'ADBE Vector Grad End Pt'", "not found");
                    }

                    var gradColors = gFill.property("ADBE Vector Grad Colors");
                    if (gradColors) {
                        logPass("'ADBE Vector Grad Colors' found");
                        log("    Property type: " + gradColors.propertyValueType);
                        try {
                            var currentVal = gradColors.value;
                            log("    Current value type: " + typeof currentVal);
                            if (currentVal instanceof Array) {
                                log("    Array length: " + currentVal.length);
                                log("    Array contents: [" + currentVal.join(", ") + "]");
                            } else {
                                log("    Value: " + String(currentVal));
                            }
                        } catch (e) {
                            logWarn("Could not read gradient colors value", e.message);
                        }
                    } else {
                        logFail("'ADBE Vector Grad Colors'", "not found");
                    }
                } catch (e) {
                    logFail("Gradient fill", e.message);
                }
            }
        }

        // =============================================
        // TEST 5: Guide layer + sampleImage
        // =============================================
        logSection("5. Guide Layer Behavior");

        try {
            testSolid.guideLayer = true;
            if (testSolid.guideLayer === true) {
                logPass("layer.guideLayer = true accepted");
            } else {
                logFail("layer.guideLayer", "set to true but reads back as " + testSolid.guideLayer);
            }
        } catch (e) {
            logFail("layer.guideLayer = true", e.message);
        }

        log("  NOTE: sampleImage() on guide layers can only be fully verified");
        log("  by adding an expression to another layer and previewing.");
        log("  The plan states this works — if bars show no animation, revisit.");

        // =============================================
        // TEST 6: Anchor point and transform match-names
        // =============================================
        logSection("6. Transform Property Match-Names");

        try {
            var xformGroup = shapeLayer.property("ADBE Transform Group");
            if (xformGroup) {
                logPass("'ADBE Transform Group' found");
                var anchorPt = xformGroup.property("ADBE Anchor Point");
                if (anchorPt) {
                    logPass("'ADBE Anchor Point' found");
                } else {
                    logFail("'ADBE Anchor Point'", "not found");
                }
                var position = xformGroup.property("ADBE Position");
                if (position) {
                    logPass("'ADBE Position' found");
                } else {
                    logFail("'ADBE Position'", "not found");
                }
                var scale = xformGroup.property("ADBE Scale");
                if (scale) {
                    logPass("'ADBE Scale' found");
                } else {
                    logFail("'ADBE Scale'", "not found");
                }
                var rotNames = ["ADBE Rotation", "ADBE Rotate Z", "Rotation"];
                var rotFound = false;
                for (var r = 0; r < rotNames.length; r++) {
                    var rot = xformGroup.property(rotNames[r]);
                    if (rot) {
                        logPass("Rotation found via '" + rotNames[r] + "' (matchName: " + rot.matchName + ")");
                        rotFound = true;
                        break;
                    }
                }
                if (!rotFound) {
                    logFail("Rotation", "none of [ADBE Rotation, ADBE Rotate Z, Rotation] found");
                    log("  Dumping all transform properties:");
                    for (var t = 1; t <= xformGroup.numProperties; t++) {
                        var tp = xformGroup.property(t);
                        log("    [" + t + "] " + tp.name + " = " + tp.matchName);
                    }
                }
            } else {
                logFail("'ADBE Transform Group'", "not found");
            }
        } catch (e) {
            logFail("Transform properties", e.message);
        }

        // =============================================
        // TEST 7: Expression assignment
        // =============================================
        logSection("7. Expression Assignment");

        try {
            var scaleExpr = [
                'var dl = thisComp.layer("AS_VERIFY_SOLID");',
                'var col = dl.sampleImage([dl.width * 0.5, dl.height * 0.5], [1, 1], true, time);',
                'var b = col[0];',
                '[100, ease(b, 0, 1, 0, 100)]'
            ].join('\n');

            shapeLayer.property("ADBE Transform Group").property("ADBE Scale").expression = scaleExpr;
            logPass("Scale expression assigned successfully");
            log("  Expression:\n    " + scaleExpr.split('\n').join('\n    '));

            // Check if expression has errors
            var exprError = shapeLayer.property("ADBE Transform Group").property("ADBE Scale").expressionError;
            if (exprError && exprError !== "") {
                logWarn("Expression has error (may resolve at preview time)", exprError);
            } else {
                logPass("No expression error reported");
            }
        } catch (e) {
            logFail("Expression assignment", e.message);
        }

        // =============================================
        // TEST 8: Audio layer index lookup
        // =============================================
        logSection("8. Audio Layer Index Lookup");

        var audioLayer = null;
        for (var i = 1; i <= comp.numLayers; i++) {
            var lyr = comp.layer(i);
            if (lyr.hasAudio) {
                audioLayer = lyr;
                break;
            }
        }

        if (audioLayer) {
            logPass("Found audio layer: '" + audioLayer.name + "' at index " + audioLayer.index);
            log("  Use this name in config.AUDIO_LAYER_NAME");
        } else {
            logWarn("No audio layer found in comp '" + comp.name + "'",
                "Add an audio layer to test frequency band distribution");
        }

        // =============================================
        // CLEANUP
        // =============================================
        logSection("Cleanup");
        testSolid.remove();
        shapeLayer.remove();
        logPass("Removed test layers");

        // =============================================
        // SUMMARY
        // =============================================
        logSection("SUMMARY");
        log("  Passed:   " + passed);
        log("  Failed:   " + failed);
        log("  Warnings: " + warnings);
        log("");

        if (failed === 0) {
            log("  All checks passed! Safe to proceed with Phase 2 implementation.");
        } else {
            log("  " + failed + " check(s) failed. Update the plan before proceeding.");
            log("  Copy the failed items and share with Claude to update match-names.");
        }

        // Write results to file
        outputFile.open("w");
        outputFile.write(results.join("\n"));
        outputFile.close();

        app.endUndoGroup();

        // Undo all changes so the comp is clean
        app.executeCommand(16); // Edit > Undo

        alert(
            "Verification complete!\n\n" +
            "Passed: " + passed + "  |  Failed: " + failed + "  |  Warnings: " + warnings + "\n\n" +
            "Full results saved to:\n" + outputFile.fsName + "\n\n" +
            (failed === 0
                ? "All checks passed — safe to proceed with Phase 2!"
                : failed + " check(s) failed — review results and update the plan.")
        );

    } catch (e) {
        app.endUndoGroup();
        alert("Verification script error: " + e.message + "\nLine: " + e.line);
    }
})();
