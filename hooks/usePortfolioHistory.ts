import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { MOCK_PORTFOLIO_KEY } from "../lib/config";
import { recordEquity, type EquityPoint } from "../lib/portfolio-equity";

const KEY = `${MOCK_PORTFOLIO_KEY}.equity`;
export function usePortfolioHistory(total: number, ready: boolean) {
  const [history, setHistory] = useState<EquityPoint[]>([]);
  const saved = useRef<EquityPoint[]>([]);
  const [loaded, setLoaded] = useState(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let canceled = false;
    void AsyncStorage.getItem(KEY).then((raw) => {
      if (canceled) return;
      const parsed = raw ? JSON.parse(raw) as unknown : [];
      saved.current = Array.isArray(parsed) ? parsed.filter((row): row is EquityPoint => Boolean(row && Number.isFinite(row.time) && Number.isFinite(row.value))) : [];
      setHistory(saved.current);
    }).catch(() => undefined).finally(() => { if (!canceled) setLoaded(true); });
    return () => { canceled = true; };
  }, []);
  useEffect(() => {
    if (!ready || !loaded) return;
    const record = () => {
      if (AppState.currentState !== "active") return;
      const next = recordEquity(saved.current, total, Date.now());
      saved.current = next;
      setHistory(next);
      // Serialize disk writes so a delayed older sample cannot overwrite a newer trade.
      writes.current = writes.current.then(() => AsyncStorage.setItem(KEY, JSON.stringify(next))).catch(() => undefined);
    };
    const initial = setTimeout(record, 0);
    // Record flat observations too, so an unchanged balance produces an honest flat line.
    const timer = setInterval(record, 10_000);
    const subscription = AppState.addEventListener("change", (status) => { if (status === "active") record(); });
    return () => { clearTimeout(initial); clearInterval(timer); subscription.remove(); };
  }, [total, ready, loaded]);
  return { history, historyReady: loaded && ready };
}
