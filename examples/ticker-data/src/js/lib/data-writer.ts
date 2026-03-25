import { evalTS } from "./utils/bolt";
import type { TickerData } from "@shared/types";

// CEP's Node.js fs — accessed via require() in mixed context
declare const window: any;
const fs: typeof import("fs") = typeof window.cep !== "undefined" ? require("fs") : ({} as any);
const path: typeof import("path") = typeof window.cep !== "undefined" ? require("path") : ({} as any);

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
  const inputDir = path.join(projectRoot, "Input");
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
  }
  const filePath = path.join(inputDir, "ticker_data.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

export function readCachedData(projectRoot: string): TickerData | null {
  if (!projectRoot) return null;
  const filePath = path.join(projectRoot, "Input", "ticker_data.json");
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
  return hoursOld > 24;
}
