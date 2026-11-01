export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "https://www.stonkwatcher.xyz"
).replace(/\/$/, "");

export const STONKFUN_SITE = "https://stonkfun.xyz";
export const STONKFUN_API_URL = `${STONKFUN_SITE}/api/public/v1`;

export const PARTNER_API_KEY = process.env.EXPO_PUBLIC_PARTNER_API_KEY || "";

export const SUPABASE_URL = (
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://plwtrcbnkoolwpziwncs.supabase.co"
).replace(/\/$/, "");

export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

export const AUTH_REDIRECT_PATH = "auth/callback";

export const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const SEARCH_RECENTS_KEY = "stonkwatcher.search.recents";
export const MOCK_PORTFOLIO_KEY = "stonkwatcher.mock-portfolio";
export const MOCK_STARTING_CASH = 93737.34;
export const MOCK_TRADE_FEE = 0.95;

export type SelectedQuote = {
  symbol: string;
  mint?: string;
};

export const ALL_QUOTES: SelectedQuote = { symbol: "All Quotes" };

export const FALLBACK_QUOTES: SelectedQuote[] = [
  ALL_QUOTES,
  { symbol: "SOL", mint: WSOL_MINT },
  { symbol: "USDC", mint: USDC_MINT },
];
