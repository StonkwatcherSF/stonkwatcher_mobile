const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function readRouteParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw.startsWith("[")) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export function isSolanaAddress(value: string) {
  return BASE58_RE.test(value.trim());
}

export function tokenMint(token?: { mint?: string | null; address?: string | null; id?: string | null } | null) {
  return (token?.mint || token?.address || token?.id || "").trim();
}

export function truncateAddress(value?: string | null, size = 6) {
  if (!value) return "—";
  const address = value.trim();
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}...${address.slice(-size)}`;
}
