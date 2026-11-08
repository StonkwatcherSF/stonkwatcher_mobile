import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { LocalizedText as Text, LocalizedAlert as Alert } from "../components/LocalizationContext";
import { useAuth } from "../components/AuthContext";
import { handleWalletRedirect } from "../lib/wallet";

export default function WalletCallback() {
  const router = useRouter();
  const { completeWalletSignIn } = useAuth();
  const params = useLocalSearchParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = Linking.createURL("wallet-callback", {
          queryParams: Object.fromEntries(
            Object.entries(params).map(([key, value]) => [
              key,
              Array.isArray(value) ? value[0] : value == null ? "" : String(value),
            ]),
          ),
        });
        const result = await handleWalletRedirect(url);
        if (cancelled) return;
        if (result && "address" in result && result.address) {
          await completeWalletSignIn(result);
          router.replace("/wallet");
          return;
        }
        if (result && "lastSignature" in result && result.lastSignature) {
          Alert.alert("Trade submitted", `Signature ${result.lastSignature.slice(0, 8)}…`);
          router.replace("/tokens");
          return;
        }
        setError("Wallet did not return a session.");
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Wallet connect failed.");
      } finally {
        if (!cancelled) setDone(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [completeWalletSignIn, params, router]);

  if (error) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{error}</Text>
        <Redirect href="/login" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ActivityIndicator color="#BBDC12" />
      <Text style={styles.label}>{done ? "Finishing…" : "Connecting wallet…"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101010", gap: 12, padding: 24 },
  label: { color: "#C8C8C8", fontSize: 13 },
  error: { color: "#FF8B7E", fontSize: 13, textAlign: "center" },
});
