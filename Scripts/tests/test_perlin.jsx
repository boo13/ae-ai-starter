/**
 * test_perlin.jsx
 *
 * Unit tests for the Flow Field math engine.
 */
(function runPerlinTests() {
    var scriptFile = File($.fileName);
    var scriptsFolder = scriptFile.parent.parent;
    var engineFile = File(scriptsFolder.fsName + "/demos/flow_field/flow_field_engine.jsxinc");

    if (!engineFile.exists) {
        throw new Error("flow_field_engine.jsxinc not found at: " + engineFile.fsName);
    }

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

    var tests = [];
    function addTest(name, fn) {
        tests.push({ name: name, fn: fn });
    }

    $.evalFile(engineFile);

    addTest("Perlin output stays within range", function () {
        var noise = createPerlinNoise(11);
        var x;
        var y;
        var value;
        for (x = 0; x < 10; x++) {
            for (y = 0; y < 10; y++) {
                value = noise.get(x * 0.17, y * 0.13);
                assert(value >= -1.0001 && value <= 1.0001, "Noise value out of range: " + value);
            }
        }
    });

    addTest("Perlin is deterministic for the same seed", function () {
        var a = createPerlinNoise(42);
        var b = createPerlinNoise(42);
        var sampleA = a.get(1.234, 9.876);
        var sampleB = b.get(1.234, 9.876);
        assert(Math.abs(sampleA - sampleB) < 0.000001, "Seeded samples should match");
    });

    addTest("Perlin varies with different seeds", function () {
        var a = createPerlinNoise(42);
        var b = createPerlinNoise(99);
        var sampleA = a.get(4.2, 6.6);
        var sampleB = b.get(4.2, 6.6);
        assert(Math.abs(sampleA - sampleB) > 0.0001, "Different seeds should produce different values");
    });

    addTest("Perlin changes smoothly for adjacent samples", function () {
        var noise = createPerlinNoise(7);
        var base = noise.get(0.8, 1.2);
        var nearby = noise.get(0.82, 1.22);
        assert(Math.abs(base - nearby) < 0.3, "Adjacent samples should not jump sharply");
    });

    addTest("simplifyPoints preserves endpoints and reduces points", function () {
        var points = [];
        var i;
        var simplified;
        for (i = 0; i < 20; i++) {
            points.push([i * 10, Math.sin(i / 2) * 20]);
        }
        simplified = simplifyPoints(points, 2.5);
        assert(simplified.length < points.length, "Simplification should reduce point count");
        assert(simplified[0][0] === points[0][0] && simplified[0][1] === points[0][1], "First point should be preserved");
        assert(simplified[simplified.length - 1][0] === points[points.length - 1][0], "Last point X should be preserved");
        assert(simplified[simplified.length - 1][1] === points[points.length - 1][1], "Last point Y should be preserved");
    });

    addTest("pointsToBezierPath returns aligned arrays", function () {
        var points = [[0, 0], [50, 20], [100, 40], [150, 10]];
        var path = pointsToBezierPath(points, 1);
        assert(path.vertices.length === path.inTangents.length, "vertices and inTangents should match");
        assert(path.vertices.length === path.outTangents.length, "vertices and outTangents should match");
        assert(path.closed === false, "Path should be open");
    });

    addTest("generateStreamlines returns visible lines", function () {
        var lines = generateStreamlines({
            width: 640,
            height: 360,
            density: 20,
            scale: 0.015,
            stepSize: 3,
            maxSteps: 60,
            separation: 12,
            margin: 20,
            seed: 123
        });
        assert(lines.length > 0, "Expected at least one streamline");
        assert(lines[0].length > 5, "Expected streamline to contain multiple points");
    });

    var failures = 0;
    var executed = 0;
    var i;

    for (i = 0; i < tests.length; i++) {
        try {
            tests[i].fn();
            log("PASS: " + tests[i].name);
        } catch (err) {
            failures++;
            log("FAIL: " + tests[i].name + " -> " + err.toString());
        }
        executed++;
    }

    if (failures > 0) {
        throw new Error(failures + " test(s) failed out of " + executed);
    }
    log("All " + executed + " Perlin tests passed.");
})();
