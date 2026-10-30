
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { View, ActivityIndicator } from "react-native";

import { COLORS } from "../constants/theme";

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
        <ActivityIndicator color={COLORS.stonkGreen} />
      </View>
    );
  }

  return (
    <>
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
        <Stack.Screen name="(main)" />
      </Stack>
    </>
  );
}
