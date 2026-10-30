export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "https://www.stonkwatcher.xyz"
).replace(/\/$/, "");

export const STONKFUN_API_URL = "https://www.stonkfun.xyz/api/public/v1";

export const PARTNER_API_KEY = process.env.EXPO_PUBLIC_PARTNER_API_KEY || "";

export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const QUOTE_FILTERS = ["All Quotes", "SOL", "USDC"] as const;
export type QuoteFilter = (typeof QUOTE_FILTERS)[number];

export const QUOTE_MINTS: Record<QuoteFilter, string | undefined> = {
  "All Quotes": undefined,
  SOL: WSOL_MINT,
  USDC: USDC_MINT,
};

export const SEARCH_RECENTS_KEY = "stonkwatcher.search.recents";
