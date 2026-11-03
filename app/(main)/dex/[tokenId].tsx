import { useBackgroundScroll } from "../../../components/AppBackground";
import { Skeleton, SkeletonRows, SkeletonChart } from "../../../components/Skeleton";
import React, { useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions, Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, BadgeCheck, Copy, Send, SlidersHorizontal } from "lucide-react-native";
import { COLORS, FONTS } from "../../../constants/theme";
import TradeSheet from "../../../components/TradeSheet";
import TradeConfirmation from "../../../components/TradeConfirmation";
import type { WarpTarget } from "../../../components/ConfirmationWarp";
import DexPositionReveal, { PositionRevealText } from "../../../components/DexPositionReveal";
import TokenImage from "../../../components/TokenImage";
import UserAvatar from "../../../components/UserAvatar";
import PriceChart from "../../../components/PriceChart";
import GlassButton from "../../../components/GlassButton";
import TokensIcon from "../../../assets/icons/tokens.svg";
import { tracerHref } from "../../../lib/nav";
import { shareExternally } from "../../../utils/share";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import HistoryIcon from "../../../assets/icons/transaction-history.svg";
import WalletHistorySheet from "../../../components/WalletHistorySheet";
import { useTokenMarket } from "../../../hooks/useTokenMarket";
import { PERIOD_STEP, useOhlcv, type ChartPeriod } from "../../../hooks/useOhlcv";
import { useTokenInfo, useTokenTrades } from "../../../hooks/useTokenInfo";
import { usePortfolio, positionPnl } from "../../../components/PortfolioContext";
import {
  compactUsd,
  formatAge,
  formatCount,
  formatMc,
  formatPct,
  formatPrice,
  formatTokenAmount,
  formatUsdMoney,
  prettySymbol,
  signedUsd,
} from "../../../lib/format";
import { isSolanaAddress, readRouteParam, truncateAddress } from "../../../lib/solana";
import type { IntelTransfer, TokenInfoPayload } from "../../../lib/types";


const PERIODS = ["1s", "1m", "5m", "15m", "1h", "All"] as const;
type Period = (typeof PERIODS)[number];
type InfoTab = "Transactions" | "Token Info";
const INFO_TABS: InfoTab[] = ["Transactions", "Token Info"];

function authLabel(value: "on" | "off" | null | undefined) {
  if (value === "on") return "On";
  if (value === "off") return "Off";
  return "—";
}

function authTone(value: "on" | "off" | null | undefined) {
  if (value === "on") return COLORS.sell;
  if (value === "off") return COLORS.buy;
  return COLORS.white;
}

function TokenInfoPanel({ info, loading }: { info: TokenInfoPayload | null; loading: boolean }) {
  const stats = info?.stats;
  const rewards = info?.rewards;
  const quote = (rewards?.quoteSymbol || "").replace(/^\$/, "");
  const metrics = [
    { label: "Top 10 Holder", value: formatPct(stats?.top10Pct) },
    { label: "Dev Hold Percentage", value: formatPct(stats?.devPct) },
    { label: "Snipers Hold", value: formatPct(stats?.sniperPct) },
    { label: "Freeze Auth", value: authLabel(stats?.freezeAuth), color: authTone(stats?.freezeAuth) },
    { label: "Mint Auth", value: authLabel(stats?.mintAuth), color: authTone(stats?.mintAuth) },
    { label: "Dex", value: formatPct(stats?.dexPct) },
    { label: "Buyback", value: formatPct(stats?.buybackPct) },
    { label: "Burn", value: formatPct(stats?.burnPct) },
    { label: "Clusters", value: formatPct(stats?.clusterPct) },
  ];
  const holderRewards = [
    { label: "Paid to Holders", value: compactUsd(rewards?.paidUsd), note: rewards?.paidTokens != null ? `${formatTokenAmount(rewards.paidTokens)} ${quote}`.trim() : "" },
    { label: "Pending Payout", value: compactUsd(rewards?.pendingUsd), note: rewards?.pendingTokens != null ? `${formatTokenAmount(rewards.pendingTokens)} ${quote}`.trim() : "" },
    { label: "Payouts", value: formatCount(rewards?.payouts) },
    { label: "Holders", value: formatCount(rewards?.holders) },
  ];
  return (
    <View style={styles.tokenInfoPanel}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Token Info <Text style={styles.sectionAccent}>♙</Text></Text>
        {loading && !info ? <Skeleton width={50} height={10} /> : <Text style={styles.demoIndicator}>StonkFun</Text>}
      </View>
      {loading && !info ? (
        <SkeletonRows count={4} avatar={false} />
      ) : (
        <>
      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={[styles.metricValue, metric.color ? { color: metric.color } : null]}>{metric.value}</Text>
            <Text style={styles.metricLabel} numberOfLines={2}>{metric.label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.sectionHeading, styles.rewardsHeading]}>
        <Text style={styles.sectionTitle}>Holder Rewards <Text style={styles.sectionAccent}>♕</Text></Text>
        <Text style={styles.sectionTime}>{rewards?.lastPayoutAt ? formatAge(rewards.lastPayoutAt) : "—"}</Text>
      </View>
      {rewards?.enabled === false ? (
        <Text style={styles.chartEmpty}>This launch pays the creator, not holders.</Text>
      ) : (
      <View style={styles.rewardGrid}>
        {holderRewards.map((reward) => (
          <View key={reward.label} style={styles.rewardCard}>
            <Text style={styles.rewardLabel}>{reward.label}</Text>
            <Text style={styles.rewardValue}>{reward.value}</Text>
            {reward.note ? <Text style={styles.rewardNote}>{reward.note}</Text> : null}
          </View>
        ))}
      </View>
      )}
        </>
      )}
    </View>
  );
}

export default function DexTokenScreen() {
  const router = useRouter();
  const backgroundScroll = useBackgroundScroll();
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const positionAnchorRef = useRef<React.ElementRef<typeof View>>(null);
  const positionTop = useRef(0);
  const scrollEnd = useRef<(() => void) | null>(null);
  const positionShotRef = useRef<React.ElementRef<typeof ViewShot>>(null);
  const [sharingPosition, setSharingPosition] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const { tokenId } = useLocalSearchParams<{ tokenId?: string | string[] }>();
  const mint = readRouteParam(tokenId);
  const { width, height } = useWindowDimensions();
  const [period, setPeriod] = useState<Period>("1m");
  const [infoTab, setInfoTab] = useState<InfoTab>("Transactions");
  const [copied, setCopied] = useState(false);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell" | null>(null);
  const [confirmedTrade, setConfirmedTrade] = useState<{
    id: string;
    mode: "buy" | "sell";
    tokenId: string;
    amount: number;
    tokenName: string;
    imageUrl?: string | null;
  } | null>(null);
  const { data: detail, loading: detailLoading } = useTokenMarket(mint);
  const tokenMeta = detail?.token;
  const market = detail?.market;
  const name = tokenMeta?.name || tokenMeta?.symbol || truncateAddress(mint);
  const symbol = (tokenMeta?.symbol || "").replace(/^\$/, "") || "";
  const ticker = prettySymbol(symbol) || truncateAddress(mint, 4);
  const logoUri = tokenMeta?.imageUrl || tokenMeta?.logoUrl;
  const priceUsd = market?.priceUsd ?? tokenMeta?.market?.priceUsd ?? null;
  const marketCapUsd = market?.marketCapUsd ?? tokenMeta?.market?.marketCapUsd ?? null;
  const change = tokenMeta?.market?.priceChange24h ?? 0;
  const { data: candles, loading: chartLoading } = useOhlcv(mint, period as ChartPeriod, priceUsd);
  const { data: trades, loading: tradesLoading } = useTokenTrades(
    mint,
    tokenMeta?.name,
    symbol,
    infoTab === "Transactions",
  );
  const { data: tokenInfo, loading: infoLoading } = useTokenInfo(mint, infoTab === "Token Info");
  const { cash, positionFor } = usePortfolio();
  const holding = positionFor(mint);
  const holdingStats = holding ? positionPnl(holding, priceUsd) : null;

  if (!isSolanaAddress(mint)) {
    return <SafeAreaView style={styles.root}><Pressable onPress={() => router.back()} style={styles.back}><ArrowLeft color={COLORS.white} /></Pressable><Text style={styles.heading}>Token not found</Text></SafeAreaView>;
  }
  const token = { name, symbol: symbol || ticker.replace(/^\$/, ""), marketCap: formatMc(marketCapUsd).replace(" MC", ""), price: formatPrice(priceUsd), change };

  const handleCopyMint = async () => {
    try {
      await Clipboard.setStringAsync(mint);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      Alert.alert("Unable to copy", "Could not copy the contract address.");
    }
  };
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
        "Stonk Watcher",
      ].join("\n"),
    });
  };
  const preparePositionExit = async (): Promise<WarpTarget | null> => {
    if (!holding || !positionAnchorRef.current) return null;
    const measure = () => new Promise<WarpTarget | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 350);
      positionAnchorRef.current?.measureInWindow((x, y, width, height) => {
        clearTimeout(timeout);
        resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    });
    const target = await measure();
    if (!target || (target.y >= 145 && target.y + target.height < height - 120)) return target;
    // Bring the destination into view while keeping the completed confirmation visible.
    await new Promise<void>((resolve) => {
      const finish = () => { clearTimeout(timeout); scrollEnd.current = null; resolve(); };
      const timeout = setTimeout(finish, 650);
      scrollEnd.current = finish;
      scrollRef.current?.scrollTo({ y: Math.max(0, positionTop.current - 170), animated: true });
    });
    return measure();
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          gestureEnabled: tradeMode === null,
        }}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView ref={scrollRef} onScroll={backgroundScroll.onScroll} onScrollBeginDrag={backgroundScroll.onScrollBeginDrag} onScrollEndDrag={backgroundScroll.onScrollEndDrag} scrollEventThrottle={32} onMomentumScrollEnd={() => { backgroundScroll.onMomentumScrollEnd(); scrollEnd.current?.(); }} showsVerticalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable accessibilityLabel="Back to tokens" onPress={() => router.back()} style={styles.round}><ArrowLeft color={COLORS.white} size={23} /></Pressable>
            <View style={styles.headerRight}>
              <View style={styles.balanceGroup}>
                <UserAvatar style={styles.robotImage} />
                <Text style={styles.balanceAmount} numberOfLines={1}>{formatUsdMoney(cash)}</Text>
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
          {detailLoading && !detail ? <SkeletonRows count={1} /> : <View style={styles.tokenHeader}>
            <View style={styles.tokenAvatar}><TokenImage uri={logoUri} mint={mint} style={styles.tokenImage} /></View>
            <View style={{ flex: 1 }}><View style={styles.nameRow}><Text style={styles.tokenName}>{token.name}</Text>{tokenMeta?.verified === true && <BadgeCheck size={17} color={COLORS.stonkGreen} />}</View><Pressable onPress={() => void handleCopyMint()} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }} accessibilityRole="button" accessibilityLabel="Copy contract address"><Text style={styles.symbol}>{copied ? "Copied" : ticker}</Text><Copy size={12} color={copied ? COLORS.stonkGreen : COLORS.grey} /></Pressable></View>
            <View style={styles.marketInfo}><Text style={styles.marketLabel}>MC</Text><Text style={styles.marketValue}>{token.marketCap}</Text><Text style={[styles.change, { color: positive ? COLORS.buy : COLORS.sell }]}>{positive ? "▲" : "▼"} {Math.abs(token.change).toFixed(2)}%</Text></View>
          </View>}
          <View style={styles.chart}>
            <PriceChart
              width={Math.max(280, width - 30)}
              candles={candles ?? []}
              marketCapUsd={marketCapUsd}
              priceUsd={priceUsd}
              step={PERIOD_STEP[period as ChartPeriod]}
            />
            {chartLoading && !(candles?.length) ? (
              <View style={styles.chartOverlay}><SkeletonChart height={230} /></View>
            ) : null}
            {!chartLoading && !(candles?.length) ? (
              <View style={styles.chartOverlay}><Text style={styles.chartEmpty}>No live candles yet</Text></View>
            ) : null}
          </View>
          <View style={styles.chartTools}>
            <GlassButton
              icon={<TokensIcon width={18} height={18} />}
              size={36}
              onPress={() => router.push(tracerHref(mint))}
              accessibilityLabel={`Open ${token.name} in Tracer`}
            />
            <View style={styles.periodRow}>{PERIODS.map(p => <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.periodButton, period === p && styles.selectedPeriod]}><Text style={[styles.periodText, period === p && styles.selectedText]}>{p}</Text></Pressable>)}<SlidersHorizontal size={17} color={COLORS.grey} style={{ marginLeft: 5 }} /></View>
          </View>
          {holding && holdingStats ? (
          <View ref={positionAnchorRef} collapsable={false} onLayout={(event) => { positionTop.current = event.nativeEvent.layout.y; }}>
          <DexPositionReveal active replayKey={`${mint}:${holding.updatedAt}`} style={styles.positionOuter}>
            {(clock, revealComplete) => <>
            <ViewShot ref={positionShotRef} options={{ format: "png", quality: 1, result: "tmpfile" }}>
              <View style={styles.positionInner} collapsable={false}>
                <Text style={styles.positionTitle}><PositionRevealText text="Your Position " clock={clock} start={0} /><PositionRevealText text="(Demo)" clock={clock} start={100} style={styles.demoLabel} /></Text>
                <View style={styles.positionValues}>
                  <View>
                    <PositionRevealText text={formatUsdMoney(holdingStats.value)} clock={clock} start={180} style={styles.positionAmount} />
                    <PositionRevealText text={`${formatTokenAmount(holding.tokens)} ${token.symbol}`} clock={clock} start={300} style={styles.muted} />
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <PositionRevealText text={signedUsd(holdingStats.pnl)} clock={clock} start={420} style={[styles.pnl, holdingStats.pnl < 0 && { color: COLORS.sell }]} />
                    <PositionRevealText text={`${holdingStats.pct >= 0 ? "▲" : "▼"} ${Math.abs(holdingStats.pct).toFixed(2)}%`} clock={clock} start={540} style={[styles.pnlBadge, holdingStats.pnl < 0 && { color: COLORS.sell }]} />
                  </View>
                </View>
                <View style={styles.positionFoot}>
                  <Text style={styles.muted}><PositionRevealText text="Invested  " clock={clock} start={660} /><PositionRevealText text={formatUsdMoney(holding.investedUsd)} clock={clock} start={740} style={styles.white} /></Text>
                  <Text style={styles.muted}><PositionRevealText text="Avg. entry  " clock={clock} start={780} /><PositionRevealText text={formatMc(holding.avgEntryMc)} clock={clock} start={860} style={styles.white} /></Text>
                </View>
              </View>
            </ViewShot>
            <Pressable style={styles.share} disabled={sharingPosition || !revealComplete} onPress={handleSharePosition} accessibilityRole="button" accessibilityLabel="Share your position"><Send color={COLORS.white} size={14} /><PositionRevealText text="Share" clock={clock} start={900} style={styles.shareText} /></Pressable>
            </>}
          </DexPositionReveal>
          </View>
          ) : null}
          <View style={styles.tabs}>{INFO_TABS.map(tab => <Pressable key={tab} style={[styles.tab, infoTab === tab && styles.tabActive]} onPress={() => setInfoTab(tab)}><Text numberOfLines={1} style={[styles.tabText, infoTab === tab && styles.tabTextActive]}>{tab === "Transactions" ? "Live Transactions" : tab}</Text></Pressable>)}</View>
          {infoTab === "Transactions" ? (
            tradesLoading && !(trades?.length) ? (
              <SkeletonRows count={4} avatar={false} />
            ) : trades?.length ? (
            trades.slice(0, 48).map((tx: IntelTransfer) => (
              <View style={styles.txRow} key={tx.id || tx.signature}>
                <View>
                  <Text style={styles.txName}>
                    {tx.side === "sell" ? "Sell" : tx.side === "liquidity" ? "Liquidity" : "Buy"}
                  </Text>
                  <Text style={styles.txTime}>{formatAge(tx.at)}</Text>
                </View>

                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.txAmount, tx.side === "sell" && { color: COLORS.sell }]}>{signedUsd(tx.side === "sell" ? -tx.usd : tx.usd)}</Text>
                  <Text style={styles.txTime}>{formatTokenAmount(tx.amount)} {ticker.replace(/^\$/, "")}</Text>
                </View>
              </View>
            ))
            ) : (
              <Text style={styles.chartEmpty}>No recent trades</Text>
            )
          ) : (
            <TokenInfoPanel info={tokenInfo} loading={infoLoading} />
          )}
        </ScrollView>
        <View style={styles.bottomBar}><Pressable style={[styles.tradeButton, { backgroundColor: COLORS.sell }]} onPress={() => setTradeMode("sell")}><Text style={styles.tradeText}>Sell</Text></Pressable><Pressable style={[styles.tradeButton, { backgroundColor: COLORS.buy }]} onPress={() => setTradeMode("buy")}><Text style={styles.tradeText}>Buy</Text></Pressable></View>
      </SafeAreaView>

      <WalletHistorySheet visible={historyVisible} onClose={() => setHistoryVisible(false)} />

      {tradeMode !== null && (
        <TradeSheet
          mode={tradeMode}
          tokenId={mint}
          tokenName={token.name}
          symbol={token.symbol}
          imageUrl={logoUri}
          verified={tokenMeta?.verified}
          priceUsd={priceUsd}
          marketCapUsd={marketCapUsd}
          onClose={() => setTradeMode(null)}
          onTradeConfirmed={(mode, tokenId, amount) => {
            setConfirmedTrade({ id: `${Date.now()}`, mode, tokenId, amount, tokenName: token.name, imageUrl: logoUri });
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
            key={confirmedTrade.id}
            tokenName={confirmedTrade.tokenName}
            imageUrl={confirmedTrade.imageUrl}
            mint={confirmedTrade.tokenId}
            mode={confirmedTrade.mode}
            amount={confirmedTrade.amount}
            onPrepareExit={preparePositionExit}
            onDismiss={() => setConfirmedTrade(null)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "transparent" }, safe: { flex: 1 }, content: { paddingHorizontal: 15, paddingBottom: 22 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", position: "relative", minHeight: 44, marginTop: 7, marginBottom: 18 },
  back: { margin: 20 }, heading: { color: COLORS.white, fontSize: 22, margin: 20 },
  round: { width: 37, height: 37, borderRadius: 19, borderWidth: 1, borderColor: "#424638", backgroundColor: "#292D21", alignItems: "center", justifyContent: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  tokenHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }, tokenAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.stonkDarkestB, alignItems: "center", justifyContent: "center" }, tokenEmoji: { fontSize: 32 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 }, tokenName: { fontFamily: FONTS.regular, fontSize: 18, fontWeight: "700", color: COLORS.white, flexShrink: 1 }, symbol: { color: COLORS.grey, fontFamily: FONTS.regular, marginTop: 5 }, marketInfo: { alignItems: "flex-end" }, marketLabel: { color: COLORS.grey, fontSize: 10 }, marketValue: { color: COLORS.white, fontSize: 19, fontWeight: "700" }, change: { fontSize: 11, marginTop: 3 },
  chart: { marginHorizontal: -4, marginTop: 4, alignItems: "center", minHeight: 255 },
  chartOverlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  chartEmpty: { color: COLORS.grey, fontSize: 12, textAlign: "center", marginVertical: 16 },
  chartTools: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 15 },
  periodRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 3 }, periodButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 3, backgroundColor: COLORS.stonkDarkG }, selectedPeriod: { backgroundColor: COLORS.stonkGreen }, periodText: { color: COLORS.grey, fontSize: 11 }, selectedText: { color: COLORS.black, fontWeight: "700" },
  positionOuter: { borderRadius: 12, padding: 4, marginBottom: 18 }, positionInner: { backgroundColor: "rgba(28,28,28,0.78)", borderRadius: 9, padding: 15 }, positionTitle: { color: COLORS.stonkGreen, fontSize: 13, fontFamily: FONTS.regular }, demoLabel: { color: COLORS.grey, fontSize: 10 }, positionValues: { flexDirection: "row", justifyContent: "space-between", marginTop: 7 }, positionAmount: { color: COLORS.white, fontSize: 23, fontWeight: "700" }, muted: { color: COLORS.grey, fontSize: 12, marginTop: 4 }, pnl: { color: COLORS.buy, fontSize: 19, fontWeight: "700" }, pnlBadge: { color: COLORS.buy, fontSize: 11, marginTop: 5 }, positionFoot: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap" }, white: { color: COLORS.white, fontFamily: FONTS.regular, fontSize: 12 }, share: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, minHeight: 34 }, shareText: { color: COLORS.white, fontFamily: FONTS.regular, fontSize: 12 },
  tabs: { flexDirection: "row", borderWidth: 1, borderColor: COLORS.stonkGreen, borderRadius: 5, padding: 3, gap: 3, marginBottom: 8 }, tab: { flex: 1, backgroundColor: COLORS.stonkDarkG, borderRadius: 4, alignItems: "center", justifyContent: "center", paddingVertical: 10 }, tabActive: { backgroundColor: COLORS.stonkLightG }, tabText: { color: COLORS.white, fontSize: 10, fontFamily: FONTS.regular }, tabTextActive: { color: COLORS.black, fontWeight: "700" },
  txRow: { backgroundColor: "#1A1A1A", borderRadius: 7, padding: 12, marginBottom: 5, flexDirection: "row", justifyContent: "space-between" }, txName: { color: COLORS.white, fontSize: 15, fontWeight: "600" }, txTime: { color: COLORS.grey, fontSize: 10, marginTop: 5 }, txAmount: { color: COLORS.buy, fontSize: 13, fontWeight: "600" }, infoBox: { backgroundColor: "#1A1A1A", borderRadius: 8, padding: 20, gap: 8 },
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
