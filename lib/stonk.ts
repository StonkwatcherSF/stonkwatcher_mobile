import { ApiError, apiGet, apiPost } from "./api";
import {
  fetchDexscreenerToken,
  fetchPublicOhlcv,
  fetchPublicTrades,
  fetchStonkFunTokens,
  mergeTokenMeta,
  normalizeToken,
} from "./public-data";
import { tokenMint } from "./solana";
import { fetchPublicTokenInfo } from "./token-info";
import type {
  AnalyzeResponse,
  BubbleMapResponse,
  IntelResponse,
  MarketQuote,
  OhlcvResponse,
  QuoteAsset,
  QuoteCatalog,
  TokensPage,
  TracerPayload,
  TracerTokenView,
  VolumeLeaderWindow,
  VolumeLeadersResponse,
} from "./types";

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export async function fetchTokens(params: {
  sort?: "marketCap" | "newest" | "volume";
  q?: string;
  quoteMint?: string;
  pageSize?: number;
  raw?: boolean;
  fast?: boolean;
}) {
  const query = {
    sort: params.sort ?? "volume",
    q: params.q,
    quoteMint: params.quoteMint,
    pageSize: params.pageSize ?? 50,
    raw: params.raw === false ? undefined : 1,
    fast: params.fast === false ? undefined : 1,
  };
  try {
    const page = await apiGet<TokensPage>("/api/tokens", query);
    const tokens = (page.tokens ?? [])
      .map((row) => normalizeToken(row) ?? (tokenMint(row) ? row : null))
      .filter((token): token is NonNullable<typeof token> => Boolean(token));
    if (tokens.length > 0) return { ...page, tokens };
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
  }
  try {
    return await fetchStonkFunTokens(params);
  } catch {
    return { tokens: [], source: "empty" };
  }
}

export async function fetchQuoteCatalog(q?: string): Promise<QuoteAsset[]> {
  try {
    const body = await apiGet<QuoteCatalog>("/api/v1/quotes/all", q ? { q } : undefined);
    return body.quotes ?? [];
  } catch {
    return [];
  }
}

export function fetchMarket(mint: string) {
  return apiGet<MarketQuote>("/api/dex/market", { mint });
}

export async function fetchTokenByMint(mint: string) {
  const [board, dex] = await Promise.all([
    fetchTokens({ q: mint, raw: true, fast: true, pageSize: 8 })
      .then((page) => page.tokens?.find((row) => row.mint === mint) ?? null)
      .catch(() => null),
    fetchDexscreenerToken(mint).catch(() => null),
  ]);
  return mergeTokenMeta(board, dex);
}

export async function fetchOhlcv(mint: string, tf: string, spotUsd?: number | null) {
  try {
    const body = await apiGet<OhlcvResponse>("/api/ohlcv", { tokenAddress: mint, tf });
    const live = (body.candles?.length ?? 0) >= 8 && body.source !== "dexscreener";
    if (live) return body;
  } catch (error) {
    if (!isUnauthorized(error) && !(error instanceof ApiError && error.status >= 500)) {
      /* still try the public candles */
    }
  }
  return { candles: await fetchPublicOhlcv(mint, tf, spotUsd), source: "geckoterminal" };
}

export async function fetchIntel(mint: string, name?: string, symbol?: string) {
  try {
    const body = await apiGet<IntelResponse>("/api/intel", { mint, name, symbol });
    if (body.rows?.length) return body;
  } catch {
    /* use public tape */
  }
  return { rows: await fetchPublicTrades(mint, symbol || name), source: "geckoterminal" };
}

export const fetchTokenInfo = fetchPublicTokenInfo;

export function fetchVolumeLeaders(window: VolumeLeaderWindow) {
  return apiGet<VolumeLeadersResponse>("/api/board/volume-leaders", { window });
}

async function publicTokenTrace(mint: string): Promise<TracerPayload> {
  const [page, market, info, bubble] = await Promise.all([
    fetchStonkFunTokens({ q: mint, pageSize: 4 }),
    fetchMarket(mint).catch(() => null),
    fetchTokenInfo(mint).catch(() => null),
    fetchBubbleMap(mint).catch(() => null),
  ]);
  const token = page.tokens?.find((row) => row.mint === mint) ?? page.tokens?.[0];
  if (!token) {
    return {
      mode: "wallet",
      address: mint,
      isDev: false,
      stonkLaunchCount: 0,
      outsideLaunchCount: 0,
      fundingAccountCount: 0,
      launches: [],
      linkedWallets: [],
      counterparties: [],
      token: null,
    };
  }
  const creatorNode = bubble?.bubbleMap?.nodes?.find((node) => node.isCreator);
  const view: TracerTokenView = {
    mint: token.mint,
    name: token.name ?? null,
    symbol: token.symbol ?? null,
    creatorAddress: token.creator ?? creatorNode?.address ?? null,
    devHoldPct: info?.stats.devPct ?? creatorNode?.percentage ?? null,
    supply: bubble?.supply ?? bubble?.bubbleMap?.summary?.supply ?? null,
    launchCount: 1,
    stonkLaunchCount: 1,
    outsideLaunchCount: 0,
    sniperCount: 0,
    clusterCount: bubble?.bubbleMap?.intel?.clusterCount ?? 0,
    launches: [],
    bubbleMap: bubble?.bubbleMap ?? { nodes: [], links: [] },
    brief: {
      imageUrl: token.imageUrl ?? token.logoUrl ?? null,
      quoteSymbol: token.quote?.symbol ?? null,
      launchpad: token.status ?? null,
      status: token.status ?? null,
      priceUsd: market?.priceUsd ?? token.market?.priceUsd ?? null,
      marketCapUsd: market?.marketCapUsd ?? token.market?.marketCapUsd ?? null,
      liquidityUsd: token.market?.liquidityUsd ?? null,
      volume24hUsd: market?.volume24hUsd ?? token.market?.volume24hUsd ?? null,
      firstSlot: null,
      lastAnalyzedAt: null,
      devAmount: creatorNode?.amount ?? null,
      holderCount: market?.holders ?? info?.rewards?.holders ?? null,
      score: null,
      breakdown: [],
      signals: info
        ? [
            {
              signalType: "holders",
              severity: "info",
              confidence: 1,
              description: `Top 10 holders ${info.stats.top10Pct ?? "—"}% · Dev ${info.stats.devPct ?? "—"}% · Snipers ${info.stats.sniperPct ?? "—"}%.`,
            },
          ]
        : [],
    },
  };
  return {
    mode: "token",
    address: token.mint,
    token: view,
  };
}

async function overlayLiveMarket(payload: TracerPayload): Promise<TracerPayload> {
  const token = payload.token;
  if (payload.mode !== "token" || !token?.mint) return payload;
  const mint = token.mint;
  const [market, meta, info] = await Promise.all([
    fetchMarket(mint).catch(() => null),
    fetchTokenByMint(mint).catch(() => null),
    fetchTokenInfo(mint).catch(() => null),
  ]);
  const merged = mergeTokenMeta(
    {
      mint,
      name: token.name ?? undefined,
      symbol: token.symbol ?? undefined,
      imageUrl: token.brief.imageUrl ?? undefined,
      creator: token.creatorAddress ?? undefined,
      status: token.brief.status ?? undefined,
      quote: token.brief.quoteSymbol ? { symbol: token.brief.quoteSymbol } : undefined,
      market: {
        priceUsd: token.brief.priceUsd ?? undefined,
        marketCapUsd: token.brief.marketCapUsd ?? undefined,
        volume24hUsd: token.brief.volume24hUsd ?? undefined,
        liquidityUsd: token.brief.liquidityUsd ?? undefined,
      },
    },
    meta,
  );
  return {
    ...payload,
    token: {
      ...token,
      name: merged?.name ?? token.name,
      symbol: merged?.symbol ?? token.symbol,
      creatorAddress: token.creatorAddress || merged?.creator || null,
      devHoldPct: token.devHoldPct ?? info?.stats.devPct ?? null,
      brief: {
        ...token.brief,
        imageUrl: merged?.imageUrl ?? token.brief.imageUrl,
        quoteSymbol: token.brief.quoteSymbol ?? merged?.quote?.symbol ?? null,
        status: token.brief.status ?? merged?.status ?? null,
        priceUsd: market?.priceUsd ?? merged?.market?.priceUsd ?? token.brief.priceUsd,
        marketCapUsd: market?.marketCapUsd ?? merged?.market?.marketCapUsd ?? token.brief.marketCapUsd,
        liquidityUsd: token.brief.liquidityUsd ?? merged?.market?.liquidityUsd ?? null,
        volume24hUsd: market?.volume24hUsd ?? merged?.market?.volume24hUsd ?? token.brief.volume24hUsd,
        holderCount: market?.holders ?? token.brief.holderCount ?? info?.rewards?.holders ?? null,
        devAmount: token.brief.devAmount,
      },
    },
  };
}

export async function fetchTracer(address: string, fresh = false) {
  try {
    const payload = await apiGet<TracerPayload>(`/api/tracer/${encodeURIComponent(address)}`, {
      fresh: fresh ? 1 : undefined,
    });
    return overlayLiveMarket(payload);
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      throw new Error("Enter a valid Solana wallet or token mint.");
    }
    if (!isUnauthorized(error)) throw error;
    return publicTokenTrace(address);
  }
}

export function queueAnalyze(mint: string) {
  return apiPost<AnalyzeResponse>("/api/analyze", { mint });
}

const BUBBLE_TTL_MS = 60_000;
const bubbleCache = new Map<string, { at: number; body: BubbleMapResponse }>();

export async function fetchBubbleMap(mint: string) {
  const cached = bubbleCache.get(mint);
  if (cached && Date.now() - cached.at < BUBBLE_TTL_MS && (cached.body.bubbleMap?.nodes?.length ?? 0) > 0) {
    return cached.body;
  }
  const body = await apiGet<BubbleMapResponse>(`/api/tokens/${encodeURIComponent(mint)}/bubble-v2`);
  const raw = body.bubbleMap;
  const bubbleMap = raw
    ? {
        ...raw,
        computedAt: raw.computedAt ?? body.computedAt,
        edition: raw.edition ?? body.edition ?? "v2",
        intel: raw.intel ?? body.intel,
        summary: {
          ...raw.summary,
          supply: raw.summary?.supply ?? body.supply ?? undefined,
        },
      }
    : undefined;
  const next = { ...body, bubbleMap, edition: body.edition ?? bubbleMap?.edition, computedAt: body.computedAt ?? bubbleMap?.computedAt };
  if ((next.bubbleMap?.nodes?.length ?? 0) > 0) {
    bubbleCache.set(mint, { at: Date.now(), body: next });
  }
  return next;
}
