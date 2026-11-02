import { SkeletonPage } from "../components/Skeleton";

import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { View } from "react-native";

import { COLORS } from "../constants/theme";
import { AuthProvider } from "../components/AuthContext";

export default function RootLayout() {
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
          backgroundColor: COLORS.black,
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

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: {
            backgroundColor: COLORS.black,
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
