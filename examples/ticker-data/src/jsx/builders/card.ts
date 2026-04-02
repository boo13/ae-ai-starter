// src/jsx/builders/card.ts
import { buildSparkline } from "./sparkline";
import { formatPrice, formatPercent, formatChange } from "../lib/format";
import type { StockData, Customization } from "../../shared/types";

var CARD_WIDTH = 300;
var CARD_HEIGHT = 160;

function fontSizePx(size: Customization["fontSize"]): number {
  return size === "small" ? 28 : size === "large" ? 48 : 36;
}

export function buildStockCard(
  stockData: StockData,
  customization: Customization,
  parentFolder: FolderItem
): CompItem {
  var compName = "TD: " + stockData.symbol;

  // Populate mode: update existing comp
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.name === compName) {
      return populateCardComp(item, stockData, customization);
    }
  }

  // Create mode
  var comp = app.project.items.addComp(compName, CARD_WIDTH, CARD_HEIGHT, 1, 5, 30);
  if (parentFolder) comp.parentFolder = parentFolder;

  return populateCardComp(comp, stockData, customization);
}

function setTextLayer(
  layer: TextLayer,
  text: string,
  fontSize: number,
  fillColor: [number, number, number],
  position: [number, number]
): void {
  // Get TextDocument from the layer (already associated) rather than creating standalone
  var srcProp = layer.property("Text").property("Source Text") as Property;
  var doc = srcProp.value as TextDocument;
  doc.text = text;
  doc.fontSize = fontSize;
  doc.applyFill = true;
  doc.fillColor = fillColor;
  // Explicitly left-justify so the anchor is at the text's left edge, not center
  doc.justification = ParagraphJustification.LEFT_JUSTIFY;
  srcProp.setValue(doc);
  var transform = layer.property("Transform") as PropertyGroup;
  // Reset anchor to [0,0] (text baseline-left) so Position means top-left of text
  (transform.property("Anchor Point") as Property).setValue([0, 0]);
  (transform.property("Position") as Property).setValue(position);
}

function populateCardComp(comp: CompItem, stockData: StockData, customization: Customization): CompItem {
  var step = "init";
  try {
    // Remove old layers
    step = "remove old layers";
    while (comp.numLayers > 0) {
      comp.layer(1).remove();
    }

    var isUp = stockData.changePercent >= 0;
    var changeColor: [number, number, number];
    if (customization.colorScheme === "monochrome") {
      changeColor = [0.8, 0.8, 0.8];
    } else {
      changeColor = isUp ? [0.22, 0.78, 0.39] : [0.87, 0.21, 0.21];
    }

    var fsPx = fontSizePx(customization.fontSize);

    // Background
    step = "add background";
    var bg = comp.layers.addSolid([0.08, 0.08, 0.12], "Background", CARD_WIDTH, CARD_HEIGHT, 1);
    bg.moveToEnd();

    // Symbol text
    step = "add symbol layer";
    var symLayer = comp.layers.addText(stockData.symbol) as TextLayer;
    symLayer.name = "Symbol";
    step = "set symbol text";
    setTextLayer(symLayer, stockData.symbol, fsPx * 0.8, [1, 1, 1], [20, 30 + fsPx * 0.6]);

    // Price text
    step = "add price layer";
    var priceLayer = comp.layers.addText(formatPrice(stockData.current)) as TextLayer;
    priceLayer.name = "Price";
    step = "set price text";
    setTextLayer(priceLayer, formatPrice(stockData.current), fsPx, [1, 1, 1], [20, 30 + fsPx * 0.6 + fsPx + 8]);

    // Change % text
    step = "add change layer";
    var changeText = formatChange(stockData.change) + "  " + formatPercent(stockData.changePercent);
    var changeLayer = comp.layers.addText(changeText) as TextLayer;
    changeLayer.name = "Change";
    step = "set change text";
    setTextLayer(changeLayer, changeText, fsPx * 0.55, changeColor, [20, 30 + fsPx * 0.6 + fsPx * 2 + 14]);

    // Sparkline (right side)
    if (stockData.history && stockData.history.length >= 2) {
      step = "build sparkline";
      var spark = buildSparkline(comp, stockData, {
        width: 120,
        height: 60,
        paddingX: 4,
        paddingY: 4,
        strokeWidth: 2,
        customization,
      });
      step = "set sparkline position";
      (spark.property("Transform").property("Position") as Property).setValue([CARD_WIDTH - 70, CARD_HEIGHT - 40]);
    }

    return comp;
  } catch (e: any) {
    throw new Error("[step: " + step + "] " + (e?.message ?? String(e)));
  }
}
