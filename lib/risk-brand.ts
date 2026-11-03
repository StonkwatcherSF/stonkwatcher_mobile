const BRANDS = [
  { label: "Low Risk", color: "#BBDC12", background: "#1B2003" },
  { label: "Moderate Risk", color: "#DCB412", background: "#2C2713" },
  { label: "High Risk", color: "#F97316", background: "#362418" },
  { label: "Critical Risk", color: "#DC1215", background: "#411B1B" },
] as const;
const UNKNOWN = { label: "Unscored", color: "#777777", background: "#1C1C1C" };

export function riskBrand(score?: number | null) {
  if (score == null || !Number.isFinite(score)) return UNKNOWN;
  const value = Math.round(Math.max(0, Math.min(100, score)));
  return BRANDS[value <= 25 ? 0 : value <= 50 ? 1 : value <= 75 ? 2 : 3];
}
