import { getActiveComp, getProjectDir } from "./aeft-utils";

export const getProjectInfo = () => {
  var projectName = "";
  var projectPath = "";

  if (app.project.file) {
    projectName = app.project.file.name.replace(/\.aep$/i, "");
    projectPath = app.project.file.parent.fsName;
  } else {
    projectName = "(unsaved project)";
    projectPath = "";
  }

  return {
    projectName: projectName,
    projectPath: projectPath,
    numItems: app.project.numItems,
  };
};

export const getActiveCompInfo = () => {
  var comp = getActiveComp();
  if (!comp) {
    return {
      error: "No active composition. Open a composition first.",
    };
  }

  var MAX_LAYERS = 30;

  function getLayerType(layer: Layer): string {
    if (layer instanceof TextLayer) return "text";
    if (layer instanceof ShapeLayer) return "shape";
    if (layer instanceof AVLayer) return "av";
    if (layer instanceof CameraLayer) return "camera";
    if (layer instanceof LightLayer) return "light";
    return "unknown";
  }

  var selectedLayers: { name: string; type: string; index: number }[] = [];
  if (comp.selectedLayers) {
    for (var i = 0; i < comp.selectedLayers.length; i++) {
      var layer = comp.selectedLayers[i];
      selectedLayers.push({
        name: layer.name,
        type: getLayerType(layer),
        index: layer.index,
      });
    }
  }

  // Cap layers to avoid exceeding CEP bridge return size limit (~10KB)
  var count = Math.min(comp.numLayers, MAX_LAYERS);
  var layers: { name: string; type: string; index: number }[] = [];
  for (var j = 1; j <= count; j++) {
    var l = comp.layer(j);
    layers.push({ name: l.name, type: getLayerType(l), index: l.index });
  }

  return {
    name: comp.name,
    width: comp.width,
    height: comp.height,
    fps: comp.frameRate,
    duration: comp.duration,
    numLayers: comp.numLayers,
    selectedLayers: selectedLayers,
    layers: layers,
  };
};

export const runAnalysisScript = () => {
  var projectDir = getProjectDir();
  if (!projectDir) {
    return { error: "Save your project first so the script path can be resolved." };
  }

  var scriptPath = projectDir + "/Scripts/analyze/run_analysis.jsx";
  var scriptFile = new File(scriptPath);

  if (!scriptFile.exists) {
    return { error: "Analysis script not found at: " + scriptPath };
  }

  try {
    //@ts-ignore
    $.evalFile(scriptFile);
    return { success: true, message: "Analysis complete." };
  } catch (e: any) {
    return { error: "Analysis failed: " + e.toString() };
  }
};

export const runScriptFile = (filePath: string) => {
  var scriptFile = new File(filePath);
  if (!scriptFile.exists) {
    return { error: "Script not found: " + filePath };
  }

  try {
    app.beginUndoGroup("AI Chat: Run Script");
    //@ts-ignore
    var result = $.evalFile(scriptFile);
    app.endUndoGroup();
    return { success: true, message: "Script executed successfully.", result: String(result) };
  } catch (e: any) {
    try { app.endUndoGroup(); } catch (_) {}
    return { error: "Script failed: " + e.toString() };
  }
};

export const getProjectRoot = () => {
  var dir = getProjectDir();
  if (dir) {
    return dir.fsName || String(dir);
  }
  return "";
};

export const takeScreenshot = (timestamp: string) => {
  var comp = getActiveComp();
  if (!comp) {
    return { error: "No active composition found." };
  }

  var dir = getProjectDir();
  if (!dir) {
    return { error: "Save your project first." };
  }

  var screenshotsDir = new Folder(dir.fsName + "/screenshots");
  if (!screenshotsDir.exists) {
    screenshotsDir.create();
  }

  var fileName = "screenshot_" + timestamp + ".png";
  var file = new File(screenshotsDir.fsName + "/" + fileName);

  try {
    comp.saveFrameToPng(comp.time, file);
    return {
      success: true,
      path: file.fsName,
      fileName: fileName,
    };
  } catch (e: any) {
    return { error: "Failed to save screenshot: " + e.toString() };
  }
};
