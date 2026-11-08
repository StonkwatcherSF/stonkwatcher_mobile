import { LocalizedText as Text, LocalizedTextInput as TextInput, LocalizedAlert as Alert } from "../../../components/LocalizationContext";
import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Switch } from "react-native";
import { Settings } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Page, st, lime } from "../../../components/SettingsUI";
import { useAuth } from "../../../components/AuthContext";
import { usePortfolio } from "../../../components/PortfolioContext";
import { useSettings } from "../../../components/SettingsContext";
import UserAvatar from "../../../components/UserAvatar";
import { providerTitle } from "../../../lib/demo-account";
import { PAPER_TRADE_CASH } from "../../../lib/config";
import { saveProfileAvatar } from "../../../utils/profile-avatar";

const usernameValue = (value: string) => value.replace(/[@\s]/gu, "");

export default function Profile() {
  const { prefs, update } = useSettings();
  const { demoAccount, wallet, isLiveWallet, updateDemoAccount } = useAuth();
  const { grantPaperCash, paperFunded } = usePortfolio();
  const [name, setName] = useState(prefs.name);
  const [username, setUsername] = useState(() => usernameValue(prefs.username));
  const [bio, setBio] = useState(prefs.bio);
  const [paperTrade, setPaperTrade] = useState(prefs.paperTrade);

  useEffect(() => {
    setName(prefs.name);
    setUsername(usernameValue(prefs.username));
    setBio(prefs.bio);
    setPaperTrade(prefs.paperTrade);
  }, [prefs.name, prefs.username, prefs.bio, prefs.paperTrade]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo access to update your profile image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled) {
      try {
        const avatarUri = await saveProfileAvatar(result.assets[0].uri);
        update({ avatarUri });
      } catch {
        Alert.alert("Unable to save", "Could not save the profile image. Please try again.");
      }
    }
  };

  return (
    <Page
      title="Profile"
      scroll
      action="Save Changes"
      onAction={() => {
        const handle = usernameValue(username);
        if (!handle) {
          Alert.alert("Username required", "Enter a username after the @ symbol.");
          return;
        }
        if (isLiveWallet) {
          update({ name, username: `@${handle}`, bio });
          Alert.alert("Saved", "Profile updated for this wallet.");
          return;
        }
        update({ name, username: `@${handle}`, bio, paperTrade });
        if (paperTrade) {
          const funded = grantPaperCash();
          if (funded) {
            void updateDemoAccount({ paperTrade: true, paperFunded: true });
            Alert.alert(
              "Saved",
              `Paper trading is on. $${PAPER_TRADE_CASH.toLocaleString("en-US")} was added to this account.`,
            );
            return;
          }
          Alert.alert(
            "Saved",
            paperFunded
              ? "Paper trading is on. Your existing demo balance was kept."
              : "Demo profile updated for this account.",
          );
          return;
        }
        Alert.alert("Saved", "Demo profile updated for this account.");
      }}
    >
      <View style={styles.avatarRow}>
        <Pressable
          onPress={pickAvatar}
          accessibilityRole="button"
          accessibilityLabel="Edit profile image"
        >
          <View style={styles.avatarWrap}>
            <UserAvatar style={styles.avatar} />
            <View style={styles.gear}>
              <Settings size={16} color="#D6D6D6" />
            </View>
          </View>
        </Pressable>
      </View>

      <Text style={st.label}>Display Name</Text>
      <TextInput style={st.input} value={name} onChangeText={setName} />
      <Text style={st.label}>Username</Text>
      <View style={[st.input, styles.usernameField]}>
        <Text style={styles.usernamePrefix}>@</Text>
        <TextInput
          style={styles.usernameInput}
          value={username}
          onChangeText={(value) => setUsername(usernameValue(value))}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          accessibilityLabel="Username, with a fixed @ prefix"
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={st.label}>Bio</Text>
        <Text style={st.muted}>{bio.length}/130</Text>
      </View>
      <TextInput
        multiline
        maxLength={130}
        style={[st.input, { height: 115, textAlignVertical: "top", paddingTop: 12 }]}
        value={bio}
        onChangeText={setBio}
      />
      <Text style={st.label}>Connected wallet</Text>
      <Text style={[st.input, { paddingTop: 12, color: "#999" }]} localize={false}>
        {wallet
          ? `${wallet.provider === "phantom" ? "Phantom" : "Jupiter"} • ${wallet.address.slice(0, 4)}…${wallet.address.slice(-4)}`
          : demoAccount
            ? `${providerTitle(demoAccount.provider)} • ${demoAccount.email}`
            : "Demo account • Not connected"}
      </Text>
      {!isLiveWallet ? (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Paper Trade</Text>
          <Switch
            accessibilityLabel="Paper Trade"
            value={paperTrade}
            onValueChange={setPaperTrade}
            trackColor={{ false: "#303030", true: lime }}
            thumbColor={paperTrade ? "#171717" : "#FFFFFF"}
            ios_backgroundColor="#303030"
          />
        </View>
      ) : (
        <Text style={[st.muted, { marginBottom: 20 }]}>
          Live trading uses your connected wallet balances.
        </Text>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
  },
  toggleLabel: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
  },
  usernameField: {
    flexDirection: "row",
    alignItems: "center",
  },
  usernamePrefix: {
    color: "white",
    fontSize: 14,
  },
  usernameInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 43,
    color: "white",
    fontSize: 14,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  avatarRow: {
    marginBottom: 28,
  },
  avatarWrap: {
    width: 88,
    height: 88,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  gear: {
    position: "absolute",
    right: 0,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2A2C2A",
    borderWidth: 1,
    borderColor: "#3A3D3A",
    alignItems: "center",
    justifyContent: "center",
  },
});
