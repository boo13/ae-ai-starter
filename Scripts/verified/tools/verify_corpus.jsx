/* Re-probe verified effects and write a drift report. ES3 and ASCII only. */
(function () {
  function readJson(file) {
    file.encoding = "UTF-8";
    if (!file.open("r")) throw new Error("Could not open " + file.fsName);
    var result = JSON.parse(file.read());
    file.close();
    return result;
  }

  function valueTypeName(prop) {
    var value = prop.propertyValueType;
    var names = ["NO_VALUE", "ThreeD_SPATIAL", "ThreeD", "TwoD_SPATIAL", "TwoD", "OneD", "COLOR", "CUSTOM_VALUE", "MARKER", "LAYER_INDEX", "MASK_INDEX", "SHAPE", "TEXT_DOCUMENT"];
    var values = [PropertyValueType.NO_VALUE, PropertyValueType.ThreeD_SPATIAL, PropertyValueType.ThreeD, PropertyValueType.TwoD_SPATIAL, PropertyValueType.TwoD, PropertyValueType.OneD, PropertyValueType.COLOR, PropertyValueType.CUSTOM_VALUE, PropertyValueType.MARKER, PropertyValueType.LAYER_INDEX, PropertyValueType.MASK_INDEX, PropertyValueType.SHAPE, PropertyValueType.TEXT_DOCUMENT];
    for (var i = 0; i < values.length; i++) if (value === values[i]) return names[i];
    return String(value);
  }

  function probe(effect) {
    var properties = [];
    for (var i = 1; i <= effect.numProperties; i++) {
      var prop = effect.property(i);
      properties.push({ matchName: String(prop.matchName || ""), valueType: valueTypeName(prop) });
    }
    return properties;
  }

  function compare(expected, actual) {
    var differences = [];
    if (expected.length !== actual.length) differences.push("property count " + expected.length + " -> " + actual.length);
    var count = Math.min(expected.length, actual.length);
    for (var i = 0; i < count; i++) {
      if (expected[i].matchName !== actual[i].matchName) differences.push("property " + (i + 1) + " matchName " + expected[i].matchName + " -> " + actual[i].matchName);
      if (expected[i].valueType !== actual[i].valueType) differences.push("property " + (i + 1) + " valueType " + expected[i].valueType + " -> " + actual[i].valueType);
    }
    return differences;
  }

  app.beginUndoGroup("Verify Effect Corpus");
  var scriptFile = new File($.fileName);
  var effectsDir = new Folder(scriptFile.parent.parent.fsName + "/effects");
  var files = effectsDir.getFiles("*.json");
  var comp = app.project.items.addComp("__Corpus Verification__", 64, 64, 1, 1, 24);
  var layer = comp.layers.addSolid([0, 0, 0], "Host", 64, 64, 1);
  var report = [];

  for (var f = 0; f < files.length; f++) {
    if (!(files[f] instanceof File) || files[f].name.charAt(0) === "_") continue;
    var record = readJson(files[f]);
    var entry = { matchName: record.matchName, status: "ok", differences: [] };
    var effect = null;
    try { effect = layer.property("ADBE Effect Parade").addProperty(record.matchName); } catch (e) {
      entry.status = "missing";
      entry.differences.push(e.toString());
      report.push(entry);
      continue;
    }
    entry.differences = compare(record.properties || [], probe(effect));
    if (entry.differences.length) entry.status = "drift";
    effect.remove();
    report.push(entry);
  }

  var verificationDir = new Folder(effectsDir.fsName + "/verification");
  if (!verificationDir.exists) verificationDir.create();
  var output = new File(verificationDir.fsName + "/drift-" + String(app.version).replace(/[^A-Za-z0-9._-]+/g, "-") + ".json");
  output.encoding = "UTF-8";
  if (!output.open("w")) throw new Error("Could not write drift report.");
  output.write(JSON.stringify({ aeVersion: String(app.version), effects: report }, null, 2));
  output.close();
  comp.remove();
  app.endUndoGroup();
  alert("Corpus verification complete: " + report.length + " effects.");
}());
