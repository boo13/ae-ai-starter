/**
 * test_flow_field_integration.jsx
 *
 * End-to-end Flow Field builder validation without the UI panel.
 */

#include "../demos/flow_field/flow_field_engine.jsxinc"
#include "../demos/flow_field/flow_field_builder.jsxinc"

(function runFlowFieldIntegrationTest() {
    function log(msg) {
        if (typeof $.writeln === "function") {
            $.writeln(msg);
        }
    }

    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || "Assertion failed");
        }
    }

    app.beginUndoGroup("Flow Field Integration Test");
    try {
        if (!app.project) {
            app.newProject();
        }

        var comp = createFlowFieldComp("Flow Field Integration", 999);
        var controlLayer = addFlowControlLayer(comp, {
            turbulence: 4,
            density: 40,
            lineLength: 90,
            speed: 2,
            colorMode: 2
        });
        var count = buildStreamlineLayers(comp, controlLayer, { seed: 321 });
        var layer = null;
        var trimEnd = null;
        var strokeColor = null;
        var i;
        var groupContents;
        var trim;
        var stroke;

        wireFlowExpressions(comp, count);

        for (i = 1; i <= comp.layers.length; i++) {
            if (comp.layers[i].name.indexOf("Streamline ") === 0) {
                layer = comp.layers[i];
                break;
            }
        }

        assert(count > 0, "Expected streamlines to be created");
        assert(layer !== null, "Expected at least one streamline layer");

        groupContents = layer.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
        trim = findFirstByMatchName(groupContents, "ADBE Vector Filter - Trim");
        stroke = findFirstByMatchName(groupContents, "ADBE Vector Graphic - Stroke");
        trimEnd = trim.property("ADBE Vector Trim End");
        strokeColor = stroke.property("ADBE Vector Stroke Color");

        assert(trimEnd.expression !== "", "Trim expression should be set");
        assert(strokeColor.expression !== "", "Color expression should be set");
        assert(trimEnd.expressionError === "", "Trim expression should be valid");
        assert(strokeColor.expressionError === "", "Color expression should be valid");

        log("Flow Field integration test passed with " + count + " streamlines.");
    } finally {
        app.endUndoGroup();
    }
})();
