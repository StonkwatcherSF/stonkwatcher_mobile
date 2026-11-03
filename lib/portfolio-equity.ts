export type EquityPoint = { time: number; value: number };
export type EquityPeriod = "24h" | "1w" | "1m" | "1y";
const DAY = 86_400_000;
const WINDOWS: Record<EquityPeriod, number> = { "24h": DAY, "1w": 7 * DAY, "1m": 30 * DAY, "1y": 365 * DAY };

export function recordEquity(history: EquityPoint[], value: number, now: number): EquityPoint[] {
  if (!Number.isFinite(value) || !Number.isFinite(now)) return history;
  const rows = [...history, { time: now, value }].filter((row) =>
    Number.isFinite(row.time) && Number.isFinite(row.value) && row.time >= now - WINDOWS["1y"] && row.time <= now,
  ).sort((a, b) => a.time - b.time);
  const buckets = new Map<string, EquityPoint>();
  // Minute observations for a day, hourly for a month, daily for a year.
  for (const row of rows) {
    const age = now - row.time;
    const step = age <= DAY ? 60_000 : age <= 30 * DAY ? 3_600_000 : DAY;
    buckets.set(`${step}:${Math.floor(row.time / step)}`, row);
  }
  const points = [...buckets.values()];
  // Preserve the very first real observation even when the live point shares its bucket.
  if (rows[0] && points[0]?.time !== rows[0].time) points.unshift(rows[0]);
  return points;
}

export function equityRange(history: EquityPoint[], total: number, period: EquityPeriod, now: number) {
  const rows = history.filter((row) => Number.isFinite(row.value) && row.time >= now - WINDOWS[period] && row.time < now)
    .sort((a, b) => a.time - b.time);
  rows.push({ time: now, value: total });
  return { points: rows, change: total - (rows[0]?.value ?? total) };
}

export function equityPath(points: EquityPoint[]) {
  if (!points.length) return null;
  // Keep the path small while retaining each bucket's real high/low observations.
  const sampled: EquityPoint[] = [];
  const size = Math.max(1, Math.ceil(points.length / 100));
  for (let i = 0; i < points.length; i += size) {
    const bucket = points.slice(i, i + size);
    const min = bucket.reduce((a, b) => a.value <= b.value ? a : b);
    const max = bucket.reduce((a, b) => a.value >= b.value ? a : b);
    for (const point of [bucket[0], min, max, bucket[bucket.length - 1]].sort((a, b) => a.time - b.time)) {
      if (sampled.at(-1)?.time !== point.time) sampled.push(point);
    }
  }
  const min = Math.min(...sampled.map((p) => p.value));
  const max = Math.max(...sampled.map((p) => p.value));
  const padding = Math.max((max - min) * 0.12, Math.abs(max) * 0.00001, 0.01);
  const span = sampled.at(-1)!.time - sampled[0].time;
  const xy = sampled.map((p) => ({
    x: span > 0 ? 8 + (p.time - sampled[0].time) / span * 324 : 332,
    y: 198 - (p.value - min + padding) / (max - min + padding * 2) * 176,
  }));
  let line = `M ${xy[0].x} ${xy[0].y}`;
  for (let i = 1; i < xy.length; i++) {
    const a = xy[i - 1], b = xy[i];
    const mid = (a.x + b.x) / 2;
    // Horizontal cubic handles keep the curve within the real segment's value range.
    line += ` C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
  }
  const tip = xy.at(-1)!;
  return { line, fill: `${line} L ${tip.x} 220 L ${xy[0].x} 220 Z`, tip };
}
