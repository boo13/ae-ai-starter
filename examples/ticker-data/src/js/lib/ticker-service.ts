import type { StockData, PriceBar, Period } from "@shared/types";
import { debugLog } from "./debug-log";

export class PartialFetchError extends Error {
  constructor(
    message: string,
    public readonly partialResults: StockData[],
    public readonly errors: string[]
  ) {
    super(message);
    this.name = "PartialFetchError";
  }
}

// Lazy-load yahoo-finance2 so a missing/incompatible module doesn't crash the
// panel at startup — the error surfaces only when the user clicks Fetch.
// Using any because the runtime require bypasses TypeScript's module system.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _yf: any = null;

// Build a fetch-compatible function backed by Node.js https/http.
// CEP's browser fetch blocks Set-Cookie response headers (forbidden header
// names per browser security rules), which breaks yahoo-finance2 v3's
// cookie/crumb authentication flow. Node.js has no such restriction.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeNodeFetch(): (url: string, opts?: any) => Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const http = require("http");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const https = require("https");
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { URL } = require("url");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeHeaders(raw: Record<string, string | string[]>, setCookies: string[]): any {
    return {
      get(name: string) {
        const key = name.toLowerCase();
        if (key === "set-cookie") return setCookies.join(", ") || null;
        const val = raw[key];
        if (val == null) return null;
        return Array.isArray(val) ? val.join(", ") : val;
      },
      getSetCookie() { return setCookies; },
      has(name: string) { return raw[name.toLowerCase()] != null; },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      forEach(cb: (v: string, k: string) => void) {
        for (const key in raw) {
          const val = raw[key];
          cb(Array.isArray(val) ? val.join(", ") : val, key);
        }
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function nodeFetch(url: string, opts: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      let parsedUrl: URL;
      try { parsedUrl = new URL(url); } catch (e) { reject(e); return; }
      const lib = parsedUrl.protocol === "https:" ? https : http;
      const reqOpts = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: opts.method ?? "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          ...(opts.headers ?? {}),
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const req = lib.request(reqOpts, (res: any) => {
        const rawCookies: string[] = Array.isArray(res.headers["set-cookie"])
          ? res.headers["set-cookie"]
          : res.headers["set-cookie"] ? [res.headers["set-cookie"]] : [];

        // Manual redirect — return the response as-is so the caller can read Location
        if (opts.redirect === "manual" && res.statusCode >= 300 && res.statusCode < 400) {
          resolve({
            status: res.statusCode, ok: false, url, redirected: false,
            headers: makeHeaders(res.headers, rawCookies),
            text: () => Promise.resolve(""),
            json: () => Promise.resolve(null),
          });
          res.destroy();
          return;
        }

        // Auto-follow redirects (default behaviour)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location, url).toString();
          res.destroy();
          resolve(nodeFetch(next, opts));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: res.statusCode,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            url,
            redirected: false,
            headers: makeHeaders(res.headers, rawCookies),
            text: () => Promise.resolve(body),
            json: () => { try { return Promise.resolve(JSON.parse(body)); } catch (e) { return Promise.reject(e); } },
          });
        });
        res.on("error", reject);
      });
      req.on("error", reject);
      if (opts.body) req.write(opts.body);
      req.end();
    });
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getYF(): any {
  if (!_yf) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("yahoo-finance2");
    // v3 requires instantiation; v2 was a plain default export object
    const YF = mod.default ?? mod;
    // Pass Node.js-based fetch so Set-Cookie headers are visible (browser fetch
    // blocks them as forbidden response headers, breaking the crumb flow)
    const nodeFetch = makeNodeFetch();
    _yf = typeof YF === "function" ? new YF({ fetch: nodeFetch, suppressNotices: ["yahooSurvey"] }) : YF;
    debugLog("INFO", "yahoo-finance2 loaded, quote:", typeof _yf.quote);
  }
  return _yf;
}

function periodToDateRange(period: Period): { period1: Date; period2: Date } {
  const now = new Date();
  const daysMap: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  const start = new Date(now.getTime() - daysMap[period] * 24 * 60 * 60 * 1000);
  return { period1: start, period2: now };
}

const VALID_MARKET_STATES = ["REGULAR", "PRE", "POST", "CLOSED"] as const;
function toMarketState(raw: string | undefined): StockData["marketState"] {
  return (VALID_MARKET_STATES as readonly string[]).includes(raw ?? "")
    ? (raw as StockData["marketState"])
    : "CLOSED";
}

export async function fetchHistorical(symbol: string, period: Period): Promise<PriceBar[]> {
  const { period1, period2 } = periodToDateRange(period);
  const history = await getYF().historical(symbol, { period1, period2, interval: "1d" });
  return history.map((h) => ({
    date: h.date.toISOString().slice(0, 10),
    open: h.open ?? 0,
    high: h.high ?? 0,
    low: h.low ?? 0,
    close: h.close ?? 0,
    volume: h.volume ?? 0,
  }));
}

export async function fetchQuotes(symbols: string[], period: Period = "30d"): Promise<StockData[]> {
  const results = await Promise.allSettled(
    symbols.map(async (symbol): Promise<StockData> => {
      const quote = await getYF().quote(symbol);
      const bars = await fetchHistorical(symbol, period);

      return {
        symbol: quote.symbol ?? symbol,
        name: quote.longName ?? quote.shortName ?? symbol,
        current: quote.regularMarketPrice ?? 0,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
        volume: quote.regularMarketVolume ?? 0,
        marketCap: quote.marketCap ?? 0,
        high52w: quote.fiftyTwoWeekHigh ?? 0,
        low52w: quote.fiftyTwoWeekLow ?? 0,
        regularMarketTime: quote.regularMarketTime?.toISOString() ?? new Date().toISOString(),
        marketState: toMarketState(quote.marketState),
        history: bars,
      };
    })
  );

  const stocks: StockData[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      stocks.push(r.value);
    } else {
      errors.push(`${symbols[i]}: ${r.reason?.message ?? "unknown error"}`);
    }
  });

  if (errors.length > 0) {
    // Partial success — throw with details so UI can report per-ticker failure
    throw new PartialFetchError(`Failed to fetch: ${errors.join("; ")}`, stocks, errors);
  }

  return stocks;
}

export async function searchTickers(query: string): Promise<{ symbol: string; name: string }[]> {
  if (query.length < 2) return [];
  try {
    const result = await getYF().search(query);
    return (result.quotes ?? [])
      .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .slice(0, 8)
      .map((q: any) => ({ symbol: q.symbol ?? "", name: q.shortname ?? q.longname ?? q.symbol ?? "" }));
  } catch {
    return [];
  }
}
