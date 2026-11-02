import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import type { User } from "@supabase/supabase-js";
import { AUTH_REDIRECT_PATH } from "./config";
import { supabase, supabaseReady } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export type AuthProvider = "google";

export class AuthCancelledError extends Error {
  constructor() {
    super("Sign in was cancelled.");
    this.name = "AuthCancelledError";
  }
}

function requireSupabase() {
  if (!supabaseReady) {
    throw new Error(
      "Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart Expo.",
    );
  }
}

export function authRedirectUri() {
  return makeRedirectUri({
    scheme: "stonkwatcher",
    path: AUTH_REDIRECT_PATH,
  });
}

function tokensFromUrl(url: string) {
  const normalized = url.replace("#", "?");
  const parsed = Linking.parse(normalized);
  const query = parsed.queryParams ?? {};
  const read = (key: string) => {
    const value = query[key];
    return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
  };
  return {
    access_token: read("access_token"),
    refresh_token: read("refresh_token"),
    error: read("error_description") || read("error"),
  };
}

export async function createSessionFromUrl(url: string) {
  const { access_token, refresh_token, error } = tokensFromUrl(url);
  if (error) throw new Error(error);
  if (!access_token) return null;
  const { data, error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? "",
  });
  if (sessionError) throw sessionError;
  return data.session;
}

export async function syncProfile(user: User) {
  const provider =
    (user.app_metadata?.provider as string | undefined) ||
    (user.app_metadata?.providers as string[] | undefined)?.[0] ||
    null;
  const metadata = user.user_metadata ?? {};
  const displayName =
    [metadata.full_name, metadata.name, metadata.given_name]
      .find((value) => typeof value === "string" && value.trim())
      ?.toString()
      .trim() || null;
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      provider,
      display_name: displayName,
      avatar_url: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error && error.code !== "42P01" && error.code !== "PGRST205") {
    throw error;
  }
}

export async function signInWithOAuth(provider: AuthProvider) {
  requireSupabase();
  const redirectTo = authRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Could not start the sign-in session.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") throw new AuthCancelledError();
  const session = await createSessionFromUrl(result.url);
  if (!session?.user) throw new Error("Sign in did not return a session.");
  await syncProfile(session.user).catch(() => undefined);
  return session;
}

export async function signInWithGoogle() {
  return signInWithOAuth("google");
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function accountLabel(user: User | null) {
  if (!user) return "Not signed in";
  const metadata = user.user_metadata ?? {};
  return (
    user.email ||
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    "Signed in"
  );
}

export function providerLabel(user: User | null) {
  const provider =
    (user?.app_metadata?.provider as string | undefined) ||
    (user?.app_metadata?.providers as string[] | undefined)?.[0];
  if (provider === "apple") return "Apple";
  if (provider === "google") return "Google";
  return provider ? provider[0].toUpperCase() + provider.slice(1) : "Account";
}
