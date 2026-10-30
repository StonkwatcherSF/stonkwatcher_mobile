
import React from "react";
import { View, StyleSheet } from "react-native";
import { Stack, usePathname } from "expo-router";

import BottomNav from "../../components/BottomNav";
import {
  NavAnimationProvider,
} from "../../components/NavAnimationContext";
import {
  BlacklistProvider,
} from "../../components/BlacklistContext";
import {
  SettingsProvider,
} from "../../components/SettingsContext";

export default function MainLayout() {
  return (
    <NavAnimationProvider>
      <BlacklistProvider>
        <SettingsProvider>
          <MainContent />
        </SettingsProvider>
      </BlacklistProvider>
    </NavAnimationProvider>
  );
}

function MainContent() {
  const pathname = usePathname();

  const isSnapshot =
    pathname === "/wallet/calendar/snapshot";

  const isDex =
    pathname === "/dex" ||
    pathname.startsWith("/dex/");

  const isSettings =
    pathname === "/settings" ||
    pathname.startsWith("/settings/");

  const isWithdraw =
    pathname === "/wallet/withdraw" ||
    pathname.startsWith("/wallet/withdraw/");

  const isSend =
    pathname === "/wallet/send" ||
    pathname.startsWith("/wallet/send/");

  const hideBottomNav =
    isSnapshot ||
    isDex ||
    isSettings ||
    isWithdraw ||
    isSend;

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      >
        {/* Tokens */}
        <Stack.Screen name="tokens" />

        {/* Tracer */}
        <Stack.Screen name="tracer/index" />

        {/* Wallet */}
        <Stack.Screen name="wallet/index" />
        <Stack.Screen name="wallet/calendar" />
        <Stack.Screen name="wallet/calendar/snapshot" />

        {/* Deposit Bottom Sheet */}
        <Stack.Screen
          name="settings/deposit"
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "fade",
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        />

        {/* Withdraw */}
        <Stack.Screen
          name="wallet/withdraw/index"
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "none",
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        />

        <Stack.Screen
          name="wallet/withdraw/details"
          options={{
            presentation: "transparentModal",
            animation: "fade",
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        />

        {/* Send */}
        <Stack.Screen
          name="wallet/send/index"
          options={{
            presentation: "transparentModal",
            animation: "fade",
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        />

        {/* DEX */}
        <Stack.Screen name="dex/[tokenId]" />
        <Stack.Screen name="dex/buy" />
        <Stack.Screen name="dex/sell" />

        {/* Blacklist */}
        <Stack.Screen name="blacklist/index" />

        <Stack.Screen
          name="blacklist/list"
          options={{
            presentation: "transparentModal",
            animation: "fade",
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        />
      </Stack>

      {!hideBottomNav && <BottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101010",
  },
});
