/**
 * test_helpers.jsx
 * ------------------------------------------------------------------------
 * Unit tests for Scripts/lib/helpers.jsxinc.
 * Tests pure functions that do not require a live After Effects project.
 *
 * Run from ExtendScript Toolkit or After Effects via
 * File > Scripts > Run Script File...
 */
(function runHelperTests() {
    var scriptFile = File($.fileName);
    var scriptsFolder = scriptFile.parent.parent; // .../Scripts
    var helpersFile = File(scriptsFolder.fsName + "/lib/helpers.jsxinc");
    if (!helpersFile.exists) {
        throw new Error("helpers.jsxinc not found at: " + helpersFile.fsName);
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

    // ---- safeTrim tests ----

    addTest("safeTrim trims whitespace", function () {
        assert(safeTrim("  hello  ") === "hello", "Should trim spaces");
    });

    addTest("safeTrim handles null", function () {
        assert(safeTrim(null) === "", "null should return empty string");
    });

    addTest("safeTrim handles undefined", function () {
        assert(safeTrim(undefined) === "", "undefined should return empty string");
    });

    addTest("safeTrim handles empty string", function () {
        assert(safeTrim("") === "", "empty string should return empty string");
    });

    addTest("safeTrim preserves inner spaces", function () {
        assert(safeTrim("  hello world  ") === "hello world", "Inner spaces preserved");
    });

    addTest("safeTrim handles tabs and newlines", function () {
        assert(safeTrim("\t\nhello\t\n") === "hello", "Should trim tabs and newlines");
    });

    // ---- countWords tests ----

    addTest("countWords counts simple words", function () {
        assert(countWords("one two three") === 3, "Should count 3 words");
    });

    addTest("countWords returns 1 for empty string", function () {
        assert(countWords("") === 1, "Empty string should return 1");
    });

    addTest("countWords returns 1 for null", function () {
        assert(countWords(null) === 1, "null should return 1");
    });

    addTest("countWords handles extra whitespace", function () {
        assert(countWords("  one   two  ") === 2, "Should count 2 words despite extra spaces");
    });

    addTest("countWords counts single word", function () {
        assert(countWords("hello") === 1, "Single word should return 1");
    });

    // ---- isSupportedImageExtension tests ----

    addTest("isSupportedImageExtension recognizes png", function () {
        assert(isSupportedImageExtension("png") === true, "png should be supported");
    });

    addTest("isSupportedImageExtension recognizes jpg", function () {
        assert(isSupportedImageExtension("jpg") === true, "jpg should be supported");
    });

    addTest("isSupportedImageExtension recognizes jpeg", function () {
        assert(isSupportedImageExtension("jpeg") === true, "jpeg should be supported");
    });

    addTest("isSupportedImageExtension is case-insensitive", function () {
        assert(isSupportedImageExtension("PNG") === true, "PNG should be supported");
        assert(isSupportedImageExtension("Jpg") === true, "Jpg should be supported");
    });

    addTest("isSupportedImageExtension rejects unsupported", function () {
        assert(isSupportedImageExtension("mp4") === false, "mp4 should not be supported");
        assert(isSupportedImageExtension("txt") === false, "txt should not be supported");
    });

    addTest("isSupportedImageExtension rejects empty/null", function () {
        assert(isSupportedImageExtension("") === false, "empty string should return false");
        assert(isSupportedImageExtension(null) === false, "null should return false");
        assert(isSupportedImageExtension(undefined) === false, "undefined should return false");
    });

    addTest("isSupportedImageExtension recognizes all formats", function () {
        var all = ["png", "jpg", "jpeg", "gif", "bmp", "tif", "tiff", "psd", "webp"];
        for (var i = 0; i < all.length; i++) {
            assert(isSupportedImageExtension(all[i]) === true, all[i] + " should be supported");
        }
    });

    // ---- Run all tests ----

    // Load helpers module
    $.evalFile(helpersFile);

    var failures = 0;
    var executed = 0;

    for (var i = 0; i < tests.length; i++) {
        var test = tests[i];
        try {
            test.fn();
            log("PASS: " + test.name);
        } catch (err) {
            failures++;
            log("FAIL: " + test.name + " -> " + err.toString());
        }
        executed++;
    }

    if (failures > 0) {
        throw new Error(failures + " test(s) failed out of " + executed);
    }
    log("All " + executed + " helper tests passed.");
})();
