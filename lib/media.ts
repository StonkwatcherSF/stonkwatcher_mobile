import { API_URL, STONKFUN_SITE } from "./config";

export function resolveMediaUrl(url?: string | null) {
  if (!url) return null;
  const text = url.trim();
  if (!text) return null;
  if (text.startsWith("ipfs://")) {
    const path = text.slice("ipfs://".length).replace(/^ipfs\//, "");
    return path ? `https://ipfs.io/ipfs/${path}` : null;
  }
  if (text.startsWith("ar://")) {
    const path = text.slice("ar://".length);
    return path ? `https://arweave.net/${path}` : null;
  }
  if (text.startsWith("http://") || text.startsWith("https://")) return text;
  if (text.startsWith("/api/asset/")) return `${STONKFUN_SITE}${text}`;
  if (text.startsWith("/")) return `${API_URL}${text}`;
  if (/^[a-zA-Z0-9]{46,}$/.test(text)) return `https://ipfs.io/ipfs/${text}`;
  return text;
}

export function tokenLogoUrl(mint?: string | null) {
  if (!mint) return null;
  return `${STONKFUN_SITE}/api/asset/logo/${mint}`;
}

export function quoteLogoUrl(mint?: string | null) {
  if (!mint) return null;
  return `${STONKFUN_SITE}/api/asset/quote-logo/${mint}`;
}

export function dexLogoUrl(mint?: string | null) {
  if (!mint) return null;
  return `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`;
}

export function mediaCandidates(uri?: string | null, mint?: string | null) {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const value of [resolveMediaUrl(uri), tokenLogoUrl(mint), dexLogoUrl(mint)]) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    rows.push(value);
  }
  return rows;
}
