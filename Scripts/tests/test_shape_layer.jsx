/**
 * test_shape_layer.jsx
 *
 * Proof-of-concept for shape-layer path creation, trim paths, and slider-driven expressions.
 */
(function runShapeLayerProof() {
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

    function ensureProject() {
        if (!app.project) {
            app.newProject();
        }
        return app.project;
    }

    function addSlider(effectsGroup, name, value) {
        var effect = effectsGroup.addProperty("ADBE Slider Control");
        var sliderProp;
        effect.name = name;
        sliderProp = effect.property(1);
        sliderProp.setValue(value);
        return sliderProp;
    }

    app.beginUndoGroup("Test Shape Layer");
    try {
        var project = ensureProject();
        var comp = project.items.addComp("Shape Layer Proof", 960, 540, 1, 4, 30);
        var controlLayer = comp.layers.addNull();
        var effects = controlLayer.property("ADBE Effect Parade");
        var slider = addSlider(effects, "Test Slider", 0);
        var shapeLayer = comp.layers.addShape();
        var contents = shapeLayer.property("ADBE Root Vectors Group");
        var group = contents.addProperty("ADBE Vector Group");
        var groupContents = group.property("ADBE Vectors Group");
        var pathGroup = groupContents.addProperty("ADBE Vector Shape - Group");
        var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke");
        var trim = groupContents.addProperty("ADBE Vector Filter - Trim");
        var trimEnd = trim.property("ADBE Vector Trim End");
        var shape = new Shape();

        controlLayer.name = "Control";
        controlLayer.guideLayer = true;
        shapeLayer.name = "Proof Shape";
        group.name = "Proof Path";

        shape.vertices = [[80, 320], [240, 140], [420, 360], [620, 180], [820, 280]];
        shape.inTangents = [[0, 0], [-30, 20], [-25, -20], [-20, 25], [0, 0]];
        shape.outTangents = [[30, -20], [25, 20], [20, -25], [30, 10], [0, 0]];
        shape.closed = false;

        pathGroup.property("ADBE Vector Shape").setValue(shape);
        stroke.property("ADBE Vector Stroke Color").setValue([0.98, 0.79, 0.18]);
        stroke.property("ADBE Vector Stroke Width").setValue(10);
        stroke.property("ADBE Vector Stroke Line Cap").setValue(2);
        trim.property("ADBE Vector Trim Start").setValue(0);
        trimEnd.setValue(0);
        trimEnd.expression = [
            "thisComp.layer('Control').effect('Test Slider')('Slider');"
        ].join("\n");

        slider.setValueAtTime(0, 0);
        slider.setValueAtTime(2, 100);
        slider.setValueAtTime(4, 100);

        try {
            shapeLayer.property("Transform").property("Position").setValue([0, 0]);
            shapeLayer.property("Transform").property("Anchor Point").setValue([0, 0]);
        } catch (_) {}

        try { comp.bgColor = [0.06, 0.07, 0.1]; } catch (_) {}
        try { comp.openInViewer(); } catch (_) {}

        assert(shapeLayer !== null, "Shape layer should exist");
        assert(trimEnd.expressionError === "", "Trim expression error: " + trimEnd.expressionError);
        assert(slider.valueAtTime(2, false) === 100, "Slider should animate to 100");
        assert(trimEnd.valueAtTime(2, false) > 0, "Trim path should evaluate from slider expression");

        log("Shape layer proof created successfully in comp: " + comp.name);
    } finally {
        app.endUndoGroup();
    }
})();
