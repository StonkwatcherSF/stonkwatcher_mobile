import { fetchMarket, fetchTokenByMint } from "../lib/stonk";
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
      const [token, market] = await Promise.all([
        fetchTokenByMint(mint!),
        fetchMarket(mint!).catch(() => null),
      ]);
      return { token, market };
    },
    [mint],
    valid,
  );
}
