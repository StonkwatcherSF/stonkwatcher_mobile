// Same mint allowlist and identity check as the main app's src/lib/verified.ts.
// Official status is independent of a fetched token's verified badge.
export const OFFICIAL_TOKENS: Readonly<Record<string, { name: string; symbol: string }>> = {
  AoHVuFNKTAEUc5aiC8HLWUWytNC3nkJ4jcnjyFQaiCJg: { name: "Stonk Watcher", symbol: "STWC" },
  "6GmAFSYs4gk3FDao5FzzySQpPZaWsa4rUJHacpMpUNgx": { name: "STONK", symbol: "STONK" },
};
export const OFFICIAL_BLOCK_MESSAGE = "Official coins cannot be blacklisted.";
export function isOfficialToken(mint?: string | null): boolean {
  return Boolean(mint && Object.hasOwn(OFFICIAL_TOKENS, mint.trim()));
}
