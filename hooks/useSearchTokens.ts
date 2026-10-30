import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SEARCH_RECENTS_KEY } from "../lib/config";
import { fetchTokens } from "../lib/stonk";
import type { StonkFunToken } from "../lib/types";
import { useAsync } from "./useAsync";

const DEBOUNCE_MS = 280;
const RECENTS_LIMIT = 8;

export type SearchRecent = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string;
  priceUsd?: number;
  marketCapUsd?: number;
  change?: number;
};

export function useDebouncedValue(value: string, delay = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useSearchTokens(query: string) {
  const q = query.trim();
  return useAsync<StonkFunToken[]>(
    async () => {
      const page = await fetchTokens({ q, raw: true, fast: true, pageSize: 20, sort: "volume" });
      return page.tokens ?? [];
    },
    [q],
    q.length > 0,
  );
}

export function useTrendingTokens(limit = 8) {
  return useAsync<StonkFunToken[]>(
    async () => {
      const page = await fetchTokens({ sort: "volume", pageSize: limit });
      return (page.tokens ?? []).slice(0, limit);
    },
    [limit],
  );
}

export function useSearchRecents() {
  const [recents, setRecents] = useState<SearchRecent[]>([]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SEARCH_RECENTS_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as SearchRecent[];
        if (Array.isArray(parsed)) setRecents(parsed.slice(0, RECENTS_LIMIT));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function remember(item: SearchRecent) {
    const next = [item, ...recents.filter((row) => row.mint !== item.mint)].slice(0, RECENTS_LIMIT);
    setRecents(next);
    await AsyncStorage.setItem(SEARCH_RECENTS_KEY, JSON.stringify(next)).catch(() => undefined);
  }

  return { recents, remember };
}
