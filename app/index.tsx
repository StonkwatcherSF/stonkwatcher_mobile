import React from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "../components/AuthContext";
import { SkeletonPage } from "../components/Skeleton";

export default function Index() {
  const { loading, isSignedIn } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <SkeletonPage />
      </View>
    );
  }

  return <Redirect href={isSignedIn ? "/tokens" : "/login"} />;
}
