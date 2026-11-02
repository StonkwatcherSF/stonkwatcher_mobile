import { Skeleton, SkeletonGroup, SkeletonPage } from "../../../components/Skeleton";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import * as Clipboard from "expo-clipboard";
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
import BubbleIcon from "../../../assets/icons/bubble-map.svg";
import TokenImage from "../../../components/TokenImage";
import HolderBubbleMap from "../../../components/HolderBubbleMap";
import TracerAnalysisPanel from "../../../components/TracerAnalysisPanel";
import TracerRiskCard from "../../../components/TracerRiskCard";
import { useTracer } from "../../../hooks/useTracer";
import {
  BUBBLEMAP_V2_TOP_HOLDERS,
  holderDistribution,
  visibleBubbleMap,
} from "../../../lib/bubble-layout";
import {
  compactUsd,
  formatAge,
  formatCount,
  formatPct,
  formatPrice,
  formatTokenAmount,
  intelScoreLabel,
  prettySymbol,
  riskLabel,
  signedPoints,
} from "../../../lib/format";
import { dexHref } from "../../../lib/nav";
import { isSolanaAddress, readRouteParam, truncateAddress } from "../../../lib/solana";
import { shareExternally } from "../../../utils/share";
import type { BubbleMapData, TracerPayload } from "../../../lib/types";

const LIME = "#C6E900";
const BG = "#10110B";
const PANEL = "#151515";
const MUTED = "#B6B6B6";

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

function analysisRows(payload: TracerPayload | null, intel?: BubbleMapData["intel"]) {
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
  const split = intel?.split;
  if (split) {
    return [
      {
        score: intel.score != null ? String(Math.round(intel.score)) : "v2",
        message: `Holder map is ${intelScoreLabel(intel.scoreLabel, intel.score).toLowerCase()}. Top 10 ${formatPct(split.top10Pct)} · clusters ${formatPct(split.clusterPct)} · pool ${formatPct(split.poolPct)}.`,
      },
      {
        score: String(intel.clusterCount ?? 0),
        message: `${intel.clusterCount ?? 0} linked clusters · ${intel.bundleWallets ?? 0} bundle wallets · team ${formatPct(split.teamPct)}.`,
      },
    ];
  }
  return [{ score: "—", message: "Analysis is still running. Signals appear when the job finishes." }];
}

function clusterTitle(kind: string, clusterNo: number | null) {
  if (clusterNo != null) {
    const label = kind === "dev" ? "Dev cluster" : kind === "isolated" ? "Isolated" : `${kind} cluster`;
    return `${label} ${clusterNo}`;
  }
  if (kind === "dev") return "Dev";
  if (kind === "isolated") return "Isolated";
  return kind;
}

export default function TracerAnalysisScreen() {
  const router = useRouter();
  const { address: rawAddress } = useLocalSearchParams<{ address?: string | string[] }>();
  const address = readRouteParam(rawAddress);
  const { width, height } = useWindowDimensions();
  const [riskTop, setRiskTop] = useState<number | null>(null);
  const [riskVisible, setRiskVisible] = useState(false);
  const [analysisTop, setAnalysisTop] = useState<number | null>(null);
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [fitKey, setFitKey] = useState(0);
  const [holdersOpen, setHoldersOpen] = useState(false);
  const [groupClusters, setGroupClusters] = useState(false);
  const [holderQuery, setHolderQuery] = useState("");
  const mapWidth = Math.max(260, Math.min(width - 40, 420));
  const mapHeight = 395;
  const { data, bubbleMap, loading, bubbleLoading, analyzing, error } = useTracer(address);
  const token = data?.token;
  const isWallet = data?.mode === "wallet";
  const mapData: BubbleMapData | null =
    bubbleMap ?? (token?.bubbleMap?.edition === "v2" ? token.bubbleMap : null);
  const visibleMap = useMemo(
    () => visibleBubbleMap(mapData, BUBBLEMAP_V2_TOP_HOLDERS),
    [mapData],
  );
  const holderGroups = useMemo(
    () => holderDistribution(visibleMap?.nodes ?? [], visibleMap?.links ?? []),
    [visibleMap],
  );
  const title = isWallet
    ? truncateAddress(address, 4)
    : token?.name || token?.symbol || truncateAddress(address, 4);
  const symbol = isWallet ? "Wallet" : prettySymbol(token?.symbol) || truncateAddress(address, 4);
  const quote = token?.brief.quoteSymbol;
  const intel = mapData?.intel;
  const score = token?.brief.score ?? null;
  const creatorNode = mapData?.nodes?.find((node) => node.isCreator);
  const supply = token?.supply ?? mapData?.summary?.supply ?? null;
  const devHold = token?.devHoldPct ?? creatorNode?.percentage ?? null;
  const devAmount = token?.brief.devAmount ?? creatorNode?.amount ?? null;
  const clusterCount =
    intel?.clusterCount ??
    holderGroups.filter((group) => group.clusterNo != null).length;
  const snapshot = snapshotRows(
    token
      ? {
          ...(data ?? { mode: "token", address, token }),
          mode: "token",
          address,
          token: {
            ...token,
            supply,
            devHoldPct: devHold,
            clusterCount,
            brief: { ...token.brief, devAmount },
          },
        }
      : data,
  );
  const signals = analysisRows(data, intel);
  const status = token?.brief.status;
  const holderRows = useMemo(() => {
    const q = holderQuery.trim().toLowerCase();
    const filtered = holderGroups
      .map((group) => ({
        ...group,
        members: q
          ? group.members.filter((member) => {
              const address = (member.address ?? member.label).toLowerCase();
              return address.includes(q) || member.label.toLowerCase().includes(q);
            })
          : group.members,
      }))
      .filter((group) => group.members.length > 0);
    if (groupClusters) return filtered;
    return [
      {
        key: "all",
        clusterNo: null,
        pal: { fill: "#6a737c", stroke: "#d0d6dc" },
        share: 0,
        kind: "all",
        members: filtered
          .flatMap((group) => group.members)
          .sort((a, b) => a.rank - b.rank),
      },
    ];
  }, [groupClusters, holderGroups, holderQuery]);

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

  if (loading && !data) {
    return <View style={styles.screen}><ScrollView contentContainerStyle={{ paddingTop: 55, paddingBottom: 100 }}>
      <Pressable style={[styles.circleButton, { marginLeft: 20 }]} onPress={() => router.back()} accessibilityLabel="Go back"><ArrowLeft size={20} color="#F0F0F0" /></Pressable>
      <SkeletonPage />
    </ScrollView></View>;
  }

  return (
    <View style={styles.screen}>
      <ScrollView nestedScrollEnabled contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(event) => {
          if (!riskVisible && riskTop !== null && event.nativeEvent.contentOffset.y + event.nativeEvent.layoutMeasurement.height > riskTop + 30) setRiskVisible(true);
          if (!analysisVisible && analysisTop !== null && event.nativeEvent.contentOffset.y + event.nativeEvent.layoutMeasurement.height > analysisTop + 30) setAnalysisVisible(true);
        }}
      >
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
            <TokenImage uri={token?.brief.imageUrl} mint={token?.mint || address} style={styles.tokenAvatarImage} />
          </View>
          <View style={styles.tokenIdentity}>
            <Text style={styles.tokenTitle}>{title}</Text>
            <Text style={styles.tokenSymbol}>{symbol}</Text>
          </View>
          <View style={styles.badges}>
            {quote ? <Text style={styles.ttwoBadge}>◉ {quote}</Text> : null}
            <View style={styles.statusRow}>
              {status ? <Text style={styles.statusBadge}>{status}</Text> : null}
              {analyzing ? <SkeletonGroup label="Analyzing address"><Skeleton width={62} height={14} /></SkeletonGroup> : null}
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
                  <InfoLine label="Creator" value={truncateAddress(token?.creatorAddress || creatorNode?.address)} />
                  <InfoLine label="Supply" value={formatTokenAmount(supply)} />
                  <InfoLine label="Tokens" value={formatTokenAmount(devAmount)} />
                  <InfoLine label="Dev Hold" value={formatPct(devHold)} />
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

        <View onLayout={(event) => {
          const top = event.nativeEvent.layout.y;
          setRiskTop(top);
          if (top + 30 < height) setRiskVisible(true);
        }}>
          <TracerRiskCard
            key={`${address}:${score ?? intel?.score ?? "unscored"}`}
            score={score ?? intel?.score ?? null}
            label={score != null ? riskLabel(score) : intelScoreLabel(intel?.scoreLabel, intel?.score)}
            analyzing={analyzing}
            ready={Boolean(data)}
            visible={riskVisible}
          />
        </View>

        <View onLayout={(event) => {
          const top = event.nativeEvent.layout.y;
          setAnalysisTop(top);
          if (top + 30 < height) setAnalysisVisible(true);
        }}>
          <TracerAnalysisPanel
            key={`${address}:${signals.map((row) => `${row.score}:${row.message}`).join("|")}`}
            rows={signals}
            pending={analyzing && !(token?.brief.breakdown?.length || token?.brief.signals?.length || intel?.split)}
            ready={Boolean(data)}
            visible={analysisVisible}
          />
        </View>

        {!isWallet ? (
        <View style={styles.mapPanel}>
          <View style={styles.mapTitleRow}><BubbleIcon width={18} height={18} /><Text style={styles.mapTitle}>Holder Bubble Map</Text></View>
          <View style={styles.mapToolbar}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.mapSubtitle}>{`${visibleMap?.nodes?.length ?? 0} holders · ${clusterCount} clusters · v2`}</Text>
              {intel?.score != null ? (
                <Text style={styles.mapIntel}>
                  {`Score ${Math.round(intel.score)} · ${intelScoreLabel(intel.scoreLabel, intel.score)}`}
                  {intel.split?.top10Pct != null ? ` · Top10 ${formatPct(intel.split.top10Pct)}` : ""}
                </Text>
              ) : null}
            </View>
            <Pressable
              style={styles.fitButton}
              onPress={() => {
                setZoom(1);
                setFitKey((value) => value + 1);
              }}
            >
              <Scan size={17} color="#10110B" />
              <Text style={styles.fitText}>Fit View</Text>
            </Pressable>
          </View>
          <View style={[styles.mapCanvas, { height: mapHeight }]}>
            <HolderBubbleMap
              data={mapData}
              loading={bubbleLoading}
              width={mapWidth}
              height={mapHeight}
              zoom={zoom}
              fitKey={fitKey}
            />
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
          <Text style={styles.mapHint}>Drag to pan · Use + / − to zoom · Fit View resets</Text>
          <Pressable style={styles.holdersButton} onPress={() => setHoldersOpen(!holdersOpen)}>
            <List size={17} color="#FFFFFF" />
            <Text style={styles.holdersButtonText}>Holders distribution list</Text>
            {holdersOpen ? <ChevronUp size={15} color="#FFFFFF" /> : <ChevronDown size={15} color="#FFFFFF" />}
          </Pressable>
          {holdersOpen && (
            <View style={styles.holdersList}>
              <View style={styles.holderListToolbar}>
                <Pressable onPress={() => setGroupClusters((value) => !value)}>
                  <Text style={styles.holderToggle}>{groupClusters ? "Ungroup clusters" : "Group clusters"}</Text>
                </Pressable>
                <Text style={styles.holderMeta}>{`${holderGroups.reduce((sum, group) => sum + group.members.length, 0)} wallets`}</Text>
              </View>
              <TextInput
                value={holderQuery}
                onChangeText={setHolderQuery}
                placeholder="Search address"
                placeholderTextColor="#6F6F6F"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.holderSearch}
              />
              <ScrollView nestedScrollEnabled style={styles.holderScroller}>
                {holderRows.map((group) => (
                  <View key={group.key}>
                    {groupClusters && group.clusterNo != null ? (
                      <View style={styles.clusterHeader}>
                        <View style={[styles.holderDot, { backgroundColor: group.pal.fill }]} />
                        <Text style={styles.clusterTitle}>{clusterTitle(group.kind, group.clusterNo)}</Text>
                        <Text style={styles.holderShare}>{formatPct(group.share)}</Text>
                      </View>
                    ) : null}
                    {group.members.map((member) => (
                      <Pressable
                        key={member.id}
                        style={styles.holderRow}
                        onPress={() => {
                          const value = member.address || member.label;
                          if (!value) return;
                          void Clipboard.setStringAsync(value);
                        }}
                      >
                        <Text style={styles.holderRank}>#{member.rank}</Text>
                        <View style={[styles.holderDot, { backgroundColor: member.isCreator ? "#f2c94c" : member.pal.fill }]} />
                        <Text style={styles.holderAddress} numberOfLines={1}>
                          {member.isCreator ? "Dev" : truncateAddress(member.address || member.label)}
                          {member.isMagic ? " · Magic" : ""}
                          {member.clusterKind && member.clusterKind !== "organic" ? ` · ${member.clusterKind}` : ""}
                        </Text>
                        <Text style={styles.holderShare}>{formatPct(member.percentage)}</Text>
                      </Pressable>
                    ))}
                  </View>
                ))}
                {!holderRows.some((group) => group.members.length) ? (
                  <Text style={styles.holderEmpty}>No holders match.</Text>
                ) : null}
              </ScrollView>
            </View>
          )}
        </View>
        ) : null}
      </ScrollView>
      {!isWallet ? (
      <View style={styles.tradeArea} pointerEvents="box-none">
        <Pressable
          style={styles.tradeButton}
          accessibilityRole="button"
          accessibilityLabel="Trade this token on DEX"
          onPress={() => {
            const mint = token?.mint || address;
            if (!isSolanaAddress(mint)) return;
            router.push(dexHref(mint));
          }}
        >
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
  mapTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1B2432" },
  mapPanel: { backgroundColor: "#080D18", borderRadius: 9, overflow: "hidden", paddingBottom: 13 },
  mapTitle: { color: LIME, fontSize: 16, fontWeight: "600" },
  mapToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, gap: 8 },
  mapSubtitle: { color: MUTED, fontSize: 11 },
  fitButton: { backgroundColor: LIME, borderRadius: 5, paddingHorizontal: 12, paddingVertical: 9, flexDirection: "row", gap: 6, alignItems: "center" },
  fitText: { color: "#0B1000", fontSize: 13, fontWeight: "700" },
  mapCanvas: { backgroundColor: "#080D18", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  zoomControls: { position: "absolute", right: 9, bottom: 17, backgroundColor: "#151515", borderRadius: 6, paddingVertical: 4 },
  zoomButton: { width: 34, height: 34, justifyContent: "center", alignItems: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 13, paddingHorizontal: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#1B2432" },
  legendText: { color: "#A3A3A3", fontSize: 10 },
  mapHint: { color: "#8C8C8C", fontSize: 10, paddingHorizontal: 13, marginTop: 14 },
  holdersButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: "#879C00", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 11, marginTop: 13, marginLeft: 13 },
  holdersButtonText: { color: "#FFFFFF", fontSize: 11 },
  holdersList: { paddingHorizontal: 13, paddingTop: 13, gap: 8 },
  holderListToolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  holderToggle: { color: LIME, fontSize: 11, fontWeight: "600" },
  holderMeta: { color: MUTED, fontSize: 10 },
  holderSearch: { height: 36, borderRadius: 6, backgroundColor: "#111827", color: "#F2F2F2", paddingHorizontal: 10, fontSize: 12 },
  holderScroller: { maxHeight: 360 },
  clusterHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  clusterTitle: { color: "#F2F2F2", fontSize: 12, fontWeight: "600", flex: 1 },
  holderRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 },
  holderRank: { color: MUTED, fontSize: 10, width: 28 },
  holderDot: { width: 8, height: 8, borderRadius: 4 },
  holderAddress: { color: "#E8E8E8", fontSize: 11, flex: 1 },
  holderShare: { color: MUTED, fontSize: 11 },
  holderEmpty: { color: MUTED, fontSize: 11, paddingVertical: 12 },
  mapIntel: { color: "#C6E900", fontSize: 10 },
  demoNote: { color: "#898989", textAlign: "center", fontSize: 10, lineHeight: 15, marginTop: 9 },
  tradeArea: { position: "absolute", bottom: 96, left: 16, right: 16 },
  tradeButton: { height: 44, borderRadius: 5, backgroundColor: LIME, alignItems: "center", justifyContent: "center" },
  tradeText: { color: "#111700", fontSize: 16, fontWeight: "700" },
});
