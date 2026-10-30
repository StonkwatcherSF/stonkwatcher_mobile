import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Scan,
  Plus,
  Minus,
  List,
} from "lucide-react-native";

import ShareIcon from "../../../assets/icons/share.svg";
import SettingsIcon from "../../../assets/icons/settings.svg";
import StonkIcon from "../../../assets/icons/stonkwatcher-icon.svg";
import BubbleIcon from "../../../assets/icons/bubble-map.svg";
import TokenImage from "../../../components/TokenImage";
import { useTracer } from "../../../hooks/useTracer";
import {
  compactUsd,
  formatAge,
  formatCount,
  formatPct,
  formatPrice,
  formatTokenAmount,
  prettySymbol,
  riskLabel,
  signedPoints,
} from "../../../lib/format";
import { isSolanaAddress, truncateAddress } from "../../../lib/solana";
import { shareExternally } from "../../../utils/share";
import type { BubbleMapData, BubbleMapNode, TracerPayload } from "../../../lib/types";

const LIME = "#C6E900";
const BG = "#10110B";
const PANEL = "#151515";
const MUTED = "#B6B6B6";

const CLUSTER_COLORS: Record<string, string> = {
  organic: "#9C9FA4",
  whale: "#319C90",
  cex: "#5785C8",
  bundle: "#E58A62",
  dev: "#EAC849",
  magic: "#9C8AFF",
  time: "#5785C8",
  transfer: "#319C90",
};

type Bubble = { x: number; y: number; size: number; color: string; isDev?: boolean };

function layoutBubbles(nodes: BubbleMapNode[]): Bubble[] {
  const wallets = nodes.filter((node) => node.kind === "wallet" && !node.isPool).slice(0, 90);
  const rows = [9, 10, 9, 9, 10, 9, 9, 8, 6, 5];
  const items: Bubble[] = [];
  let i = 0;
  rows.forEach((count, row) => {
    for (let col = 0; col < count && i < wallets.length; col += 1, i += 1) {
      const node = wallets[i];
      const middle = (count - 1) / 2;
      const x = 0.5 + (col - middle) * 0.087 + Math.sin(row * 2.4 + col) * 0.009;
      const y = 0.09 + row * 0.083 + Math.cos(col * 1.7) * 0.01;
      const pct = node.percentage ?? node.weight ?? 0;
      const size = Math.max(12, Math.min(42, 14 + pct * 1.6));
      items.push({
        x,
        y,
        size,
        color: CLUSTER_COLORS[node.clusterKind] ?? "#9C9FA4",
        isDev: node.isCreator,
      });
    }
  });
  return items;
}

function clusterCounts(nodes: BubbleMapNode[]) {
  let isolated = 0;
  let linked = 0;
  let dev = 0;
  for (const node of nodes) {
    if (node.kind !== "wallet" || node.isPool) continue;
    if (node.isCreator || node.clusterKind === "dev") dev += 1;
    else if (node.clusterKind === "organic") isolated += 1;
    else linked += 1;
  }
  return { isolated, linked, dev };
}

function SectionHeader({
  title,
  open,
  onPress,
}: {
  title: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.accordionHeader} accessibilityRole="button">
      <Text style={styles.accordionTitle}>{title}</Text>
      {open ? <ChevronDown size={16} color="#CFCFCF" /> : <ChevronUp size={16} color="#CFCFCF" />}
    </Pressable>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function snapshotRows(payload: TracerPayload | null) {
  const token = payload?.token;
  const brief = token?.brief;
  if (payload?.mode === "wallet") {
    return [
      { label: "LAUNCHES", value: formatCount((payload.stonkLaunchCount ?? 0) + (payload.outsideLaunchCount ?? 0)) },
      { label: "STONK LAUNCHES", value: formatCount(payload.stonkLaunchCount) },
      { label: "OUTSIDE", value: formatCount(payload.outsideLaunchCount) },
      { label: "FUNDING ACCTS", value: formatCount(payload.fundingAccountCount) },
      { label: "LINKED", value: formatCount(payload.linkedWallets?.length) },
      { label: "COUNTERPARTIES", value: formatCount(payload.counterparties?.length) },
      { label: "DEV", value: payload.isDev ? "Yes" : "No" },
      { label: "ADDRESS", value: truncateAddress(payload.address) },
      { label: "MODE", value: "Wallet" },
    ];
  }
  return [
    { label: "PRICE", value: formatPrice(brief?.priceUsd) },
    { label: "MARKET CAP", value: compactUsd(brief?.marketCapUsd) },
    { label: "LIQUIDITY", value: compactUsd(brief?.liquidityUsd) },
    { label: "DEV SUPPLY", value: formatTokenAmount(brief?.devAmount) },
    { label: "24H VOLUME", value: compactUsd(brief?.volume24hUsd) },
    { label: "FIRST SLOT", value: brief?.firstSlot != null ? String(brief.firstSlot) : "—" },
    { label: "ANALYZED", value: formatAge(brief?.lastAnalyzedAt) },
    { label: "DEV % OF SUPPLY", value: formatPct(token?.devHoldPct) },
    { label: "TOTAL HOLDERS", value: formatCount(brief?.holderCount) },
  ];
}

function analysisRows(payload: TracerPayload | null) {
  const breakdown = payload?.token?.brief.breakdown ?? [];
  if (breakdown.length) {
    return breakdown.map((row) => ({
      score: signedPoints(row.points),
      message: row.reason,
    }));
  }
  const signals = payload?.token?.brief.signals ?? [];
  if (signals.length) {
    return signals.map((row) => ({
      score: row.severity,
      message: row.description,
    }));
  }
  if (payload?.mode === "wallet") {
    const launches = payload.launches ?? [];
    if (!launches.length) {
      return [{ score: "—", message: "No launch history is attached to this wallet yet." }];
    }
    return launches.slice(0, 6).map((row) => ({
      score: prettySymbol(row.symbol) || "•",
      message: `${row.name || truncateAddress(row.mint)} launched ${formatAge(row.createdAt)}.`,
    }));
  }
  return [{ score: "—", message: "Analysis is still running. Signals appear when the job finishes." }];
}

export default function TracerAnalysisScreen() {
  const router = useRouter();
  const { address: rawAddress } = useLocalSearchParams<{ address?: string }>();
  const address = typeof rawAddress === "string" ? rawAddress : "";
  const { width } = useWindowDimensions();
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [marketOpen, setMarketOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [holdersOpen, setHoldersOpen] = useState(false);
  const mapWidth = Math.max(260, Math.min(width - 40, 420));
  const mapHeight = 395;
  const { data, bubbleMap, loading, analyzing, error } = useTracer(address);
  const token = data?.token;
  const isWallet = data?.mode === "wallet";
  const nodes = (bubbleMap?.nodes ?? token?.bubbleMap?.nodes) as BubbleMapNode[] | undefined;
  const bubbles = useMemo(() => layoutBubbles(nodes ?? []), [nodes]);
  const holders = useMemo(() => clusterCounts(nodes ?? []), [nodes]);
  const title = isWallet
    ? truncateAddress(address, 4)
    : token?.name || token?.symbol || truncateAddress(address, 4);
  const symbol = isWallet ? "Wallet" : prettySymbol(token?.symbol) || truncateAddress(address, 4);
  const quote = token?.brief.quoteSymbol;
  const score = token?.brief.score ?? null;
  const snapshot = snapshotRows(data);
  const signals = analysisRows(data);
  const status = token?.brief.status;
  const mapData: BubbleMapData | null = bubbleMap ?? token?.bubbleMap ?? null;

  function shareTrace() {
    void shareExternally({
      title: `${title} on Stonk Watcher`,
      message: [
        `${title} ${symbol}`,
        isWallet ? `Address: ${address}` : `CA: ${address}`,
        score != null ? `Risk: ${score} / 100` : "Risk: unscored",
        "Stonk Watcher",
      ].join("\n"),
    });
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.circleButton} onPress={() => router.back()} accessibilityLabel="Go back">
            <ArrowLeft size={20} color="#F0F0F0" />
          </Pressable>
          <View style={styles.topActions}>
            <Pressable style={styles.circleButton} onPress={shareTrace} accessibilityLabel="Share token">
              <ShareIcon width={19} height={19} />
            </Pressable>
            <Pressable
              style={styles.circleButton}
              onPress={() => router.push("/settings" as any)}
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
              hitSlop={10}
            >
              <SettingsIcon width={19} height={19} />
            </Pressable>
          </View>
        </View>

        <View style={styles.tokenHeader}>
          <View style={styles.tokenAvatar}>
            {token?.brief.imageUrl ? (
              <TokenImage uri={token.brief.imageUrl} style={styles.tokenAvatarImage} />
            ) : (
              <Text style={styles.tokenAvatarText}>{title.slice(0, 8)}</Text>
            )}
          </View>
          <View style={styles.tokenIdentity}>
            <Text style={styles.tokenTitle}>{title}</Text>
            <Text style={styles.tokenSymbol}>{symbol}</Text>
          </View>
          <View style={styles.badges}>
            {quote ? <Text style={styles.ttwoBadge}>◉ {quote}</Text> : null}
            <View style={styles.statusRow}>
              {status ? <Text style={styles.statusBadge}>{status}</Text> : null}
              {analyzing ? <Text style={styles.statusBadge}>Analyzing</Text> : null}
              {loading && !data ? <Text style={styles.statusBadge}>Loading</Text> : null}
            </View>
          </View>
        </View>

        {error ? <Text style={styles.demoNote}>{error}</Text> : null}

        <View style={styles.panel}>
          <SectionHeader title="Details" open={detailsOpen} onPress={() => setDetailsOpen(!detailsOpen)} />
          {detailsOpen && (
            <View style={styles.infoBody}>
              {isWallet ? (
                <>
                  <InfoLine label="Wallet" value={isSolanaAddress(address) ? truncateAddress(address) : address} />
                  <InfoLine label="Launches" value={formatCount((data?.stonkLaunchCount ?? 0) + (data?.outsideLaunchCount ?? 0))} />
                  <InfoLine label="Linked" value={formatCount(data?.linkedWallets?.length)} />
                  <InfoLine label="Counterparties" value={formatCount(data?.counterparties?.length)} />
                  <InfoLine label="Funding" value={formatCount(data?.fundingAccountCount)} />
                </>
              ) : (
                <>
                  <InfoLine label="CA" value={truncateAddress(token?.mint || address)} />
                  <InfoLine label="Creator" value={truncateAddress(token?.creatorAddress)} />
                  <InfoLine label="Supply" value={formatTokenAmount(token?.supply)} />
                  <InfoLine label="Tokens" value={formatTokenAmount(token?.brief.devAmount)} />
                  <InfoLine label="Dev Hold" value={formatPct(token?.devHoldPct)} />
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <SectionHeader title="Market snapshot" open={marketOpen} onPress={() => setMarketOpen(!marketOpen)} />
          {marketOpen && (
            <View style={styles.snapshotGrid}>
              {snapshot.map((item) => (
                <View key={item.label} style={styles.snapshotItem}>
                  <Text style={styles.snapshotLabel}>{item.label}</Text>
                  <Text style={styles.snapshotValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskRing}><View style={styles.riskRingInner} /></View>
          <View style={styles.riskText}>
            <Text style={styles.riskLabel}>Risk Score</Text>
            <Text style={styles.riskValue}>{score != null ? `${Math.round(score)} / 100` : analyzing ? "Scoring…" : "— / 100"}</Text>
          </View>
          <Text style={styles.riskBadge}>{riskLabel(score)}</Text>
        </View>

        <View style={styles.analysisPanel}>
          <View style={styles.iconHeading}><StonkIcon width={18} height={18} /><Text style={styles.limeHeading}>Analysis</Text></View>
          <View style={styles.analysisBody}>
            <Text style={styles.analysisDisclaimer}>This is a transparent behavioral index, not a determination that anyone is a rug-puller.</Text>
            {signals.map((item, index) => (
              <View key={index} style={styles.signalRow}>
                <Text style={styles.signalScore}>{item.score}</Text>
                <Text style={styles.signalText}>{item.message}</Text>
              </View>
            ))}
          </View>
        </View>

        {!isWallet ? (
        <View style={styles.mapPanel}>
          <View style={styles.mapTitleRow}><BubbleIcon width={18} height={18} /><Text style={styles.mapTitle}>Holder Bubble Map</Text></View>
          <View style={styles.mapToolbar}>
            <Text style={styles.mapSubtitle}>{`${Math.min(nodes?.length ?? 0, 100)} holders max · ${mapData?.intel?.clusterCount ?? token?.clusterCount ?? 0} clusters`}</Text>
            <Pressable style={styles.fitButton} onPress={() => setZoom(1)}>
              <Scan size={17} color="#10110B" />
              <Text style={styles.fitText}>Fit View</Text>
            </Pressable>
          </View>
          <View style={[styles.mapCanvas, { height: mapHeight }]}>
            <View style={[styles.bubbleLayer, { width: mapWidth, height: mapHeight, transform: [{ scale: zoom }] }]}>
              {bubbles.map((bubble, index) => (
                <View
                  key={index}
                  style={{
                    position: "absolute",
                    left: bubble.x * mapWidth - bubble.size / 2,
                    top: bubble.y * mapHeight - bubble.size / 2,
                    width: bubble.size,
                    height: bubble.size,
                    borderRadius: bubble.size / 2,
                    backgroundColor: bubble.color,
                    borderColor: "#353A44",
                    borderWidth: 3,
                  }}
                />
              ))}
              <View style={styles.devMarker}><Text style={styles.devMarkerText}>Dev</Text></View>
            </View>
            <View style={styles.zoomControls}>
              <Pressable style={styles.zoomButton} onPress={() => setZoom((v) => Math.min(1.8, +(v + 0.2).toFixed(1)))} accessibilityLabel="Zoom in">
                <Plus size={19} color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.zoomButton} onPress={() => setZoom((v) => Math.max(0.6, +(v - 0.2).toFixed(1)))} accessibilityLabel="Zoom out">
                <Minus size={19} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
          <View style={styles.legend}>
            <Text style={styles.legendText}>● Isolated</Text>
            <Text style={[styles.legendText, { color: "#9C8AFF" }]}>● Linked cluster</Text>
            <Text style={[styles.legendText, { color: "#EAC849" }]}>● Dev cluster</Text>
            <Text style={styles.legendText}>● Magic node</Text>
          </View>
          <Text style={styles.mapHint}>Use + / − to zoom · Tap Fit View to reset</Text>
          <Pressable style={styles.holdersButton} onPress={() => setHoldersOpen(!holdersOpen)}>
            <List size={17} color="#FFFFFF" />
            <Text style={styles.holdersButtonText}>Holders distribution list</Text>
            {holdersOpen ? <ChevronUp size={15} color="#FFFFFF" /> : <ChevronDown size={15} color="#FFFFFF" />}
          </Pressable>
          {holdersOpen && (
            <View style={styles.holdersList}>
              <InfoLine label="Isolated holders" value={String(holders.isolated)} />
              <InfoLine label="Linked cluster" value={String(holders.linked)} />
              <InfoLine label="Dev cluster" value={String(holders.dev)} />
            </View>
          )}
        </View>
        ) : null}
      </ScrollView>
      {!isWallet ? (
      <View style={styles.tradeArea} pointerEvents="box-none">
        <Pressable style={styles.tradeButton} onPress={() => Alert.alert("Demo trade", "Trading is not connected yet.")}>
          <Text style={styles.tradeText}>Trade</Text>
        </Pressable>
      </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 18, paddingTop: 38, paddingBottom: 185, gap: 8 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  topActions: { flexDirection: "row", gap: 8 },
  circleButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#30332B", alignItems: "center", justifyContent: "center" },
  tokenHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 5, minHeight: 66 },
  tokenAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#100A22", borderWidth: 1, borderColor: "#312047", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  tokenAvatarImage: { width: "100%", height: "100%", borderRadius: 24 },
  tokenAvatarText: { color: "#FFFFFF", textAlign: "center", fontSize: 9, fontWeight: "900", lineHeight: 10, textShadowColor: "#D31696", textShadowRadius: 5 },
  tokenIdentity: { flex: 1 },
  tokenTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
  tokenSymbol: { color: "#D0D0D0", fontSize: 16, marginTop: 2 },
  badges: { alignItems: "flex-end", gap: 5 },
  ttwoBadge: { backgroundColor: "#0B4776", overflow: "hidden", color: "#FFFFFF", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4, fontSize: 11 },
  statusRow: { flexDirection: "row", gap: 4 },
  statusBadge: { color: "#FFFFFF", borderWidth: 1, borderColor: "#858C41", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 4, fontSize: 10 },
  panel: { backgroundColor: PANEL, borderRadius: 8, overflow: "hidden" },
  accordionHeader: { paddingHorizontal: 10, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  accordionTitle: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  infoBody: { paddingHorizontal: 10, paddingBottom: 12, gap: 10 },
  infoLine: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  infoLabel: { color: MUTED, fontSize: 12 },
  infoValue: { color: "#F2F2F2", fontSize: 12, textAlign: "right", flexShrink: 1 },
  snapshotGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingBottom: 13, rowGap: 13 },
  snapshotItem: { width: "33.333%", paddingRight: 4 },
  snapshotLabel: { color: "#A9A9A9", fontSize: 8, marginBottom: 6 },
  snapshotValue: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  riskCard: { minHeight: 50, borderRadius: 8, backgroundColor: "#202609", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 9 },
  riskRing: { width: 32, height: 32, borderRadius: 16, borderWidth: 5, borderColor: "#B4CC00", borderTopColor: "#454D11", justifyContent: "center", alignItems: "center" },
  riskRingInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#202609" },
  riskText: { flex: 1 },
  riskLabel: { color: "#B4B4B4", fontSize: 9 },
  riskValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  riskBadge: { color: "#FFFFFF", fontWeight: "600", fontSize: 16, backgroundColor: "#151A07", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 4, overflow: "hidden" },
  analysisPanel: { borderRadius: 9, borderWidth: 1, borderColor: "#849B00", padding: 8, backgroundColor: "#171D05" },
  iconHeading: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  mapTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1B2432" },
  limeHeading: { color: LIME, fontSize: 16, fontWeight: "600" },
  analysisBody: { backgroundColor: "#111111", borderRadius: 5, padding: 10, gap: 12 },
  analysisDisclaimer: { color: "#F0F0F0", fontSize: 11, lineHeight: 17 },
  signalRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  signalScore: { color: LIME, fontWeight: "700", fontSize: 12, width: 27 },
  signalText: { color: "#E4E4E4", fontSize: 11, lineHeight: 16, flex: 1 },
  mapPanel: { backgroundColor: "#080D18", borderRadius: 9, overflow: "hidden", paddingBottom: 13 },
  mapTitle: { color: LIME, fontSize: 16, fontWeight: "600" },
  mapToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, gap: 8 },
  mapSubtitle: { color: MUTED, fontSize: 11, flex: 1 },
  fitButton: { backgroundColor: LIME, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", gap: 6, alignItems: "center" },
  fitText: { color: "#0B1000", fontSize: 13, fontWeight: "700" },
  mapCanvas: { backgroundColor: "#080D18", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  bubbleLayer: { position: "absolute", left: 0, top: 0 },
  devMarker: { position: "absolute", left: "15%", top: "66%", width: 25, height: 25, borderRadius: 13, backgroundColor: "#F5D04C", borderWidth: 3, borderColor: "#242A31" },
  devMarkerText: { color: "#DADADA", position: "absolute", top: 24, left: -1, fontSize: 9 },
  zoomControls: { position: "absolute", right: 9, bottom: 17, backgroundColor: "#151515", borderRadius: 6, paddingVertical: 4 },
  zoomButton: { width: 34, height: 34, justifyContent: "center", alignItems: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 13, paddingHorizontal: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#1B2432" },
  legendText: { color: "#A3A3A3", fontSize: 10 },
  mapHint: { color: "#8C8C8C", fontSize: 10, paddingHorizontal: 13, marginTop: 14 },
  holdersButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#879C00", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 11, marginTop: 13, marginLeft: 13 },
  holdersButtonText: { color: "#FFFFFF", fontSize: 11 },
  holdersList: { paddingHorizontal: 13, paddingTop: 13, gap: 10 },
  demoNote: { color: "#898989", textAlign: "center", fontSize: 10, lineHeight: 15, marginTop: 9 },
  tradeArea: { position: "absolute", bottom: 96, left: 16, right: 16 },
  tradeButton: { height: 44, borderRadius: 5, backgroundColor: LIME, alignItems: "center", justifyContent: "center" },
  tradeText: { color: "#111700", fontSize: 16, fontWeight: "700" },
});
