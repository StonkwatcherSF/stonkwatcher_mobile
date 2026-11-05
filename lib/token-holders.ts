import { apiGet } from "./api";
import { fetchTracerSnapshot } from "./tracer-snapshot";
import { fetchPublicTokenInfo } from "./token-info";
import type { MarketQuote } from "./types";

const cache = new Map<string, { at: number; count: number | null }>();
const pending = new Map<string, Promise<number | null>>();

function validCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

async function load(mint: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const [market, payload] = await Promise.all([
      apiGet<MarketQuote>("/api/dex/market", { mint }, controller.signal).catch(() => null),
      fetchTracerSnapshot(mint).catch(() => null),
    ]);
    const brief = payload?.mode === "token" && payload.token?.mint === mint ? payload.token.brief : null;
    // Match the tracer's Total Holders priority, including a legitimate zero.
    const count = validCount(market?.holders) ?? validCount(brief?.holderCount);
    if (count !== null) return count;
    const info = await fetchPublicTokenInfo(mint).catch(() => null);
    return validCount(info?.rewards?.holders);
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchTokenHolders(mint: string): Promise<number | null> {
  const cached = cache.get(mint);
  if (cached && Date.now() - cached.at < 60_000) return Promise.resolve(cached.count);
  const existing = pending.get(mint);
  if (existing) return existing;
  const request = load(mint).then((count) => {
    cache.delete(mint);
    cache.set(mint, { at: Date.now(), count });
    if (cache.size > 100) cache.delete(cache.keys().next().value!);
    return count;
  }).finally(() => pending.delete(mint));
  pending.set(mint, request);
  return request;
}
