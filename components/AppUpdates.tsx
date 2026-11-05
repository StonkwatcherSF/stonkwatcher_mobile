import { LocalizedText as Text } from "./LocalizationContext";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, StyleSheet, View } from "react-native";
import * as Updates from "expo-updates";
import { Skeleton, SkeletonGroup } from "./Skeleton";

export default function AppUpdates() {
  const [stage, setStage] = useState<"idle" | "downloading" | "error">("idle");
  const retry = useRef<() => void>(() => {});
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let disposed = false;
    let busy = false;
    let lastCheck = 0;
    let pendingRestart = false;
    let required = false;
    const download = async () => {
      if (disposed || busy || AppState.currentState !== "active") return;
      busy = true;
      setStage("downloading");
      try {
        if (!pendingRestart) {
          const update = await Updates.fetchUpdateAsync();
          pendingRestart = update.isNew || update.isRollBackToEmbedded;
        }
        if (disposed) return;
        if (pendingRestart) {
          if (AppState.currentState === "active") await Updates.reloadAsync();
        } else { required = false; setStage("idle"); }
      } catch {
        if (!disposed) setStage("error");
      } finally { busy = false; }
    };
    retry.current = () => { void download(); };
    const check = async () => {
      if (disposed || busy || AppState.currentState !== "active") return;
      if (required) { void download(); return; }
      if (Date.now() - lastCheck < 60_000) return;
      busy = true;
      lastCheck = Date.now();
      try {
        const update = await Updates.checkForUpdateAsync();
        if (disposed) return;
        if (update.isAvailable || update.isRollBackToEmbedded) required = true;
      } catch {
        // If the server cannot be reached, retain the installed offline-capable app.
      } finally { busy = false; }
      if (required && !disposed) void download();
    };
    const timer = setTimeout(() => { void check(); }, 800);
    const subscription = AppState.addEventListener("change", (status) => { if (status === "active") void check(); });
    return () => { disposed = true; clearTimeout(timer); subscription.remove(); };
  }, []);
  return <Modal visible={stage !== "idle"} transparent animationType="fade" onRequestClose={() => {}}>
    <View style={styles.overlay}><View style={styles.card}>
      <Text style={styles.title}>Update required</Text>
      <Text style={styles.body}>{stage === "error" ? "The update could not be downloaded. Check your connection and retry." : "Updating StonkWatcher. The app will restart automatically."}</Text>
      {stage === "error" ? <Pressable style={styles.button} onPress={() => retry.current()} accessibilityRole="button"><Text style={styles.buttonText}>Retry</Text></Pressable> : <SkeletonGroup label="Downloading update"><Skeleton height={8} radius={4} /></SkeletonGroup>}
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(16,16,16,0.96)" },
  card: { padding: 22, borderRadius: 14, backgroundColor: "#1B2003", gap: 18, borderWidth: 1, borderColor: "#BBDC12" },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  body: { color: "#C0C0C0", fontSize: 14, lineHeight: 21 },
  button: { backgroundColor: "#BBDC12", padding: 14, alignItems: "center", borderRadius: 6 },
  buttonText: { color: "#101010", fontWeight: "700" },
});
