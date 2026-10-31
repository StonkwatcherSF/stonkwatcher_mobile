import { ALL_QUOTES, FALLBACK_QUOTES, type SelectedQuote } from "../lib/config";
import { fetchQuoteCatalog } from "../lib/stonk";
import { useAsync } from "./useAsync";

export function useQuoteCatalog() {
  return useAsync<SelectedQuote[]>(
    async () => {
      const rows = await fetchQuoteCatalog();
      if (!rows.length) return FALLBACK_QUOTES;
      const seen = new Set<string>();
      const quotes: SelectedQuote[] = [ALL_QUOTES];
      for (const row of rows) {
        const symbol = (row.symbol || "").replace(/^\$/, "").trim();
        const mint = row.mint?.trim();
        const key = mint || symbol.toUpperCase();
        if (!symbol || seen.has(key)) continue;
        seen.add(key);
        quotes.push({ symbol, mint });
      }
      return quotes.length > 1 ? quotes : FALLBACK_QUOTES;
    },
    [],
  );
}
