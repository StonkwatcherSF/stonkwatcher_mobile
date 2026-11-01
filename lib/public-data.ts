import { STONKFUN_API_URL, USDC_MINT, WSOL_MINT } from "./config";
import { dexLogoUrl, resolveMediaUrl } from "./media";
import { prettyQuoteSymbol } from "./quotes";
import { tokenMint } from "./solana";
import type { IntelTransfer, OhlcvCandle, StonkFunToken, TokensPage } from "./types";

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

function isGenericLabel(value?: string | null) {
  const text = (value || "").replace(/^\$/, "").trim();
  return !text || text.toUpperCase() === "TOKEN";
}

function pickLabel(...values: (string | null | undefined)[]) {
  for (const value of values) {
    if (!isGenericLabel(value)) return value!.replace(/^\$/, "").trim();
  }
  return undefined;
}

export function mergeTokenMeta(
  primary?: StonkFunToken | null,
  fallback?: StonkFunToken | null,
): StonkFunToken | null {
  if (!primary && !fallback) return null;
  const mint = primary?.mint || fallback?.mint;
  if (!mint) return null;
  const imageUrl =
    resolveMediaUrl(primary?.imageUrl) ||
    resolveMediaUrl(primary?.logoUrl) ||
    resolveMediaUrl(fallback?.imageUrl) ||
    resolveMediaUrl(fallback?.logoUrl) ||
    dexLogoUrl(mint);
  return {
    ...fallback,
    ...primary,
    mint,
    name: pickLabel(primary?.name, fallback?.name) || primary?.name || fallback?.name,
    symbol: pickLabel(primary?.symbol, fallback?.symbol) || primary?.symbol || fallback?.symbol,
    imageUrl: imageUrl ?? undefined,
    logoUrl: imageUrl ?? undefined,
    quote: { ...fallback?.quote, ...primary?.quote },
    market: {
      ...fallback?.market,
      ...primary?.market,
      priceUsd: primary?.market?.priceUsd ?? fallback?.market?.priceUsd,
      marketCapUsd: primary?.market?.marketCapUsd ?? fallback?.market?.marketCapUsd,
      volume24hUsd: primary?.market?.volume24hUsd ?? fallback?.market?.volume24hUsd,
      priceChange24h: primary?.market?.priceChange24h ?? fallback?.market?.priceChange24h,
      liquidityUsd: primary?.market?.liquidityUsd ?? fallback?.market?.liquidityUsd,
    },
  };
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
  const quoteMint = asText(quote.mint) ?? asText(row.quoteMint);
  const quoteSymbol = prettyQuoteSymbol(
    asText(quote.symbol) ?? asText(row.quoteSymbol),
    quoteMint,
  );
  return {
    mint,
    name: asText(row.name),
    symbol: asText(row.symbol),
    imageUrl: resolveMediaUrl(asText(row.imageUrl) ?? asText(row.logoUrl) ?? asText(row.image)) ?? undefined,
    logoUrl: resolveMediaUrl(asText(row.logoUrl) ?? asText(row.imageUrl)) ?? undefined,
    creator: asText(row.creator),
    status: asText(row.status),
    createdAt: asText(row.createdAt),
    graduatedAt: asText(row.graduatedAt),
    quote: {
      mint: quoteMint ?? (quoteSymbol === "SOL" ? WSOL_MINT : quoteSymbol === "USDC" ? USDC_MINT : undefined),
      symbol: quoteSymbol,
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

const TF_MAP: Record<string, { timeframe: string; aggregate: number; step: number }> = {
  "1m": { timeframe: "minute", aggregate: 1, step: 60 },
  "5m": { timeframe: "minute", aggregate: 5, step: 300 },
  "15m": { timeframe: "minute", aggregate: 15, step: 900 },
  "1h": { timeframe: "hour", aggregate: 1, step: 3600 },
  "4h": { timeframe: "hour", aggregate: 4, step: 14400 },
  "1d": { timeframe: "day", aggregate: 1, step: 86400 },
};

const OHLCV_TTL_MS = 90_000;
const ohlcvCache = new Map<string, { at: number; candles: OhlcvCandle[] }>();

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
      open: Number.isFinite(open) && open > 0 ? open : close,
      high: Math.max(Number(row[2]), open, close),
      low: Math.min(Number(row[3]) || close, open, close),
      close,
      volume: Number(row[5]) || 0,
    });
  }
  return rows.sort((a, b) => a.time - b.time);
}

function closeToSpot(candles: OhlcvCandle[], spot?: number | null) {
  if (candles.length < 2) return false;
  if (!spot || spot <= 0) return true;
  const recent = candles.slice(-12).map((row) => row.close).filter((close) => close > 0);
  const mid = recent[Math.floor((recent.length - 1) / 2)] ?? 0;
  if (!(mid > 0)) return false;
  const ratio = mid / spot;
  return ratio >= 0.55 && ratio <= 1.8;
}

function tradedRecently(candles: OhlcvCandle[]) {
  const last = candles[candles.length - 1]?.time ?? 0;
  if (!last) return false;
  return Math.floor(Date.now() / 1000) - last <= 72 * 3600;
}

async function fetchGeckoPool(mint: string) {
  const poolsRes = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools`,
    { headers: { Accept: "application/json" } },
  );
  if (!poolsRes.ok) return null;
  const poolsBody = (await poolsRes.json()) as {
    data?: {
      attributes?: { address?: string; reserve_in_usd?: string; volume_usd?: { h24?: string } };
      relationships?: { base_token?: { data?: { id?: string } }; quote_token?: { data?: { id?: string } } };
    }[];
  };
  const tokenId = `solana_${mint}`;
  const rows = [...(poolsBody.data ?? [])].sort((a, b) => {
    const av = Number(a.attributes?.volume_usd?.h24) || Number(a.attributes?.reserve_in_usd) || 0;
    const bv = Number(b.attributes?.volume_usd?.h24) || Number(b.attributes?.reserve_in_usd) || 0;
    return bv - av;
  });
  const asBase = rows.find((row) => row.relationships?.base_token?.data?.id === tokenId);
  const asQuote = rows.find((row) => row.relationships?.quote_token?.data?.id === tokenId);
  const chosen = asBase ?? asQuote ?? rows[0];
  const address = chosen?.attributes?.address;
  if (!address) return null;
  return { address, tokenIsBase: Boolean(asBase) || !asQuote };
}

async function fetchGeckoPoolOhlcv(
  pool: string,
  spec: { timeframe: string; aggregate: number },
  side: "base" | "quote",
) {
  const ohlcvRes = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${spec.timeframe}?aggregate=${spec.aggregate}&limit=1000&currency=usd&token=${side}`,
    { headers: { Accept: "application/json" } },
  );
  if (!ohlcvRes.ok) return [] as OhlcvCandle[];
  const ohlcvBody = (await ohlcvRes.json()) as {
    data?: { attributes?: { ohlcv_list?: [number, number, number, number, number, number][] } };
  };
  return formatGeckoCandles(ohlcvBody.data?.attributes?.ohlcv_list ?? []);
}

async function fetchStonkFunPool(mint: string) {
  const response = await fetch(`${STONKFUN_API_URL}/tokens/${mint}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    data?: { token?: { pool?: string; quote?: { mint?: string; symbol?: string } } };
  };
  const token = body.data?.token;
  const pool = token?.pool;
  if (!pool) return null;
  return { pool, quoteMint: token?.quote?.mint, quoteSymbol: token?.quote?.symbol };
}

async function fetchQuoteSpotUsd(quoteMint?: string, quoteSymbol?: string) {
  const symbol = (quoteSymbol || "").replace(/^\$/, "").toUpperCase();
  if (symbol === "USDC" || symbol === "USDT" || symbol === "USD1" || symbol === "PYUSD") return 1;
  if (!quoteMint) return null;
  const token = await fetchDexscreenerToken(quoteMint);
  return token?.market?.priceUsd && token.market.priceUsd > 0 ? token.market.priceUsd : null;
}

async function fetchLaunchKline(poolId: string, tf: string, quoteMint?: string, quoteSymbol?: string) {
  const interval = tf === "1m" || tf === "15m" ? tf : "5m";
  const response = await fetch(
    `https://launch-history-v1.raydium.io/kline?poolId=${encodeURIComponent(poolId)}&interval=${interval}&limit=500`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) return [] as OhlcvCandle[];
  const body = (await response.json()) as {
    data?: { rows?: { t?: number; o?: number; h?: number; l?: number; c?: number }[] };
  };
  const native = (body.data?.rows ?? [])
    .map((row) => {
      const time = Math.floor(Number(row.t) || 0);
      const open = Number(row.o);
      const close = Number(row.c);
      if (!time || !Number.isFinite(close) || close <= 0) return null;
      return {
        time,
        open: Number.isFinite(open) && open > 0 ? open : close,
        high: Math.max(Number(row.h) || close, open, close),
        low: Math.min(Number(row.l) || close, open, close),
        close,
        volume: 0,
      } satisfies OhlcvCandle;
    })
    .filter((row): row is OhlcvCandle => Boolean(row))
    .sort((a, b) => a.time - b.time);
  if (!native.length) return [];
  const quoteUsd = (await fetchQuoteSpotUsd(quoteMint, quoteSymbol)) ?? 1;
  if (quoteUsd === 1) return native;
  return native.map((row) => ({
    ...row,
    open: row.open * quoteUsd,
    high: row.high * quoteUsd,
    low: row.low * quoteUsd,
    close: row.close * quoteUsd,
  }));
}

export async function fetchPublicOhlcv(mint: string, tf: string, spotUsd?: number | null): Promise<OhlcvCandle[]> {
  const spec = TF_MAP[tf] ?? TF_MAP["5m"];
  const cacheKey = `${mint}:${tf}`;
  const cached = ohlcvCache.get(cacheKey);
  if (cached && Date.now() - cached.at < OHLCV_TTL_MS && cached.candles.length >= 2) {
    return cached.candles;
  }

  const [pool, dex] = await Promise.all([
    fetchGeckoPool(mint),
    spotUsd && spotUsd > 0 ? Promise.resolve(null) : fetchDexscreenerToken(mint).catch(() => null),
  ]);
  const spot = spotUsd && spotUsd > 0 ? spotUsd : dex?.market?.priceUsd ?? null;
  let candles: OhlcvCandle[] = [];
  if (pool) {
    const preferred = pool.tokenIsBase ? "base" : "quote";
    const first = await fetchGeckoPoolOhlcv(pool.address, spec, preferred);
    if (closeToSpot(first, spot) && tradedRecently(first)) {
      candles = first;
    } else {
      const other = await fetchGeckoPoolOhlcv(pool.address, spec, preferred === "base" ? "quote" : "base");
      const firstOk = tradedRecently(first) && closeToSpot(first, spot);
      const otherOk = tradedRecently(other) && closeToSpot(other, spot);
      if (otherOk && (!firstOk || other.length > first.length)) candles = other;
      else if (firstOk || (tradedRecently(first) && first.length >= 2)) candles = first;
      else if (other.length >= 2) candles = other;
    }
  }

  if (candles.length < 8) {
    const launch = await fetchStonkFunPool(mint).catch(() => null);
    if (launch?.pool) {
      const kline = await fetchLaunchKline(launch.pool, tf, launch.quoteMint, launch.quoteSymbol).catch(() => []);
      if (kline.length > candles.length && (closeToSpot(kline, spot) || !spot)) {
        candles = kline;
      }
    }
  }

  if (candles.length >= 2) ohlcvCache.set(cacheKey, { at: Date.now(), candles });
  return candles;
}

export async function fetchDexscreenerToken(mint: string): Promise<StonkFunToken | null> {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    pairs?: {
      chainId?: string;
      baseToken?: { address?: string; name?: string; symbol?: string };
      quoteToken?: { address?: string; name?: string; symbol?: string };
      priceUsd?: string;
      marketCap?: number;
      fdv?: number;
      volume?: { h24?: number };
      priceChange?: { h24?: number };
      liquidity?: { usd?: number };
      info?: { imageUrl?: string };
    }[];
  };
  const pairs = (body.pairs ?? []).filter((pair) => pair.chainId === "solana");
  const pair =
    pairs.find((row) => row.baseToken?.address === mint && row.info?.imageUrl) ??
    pairs.find((row) => row.baseToken?.address === mint) ??
    pairs[0];
  if (!pair?.baseToken) return null;
  return {
    mint,
    name: pair.baseToken.name,
    symbol: pair.baseToken.symbol,
    imageUrl: resolveMediaUrl(pair.info?.imageUrl) ?? dexLogoUrl(mint) ?? undefined,
    quote: {
      mint: pair.quoteToken?.address,
      symbol: prettyQuoteSymbol(pair.quoteToken?.symbol, pair.quoteToken?.address),
      name: pair.quoteToken?.name,
    },
    market: {
      priceUsd: Number(pair.priceUsd) || undefined,
      marketCapUsd: pair.marketCap || pair.fdv || undefined,
      volume24hUsd: pair.volume?.h24,
      priceChange24h: pair.priceChange?.h24,
      liquidityUsd: pair.liquidity?.usd,
    },
  };
}

export async function fetchPublicTrades(mint: string, symbol?: string): Promise<IntelTransfer[]> {
  const pool = await fetchGeckoPool(mint);
  if (!pool) return [];
  const tradesRes = await fetch(
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool.address}/trades?limit=30`,
    { headers: { Accept: "application/json" } },
  );
  if (!tradesRes.ok) return [];
  const tradesBody = (await tradesRes.json()) as {
    data?: {
      id?: string;
      attributes?: {
        block_timestamp?: string;
        tx_hash?: string;
        kind?: string;
        from_token_address?: string;
        to_token_address?: string;
        from_token_amount?: string;
        to_token_amount?: string;
        volume_in_usd?: string;
      };
    }[];
  };
  return (tradesBody.data ?? []).map((row) => {
    const attrs = row.attributes ?? {};
    const sellingMint = attrs.from_token_address === mint;
    const side = sellingMint ? "sell" : "buy";
    const amount = sellingMint
      ? Number(attrs.from_token_amount)
      : Number(attrs.to_token_amount);
    return {
      id: row.id || attrs.tx_hash || `${mint}:${attrs.block_timestamp}`,
      at: attrs.block_timestamp || new Date().toISOString(),
      signature: attrs.tx_hash || "",
      from: "",
      to: "",
      token: (symbol || "TOKEN").replace(/^\$/, ""),
      mint,
      amount: Number.isFinite(amount) ? amount : 0,
      usd: Number(attrs.volume_in_usd) || 0,
      side,
    } satisfies IntelTransfer;
  });
}
