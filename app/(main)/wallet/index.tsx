
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import {
  Send,
  Settings,
  CalendarDays,
  Plus,
  MoreVertical,
  ArrowDownUp,
  History,
  BadgeCheck,
  Wallet,
} from "lucide-react-native";

import {
  COLORS,
  FONTS,
  GRADIENTS,
} from "../../../constants/theme";

import GlassButton from "../../../components/GlassButton";
import WalletProfile from "../../../components/WalletProfile";
import WalletMoreSheet from "../../../components/WalletMoreSheet";
import WalletHistorySheet from "../../../components/WalletHistorySheet";
import { useNavScroll } from "../../../components/NavAnimationContext";
// =====================================================
// TYPES
// =====================================================

const PLACEHOLDER = require("../../../assets/images/placeholder.png");

type Period = "24h" | "1w" | "1m" | "1y";
type PositionTab = "open" | "closed";
type SortOrder = "recent" | "top";

type Holding = {
  id: string;
  name: string;
  symbol: string;
  quantity: string;
  value: string;
  change: number;
  icon: string;
  background: string;
  date: string;
};

// =====================================================
// DEMO DATA
// =====================================================

// These are sample positions for UI development.
// Replace with actual API data later.

const holdings: Holding[] = [
  {
    id: "stonk",
    name: "Stonk Watcher",
    symbol: "$STWC",
    quantity: "2.7M",
    value: "$2,302.42",
    change: 20.61,
    icon: "👁️",
    background: "#002D1F",
    date: "2026-10-22T10:00:00",
  },
  {
    id: "zcat",
    name: "Anonymous Cat",
    symbol: "$ZCAT",
    quantity: "45.7K",
    value: "$1,252.71",
    change: -10.83,
    icon: "🐱",
    background: "#33100B",
    date: "2026-10-21T15:00:00",
  },
  {
    id: "mask",
    name: "Nullmask",
    symbol: "$MASK",
    quantity: "1.5M",
    value: "$4,689.12",
    change: -8.11,
    icon: "🎭",
    background: "#33100B",
    date: "2026-10-20T11:00:00",
  },
  {
    id: "superinu",
    name: "Super Inu",
    symbol: "$SI",
    quantity: "1.1M",
    value: "$15,143.38",
    change: 15.93,
    icon: "🐕",
    background: "#002D1F",
    date: "2026-10-19T08:00:00",
  },
  {
    id: "allinu",
    name: "ALLINU",
    symbol: "$ALLINU",
    quantity: "13.6M",
    value: "$725.67",
    change: 30.82,
    icon: "🐶",
    background: "#002D1F",
    date: "2026-10-18T09:00:00",
  },
];

const closedHoldings: Holding[] = [
  {
    id: "closed-stonk",
    name: "Stonk Watcher",
    symbol: "$STWC",
    quantity: "1.2M",
    value: "$482.35",
    change: 12.45,
    icon: "👁️",
    background: "#002D1F",
    date: "2026-10-22T10:00:00",
  },
  {
    id: "closed-zcat",
    name: "Anonymous Cat",
    symbol: "$ZCAT",
    quantity: "25.4K",
    value: "$125.80",
    change: -8.32,
    icon: "🐱",
    background: "#33100B",
    date: "2026-10-21T15:00:00",
  },
];
const PERIODS: Period[] = ["24h", "1w", "1m", "1y"];

// =====================================================
// CHART COMPONENT
// =====================================================

function PortfolioChart() {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - 52, 260);
  const chartHeight = 240;

  return (
    <Svg
      width="100%"
      height={chartHeight}
      viewBox="0 0 340 220"
      preserveAspectRatio="none"
    >
      <Defs>
        <SvgGradient
          id="portfolioFill"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <Stop
            offset="0%"
            stopColor="#00D492"
            stopOpacity="0.35"
          />
          <Stop
            offset="100%"
            stopColor="#00D492"
            stopOpacity="0.02"
          />
        </SvgGradient>
      </Defs>

      <Path
        d="
          M 8 170
          C 40 110, 60 90, 88 135
          S 125 185, 150 135
          S 215 5, 260 75
          S 300 160, 332 70
          L 332 220
          L 8 220
          Z
        "
        fill="url(#portfolioFill)"
      />

      <Path
        d="
          M 8 170
          C 40 110, 60 90, 88 135
          S 125 185, 150 135
          S 215 5, 260 75
          S 300 160, 332 70
        "
        stroke={COLORS.buy}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />

      <Circle
        cx={332}
        cy={70}
        r={10}
        fill="rgba(0,212,146,0.25)"
      />

      <Circle
        cx={332}
        cy={70}
        r={5}
        fill={COLORS.buy}
      />
    </Svg>
  );
}

// =====================================================
// TOKEN POSITION CARD
// =====================================================

// Scale the horizontal tint by the position's dollar value.
// The largest demo position begins transitioning earlier; smaller ones
// stay black longer before reaching their green/red tint on the right.
const MAX_POSITION_VALUE = Math.max(
  ...holdings.map((item) => Number(item.value.replace(/[^\d.]/g, ""))),
  ...closedHoldings.map((item) => Number(item.value.replace(/[^\d.]/g, "")))
);

function getPositionGradient(token: Holding) {
  const value = Number(token.value.replace(/[^\d.]/g, "")) || 0;
  const proportion = Math.min(1, Math.max(0, value / MAX_POSITION_VALUE));
  const colorStart = 0.76 - proportion * 0.57;
  const positive = token.change >= 0;

  return {
    colors: positive
      ? (["#101010", "#101010", "#002D1F"] as const)
      : (["#101010", "#101010", "#33100B"] as const),
    locations: [0, colorStart, 1] as [number, number, number],
  };
}

function PositionCard({
  token,
  variant = "open",
}: {
  token: Holding;
  variant?: "open" | "closed";
}) {
  const isPositive = token.change >= 0;
  const gradient = getPositionGradient(token);

  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.positionCard}
    >
      <View style={styles.positionIcon}>
        <Image source={PLACEHOLDER} style={styles.positionImage} resizeMode="cover" />
      </View>

      <View style={styles.positionInfo}>
        <View style={styles.positionNameRow}>
          <Text
            style={styles.positionName}
            numberOfLines={1}
          >
            {token.name}
          </Text>

          <BadgeCheck
            size={14}
            color={COLORS.stonkGreen}
          />
        </View>

        <Text style={[
          styles.positionSymbol,
          variant === "closed" && {
            marginTop: 7,
            fontSize: 11,
          },
        ]}>
          {variant === "closed"
            ? new Date(token.date).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
            : `${token.quantity} ${token.symbol}`}
        </Text>
      </View>

      <View style={styles.positionValues}>
        <Text
          style={[
            styles.positionValue,
            variant === "closed" && {
              color: isPositive ? COLORS.buy : COLORS.sell,
            },
          ]}
        >
          {variant === "closed"
            ? `${isPositive ? "+" : "-"}${token.value}`
            : token.value}
        </Text>

        <View
          style={[
            styles.changeBadge,
            {
              backgroundColor: isPositive
                ? COLORS.buyBackground
                : COLORS.sellBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.changeText,
              {
                color: isPositive
                  ? COLORS.buyBorder
                  : COLORS.sellBorder,
              },
            ]}
          >
            {isPositive ? "▲" : "▼"}{" "}
            {Math.abs(token.change).toFixed(2)}%
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// =====================================================
// WALLET SCREEN
// =====================================================

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { withdrawalAmount, withdrawalTo, withdrawalId, sendAmount, sendName, sendHandle, sendId } = useLocalSearchParams<{ withdrawalAmount?: string; withdrawalTo?: string; withdrawalId?: string; sendAmount?: string; sendName?: string; sendHandle?: string; sendId?: string }>();
  const navScroll = useNavScroll();
  const [moreVisible, setMoreVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [showWithdrawalBanner, setShowWithdrawalBanner] = useState(false);
  const [showSendBanner, setShowSendBanner] = useState(false);

  // Show each demo confirmation briefly, then remove its route parameters.
  useEffect(() => {
    if (!withdrawalId || !withdrawalAmount || !withdrawalTo) {
      setShowWithdrawalBanner(false);
      return;
    }

    setShowWithdrawalBanner(true);
    const timeout = setTimeout(() => {
      setShowWithdrawalBanner(false);
      router.setParams({
        withdrawalId: "",
        withdrawalAmount: "",
        withdrawalTo: "",
      });
    }, 4000);

    return () => clearTimeout(timeout);
  }, [withdrawalId, withdrawalAmount, withdrawalTo, router]);

  useEffect(() => {
    if (!sendId || !sendAmount || !sendName) { setShowSendBanner(false); return; }
    setShowSendBanner(true);
    const timeout = setTimeout(() => {
      setShowSendBanner(false);
      router.setParams({ sendId: '', sendAmount: '', sendName: '', sendHandle: '' });
    }, 4000);
    return () => clearTimeout(timeout);
  }, [sendId, sendAmount, sendName, router]);

  const openDeposit = () => {
    router.push("/settings/deposit" as any);
  };
  const openWithdraw = () => {
    setMoreVisible(false);
    router.push("/wallet/withdraw" as any);
  };
  const openSend = () => {
    setMoreVisible(false);
    router.push("/wallet/send" as any);
  };

  const [period, setPeriod] =
    useState<Period>("24h");

  const [positionTab, setPositionTab] =
    useState<PositionTab>("open");

  const [sortOrder, setSortOrder] =
    useState<SortOrder>("recent");

  // Sort using the sample timestamps.
  const sortedHoldings = useMemo(() => {
    const selectedHoldings =
      positionTab === "open" ? holdings : closedHoldings;

    return [...selectedHoldings].sort((a, b) => {
      if (sortOrder === "recent") {
        return (
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
        );
      }

      return (
        b.change - a.change ||
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    });
  }, [sortOrder, positionTab]);

  const toggleSort = () => {
    setSortOrder((current) =>
      current === "recent" ? "top" : "recent"
    );
  };

  return (
    <View style={styles.root}>
      {/* Background */}

      <LinearGradient
        colors={GRADIENTS.tokens}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        onScroll={navScroll.onScroll}
        onScrollBeginDrag={navScroll.onScrollBeginDrag}
        onScrollEndDrag={navScroll.onScrollEndDrag}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Shared wallet profile and top buttons */}

        <WalletProfile onHistory={() => setHistoryVisible(true)} onOpenMore={() => setMoreVisible(true)} onSend={openSend} />

        {/* Portfolio chart */}

        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.balance}>
                $93,737.34
              </Text>

              <View style={styles.pnlRow}>
                <Text style={styles.pnlPositive}>
                  +$11,827.63
                </Text>

                <Text style={styles.pnlPeriod}>
                  {period}
                </Text>
              </View>
            </View>

            <View style={styles.periodSelector}>
              {PERIODS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setPeriod(item)}
                  style={[
                    styles.periodButton,
                    period === item &&
                    styles.periodSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === item &&
                      styles.periodSelectedText,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <PortfolioChart />

          <View style={styles.chartFooter}>
            <View style={styles.walletValueRow}>
              <Wallet
                size={20}
                color={COLORS.stonkGreen}
              />

              <Text style={styles.walletValue}>
                $1,500.14
              </Text>
            </View>

            <View style={styles.chartActions}>
              <GlassButton
                icon={
                  <Plus
                    size={22}
                    color={COLORS.white}
                  />
                }
                accessibilityLabel="Add"
                onPress={openDeposit}
                size={42}
              />

              <GlassButton
                icon={
                  <MoreVertical
                    size={21}
                    color={COLORS.white}
                  />
                }
                accessibilityLabel="More options"
                onPress={() => setMoreVisible(true)}
                size={42}
              />
            </View>
          </View>
        </View>

        {/* Open / Closed and Calendar */}

        <View style={styles.positionControls}>
          <View style={styles.positionTabs}>
            {(["open", "closed"] as PositionTab[]).map(
              (tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setPositionTab(tab)}
                  style={[
                    styles.positionTab,
                    positionTab === tab &&
                    styles.positionTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.positionTabText,
                      positionTab === tab &&
                      styles.positionTabTextActive,
                    ]}
                  >
                    {tab === "open"
                      ? "Open"
                      : "Closed"}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <GlassButton
            icon={
              <CalendarDays
                size={21}
                color={COLORS.white}
              />
            }
            onPress={() =>
              router.push("/wallet/calendar")
            }
            accessibilityLabel="Open rewards calendar"
            size={44}
          />
        </View>

        {/* Positions heading and Recent sort */}

        <View style={styles.positionsHeader}>
          <Text style={styles.positionsTitle}>
            Positions{" "}
            <Text style={styles.positionsCount}>
              {positionTab === "open"
                ? holdings.length
                : closedHoldings.length}
            </Text>
          </Text>

          <Pressable
            onPress={toggleSort}
            style={styles.recentButton}
            accessibilityRole="button"
            accessibilityLabel="Change position sorting"
          >
            <Text style={styles.recentText}>
              {sortOrder === "recent"
                ? "Recent"
                : "Top Trades"}
            </Text>

            <ArrowDownUp
              size={16}
              color={COLORS.grey}
            />
          </Pressable>
        </View>

        {/* Positions list */}

        {positionTab === "open" ? (
          <View style={styles.positionsList}>
            {sortedHoldings.map((token) => (
              <PositionCard
                key={token.id}
                token={token}
                variant="open"
              />
            ))}
          </View>
        ) : (
          <View style={styles.positionsList}>
            {sortedHoldings.map((token) => (
              <PositionCard
                key={token.id}
                token={token}
                variant="closed"
              />
            ))}
          </View>
        )}
      </ScrollView>
      {showWithdrawalBanner && !!withdrawalId && !!withdrawalAmount && !!withdrawalTo && (
        <View style={[styles.withdrawBanner, { top: insets.top + 10 }]} pointerEvents="none">
          <Text style={styles.withdrawBannerAddress} numberOfLines={1}>
            {withdrawalTo.slice(0, 10)}...{withdrawalTo.slice(-10)}
          </Text>
          <Text style={styles.withdrawBannerAmount}>
            -${Number(withdrawalAmount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      )}
      {showSendBanner && !!sendId && !!sendAmount && !!sendName && (
        <View style={[styles.withdrawBanner, { top: insets.top + 10 }]} pointerEvents="none">
          <View style={styles.bannerAvatar}>
            <Image source={PLACEHOLDER} style={styles.bannerImage} resizeMode="cover" />
          </View>
          <View style={styles.bannerRecipient}>
            <View style={styles.bannerNameRow}>
              <Text style={styles.bannerName} numberOfLines={1}>
                {sendName}
              </Text>
              <BadgeCheck size={15} color={COLORS.stonkGreen} strokeWidth={2} />
            </View>
            <Text style={styles.bannerSubtitle} numberOfLines={1}>
              {sendHandle || "@user"}
            </Text>
          </View>
          <Text style={styles.withdrawBannerAmount}>
            -${Number(sendAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      )}
      <WalletMoreSheet
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        onDeposit={openDeposit}
        onWithdraw={openWithdraw}
        onSend={openSend}
      />

      <WalletHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      />
    </View>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  withdrawBanner: {
    position: "absolute", left: 16, right: 16, zIndex: 100,
    elevation: 20,
    borderWidth: 1, borderColor: "#F0523E", backgroundColor: "#300B07",
    borderRadius: 9, minHeight: 61, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8, gap: 9,
  },
  bannerAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#263443",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  bannerImage: { width: "100%", height: "100%" },
  bannerAvatarText: { fontSize: 23 },
  bannerRecipient: { flex: 1, justifyContent: "center", gap: 3 },
  bannerNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  bannerName: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", flexShrink: 1 },
  bannerSubtitle: { color: "#BEB4B1", fontSize: 11 },
  withdrawBannerAddress: { color: "#FFFFFF", fontSize: 12, flex: 1 },
  withdrawBannerAmount: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  root: {
    flex: 1,
    backgroundColor: COLORS.black,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 120,
  },

  // Portfolio chart

  chartContainer: {
    backgroundColor: "rgba(8,16,10,0.65)",
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 18,
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 14,
    overflow: "hidden",
  },

  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },

  balance: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 23,
    fontWeight: "700",
  },

  pnlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },

  pnlPositive: {
    fontFamily: FONTS.regular,
    color: COLORS.buy,
    fontSize: 14,
    fontWeight: "600",
  },

  pnlPeriod: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    fontSize: 12,
  },

  periodSelector: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.stonkGreen,
    borderRadius: 5,
    padding: 2,
    backgroundColor: COLORS.stonkDarkG,
  },

  periodButton: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 3,
  },

  periodSelected: {
    backgroundColor: COLORS.stonkLightG,
  },

  periodText: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 11,
  },

  periodSelectedText: {
    color: COLORS.black,
    fontWeight: "700",
  },

  chartFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -6,
  },

  walletValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  walletValue: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "700",
  },

  chartActions: {
    flexDirection: "row",
    gap: 8,
  },

  // Open / Closed

  positionControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  positionTabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.stonkGreen,
    backgroundColor: COLORS.stonkDarkG,
    padding: 2,
    borderRadius: 5,
  },

  positionTab: {
    minWidth: 80,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 3,
  },

  positionTabActive: {
    backgroundColor: COLORS.stonkLightG,
  },

  positionTabText: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 14,
  },

  positionTabTextActive: {
    color: COLORS.black,
    fontWeight: "700",
  },

  // Positions and sorting

  positionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  positionsTitle: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 16,
  },

  positionsCount: {
    color: COLORS.stonkGreen,
    fontWeight: "700",
  },

  recentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 5,
  },

  recentText: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    fontSize: 12,
  },

  // Token cards

  positionsList: {
    gap: 7,
  },

  positionCard: {
    minHeight: 83,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  positionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.stonkDarkB,
    alignItems: "center",
    justifyContent: "center",
  },

  positionImage: { width: "100%", height: "100%", borderRadius: 999 },
  positionEmoji: {
    fontSize: 25,
  },

  positionInfo: {
    flex: 1,
  },

  positionNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  positionName: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },

  positionSymbol: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    fontSize: 11,
    marginTop: 5,
  },

  positionValues: {
    alignItems: "flex-end",
  },

  positionValue: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },

  changeBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 5,
    marginTop: 5,
  },

  changeText: {
    fontFamily: FONTS.regular,
    fontSize: 10,
  },

  // Empty state

  emptyPositions: {
    paddingVertical: 35,
    alignItems: "center",
  },

  emptyText: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    fontSize: 13,
  },
});
