// src/js/lib/config-store.ts
// Persists watchlist and bindings in CEP's localStorage.
// Data survives panel reloads but is cleared on extension reinstall.

import type { Preset } from "@shared/types";

const WATCHLIST_KEY = "td_watchlist";
const BINDINGS_KEY = "td_bindings";
const LAST_PRESET_KEY = "td_last_preset";

const VALID_PRESETS: Preset[] = ["single-card", "multi-card", "comparison", "text-only"];

export function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveWatchlist(symbols: string[]): void {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(symbols));
}

export function loadBindings(): Record<string, string> {
  try {
    const raw = localStorage.getItem(BINDINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

export function saveBindings(bindings: Record<string, string>): void {
  localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
}

export function loadLastPreset(): Preset {
  const raw = localStorage.getItem(LAST_PRESET_KEY) ?? "single-card";
  return VALID_PRESETS.includes(raw as Preset) ? (raw as Preset) : "single-card";
}

export function saveLastPreset(preset: string): void {
  localStorage.setItem(LAST_PRESET_KEY, preset);
}
