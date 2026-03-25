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

function populateCardComp(comp: CompItem, stockData: StockData, customization: Customization): CompItem {
  // Remove old layers
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
  var bg = comp.layers.addSolid([0.08, 0.08, 0.12], "Background", CARD_WIDTH, CARD_HEIGHT, 1);
  bg.moveToEnd();

  // Symbol text
  var symLayer = comp.layers.addText(stockData.symbol);
  symLayer.name = "Symbol";
  var symDoc = new TextDocument(stockData.symbol);
  symDoc.fontSize = fsPx * 0.8;
  symDoc.fillColor = [1, 1, 1];
  (symLayer.property("Source Text") as Property).setValue(symDoc);
  (symLayer.property("Position") as Property).setValue([20, 30 + fsPx * 0.6]);

  // Price text
  var priceLayer = comp.layers.addText(formatPrice(stockData.current));
  priceLayer.name = "Price";
  var priceDoc = new TextDocument(formatPrice(stockData.current));
  priceDoc.fontSize = fsPx;
  priceDoc.fillColor = [1, 1, 1];
  (priceLayer.property("Source Text") as Property).setValue(priceDoc);
  (priceLayer.property("Position") as Property).setValue([20, 30 + fsPx * 0.6 + fsPx + 8]);

  // Change % text
  var changeText = formatChange(stockData.change) + "  " + formatPercent(stockData.changePercent);
  var changeLayer = comp.layers.addText(changeText);
  changeLayer.name = "Change";
  var changeDoc = new TextDocument(changeText);
  changeDoc.fontSize = fsPx * 0.55;
  changeDoc.fillColor = changeColor;
  (changeLayer.property("Source Text") as Property).setValue(changeDoc);
  (changeLayer.property("Position") as Property).setValue([20, 30 + fsPx * 0.6 + fsPx * 2 + 14]);

  // Sparkline (right side)
  if (stockData.history && stockData.history.length >= 2) {
    var spark = buildSparkline(comp, stockData, {
      width: 120,
      height: 60,
      paddingX: 4,
      paddingY: 4,
      strokeWidth: 2,
      customization,
    });
    (spark.property("Position") as Property).setValue([CARD_WIDTH - 70, CARD_HEIGHT - 40]);
  }

  return comp;
}
