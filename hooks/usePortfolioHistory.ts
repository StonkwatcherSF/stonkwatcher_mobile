import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { equityStorageKey } from "../lib/demo-account";
import { recordEquity, type EquityPoint } from "../lib/portfolio-equity";

export function usePortfolioHistory(total: number, ready: boolean, accountId: string) {
  const [history, setHistory] = useState<EquityPoint[]>([]);
  const saved = useRef<EquityPoint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const writes = useRef(Promise.resolve());
  const key = equityStorageKey(accountId || "anonymous");

  useEffect(() => {
    let canceled = false;
    setLoaded(false);
    saved.current = [];
    setHistory([]);
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (canceled) return;
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        saved.current = Array.isArray(parsed)
          ? parsed.filter(
              (row): row is EquityPoint =>
                Boolean(row && Number.isFinite((row as EquityPoint).time) && Number.isFinite((row as EquityPoint).value)),
            )
          : [];
        setHistory(saved.current);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!canceled) setLoaded(true);
      });
    return () => {
      canceled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!ready || !loaded) return;
    const record = () => {
      if (AppState.currentState !== "active") return;
      const next = recordEquity(saved.current, total, Date.now());
      saved.current = next;
      setHistory(next);
      // Serialize disk writes so a delayed older sample cannot overwrite a newer trade.
      writes.current = writes.current
        .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
        .catch(() => undefined);
    };
    const initial = setTimeout(record, 0);
    // Record flat observations too, so an unchanged balance produces an honest flat line.
    const timer = setInterval(record, 10_000);
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") record();
    });
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      subscription.remove();
    };
  }, [total, ready, loaded, key]);

  return { history, historyReady: loaded && ready };
}
