import type { SelectedQuote } from "../lib/config";
import { fetchTokens } from "../lib/stonk";
import type { StonkFunToken } from "../lib/types";
import { tokenMint } from "../lib/solana";
import { useAsync } from "./useAsync";

function matchesQuote(token: StonkFunToken, quote?: SelectedQuote | null) {
  if (!quote?.mint && (!quote?.symbol || quote.symbol === "All Quotes")) return true;
  const symbol = (token.quote?.symbol || "").replace(/^\$/, "").toUpperCase();
  if (quote.mint && token.quote?.mint === quote.mint) return true;
  if (quote.symbol && symbol === quote.symbol.toUpperCase()) return true;
  return false;
}

export function useTokens(tab: "Trending" | "New", quote?: SelectedQuote | null) {
  const sort = tab === "New" ? "newest" : "volume";
  const quoteMint = quote?.mint;
  return useAsync<StonkFunToken[]>(
    async () => {
      const page = await fetchTokens({ sort, quoteMint, pageSize: 50 });
      let tokens = (page.tokens ?? []).filter((token) => tokenMint(token));
      if (quoteMint && tokens.length === 0) {
        const all = await fetchTokens({ sort, pageSize: 50 });
        tokens = (all.tokens ?? []).filter((token) => tokenMint(token));
      }
      return tokens.filter((token) => matchesQuote(token, quote));
    },
    [sort, quoteMint, quote?.symbol],
  );
}
