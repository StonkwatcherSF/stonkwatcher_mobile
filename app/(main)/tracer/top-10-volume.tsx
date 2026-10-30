import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import TokenImage from "../../../components/TokenImage";
import { useVolumeLeaders } from "../../../hooks/useVolumeLeaders";
import { compactUsd, formatCount, formatMc, prettySymbol } from "../../../lib/format";
import { truncateAddress } from "../../../lib/solana";
import type { VolumeLeaderWindow } from "../../../lib/types";

type Period = "24 Hours" | "1 Week";

export default function Top10VolumeScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("24 Hours");
  const window: VolumeLeaderWindow = period === "1 Week" ? "1w" : "24h";
  const { data: rankedTokens, loading } = useVolumeLeaders(window);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to Tracer"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={21} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.title}>Top 10 Volume</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.description}>
          Graduated tokens under 1 week old that are still above $40k, ranked by trading volume.
        </Text>

        <View style={styles.periodSelector}>
          {(["24 Hours", "1 Week"] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setPeriod(option)}
              style={[styles.periodButton, period === option && styles.periodSelected]}
            >
              <Text style={[styles.periodText, period === option && styles.periodSelectedText]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.list}>
          {loading && !(rankedTokens?.length) ? (
            <ActivityIndicator color="#C6E900" style={{ marginVertical: 24 }} />
          ) : null}
          {(rankedTokens ?? []).map((token, index) => (
              <Pressable
                key={token.mint}
                style={styles.tokenRow}
                onPress={() =>
                  router.push({ pathname: "/tracer/[address]", params: { address: token.mint } })
                }
              >
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{token.rank || index + 1}</Text>
                </View>
                <View style={styles.tokenIcon}>
                  <TokenImage uri={token.imageUrl} style={styles.tokenImage} />
                </View>
                <View style={styles.tokenInfo}>
                  <Text numberOfLines={1} style={styles.tokenName}>
                    {token.name || truncateAddress(token.mint)} <Text style={styles.symbol}>{prettySymbol(token.symbol)}</Text>
                  </Text>
                  <Text style={styles.subText}>{formatMc(token.marketCapUsd)}</Text>
                </View>
                <View style={styles.rightInfo}>
                  <Text style={styles.rightText}>
                    {period === "24 Hours" ? "24h" : "7d"} {compactUsd(token.volume24hUsd)}
                  </Text>
                  <Text style={styles.subText}>♧ {formatCount(token.newHolders)}</Text>
                </View>
              </Pressable>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#10110B" },
  content: { paddingHorizontal: 18, paddingTop: 54, paddingBottom: 145 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#303030", alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 36 },
  title: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  description: { color: "#B0B0B0", fontSize: 11, lineHeight: 17, marginBottom: 14 },
  periodSelector: { flexDirection: "row", alignSelf: "flex-start", borderWidth: 1, borderColor: "#A4C200", borderRadius: 5, padding: 2, marginBottom: 14 },
  periodButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 3 },
  periodSelected: { backgroundColor: "#F1F8D0" },
  periodText: { color: "#FFFFFF", fontSize: 11 },
  periodSelectedText: { color: "#171717", fontWeight: "700" },
  list: { gap: 5 },
  tokenRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#151515", borderRadius: 5, minHeight: 69, paddingHorizontal: 9, gap: 7 },
  rank: { width: 23, height: 23, borderRadius: 12, backgroundColor: "#293000", alignItems: "center", justifyContent: "center" },
  rankText: { color: "#D9EF4A", fontSize: 12, fontWeight: "700" },
  tokenIcon: { width: 43, height: 43, borderRadius: 23, backgroundColor: "#202B29", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  tokenImage: { width: "100%", height: "100%", borderRadius: 23 },
  tokenInfo: { flex: 1, minWidth: 0 },
  tokenName: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  symbol: { color: "#C2C2C2", fontWeight: "400", fontSize: 10 },
  subText: { color: "#A9A9A9", fontSize: 10, marginTop: 5 },
  rightInfo: { alignItems: "flex-end", justifyContent: "center" },
  rightText: { color: "#F1F1F1", fontSize: 10 },
  demoNote: { color: "#8E8E8E", textAlign: "center", fontSize: 10, marginTop: 18 },
});
