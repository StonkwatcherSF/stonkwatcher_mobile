import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BLACKLIST_KEY } from "../lib/config";
import { fetchTokenCreator } from "../lib/stonk";

export type BlacklistKind = "Wallet" | "Token";
export type BlacklistEntry = {
  id: string;
  address: string;
  kind: BlacklistKind;
  reasons: string[];
  addedAt: number;
  devAddress?: string | null;
  label?: string | null;
};

type HideInput = { mint?: string | null; creator?: string | null };

type Store = {
  entries: BlacklistEntry[];
  addEntry: (entry: Omit<BlacklistEntry, "id" | "addedAt">) => boolean;
  removeEntry: (id: string) => void;
  isHidden: (input: HideInput) => boolean;
  rememberCreators: (rows: HideInput[]) => void;
  ensureCreators: (mints: string[]) => Promise<void>;
};

const Context = createContext<Store | null>(null);

function isEntry(value: unknown): value is BlacklistEntry {
  if (!value || typeof value !== "object") return false;
  const row = value as BlacklistEntry;
  return (
    typeof row.id === "string" &&
    typeof row.address === "string" &&
    (row.kind === "Wallet" || row.kind === "Token") &&
    Array.isArray(row.reasons) &&
    typeof row.addedAt === "number"
  );
}

export function BlacklistProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [creators, setCreators] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const entriesRef = useRef(entries);
  const creatorsRef = useRef(creators);
  const lookedUp = useRef(new Set<string>());
  entriesRef.current = entries;
  creatorsRef.current = creators;

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(BLACKLIST_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return;
        const rows = parsed.filter(isEntry);
        setEntries(rows);
        setCreators((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            if (row.kind === "Token" && row.devAddress) next[row.address] = row.devAddress;
          }
          return next;
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(BLACKLIST_KEY, JSON.stringify(entries)).catch(() => undefined);
  }, [entries, hydrated]);

  const rememberCreator = useCallback((mint: string, creator: string) => {
    setCreators((prev) => (prev[mint] === creator ? prev : { ...prev, [mint]: creator }));
  }, []);

  const addEntry = useCallback((entry: Omit<BlacklistEntry, "id" | "addedAt">) => {
    const address = entry.address.trim();
    if (!address) return false;
    if (entriesRef.current.some((item) => item.kind === entry.kind && item.address === address)) return false;
    const saved: BlacklistEntry = {
      ...entry,
      address,
      id: `${Date.now()}-${Math.random()}`,
      addedAt: Date.now(),
    };
    setEntries((old) => [saved, ...old]);
    if (entry.kind === "Token") {
      lookedUp.current.add(address);
      void fetchTokenCreator(address).then((creator) => {
        if (!creator) return;
        rememberCreator(address, creator);
        setEntries((old) => old.map((row) => (row.id === saved.id ? { ...row, devAddress: creator } : row)));
      });
    }
    return true;
  }, [rememberCreator]);

  const removeEntry = useCallback((id: string) => {
    setEntries((old) => old.filter((entry) => entry.id !== id));
  }, []);

  const rememberCreators = useCallback((rows: HideInput[]) => {
    setCreators((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const row of rows) {
        const mint = row.mint?.trim();
        const creator = row.creator?.trim();
        if (!mint || !creator || next[mint] === creator) continue;
        next[mint] = creator;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  const ensureCreators = useCallback(async (mints: string[]) => {
    const todo = [...new Set(mints.map((mint) => mint.trim()).filter(Boolean))].filter(
      (mint) => !lookedUp.current.has(mint) && !creatorsRef.current[mint],
    );
    if (!todo.length) return;
    for (const mint of todo) lookedUp.current.add(mint);
    const found = await Promise.all(
      todo.map(async (mint) => [mint, await fetchTokenCreator(mint).catch(() => null)] as const),
    );
    setCreators((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [mint, creator] of found) {
        if (!creator || next[mint] === creator) continue;
        next[mint] = creator;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  const isHidden = useCallback(
    (input: HideInput) => {
      const mint = (input.mint || "").trim();
      const creator = (input.creator || "").trim() || (mint ? creators[mint] : "") || "";
      return entries.some((entry) => {
        if (entry.kind === "Token" && mint && entry.address === mint) return true;
        if (entry.kind === "Wallet" && creator && entry.address === creator) return true;
        if (entry.kind === "Token" && creator && entry.devAddress && entry.devAddress === creator) return true;
        return false;
      });
    },
    [creators, entries],
  );

  const value = useMemo(
    () => ({ entries, addEntry, removeEntry, isHidden, rememberCreators, ensureCreators }),
    [entries, addEntry, removeEntry, isHidden, rememberCreators, ensureCreators],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBlacklist() {
  const context = useContext(Context);
  if (!context) throw new Error("useBlacklist must be used inside BlacklistProvider");
  return context;
}

export function useVisibleRows<T extends HideInput>(rows: T[] | null | undefined) {
  const { entries, isHidden, rememberCreators, ensureCreators } = useBlacklist();
  const needsCreators = entries.some(
    (entry) => entry.kind === "Wallet" || (entry.kind === "Token" && Boolean(entry.devAddress)),
  );
  useEffect(() => {
    const list = rows ?? [];
    rememberCreators(list);
    if (!needsCreators) return;
    const missing = list
      .map((row) => row.mint?.trim() || "")
      .filter((mint, index) => Boolean(mint) && !list[index]?.creator?.trim());
    if (missing.length) void ensureCreators(missing);
  }, [rows, needsCreators, rememberCreators, ensureCreators]);
  return useMemo(() => {
    if (rows == null) return rows;
    return rows.filter((row) => !isHidden(row));
  }, [rows, isHidden]);
}
