import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { signOut as supabaseSignOut, syncProfile } from "../lib/auth";
import {
  loadDemoSession,
  saveDemoAccount,
  signInDemo as persistDemoSignIn,
  signOutDemo as persistDemoSignOut,
  type DemoAccount,
  type DemoProvider,
} from "../lib/demo-account";
import { supabase, supabaseReady } from "../lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  demoAccount: DemoAccount | null;
  accountId: string | null;
  loading: boolean;
  configured: boolean;
  isSignedIn: boolean;
  signInWithDemo: (provider: DemoProvider) => Promise<DemoAccount>;
  updateDemoAccount: (patch: Partial<DemoAccount>) => Promise<DemoAccount | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [demoAccount, setDemoAccount] = useState<DemoAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const boot = async () => {
      try {
        const local = await loadDemoSession();
        if (!active) return;
        if (local) {
          setDemoAccount(local);
          return;
        }
        if (!supabaseReady) return;
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session ?? null);
        if (data.session?.user) {
          void syncProfile(data.session.user).catch(() => undefined);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void boot();

    if (!supabaseReady) {
      return () => {
        active = false;
      };
    }
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      if (next?.user) {
        void syncProfile(next.user).catch(() => undefined);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInWithDemo = useCallback(async (provider: DemoProvider) => {
    const account = await persistDemoSignIn(provider);
    setDemoAccount(account);
    setSession(null);
    return account;
  }, []);

  const updateDemoAccount = useCallback(async (patch: Partial<DemoAccount>) => {
    const latest = await loadDemoSession();
    if (!latest) return null;
    const saved = await saveDemoAccount({ ...latest, ...patch });
    setDemoAccount(saved);
    return saved;
  }, []);

  const signOut = useCallback(async () => {
    await persistDemoSignOut();
    setDemoAccount(null);
    if (supabaseReady) {
      try {
        await supabaseSignOut();
      } catch {
        /* local demo sign-out still wins */
      }
    }
    setSession(null);
  }, []);

  const accountId = demoAccount?.id ?? session?.user?.id ?? null;
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      demoAccount,
      accountId,
      loading,
      configured: supabaseReady,
      isSignedIn: Boolean(demoAccount || session?.user),
      signInWithDemo,
      updateDemoAccount,
      signOut,
    }),
    [session, demoAccount, accountId, loading, signInWithDemo, updateDemoAccount, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
