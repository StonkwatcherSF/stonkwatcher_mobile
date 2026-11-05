import { useLocalization } from "./LocalizationContext";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { restoreProfileAvatar } from "../utils/profile-avatar";

const AVATAR_KEY = "stonkwatcher.profile-avatar.v1";

type Preferences = {
  name: string;
  username: string;
  bio: string;
  avatarUri: string | null;
  notifications: boolean;
  positions: boolean;
  rug: boolean;
  rewards: boolean;
  announcements: boolean;
  screenLock: boolean;
  language: string;
};

const initial: Preferences = {
  name: "Unipcs",
  username: "@unipcs",
  bio: '"If the Lord will, we shall live, and do this, or that." - James 4:15',
  avatarUri: null,
  notifications: true,
  positions: false,
  rug: true,
  rewards: false,
  announcements: true,
  screenLock: true,
  language: "System (English)",
};

const C = createContext<{
  prefs: Preferences;
  update: (x: Partial<Preferences>) => void;
} | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState(initial);
  const avatarChanged = useRef(false);
  const avatarWrite = useRef(Promise.resolve());
  const { preference, saveLanguage } = useLocalization();
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(AVATAR_KEY).then((saved) => {
      if (cancelled || avatarChanged.current || !saved) return;
      const avatarUri = restoreProfileAvatar(saved);
      setPrefs((current) => ({ ...current, avatarUri }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const update = (x: Partial<Preferences>) => {
    if (x.language) void saveLanguage(x.language).catch(() => undefined);
    if (x.avatarUri !== undefined) {
      avatarChanged.current = true;
      const uri = x.avatarUri;
      // Serialize writes so a slower earlier photo cannot overwrite the latest one.
      avatarWrite.current = avatarWrite.current.then(() => uri
        ? AsyncStorage.setItem(AVATAR_KEY, uri)
        : AsyncStorage.removeItem(AVATAR_KEY)
      ).catch(() => undefined);
    }
    setPrefs((p) => ({ ...p, ...x }));
  };
  return (
    <C.Provider value={{ prefs: { ...prefs, language: preference }, update }}>
      {children}
    </C.Provider>
  );
}

export function useSettings() {
  const v = useContext(C);
  if (!v) throw Error("SettingsProvider missing");
  return v;
}
