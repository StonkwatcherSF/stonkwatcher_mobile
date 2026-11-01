import { fetchTokens } from "../lib/stonk";
import { tokenMint } from "../lib/solana";
import type { StonkFunToken } from "../lib/types";
import { useAsync } from "./useAsync";

export function useTokens(tab: "Trending" | "New") {
  const sort = tab === "New" ? "newest" : "volume";
  return useAsync<StonkFunToken[]>(
    async () => {
      const page = await fetchTokens({ sort, pageSize: 50 });
      return (page.tokens ?? []).filter((token) => tokenMint(token));
    },
    [sort],
  );
}
