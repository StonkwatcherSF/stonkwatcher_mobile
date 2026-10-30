import { fetchMarket, fetchTokens } from "../lib/stonk";
import type { MarketQuote, StonkFunToken } from "../lib/types";
import { isSolanaAddress } from "../lib/solana";
import { useAsync } from "./useAsync";

export type TokenDetail = {
  token: StonkFunToken | null;
  market: MarketQuote | null;
};

export function useTokenMarket(mint?: string) {
  const valid = Boolean(mint && isSolanaAddress(mint));
  return useAsync<TokenDetail>(
    async () => {
      const [page, market] = await Promise.all([
        fetchTokens({ q: mint, raw: true, fast: true, pageSize: 8 }),
        fetchMarket(mint!),
      ]);
      const token =
        page.tokens?.find((row) => row.mint === mint) ?? page.tokens?.[0] ?? null;
      return { token, market };
    },
    [mint],
    valid,
  );
}
