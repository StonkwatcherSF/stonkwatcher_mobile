import { SkeletonPage } from "../../components/Skeleton";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { createSessionFromUrl } from "../../lib/auth";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function finish() {
      try {
        const url = await Linking.getInitialURL();
        if (url) await createSessionFromUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not finish sign in.");
        }
      } finally {
        if (!cancelled) setDone(true);
      }
    }
    void finish();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (!done && !error) {
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

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "transparent",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: "#FF574A", textAlign: "center" }}>{error}</Text>
        <Redirect href="/login" />
      </View>
    );
  }

  return <Redirect href="/tokens" />;
}
