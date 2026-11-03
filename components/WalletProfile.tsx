import { LocalizedText as Text, LocalizedAlert as Alert } from "./LocalizationContext";
import React from "react";
import { View, Pressable, StyleSheet, Share } from "react-native";
import { BadgeCheck, ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { COLORS, FONTS } from "../constants/theme";
import ShareIcon from "../assets/icons/share.svg";
import HistoryIcon from "../assets/icons/transaction-history.svg";
import SettingsIcon from "../assets/icons/settings.svg";
import UserAvatar from "./UserAvatar";
import { useSettings } from "./SettingsContext";
type Props = { showBack?: boolean; onOpenMore?: () => void; onHistory?: () => void; onSend?: () => void };
export default function WalletProfile({ showBack = false, onOpenMore, onHistory, onSend }: Props) {
  const router = useRouter();
  const { prefs } = useSettings();
  const handleShareProfile = async () => {
    try {
      await Share.share({
        message:
          `Check out ${prefs.name} on Stonk Watcher!\n\n` +
          `Profile: ${prefs.username}\n` +
          "Track tokens, positions, and market activity on Stonk Watcher.",
      });
    } catch {
      Alert.alert("Share Failed", "Unable to share this profile.");
    }
  };
  const handleHistory = () => { if (onHistory) onHistory(); else if (onOpenMore) onOpenMore(); };
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        {showBack ? <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}><ChevronLeft size={28} color={COLORS.white} /></Pressable> : <View />}
        <View style={styles.actions}>
          <Pressable
            style={styles.circle}
            onPress={handleShareProfile}
            accessibilityRole="button"
            accessibilityLabel="Share profile"
            hitSlop={6}
          >
            <ShareIcon width={22} height={22} />
          </Pressable>
          <Pressable style={styles.circle} onPress={handleHistory} accessibilityRole="button" accessibilityLabel="Open transaction history" hitSlop={6}><HistoryIcon width={22} height={22} /></Pressable>
          <Pressable style={styles.circle} onPress={() => router.push("/settings" as any)} accessibilityRole="button" accessibilityLabel="Open Settings" hitSlop={6}><SettingsIcon width={22} height={22} /></Pressable>
        </View>
      </View>
      <View style={styles.profile}>
        <View style={styles.avatar}><UserAvatar style={styles.avatarImage} /></View>
        <View style={styles.info}>
          <View style={styles.nameRow}><Text localize={false} style={styles.name}>{prefs.name}</Text><BadgeCheck size={22} color={COLORS.stonkGreen} /></View>
          <Text localize={false} style={styles.handle}>{prefs.username}</Text>
          <Text localize={false} style={styles.bio}>{prefs.bio}</Text>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { marginBottom: 26 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 25, minHeight: 42 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  circle: { width: 42, height: 42, borderRadius: 22, backgroundColor: "#292C29", borderWidth: 1, borderColor: "#383B38", justifyContent: "center", alignItems: "center" },
  profile: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 75, height: 75, borderRadius: 40, backgroundColor: COLORS.stonkDarkB, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontFamily: FONTS.regular, fontSize: 27, fontWeight: "700", color: COLORS.white },
  handle: { fontFamily: FONTS.regular, color: COLORS.grey, fontSize: 14 },
  bio: { fontFamily: FONTS.regular, color: COLORS.white, fontSize: 11, lineHeight: 17, marginTop: 9 },
});
