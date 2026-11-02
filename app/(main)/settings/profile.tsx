import React, { useState } from "react";
import { Text, TextInput, View, Alert, Pressable, StyleSheet } from "react-native";
import { Settings } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { Page, st } from "../../../components/SettingsUI";
import { useSettings } from "../../../components/SettingsContext";
import UserAvatar from "../../../components/UserAvatar";

export default function Profile() {
  const { prefs, update } = useSettings();
  const [name, setName] = useState(prefs.name);
  const [username, setUsername] = useState(prefs.username);
  const [bio, setBio] = useState(prefs.bio);

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
      update({ avatarUri: result.assets[0].uri });
    }
  };

  return (
    <Page
      title="Profile"
      scroll
      action="Save Changes"
      onAction={() => {
        update({ name, username, bio });
        Alert.alert("Saved", "Demo profile updated for this session.");
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
      <TextInput
        style={st.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
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
      <Text style={st.label}>Google / Apple</Text>
      <Text style={[st.input, { paddingTop: 12, color: "#999" }]}>Demo account • Not connected</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
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
