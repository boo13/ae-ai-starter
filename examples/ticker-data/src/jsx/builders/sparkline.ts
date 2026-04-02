// src/jsx/builders/sparkline.ts
import type { StockData, Customization } from "../../shared/types";

export interface SparklineOptions {
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
  strokeWidth: number;
  customization: Customization;
}

export function buildSparkline(
  hostComp: CompItem,
  stockData: StockData,
  options: SparklineOptions
): ShapeLayer {
  var history = stockData.history;
  if (!history || history.length < 2) {
    throw new Error("Not enough history data for sparkline (need ≥2 points)");
  }

  // Extract close prices
  var prices: number[] = [];
  for (var i = 0; i < history.length; i++) {
    prices.push(history[i].close);
  }

  // Normalize to [0, 1]
  var minPrice = prices[0];
  var maxPrice = prices[0];
  for (var j = 1; j < prices.length; j++) {
    if (prices[j] < minPrice) minPrice = prices[j];
    if (prices[j] > maxPrice) maxPrice = prices[j];
  }
  var priceRange = maxPrice - minPrice || 1;

  var drawW = options.width - options.paddingX * 2;
  var drawH = options.height - options.paddingY * 2;

  // Build path vertices
  var vertices: [number, number][] = [];
  for (var k = 0; k < prices.length; k++) {
    var x = options.paddingX + (k / (prices.length - 1)) * drawW;
    var y = options.paddingY + drawH - ((prices[k] - minPrice) / priceRange) * drawH;
    vertices.push([x - options.width / 2, y - options.height / 2]);  // center relative
  }

  // Tangents (zero = linear path, keeps things clean)
  var inTangents: [number, number][] = [];
  var outTangents: [number, number][] = [];
  for (var t = 0; t < vertices.length; t++) {
    inTangents.push([0, 0]);
    outTangents.push([0, 0]);
  }

  // Determine color
  var isUp = prices[prices.length - 1] >= prices[0];
  var strokeColor: [number, number, number];
  if (options.customization.colorScheme === "monochrome") {
    strokeColor = [0.8, 0.8, 0.8];
  } else {
    strokeColor = isUp ? [0.22, 0.78, 0.39] : [0.87, 0.21, 0.21];  // green / red
  }

  // Create shape layer
  var shapeLayer = hostComp.layers.addShape();
  shapeLayer.name = "Sparkline - " + stockData.symbol;

  var contents = shapeLayer.property("Contents") as PropertyGroup;
  var shapeGroup = contents.addProperty("ADBE Vector Group") as PropertyGroup;
  (shapeGroup as any).name = "Sparkline Path";

  var groupContents = shapeGroup.property("Contents") as PropertyGroup;

  // Add path — use ADBE match names for reliable property access across AE versions
  var pathProp = groupContents.addProperty("ADBE Vector Shape - Group") as PropertyGroup;
  var shapePath = pathProp.property("ADBE Vector Shape") as Property;
  var newPath = new Shape();
  newPath.vertices = vertices;
  newPath.inTangents = inTangents;
  newPath.outTangents = outTangents;
  newPath.closed = false;
  (shapePath as any).setValue(newPath);

  // Add stroke
  var strokeWidthPx = options.strokeWidth;
  if (options.customization.fontSize === "large") strokeWidthPx = options.strokeWidth * 1.5;
  if (options.customization.fontSize === "small") strokeWidthPx = options.strokeWidth * 0.75;
  var stroke = groupContents.addProperty("ADBE Vector Graphic - Stroke") as PropertyGroup;
  (stroke.property("ADBE Vector Stroke Color") as Property).setValue(strokeColor);
  (stroke.property("ADBE Vector Stroke Width") as Property).setValue(strokeWidthPx);
  (stroke.property("ADBE Vector Stroke Line Cap") as Property).setValue(2);   // Round cap
  (stroke.property("ADBE Vector Stroke Line Join") as Property).setValue(2);  // Round join

  // Add trim path for draw-on animation
  if (options.customization.sparklineAnimation === "draw-on") {
    var trim = groupContents.addProperty("ADBE Vector Filter - Trim") as PropertyGroup;
    (trim.property("ADBE Vector Trim Start") as Property).setValue(0);
    var endProp = trim.property("ADBE Vector Trim End") as Property;
    endProp.setValueAtTime(0, 0);
    endProp.setValueAtTime(hostComp.duration * 0.5, 100);
  }

  return shapeLayer;
}
