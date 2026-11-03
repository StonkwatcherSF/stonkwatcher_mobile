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
    verified: primary?.verified ?? fallback?.verified,
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
    verified: typeof row.verified === "boolean" ? row.verified : typeof row.isVerified === "boolean" ? row.isVerified : typeof row.is_verified === "boolean" ? row.is_verified : undefined,
    name: asText(row.name),
    symbol: asText(row.symbol),
    imageUrl: resolveMediaUrl(asText(row.imageUrl) ?? asText(row.logoUrl) ?? asText(row.image)) ?? undefined,
    logoUrl: resolveMediaUrl(asText(row.logoUrl) ?? asText(row.imageUrl)) ?? undefined,
    creator: asText(row.creator) ?? asText(row.creatorAddress),
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

export function ohlcvStep(tf: string) {
  return (TF_MAP[tf] ?? TF_MAP["5m"]).step;
}

const OHLCV_TTL_MS = 12_000;
const POOL_TTL_MS = 10 * 60_000;
const TRADE_TTL_MS = 4_000;
const ohlcvCache = new Map<string, { at: number; candles: OhlcvCandle[] }>();
const poolCache = new Map<string, { at: number; pool: PoolRef | null }>();
const poolInflight = new Map<string, Promise<PoolRef | null>>();
const tradeCache = new Map<string, { at: number; rows: IntelTransfer[] }>();

type PoolRef = { address: string; tokenIsBase: boolean };

async function jsonGet<T>(url: string, timeoutMs = 8_000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

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

export function applyLiveClose(
  candles: OhlcvCandle[],
  spot?: number | null,
  step = 60,
  band = { min: 0.2, max: 5 },
): OhlcvCandle[] {
  if (!candles.length || !spot || spot <= 0) return candles;
  const last = candles[candles.length - 1];
  const ref = last.close > 0 ? last.close : last.open;
  if (!(ref > 0)) return candles;
  const ratio = spot / ref;
  if (ratio < band.min || ratio > band.max) return candles;
  const bucket = Math.floor(Date.now() / 1000 / step) * step;
  const rows = candles.map((row) => ({ ...row }));
  const tip = rows[rows.length - 1];
  if (tip.time < bucket) {
    rows.push({
      time: bucket,
      open: tip.close,
      high: Math.max(tip.close, spot),
      low: Math.min(tip.close, spot),
      close: spot,
      volume: 0,
    });
    return rows;
  }
  tip.close = spot;
  tip.high = Math.max(tip.high, spot);
  tip.low = Math.min(tip.low, spot);
  return rows;
}

async function fetchGeckoPool(mint: string): Promise<PoolRef | null> {
  const poolsBody = await jsonGet<{
    data?: {
      attributes?: { address?: string; reserve_in_usd?: string; volume_usd?: { h24?: string } };
      relationships?: { base_token?: { data?: { id?: string } }; quote_token?: { data?: { id?: string } } };
    }[];
  }>(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools`);
  if (!poolsBody) return null;
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

async function fetchDexscreenerPool(mint: string): Promise<PoolRef | null> {
  const body = await jsonGet<{
    pairs?: {
      chainId?: string;
      pairAddress?: string;
      baseToken?: { address?: string };
      liquidity?: { usd?: number };
      volume?: { h24?: number };
    }[];
  }>(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, 5_000);
  const pairs = (body?.pairs ?? [])
    .filter((pair) => pair.chainId === "solana" && pair.pairAddress)
    .sort((a, b) => (b.liquidity?.usd ?? b.volume?.h24 ?? 0) - (a.liquidity?.usd ?? a.volume?.h24 ?? 0));
  const pair = pairs[0];
  if (!pair?.pairAddress) return null;
  return { address: pair.pairAddress, tokenIsBase: pair.baseToken?.address === mint };
}

async function resolvePool(mint: string): Promise<PoolRef | null> {
  const cached = poolCache.get(mint);
  if (cached && Date.now() - cached.at < POOL_TTL_MS) return cached.pool;
  const pending = poolInflight.get(mint);
  if (pending) return pending;
  const job = (async () => {
    try {
      const gecko = await fetchGeckoPool(mint);
      const pool = gecko ?? (await fetchDexscreenerPool(mint));
      poolCache.set(mint, { at: Date.now(), pool });
      return pool;
    } finally {
      poolInflight.delete(mint);
    }
  })();
  poolInflight.set(mint, job);
  return job;
}

async function fetchGeckoPoolOhlcv(
  pool: string,
  spec: { timeframe: string; aggregate: number },
  side: "base" | "quote",
) {
  const ohlcvBody = await jsonGet<{
    data?: { attributes?: { ohlcv_list?: [number, number, number, number, number, number][] } };
  }>(
    `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${spec.timeframe}?aggregate=${spec.aggregate}&limit=1000&currency=usd&token=${side}`,
  );
  return formatGeckoCandles(ohlcvBody?.data?.attributes?.ohlcv_list ?? []);
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
    return applyLiveClose(cached.candles, spotUsd, spec.step);
  }

  const [pool, dex] = await Promise.all([
    resolvePool(mint),
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

  if (candles.length < 2 && cached?.candles.length) candles = cached.candles;
  if (candles.length >= 2) ohlcvCache.set(cacheKey, { at: Date.now(), candles });
  return applyLiveClose(candles, spot, spec.step);
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

type GeckoTradeRow = {
  id?: string;
  attributes?: {
    block_timestamp?: string;
    tx_hash?: string;
    tx_from_address?: string;
    kind?: string;
    from_token_address?: string;
    to_token_address?: string;
    from_token_amount?: string;
    to_token_amount?: string;
    volume_in_usd?: string;
  };
};

function tradeSide(mint: string, tokenIsBase: boolean, attrs: NonNullable<GeckoTradeRow["attributes"]>): "buy" | "sell" {
  const kind = (attrs.kind || "").toLowerCase();
  if (kind === "buy" || kind === "sell") {
    if (tokenIsBase) return kind;
    return kind === "buy" ? "sell" : "buy";
  }
  return attrs.to_token_address === mint ? "buy" : "sell";
}

function rowsFromGeckoTrades(
  mint: string,
  symbol: string | undefined,
  tokenIsBase: boolean,
  rows: GeckoTradeRow[],
): IntelTransfer[] {
  const ticker = (symbol || "TOKEN").replace(/^\$/, "");
  const out: IntelTransfer[] = [];
  for (const row of rows) {
    const attrs = row.attributes ?? {};
    if (attrs.from_token_address !== mint && attrs.to_token_address !== mint) continue;
    const side = tradeSide(mint, tokenIsBase, attrs);
    const amount = side === "buy" ? Number(attrs.to_token_amount) : Number(attrs.from_token_amount);
    const signature = attrs.tx_hash || "";
    out.push({
      id: row.id || signature || `${mint}:${attrs.block_timestamp}`,
      at: attrs.block_timestamp || new Date().toISOString(),
      signature,
      from: attrs.tx_from_address || "",
      to: "",
      token: ticker,
      mint,
      amount: Number.isFinite(amount) ? amount : 0,
      usd: Number(attrs.volume_in_usd) || 0,
      side,
    });
  }
  return out;
}

export function mergeTrades(primary: IntelTransfer[], extra: IntelTransfer[] = []) {
  const rows = new Map<string, IntelTransfer>();
  const keyOf = (row: IntelTransfer) => {
    if (row.signature && (row.side === "buy" || row.side === "sell")) return `${row.side}:${row.signature}`;
    if (row.signature) return `${row.signature}:${row.id}`;
    return row.id;
  };
  for (const row of extra) rows.set(keyOf(row), row);
  for (const row of primary) rows.set(keyOf(row), row);
  return [...rows.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.usd - a.usd);
}

export async function fetchPublicTrades(mint: string, symbol?: string): Promise<IntelTransfer[]> {
  const cached = tradeCache.get(mint);
  if (cached && Date.now() - cached.at < TRADE_TTL_MS) return cached.rows;
  const pool = await resolvePool(mint);
  const urls = [
    pool
      ? `https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool.address}/trades?trade_volume_in_usd_greater_than=0`
      : null,
    `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/trades?trade_volume_in_usd_greater_than=0`,
  ].filter(Boolean) as string[];
  const tokenIsBase = pool?.tokenIsBase ?? true;
  let raw: GeckoTradeRow[] = [];
  for (const url of urls) {
    const body = await jsonGet<{ data?: GeckoTradeRow[] }>(url, 8_000);
    raw = body?.data ?? [];
    if (raw.length) break;
  }
  const rows = rowsFromGeckoTrades(mint, symbol, tokenIsBase, raw);
  if (rows.length) {
    tradeCache.set(mint, { at: Date.now(), rows });
    return rows;
  }
  if (cached?.rows.length) {
    tradeCache.set(mint, { at: Date.now(), rows: cached.rows });
    return cached.rows;
  }
  tradeCache.set(mint, { at: Date.now(), rows: [] });
  return [];
}
