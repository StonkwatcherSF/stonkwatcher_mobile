import React, { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert as NativeAlert, Text as NativeText, TextInput as NativeTextInput, type TextProps } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LANGUAGE_OPTIONS, resolveLocale, translateText, type AppLocale } from "../lib/translations";

const KEY = "stonkwatcher.language";
let activeLocale: AppLocale = "en";
function systemLocale() {
  try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch { return "en"; }
}
const Context = createContext({
  preference: "System (English)", locale: "en" as AppLocale,
  saveLanguage: async (_value: string) => {},
});
export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState("System (English)");
  const savedByUser = useRef(false);
  const writes = useRef(Promise.resolve());
  const deviceLocale = useMemo(() => systemLocale(), []);
  const locale = resolveLocale(preference, deviceLocale);
  useEffect(() => {
    let disposed = false;
    void AsyncStorage.getItem(KEY).then((value) => {
      if (!disposed && !savedByUser.current && LANGUAGE_OPTIONS.some((option) => option === value)) {
        activeLocale = resolveLocale(value!, deviceLocale);
        setPreference(value!);
      }
    }).catch(() => undefined);
    return () => { disposed = true; };
  }, [deviceLocale]);
  useEffect(() => { activeLocale = locale; }, [locale]);
  const saveLanguage = useCallback(async (value: string) => {
    if (!LANGUAGE_OPTIONS.some((option) => option === value)) throw Error("Unsupported language");
    savedByUser.current = true;
    const write = writes.current.catch(() => undefined).then(() => AsyncStorage.setItem(KEY, value));
    writes.current = write;
    await write;
    activeLocale = resolveLocale(value, deviceLocale);
    setPreference(value);
  }, [deviceLocale]);
  const value = useMemo(() => ({ preference, locale, saveLanguage }), [preference, locale, saveLanguage]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useLocalization = () => useContext(Context);
function translatedChildren(children: React.ReactNode, locale: AppLocale): React.ReactNode {
  return React.Children.map(children, (child) => typeof child === "string" ? translateText(child, locale) : child);
}
export const LocalizedText = forwardRef<React.ElementRef<typeof NativeText>, TextProps & { localize?: boolean }>(function LocalizedText({ children, localize = true, accessibilityLabel, ...props }, ref) {
  const { locale } = useLocalization();
  return <NativeText {...props} ref={ref} accessibilityLabel={accessibilityLabel ? translateText(accessibilityLabel, locale) : undefined}>{localize ? translatedChildren(children, locale) : children}</NativeText>;
});
export const LocalizedTextInput = forwardRef<React.ElementRef<typeof NativeTextInput>, React.ComponentProps<typeof NativeTextInput>>(function LocalizedTextInput({ placeholder, ...props }, ref) {
  const { locale } = useLocalization();
  return <NativeTextInput {...props} ref={ref} placeholder={placeholder ? translateText(placeholder, locale) : undefined} />;
});
// Alerts are called from event handlers; read the committed locale at invocation time.
export const LocalizedAlert = {
  ...NativeAlert,
  alert: (...args: Parameters<typeof NativeAlert.alert>) => {
    const [title, message, buttons, options] = args;
    return NativeAlert.alert(title ? translateText(title, activeLocale) : title, message ? translateText(message, activeLocale) : message,
      buttons?.map((button) => ({ ...button, text: button.text ? translateText(button.text, activeLocale) : button.text })), options);
  },
};
