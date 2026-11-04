import { isOfficialToken, OFFICIAL_BLOCK_MESSAGE } from "../lib/official-tokens";
import { useEffect, useState } from "react";
import type { BlacklistKind } from "../components/BlacklistContext";
import { isSolanaAddress, tokenMint } from "../lib/solana";
import { searchTokens, useDebouncedValue } from "./useSearchTokens";

type Match = { name: string; imageUrl?: string };
type Result = { key: string; match: Match | null; error?: string };

export function useBlacklistLookup(kind: BlacklistKind, input: string, enabled: boolean) {
  const address = input.trim();
  const debounced = useDebouncedValue(address);
  const key = `${kind}:${address}`;
  const official = isOfficialToken(address);
  const [result, setResult] = useState<Result | null>(null);
  const validFormat = isSolanaAddress(address);

  useEffect(() => {
    if (!enabled || official || !isSolanaAddress(debounced) || address !== debounced) return;
    let cancelled = false;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    async function lookup(): Promise<Match | null> {
      if (kind === "Token") {
        const tokens = await searchTokens(debounced);
        const token = tokens.find((item) => tokenMint(item) === debounced);
        return token ? { name: token.name || token.symbol || "Token", imageUrl: token.imageUrl || token.logoUrl } : null;
      }
      const response = await fetch(process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [debounced, { encoding: "base64", commitment: "confirmed", dataSlice: { offset: 0, length: 0 } }] }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Wallet verification unavailable");
      const body = await response.json();
      if (body.error || !body.result || !("value" in body.result)) throw new Error("Wallet verification unavailable");
      const account = body.result.value;
      // A token mint, token account, or executable program isn't a wallet.
      return account && !account.executable && account.owner === "11111111111111111111111111111111"
        ? { name: "Wallet" } : null;
    }
    const timedOut = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => { controller.abort(); reject(new Error("Verification timed out")); }, 12000);
    });
    void Promise.race([lookup(), timedOut])
      .then((match) => { if (!cancelled) setResult({ key, match }); })
      .catch(() => { if (!cancelled) setResult({ key, match: null, error: "Unable to verify right now. Check your connection and try again." }); })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
  }, [address, debounced, enabled, key, kind, official]);

  const current = enabled && result?.key === key && address === debounced ? result : null;
  return {
    match: validFormat && !official ? current?.match ?? null : null,
    checking: enabled && !official && validFormat && !current,
    message: official ? OFFICIAL_BLOCK_MESSAGE : !address ? "" : !validFormat ? "Enter a valid Solana address." : current?.error || (current && !current.match ? `No matching ${kind.toLowerCase()} found.` : ""),
  };
}
