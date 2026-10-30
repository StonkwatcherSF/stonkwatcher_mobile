import React from "react";
import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Page } from "../../../components/SettingsUI";

import ProfileIcon from "../../../assets/icons/carbon_user-avatar-filled-alt.svg";
import NotificationIcon from "../../../assets/icons/carbon_notification.svg";
import SecurityIcon from "../../../assets/icons/carbon_security.svg";
import WalletIcon from "../../../assets/icons/carbon_wallet.svg";
import BlacklistIcon from "../../../assets/icons/carbon_disable-step.svg";
import LegalIcon from "../../../assets/icons/carbon_scales.svg";
import HelpIcon from "../../../assets/icons/carbon_help.svg";
import LanguageIcon from "../../../assets/icons/carbon_language.svg";
import TelegramIcon from "../../../assets/icons/Social Icons.svg";
import XIcon from "../../../assets/icons/Frame 2147225001.svg";
import WebsiteIcon from "../../../assets/icons/website-icon.svg";



const rows = [
  { label: "Profile", route: "profile", Icon: ProfileIcon },
  { label: "Notifications", route: "notifications", Icon: NotificationIcon },
  { label: "Security", route: "security", Icon: SecurityIcon },
  { label: "Deposit and Withdraw", route: "deposit-and-withdraw", Icon: WalletIcon },
  { label: "Blacklist", route: "blacklist", Icon: BlacklistIcon },
  { label: "Legal", route: "legal", Icon: LegalIcon },
  { label: "Help", route: "help", Icon: HelpIcon },
  { label: "Language", route: "language", Icon: LanguageIcon },
  { label: "Telegram", route: "telegram", Icon: TelegramIcon },
  { label: "X", route: "x", Icon: XIcon },
  { label: "Website", route: "website", Icon: WebsiteIcon },
];

export default function SettingsHome() {
  const router = useRouter();
  const open = (route: string, label: string) => {
    if (route === "blacklist") router.push("/blacklist/list" as any);
    else if (["telegram", "x", "website", "legal", "help"].includes(route))
      Alert.alert("Demo", `${label} is not connected yet.`);
    else router.push(`/settings/${route}` as any);
  };
  return (
    <Page title="Settings">
      <View style={styles.rows}>
        {rows.map(({ label, route, Icon }) => (
          <Pressable key={route} style={styles.row} onPress={() => open(route, label)} accessibilityRole="button" accessibilityLabel={label}>
            <Icon width={22} height={22} />
            <Text style={styles.rowText}>{label}</Text>
            <ChevronRight size={19} color="#D6D6D6" />
          </Pressable>
        ))}
      </View>
      <Text style={styles.version}>v1.0.0.0  demo</Text>
      <Pressable style={styles.logout} onPress={() => router.replace("/login" as any)} accessibilityRole="button" accessibilityLabel="Log out of demo">
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>
    </Page>
  );
}
const styles = StyleSheet.create({
  rows: { flex: 1, justifyContent: "flex-start" },
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 15, paddingHorizontal: 4 },
  rowText: { flex: 1, color: "#FFFFFF", fontSize: 16, fontFamily: "GoogleSansFlex" },
  version: { color: "#AAAAAA", fontSize: 10, marginBottom: 15 },
  logout: { backgroundColor: "#FF5547", borderRadius: 5, padding: 15, alignItems: "center", marginBottom: 26 },
  logoutText: { color: "#151515", fontWeight: "700", fontSize: 15 },
});
