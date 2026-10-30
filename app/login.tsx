
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Svg, {
  Defs,
  Pattern,
  Rect,
  Line,
} from "react-native-svg";
import { COLORS } from "../constants/theme";

// ============================================
// COLORS
// ============================================

const LIME = "#C6E900";
const BLACK = "#101010";

// ============================================
// GRID BACKGROUND
// ============================================

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

// ============================================
// LOGIN SCREEN
// ============================================

export default function LoginScreen() {
  const router = useRouter();

  const handleDemoLogin = () => {
    // Demo login only — no real authentication.
    // Replace prevents returning to login via Back.
    router.replace("/wallet" as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background */}
      <LinearGradient
        colors={[
          "#0E0F0D",
          "#11140B",
          "#1D2409",
          "#11130C",
        ]}
        locations={[0, 0.4, 0.78, 1]}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <GridBackground />

      <SafeAreaView style={styles.safeArea}>
        {/* Small brand logo */}
        <View style={styles.topArea}>
          <View style={styles.logoHexagon}>
            <Text style={styles.logoIcon}>👁</Text>
          </View>
        </View>

        {/* Center title */}
        <View style={styles.centerArea}>
          <Text style={styles.title}>
            Stonk Watcher
          </Text>
        </View>

        {/* Login buttons */}
        <View style={styles.bottomArea}>
          <Pressable
            onPress={handleDemoLogin}
            style={({ pressed }) => [
              styles.loginButton,
              styles.appleButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Apple demo"
          >
            <Text style={styles.appleSymbol}>●</Text>
            <Text style={styles.appleText}>
              Sign in with Apple
            </Text>
          </Pressable>

          <Pressable
            onPress={handleDemoLogin}
            style={({ pressed }) => [
              styles.loginButton,
              styles.googleButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google demo"
          >
            <Text style={styles.googleSymbol}>G</Text>
            <Text style={styles.googleText}>
              Sign in with Google
            </Text>
          </Pressable>

          <Text style={styles.terms}>
            By signing up, you agree to our Terms of
            Service and Privacy Policy.
          </Text>

          <Text style={styles.demoNote}>
            Demo mode • No account required
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BLACK,
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

  appleButton: {
    backgroundColor: "#FFFFFF",
  },

  googleButton: {
    backgroundColor: LIME,
  },

  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },

  appleSymbol: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "900",
  },

  appleText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "GoogleSansFlex",
  },

  googleSymbol: {
    color: "#000000",
    fontSize: 19,
    fontWeight: "900",
  },

  googleText: {
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
