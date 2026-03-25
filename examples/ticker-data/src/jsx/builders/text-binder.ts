// src/jsx/builders/text-binder.ts
import { formatPrice, formatPercent, formatChange, formatVolume, formatMarketCap, formatDate } from "../lib/format";
import type { TextBindConfig, StockData } from "../../shared/types";
import { readTickerData } from "../lib/read-ticker-data";

function resolveField(stockData: StockData, field: string): string {
  switch (field) {
    case "price": return formatPrice(stockData.current);
    case "change": return formatChange(stockData.change);
    case "changePercent": return formatPercent(stockData.changePercent);
    case "name": return stockData.name ?? "";
    case "symbol": return stockData.symbol ?? "";
    case "volume": return formatVolume(stockData.volume);
    case "marketCap": return formatMarketCap(stockData.marketCap);
    case "high52w": return formatPrice(stockData.high52w);
    case "low52w": return formatPrice(stockData.low52w);
    case "fetchedAt": return formatDate(stockData.regularMarketTime ?? "");
    default: return "";
  }
}

// Pattern: {PLACEHOLDER.field}
var BINDING_PATTERN = /\{([A-Z0-9_]+)\.([a-z0-9A-Z]+)\}/g;

export function scanAndPopulateTextBindings(config: TextBindConfig): { success: boolean; message: string; layersUpdated: number } {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) {
    return { success: false, message: "No active composition. Select a comp first.", layersUpdated: 0 };
  }

  var data = readTickerData(config.dataFilePath);
  if (!data) {
    return { success: false, message: "Could not read data file: " + config.dataFilePath, layersUpdated: 0 };
  }

  // Build lookup: symbol → stockData
  var stockMap: Record<string, StockData> = {};
  for (var i = 0; i < data.stocks.length; i++) {
    stockMap[data.stocks[i].symbol] = data.stocks[i];
  }

  var layersUpdated = 0;

  app.beginUndoGroup("Ticker Data: Update Text Bindings");

  try {
    for (var li = 1; li <= comp.numLayers; li++) {
      var layer = comp.layer(li);
      if (!(layer instanceof TextLayer)) continue;

      var textProp = layer.property("Source Text") as TextDocument & { value: TextDocument };
      if (!textProp) continue;

      var srcText: string;
      try {
        srcText = String((textProp as any).value.text);
      } catch (e) {
        continue;
      }

      var newText = srcText;
      var match: RegExpExecArray | null;
      BINDING_PATTERN.lastIndex = 0;

      while ((match = BINDING_PATTERN.exec(srcText)) !== null) {
        var placeholder = match[1];  // e.g. "STOCK"
        var field = match[2];         // e.g. "price"

        // Resolve placeholder to real ticker via bindings
        var ticker = config.bindings[placeholder];
        if (!ticker) continue;

        var stockData = stockMap[ticker];
        if (!stockData) continue;

        var resolved = resolveField(stockData, field);
        newText = newText.replace(match[0], resolved);
      }

      if (newText !== srcText) {
        try {
          (layer.property("Source Text") as any).setValue(newText);
          layersUpdated++;
        } catch (e) {
          // Layer may be locked or have expressions — skip
        }
      }
    }
  } finally {
    app.endUndoGroup();
  }

  return {
    success: true,
    message: "Updated " + layersUpdated + " text layer(s)",
    layersUpdated,
  };
}
