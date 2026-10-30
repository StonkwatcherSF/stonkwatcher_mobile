import { useEffect, useState } from "react";
import { fetchBubbleMap, fetchTracer, queueAnalyze } from "../lib/stonk";
import { isSolanaAddress } from "../lib/solana";
import type { BubbleMapData, TracerPayload } from "../lib/types";

const POLL_MS = 3000;
const POLL_TRIES = 16;

export function useTracer(address?: string) {
  const [data, setData] = useState<TracerPayload | null>(null);
  const [bubbleMap, setBubbleMap] = useState<BubbleMapData | null>(null);
  const valid = Boolean(address && isSolanaAddress(address));
  const [loading, setLoading] = useState(valid);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !isSolanaAddress(address)) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load(fresh = false) {
      const payload = await fetchTracer(address!, fresh);
      if (cancelled) return payload;
      setData(payload);
      setError(null);
      return payload;
    }

    async function loadBubble(mint: string) {
      try {
        const body = await fetchBubbleMap(mint);
        if (!cancelled) setBubbleMap(body.bubbleMap ?? null);
      } catch {
        if (!cancelled) setBubbleMap(null);
      }
    }

    async function run() {
      setLoading(true);
      setAnalyzing(false);
      try {
        let payload = await load();
        if (cancelled || !payload) return;
        if (payload.mode === "token" && payload.token?.mint) {
          void loadBubble(payload.token.mint);
          if (payload.token.brief.score == null) {
            setAnalyzing(true);
            const queued = await queueAnalyze(payload.token.mint).then(() => true).catch(() => false);
            if (!queued) {
              setAnalyzing(false);
              return;
            }
            for (let i = 0; i < POLL_TRIES; i += 1) {
              await new Promise((resolve) => {
                timer = setTimeout(resolve, POLL_MS);
              });
              if (cancelled) return;
              payload = await load(true);
              if (payload?.token?.brief.score != null) break;
            }
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load tracer profile");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAnalyzing(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [address]);

  return {
    data,
    bubbleMap,
    loading: valid && loading,
    analyzing,
    error: valid ? error : address ? "Enter a valid Solana address" : null,
  };
}
