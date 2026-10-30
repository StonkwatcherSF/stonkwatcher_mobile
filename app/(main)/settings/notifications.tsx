
import React, { useState } from "react";
import {
  View,
  Text,
  Switch,
  Alert,
  StyleSheet,
} from "react-native";

import { Page, lime } from "../../../components/SettingsUI";
import { useSettings } from "../../../components/SettingsContext";

type ToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  color?: string;
  disabled?: boolean;
};

function SettingToggle({
  label,
  value,
  onChange,
  color = "#FFFFFF",
  disabled = false,
}: ToggleProps) {
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.label,
          { color: disabled ? "#777777" : color },
        ]}
      >
        {label}
      </Text>

      <View style={styles.switchWrapper}>
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{
            false: "#303030",
            true: lime,
          }}
          thumbColor={value ? "#171717" : "#FFFFFF"}
          ios_backgroundColor="#303030"
          style={styles.toggle}
        />
      </View>
    </View>
  );
}

export default function Notifications() {
  const { prefs, update } = useSettings();

  const [v, setV] = useState(prefs);

  const saveChanges = () => {
    update(v);

    Alert.alert(
      "Saved",
      "Demo notification preferences saved for this session."
    );
  };

  return (
    <Page
      title="Notifications"
      action="Save Changes"
      onAction={saveChanges}
    >
      <View style={styles.container}>

        {/* ALLOW NOTIFICATIONS */}
        <SettingToggle
          label="Allow Notifications"
          value={v.notifications}
          onChange={(value) =>
            setV((prev) => ({
              ...prev,
              notifications: value,
            }))
          }
        />

        {/* ALERTS SECTION */}
        <Text style={styles.sectionTitle}>
          Alerts
        </Text>

        <SettingToggle
          label="Positions"
          value={v.positions}
          onChange={(value) =>
            setV((prev) => ({
              ...prev,
              positions: value,
            }))
          }
        />

        <SettingToggle
          label="Rug"
          color="#FF5547"
          value={v.rug}
          onChange={(value) =>
            setV((prev) => ({
              ...prev,
              rug: value,
            }))
          }
        />

        <SettingToggle
          label="Rewards"
          value={v.rewards}
          onChange={(value) =>
            setV((prev) => ({
              ...prev,
              rewards: value,
            }))
          }
        />

        <SettingToggle
          label="Announcements"
          value={v.announcements}
          onChange={(value) =>
            setV((prev) => ({
              ...prev,
              announcements: value,
            }))
          }
        />

      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingTop: 0,
  },

  row: {
    width: "100%",
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "400",
    includeFontPadding: false,
  },

  switchWrapper: {
    height: 55,
    alignItems: "center",
    justifyContent: "center",
  },

  toggle: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },

  sectionTitle: {
    color: "#999999",
    fontSize: 13,
    marginTop: 22,
    marginBottom: 5,
  },
});
