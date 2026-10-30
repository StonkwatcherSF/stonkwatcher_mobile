export type StonkFunToken = {
  mint: string;
  name?: string;
  symbol?: string;
  imageUrl?: string;
  logoUrl?: string;
  creator?: string;
  status?: string;
  createdAt?: string;
  graduatedAt?: string;
  quote?: {
    mint?: string;
    symbol?: string;
    name?: string;
    logoUrl?: string;
  };
  market?: {
    priceUsd?: number;
    marketCapUsd?: number;
    volume24hUsd?: number;
    priceChange24h?: number;
    liquidityUsd?: number;
  };
};

export type TokensPage = {
  tokens?: StonkFunToken[];
  pagination?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
  source?: string;
};

export type MarketQuote = {
  priceUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  holders: number | null;
  buys: number | null;
  sells: number | null;
};

export type OhlcvCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type OhlcvResponse = {
  candles?: OhlcvCandle[];
  price?: number | null;
  error?: string;
};

export type IntelTransfer = {
  id: string;
  at: string;
  signature: string;
  from: string;
  to: string;
  token: string;
  mint: string;
  amount: number;
  usd: number;
  side: "buy" | "sell" | "liquidity";
};

export type IntelResponse = {
  rows?: IntelTransfer[];
  total?: number;
};

export type TokenInfoPayload = {
  stats: {
    top10Pct: number | null;
    devPct: number | null;
    sniperPct: number | null;
    freezeAuth: "on" | "off" | null;
    mintAuth: "on" | "off" | null;
    dexPct: number | null;
    buybackPct: number | null;
    burnPct: number | null;
    clusterPct: number | null;
  };
  rewards: {
    enabled: boolean;
    quoteSymbol: string | null;
    paidUsd: number | null;
    paidTokens: number | null;
    pendingUsd: number | null;
    pendingTokens: number | null;
    payouts: number | null;
    holders: number | null;
    lastPayoutAt: string | null;
  } | null;
};

export type VolumeLeaderWindow = "24h" | "1w";

export type VolumeLeader = {
  rank: number;
  mint: string;
  name: string | null;
  symbol: string | null;
  imageUrl: string | null;
  volume24hUsd: number;
  marketCapUsd: number;
  newHolders: number | null;
  createdAt: string | null;
  graduatedAt: string;
};

export type VolumeLeadersResponse = {
  window?: VolumeLeaderWindow;
  rows?: VolumeLeader[];
};

export type TracerScoreRow = {
  signalType: string;
  points: number;
  reason: string;
};

export type TracerSignalRow = {
  signalType: string;
  severity: string;
  confidence: number;
  description: string;
};

export type TracerLaunchCard = {
  mint: string;
  name: string | null;
  symbol: string | null;
  createdAt: string | null;
  marketCapUsd: number | null;
  imageUrl?: string | null;
};

export type TracerLinkedWallet = {
  address: string;
  label: string;
  relation: string;
  txCount: number;
};

export type TracerCounterparty = {
  address: string;
  label: string;
  kind: string;
  direction: string;
  txCount: number;
};

export type BubbleClusterKind =
  | "dev"
  | "bundle"
  | "whale"
  | "organic"
  | "cex"
  | "magic"
  | "time"
  | "transfer";

export type BubbleMapNode = {
  id: string;
  kind: "wallet" | "token";
  label: string;
  amount: number;
  percentage: number | null;
  weight: number;
  isCreator: boolean;
  isPool: boolean;
  isMagic?: boolean;
  clusterKind: BubbleClusterKind;
};

export type BubbleMapData = {
  nodes?: BubbleMapNode[];
  links?: { id: string; source: string; target: string; type: string }[];
  summary?: {
    walletCount?: number;
    clusterCount?: number;
  };
  intel?: {
    score?: number;
    clusterCount?: number;
    magicCount?: number;
  };
};

export type TracerTokenView = {
  mint: string;
  name: string | null;
  symbol: string | null;
  creatorAddress: string | null;
  devHoldPct: number | null;
  supply: number | null;
  launchCount: number;
  stonkLaunchCount: number;
  outsideLaunchCount: number;
  sniperCount: number;
  clusterCount: number;
  launches: TracerLaunchCard[];
  bubbleMap: BubbleMapData;
  brief: {
    imageUrl: string | null;
    quoteSymbol: string | null;
    launchpad: string | null;
    status: string | null;
    priceUsd: number | null;
    marketCapUsd: number | null;
    liquidityUsd: number | null;
    volume24hUsd: number | null;
    firstSlot: number | null;
    lastAnalyzedAt: string | null;
    devAmount: number | null;
    holderCount: number | null;
    score: number | null;
    breakdown: TracerScoreRow[];
    signals: TracerSignalRow[];
  };
};

export type TracerPayload = {
  mode: "token" | "wallet";
  address: string;
  isDev?: boolean;
  stonkLaunchCount?: number;
  outsideLaunchCount?: number;
  fundingAccountCount?: number;
  launches?: TracerLaunchCard[];
  linkedWallets?: TracerLinkedWallet[];
  counterparties?: TracerCounterparty[];
  token: TracerTokenView | null;
};

export type BubbleMapResponse = {
  bubbleMap?: BubbleMapData;
  supply?: number | null;
};

export type AnalyzeResponse = {
  jobId?: string;
  mint?: string;
  status?: string;
  error?: string;
};
