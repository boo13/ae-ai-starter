// src/jsx/builders/preset.ts
import { buildStockCard } from "./card";
import { buildComparisonChart } from "./chart";
import { scanAndPopulateTextBindings } from "./text-binder";
import type { BuildConfig, BuildResult, TickerData } from "../../shared/types";

function readTickerData(filePath: string): TickerData | null {
  var file = new File(filePath);
  if (!file.exists) return null;
  file.open("r");
  var content = file.read();
  file.close();
  try { return JSON.parse(content) as TickerData; } catch (e) { return null; }
}

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

  var folder = ensureProjectFolder("Ticker Data");
  var compsCreated: string[] = [];

  app.beginUndoGroup("Ticker Data: Build " + config.preset);

  try {
    if (config.preset === "single-card") {
      var firstStock = data.stocks[0];
      var comp = buildStockCard(firstStock, config.customization, folder);
      compsCreated.push(comp.name);

    } else if (config.preset === "multi-card") {
      for (var i = 0; i < data.stocks.length; i++) {
        var cardComp = buildStockCard(data.stocks[i], config.customization, folder);
        compsCreated.push(cardComp.name);
      }

    } else if (config.preset === "comparison") {
      if (data.stocks.length < 2) {
        return { success: false, message: "Comparison chart needs at least 2 stocks in watchlist." };
      }
      var chartComp = buildComparisonChart(data.stocks, config.customization, folder);
      compsCreated.push(chartComp.name);

    } else if (config.preset === "text-only") {
      app.endUndoGroup();
      var result = scanAndPopulateTextBindings({
        dataFilePath: config.dataFilePath,
        bindings: data.bindings ?? {},
      });
      return result;
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
