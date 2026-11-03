import PortfolioChart from "../../../components/PortfolioChart";
import { equityRange } from "../../../lib/portfolio-equity";
import TokenCardPressable from "../../../components/TokenCardPressable";
import ConfirmationCelebration from "../../../components/ConfirmationCelebration";
import AnimatedAmount from "../../../components/AnimatedAmount";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CalendarDays,
  Plus,
  MoreVertical,
  ArrowDownUp,
  BadgeCheck,
  Wallet,
} from "lucide-react-native";

import {
  COLORS,
  FONTS,
} from "../../../constants/theme";

import GlassButton from "../../../components/GlassButton";
import WalletProfile from "../../../components/WalletProfile";
import WalletMoreSheet from "../../../components/WalletMoreSheet";
import WalletHistorySheet from "../../../components/WalletHistorySheet";
import TokenImage from "../../../components/TokenRiskImage";
import { useNavScroll } from "../../../components/NavAnimationContext";
import { usePortfolio, positionPnl, type MockClosedPosition, type MockPosition } from "../../../components/PortfolioContext";
import { formatTokenAmount, formatUsdMoney, prettySymbol } from "../../../lib/format";
import { dexHref } from "../../../lib/nav";
// =====================================================
// TYPES
// =====================================================

const PLACEHOLDER = require("../../../assets/images/placeholder.png");

type Period = "24h" | "1w" | "1m" | "1y";
type PositionTab = "open" | "closed";
type SortOrder = "recent" | "top";

type Holding = {
  id: string;
  mint?: string;
  name: string;
  symbol: string;
  quantity: string;
  value: string;
  valueUsd: number;
  change: number;
  imageUrl?: string | null;
  verified?: boolean;
  date: string;
};

const PERIODS: Period[] = ["24h", "1w", "1m", "1y"];

function fromOpenPosition(position: MockPosition): Holding {
  const stats = positionPnl(position);
  return {
    id: position.mint,
    mint: position.mint,
    name: position.name,
    symbol: prettySymbol(position.symbol),
    quantity: formatTokenAmount(position.tokens),
    value: formatUsdMoney(stats.value),
    valueUsd: stats.value,
    change: stats.pct,
    imageUrl: position.imageUrl,
    verified: position.verified === true,
    date: position.updatedAt || position.openedAt,
  };
}

function fromClosedPosition(position: MockClosedPosition): Holding {
  return {
    id: `${position.mint}-${position.closedAt}`,
    mint: position.mint,
    name: position.name,
    symbol: prettySymbol(position.symbol),
    quantity: formatTokenAmount(position.tokens),
    value: formatUsdMoney(Math.abs(position.pnlUsd)),
    valueUsd: Math.abs(position.pnlUsd),
    change: position.pnlPct,
    imageUrl: position.imageUrl,
    verified: position.verified === true,
    date: position.closedAt,
  };
}

// =====================================================
// CHART COMPONENT
// =====================================================

// =====================================================
// TOKEN POSITION CARD
// =====================================================

function getPositionGradient(token: Holding, maxValue: number) {
  const proportion = Math.min(1, Math.max(0, token.valueUsd / Math.max(maxValue, 1)));
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
  maxValue,
  onPress,
}: {
  token: Holding;
  variant?: "open" | "closed";
  maxValue: number;
  onPress?: () => void;
}) {
  const isPositive = token.change >= 0;
  const gradient = getPositionGradient(token, maxValue);

  return (
    <TokenCardPressable onPress={onPress} disabled={!onPress}>
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.positionCard}
    >
      <View style={styles.positionIcon}>
        <TokenImage uri={token.imageUrl} mint={token.mint} style={styles.positionImage} />
      </View>

      <View style={styles.positionInfo}>
        <View style={styles.positionNameRow}>
          <Text
            style={styles.positionName}
            numberOfLines={1}
          >
            {token.name}
          </Text>

          {token.verified === true && <BadgeCheck
            size={14}
            color={COLORS.stonkGreen}
          />}
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
    </TokenCardPressable>
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
  const { cash, positions, closed, equityHistory, historyReady } = usePortfolio();
  const holdings = useMemo(() => positions.map(fromOpenPosition), [positions]);
  const closedHoldings = useMemo(() => closed.map(fromClosedPosition), [closed]);
  const holdingsValue = useMemo(
    () => holdings.reduce((sum, row) => sum + row.valueUsd, 0),
    [holdings],
  );
  const portfolioTotal = cash + holdingsValue;
  const [chartNow, setChartNow] = useState(Date.now);
  useFocusEffect(useCallback(() => { setChartNow(Date.now()); }, []));
  const observedAt = Math.max(chartNow, equityHistory.at(-1)?.time ?? chartNow);
  const range = useMemo(() => equityRange(equityHistory, portfolioTotal, period, observedAt), [equityHistory, portfolioTotal, period, observedAt]);
  const periodChange = range.change;

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
  }, [sortOrder, positionTab, holdings, closedHoldings]);
  const maxPositionValue = Math.max(1, ...sortedHoldings.map((row) => row.valueUsd));

  const toggleSort = () => {
    setSortOrder((current) =>
      current === "recent" ? "top" : "recent"
    );
  };

  return (
    <View style={styles.root}>
      {/* Background */}

      <ScrollView
        onScroll={navScroll.onScroll}
        onScrollBeginDrag={navScroll.onScrollBeginDrag}
        onScrollEndDrag={navScroll.onScrollEndDrag}
        onMomentumScrollEnd={navScroll.onMomentumScrollEnd}
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
                {formatUsdMoney(portfolioTotal)}
              </Text>

              <View style={styles.pnlRow}>
                <Text style={[styles.pnlPositive, periodChange < 0 && { color: COLORS.sell }]}>
                  {periodChange >= 0 ? "+" : ""}
                  {formatUsdMoney(periodChange).replace("$-", "-$")}
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
                  onPress={() => { setChartNow(Date.now()); setPeriod(item); }}
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

          <PortfolioChart points={range.points} ready={historyReady} />

          <View style={styles.chartFooter}>
            <View style={styles.walletValueRow}>
              <Wallet
                size={20}
                color={COLORS.stonkGreen}
              />

              <Text style={styles.walletValue}>
                {formatUsdMoney(cash)}
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

        {sortedHoldings.length ? (
          <View style={styles.positionsList}>
            {sortedHoldings.map((token) => (
              <PositionCard
                key={token.id}
                token={token}
                variant={positionTab}
                maxValue={maxPositionValue}
                onPress={token.mint ? () => router.push(dexHref(token.mint!)) : undefined}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyPositions}>
            <Text style={styles.emptyText}>
              {positionTab === "open" ? "No open positions" : "No closed positions"}
            </Text>
          </View>
        )}
      </ScrollView>
      {showWithdrawalBanner && !!withdrawalId && !!withdrawalAmount && !!withdrawalTo && (
        <ConfirmationCelebration style={[styles.withdrawBanner, { top: insets.top + 10 }]}>
          {(onAmountComplete) => <>
          <Text style={styles.withdrawBannerAddress} numberOfLines={1}>
            {withdrawalTo.slice(0, 10)}...{withdrawalTo.slice(-10)}
          </Text>
          <AnimatedAmount amount={-Math.abs(Number(withdrawalAmount))} style={styles.withdrawBannerAmount} onComplete={onAmountComplete} />
          </>}
        </ConfirmationCelebration>
      )}
      {showSendBanner && !!sendId && !!sendAmount && !!sendName && (
        <ConfirmationCelebration style={[styles.withdrawBanner, { top: insets.top + 10 }]}>
          {(onAmountComplete) => <>
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
          <AnimatedAmount amount={-Math.abs(Number(sendAmount))} style={styles.withdrawBannerAmount} onComplete={onAmountComplete} />
          </>}
        </ConfirmationCelebration>
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
    backgroundColor: "transparent",
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
