import { LocalizedText as Text, LocalizedAlert as Alert } from "../components/LocalizationContext";
import { useAuth } from "../components/AuthContext";

import React, { useState } from "react";
import { View, Pressable, StyleSheet, SafeAreaView, StatusBar, useWindowDimensions, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import Svg, {
  Defs,
  Pattern,
  Rect,
  Line,
} from "react-native-svg";
import type { DemoProvider } from "../lib/demo-account";

const LIME = "#C6E900";

function GridBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    >
      <Defs>
        <Pattern
          id="loginGrid"
          width="25"
          height="25"
          patternUnits="userSpaceOnUse"
        >
          <Line
            x1="25"
            y1="0"
            x2="25"
            y2="25"
            stroke="#FFFFFF"
            strokeOpacity={0.035}
            strokeWidth={0.5}
          />
          <Line
            x1="0"
            y1="25"
            x2="25"
            y2="25"
            stroke="#FFFFFF"
            strokeOpacity={0.035}
            strokeWidth={0.5}
          />
        </Pattern>
      </Defs>

      <Rect
        width="100%"
        height="100%"
        fill="url(#loginGrid)"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithDemo } = useAuth();
  const [busy, setBusy] = useState<DemoProvider | null>(null);

  const handleLogin = async (provider: DemoProvider) => {
    if (busy) return;
    setBusy(provider);
    try {
      await signInWithDemo(provider);
      router.replace("/tokens");
    } catch {
      Alert.alert("Sign in failed", "Could not start the demo account. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GridBackground />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topArea}>
          <View style={styles.logoHexagon}>
            <Text style={styles.logoIcon}>👁</Text>
          </View>
        </View>

        <View style={styles.centerArea}>
          <Text style={styles.title}>
            Stonk Watcher
          </Text>
        </View>

        <View style={styles.bottomArea}>
          <Pressable
            onPress={() => void handleLogin("google")}
            disabled={Boolean(busy)}
            style={({ pressed }) => [
              styles.loginButton,
              styles.oauthButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          >
            {busy === "google" ? (
              <ActivityIndicator color="#111111" />
            ) : (
              <Text style={styles.oauthText}>Continue with Google</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => void handleLogin("apple")}
            disabled={Boolean(busy)}
            style={({ pressed }) => [
              styles.loginButton,
              styles.oauthButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple"
          >
            {busy === "apple" ? (
              <ActivityIndicator color="#111111" />
            ) : (
              <Text style={styles.oauthText}>Continue with Apple</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => void handleLogin("guest")}
            disabled={Boolean(busy)}
            style={({ pressed }) => [
              styles.loginButton,
              styles.guestButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue as guest"
          >
            {busy === "guest" ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.guestText}>Continue as guest</Text>
            )}
          </Pressable>

          <Text style={styles.terms}>
            By continuing, you agree to our Terms of
            Service and Privacy Policy.
          </Text>

          <Text style={styles.demoNote}>
            Demo login • Fake Google / Apple accounts on this device
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  safeArea: {
    flex: 1,
  },

  topArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: "flex-start",
  },

  logoHexagon: {
    width: 32,
    height: 32,
    backgroundColor: "#283800",
    borderWidth: 1,
    borderColor: LIME,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  logoIcon: {
    color: LIME,
    fontSize: 17,
  },

  centerArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: LIME,
    letterSpacing: -0.8,
    textAlign: "center",
    fontFamily: "GoogleSansFlex",
  },

  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 10,
  },

  loginButton: {
    height: 51,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  oauthButton: {
    backgroundColor: "#FFFFFF",
  },

  guestButton: {
    backgroundColor: LIME,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  disabled: {
    opacity: 0.7,
  },

  oauthText: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "GoogleSansFlex",
  },

  guestText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "GoogleSansFlex",
  },

  terms: {
    marginTop: 6,
    color: "#C4C4C4",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    alignSelf: "center",
    maxWidth: 280,
    fontFamily: "GoogleSansFlex",
  },

  demoNote: {
    marginTop: 2,
    color: "#92968A",
    fontSize: 10,
    textAlign: "center",
    fontFamily: "GoogleSansFlex",
  },
});
