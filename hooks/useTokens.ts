import { QUOTE_MINTS, type QuoteFilter } from "../lib/config";
import { fetchTokens } from "../lib/stonk";
import type { StonkFunToken } from "../lib/types";
import { useAsync } from "./useAsync";

export function useTokens(tab: "Trending" | "New", quote: QuoteFilter) {
  const sort = tab === "New" ? "newest" : "volume";
  const quoteMint = QUOTE_MINTS[quote];
  return useAsync<StonkFunToken[]>(
    async () => {
      const page = await fetchTokens({ sort, quoteMint, pageSize: 50 });
      return page.tokens ?? [];
    },
    [sort, quoteMint],
  );
}
