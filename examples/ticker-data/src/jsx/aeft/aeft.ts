// src/jsx/aeft/aeft.ts
import { getActiveComp, getProjectDir } from "./aeft-utils";
import { runPreset } from "../builders/preset";
import { scanAndPopulateTextBindings } from "../builders/text-binder";
import type { BuildConfig, BuildResult, BindResult, TextBindConfig } from "../../shared/types";

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
  return { name: projectName, path: projectPath, hasProject: !!app.project.file };
};

export const getProjectRoot = () => {
  var dir = getProjectDir();
  if (dir) return dir.fsName || String(dir);
  return "";
};

export const getActiveCompInfo = () => {
  var comp = getActiveComp();
  if (!comp) return { name: "", duration: 0, frameRate: 0, width: 0, height: 0, hasComp: false };
  var MAX_LAYERS = 30;
  function getLayerType(layer: Layer): string {
    if (layer instanceof TextLayer) return "text";
    if (layer instanceof ShapeLayer) return "shape";
    if (layer instanceof AVLayer) return "av";
    return "unknown";
  }
  var count = Math.min(comp.numLayers, MAX_LAYERS);
  var layers: { name: string; type: string; index: number }[] = [];
  for (var j = 1; j <= count; j++) {
    var l = comp.layer(j);
    layers.push({ name: l.name, type: getLayerType(l), index: l.index });
  }
  return { name: comp.name, width: comp.width, height: comp.height, frameRate: comp.frameRate, duration: comp.duration, numLayers: comp.numLayers, layers, hasComp: true };
};

export const buildFromPreset = (config: BuildConfig): BuildResult => {
  return runPreset(config);
};

export const populateTextBindings = (config: TextBindConfig): BindResult => {
  return scanAndPopulateTextBindings(config);
};

export const getActiveCompTextLayers = () => {
  var comp = getActiveComp();
  if (!comp) return [];
  var result: { name: string; index: number; text: string }[] = [];
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer instanceof TextLayer) {
      var text = "";
      try { text = String((layer.property("Source Text") as any).value.text); } catch (e) {}
      result.push({ name: layer.name, index: i, text });
    }
  }
  return result;
};
