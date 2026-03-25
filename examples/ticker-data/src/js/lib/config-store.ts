// src/js/lib/config-store.ts
// Persists watchlist and bindings in CEP's localStorage.
// Data survives panel reloads but is cleared on extension reinstall.

const WATCHLIST_KEY = "td_watchlist";
const BINDINGS_KEY = "td_bindings";
const LAST_PRESET_KEY = "td_last_preset";

export function loadWatchlist(): string[] {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveWatchlist(symbols: string[]): void {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(symbols));
}

export function loadBindings(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(BINDINGS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveBindings(bindings: Record<string, string>): void {
  localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
}

export function loadLastPreset(): string {
  return localStorage.getItem(LAST_PRESET_KEY) ?? "single-card";
}

export function saveLastPreset(preset: string): void {
  localStorage.setItem(LAST_PRESET_KEY, preset);
}
