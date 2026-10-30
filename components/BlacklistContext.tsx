import React, { createContext, useContext, useState } from "react";
export type BlacklistKind = "Wallet" | "Token";
export type BlacklistEntry = { id: string; address: string; kind: BlacklistKind; reasons: string[]; addedAt: number };
type Store = { entries: BlacklistEntry[]; addEntry: (entry: Omit<BlacklistEntry, "id" | "addedAt">) => boolean; removeEntry: (id: string) => void };
const Context = createContext<Store | null>(null);
export function BlacklistProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  function addEntry(entry: Omit<BlacklistEntry, "id" | "addedAt">) {
    if (entries.some((item) => item.kind === entry.kind && item.address === entry.address)) return false;
    setEntries((old) => [{ ...entry, id: `${Date.now()}-${Math.random()}`, addedAt: Date.now() }, ...old]);
    return true;
  }
  function removeEntry(id: string) { setEntries((old) => old.filter((entry) => entry.id !== id)); }
  return <Context.Provider value={{ entries, addEntry, removeEntry }}>{children}</Context.Provider>;
}
export function useBlacklist() {
  const context = useContext(Context);
  if (!context) throw new Error("useBlacklist must be used inside BlacklistProvider");
  return context;
}
