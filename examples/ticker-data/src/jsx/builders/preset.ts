// src/jsx/builders/preset.ts
import { buildStockCard } from "./card";
import { buildComparisonChart } from "./chart";
import { scanAndPopulateTextBindings } from "./text-binder";
import type { BuildConfig, BuildResult } from "../../shared/types";
import { readTickerData } from "../lib/read-ticker-data";

function ensureProjectFolder(name: string): FolderItem {
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof FolderItem && item.name === name) return item as FolderItem;
  }
  return app.project.items.addFolder(name) as FolderItem;
}

export function runPreset(config: BuildConfig): BuildResult {
  var data = readTickerData(config.dataFilePath);
  if (!data) {
    return { success: false, message: "Could not read data file: " + config.dataFilePath };
  }
  if (!data.stocks || data.stocks.length === 0) {
    return { success: false, message: "No stock data in file. Fetch data first." };
  }

  if (config.preset === "text-only") {
    var bindResult = scanAndPopulateTextBindings({
      dataFilePath: config.dataFilePath,
      bindings: data.bindings ?? {},
    });
    return { success: bindResult.success, message: bindResult.message };
  }

  if (config.preset === "comparison" && data.stocks.length < 2) {
    return { success: false, message: "Comparison chart needs at least 2 stocks in watchlist." };
  }

  var folder = ensureProjectFolder("Ticker Data");
  var compsCreated: string[] = [];

  app.beginUndoGroup("Ticker Data: Build " + config.preset);

  try {
    if (config.preset === "single-card") {
      var firstStock = data.stocks[0];
      var comp = buildStockCard(firstStock, config.customization, folder);
      compsCreated.push(comp.name);

    } else if (config.preset === "multi-card") {
      // Build individual card comps, then assemble into a grid comp
      var cards: CompItem[] = [];
      for (var mi = 0; mi < data.stocks.length; mi++) {
        cards.push(buildStockCard(data.stocks[mi], config.customization, folder));
      }

      var CARD_W = 300;
      var CARD_H = 160;
      var GAP = 20;
      var PADDING = 20;
      var COLS = data.stocks.length <= 2 ? data.stocks.length : 3;
      var ROWS = Math.ceil(data.stocks.length / COLS);
      var gridW = PADDING * 2 + COLS * CARD_W + (COLS - 1) * GAP;
      var gridH = PADDING * 2 + ROWS * CARD_H + (ROWS - 1) * GAP;

      // Re-use existing grid comp or create new
      var gridComp: CompItem | null = null;
      for (var gi = 1; gi <= app.project.numItems; gi++) {
        var gItem = app.project.item(gi);
        if (gItem instanceof CompItem && gItem.name === "TD: Multi-Card Grid") {
          while (gItem.numLayers > 0) gItem.layer(1).remove();
          gridComp = gItem as CompItem;
          break;
        }
      }
      if (!gridComp) {
        gridComp = app.project.items.addComp("TD: Multi-Card Grid", gridW, gridH, 1, 10, 30);
        if (parentFolder) (gridComp as CompItem).parentFolder = parentFolder;
      }

      for (var ci = 0; ci < cards.length; ci++) {
        var col = ci % COLS;
        var row = Math.floor(ci / COLS);
        var cardLayer = (gridComp as CompItem).layers.add(cards[ci]);
        // Nested comp layer anchor defaults to the comp's center [CARD_W/2, CARD_H/2].
        // Reset anchor to [0,0] so Position equals top-left placement.
        var cardTransform = cardLayer.property("Transform") as PropertyGroup;
        (cardTransform.property("Anchor Point") as Property).setValue([0, 0]);
        (cardTransform.property("Position") as Property).setValue([
          PADDING + col * (CARD_W + GAP),
          PADDING + row * (CARD_H + GAP),
        ]);
      }

      compsCreated.push("TD: Multi-Card Grid");

    } else if (config.preset === "comparison") {
      var chartComp = buildComparisonChart(data.stocks, config.customization, folder);
      compsCreated.push(chartComp.name);
    }

    app.endUndoGroup();
    return {
      success: true,
      message: "Built " + compsCreated.length + " comp(s): " + compsCreated.join(", "),
      compsCreated,
    };
  } catch (e: any) {
    app.endUndoGroup();
    return { success: false, message: "Build failed: " + (e?.message ?? String(e)) };
  }
}
