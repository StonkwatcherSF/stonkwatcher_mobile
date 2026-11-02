import { fetchOhlcv } from "../lib/stonk";
import { applyLiveClose, ohlcvStep } from "../lib/public-data";
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

export const PERIOD_STEP: Record<ChartPeriod, number> = {
  "1s": 60,
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  All: 86400,
};

export function useOhlcv(mint: string | undefined, period: ChartPeriod, spotUsd?: number | null) {
  const valid = Boolean(mint && isSolanaAddress(mint));
  const tf = PERIOD_TF[period];
  const step = PERIOD_STEP[period] || ohlcvStep(tf);
  const hasSpot = Boolean(spotUsd && spotUsd > 0);
  return useAsync<OhlcvCandle[]>(
    async () => {
      const body = await fetchOhlcv(mint!, tf, spotUsd);
      return applyLiveClose(body.candles ?? [], spotUsd, step);
    },
    [mint, tf, step, hasSpot],
    valid,
    10_000,
  );
}
