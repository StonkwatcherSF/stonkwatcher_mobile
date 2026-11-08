import { LocalizedText as Text, LocalizedAlert as Alert } from "../components/LocalizationContext";
import { useAuth } from "../components/AuthContext";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import LottieView from "lottie-react-native";
import { useReducedMotion } from "react-native-reanimated";
import GuestIcon from "../assets/login/guest.svg";
import PhantomIcon from "../assets/login/phantom.svg";
import JupiterIcon from "../assets/login/jupiter.svg";
import Logo from "../assets/login/logo.svg";

const BRAND = "#BBDC12";
const logoAnimation = require("../assets/login/official-logo-animation.json");

function LoginBackground() {
  return (
    <View pointerEvents="none" accessible={false} style={styles.background}>
      <Image source={require("../assets/login/glow-top.png")} style={styles.glowTop} />
      <Image source={require("../assets/login/glow-bottom.png")} style={styles.glowBottom} />
      <Image source={require("../assets/login/glow-side.png")} style={styles.glowLeft} />
      <Image source={require("../assets/login/glow-side.png")} style={styles.glowRight} />
      <Image source={require("../assets/login/mathematics.png")} resizeMode="repeat" style={styles.grid} />
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithDemo } = useAuth();
  const reducedMotion = useReducedMotion();
  const signingIn = useRef(false);
  const [busy, setBusy] = useState(false);
  const [animationFailed, setAnimationFailed] = useState(false);

  const continueAsGuest = async () => {
    if (signingIn.current) return;
    signingIn.current = true;
    setBusy(true);
    try {
      await signInWithDemo("guest");
      router.replace("/wallet");
    } catch {
      Alert.alert("Sign in failed", "Could not start the guest account. Please try again.");
    } finally {
      signingIn.current = false;
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <LoginBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 32), paddingBottom: Math.max(insets.bottom, 32) + 64 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.topSpacer} />
        <View style={styles.brand}>
          <View style={styles.logo} accessible={false}>
            {reducedMotion || animationFailed ? <Logo /> : (
              <LottieView
                source={logoAnimation}
                autoPlay
                loop
                resizeMode="contain"
                style={styles.logo}
                webStyle={{ width: 79.358, height: 82 }}
                onAnimationFailure={() => setAnimationFailed(true)}
              />
            )}
          </View>
          <Text style={styles.title}>Stonk Watcher</Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={() => void continueAsGuest()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Continue as Guest"
            accessibilityState={{ disabled: busy, busy }}
            style={({ pressed }) => [styles.button, styles.guestButton, pressed && styles.pressed]}
          >
            {busy ? <ActivityIndicator color="#101010" /> : <>
              <GuestIcon />
              <Text style={styles.buttonText}>Continue as Guest</Text>
            </>}
          </Pressable>
          <View style={styles.walletButtons}>
            <Pressable accessibilityRole="button" accessibilityLabel="Phantom" style={[styles.button, styles.walletButton]}>
              <PhantomIcon />
              <Text style={styles.buttonText}>Phantom</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Jupiter" style={[styles.button, styles.walletButton]}>
              <JupiterIcon />
              <Text style={styles.buttonText}>Jupiter</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#101010", overflow: "hidden" },
  background: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  glowTop: { position: "absolute", width: 616.4, height: 616.4, left: -292.2, top: -238.2 },
  glowBottom: { position: "absolute", width: 616.4, height: 616.4, left: -3.2, bottom: -185.2 },
  glowLeft: { position: "absolute", width: 735.4, height: 735.4, left: -546.2, top: 147.8 },
  glowRight: { position: "absolute", width: 735.4, height: 735.4, left: 160.8, top: -125.2 },
  grid: { position: "absolute", left: -219, top: -10, width: 966, height: 966, opacity: 0.12 },
  content: { flexGrow: 1, minHeight: 540, paddingHorizontal: 16, justifyContent: "space-between", alignItems: "center", gap: 32 },
  topSpacer: { height: 32 },
  brand: { alignItems: "center", gap: 16 },
  logo: { width: 79.358, height: 82 },
  title: { fontFamily: "GoogleSansFlex", fontSize: 32, fontWeight: "600", color: BRAND, letterSpacing: -0.64, textAlign: "center" },
  actions: { width: "100%", gap: 12 },
  button: { minHeight: 53, padding: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  guestButton: { backgroundColor: BRAND },
  walletButtons: { flexDirection: "row", gap: 12 },
  walletButton: { flex: 1, backgroundColor: "#FFFFFF" },
  buttonText: { fontFamily: "GoogleSansFlex", fontSize: 16, lineHeight: 21, fontWeight: "600", letterSpacing: -0.32, color: "#101010", flexShrink: 1 },
  pressed: { opacity: 0.8 },
});
