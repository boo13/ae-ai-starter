import { evalTS } from "./utils/bolt";
import type { TickerData } from "@shared/types";
import { debugLog } from "./debug-log";

// CEP always has Node.js available via require()
const fs = require("fs") as typeof import("fs");
const path = require("path") as typeof import("path");

const CACHE_STALE_HOURS = 24;

export function getDataFilePath(projectRoot: string): string {
  const filePath = path.join(projectRoot, "Input", "ticker_data.json");
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(projectRoot))) {
    throw new Error("Path traversal detected in project root");
  }
  return filePath;
}

export async function getProjectRoot(): Promise<string> {
  const root = await evalTS("getProjectRoot");
  return root ?? "";
}

export async function writeTickerData(
  data: TickerData,
  projectRoot: string
): Promise<string> {
  if (!projectRoot) {
    throw new Error("Save your AE project first — needed to determine data file path.");
  }
  const filePath = getDataFilePath(projectRoot);
  const resolved = path.resolve(filePath);
  debugLog("INFO", "writeTickerData: path:", filePath, "resolved:", resolved);
  const inputDir = path.dirname(filePath);
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  if (!fs.existsSync(filePath)) {
    throw new Error("File not found after write: " + filePath);
  }
  debugLog("INFO", "writeTickerData: wrote", fs.statSync(filePath).size, "bytes");
  return filePath;
}

export function readCachedData(projectRoot: string): TickerData | null {
  if (!projectRoot) return null;
  const filePath = getDataFilePath(projectRoot);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as TickerData;
    }
  } catch {
    return null;
  }
  return null;
}

export function isCacheStale(data: TickerData | null): boolean {
  if (!data?.fetchedAt) return true;
  const fetchedAt = new Date(data.fetchedAt).getTime();
  const hoursOld = (Date.now() - fetchedAt) / (1000 * 60 * 60);
  return hoursOld > CACHE_STALE_HOURS;
}
