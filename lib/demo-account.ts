import AsyncStorage from "@react-native-async-storage/async-storage";
import { MOCK_PORTFOLIO_KEY } from "./config";

export type DemoProvider = "google" | "apple" | "guest";

export type DemoAccount = {
  id: string;
  provider: DemoProvider;
  email: string;
  displayName: string;
  username: string;
  bio: string;
  paperTrade: boolean;
  paperFunded: boolean;
  createdAt: string;
  updatedAt: string;
};

const SESSION_KEY = "stonkwatcher.demo.session.v1";
const ACCOUNT_KEY_PREFIX = "stonkwatcher.demo.account.v1:";

export function demoAccountId(provider: DemoProvider) {
  return `local:${provider}`;
}

export function portfolioStorageKey(accountId: string) {
  return `${MOCK_PORTFOLIO_KEY}.${accountId}`;
}

export function equityStorageKey(accountId: string) {
  return `${portfolioStorageKey(accountId)}.equity`;
}

function accountStorageKey(accountId: string) {
  return `${ACCOUNT_KEY_PREFIX}${accountId}`;
}

function defaultsFor(provider: DemoProvider): Omit<DemoAccount, "createdAt" | "updatedAt"> {
  const nowProfile =
    provider === "google"
      ? { displayName: "Google User", username: "@google", email: "google.demo@stonkwatcher.local" }
      : provider === "apple"
        ? { displayName: "Apple User", username: "@apple", email: "apple.demo@stonkwatcher.local" }
        : { displayName: "Guest", username: "@guest", email: "guest.demo@stonkwatcher.local" };
  return {
    id: demoAccountId(provider),
    provider,
    ...nowProfile,
    bio: "",
    paperTrade: false,
    paperFunded: false,
  };
}

function isAccount(value: unknown): value is DemoAccount {
  if (!value || typeof value !== "object") return false;
  const row = value as DemoAccount;
  return (
    typeof row.id === "string" &&
    (row.provider === "google" || row.provider === "apple" || row.provider === "guest") &&
    typeof row.email === "string" &&
    typeof row.displayName === "string" &&
    typeof row.username === "string" &&
    typeof row.bio === "string" &&
    typeof row.paperTrade === "boolean" &&
    typeof row.paperFunded === "boolean"
  );
}

export async function loadDemoSessionId() {
  const id = await AsyncStorage.getItem(SESSION_KEY);
  return id?.trim() || null;
}

export async function loadDemoAccount(accountId: string) {
  const raw = await AsyncStorage.getItem(accountStorageKey(accountId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isAccount(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function loadDemoSession() {
  const id = await loadDemoSessionId();
  if (!id) return null;
  return loadDemoAccount(id);
}

export async function saveDemoAccount(account: DemoAccount) {
  const next = { ...account, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(accountStorageKey(next.id), JSON.stringify(next));
  return next;
}

export async function signInDemo(provider: DemoProvider) {
  const id = demoAccountId(provider);
  const existing = await loadDemoAccount(id);
  const now = new Date().toISOString();
  const account =
    existing ??
    ({
      ...defaultsFor(provider),
      createdAt: now,
      updatedAt: now,
    } satisfies DemoAccount);
  const saved = await saveDemoAccount(account);
  await AsyncStorage.setItem(SESSION_KEY, saved.id);
  return saved;
}

export async function signOutDemo() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export function providerTitle(provider: DemoProvider) {
  if (provider === "google") return "Google";
  if (provider === "apple") return "Apple";
  return "Guest";
}
