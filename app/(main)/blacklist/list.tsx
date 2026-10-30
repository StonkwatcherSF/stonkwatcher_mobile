import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import BlacklistListPanel from "../../../components/BlacklistListPanel";

// Direct route for the icon on the Blacklist home screen.
// When opened from BlacklistSheet, the same panel is layered INSIDE that modal.
export default function BlacklistList() {
  const router = useRouter();
  const close = () => router.back();
  return (
    <View style={styles.overlay}>
      <Stack.Screen options={{ headerShown: false, presentation: "transparentModal", animation: "fade", contentStyle: { backgroundColor: "transparent" } }} />
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close blacklist list" />
      <BlacklistListPanel onBack={close} onDragDown={close} />
    </View>
  );
}

const styles = StyleSheet.create({ overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.66)" } });
