/* Discover selected After Effects global enum values. ES3 and ASCII only. */
(function () {
  function enumValue(value) {
    try {
      var numeric = Number(value);
      if (!isNaN(numeric)) return numeric;
    } catch (e) {}
    return String(value);
  }

  function discover(name) {
    var result = {};
    var object = null;
    try { object = eval(name); } catch (e) { return result; }
    try {
      var properties = object.reflect.properties;
      for (var i = 0; i < properties.length; i++) {
        var propertyName = properties[i].name;
        if (!propertyName || propertyName === "__proto__") continue;
        try { result[propertyName] = enumValue(object[propertyName]); } catch (e) {}
      }
    } catch (e) {
      for (var key in object) {
        try { result[key] = enumValue(object[key]); } catch (ignore) {}
      }
    }
    return result;
  }

  var names = [
    "BlendingMode",
    "TrackMatteType",
    "LightType",
    "KeyframeInterpolationType",
    "MaskMode",
    "ParagraphJustification"
  ];
  var output = {};
  for (var i = 0; i < names.length; i++) output[names[i]] = discover(names[i]);

  var scriptFile = new File($.fileName);
  var file = new File(scriptFile.parent.parent.fsName + "/properties/global-enums.json");
  file.encoding = "UTF-8";
  if (!file.open("w")) throw new Error("Could not write " + file.fsName);
  file.write(JSON.stringify(output, null, 2));
  file.close();
  alert("Global enums written to " + file.fsName);
}());
