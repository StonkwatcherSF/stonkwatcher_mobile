import AppUpdates from "../components/AppUpdates";
import { AppBackgroundProvider } from "../components/AppBackground";
import { SkeletonPage } from "../components/Skeleton";

import React from "react";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { View } from "react-native";

import { AuthProvider } from "../components/AuthContext";

const APP_THEME = { ...DarkTheme, colors: { ...DarkTheme.colors, background: "transparent" } };

export default function RootLayout() {
  return <ThemeProvider value={APP_THEME}><AppBackgroundProvider><RootContent /></AppBackgroundProvider></ThemeProvider>;
}

function RootContent() {
  const [fontsLoaded, fontError] = useFonts({
    GoogleSansFlex: require("../assets/fonts/GoogleSansFlex.ttf"),
  });

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "transparent",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SkeletonPage />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppUpdates />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: {
            backgroundColor: "transparent",
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="(main)" />
      </Stack>
    </AuthProvider>
  );
}
