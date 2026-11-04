import { apiGet } from "./api";
import type { TracerPayload } from "./types";

const cache = new Map<string, { at: number; payload: TracerPayload }>();
const pending = new Map<string, Promise<TracerPayload>>();

// Share the lightweight brief between avatar risk badges and holder counts.
export function fetchTracerSnapshot(mint: string): Promise<TracerPayload> {
  const cached = cache.get(mint);
  if (cached && Date.now() - cached.at < 60_000) return Promise.resolve(cached.payload);
  const existing = pending.get(mint);
  if (existing) return existing;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const request = apiGet<TracerPayload>(`/api/tracer/${encodeURIComponent(mint)}`, undefined, controller.signal)
    .then((payload) => {
      cache.delete(mint);
      cache.set(mint, { at: Date.now(), payload });
      if (cache.size > 100) cache.delete(cache.keys().next().value!);
      return payload;
    })
    .finally(() => {
      clearTimeout(timeout);
      pending.delete(mint);
    });
  pending.set(mint, request);
  return request;
}
