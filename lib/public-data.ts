import { STONKFUN_API_URL } from "./config";
import type { OhlcvCandle, StonkFunToken, TokensPage } from "./types";

type StonkFunEnvelope = {
  data?: {
    tokens?: StonkFunToken[];
    pagination?: TokensPage["pagination"];
  };
  tokens?: StonkFunToken[];
};

export async function fetchStonkFunTokens(params: {
  sort?: "marketCap" | "newest" | "volume";
  q?: string;
  quoteMint?: string;
  pageSize?: number;
}): Promise<TokensPage> {
  const url = new URL(`${STONKFUN_API_URL}/tokens`);
  url.searchParams.set("sort", params.sort ?? "volume");
  url.searchParams.set("pageSize", String(params.pageSize ?? 50));
  if (params.q) url.searchParams.set("q", params.q);
  if (params.quoteMint) url.searchParams.set("quoteMint", params.quoteMint);
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`StonkFun tokens failed (${response.status})`);
  const body = (await response.json()) as StonkFunEnvelope;
  const tokens = body.data?.tokens ?? body.tokens ?? [];
  return {
    tokens,
    pagination: body.data?.pagination,
    source: "stonkfun",
  };
}

const TF_MAP: Record<string, { timeframe: string; aggregate: number }> = {
  "1m": { timeframe: "minute", aggregate: 1 },
  "5m": { timeframe: "minute", aggregate: 5 },
  "15m": { timeframe: "minute", aggregate: 15 },
  "1h": { timeframe: "hour", aggregate: 1 },
  "4h": { timeframe: "hour", aggregate: 4 },
  "1d": { timeframe: "day", aggregate: 1 },
};

function formatGeckoCandles(raw: [number, number, number, number, number, number][]): OhlcvCandle[] {
  const rows: OhlcvCandle[] = [];
  const seen = new Set<number>();
  for (const row of raw) {
    const time = Math.floor(row[0] > 1e12 ? row[0] / 1000 : row[0]);
    const open = Number(row[1]);
    const close = Number(row[4]);
    if (!Number.isFinite(time) || !Number.isFinite(close) || close <= 0 || seen.has(time)) continue;
    seen.add(time);
    rows.push({
      time,
      open,
      high: Math.max(Number(row[2]), open, close),
      low: Math.min(Number(row[3]), open, close),
      close,
      volume: Number(row[5]) || 0,
    });
  }
  return rows.sort((a, b) => a.time - b.time);
}

export async function fetchPublicOhlcv(mint: string, tf: string): Promise<OhlcvCandle[]> {
  const spec = TF_MAP[tf] ?? TF_MAP["5m"];
  const poolsRes = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools`,
    { headers: { Accept: "application/json" } },
  );
  if (!poolsRes.ok) return [];
  const poolsBody = (await poolsRes.json()) as {
    data?: { attributes?: { address?: string } }[];
  };
  const pool = poolsBody.data?.[0]?.attributes?.address;
  if (!pool) return [];
  const ohlcvRes = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${spec.timeframe}?aggregate=${spec.aggregate}&limit=100&currency=usd`,
    { headers: { Accept: "application/json" } },
  );
  if (!ohlcvRes.ok) return [];
  const ohlcvBody = (await ohlcvRes.json()) as {
    data?: { attributes?: { ohlcv_list?: [number, number, number, number, number, number][] } };
  };
  return formatGeckoCandles(ohlcvBody.data?.attributes?.ohlcv_list ?? []);
}
