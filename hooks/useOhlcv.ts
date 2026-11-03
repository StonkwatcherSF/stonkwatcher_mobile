import { useEffect, useRef } from "react";
import { fetchOhlcv } from "../lib/stonk";
import { applyLiveClose, ohlcvStep, readCachedOhlcv } from "../lib/public-data";
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
  const spotRef = useRef(spotUsd);
  useEffect(() => { spotRef.current = spotUsd; }, [spotUsd]);
  const key = `${mint}:${tf}`;
  const result = useAsync<{ key: string; candles: OhlcvCandle[] }>(
    async () => {
      const body = await fetchOhlcv(mint!, tf, spotRef.current);
      return { key, candles: body.candles ?? [] };
    },
    [mint, tf, step, hasSpot],
    valid,
    10_000,
  );
  const current = result.data?.key === key;
  const candles = valid ? (current ? result.data!.candles : readCachedOhlcv(mint!, tf)) : null;
  return {
    data: candles ? applyLiveClose(candles, spotUsd, step) : null,
    loading: valid && !candles && (result.loading || (!current && !result.error)),
    error: current || !result.loading ? result.error : null,
  };
}
