import { useLocalization } from "./LocalizationContext";
import { useAuth } from "./AuthContext";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { restoreProfileAvatar } from "../utils/profile-avatar";
import type { DemoAccount } from "../lib/demo-account";

const AVATAR_KEY = "stonkwatcher.profile-avatar.v1";

type Preferences = {
  name: string;
  username: string;
  bio: string;
  paperTrade: boolean;
  avatarUri: string | null;
  notifications: boolean;
  positions: boolean;
  rug: boolean;
  rewards: boolean;
  announcements: boolean;
  screenLock: boolean;
  language: string;
};

const basePrefs: Preferences = {
  name: "Guest",
  username: "@guest",
  bio: "",
  avatarUri: null,
  paperTrade: false,
  notifications: true,
  positions: false,
  rug: true,
  rewards: false,
  announcements: true,
  screenLock: true,
  language: "System (English)",
};

function prefsFromAccount(account: DemoAccount | null, language: string, avatarUri: string | null): Preferences {
  if (!account) {
    return { ...basePrefs, language, avatarUri };
  }
  return {
    ...basePrefs,
    name: account.displayName,
    username: account.username.startsWith("@") ? account.username : `@${account.username}`,
    bio: account.bio,
    paperTrade: account.paperTrade,
    language,
    avatarUri,
  };
}

function avatarKeyFor(accountId: string | null) {
  return accountId ? `${AVATAR_KEY}.${accountId}` : AVATAR_KEY;
}

const C = createContext<{
  prefs: Preferences;
  update: (x: Partial<Preferences>) => void;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { demoAccount, accountId, updateDemoAccount } = useAuth();
  const { preference, saveLanguage } = useLocalization();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [localPrefs, setLocalPrefs] = useState<Preferences>(() =>
    prefsFromAccount(demoAccount, preference, null),
  );
  const avatarChanged = useRef(false);
  const avatarWrite = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    avatarChanged.current = false;
    setAvatarUri(null);
    setLocalPrefs(prefsFromAccount(demoAccount, preference, null));
    void AsyncStorage.getItem(avatarKeyFor(accountId)).then((saved) => {
      if (cancelled || avatarChanged.current || !saved) return;
      const next = restoreProfileAvatar(saved);
      setAvatarUri(next);
      setLocalPrefs((current) => ({ ...current, avatarUri: next }));
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Reload profile fields when the signed-in demo user changes.
  }, [accountId, demoAccount?.id, preference]);

  const update = useCallback(
    (x: Partial<Preferences>) => {
      if (x.language) void saveLanguage(x.language).catch(() => undefined);
      if (x.avatarUri !== undefined) {
        avatarChanged.current = true;
        const uri = x.avatarUri;
        setAvatarUri(uri);
        avatarWrite.current = avatarWrite.current
          .then(() =>
            uri
              ? AsyncStorage.setItem(avatarKeyFor(accountId), uri)
              : AsyncStorage.removeItem(avatarKeyFor(accountId)),
          )
          .catch(() => undefined);
      }
      setLocalPrefs((p) => ({ ...p, ...x }));
      if (demoAccount) {
        const patch: Partial<DemoAccount> = {};
        if (x.name !== undefined) patch.displayName = x.name;
        if (x.username !== undefined) patch.username = x.username;
        if (x.bio !== undefined) patch.bio = x.bio;
        if (x.paperTrade !== undefined) patch.paperTrade = x.paperTrade;
        if (Object.keys(patch).length) void updateDemoAccount(patch);
      }
    },
    [accountId, demoAccount, saveLanguage, updateDemoAccount],
  );

  return (
    <C.Provider value={{ prefs: { ...localPrefs, language: preference, avatarUri }, update }}>
      {children}
    </C.Provider>
  );
}

export function useSettings() {
  const v = useContext(C);
  if (!v) throw Error("SettingsProvider missing");
  return v;
}
