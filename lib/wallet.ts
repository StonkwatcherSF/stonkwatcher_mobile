import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Buffer } from "buffer";
import { API_URL } from "./config";
import { apiPost } from "./api";
import { isSolanaAddress } from "./solana";

export type WalletProviderId = "phantom" | "jupiter";

export type WalletSession = {
  provider: WalletProviderId;
  address: string;
  /** Opaque Phantom session token (deeplink). */
  phantomSession?: string;
  /** Shared secret for Phantom deeplink encryption (base58). */
  sharedSecret?: string;
  /** Dapp encryption public key for Phantom deeplink (base58). */
  dappPublicKey?: string;
  /** Dapp encryption secret key for Phantom deeplink (base58). */
  dappSecretKey?: string;
};

const WALLET_KEY = "stonkwatcher.wallet.session.v1";
const PENDING_KEY = "stonkwatcher.wallet.pending.v1";
export const WALLET_REDIRECT_PATH = "wallet-callback";

type InjectedProvider = {
  isPhantom?: boolean;
  isJupiter?: boolean;
  publicKey?: { toString(): string } | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: { toString(): string } } | undefined>;
  disconnect?: () => Promise<void>;
  signAndSendTransaction?: (transaction: { serialize: (config?: object) => Uint8Array }) => Promise<{ signature: string } | string>;
  signTransaction?: (transaction: { serialize: (config?: object) => Uint8Array }) => Promise<{ serialize: () => Uint8Array }>;
};

type PendingConnect = {
  provider: WalletProviderId;
  dappPublicKey: string;
  dappSecretKey: string;
};

function hostWindow() {
  if (typeof globalThis === "undefined") return null;
  return globalThis as typeof globalThis & {
    window?: Window & {
      phantom?: { solana?: InjectedProvider };
      jup?: InjectedProvider & { solana?: InjectedProvider };
      solana?: InjectedProvider & { providers?: InjectedProvider[] };
    };
  };
}

function injectedProvider(id: WalletProviderId): InjectedProvider | null {
  const win = hostWindow()?.window;
  if (!win) return null;
  const listed = [
    win.phantom?.solana,
    win.jup?.solana,
    win.jup,
    ...(win.solana?.providers ?? []),
    win.solana,
  ].filter((row): row is InjectedProvider => Boolean(row && typeof row.connect === "function"));
  if (id === "phantom") {
    return listed.find((provider) => provider.isPhantom || provider === win.phantom?.solana) ?? null;
  }
  return listed.find((provider) => provider.isJupiter || provider === win.jup || provider === win.jup?.solana) ?? null;
}

export async function loadWalletSession() {
  const raw = await AsyncStorage.getItem(WALLET_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WalletSession;
    if (!parsed?.address || !isSolanaAddress(parsed.address)) return null;
    if (parsed.provider !== "phantom" && parsed.provider !== "jupiter") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveWalletSession(session: WalletSession) {
  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(session));
  return session;
}

export async function clearWalletSession() {
  await AsyncStorage.multiRemove([WALLET_KEY, PENDING_KEY]);
}

function walletRedirectUri() {
  return Linking.createURL(WALLET_REDIRECT_PATH);
}

function appUrl() {
  return API_URL || "https://www.stonkwatcher.xyz";
}

function browseUrl(provider: WalletProviderId, target = appUrl()) {
  const page = encodeURIComponent(target);
  const ref = encodeURIComponent(appUrl());
  if (provider === "phantom") return `https://phantom.app/ul/browse/${page}?ref=${ref}`;
  return null;
}

async function connectInjected(provider: WalletProviderId) {
  const injected = injectedProvider(provider);
  if (!injected) return null;
  const result = await injected.connect();
  const address = result?.publicKey?.toString() || injected.publicKey?.toString() || "";
  if (!isSolanaAddress(address)) throw new Error("Wallet did not return an account.");
  return saveWalletSession({ provider, address });
}

function keyPair() {
  const pair = nacl.box.keyPair();
  return {
    publicKey: bs58.encode(pair.publicKey),
    secretKey: bs58.encode(pair.secretKey),
  };
}

function sharedSecretFrom(phantomPublicKey: string, dappSecretKey: string) {
  return nacl.box.before(bs58.decode(phantomPublicKey), bs58.decode(dappSecretKey));
}

function decryptPayload(data: string, nonce: string, sharedSecret: Uint8Array) {
  const opened = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), sharedSecret);
  if (!opened) throw new Error("Could not decrypt wallet response.");
  return JSON.parse(Buffer.from(opened).toString("utf8")) as Record<string, string>;
}

function encryptPayload(payload: object, sharedSecret: Uint8Array) {
  const nonce = nacl.randomBytes(24);
  const encrypted = nacl.box.after(Buffer.from(JSON.stringify(payload), "utf8"), nonce, sharedSecret);
  return { nonce: bs58.encode(nonce), payload: bs58.encode(encrypted) };
}

async function connectPhantomDeeplink() {
  const keys = keyPair();
  const pending: PendingConnect = {
    provider: "phantom",
    dappPublicKey: keys.publicKey,
    dappSecretKey: keys.secretKey,
  };
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  const params = new URLSearchParams({
    app_url: appUrl(),
    dapp_encryption_public_key: keys.publicKey,
    redirect_link: walletRedirectUri(),
    cluster: "mainnet-beta",
  });
  const url = `https://phantom.app/ul/v1/connect?${params.toString()}`;
  const can = await Linking.canOpenURL(url).catch(() => true);
  if (!can) throw new Error("Install Phantom to connect.");
  await Linking.openURL(url);
  return null;
}

async function connectJupiterMobile() {
  const target = appUrl();
  try {
    await Linking.openURL("jupiter://");
  } catch {
    /* fall through to browse/store */
  }
  // Same mobile pattern as web: open Jupiter, then browse the live site for connect + trade.
  const store =
    Platform.OS === "ios"
      ? "https://apps.apple.com/app/jupiter-wallet/id1666797921"
      : "https://play.google.com/store/apps/details?id=ag.jup.jupiter.android";
  await Linking.openURL(store).catch(() => undefined);
  return {
    hint: "Site URL copied style flow: open Jupiter, tap the globe, paste stonkwatcher.xyz, then approve connect.",
    target,
  } as const;
}

export async function connectWallet(provider: WalletProviderId) {
  const injected = await connectInjected(provider).catch(() => null);
  if (injected) return { session: injected, pending: false as const };

  if (provider === "phantom") {
    await connectPhantomDeeplink();
    return { session: null, pending: true as const };
  }

  const jupiter = await connectJupiterMobile();
  return { session: null, pending: true as const, jupiter };
}

export async function handleWalletRedirect(url: string) {
  const parsed = Linking.parse(url);
  const query = parsed.queryParams ?? {};
  const read = (key: string) => {
    const value = query[key];
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
  };
  if (read("errorCode") || read("errorMessage")) {
    throw new Error(read("errorMessage") || "Wallet request was rejected.");
  }

  const pendingRaw = await AsyncStorage.getItem(PENDING_KEY);
  const pending = pendingRaw ? (JSON.parse(pendingRaw) as PendingConnect) : null;

  // Connect response
  const phantomPk = read("phantom_encryption_public_key");
  const data = read("data");
  const nonce = read("nonce");
  if (phantomPk && data && nonce && pending) {
    const shared = sharedSecretFrom(phantomPk, pending.dappSecretKey);
    const payload = decryptPayload(data, nonce, shared);
    if (!isSolanaAddress(payload.public_key || "")) throw new Error("Wallet did not return an account.");
    await AsyncStorage.removeItem(PENDING_KEY);
    return saveWalletSession({
      provider: "phantom",
      address: payload.public_key,
      phantomSession: payload.session,
      sharedSecret: bs58.encode(shared),
      dappPublicKey: pending.dappPublicKey,
      dappSecretKey: pending.dappSecretKey,
    });
  }

  // signTransaction response
  if (data && nonce) {
    const session = await loadWalletSession();
    if (!session?.sharedSecret) throw new Error("Connect Phantom before signing.");
    const shared = bs58.decode(session.sharedSecret);
    const payload = decryptPayload(data, nonce, shared);
    if (!payload.transaction) throw new Error("Wallet did not return a signed transaction.");
    const signature = await relaySignedTransaction(bs58.decode(payload.transaction));
    return { ...session, lastSignature: signature };
  }

  return null;
}

function base64ToBytes(value: string) {
  return Uint8Array.from(Buffer.from(value, "base64"));
}

function bytesToBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

async function relaySignedTransaction(bytes: Uint8Array) {
  const body = await apiPost<{ signature?: string; error?: string }>("/api/dex/send", {
    transaction: bytesToBase64(bytes),
    skipPreflight: true,
  });
  if (!body.signature) throw new Error(body.error || "Transaction was rejected");
  return body.signature;
}

function transactionHandle(bytes: Uint8Array) {
  return {
    serialize: () => bytes,
  };
}

async function signInjected(provider: WalletProviderId, transactionBase64: string) {
  const injected = injectedProvider(provider);
  if (!injected) return null;
  const bytes = base64ToBytes(transactionBase64);
  const tx = transactionHandle(bytes);
  if (injected.signTransaction) {
    const signed = await injected.signTransaction(tx);
    return relaySignedTransaction(signed.serialize());
  }
  if (injected.signAndSendTransaction) {
    const result = await injected.signAndSendTransaction(tx);
    return typeof result === "string" ? result : result.signature;
  }
  return null;
}

export async function signAndSendWalletTransaction(session: WalletSession, transactionBase64: string) {
  const injected = await signInjected(session.provider, transactionBase64).catch(() => null);
  if (injected) return injected;

  if (session.provider !== "phantom" || !session.phantomSession || !session.sharedSecret || !session.dappPublicKey) {
    if (session.provider === "jupiter") {
      await Linking.openURL("jupiter://").catch(() => undefined);
      throw new Error("Open Stonk Watcher inside Jupiter’s browser to approve live trades.");
    }
    const browse = browseUrl("phantom");
    if (browse) await Linking.openURL(browse).catch(() => undefined);
    throw new Error("Reconnect Phantom to approve this live trade.");
  }

  const shared = bs58.decode(session.sharedSecret);
  const encrypted = encryptPayload(
    {
      transaction: bs58.encode(base64ToBytes(transactionBase64)),
      session: session.phantomSession,
    },
    shared,
  );
  const params = new URLSearchParams({
    dapp_encryption_public_key: session.dappPublicKey,
    nonce: encrypted.nonce,
    redirect_link: walletRedirectUri(),
    payload: encrypted.payload,
  });
  await Linking.openURL(`https://phantom.app/ul/v1/signTransaction?${params.toString()}`);
  return null;
}

export type LiveSwapInput = {
  mint: string;
  side: "buy" | "sell";
  /** Human amount in the input asset (SOL for buys, token for sells). */
  amount: string;
  user: string;
  payMint?: string;
  slippageBps?: number;
};

export async function buildLiveSwap(input: LiveSwapInput) {
  return apiPost<{
    transaction?: string;
    amountOut?: string;
    error?: string;
  }>("/api/dex/swap", {
    mint: input.mint,
    side: input.side,
    amount: input.amount,
    user: input.user,
    payMint: input.payMint,
    slippageBps: input.slippageBps ?? 100,
  });
}

export async function fetchWalletBalances(wallet: string, mint: string) {
  const { apiGet } = await import("./api");
  return apiGet<{
    token?: { amount?: string; symbol?: string };
    pay?: Array<{ mint: string; symbol: string; amount: string }>;
  }>("/api/dex/balances", { wallet, mint });
}

export function walletAccountId(session: WalletSession) {
  return `wallet:${session.provider}:${session.address}`;
}

export function walletTitle(provider: WalletProviderId) {
  return provider === "phantom" ? "Phantom" : "Jupiter";
}
