import { STONKFUN_API_URL, STONKFUN_SITE } from "./config";
import type { TokenInfoPayload } from "./types";

const TOKEN_INFO_TTL_MS = 3 * 60_000;
const cache = new Map<string, { at: number; body: TokenInfoPayload }>();

type RugStats = {
  top10Pct: number | null;
  devPct: number | null;
  freezeAuth: "on" | "off" | null;
  mintAuth: "on" | "off" | null;
  dexPct: number | null;
  supply: number | null;
};

function num(value: unknown) {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function authState(value: unknown): "on" | "off" | null {
  if (value == null) return "off";
  if (typeof value === "string" && value.trim()) return "on";
  return null;
}

function pct(value: number | null) {
  if (value == null || !Number.isFinite(value) || value < 0) return null;
  return value;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStonkFunToken(mint: string) {
  const body = asRecord(await fetchJson(`${STONKFUN_API_URL}/tokens/${mint}`));
  const data = asRecord(body?.data) ?? body;
  return {
    token: asRecord(data?.token),
    launch: asRecord(data?.launch),
  };
}

async function fetchStonkFunRewards(mint: string) {
  const site = asRecord(await fetchJson(`${STONKFUN_SITE}/api/rewards?mint=${encodeURIComponent(mint)}`));
  if (site && (site.isRewardLaunch === true || site.enabled === true || num(site.distributedTokens) != null)) {
    return site;
  }
  const pub = asRecord(await fetchJson(`${STONKFUN_API_URL}/tokens/${mint}/rewards`));
  return asRecord(pub?.data) ?? pub;
}

async function fetchStonkFunBurns(mint: string) {
  return asRecord(await fetchJson(`${STONKFUN_SITE}/api/burns?mint=${encodeURIComponent(mint)}`));
}

async function fetchRugStats(mint: string): Promise<RugStats> {
  const empty: RugStats = {
    top10Pct: null,
    devPct: null,
    freezeAuth: null,
    mintAuth: null,
    dexPct: null,
    supply: null,
  };
  const body = asRecord(await fetchJson(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`, 9000));
  if (!body) return empty;
  const token = asRecord(body.token);
  const decimals = num(token?.decimals) ?? 0;
  const rawSupply = num(token?.supply);
  const supply = rawSupply != null ? rawSupply / 10 ** decimals : null;
  const price = num(body.price);
  const liquidity = num(body.totalMarketLiquidity);
  const mcap = price != null && supply != null ? price * supply : null;
  const markets = Array.isArray(body.markets) ? body.markets : [];
  const pools = new Set<string>();
  for (const market of markets) {
    const row = asRecord(market);
    const lp = asRecord(row?.lp);
    if (typeof row?.liquidityA === "string") pools.add(row.liquidityA);
    if (typeof row?.liquidityB === "string") pools.add(row.liquidityB);
    if (typeof row?.mintLP === "string") pools.add(row.mintLP);
    if (typeof lp?.liquidityA === "string") pools.add(lp.liquidityA);
    if (typeof lp?.liquidityB === "string") pools.add(lp.liquidityB);
  }
  const humans = (Array.isArray(body.topHolders) ? body.topHolders : [])
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .filter((row) => {
      const address = asText(row.address);
      const owner = asText(row.owner);
      return !(address && pools.has(address)) && !(owner && pools.has(owner));
    })
    .sort((a, b) => (num(b.pct) ?? 0) - (num(a.pct) ?? 0));
  const top10 = humans.slice(0, 10).reduce((sum, row) => sum + (num(row.pct) ?? 0), 0);
  const creator = asText(body.creator);
  const creatorBalance = num(body.creatorBalance);
  const creatorUi =
    creatorBalance != null && supply != null && supply > 0 && creatorBalance > supply * 2
      ? creatorBalance / 10 ** decimals
      : creatorBalance;
  const creatorHold = humans.find((row) => asText(row.owner) === creator);
  const devPct =
    creatorUi != null && supply
      ? (creatorUi / supply) * 100
      : num(creatorHold?.pct);
  const largestPool = (Array.isArray(body.topHolders) ? body.topHolders : [])
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .filter((row) => pools.has(asText(row.address) ?? "") || pools.has(asText(row.owner) ?? ""))
    .reduce((max, row) => Math.max(max, num(row.pct) ?? 0), 0);
  return {
    top10Pct: humans.length ? top10 : null,
    devPct,
    freezeAuth: authState(body.freezeAuthority ?? token?.freezeAuthority),
    mintAuth: authState(body.mintAuthority ?? token?.mintAuthority),
    dexPct: mcap && mcap > 0 && liquidity != null ? (liquidity / mcap) * 100 : largestPool > 0 ? largestPool : null,
    supply,
  };
}

function burnTokens(raw: Record<string, unknown> | null) {
  const totals = asRecord(raw?.totals);
  const buybacks = asRecord(raw?.buybackTotals);
  const rewards = asRecord(raw?.rewardTotals);
  const all = asRecord(raw?.allTotals);
  const fees = num(totals?.amountTokens) ?? 0;
  const buyback = num(buybacks?.amountTokens) ?? 0;
  const reward = num(rewards?.amountTokens) ?? 0;
  const combined = fees + buyback + reward;
  const allAmount = num(all?.amountTokens) ?? 0;
  return {
    buyback,
    burned: combined > 0 ? combined : allAmount,
  };
}

function mapRewards(raw: Record<string, unknown> | null): TokenInfoPayload["rewards"] {
  if (!raw) return null;
  const nested = asRecord(raw.rewards);
  const quote = asRecord(raw.quote);
  const mode = asText(raw.mode);
  const enabled =
    raw.isRewardLaunch === true ||
    raw.enabled === true ||
    mode === "reward" ||
    num(raw.distributedTokens) != null ||
    num(nested?.distributedTokens) != null;
  const paidTokens = num(raw.distributedTokens) ?? num(nested?.distributedTokens);
  const pendingQuoteTokens = num(raw.pendingTokens) ?? num(nested?.undistributedTokens);
  const awaiting = num(raw.awaitingDeliveryTokens) ?? num(nested?.inFlightTokens) ?? 0;
  const pendingTokens =
    pendingQuoteTokens == null ? null : Math.max(0, pendingQuoteTokens - awaiting);
  return {
    enabled: raw.isRewardLaunch !== false && raw.enabled !== false && mode !== "standard" && enabled,
    quoteSymbol: asText(raw.quoteSymbol) ?? asText(quote?.symbol),
    paidUsd: num(raw.distributedUsd),
    paidTokens,
    pendingUsd: num(raw.pendingUsd),
    pendingTokens,
    payouts: num(raw.payoutCount) ?? num(nested?.payoutCount),
    holders: num(raw.holderCount) ?? num(nested?.holderCount),
    lastPayoutAt: asText(raw.lastPayoutAt) ?? asText(nested?.lastPayoutAt),
  };
}

export async function fetchPublicTokenInfo(mint: string): Promise<TokenInfoPayload> {
  const cached = cache.get(mint);
  if (cached && Date.now() - cached.at < TOKEN_INFO_TTL_MS) return cached.body;

  const [stonk, rewardsRaw, burnsRaw, rug] = await Promise.all([
    fetchStonkFunToken(mint).catch(() => ({ token: null, launch: null })),
    fetchStonkFunRewards(mint).catch(() => null),
    fetchStonkFunBurns(mint).catch(() => null),
    fetchRugStats(mint).catch(() => ({
      top10Pct: null,
      devPct: null,
      freezeAuth: null,
      mintAuth: null,
      dexPct: null,
      supply: null,
    })),
  ]);

  const market = asRecord(stonk.token?.market);
  const priceUsd = num(market?.priceUsd);
  const marketCapUsd = num(market?.marketCapUsd);
  const supply =
    rug.supply ??
    (priceUsd && priceUsd > 0 && marketCapUsd ? marketCapUsd / priceUsd : null);
  const burns = burnsRaw ? burnTokens(burnsRaw) : null;
  const body: TokenInfoPayload = {
    stats: {
      top10Pct: pct(rug.top10Pct),
      devPct: pct(rug.devPct),
      sniperPct: null,
      freezeAuth: rug.freezeAuth,
      mintAuth: rug.mintAuth,
      dexPct: pct(rug.dexPct),
      buybackPct: burns && supply && supply > 0 ? pct((burns.buyback / supply) * 100) : null,
      burnPct: burns && supply && supply > 0 ? pct((burns.burned / supply) * 100) : null,
      clusterPct: null,
    },
    rewards: mapRewards(rewardsRaw),
  };
  if (
    body.rewards ||
    body.stats.top10Pct != null ||
    body.stats.burnPct != null ||
    body.stats.freezeAuth != null
  ) {
    cache.set(mint, { at: Date.now(), body });
  }
  return body;
}
