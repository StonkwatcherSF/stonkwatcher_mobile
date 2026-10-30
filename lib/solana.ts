const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isSolanaAddress(value: string) {
  return BASE58_RE.test(value.trim());
}

export function truncateAddress(value?: string | null, size = 6) {
  if (!value) return "—";
  const address = value.trim();
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}...${address.slice(-size)}`;
}
