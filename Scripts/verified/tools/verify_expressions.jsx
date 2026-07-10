/* Verify docs-sourced expression records in After Effects. ES3 and ASCII only. */
(function () {
  function readJson(file) {
    file.encoding = "UTF-8";
    if (!file.open("r")) throw new Error("Could not open " + file.fsName);
    var data = JSON.parse(file.read());
    file.close();
    return data;
  }

  function safeName(value) {
    return String(value).replace(/[^A-Za-z0-9._-]+/g, "-");
  }

  function addControl(layer, matchName, name) {
    var effect = layer.property("ADBE Effect Parade").addProperty(matchName);
    effect.name = name;
    return effect.property(1);
  }

  function buildHosts(comp) {
    var solid = comp.layers.addSolid([0.2, 0.2, 0.2], "Expression Host", comp.width, comp.height, 1);
    var scalar = addControl(solid, "ADBE Slider Control", "Scalar Host");
    scalar.setValueAtTime(0, 0);
    scalar.setValueAtTime(1, 100);
    var point = addControl(solid, "ADBE Point Control", "Point Host");
    point.setValueAtTime(0, [0, 0]);
    point.setValueAtTime(1, [100, 100]);

    var text = comp.layers.addText("Expression verification");
    var textProp = text.property("ADBE Text Properties").property("ADBE Text Document");
    var textScalar = addControl(text, "ADBE Slider Control", "Text Scalar Host");

    var shape = comp.layers.addShape();
    shape.name = "Path Host";
    var contents = shape.property("ADBE Root Vectors Group");
    var group = contents.addProperty("ADBE Vector Group");
    var groupContents = group.property("ADBE Vectors Group");
    var pathGroup = groupContents.addProperty("ADBE Vector Shape - Rect");
    var trim = groupContents.addProperty("ADBE Vector Filter - Trim");
    var pathProp = pathGroup.property("ADBE Vector Rect Size");
    var trimProp = trim.property("ADBE Vector Trim End");
    trimProp.setValueAtTime(0, 0);
    trimProp.setValueAtTime(1, 100);

    var camera = comp.layers.addCamera("Camera Host", [comp.width / 2, comp.height / 2]);
    var cameraScalar = addControl(camera, "ADBE Slider Control", "Camera Scalar Host");
    var light = comp.layers.addLight("Light Host", [comp.width / 2, comp.height / 2]);
    var lightScalar = addControl(light, "ADBE Slider Control", "Light Scalar Host");
    return {
      scalar: scalar,
      point: point,
      text: textProp,
      textScalar: textScalar,
      path: pathProp,
      trim: trimProp,
      camera: cameraScalar,
      light: lightScalar,
    };
  }

  function hostFor(record, hosts) {
    if (record.object === "Text" || record.object === "SourceText" || record.object === "TextStyle") return hosts.text;
    if (record.object === "PathProperty") return hosts.path;
    if (record.object === "Camera") return hosts.camera;
    if (record.object === "Light") return hosts.light;
    if (record.name === "lookAt" || record.name === "cross" || record.name === "normalize") return hosts.point;
    if (record.name.indexOf("loop") === 0 || record.name.indexOf("key") !== -1) return hosts.trim;
    return hosts.scalar;
  }

  function writeJson(file, data) {
    file.encoding = "UTF-8";
    if (!file.open("w")) throw new Error("Could not write " + file.fsName);
    file.write(JSON.stringify(data, null, 2));
    file.close();
  }

  app.beginUndoGroup("Verify Expression Corpus");
  var scriptFile = new File($.fileName);
  var verifiedDir = scriptFile.parent.parent;
  var functionsDir = new Folder(verifiedDir.fsName + "/expressions/functions");
  var verificationDir = new Folder(verifiedDir.fsName + "/expressions/verification");
  if (!functionsDir.exists) throw new Error("Expression corpus not found: " + functionsDir.fsName);
  if (!verificationDir.exists) verificationDir.create();

  var comp = app.project.items.addComp("__Expression Verification__", 1920, 1080, 1, 2, 30);
  var hosts = buildHosts(comp);
  var files = functionsDir.getFiles("*.json");
  var results = [];
  for (var f = 0; f < files.length; f++) {
    if (!(files[f] instanceof File) || files[f].name.charAt(0) === "_") continue;
    var records = readJson(files[f]);
    for (var r = 0; r < records.length; r++) {
      var record = records[r];
      var result = { name: record.name, object: record.object, status: "skipped", expressionError: "", samples: [] };
      if (!record.example) {
        result.expressionError = "No docs example available for automated verification.";
        results.push(result);
        continue;
      }
      var prop = hostFor(record, hosts);
      try {
        var probeExpression = record.example;
        if (record.object === "PathProperty") probeExpression += "\nvalue;";
        else if (record.object !== "Text" && record.object !== "SourceText" && record.object !== "TextStyle") probeExpression += "\n0;";
        prop.expression = probeExpression;
        result.samples.push(String(prop.valueAtTime(0, false)));
        result.samples.push(String(prop.valueAtTime(1, false)));
        result.expressionError = String(prop.expressionError || "");
        result.status = result.expressionError ? "failed" : "verified";
      } catch (e) {
        result.status = "failed";
        result.expressionError = e.toString();
      }
      try { prop.expression = ""; } catch (e) {}
      results.push(result);
    }
  }

  var version = safeName(app.version || "unknown");
  writeJson(new File(verificationDir.fsName + "/verify-" + version + ".json"), {
    aeVersion: String(app.version || ""),
    engines: [String(app.project.expressionEngine || "")],
    records: results,
  });
  comp.remove();
  app.endUndoGroup();
  alert("Expression verification complete: " + results.length + " records.");
}());
