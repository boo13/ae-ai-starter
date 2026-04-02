// src/jsx/builders/chart.ts
import type { StockData, Customization } from "../../shared/types";

var CHART_WIDTH = 1280;
var CHART_HEIGHT = 720;
var CHART_PADDING_X = 80;
var CHART_PADDING_Y = 60;

var DEFAULT_COLORS: Array<[number, number, number]> = [
  [0.27, 0.65, 1.0],    // blue
  [0.22, 0.78, 0.39],   // green
  [1.0, 0.65, 0.0],     // orange
  [0.87, 0.21, 0.75],   // pink
  [0.55, 0.87, 0.87],   // teal
];

function getColor(i: number, scheme: Customization["colorScheme"]): [number, number, number] {
  if (scheme === "monochrome") {
    var v = 0.9 - i * 0.15;
    return [v, v, v];
  }
  return DEFAULT_COLORS[i % DEFAULT_COLORS.length];
}

export function buildComparisonChart(
  stocks: StockData[],
  customization: Customization,
  parentFolder: FolderItem
): CompItem {
  var compName = "TD: Comparison";

  // Populate mode
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.name === compName) {
      while (item.numLayers > 0) item.layer(1).remove();
      return populateChart(item, stocks, customization);
    }
  }

  var comp = app.project.items.addComp(compName, CHART_WIDTH, CHART_HEIGHT, 1, 10, 30);
  if (parentFolder) comp.parentFolder = parentFolder;
  return populateChart(comp, stocks, customization);
}

function populateChart(comp: CompItem, stocks: StockData[], customization: Customization): CompItem {
  // Background
  var bg = comp.layers.addSolid([0.06, 0.06, 0.09], "Background", CHART_WIDTH, CHART_HEIGHT, 1);
  bg.moveToEnd();

  var drawW = CHART_WIDTH - CHART_PADDING_X * 2;
  var drawH = CHART_HEIGHT - CHART_PADDING_Y * 2;

  // PASS 1: Compute % change arrays for all stocks, then find GLOBAL min/max
  // This ensures all stocks share the same y-axis scale for a true visual comparison
  var allPctChanges: number[][] = [];
  for (var pi = 0; pi < stocks.length; pi++) {
    var hist = stocks[pi].history;
    if (!hist || hist.length < 2 || !hist[0].close) { allPctChanges.push([]); continue; }
    var base = hist[0].close;
    var changes: number[] = [];
    for (var hi = 0; hi < hist.length; hi++) {
      changes.push((hist[hi].close - base) / base * 100);
    }
    allPctChanges.push(changes);
  }

  var globalMin = Infinity;
  var globalMax = -Infinity;
  for (var ai = 0; ai < allPctChanges.length; ai++) {
    for (var aj = 0; aj < allPctChanges[ai].length; aj++) {
      if (allPctChanges[ai][aj] < globalMin) globalMin = allPctChanges[ai][aj];
      if (allPctChanges[ai][aj] > globalMax) globalMax = allPctChanges[ai][aj];
    }
  }
  // Add 10% padding to the range so lines don't touch edges
  var pctRange = (globalMax - globalMin) || 1;
  var paddedMin = globalMin - pctRange * 0.1;
  var paddedMax = globalMax + pctRange * 0.1;
  var paddedRange = paddedMax - paddedMin;

  // PASS 2: Draw each stock using the shared axis
  for (var si = 0; si < stocks.length; si++) {
    var stock = stocks[si];
    var pctChanges = allPctChanges[si];
    if (pctChanges.length < 2) continue;

    // Build path using shared y-axis scale
    var vertices: [number, number][] = [];
    for (var vi = 0; vi < pctChanges.length; vi++) {
      var x = CHART_PADDING_X + (vi / (pctChanges.length - 1)) * drawW - CHART_WIDTH / 2;
      var y = CHART_PADDING_Y + drawH - ((pctChanges[vi] - paddedMin) / paddedRange * drawH) - CHART_HEIGHT / 2;
      vertices.push([x, y]);
    }

    var color = getColor(si, customization.colorScheme);

    var shapeLayer = comp.layers.addShape();
    shapeLayer.name = stock.symbol + " Line";

    var contents = shapeLayer.property("Contents") as PropertyGroup;
    var grp = contents.addProperty("ADBE Vector Group") as PropertyGroup;
    var grpContents = grp.property("Contents") as PropertyGroup;

    var inT: [number, number][] = [];
    var outT: [number, number][] = [];
    for (var t = 0; t < vertices.length; t++) { inT.push([0,0]); outT.push([0,0]); }

    var pathPropGroup = grpContents.addProperty("ADBE Vector Shape - Group") as PropertyGroup;
    var shapePath = pathPropGroup.property("ADBE Vector Shape") as Property;
    var newPath = new Shape();
    newPath.vertices = vertices;
    newPath.inTangents = inT;
    newPath.outTangents = outT;
    newPath.closed = false;
    (shapePath as any).setValue(newPath);

    var stroke = grpContents.addProperty("ADBE Vector Graphic - Stroke") as PropertyGroup;
    (stroke.property("ADBE Vector Stroke Color") as Property).setValue(color);
    (stroke.property("ADBE Vector Stroke Width") as Property).setValue(2);
    (stroke.property("ADBE Vector Stroke Line Cap") as Property).setValue(2);

    // Legend label — get TextDocument from layer, set applyFill before fillColor,
    // use full property paths for reliable cross-version AE compatibility
    var lastPct = pctChanges[pctChanges.length - 1];
    var sign = lastPct >= 0 ? "+" : "";
    var legendText = stock.symbol + "  " + sign + lastPct.toFixed(1) + "%";
    var legendLayer = comp.layers.addText(legendText) as TextLayer;
    legendLayer.name = stock.symbol + " Legend";
    var legendSrcProp = legendLayer.property("Text").property("Source Text") as Property;
    var legendDoc = legendSrcProp.value as TextDocument;
    legendDoc.text = legendText;
    legendDoc.fontSize = 22;
    legendDoc.applyFill = true;
    legendDoc.fillColor = color;
    legendDoc.justification = ParagraphJustification.LEFT_JUSTIFY;
    legendSrcProp.setValue(legendDoc);
    var legendTransform = legendLayer.property("Transform") as PropertyGroup;
    (legendTransform.property("Anchor Point") as Property).setValue([0, 0]);
    (legendTransform.property("Position") as Property).setValue([
      CHART_PADDING_X + si * 160,
      CHART_HEIGHT - 20,
    ]);
  }

  return comp;
}
