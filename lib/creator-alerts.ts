import { apiGet } from "./api";

export type CreatorAlertTone = "yellow" | "red" | "purple";

export type CreatorAlert = {
  id: string;
  tone: CreatorAlertTone;
  text: string;
  at: string;
  mint: string | null;
  wallet: string | null;
};

export type CreatorAlertPhrase =
  | { kind: "launch"; previous: string; next: string }
  | { kind: "rapid"; previous: string; amount: string; unit: "m" | "h" | "d" }
  | { kind: "sold-all"; subject: string }
  | { kind: "sold-some"; subject: string; pct: string }
  | { kind: "moved"; subject: string; usd: string }
  | { kind: "raw"; text: string };

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asTone(value: unknown): CreatorAlertTone {
  return value === "red" || value === "purple" ? value : "yellow";
}

function normalizeAlert(value: unknown): CreatorAlert | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = asText(row.id);
  const text = asText(row.text);
  const at = asText(row.at);
  if (!id || !text || !at || Number.isNaN(Date.parse(at))) return null;
  return {
    id,
    tone: asTone(row.tone),
    text,
    at,
    mint: asText(row.mint),
    wallet: asText(row.wallet),
  };
}

export function parseCreatorAlert(text: string): CreatorAlertPhrase {
  let match = text.match(/^Creator of (.+) just launched (.+)$/);
  if (match) return { kind: "launch", previous: match[1], next: match[2] };
  match = text.match(/^Creator of (.+) launched another token (\d+)([mhd]) after launch$/);
  if (match) return { kind: "rapid", previous: match[1], amount: match[2], unit: match[3] as "m" | "h" | "d" };
  match = text.match(/^Creator of (.+) just sold 100% of their supply$/);
  if (match) return { kind: "sold-all", subject: match[1] };
  match = text.match(/^Creator of (.+) just sold (\d+)% of their holdings$/);
  if (match) return { kind: "sold-some", subject: match[1], pct: match[2] };
  match = text.match(/^Creator of (.+) moved (\$[\d,]+) worth of tokens$/);
  if (match) return { kind: "moved", subject: match[1], usd: match[2] };
  return { kind: "raw", text };
}

export async function fetchCreatorAlerts() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const body = await apiGet<{ creatorAlerts?: unknown }>("/api/dashboard", undefined, controller.signal);
    const rows = Array.isArray(body.creatorAlerts) ? body.creatorAlerts : [];
    return rows.map(normalizeAlert).filter((alert): alert is CreatorAlert => Boolean(alert));
  } catch {
    throw new Error("Could not load creator alerts.");
  } finally {
    clearTimeout(timer);
  }
}
