import { fetchOhlcv } from "./stonk";
import type { OhlcvCandle } from "./types";

const cache = new Map<string, { candles: OhlcvCandle[]; at: number }>();
const listeners = new Map<string, Set<() => void>>();
const queue = new Map<string, number | undefined>();
const pending = new Set<string>();
let running = 0;
const EMPTY: OhlcvCandle[] = [];

export function readSearchChart(mint: string) {
  return cache.get(mint)?.candles;
}

function drain() {
  for (const [mint, spot] of queue) {
    if (running >= 3) break;
    queue.delete(mint);
    if (!listeners.has(mint)) continue;
    pending.add(mint);
    running += 1;
    // Same 1-minute history provider as the default DEX chart; no per-row polling.
    void fetchOhlcv(mint, "1m", spot).then((body) => {
      cache.delete(mint);
      cache.set(mint, { candles: body.candles ?? EMPTY, at: Date.now() });
      if (cache.size > 100) {
        for (const key of cache.keys()) {
          if (!listeners.has(key)) cache.delete(key);
          if (cache.size <= 100) break;
        }
      }
      listeners.get(mint)?.forEach((notify) => notify());
    }).catch(() => {
      // Cache unavailable history briefly instead of retrying each duplicate row.
      if (!cache.has(mint)) cache.set(mint, { candles: EMPTY, at: Date.now() });
      listeners.get(mint)?.forEach((notify) => notify());
    }).finally(() => {
      pending.delete(mint);
      running -= 1;
      drain();
    });
  }
}

export function subscribeSearchChart(mint: string, spot: number | undefined, notify: () => void) {
  const group = listeners.get(mint) ?? new Set<() => void>();
  group.add(notify);
  listeners.set(mint, group);
  if (Date.now() - (cache.get(mint)?.at ?? 0) > 30_000 && !pending.has(mint)) queue.set(mint, spot);
  const timer = setTimeout(drain, 0);
  return () => {
    clearTimeout(timer);
    group.delete(notify);
    if (!group.size) {
      listeners.delete(mint);
      queue.delete(mint);
    }
  };
}

export function sparklineData(candles: OhlcvCandle[]) {
  const rows = candles.filter((row) => Number.isFinite(row.time) && Number.isFinite(row.close) && row.close > 0)
    .slice().sort((a, b) => a.time - b.time).slice(-60);
  if (rows.length < 2) return null;
  const min = Math.min(...rows.map((row) => row.close));
  const max = Math.max(...rows.map((row) => row.close));
  const span = rows[rows.length - 1].time - rows[0].time;
  if (span <= 0) return null;
  return {
    points: rows.map((row) => {
      const x = 2 + (row.time - rows[0].time) / span * 50;
      const y = max === min ? 23.5 : 43 - (row.close - min) / (max - min) * 39;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" "),
    positive: rows[rows.length - 1].close >= rows[0].close,
  };
}
