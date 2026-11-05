export type AmountUnit = "usd" | "token";
export type TradeAmount = { unit: AmountUnit; text: string; exactValue?: number };
export function amountValues(amount: TradeAmount, price: number) {
  const input = amount.exactValue ?? Number(amount.text);
  const value = Number.isFinite(input) && input >= 0 ? input : 0;
  const validPrice = Number.isFinite(price) && price > 0;
  return { usd: amount.unit === "usd" ? value : validPrice ? value * price : 0, tokens: amount.unit === "token" ? value : validPrice ? value / price : 0 };
}
export function amountInput(value: number, unit: AmountUnit) {
  return value > 0 && Number.isFinite(value) ? value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: unit === "usd" ? 2 : 9 }) : "";
}
export function swapTradeAmount(amount: TradeAmount, price: number): TradeAmount {
  if (!(price > 0) || !Number.isFinite(price)) return amount;
  const values = amountValues(amount, price);
  const unit = amount.unit === "usd" ? "token" : "usd";
  const value = unit === "usd" ? values.usd : values.tokens;
  return { unit, text: amount.text ? amountInput(value, unit) : "", exactValue: value };
}
export function editTradeAmount(amount: TradeAmount, key: string): TradeAmount {
  let text = amount.text;
  if (key === "delete") text = text.slice(0, -1);
  else if (key === ".") { if (text.includes(".")) return amount; text = text ? `${text}.` : "0."; }
  else {
    if (!/^\d$/.test(key) || text.replace(/\D/g, "").length >= 18) return amount;
    if ((text.split(".")[1]?.length ?? 0) >= (amount.unit === "usd" ? 2 : 9)) return amount;
    text = text === "0" ? key : `${text}${key}`;
  }
  return { unit: amount.unit, text };
}
export function percentageTradeAmount(amount: TradeAmount, availableUsd: number, price: number, percent: number): TradeAmount {
  const usd = availableUsd * percent / 100;
  const value = amount.unit === "usd" ? usd : price > 0 ? usd / price : 0;
  // Percentage/max selections preserve the exact balance, rather than rounded display text.
  return { unit: amount.unit, text: amountInput(value, amount.unit), exactValue: value };
}
export function withinTradeBalance(usd: number, balance: number) {
  return Number.isFinite(usd) && usd > 0 && usd <= balance + Math.max(1, Math.abs(balance)) * 1e-12;
}

export function formatTokenEntry(text: string) {
  if (!text) return "0";
  const [integer, decimals] = text.split(".");
  return Number(integer || "0").toLocaleString("en-US", { maximumFractionDigits: 0 }) + (decimals === undefined ? "" : `.${decimals}`);
}
