import { isSolanaAddress } from "./solana";

type Pair = { chainId?: string; baseToken?: { address?: string }; priceUsd?: string; liquidity?: { usd?: number } };

export async function fetchPortfolioPrices(mints: string[], signal: AbortSignal) {
  const prices = new Map<string, number>();
  const unique = [...new Set(mints)].filter(isSolanaAddress);
  for (let i = 0; i < unique.length && !signal.aborted; i += 30) {
    const batch = unique.slice(i, i + 30);
    try {
      const response = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${batch.join(",")}`, { signal, headers: { Accept: "application/json" } });
      if (!response.ok) continue;
      const pairs = await response.json() as Pair[];
      if (!Array.isArray(pairs)) continue;
      const liquidity = new Map<string, number>();
      for (const pair of pairs) {
        const mint = pair.baseToken?.address;
        const price = Number(pair.priceUsd);
        const depth = pair.liquidity?.usd ?? 0;
        if (pair.chainId !== "solana" || !mint || !batch.includes(mint) || !Number.isFinite(price) || price <= 0) continue;
        if (!prices.has(mint) || depth > (liquidity.get(mint) ?? 0)) {
          prices.set(mint, price);
          liquidity.set(mint, depth);
        }
      }
    } catch {
      // Retain each holding's last known price when a provider is unavailable.
    }
  }
  return prices;
}
