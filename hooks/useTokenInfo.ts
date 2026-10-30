import { fetchIntel, fetchTokenInfo } from "../lib/stonk";
import type { IntelTransfer, TokenInfoPayload } from "../lib/types";
import { isSolanaAddress } from "../lib/solana";
import { useAsync } from "./useAsync";

export function useTokenTrades(mint?: string, name?: string, symbol?: string) {
  const valid = Boolean(mint && isSolanaAddress(mint));
  return useAsync<IntelTransfer[]>(
    async () => {
      const body = await fetchIntel(mint!, name, symbol);
      return body.rows ?? [];
    },
    [mint, name, symbol],
    valid,
  );
}

export function useTokenInfo(mint?: string) {
  const valid = Boolean(mint && isSolanaAddress(mint));
  return useAsync<TokenInfoPayload>(
    async () => fetchTokenInfo(mint!),
    [mint],
    valid,
  );
}
