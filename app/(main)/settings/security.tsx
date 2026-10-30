
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

export default function Security() {
  const { prefs, update } = useSettings();
  const [locked, setLocked] = useState(prefs.screenLock);

  const saveChanges = () => {
    update({ screenLock: locked });
    Alert.alert(
      "Saved",
      "Demo screen lock preference saved. Device authentication is not enabled."
    );
  };

  return (
    <Page
      title="Security"
      action="Save Changes"
      onAction={saveChanges}
    >
      <View style={styles.container}>
        <View style={styles.row}>
          <Text style={styles.label}>Screen Lock</Text>

          <View style={styles.switchWrapper}>
            <Switch
              value={locked}
              onValueChange={setLocked}
              trackColor={{
                false: "#303030",
                true: lime,
              }}
              thumbColor="#171717"
              ios_backgroundColor="#303030"
            />
          </View>
        </View>
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
    includeFontPadding: false,
  },
  switchWrapper: {
    height: 55,
    justifyContent: "center",
    alignItems: "center",
  },
});
