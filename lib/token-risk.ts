import { ApiError } from "./api";
import { fetchTracerSnapshot } from "./tracer-snapshot";
import { fetchBubbleMap } from "./stonk";
import { scoreWithMapClusters } from "./risk-score";
import type { BubbleMapData, TracerPayload } from "./types";

const TTL = 5 * 60_000;
const MAX_CONCURRENT = 4;
const cache = new Map<string, { score: number | null; at: number }>();
const listeners = new Map<string, Set<() => void>>();
const queued = new Set<string>();
const pending = new Set<string>();
let running = 0;

// Shared with the tracer: holder-map calculation first, then its stored score.
export function tracerRiskScore(payload: TracerPayload | null, bubble?: BubbleMapData | null) {
  const token = payload?.mode === "token" ? payload.token : null;
  const map = bubble ?? (token?.bubbleMap?.edition === "v2" ? token.bubbleMap : null);
  const live = token?.mint && map?.nodes?.length
    ? scoreWithMapClusters({ mint: token.mint, signals: token.brief.signals ?? [], map: { ...map, edition: map.edition ?? "v2" } })
    : null;
  const score = live?.score ?? token?.brief.score ?? map?.intel?.score ?? null;
  return typeof score === "number" && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
}

export function readTokenRisk(mint: string) {
  return cache.get(mint)?.score ?? null;
}

export function publishTokenRisk(mint: string, score: number | null) {
  const previous = readTokenRisk(mint);
  cache.delete(mint);
  cache.set(mint, { score, at: Date.now() });
  // Keep only a small session cache, preserving actively displayed tokens.
  if (cache.size > 300) {
    for (const key of cache.keys()) {
      if (!listeners.has(key)) cache.delete(key);
      if (cache.size <= 300) break;
    }
  }
  if (previous !== score) listeners.get(mint)?.forEach((notify) => notify());
}

async function load(mint: string, onStoredScore: (score: number) => void) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    // No live-market overlays, analysis jobs, or polling for a small avatar badge.
    const payloadRequest = fetchTracerSnapshot(mint).then((payload) => {
      if (payload.mode === "token" && payload.token?.mint === mint) {
        const score = tracerRiskScore(payload);
        if (score !== null) onStoredScore(score);
      }
      return payload;
    }).catch((error: unknown) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
      throw error;
    });
    const [payload, bubble] = await Promise.all([
      payloadRequest,
      fetchBubbleMap(mint, controller.signal).catch(() => null),
    ]);
    if (payload && (payload.mode !== "token" || payload.token?.mint !== mint)) return null;
    // Public tracer fallback also uses holder-map signals when no private brief is available.
    if (!payload && bubble?.bubbleMap?.nodes?.length) {
      return scoreWithMapClusters({ mint, signals: [], map: { ...bubble.bubbleMap, edition: bubble.bubbleMap.edition ?? "v2" } })?.score ?? bubble.bubbleMap.intel?.score ?? null;
    }
    return tracerRiskScore(payload, bubble?.bubbleMap);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

function drain() {
  for (const mint of queued) {
    if (running >= MAX_CONCURRENT) break;
    queued.delete(mint);
    if (!listeners.has(mint)) continue;
    pending.add(mint);
    running += 1;
    let ownCache = cache.get(mint);
    const publish = (score: number | null) => {
      // A freshly opened tracer can publish a newer result while this request runs.
      if (cache.get(mint) === ownCache) {
        publishTokenRisk(mint, score);
        ownCache = cache.get(mint);
      }
    };
    void load(mint, publish).then(publish).catch(() => {
      if (!cache.has(mint)) publishTokenRisk(mint, null);
    }).finally(() => {
      pending.delete(mint);
      running -= 1;
      drain();
    });
  }
}

export function subscribeTokenRisk(mint: string, notify: () => void) {
  const group = listeners.get(mint) ?? new Set<() => void>();
  listeners.set(mint, group);
  group.add(notify);
  const cached = cache.get(mint);
  if ((!cached || Date.now() - cached.at > TTL) && !pending.has(mint)) queued.add(mint);
  // Batch subscriptions from this render, without an artificial reveal delay.
  const timer = setTimeout(drain, 0);
  return () => {
    clearTimeout(timer);
    group.delete(notify);
    if (!group.size) {
      listeners.delete(mint);
      queued.delete(mint);
    }
  };
}
