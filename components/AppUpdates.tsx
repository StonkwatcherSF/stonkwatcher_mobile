import { useEffect } from "react";
import { Alert, AppState } from "react-native";
import * as Updates from "expo-updates";

export default function AppUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let disposed = false;
    let busy = false;
    let lastCheck = 0;
    let prompted = false;
    let pendingRestart = false;
    const restart = () => {
      if (disposed || AppState.currentState !== "active") return;
      Alert.alert("Update ready", "Restart StonkWatcher to apply the update.", [
        { text: "Later", style: "cancel", onPress: () => { pendingRestart = false; busy = false; } },
        { text: "Restart", onPress: () => { void Updates.reloadAsync().catch(() => { busy = false; }); } },
      ], { cancelable: false });
    };
    const download = async () => {
      try {
        const update = await Updates.fetchUpdateAsync();
        if (update.isNew) { pendingRestart = true; restart(); }
        else busy = false;
      } catch {
        busy = false;
        if (!disposed && AppState.currentState === "active") Alert.alert("Update unavailable", "Could not download the update. Please try again when you reopen the app.");
      }
    };
    const check = async () => {
      if (disposed || busy || prompted || AppState.currentState !== "active" || Date.now() - lastCheck < 300_000) return;
      busy = true;
      lastCheck = Date.now();
      try {
        const update = await Updates.checkForUpdateAsync();
        if (disposed || AppState.currentState !== "active") return;
        if (update.isAvailable) {
          prompted = true;
          Alert.alert("Update available", "A new StonkWatcher update is available. Download it now?", [
            { text: "Later", style: "cancel" },
            { text: "Download", onPress: () => { busy = true; void download(); } },
          ], { cancelable: false });
        }
      } catch {
        // Offline users can keep using the installed app.
      } finally { busy = false; }
    };
    const timer = setTimeout(() => { void check(); }, 2500);
    const subscription = AppState.addEventListener("change", (status) => { if (status === "active") { if (pendingRestart) restart(); else void check(); } });
    return () => { disposed = true; clearTimeout(timer); subscription.remove(); };
  }, []);
  return null;
}
