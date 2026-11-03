import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { fetchPortfolioPrices } from "../lib/portfolio-market";
import { usePortfolioHistory } from "../hooks/usePortfolioHistory";
import type { EquityPoint } from "../lib/portfolio-equity";
import { MOCK_PORTFOLIO_KEY, MOCK_STARTING_CASH, MOCK_TRADE_FEE } from "../lib/config";

export type MockPosition = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  verified?: boolean;
  tokens: number;
  investedUsd: number;
  avgEntryMc: number | null;
  lastPriceUsd: number;
  openedAt: string;
  updatedAt: string;
};

export type MockClosedPosition = MockPosition & {
  closedAt: string;
  proceedsUsd: number;
  pnlUsd: number;
  pnlPct: number;
};

export type MockTrade = {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  verified?: boolean;
  mode: "buy" | "sell";
  usd: number;
  tokens: number;
  priceUsd: number;
  pnlUsd?: number;
  at: string;
};

export type MockTradeInput = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  verified?: boolean;
  amountUsd: number;
  priceUsd: number;
  marketCapUsd?: number | null;
};

type PortfolioState = {
  cash: number;
  positions: MockPosition[];
  closed: MockClosedPosition[];
  trades: MockTrade[];
};

type TradeResult = { ok: true } | { ok: false; error: string };
type ApplyResult = { state: PortfolioState } | { ok: false; error: string };

type Store = PortfolioState & {
  ready: boolean;
  equityHistory: EquityPoint[];
  historyReady: boolean;
  buy: (input: MockTradeInput) => TradeResult;
  sell: (input: MockTradeInput) => TradeResult;
  positionFor: (mint: string) => MockPosition | undefined;
};

const EMPTY: PortfolioState = {
  cash: MOCK_STARTING_CASH,
  positions: [],
  closed: [],
  trades: [],
};

const Context = createContext<Store | null>(null);

export function positionValue(position: MockPosition, livePrice?: number | null) {
  const price = livePrice && livePrice > 0 ? livePrice : position.lastPriceUsd;
  if (price > 0) return position.tokens * price;
  return position.investedUsd;
}

export function positionPnl(position: MockPosition, livePrice?: number | null) {
  const value = positionValue(position, livePrice);
  const pnl = value - position.investedUsd;
  const pct = position.investedUsd > 0 ? (pnl / position.investedUsd) * 100 : 0;
  return { value, pnl, pct };
}

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeSymbol(symbol: string) {
  return symbol.replace(/^\$/, "").trim() || "TOKEN";
}

function parseState(raw: string | null): PortfolioState {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<PortfolioState>;
    return {
      cash: Number.isFinite(parsed.cash) ? Number(parsed.cash) : MOCK_STARTING_CASH,
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      closed: Array.isArray(parsed.closed) ? parsed.closed : [],
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
    };
  } catch {
    return EMPTY;
  }
}

let persistence = Promise.resolve();
function persist(state: PortfolioState) {
  persistence = persistence.then(() => AsyncStorage.setItem(MOCK_PORTFOLIO_KEY, JSON.stringify(state))).catch(() => undefined);
  return persistence;
}

function applyBuy(state: PortfolioState, input: MockTradeInput): ApplyResult {
  const amount = Number(input.amountUsd);
  const price = Number(input.priceUsd);
  const mint = input.mint?.trim();
  if (!mint) return { ok: false, error: "Missing token." };
  if (!(amount > MOCK_TRADE_FEE)) return { ok: false, error: "Enter an amount above the demo fee." };
  if (!(price > 0)) return { ok: false, error: "No live price yet." };
  if (amount > state.cash + 1e-9) return { ok: false, error: "Not enough demo cash." };
  const tokens = (amount - MOCK_TRADE_FEE) / price;
  if (!(tokens > 0)) return { ok: false, error: "Amount is too small." };
  const now = new Date().toISOString();
  const existing = state.positions.find((row) => row.mint === mint);
  const nextPosition: MockPosition = existing
    ? {
        ...existing,
        name: input.name || existing.name,
        symbol: normalizeSymbol(input.symbol || existing.symbol),
        imageUrl: input.imageUrl ?? existing.imageUrl,
        verified: input.verified === true,
        tokens: existing.tokens + tokens,
        investedUsd: existing.investedUsd + amount,
        avgEntryMc:
          existing.avgEntryMc != null && input.marketCapUsd != null
            ? (existing.avgEntryMc * existing.investedUsd + input.marketCapUsd * amount) /
              (existing.investedUsd + amount)
            : input.marketCapUsd ?? existing.avgEntryMc,
        lastPriceUsd: price,
        updatedAt: now,
      }
    : {
        mint,
        name: input.name,
        symbol: normalizeSymbol(input.symbol),
        imageUrl: input.imageUrl,
        verified: input.verified === true,
        tokens,
        investedUsd: amount,
        avgEntryMc: input.marketCapUsd ?? null,
        lastPriceUsd: price,
        openedAt: now,
        updatedAt: now,
      };
  const trade: MockTrade = {
    id: newId(),
    mint,
    name: nextPosition.name,
    symbol: nextPosition.symbol,
    imageUrl: nextPosition.imageUrl,
    verified: nextPosition.verified === true,
    mode: "buy",
    usd: amount,
    tokens,
    priceUsd: price,
    pnlUsd: 0,
    at: now,
  };
  return {
    state: {
      cash: state.cash - amount,
      positions: [nextPosition, ...state.positions.filter((row) => row.mint !== mint)],
      closed: state.closed,
      trades: [trade, ...state.trades].slice(0, 50),
    },
  };
}

function applySell(state: PortfolioState, input: MockTradeInput): ApplyResult {
  const amount = Number(input.amountUsd);
  const price = Number(input.priceUsd);
  const mint = input.mint?.trim();
  const savedPosition = state.positions.find((row) => row.mint === mint);
  const position = savedPosition ? { ...savedPosition, verified: input.verified === true } : undefined;
  if (!mint || !position) return { ok: false, error: "No demo position to sell." };
  if (!(amount > 0)) return { ok: false, error: "Enter an amount to sell." };
  if (!(price > 0)) return { ok: false, error: "No live price yet." };
  const value = positionValue(position, price);
  if (!(value > 0)) return { ok: false, error: "This demo position has no value." };
  const sellUsd = Math.min(amount, value);
  const fraction = Math.min(1, sellUsd / value);
  const tokensSold = position.tokens * fraction;
  const investedSold = position.investedUsd * fraction;
  const proceeds = Math.max(0, sellUsd - MOCK_TRADE_FEE);
  const realized = proceeds - investedSold;
  const now = new Date().toISOString();
  const remainingTokens = position.tokens - tokensSold;
  const remainingInvested = position.investedUsd - investedSold;
  const trade: MockTrade = {
    id: newId(),
    mint,
    name: position.name,
    symbol: position.symbol,
    imageUrl: position.imageUrl,
    verified: position.verified === true,
    mode: "sell",
    usd: proceeds,
    tokens: tokensSold,
    priceUsd: price,
    pnlUsd: realized,
    at: now,
  };
  const trades = [trade, ...state.trades].slice(0, 50);
  if (remainingTokens <= 1e-9 || remainingInvested <= 1e-9 || fraction >= 0.999) {
    const closed: MockClosedPosition = {
      ...position,
      tokens: 0,
      investedUsd: investedSold,
      lastPriceUsd: price,
      updatedAt: now,
      closedAt: now,
      proceedsUsd: proceeds,
      pnlUsd: realized,
      pnlPct: investedSold > 0 ? (realized / investedSold) * 100 : 0,
    };
    return {
      state: {
        cash: state.cash + proceeds,
        positions: state.positions.filter((row) => row.mint !== mint),
        closed: [closed, ...state.closed].slice(0, 50),
        trades,
      },
    };
  }
  return {
    state: {
      cash: state.cash + proceeds,
      positions: state.positions.map((row) =>
        row.mint === mint
          ? {
              ...row,
              verified: position.verified === true,
              tokens: remainingTokens,
              investedUsd: remainingInvested,
              lastPriceUsd: price,
              updatedAt: now,
            }
          : row,
      ),
      closed: state.closed,
      trades,
    },
  };
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PortfolioState>(EMPTY);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(MOCK_PORTFOLIO_KEY)
      .then((raw) => {
        if (!cancelled) setState(parseState(raw));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buy = useCallback((input: MockTradeInput): TradeResult => {
    const next = applyBuy(stateRef.current, input);
    if ("error" in next) return next;
    stateRef.current = next.state;
    setState(next.state);
    void persist(next.state);
    return { ok: true };
  }, []);

  const sell = useCallback((input: MockTradeInput): TradeResult => {
    const next = applySell(stateRef.current, input);
    if ("error" in next) return next;
    stateRef.current = next.state;
    setState(next.state);
    void persist(next.state);
    return { ok: true };
  }, []);

  const mintKey = state.positions.map((row) => row.mint).sort().join(",");
  useEffect(() => {
    if (!ready || !mintKey) return;
    let canceled = false;
    let busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    async function refresh() {
      if (canceled || busy || AppState.currentState !== "active") return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 6_000);
      try {
        const prices = await fetchPortfolioPrices(mintKey.split(","), controller.signal);
        if (canceled || AppState.currentState !== "active") return;
        // Apply to the latest state: a trade may complete while prices are loading.
        const current = stateRef.current;
        const positions = current.positions.map((position) => {
          const price = prices.get(position.mint);
          return price && price !== position.lastPriceUsd ? { ...position, lastPriceUsd: price } : position;
        });
        if (positions.some((position, i) => position !== current.positions[i])) {
          const next = { ...current, positions };
          stateRef.current = next;
          setState(next);
          void persist(next);
        }
      } finally {
        clearTimeout(timeout);
        busy = false;
        if (!canceled && AppState.currentState === "active") timer = setTimeout(refresh, 10_000);
      }
    }
    const subscription = AppState.addEventListener("change", (status) => {
      clearTimeout(timer);
      if (status === "active") void refresh();
      else controller?.abort();
    });
    void refresh();
    return () => { canceled = true; clearTimeout(timer); controller?.abort(); subscription.remove(); };
  }, [mintKey, ready]);

  const total = state.cash + state.positions.reduce((sum, position) => sum + positionValue(position), 0);
  const { history: equityHistory, historyReady } = usePortfolioHistory(total, ready);

  const value = useMemo<Store>(
    () => ({
      ...state,
      ready,
      equityHistory,
      historyReady,
      buy,
      sell,
      positionFor: (mint: string) => state.positions.find((row) => row.mint === mint),
    }),
    [state, ready, buy, sell, equityHistory, historyReady],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function utcDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function monthPnlByDay(
  trades: MockTrade[],
  positions: MockPosition[],
  year: number,
  monthIndex: number,
) {
  const map: Record<number, number> = {};
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  const add = (iso: string, amount: number) => {
    const key = utcDateKey(iso);
    if (!key.startsWith(prefix) || !amount) return;
    const day = Number(key.slice(8, 10));
    if (!Number.isFinite(day)) return;
    map[day] = (map[day] ?? 0) + amount;
  };
  for (const trade of trades) add(trade.at, trade.pnlUsd ?? 0);
  for (const position of positions) add(position.updatedAt || position.openedAt, positionPnl(position).pnl);
  return map;
}

export function mintPnl(trades: MockTrade[], mint: string, dayKey?: string) {
  return trades.reduce((sum, trade) => {
    if (trade.mint !== mint) return sum;
    if (dayKey && utcDateKey(trade.at) !== dayKey) return sum;
    return sum + (trade.pnlUsd ?? 0);
  }, 0);
}

export function usePortfolio() {
  const context = useContext(Context);
  if (!context) throw new Error("usePortfolio must be used inside PortfolioProvider");
  return context;
}
