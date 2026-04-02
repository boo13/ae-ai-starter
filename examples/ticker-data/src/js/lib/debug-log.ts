// Debug logger — writes to {extension_dir}/ticker_debug.log initially,
// then switches to {projectRoot}/ticker_debug.log once the AE project is known.
// Helps diagnose CEP runtime issues without needing Chrome DevTools.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _fs: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _path: any = null;

// Set by setLogProjectRoot() once AE project path is resolved
let _projectLogPath: string | null = null;

function getLogPath(): string | null {
  if (_projectLogPath) return _projectLogPath;
  try {
    if (!_fs) _fs = require("fs");
    if (!_path) _path = require("path");
    // Use the CEP extension directory — always available and writable in CEP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extPath = decodeURI((window as any).__adobe_cep__.getSystemPath("extension"));
    return _path.join(extPath, "ticker_debug.log");
  } catch {
    return null;
  }
}

/** Call once projectRoot is resolved so logs land next to the .aep file. */
export function setLogProjectRoot(projectRoot: string): void {
  if (!projectRoot) return;
  try {
    if (!_path) _path = require("path");
    _projectLogPath = _path.join(projectRoot, "ticker_debug.log");
  } catch {
    // ignore — file logging will continue using the extension directory fallback
  }
}

export function debugLog(level: "INFO" | "ERROR" | "WARN", ...args: unknown[]): void {
  const msg = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  if (level === "ERROR") {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }
  const logPath = getLogPath();
  if (logPath && _fs) {
    try {
      _fs.appendFileSync(logPath, line);
    } catch {
      // If file write fails, silently ignore — don't break the panel
    }
  }
}

export function clearDebugLog(): void {
  const logPath = getLogPath();
  if (logPath && _fs) {
    try {
      _fs.writeFileSync(logPath, `=== ticker-data debug log started ${new Date().toISOString()} ===\n`);
    } catch { /* ignore */ }
  }
}
