import { STONKFUN_API_URL } from "./config";
import { tokenMint } from "./solana";
import type { OhlcvCandle, StonkFunToken, TokensPage } from "./types";

type StonkFunEnvelope = {
  data?: {
    tokens?: unknown[];
    pagination?: TokensPage["pagination"];
  };
  tokens?: unknown[];
};

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeToken(raw: unknown): StonkFunToken | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const quote = asRecord(row.quote);
  const market = asRecord(row.market);
  const mint = tokenMint({
    mint: asText(row.mint),
    address: asText(row.address),
    id: asText(row.id),
  });
  if (!mint) return null;
  return {
    mint,
    name: asText(row.name),
    symbol: asText(row.symbol),
    imageUrl: asText(row.imageUrl) ?? asText(row.logoUrl) ?? asText(row.image),
    logoUrl: asText(row.logoUrl) ?? asText(row.imageUrl),
    creator: asText(row.creator),
    status: asText(row.status),
    createdAt: asText(row.createdAt),
    graduatedAt: asText(row.graduatedAt),
    quote: {
      mint: asText(quote.mint) ?? asText(row.quoteMint),
      symbol: asText(quote.symbol) ?? asText(row.quoteSymbol),
      name: asText(quote.name),
      logoUrl: asText(quote.logoUrl),
    },
    market: {
      priceUsd: Number(market.priceUsd ?? row.priceUsd) || undefined,
      marketCapUsd: Number(market.marketCapUsd ?? market.marketCap ?? row.marketCapUsd) || undefined,
      volume24hUsd: Number(market.volume24hUsd ?? row.volume24hUsd) || undefined,
      priceChange24h: Number(market.priceChange24h ?? row.priceChange24h) || undefined,
      liquidityUsd: Number(market.liquidityUsd) || undefined,
    },
  };
}

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
  const tokens = (body.data?.tokens ?? body.tokens ?? [])
    .map(normalizeToken)
    .filter((token): token is StonkFunToken => Boolean(token));
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
