import { ALL_QUOTES, USDC_MINT, WSOL_MINT, type SelectedQuote } from "./config";
import type { StonkFunToken } from "./types";

export function prettyQuoteSymbol(symbol?: string | null, mint?: string | null) {
  const raw = (symbol || "").replace(/^\$/, "").trim();
  const upper = raw.toUpperCase();
  if (upper === "WSOL" || mint === WSOL_MINT) return "SOL";
  if (upper === "USDC" || mint === USDC_MINT) return "USDC";
  return raw;
}

export function matchesQuote(token: StonkFunToken, quote?: SelectedQuote | null) {
  if (!quote || quote.symbol === "All Quotes") return true;
  const symbol = prettyQuoteSymbol(token.quote?.symbol, token.quote?.mint).toUpperCase();
  if (quote.symbol && symbol === quote.symbol.toUpperCase()) return true;
  if (quote.mint && token.quote?.mint === quote.mint) return true;
  return false;
}

export function quotesFromTokens(tokens: StonkFunToken[]): SelectedQuote[] {
  const seen = new Set<string>();
  const quotes: SelectedQuote[] = [ALL_QUOTES];
  for (const token of tokens) {
    const mint = token.quote?.mint?.trim();
    const symbol = prettyQuoteSymbol(token.quote?.symbol, mint);
    if (!symbol) continue;
    const key = symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    quotes.push({ symbol, mint });
  }
  return quotes;
}

export function mergeQuoteOptions(fromTokens: SelectedQuote[], fromCatalog?: SelectedQuote[] | null) {
  const seen = new Set(fromTokens.map((row) => row.symbol.toUpperCase()));
  const merged = [...fromTokens];
  for (const row of fromCatalog ?? []) {
    const key = row.symbol.toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged.length > 1 ? merged : fromTokens;
}
