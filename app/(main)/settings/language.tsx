import { useLocalization, LocalizedText as Text, LocalizedAlert as Alert } from "../../../components/LocalizationContext";
import React, { useState } from "react";
import { Pressable } from "react-native";
import { Page, lime } from "../../../components/SettingsUI";
import { LANGUAGE_OPTIONS } from "../../../lib/translations";

export default function Language() {
  const { preference } = useLocalization();
  return <LanguageForm key={preference} initial={preference} />;
}
function LanguageForm({ initial }: { initial: string }) {
  const { saveLanguage } = useLocalization();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try { await saveLanguage(value); Alert.alert("Saved", "Language updated."); }
    catch { Alert.alert("Error", "Could not save language. Please try again."); }
    finally { setSaving(false); }
  };
  return <Page title="Language" action="Save Changes" onAction={() => { void save(); }}>
    {LANGUAGE_OPTIONS.map((language) => <Pressable key={language} disabled={saving} onPress={() => setValue(language)} accessibilityRole="radio" accessibilityState={{ checked: value === language }} style={{ height: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={{ color: "white", fontSize: 16 }}>{language === "System (English)" ? "System" : language}</Text>
      {value === language && <Text style={{ color: lime, fontSize: 22 }}>●</Text>}
    </Pressable>)}
  </Page>;
}
