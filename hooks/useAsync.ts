import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useAsync<T>(
  factory: () => Promise<T>,
  deps: unknown[],
  enabled = true,
  intervalMs = 0,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let generation = 0;

    const load = (showLoading: boolean) => {
      const run = ++generation;
      if (showLoading) {
        void Promise.resolve().then(() => {
          if (!cancelled && run === generation) setLoading(true);
        });
      }
      factory()
        .then((result) => {
          if (cancelled || run !== generation) return;
          setData(result);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled || run !== generation) return;
          setError(err instanceof Error ? err.message : "Could not load data");
        })
        .finally(() => {
          if (cancelled || run !== generation) return;
          setLoading(false);
          if (intervalMs > 0) {
            timer = setTimeout(() => {
              if (cancelled) return;
              if (AppState.currentState !== "active") {
                timer = setTimeout(() => load(false), intervalMs);
                return;
              }
              load(false);
            }, intervalMs);
          }
        });
    };

    load(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, intervalMs]);

  return { data, loading: enabled && loading, error };
}
