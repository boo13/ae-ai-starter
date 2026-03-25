import yahooFinance from "yahoo-finance2";
import type { StockData, PriceBar, Period } from "@shared/types";

// Suppress yahoo-finance2 validation noise in CEP console
yahooFinance.setGlobalConfig({
  validation: { logErrors: false, logOptionsErrors: false },
  queue: { concurrency: 2, timeout: 15000 },
});

function periodToDateRange(period: Period): { period1: Date; period2: Date } {
  const now = new Date();
  const daysMap: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  const start = new Date(now.getTime() - daysMap[period] * 24 * 60 * 60 * 1000);
  return { period1: start, period2: now };
}

export async function fetchHistorical(symbol: string, period: Period): Promise<PriceBar[]> {
  const { period1, period2 } = periodToDateRange(period);
  const history = await yahooFinance.historical(symbol, { period1, period2, interval: "1d" });
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
      const quote = await yahooFinance.quote(symbol);
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
        marketState: (quote.marketState as StockData["marketState"]) ?? "CLOSED",
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
    const e = new Error(`Failed to fetch: ${errors.join("; ")}`);
    (e as any).partialResults = stocks;
    (e as any).errors = errors;
    throw e;
  }

  return stocks;
}

export async function searchTickers(query: string): Promise<{ symbol: string; name: string }[]> {
  if (query.length < 2) return [];
  try {
    const result = await yahooFinance.search(query);
    return (result.quotes ?? [])
      .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .slice(0, 8)
      .map((q: any) => ({ symbol: q.symbol ?? "", name: q.shortname ?? q.longname ?? q.symbol ?? "" }));
  } catch {
    return [];
  }
}
