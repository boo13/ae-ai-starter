/* Verify docs-sourced expression records in After Effects. ES3 and ASCII only. */
(function () {
  var step = "initialize";

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
  }

  function buildHosts(comp) {
    step = "build hosts pass 1: create solid layer";
    var solid = comp.layers.addSolid([0.2, 0.2, 0.2], "Expression Host", comp.width, comp.height, 1);
    solid.comment = "Control";
    step = "build hosts pass 1: create scalar control";
    addControl(solid, "ADBE Slider Control", "Scalar Host");
    step = "build hosts pass 1: create point control";
    addControl(solid, "ADBE Point Control", "Point Host");
    step = "build hosts pass 1: create mask";
    var mask = solid.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    mask.name = "Mask 1";
    var maskShape = mask.property("ADBE Mask Shape");
    var maskValue = new Shape();
    maskValue.vertices = [[0, 0], [200, 0], [200, 200], [0, 200]];
    maskValue.closed = true;
    maskShape.setValue(maskValue);
    maskShape = null;
    mask = null;
    step = "build hosts pass 1: create Fast Blur effect";
    var blur = solid.property("ADBE Effect Parade").addProperty("ADBE Gaussian Blur 2");
    blur.name = "Fast Blur";
    blur = null;
    step = "build hosts pass 1: create Bulge effect";
    solid.property("ADBE Effect Parade").addProperty("ADBE Bulge");
    step = "build hosts pass 1: create composition markers";
    comp.markerProperty.setValueAtTime(0.5, new MarkerValue("marker one"));
    comp.markerProperty.setValueAtTime(1.5, new MarkerValue("marker two"));
    step = "build hosts pass 1: create layer marker";
    solid.property("ADBE Marker").setValueAtTime(0.75, new MarkerValue("layer marker"));

    step = "build hosts pass 1: create text layer";
    var text = comp.layers.addText("Expression verification");
    text.name = "Expression verification";
    step = "build hosts pass 1: create text scalar control";
    addControl(text, "ADBE Slider Control", "Text Scalar Host");

    step = "build hosts pass 1: create shape layer";
    var shape = comp.layers.addShape();
    shape.name = "Path Host";
    step = "build hosts pass 1: create vector group";
    var vectorGroup = shape.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    vectorGroup.name = "Expression Vector Group";
    vectorGroup = null;
    step = "build hosts pass 1: create rectangle";
    shape.property("ADBE Root Vectors Group")
      .property("Expression Vector Group")
      .property("ADBE Vectors Group")
      .addProperty("ADBE Vector Shape - Rect");
    step = "build hosts pass 1: create Trim Paths";
    shape.property("ADBE Root Vectors Group")
      .property("Expression Vector Group")
      .property("ADBE Vectors Group")
      .addProperty("ADBE Vector Filter - Trim");

    step = "build hosts pass 1: create camera";
    var camera = comp.layers.addCamera("Camera Host", [comp.width / 2, comp.height / 2]);
    step = "build hosts pass 1: create light";
    var light = comp.layers.addLight("Light Host", [comp.width / 2, comp.height / 2]);

    step = "build hosts pass 2: look up solid layer";
    solid = comp.layer("Expression Host");
    step = "build hosts pass 2: look up text layer";
    text = comp.layer("Expression verification");
    step = "build hosts pass 2: look up shape layer";
    shape = comp.layer("Path Host");
    step = "build hosts pass 2: look up camera layer";
    camera = comp.layer("Camera Host");
    step = "build hosts pass 2: look up light layer";
    light = comp.layer("Light Host");
    step = "build hosts pass 2: look up scalar host";
    var scalar = solid.property("ADBE Effect Parade").property("Scalar Host").property(1);
    step = "build hosts pass 2: look up point host";
    var point = solid.property("ADBE Effect Parade").property("Point Host").property(1);
    step = "build hosts pass 2: look up text host";
    var textProp = text.property("ADBE Text Properties").property("ADBE Text Document");
    step = "build hosts pass 2: look up text scalar host";
    var textScalar = text.property("ADBE Effect Parade").property("Text Scalar Host").property(1);
    step = "build hosts pass 2: look up path host";
    var pathProp = solid.property("ADBE Mask Parade")
      .property("Mask 1")
      .property("ADBE Mask Shape");
    step = "build hosts pass 2: look up Trim Paths host";
    var trimProp = shape.property("ADBE Root Vectors Group")
      .property("Expression Vector Group")
      .property("ADBE Vectors Group")
      .property("ADBE Vector Filter - Trim")
      .property("ADBE Vector Trim End");
    step = "build hosts pass 2: look up camera Zoom host";
    var cameraScalar = camera.property("ADBE Camera Options Group").property("ADBE Camera Zoom");
    step = "build hosts pass 2: look up light Intensity host";
    var lightScalar = light.property("ADBE Light Options Group").property("ADBE Light Intensity");

    step = "build hosts pass 2: apply scalar keyframes";
    scalar.setValueAtTime(0, 0);
    scalar.setValueAtTime(1, 100);
    step = "build hosts pass 2: apply point keyframes";
    point.setValueAtTime(0, [0, 0]);
    point.setValueAtTime(1, [100, 100]);
    step = "build hosts pass 2: apply scale keyframes";
    var scale = solid.property("ADBE Transform Group").property("ADBE Scale");
    scale.setValueAtTime(0, [100, 100]);
    scale.setValueAtTime(1, [50, 50]);
    step = "build hosts pass 2: apply Trim Paths keyframes";
    trimProp.setValueAtTime(0, 0);
    trimProp.setValueAtTime(1, 100);

    step = "build hosts pass 2: return hosts";
    return {
      scalar: scalar,
      point: point,
      text: textProp,
      textScalar: textScalar,
      path: pathProp,
      trim: trimProp,
      camera: cameraScalar,
      light: lightScalar
    };
  }

  function hostFor(record, hosts) {
    if (record.object === "Text" || record.object === "SourceText" || record.object === "TextStyle") return hosts.text;
    if (record.object === "PathProperty") return hosts.path;
    if (record.object === "Camera") return hosts.camera;
    if (record.object === "Light") return hosts.light;
    if (record.object === "Marker") return hosts.scalar;
    if (record.object === "Property" && (record.name === "key" || record.name === "nearestKey" || record.name === "previousKey")) return hosts.scalar;
    if (record.name === "lookAt" || record.name === "cross" || record.name === "length" || record.name === "normalize") return hosts.point;
    if (record.name.indexOf("loop") === 0) return hosts.trim;
    return hosts.scalar;
  }

  function needsDataFootageFixture(record) {
    return record.object === "Footage" &&
      (record.name === "dataKeyCount" || record.name === "dataKeyTimes" ||
       record.name === "dataKeyValues" || record.name === "dataValue");
  }

  function writeJson(file, data) {
    file.encoding = "UTF-8";
    if (!file.open("w")) throw new Error("Could not write " + file.fsName);
    file.write(JSON.stringify(data, null, 2));
    file.close();
  }

  var undoOpen = false;
  try {
    step = "begin undo group";
    app.beginUndoGroup("Verify Expression Corpus");
    undoOpen = true;

    step = "resolve expression corpus paths";
    var scriptFile = new File($.fileName);
    var verifiedDir = scriptFile.parent.parent;
    var functionsDir = new Folder(verifiedDir.fsName + "/expressions/functions");
    var verificationDir = new Folder(verifiedDir.fsName + "/expressions/verification");
    if (!functionsDir.exists) throw new Error("Expression corpus not found: " + functionsDir.fsName);
    if (!verificationDir.exists) verificationDir.create();

    step = "create verification composition";
    var comp = app.project.items.addComp("__Expression Verification__", 1920, 1080, 1, 2, 30);
    step = "build expression hosts";
    var hosts = buildHosts(comp);
    step = "list expression corpus files";
    var files = functionsDir.getFiles("*.json");
    var results = [];
    step = "verify expression records";
    for (var f = 0; f < files.length; f++) {
      if (!(files[f] instanceof File) || files[f].name.charAt(0) === "_") continue;
      step = "read expression records from " + files[f].name;
      var records = readJson(files[f]);
      step = "verify expression records from " + files[f].name;
      for (var r = 0; r < records.length; r++) {
        var record = records[r];
        var result = { name: record.name, object: record.object, status: "skipped", expressionError: "", samples: [] };
        var probeExpression = "";
        if (typeof record.probe === "string" && record.probe) probeExpression = record.probe;
        else if (!needsDataFootageFixture(record) && record.example) probeExpression = record.example;
        if (!probeExpression) {
          if (needsDataFootageFixture(record)) result.expressionError = "Verification requires imported data footage.";
          else result.expressionError = "No probe or docs example available for automated verification.";
          results.push(result);
          continue;
        }
        var prop = hostFor(record, hosts);
        try {
          if (record.object !== "Text" && record.object !== "SourceText" && record.object !== "TextStyle") probeExpression += "\nvalue;";
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

    step = "write verification sidecar";
    var version = safeName(app.version || "unknown");
    writeJson(new File(verificationDir.fsName + "/verify-" + version + ".json"), {
      aeVersion: String(app.version || ""),
      engines: [String(app.project.expressionEngine || "")],
      records: results
    });
    step = "remove verification composition";
    comp.remove();
    step = "end undo group";
    app.endUndoGroup();
    undoOpen = false;
    var verifiedCount = 0;
    var failedCount = 0;
    var skippedCount = 0;
    for (var i = 0; i < results.length; i++) {
      if (results[i].status === "verified") verifiedCount++;
      else if (results[i].status === "failed") failedCount++;
      else skippedCount++;
    }
    alert("Expression verification complete: verified " + verifiedCount + " / failed " + failedCount + " / skipped " + skippedCount + " of " + results.length + " records");
  } catch (e) {
    if (undoOpen) {
      try { app.endUndoGroup(); } catch (ignore) {}
      undoOpen = false;
    }
    alert(step + ": " + e.toString());
  }
}());
