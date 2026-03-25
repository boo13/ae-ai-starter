// src/jsx/lib/read-ticker-data.ts
import type { TickerData } from "../../shared/types";

export var readTickerData = function(filePath: string): TickerData | null {
  var file = new File(filePath);
  if (!file.exists) return null;
  if (!file.open("r")) return null;
  var content = file.read();
  file.close();
  if (!content) return null;
  try {
    return JSON.parse(content) as TickerData;
  } catch (e) {
    return null;
  }
};
