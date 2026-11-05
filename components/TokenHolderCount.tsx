import React from "react";
import { StyleSheet, View } from "react-native";
import HoldersIcon from "../assets/icons/holders.svg";
import { useAsync } from "../hooks/useAsync";
import { formatCount } from "../lib/format";
import { fetchTokenHolders } from "../lib/token-holders";
import { LocalizedText as Text } from "./LocalizationContext";
import { Skeleton } from "./Skeleton";

export default function TokenHolderCount({ mint }: { mint: string }) {
  const { data, loading } = useAsync(() => fetchTokenHolders(mint), [mint]);
  return (
    <View style={styles.row}>
      <HoldersIcon width={10} height={10} />
      {loading && data === null ? <Skeleton width={28} height={10} /> : (
        <Text style={styles.text}>{formatCount(data)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  text: { color: "#A9A9A9", fontSize: 10 },
});
