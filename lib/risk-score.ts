import type { BubbleMapData, BubbleMapNode, TracerScoreRow, TracerSignalRow } from "./types";

/**
 * Same transparent index as Stonk Watcher web (`src/lib/risk/engine.ts`
 * and `src/lib/bubble-live-score.ts`). Base 10, one contribution per
 * signal type, clamped 0–100. Bubble-map "healthy" intel is not this score.
 */
const SCORE_WEIGHTS: Record<string, { high: number; moderate: number; positive: number }> = {
  bundle_coordinated: { high: 16, moderate: 9, positive: 0 },
  coordinated_timing: { high: 8, moderate: 5, positive: 0 },
  early_buyers: { high: 0, moderate: 0, positive: 0 },
  early_concentration: { high: 0, moderate: 0, positive: 0 },
  cluster_supply: { high: 30, moderate: 25, positive: -25 },
  flagged_holders: { high: 14, moderate: 8, positive: 0 },
  rapid_selling: { high: 12, moderate: 7, positive: -4 },
  creator_selling: { high: 14, moderate: 8, positive: -4 },
  liquidity_events: { high: 16, moderate: 10, positive: 0 },
  token_fees: { high: 10, moderate: 5, positive: 0 },
  thin_holders: { high: 12, moderate: 8, positive: 0 },
  shared_funding: { high: 10, moderate: 6, positive: 0 },
  wallet_reuse: { high: 12, moderate: 7, positive: 0 },
  repeated_clusters: { high: 10, moderate: 6, positive: 0 },
  abnormal_holders: { high: 10, moderate: 5, positive: -5 },
  airdrop_distribution: { high: 0, moderate: 0, positive: 0 },
};

const BASE_SCORE = 10;
const BIG_CLUSTER = 10;
const MID_CLUSTER = 5;
const HUGE_CLUSTER = 15;
const MANY_CLUSTERS = 3;
const MANY_LARGE = 2;
const TIGHT_TOP10 = 30;
const REPLACE_ALWAYS = new Set(["cluster_supply", "repeated_clusters"]);
const REPLACE_V2 = new Set(["bundle_coordinated", "coordinated_timing", "abnormal_holders"]);

const PROTOCOL_HOLDERS = new Set([
  "11111111111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5n",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "ComputeBudget111111111111111111111111111111",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
  "6BwHHDg3u1854jC8PDLXvR4spTcLNaoBxLJNGC4nTESt",
  "4E876qZTE9FJMrBzgVtBrSrzz2TLivB5Y5QXPjB4gZL7",
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  "5CEbueQnq1Ym2uSSx2xXds3jQAqT1BDnkA59RZobSPAG",
  "5KXDF6QnqhBj72hDtJNkkpFaQVUfbFXNybMsp3DiK6tD",
  "HuBMeYW3aDn8BH65fo8xxbP4oiexyup8udzKyccgi8Ga",
  "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX",
  "SysvarRent111111111111111111111111111111111",
  "SysvarC1ock11111111111111111111111111111111",
  "Vote111111111111111111111111111111111111111",
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
  "5Q544fK5rUidLiOhEe2z5s7RB7atyTFzHzR7Js2KE79",
  "GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL",
  "1nc1nerator11111111111111111111111111111111",
]);

type Severity = "high" | "moderate" | "positive" | "info";

type Signal = {
  signalType: string;
  severity: Severity;
  confidence: number;
  description: string;
};

type ClusterRow = { key: string; members: number; share: number };

function formatShare(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  if (value > 0 && value < 0.01) return "<0.01%";
  return `${value.toFixed(2)}%`;
}

function isProtocolHolder(address?: string | null) {
  if (!address) return true;
  return PROTOCOL_HOLDERS.has(address);
}

function pointsFor(type: string, severity: Severity) {
  const spec = SCORE_WEIGHTS[type];
  if (!spec) return 0;
  if (severity === "high") return spec.high;
  if (severity === "moderate") return spec.moderate;
  if (severity === "positive") return spec.positive;
  return 0;
}

function severityRank(severity: Severity) {
  if (severity === "high") return 4;
  if (severity === "moderate") return 3;
  if (severity === "positive") return 2;
  return 1;
}

function asSeverity(value: string): Severity {
  if (value === "high" || value === "moderate" || value === "positive" || value === "info") return value;
  return "info";
}

export function scoreSignals(signals: Signal[]) {
  const byType = new Map<string, Signal[]>();
  for (const signal of signals) {
    const list = byType.get(signal.signalType) ?? [];
    list.push(signal);
    byType.set(signal.signalType, list);
  }

  const breakdown: TracerScoreRow[] = [
    {
      signalType: "base",
      points: BASE_SCORE,
      reason: "Starting index before evidence-backed signals are applied.",
    },
  ];

  let total = BASE_SCORE;
  for (const [type, list] of byType) {
    const ranked = [...list].sort((a, b) => {
      const rank = severityRank(b.severity) - severityRank(a.severity);
      if (rank !== 0) return rank;
      return Math.abs(pointsFor(type, b.severity)) - Math.abs(pointsFor(type, a.severity));
    });
    const chosen = ranked[0];
    const points = pointsFor(type, chosen.severity);
    if (points === 0) {
      if (type === "airdrop_distribution") {
        breakdown.push({ signalType: type, points: 0, reason: chosen.description });
      }
      continue;
    }
    total += points;
    breakdown.push({ signalType: type, points, reason: chosen.description });
  }

  const [base, ...rest] = breakdown;
  rest.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  const ordered = [base, ...rest];
  const raw = Math.round(total);
  const score = Math.round(Math.min(100, Math.max(0, total)));
  if (score !== raw) {
    ordered.push({
      signalType: "clamp",
      points: score - raw,
      reason: score === 0 ? "Index is floored at 0." : "Index is capped at 100.",
    });
  }
  return { score, breakdown: ordered };
}

function holderClusters(nodes: BubbleMapNode[]): ClusterRow[] {
  const groups = new Map<string, ClusterRow>();
  for (const node of nodes) {
    const group = node.group ?? -1;
    if (node.kind !== "wallet" || node.isPool || node.isMagic || node.isTimeNode || isProtocolHolder(node.address)) continue;
    if (node.clusterKind === "organic" || node.clusterKind === "cex" || node.clusterKind === "dev") continue;
    if (group < 0) continue;
    const key = `${node.clusterKind}:${group}`;
    const row = groups.get(key) ?? { key, members: 0, share: 0 };
    row.members += 1;
    row.share += node.percentage ?? 0;
    groups.set(key, row);
  }
  return [...groups.values()].filter((row) => row.members >= 2).sort((a, b) => b.share - a.share);
}

function largeWallets(nodes: BubbleMapNode[]) {
  return nodes
    .filter((node) => {
      if (node.kind !== "wallet" || node.isPool || node.isCreator || node.isMagic || node.isTimeNode) return false;
      if (isProtocolHolder(node.address) || node.label === "Contract") return false;
      if (node.clusterKind === "cex" || node.clusterKind === "dev") return false;
      return (node.percentage ?? 0) >= BIG_CLUSTER;
    })
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
}

function retailHolders(nodes: BubbleMapNode[]) {
  return nodes.filter((node) => {
    if (node.kind !== "wallet" || node.isPool || node.isMagic || node.isTimeNode) return false;
    if (isProtocolHolder(node.address) || node.label === "Contract") return false;
    if (node.clusterKind === "cex") return false;
    return (node.percentage ?? 0) > 0;
  });
}

function top10Share(nodes: BubbleMapNode[]) {
  return retailHolders(nodes)
    .slice()
    .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
    .slice(0, 10)
    .reduce((sum, node) => sum + (node.percentage ?? 0), 0);
}

function liveClusterSignals(map: BubbleMapData): Signal[] {
  const nodes = map.nodes ?? [];
  const clusters = holderClusters(nodes);
  const whales = largeWallets(nodes);
  const intel = map.intel;
  const largestCluster = intel?.split?.clusterPct ?? clusters[0]?.share ?? 0;
  const largestWhale = whales[0]?.percentage ?? 0;
  const largest = Math.max(largestCluster, largestWhale);
  const clusterCount = clusters.length;
  const clusteredWallets = new Set(
    nodes
      .filter((node) => clusters.some((row) => row.key === `${node.clusterKind}:${node.group ?? -1}`))
      .map((node) => node.id),
  );
  const loneWhales = whales.filter((node) => !clusteredWallets.has(node.id)).length;
  const largeCount = clusters.filter((row) => row.share >= BIG_CLUSTER).length + loneWhales;
  const many = clusterCount >= MANY_CLUSTERS || largeCount >= MANY_LARGE;
  const v2 = map.edition === "v2";
  const signals: Signal[] = [];

  if (largest >= BIG_CLUSTER) {
    const huge = largest >= HUGE_CLUSTER || many;
    signals.push({
      signalType: "cluster_supply",
      severity: huge ? "high" : "moderate",
      confidence: huge ? 0.9 : 0.8,
      description: many
        ? `Linked clusters hold ${formatShare(largest)} at the top, with ${clusterCount} connected group${clusterCount === 1 ? "" : "s"} on the holder map. That unlocked book can move together.`
        : `A linked cluster holds ${formatShare(largest)} of supply on the holder map. A 10%+ unlocked book can be sold and adds dump risk.`,
    });
  } else if (v2) {
    signals.push({
      signalType: "cluster_supply",
      severity: "info",
      confidence: 0.5,
      description: "No linked cluster currently holds 10% or more of supply on the V2 holder map.",
    });
  }

  if (many) {
    signals.push({
      signalType: "repeated_clusters",
      severity: clusterCount >= 6 || largeCount >= 3 ? "high" : "moderate",
      confidence: 0.82,
      description: largeCount
        ? `${clusterCount} connected wallet group${clusterCount === 1 ? "" : "s"} (${largeCount} at 10%+) on the holder map. Many clusters raise coordination risk.`
        : `${clusterCount} connected wallet group${clusterCount === 1 ? "" : "s"} on the holder map. Many clusters raise coordination risk.`,
    });
  }

  const top10Pct = top10Share(nodes);
  const midClusters = clusters.filter((row) => row.share >= MID_CLUSTER).length;
  if (top10Pct > TIGHT_TOP10 && midClusters >= 2) {
    const tight = top10Pct >= 50 || midClusters >= 4;
    signals.push({
      signalType: "abnormal_holders",
      severity: tight ? "high" : "moderate",
      confidence: tight ? 0.78 : 0.7,
      description: `Top 10 holders control ${formatShare(top10Pct)} of supply, and ${midClusters} linked cluster${midClusters === 1 ? "" : "s"} each hold 5%+. That book is concentrated enough to move together.`,
    });
  }

  if (v2 && intel) {
    if ((intel.bundleWallets ?? 0) >= 3) {
      const bundles = intel.bundleWallets ?? 0;
      signals.push({
        signalType: "bundle_coordinated",
        severity: bundles >= 6 ? "high" : "moderate",
        confidence: 0.84,
        description: `${bundles} wallets bought in the same launch bundle or launch slot on the V2 map.`,
      });
    }
    if ((intel.timeGroups ?? 0) >= 1) {
      const groups = intel.timeGroups ?? 0;
      signals.push({
        signalType: "coordinated_timing",
        severity: groups >= 3 ? "high" : "moderate",
        confidence: 0.8,
        description: `${groups} time group${groups === 1 ? "" : "s"} show wallets funded or activated together on the V2 map.`,
      });
    }
  }

  return signals;
}

export function scoreWithMapClusters(input: {
  mint: string;
  signals: TracerSignalRow[];
  map: BubbleMapData;
}) {
  const live = liveClusterSignals(input.map);
  const v2 = input.map.edition === "v2";
  const liveRisk = live.some((row) => row.severity === "high" || row.severity === "moderate");
  if (!v2 && !liveRisk) return null;

  const liveTypes = new Set(live.map((row) => row.signalType));
  const replace = new Set<string>();
  if (v2) {
    for (const type of REPLACE_ALWAYS) replace.add(type);
    for (const type of REPLACE_V2) {
      if (liveTypes.has(type)) replace.add(type);
    }
  } else {
    for (const type of liveTypes) replace.add(type);
  }

  const kept: Signal[] = input.signals
    .filter((row) => !replace.has(row.signalType))
    .map((row) => ({
      signalType: row.signalType,
      severity: asSeverity(row.severity),
      confidence: row.confidence ?? 0.6,
      description: row.description || row.signalType,
    }));
  return scoreSignals([...kept, ...live]);
}
