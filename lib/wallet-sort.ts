type RankedHolding = { pnlUsd: number; change: number; date: string };
const finite = (value: number) => Number.isFinite(value) ? value : 0;
const timestamp = (date: string) => finite(Date.parse(date));

export function sortWalletHoldings<T extends RankedHolding>(holdings: T[], order: "recent" | "top"): T[] {
  return [...holdings].sort((a, b) => {
    if (order === "top") {
      const profit = finite(b.pnlUsd) - finite(a.pnlUsd);
      if (profit) return profit;
      const percentage = finite(b.change) - finite(a.change);
      if (percentage) return percentage;
    }
    return timestamp(b.date) - timestamp(a.date);
  });
}
