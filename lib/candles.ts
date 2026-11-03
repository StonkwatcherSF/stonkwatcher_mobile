import type { OhlcvCandle } from "./types";

/** Normalize provider timestamps and OHLC ranges without inventing missing bars. */
export function normalizeCandles(rows: OhlcvCandle[], step?: number): OhlcvCandle[] {
  const sorted = rows.map((row) => ({ ...row, time: Math.floor(row.time > 1e12 ? row.time / 1000 : row.time) }))
    .filter((row) => Number.isFinite(row.time) && row.time > 0 && Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => a.time - b.time);
  const unique = new Map<number, OhlcvCandle>();
  for (const row of sorted) {
    const open = Number.isFinite(row.open) && row.open > 0 ? row.open : row.close;
    unique.set(row.time, {
      time: row.time, open, close: row.close,
      high: Math.max(Number.isFinite(row.high) ? row.high : row.close, open, row.close),
      low: Math.min(Number.isFinite(row.low) && row.low > 0 ? row.low : row.close, open, row.close),
      volume: Number.isFinite(row.volume) && row.volume > 0 ? row.volume : 0,
    });
  }
  if (!step) return [...unique.values()];
  const buckets = new Map<number, OhlcvCandle>();
  for (const row of unique.values()) {
    const time = Math.floor(row.time / step) * step;
    const current = buckets.get(time);
    if (!current) buckets.set(time, { ...row, time });
    else {
      current.high = Math.max(current.high, row.high);
      current.low = Math.min(current.low, row.low);
      current.close = row.close;
      current.volume += row.volume;
    }
  }
  return [...buckets.values()];
}
