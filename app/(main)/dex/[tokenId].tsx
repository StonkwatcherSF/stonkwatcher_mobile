import React, { useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, Alert, Image } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Line, Rect, Text as SvgLabel } from "react-native-svg";
import { ArrowLeft, BadgeCheck, Copy, Send, SlidersHorizontal } from "lucide-react-native";
import { COLORS, FONTS, GRADIENTS } from "../../../constants/theme";
import TradeSheet from "../../../components/TradeSheet";
import TradeConfirmation from "../../../components/TradeConfirmation";
import { shareExternally } from "../../../utils/share";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import HistoryIcon from "../../../assets/icons/transaction-history.svg";
import WalletHistorySheet from "../../../components/WalletHistorySheet";

const PLACEHOLDER = require("../../../assets/images/placeholder.png");

type TokenInfo = { name: string; symbol: string; icon: string; marketCap: string; price: string; change: number };
const TOKEN_DATA: Record<string, TokenInfo> = {
  "stonk-watcher": { name: "Stonk Watcher", symbol: "STNK", icon: "🟢", marketCap: "$1.32M", price: "$0.00156", change: 20.61 },
  "anonymous-cat": { name: "Anonymous Cat", symbol: "CAT", icon: "🐱", marketCap: "$52.87M", price: "$0.054631", change: -10.23 },
  nullmask: { name: "Nullmask", symbol: "NULL", icon: "🎭", marketCap: "$28.71M", price: "$0.028718", change: -2.59 },
  "super-inu": { name: "Super Inu", symbol: "INU", icon: "🐕", marketCap: "$15.39M", price: "$0.0154", change: 32.64 },
};
const PERIODS = ["1s", "1m", "5m", "15m", "1h", "All"] as const;
type Period = (typeof PERIODS)[number];
type InfoTab = "Transactions" | "Token Info";
const INFO_TABS: InfoTab[] = ["Transactions", "Token Info"];

// Figma placeholder values; not live token analytics.
const DEMO_TOKEN_METRICS = [
  { label: "Top 10 Holder", value: "10%" },
  { label: "Dev Hold Percentage", value: "33%" },
  { label: "Snipers Hold", value: "2%" },
  { label: "Freeze Auth", value: "20%" },
  { label: "Mint Auth", value: "15%" },
  { label: "Dex", value: "120%" },
  { label: "Buyback", value: "40%" },
  { label: "Burn", value: "103%" },
  { label: "Clusters", value: "10%" },
];

const DEMO_HOLDER_REWARDS = [
  { label: "Paid to Holders", value: "$12.0M", note: "7.4k ZEC" },
  { label: "Pending Payout", value: "$0", note: "0 ZEC" },
  { label: "Payouts", value: "1,801,149" },
  { label: "Holders", value: "28,727" },
];

function TokenInfoPanel() {
  return (
    <View style={styles.tokenInfoPanel}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Token Info <Text style={styles.sectionAccent}>♙</Text></Text>
        <Text style={styles.demoIndicator}>Demo statistics</Text>
      </View>
      <View style={styles.metricGrid}>
        {DEMO_TOKEN_METRICS.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel} numberOfLines={2}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.sectionHeading, styles.rewardsHeading]}>
        <Text style={styles.sectionTitle}>Holder Rewards <Text style={styles.sectionAccent}>♕</Text></Text>
        <Text style={styles.sectionTime}>Last 13h ago</Text>
      </View>
      <View style={styles.rewardGrid}>
        {DEMO_HOLDER_REWARDS.map((reward) => (
          <View key={reward.label} style={styles.rewardCard}>
            <Text style={styles.rewardLabel}>{reward.label}</Text>
            <Text style={styles.rewardValue}>{reward.value}</Text>
            {reward.note ? <Text style={styles.rewardNote}>{reward.note}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}


function DemoCandles({ width, period }: { width: number; period: Period }) {
  const height = 255;
  const right = 47;
  const chartWidth = width - right;
  const candles = useMemo(() => {
    const seed = PERIODS.indexOf(period) + 1;
    return Array.from({ length: 27 }, (_, i) => {
      const center = 0.47 + Math.sin(i * 0.69 + seed * 0.2) * 0.12 + Math.sin(i * 0.21 + seed) * 0.19 - i * 0.008;
      const open = Math.max(0.13, Math.min(0.87, center));
      const close = Math.max(0.13, Math.min(0.87, center + Math.sin(i * 1.83 + seed) * 0.16));
      return { open, close, high: Math.max(0.04, Math.min(open, close) - 0.065), low: Math.min(0.96, Math.max(open, close) + 0.075) };
    });
  }, [period]);
  const y = (v: number) => v * height;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: 7 }, (_, i) => <Line key={`h${i}`} x1={0} x2={chartWidth} y1={i * 42 + 2} y2={i * 42 + 2} stroke="#27300E" strokeWidth={0.5} />)}
      {Array.from({ length: 9 }, (_, i) => <Line key={`v${i}`} y1={0} y2={height} x1={i * chartWidth / 8} x2={i * chartWidth / 8} stroke="#27300E" strokeWidth={0.5} />)}
      {candles.map((c, i) => {
        const x = 5 + i * ((chartWidth - 12) / candles.length);
        const rising = c.close < c.open;
        const color = rising ? COLORS.buy : COLORS.sell;
        return <React.Fragment key={i}>
          <Line x1={x + 3} x2={x + 3} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1.5} />
          <Rect x={x} y={y(Math.min(c.open, c.close))} width={6} height={Math.max(3, Math.abs(y(c.close) - y(c.open)))} rx={1.5} fill={color} />
        </React.Fragment>;
      })}
      <Line x1={0} x2={chartWidth} y1={135} y2={135} stroke={COLORS.stonkGreen} strokeWidth={1} strokeDasharray="5 5" opacity={0.5} />
      {['$36.5k', '$36.4k', '$36.3k', '$36.2k', '$36.1k'].map((label, i) => <React.Fragment key={label}>
        <Rect x={chartWidth + 2} y={i * 49 + 4} width={right - 3} height={18} fill="transparent" />
        <SvgText x={chartWidth + 4} y={i * 49 + 17} label={label} />
      </React.Fragment>)}
    </Svg>
  );
}
function SvgText({ x, y, label }: { x: number; y: number; label: string }) {
  return <SvgLabel x={x} y={y} fill={COLORS.grey} fontSize={9}>{label}</SvgLabel>;
}

export default function DexTokenScreen() {
  const router = useRouter();
  const positionShotRef = useRef<React.ElementRef<typeof ViewShot>>(null);
  const [sharingPosition, setSharingPosition] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const { tokenId } = useLocalSearchParams<{ tokenId?: string }>();
  const { width } = useWindowDimensions();
  const token = TOKEN_DATA[typeof tokenId === "string" ? tokenId : ""];
  const [period, setPeriod] = useState<Period>("1m");
  const [infoTab, setInfoTab] = useState<InfoTab>("Transactions");
  const [tradeMode, setTradeMode] = useState<"buy" | "sell" | null>(null);
  const [confirmedTrade, setConfirmedTrade] = useState<{
    mode: "buy" | "sell";
    tokenId: string;
    amount: number;
  } | null>(null);

  if (!token) {
    return <SafeAreaView style={styles.root}><Pressable onPress={() => router.back()} style={styles.back}><ArrowLeft color={COLORS.white} /></Pressable><Text style={styles.heading}>Token not found</Text></SafeAreaView>;
  }
  const positive = token.change >= 0;

  const handleSharePosition = async () => {
    if (sharingPosition) return;
    setSharingPosition(true);
    try {
      const capture = positionShotRef.current?.capture;
      if (!capture) throw new Error("Position card is not ready yet.");
      const uri = await capture();
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing unavailable", "This device does not support sharing images.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: `Share ${token.name} position`,
      });
    } catch (error) {
      Alert.alert("Unable to share position", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSharingPosition(false);
    }
  };

  const handleShareToken = () => {
    void shareExternally({
      title: `${token.name} on Stonk Watcher`,
      message: [
        `${token.name} ($${token.symbol})`,
        `Market Cap: ${token.marketCap}`,
        `Price: ${token.price}`,
        `Change: ${positive ? "+" : ""}${token.change.toFixed(2)}%`,
        `Stonk Watcher (Demo data)`,
      ].join("\n"),
    });
  };
  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          gestureEnabled: tradeMode === null,
        }}
      />
      <LinearGradient colors={GRADIENTS.tokens} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable accessibilityLabel="Back to tokens" onPress={() => router.back()} style={styles.round}><ArrowLeft color={COLORS.white} size={23} /></Pressable>
            <View style={styles.headerRight}>
              <View style={styles.balanceGroup}>
                <Image source={PLACEHOLDER} style={styles.robotImage} resizeMode="cover" />
                <Text style={styles.balanceAmount} numberOfLines={1}>$93,737.34</Text>
              </View>
              <Pressable
                style={styles.round}
                onPress={() => setHistoryVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Open transaction history"
              >
                <HistoryIcon width={21} height={21} />
              </Pressable>
              <Pressable
                style={styles.round}
                onPress={handleShareToken}
                accessibilityRole="button"
                accessibilityLabel="Share token details"
              >
                <Send color={COLORS.grey} size={19} />
              </Pressable>
            </View>
          </View>
          <View style={styles.tokenHeader}>
            <View style={styles.tokenAvatar}><Image source={PLACEHOLDER} style={styles.tokenImage} resizeMode="cover" /></View>
            <View style={{ flex: 1 }}><View style={styles.nameRow}><Text style={styles.tokenName}>{token.name}</Text><BadgeCheck size={17} color={COLORS.stonkGreen} /></View><View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}><Text style={styles.symbol}>${token.symbol}</Text><Copy size={12} color={COLORS.grey} /></View></View>
            <View style={styles.marketInfo}><Text style={styles.marketLabel}>MC</Text><Text style={styles.marketValue}>{token.marketCap}</Text><Text style={[styles.change, { color: positive ? COLORS.buy : COLORS.sell }]}>{positive ? "▲" : "▼"} {Math.abs(token.change).toFixed(2)}%</Text></View>
          </View>
          <View style={styles.chart}><DemoCandles width={Math.max(280, width - 30)} period={period} /></View>
          <View style={styles.periodRow}>{PERIODS.map(p => <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.periodButton, period === p && styles.selectedPeriod]}><Text style={[styles.periodText, period === p && styles.selectedText]}>{p}</Text></Pressable>)}<SlidersHorizontal size={17} color={COLORS.grey} style={{ marginLeft: 5 }} /></View>
          <LinearGradient colors={["#181C09", "#262D05"]} style={styles.positionOuter}>
            <ViewShot ref={positionShotRef} options={{ format: "png", quality: 1, result: "tmpfile" }}>
              <View style={styles.positionInner} collapsable={false}><Text style={styles.positionTitle}>Your Position <Text style={styles.demoLabel}>(Demo)</Text></Text><View style={styles.positionValues}><View><Text style={styles.positionAmount}>$3,629.35</Text><Text style={styles.muted}>20.35 {token.symbol}</Text></View><View style={{ alignItems: "flex-end" }}><Text style={styles.pnl}>+$1,532.52</Text><Text style={styles.pnlBadge}>▲ 20.61%</Text></View></View><View style={styles.positionFoot}><Text style={styles.muted}>Invested  <Text style={styles.white}>$529.10</Text></Text><Text style={styles.muted}>Avg. entry  <Text style={styles.white}>$12.43K MC</Text></Text></View></View>
            </ViewShot>
            <Pressable style={styles.share} disabled={sharingPosition} onPress={handleSharePosition} accessibilityRole="button" accessibilityLabel="Share your position"><Send color={COLORS.white} size={14} /><Text style={styles.shareText}>Share</Text></Pressable>
          </LinearGradient>
          <View style={styles.tabs}>{INFO_TABS.map(tab => <Pressable key={tab} style={[styles.tab, infoTab === tab && styles.tabActive]} onPress={() => setInfoTab(tab)}><Text numberOfLines={1} style={[styles.tabText, infoTab === tab && styles.tabTextActive]}>{tab === "Transactions" ? "14 Transactions" : tab}</Text></Pressable>)}</View>
          {infoTab === "Transactions" ? (
            Array.from({ length: 5 }, (_, i) => (
              <View style={styles.txRow} key={i}>
                <View>
                  <Text style={styles.txName}>
                    {i === 4 ? "Received" : "Buy"}
                  </Text>
                  <Text style={styles.txTime}>Oct 18 at 9:35 AM</Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.txAmount}>+$12.50</Text>
                  <Text style={styles.txTime}>1.88 at $82.2M MC</Text>
                </View>
              </View>
            ))
          ) : (
            <TokenInfoPanel />
          )}
        </ScrollView>
        <View style={styles.bottomBar}><Pressable style={[styles.tradeButton, { backgroundColor: COLORS.sell }]} onPress={() => setTradeMode("sell")}><Text style={styles.tradeText}>Sell</Text></Pressable><Pressable style={[styles.tradeButton, { backgroundColor: COLORS.buy }]} onPress={() => setTradeMode("buy")}><Text style={styles.tradeText}>Buy</Text></Pressable></View>
      </SafeAreaView>

      <WalletHistorySheet visible={historyVisible} onClose={() => setHistoryVisible(false)} />

      {tradeMode !== null && (
        <TradeSheet
          mode={tradeMode}
          tokenId={typeof tokenId === "string" ? tokenId : "stonk-watcher"}
          onClose={() => setTradeMode(null)}
          onTradeConfirmed={(mode, tokenId, amount) => {
            setConfirmedTrade({ mode, tokenId, amount });
            setTradeMode(null);
          }}
        />
      )}
      {confirmedTrade !== null && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 65,
            left: 16,
            right: 16,
            alignItems: "center",
            zIndex: 200,
            elevation: 200,
          }}
        >
          <TradeConfirmation
            tokenName={TOKEN_DATA[confirmedTrade.tokenId]?.name ?? token.name}
            mode={confirmedTrade.mode}
            amount={confirmedTrade.amount}
            onDismiss={() => setConfirmedTrade(null)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black }, safe: { flex: 1 }, content: { paddingHorizontal: 15, paddingBottom: 22 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", position: "relative", minHeight: 44, marginTop: 7, marginBottom: 18 },
  back: { margin: 20 }, heading: { color: COLORS.white, fontSize: 22, margin: 20 },
  round: { width: 37, height: 37, borderRadius: 19, borderWidth: 1, borderColor: "#424638", backgroundColor: "#292D21", alignItems: "center", justifyContent: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  tokenHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }, tokenAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.stonkDarkestB, alignItems: "center", justifyContent: "center" }, tokenEmoji: { fontSize: 32 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 }, tokenName: { fontFamily: FONTS.regular, fontSize: 18, fontWeight: "700", color: COLORS.white, flexShrink: 1 }, symbol: { color: COLORS.grey, fontFamily: FONTS.regular, marginTop: 5 }, marketInfo: { alignItems: "flex-end" }, marketLabel: { color: COLORS.grey, fontSize: 10 }, marketValue: { color: COLORS.white, fontSize: 19, fontWeight: "700" }, change: { fontSize: 11, marginTop: 3 },
  chart: { marginHorizontal: -4, marginTop: 4, alignItems: "center" }, periodRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 15, gap: 3 }, periodButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 3, backgroundColor: COLORS.stonkDarkG }, selectedPeriod: { backgroundColor: COLORS.stonkGreen }, periodText: { color: COLORS.grey, fontSize: 11 }, selectedText: { color: COLORS.black, fontWeight: "700" },
  positionOuter: { borderRadius: 12, padding: 4, marginBottom: 18 }, positionInner: { backgroundColor: "#1C1C1C", borderRadius: 9, padding: 15 }, positionTitle: { color: COLORS.stonkGreen, fontSize: 13, fontFamily: FONTS.regular }, demoLabel: { color: COLORS.grey, fontSize: 10 }, positionValues: { flexDirection: "row", justifyContent: "space-between", marginTop: 7 }, positionAmount: { color: COLORS.white, fontSize: 23, fontWeight: "700" }, muted: { color: COLORS.grey, fontSize: 12, marginTop: 4 }, pnl: { color: COLORS.buy, fontSize: 19, fontWeight: "700" }, pnlBadge: { color: COLORS.buy, fontSize: 11, marginTop: 5 }, positionFoot: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap" }, white: { color: COLORS.white, fontFamily: FONTS.regular, fontSize: 12 }, share: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, minHeight: 34 }, shareText: { color: COLORS.white, fontFamily: FONTS.regular, fontSize: 12 },
  tabs: { flexDirection: "row", borderWidth: 1, borderColor: COLORS.stonkGreen, borderRadius: 5, padding: 3, gap: 3, marginBottom: 8 }, tab: { flex: 1, backgroundColor: COLORS.stonkDarkG, borderRadius: 4, alignItems: "center", justifyContent: "center", paddingVertical: 10 }, tabActive: { backgroundColor: COLORS.stonkLightG }, tabText: { color: COLORS.white, fontSize: 10, fontFamily: FONTS.regular }, tabTextActive: { color: COLORS.black, fontWeight: "700" },
  txRow: { backgroundColor: "#1A1A1A", borderRadius: 7, padding: 12, marginBottom: 5, flexDirection: "row", justifyContent: "space-between" }, txName: { color: COLORS.white, fontSize: 15 }, txTime: { color: COLORS.grey, fontSize: 10, marginTop: 5 }, txAmount: { color: COLORS.buy, fontSize: 13 }, infoBox: { backgroundColor: "#1A1A1A", borderRadius: 8, padding: 20, gap: 8 },
  tokenInfoPanel: { marginHorizontal: -15, paddingHorizontal: 15, paddingBottom: 14, backgroundColor: "#141414" },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  sectionTitle: { color: COLORS.white, fontSize: 14, fontFamily: FONTS.regular, fontWeight: "700" },
  sectionAccent: { color: COLORS.stonkGreen },
  demoIndicator: { color: COLORS.grey, fontSize: 10 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  metricCard: { width: "32.5%", minHeight: 67, flexGrow: 1, backgroundColor: "#202020", borderRadius: 5, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, paddingVertical: 8 },
  metricValue: { color: COLORS.white, fontSize: 15, fontFamily: FONTS.regular, fontWeight: "600" },
  metricLabel: { color: COLORS.grey, fontSize: 9, marginTop: 4, textAlign: "center" },
  rewardsHeading: { marginTop: 10 },
  sectionTime: { color: COLORS.grey, fontSize: 10 },
  rewardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  rewardCard: { width: "49%", flexGrow: 1, minHeight: 82, backgroundColor: "#202020", borderRadius: 5, alignItems: "center", justifyContent: "center", padding: 7 },
  rewardLabel: { color: COLORS.grey, fontSize: 10, textAlign: "center" },
  rewardValue: { color: COLORS.white, fontSize: 15, fontWeight: "700", marginTop: 4 },
  rewardNote: { color: COLORS.grey, fontSize: 9, marginTop: 2 },
  bottomBar: { flexDirection: "row", paddingHorizontal: 15, paddingTop: 9, paddingBottom: 8, gap: 9, backgroundColor: COLORS.black }, tradeButton: { flex: 1, height: 48, borderRadius: 5, justifyContent: "center", alignItems: "center" }, tradeText: { color: COLORS.black, fontFamily: FONTS.regular, fontSize: 16, fontWeight: "700" },
balanceGroup: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginRight: 4,
  flexShrink: 1,
},

robotImage: { width: 29, height: 29, borderRadius: 15 },
tokenImage: { width: "100%", height: "100%", borderRadius: 30 },
robotIcon: {
  fontSize: 25,
},

balanceAmount: {
  color: "#FFFFFF",
  fontSize: 17,
  fontFamily: FONTS.regular,
  fontWeight: "700",
},
});
