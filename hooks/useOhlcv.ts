import { fetchOhlcv } from "../lib/stonk";
import type { OhlcvCandle } from "../lib/types";
import { isSolanaAddress } from "../lib/solana";
import { useAsync } from "./useAsync";

export const PERIOD_TF = {
  "1s": "1m",
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  All: "1d",
} as const;

export type ChartPeriod = keyof typeof PERIOD_TF;

export function useOhlcv(mint: string | undefined, period: ChartPeriod) {
  const valid = Boolean(mint && isSolanaAddress(mint));
  const tf = PERIOD_TF[period];
  return useAsync<OhlcvCandle[]>(
    async () => {
      const body = await fetchOhlcv(mint!, tf);
      return body.candles ?? [];
    },
    [mint, tf],
    valid,
  );
}
