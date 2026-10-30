export function compactUsd(value?: number | null, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(digits)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(digits)}M`;
  if (abs >= 1_000) return `${sign}$${abs >= 10_000 ? Math.round(abs / 1_000) : (abs / 1_000).toFixed(2)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(digits)}`;
  if (abs >= 0.01) return `${sign}$${abs.toFixed(4)}`;
  if (abs > 0) return `${sign}$${abs.toPrecision(3)}`;
  return "$0.00";
}

export function formatMc(value?: number | null) {
  const compact = compactUsd(value);
  if (compact === "—") return "—";
  return `${compact} MC`;
}

export function formatPrice(value?: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  if (value >= 0.0001) return `$${value.toFixed(6)}`;
  return `$${value.toPrecision(4)}`;
}

export function formatPct(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export function formatCount(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

export function formatTokenAmount(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (abs >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

export function formatAge(iso?: string | number | null) {
  if (iso == null || iso === "") return "—";
  const ms = typeof iso === "number" ? (iso > 1e12 ? iso : iso * 1000) : Date.parse(iso);
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const delta = Date.now() - ms;
  if (delta < 0) return "just now";
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function formatTxTime(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function signedUsd(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  const compact = compactUsd(Math.abs(value));
  if (value > 0) return `+${compact}`;
  if (value < 0) return `-${compact.replace("-", "")}`;
  return compact;
}

export function prettySymbol(symbol?: string | null) {
  const raw = (symbol || "").replace(/^\$/, "").trim();
  return raw ? `$${raw}` : "";
}

export function riskLabel(score?: number | null) {
  if (score == null || !Number.isFinite(score)) return "Unscored";
  if (score <= 30) return "Low Risk";
  if (score <= 60) return "Moderate";
  return "High Risk";
}

export function signedPoints(points?: number | null) {
  if (points == null || !Number.isFinite(points)) return "0";
  return points > 0 ? `+${Math.round(points)}` : `${Math.round(points)}`;
}

export function chartAxisLabel(value: number) {
  return compactUsd(value, value >= 1000 ? 1 : 2);
}
