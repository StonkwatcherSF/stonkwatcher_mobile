import { ApiError, apiGet, apiPost } from "./api";
import { fetchPublicOhlcv, fetchStonkFunTokens } from "./public-data";
import type {
  AnalyzeResponse,
  BubbleMapResponse,
  IntelResponse,
  MarketQuote,
  OhlcvResponse,
  TokenInfoPayload,
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
  try {
    return await apiGet<TokensPage>("/api/tokens", {
      sort: params.sort ?? "volume",
      q: params.q,
      quoteMint: params.quoteMint,
      pageSize: params.pageSize ?? 50,
      raw: params.raw ? 1 : undefined,
      fast: params.fast ? 1 : undefined,
    });
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    return fetchStonkFunTokens(params);
  }
}

export function fetchMarket(mint: string) {
  return apiGet<MarketQuote>("/api/dex/market", { mint });
}

export async function fetchOhlcv(mint: string, tf: string) {
  try {
    return await apiGet<OhlcvResponse>("/api/ohlcv", { tokenAddress: mint, tf });
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    return { candles: await fetchPublicOhlcv(mint, tf), source: "geckoterminal" };
  }
}

export function fetchIntel(mint: string, name?: string, symbol?: string) {
  return apiGet<IntelResponse>("/api/intel", { mint, name, symbol });
}

export function fetchTokenInfo(mint: string) {
  return apiGet<TokenInfoPayload>("/api/dex/token-info", { mint });
}

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
  const view: TracerTokenView = {
    mint: token.mint,
    name: token.name ?? null,
    symbol: token.symbol ?? null,
    creatorAddress: token.creator ?? null,
    devHoldPct: info?.stats.devPct ?? null,
    supply: null,
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
      devAmount: null,
      holderCount: info?.rewards?.holders ?? market?.holders ?? null,
      score: bubble?.bubbleMap?.intel?.score ?? null,
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

export async function fetchTracer(address: string, fresh = false) {
  try {
    return await apiGet<TracerPayload>(`/api/tracer/${encodeURIComponent(address)}`, {
      fresh: fresh ? 1 : undefined,
    });
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    return publicTokenTrace(address);
  }
}

export function queueAnalyze(mint: string) {
  return apiPost<AnalyzeResponse>("/api/analyze", { mint });
}

export function fetchBubbleMap(mint: string) {
  return apiGet<BubbleMapResponse>(`/api/tokens/${encodeURIComponent(mint)}/bubble-v2`);
}
