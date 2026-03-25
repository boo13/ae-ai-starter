export interface PriceBar {
  date: string;       // "2026-03-01"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockData {
  symbol: string;
  name: string;
  current: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  high52w: number;
  low52w: number;
  regularMarketTime: string;  // ISO string
  marketState: "REGULAR" | "PRE" | "POST" | "CLOSED";
  history: PriceBar[];
}

export interface TickerData {
  fetchedAt: string;
  bindings: Record<string, string>;   // { "STOCK": "AAPL" }
  stocks: StockData[];
}

export type Period = "7d" | "30d" | "90d" | "1y";
export type Preset = "single-card" | "multi-card" | "comparison" | "text-only";
export type ColorScheme = "default" | "monochrome";
export type FontSize = "small" | "medium" | "large";
export type SparklineAnimation = "none" | "draw-on";

export interface Customization {
  period: Period;
  colorScheme: ColorScheme;
  fontSize: FontSize;
  sparklineAnimation: SparklineAnimation;
}

export interface BuildConfig {
  preset: Preset;
  dataFilePath: string;
  customization: Customization;
}

export interface TextBindConfig {
  dataFilePath: string;
  bindings: Record<string, string>;
}

export interface BuildResult {
  success: boolean;
  message: string;
  compsCreated?: string[];
}

export interface BindResult {
  success: boolean;
  message: string;
  layersUpdated?: number;
}

export interface LogEntry {
  timestamp: number;
  level: "info" | "success" | "error";
  message: string;
}

export type PanelStatus = "idle" | "fetching" | "building" | "error";
