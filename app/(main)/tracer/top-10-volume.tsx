import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

type Period = "24 Hours" | "1 Week";
type VolumeToken = {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  marketCap: string;
  volume24h: number;
  volumeWeek: number;
  trades24h: number;
  tradesWeek: number;
};

// Illustrative demo rankings, not live blockchain statistics.
const volumeTokens: VolumeToken[] = [
  { id: "spoodermen", name: "spoodermen", symbol: "$SPOODERMEN", icon: "🕷️", marketCap: "$99K MC", volume24h: 8.4, volumeWeek: 245000, trades24h: 8, tradesWeek: 152 },
  { id: "hamstr", name: "haMSTR", symbol: "$haMSTR", icon: "🐹", marketCap: "$3.8K MC", volume24h: 133000, volumeWeek: 510000, trades24h: 54, tradesWeek: 402 },
  { id: "trump", name: "Trump Endorsed Coin", symbol: "$TEC", icon: "🪙", marketCap: "$2.4K MC", volume24h: 161000, volumeWeek: 680000, trades24h: 81, tradesWeek: 590 },
  { id: "four", name: "Unknown Token", symbol: "$TOKEN", icon: "🔹", marketCap: "$28K MC", volume24h: 797000, volumeWeek: 1840000, trades24h: 2212, tradesWeek: 6320 },
  { id: "mememan", name: "Meme Man", symbol: "$MEMEMAN", icon: "🦸", marketCap: "$203.78K MC", volume24h: 724000, volumeWeek: 2150000, trades24h: 702, tradesWeek: 3940 },
  { id: "bankroll", name: "Bankroll", symbol: "$BANKROLL", icon: "ⓑ", marketCap: "$15.39K MC", volume24h: 612000, volumeWeek: 1430000, trades24h: 641, tradesWeek: 2700 },
  { id: "gtavi", name: "GTA VI", symbol: "$GTA6", icon: "🎮", marketCap: "$87K MC", volume24h: 487000, volumeWeek: 1760000, trades24h: 523, tradesWeek: 2850 },
  { id: "solcat", name: "Sol Cat", symbol: "$SCAT", icon: "🐱", marketCap: "$62K MC", volume24h: 352000, volumeWeek: 910000, trades24h: 410, tradesWeek: 1800 },
  { id: "moon", name: "Moon Rocket", symbol: "$MOON", icon: "🚀", marketCap: "$112K MC", volume24h: 296000, volumeWeek: 1270000, trades24h: 325, tradesWeek: 2210 },
  { id: "frog", name: "Frog Club", symbol: "$FROG", icon: "🐸", marketCap: "$41K MC", volume24h: 189000, volumeWeek: 770000, trades24h: 214, tradesWeek: 1330 },
];

function formatVolume(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toFixed(2)}`;
}

export default function Top10VolumeScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("24 Hours");

  const rankedTokens = useMemo(() => {
    const field = period === "24 Hours" ? "volume24h" : "volumeWeek";
    return [...volumeTokens].sort((a, b) => b[field] - a[field]);
  }, [period]);

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
          {rankedTokens.map((token, index) => {
            const volume = period === "24 Hours" ? token.volume24h : token.volumeWeek;
            const trades = period === "24 Hours" ? token.trades24h : token.tradesWeek;
            return (
              <Pressable
                key={token.id}
                style={styles.tokenRow}
                onPress={() =>
                  Alert.alert("Demo token", "Token analysis for this demo token is not connected yet.")
                }
              >
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.tokenIcon}>
                  <Text style={styles.tokenEmoji}>{token.icon}</Text>
                </View>
                <View style={styles.tokenInfo}>
                  <Text numberOfLines={1} style={styles.tokenName}>
                    {token.name} <Text style={styles.symbol}>{token.symbol}</Text>
                  </Text>
                  <Text style={styles.subText}>{token.marketCap}</Text>
                </View>
                <View style={styles.rightInfo}>
                  <Text style={styles.rightText}>
                    {period === "24 Hours" ? "24h" : "7d"} {formatVolume(volume)}
                  </Text>
                  <Text style={styles.subText}>♧ {trades.toLocaleString("en-US")}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.demoNote}>Demo preview • Token values and rankings are illustrative.</Text>
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
  tokenIcon: { width: 43, height: 43, borderRadius: 23, backgroundColor: "#202B29", alignItems: "center", justifyContent: "center" },
  tokenEmoji: { fontSize: 24 },
  tokenInfo: { flex: 1, minWidth: 0 },
  tokenName: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  symbol: { color: "#C2C2C2", fontWeight: "400", fontSize: 10 },
  subText: { color: "#A9A9A9", fontSize: 10, marginTop: 5 },
  rightInfo: { alignItems: "flex-end", justifyContent: "center" },
  rightText: { color: "#F1F1F1", fontSize: 10 },
  demoNote: { color: "#8E8E8E", textAlign: "center", fontSize: 10, marginTop: 18 },
});
