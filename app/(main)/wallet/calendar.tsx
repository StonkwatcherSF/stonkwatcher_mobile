
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Aperture,
  Copy,
} from "lucide-react-native";
import { useNavScroll } from "../../../components/NavAnimationContext";
import {
  COLORS,
  FONTS,
  GRADIENTS,
} from "../../../constants/theme";
import WalletProfile from "../../../components/WalletProfile";
import GlassButton from "../../../components/GlassButton";
import WalletHistorySheet from "../../../components/WalletHistorySheet";
import TokenImage from "../../../components/TokenImage";
import {
  mintPnl,
  monthPnlByDay,
  positionPnl,
  utcDateKey,
  usePortfolio,
  type MockPosition,
  type MockTrade,
} from "../../../components/PortfolioContext";
import { formatTokenAmount, formatUsdMoney, prettySymbol } from "../../../lib/format";
import { truncateAddress } from "../../../lib/solana";

type CalendarMode = "calendar" | "panel";

function utcMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function formatSignedUsd(value: number) {
  const abs = Math.abs(value);
  const compact =
    abs >= 1000 ? `$${(abs / 1000).toFixed(2)}K` : formatUsdMoney(abs);
  if (value > 0) return `+${compact}`;
  if (value < 0) return `-${compact}`;
  return compact;
}

function FeeShareDashboard({
  position,
  trades,
  onSnapshot,
}: {
  position: MockPosition;
  trades: MockTrade[];
  onSnapshot: () => void;
}) {
  const stats = positionPnl(position);
  const latestDay = utcDateKey(position.updatedAt || position.openedAt);
  const pnl24h = mintPnl(trades, position.mint, latestDay) + stats.pnl;
  const pnlAll = mintPnl(trades, position.mint) + stats.pnl;
  const symbol = prettySymbol(position.symbol) || position.symbol;
  const metrics = [
    { label: "24h", amount: "0", value: formatSignedUsd(pnl24h) },
    { label: "All Time", amount: "0", value: formatSignedUsd(pnlAll) },
    { label: "Holding", amount: formatTokenAmount(position.tokens), value: formatUsdMoney(stats.value) },
  ];

  async function copyMint() {
    try {
      await Clipboard.setStringAsync(position.mint);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Unable to copy", "Could not copy the contract address.");
    }
  }

  return (
    <View style={styles.feeDashboard}>
      <View style={styles.feeHeader}>
        <View style={styles.tokenIcon}>
          <TokenImage uri={position.imageUrl} mint={position.mint} style={styles.tokenImage} />
        </View>

        <View style={styles.tokenInfo}>
          <View style={styles.tokenTitleRow}>
            <Text style={styles.tokenName}>{position.name}</Text>
            <View style={styles.greenDot} />
            <Text style={styles.tokenSymbol}>{symbol}</Text>

            <View style={styles.officialBadge}>
              {position.verified === true && <BadgeCheck
                size={13}
                color={COLORS.stonkLightG}
              />}
              <Text style={styles.officialText}>
                Demo
              </Text>
            </View>
          </View>

          <Pressable onPress={() => void copyMint()} hitSlop={8} style={styles.addressRow}>
            <Text style={styles.address}>
              {truncateAddress(position.mint)}
            </Text>
            <Copy size={13} color={COLORS.grey} />
          </Pressable>
        </View>

        <GlassButton
          icon={
            <Aperture
              size={23}
              color={COLORS.stonkLightG}
            />
          }
          onPress={onSnapshot}
          accessibilityLabel="Open reward snapshot"
          size={46}
        />
      </View>

      <Text style={styles.feeTitle}>
        Paper position
      </Text>

      <View style={styles.metrics}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metricCard}>
            <Text style={styles.metricLabel}>
              {metric.label}
            </Text>

            <View style={styles.metricRow}>
              <Text style={styles.metricValue}>
                {metric.amount}
              </Text>
              <View style={styles.greenDot} />
              <Text style={styles.metricValue}>
                {metric.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function RewardsCalendar() {
  const router = useRouter();
  const navScroll = useNavScroll();
  const { positions, trades } = usePortfolio();

  const [mode, setMode] =
    useState<CalendarMode>("calendar");

  const [historyVisible, setHistoryVisible] =
    useState(false);

  const [month, setMonth] = useState(utcMonthStart);

  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const pnlByDay = useMemo(
    () => monthPnlByDay(trades, positions, year, monthIndex),
    [trades, positions, year, monthIndex],
  );
  const monthTotal = Object.values(pnlByDay).reduce((sum, value) => sum + value, 0);
  const profitableDays = Object.values(pnlByDay).filter((value) => value > 0).length;

  const monthTitle = month.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const daysInMonth = new Date(
    Date.UTC(year, monthIndex + 1, 0)
  ).getUTCDate();

  const firstDay = new Date(
    Date.UTC(year, monthIndex, 1)
  ).getUTCDay();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => i + 1
    ),
  ];

  // Complete each week so every row has the same seven equal columns.
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7)
  );

  function changeMonth(direction: number) {
    setMonth(
      new Date(
        Date.UTC(year, monthIndex + direction, 1)
      )
    );
  }

  return (
    <View style={styles.root}>
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* UPDATED: History icon now opens History sheet */}
        <WalletProfile
          showBack
          onHistory={() => setHistoryVisible(true)}
        />

        <View style={styles.segment}>
          <Pressable
            onPress={() => setMode("calendar")}
            style={[
              styles.segmentButton,
              mode === "calendar" &&
                styles.selectedSegment,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                mode === "calendar" &&
                  styles.selectedText,
              ]}
            >
              StonkFun Rewards Calendar
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setMode("panel")}
            style={[
              styles.segmentButton,
              mode === "panel" &&
                styles.selectedSegment,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                mode === "panel" &&
                  styles.selectedText,
              ]}
            >
              Panel Mode
            </Text>
          </Pressable>
        </View>

        <View style={styles.monthBar}>
          <Pressable
            onPress={() => changeMonth(-1)}
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={22} color={COLORS.white} />
          </Pressable>

          <Text style={styles.monthText}>
            {monthTitle} UTC+0
          </Text>

          <Pressable
            onPress={() => changeMonth(1)}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={22} color={COLORS.white} />
          </Pressable>
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>
              Total PnL
            </Text>
            <Text style={[styles.statValue, monthTotal < 0 && { color: COLORS.sell }]}>
              {formatSignedUsd(monthTotal)}
            </Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statLabel}>
              Profitable Days/Amount
            </Text>
            <Text style={[styles.statValue, monthTotal < 0 && { color: COLORS.sell }]}>
              {`${profitableDays} | ${formatSignedUsd(monthTotal)}`}
            </Text>
          </View>
        </View>

        {mode === "calendar" ? (
          <>
            <View style={styles.weekdays}>
              {[
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
              ].map((day) => (
                <Text
                  key={day}
                  style={styles.weekday}
                >
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {weeks.map((week, weekIndex) => (
                <View key={weekIndex} style={styles.calendarWeek}>
                  {week.map((day, index) => {
                    const pnl =
                      day !== null ? pnlByDay[day] : undefined;

                    return (
                      <View
                        key={index}
                        style={styles.daySlot}
                      >
                        {day !== null && (
                          <View
                            style={[
                              styles.dayCell,
                              pnl
                                ? pnl > 0
                                  ? styles.profitableDay
                                  : styles.lossDay
                                : styles.emptyDay,
                            ]}
                          >
                            <Text style={styles.dayNumber}>
                              {day}
                            </Text>

                            {pnl ? (
                              <Text
                                style={styles.dayProfit}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                              >
                                {formatSignedUsd(pnl)}
                              </Text>
                            ) : null}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>
              Performance Overview
            </Text>

            <Text style={styles.panelText}>
              {monthTotal
                ? `${profitableDays} profitable day${profitableDays === 1 ? "" : "s"} · ${formatSignedUsd(monthTotal)}`
                : "No paper-trade PnL for this month yet."}
            </Text>
          </View>
        )}

        <Text style={styles.rewardsHeading}>
          Rewards{" "}
          <Text style={styles.highlight}>
            {positions.length}
          </Text>
        </Text>

        {positions.length ? (
          positions.map((position) => (
            <FeeShareDashboard
              key={position.mint}
              position={position}
              trades={trades}
              onSnapshot={() =>
                router.push({
                  pathname: "/wallet/calendar/snapshot",
                  params: { mint: position.mint },
                })
              }
            />
          ))
        ) : (
          <Text style={styles.noRewards}>
            No positions yet. Paper-buy a token to test this calendar.
          </Text>
        )}
      </ScrollView>

      {/* NEW: Reuse the existing History bottom sheet */}
      <WalletHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.black,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 120,
  },

  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.stonkGreen,
    borderRadius: 5,
    padding: 2,
    marginBottom: 14,
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 3,
    backgroundColor: COLORS.stonkDarkG,
  },

  selectedSegment: {
    backgroundColor: COLORS.stonkLightG,
  },

  segmentText: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 12,
    textAlign: "center",
  },

  selectedText: {
    color: COLORS.black,
    fontWeight: "700",
  },

  monthBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 25,
    marginBottom: 12,
  },

  monthText: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 14,
  },

  stats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 22,
  },

  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },

  statLabel: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    fontSize: 10,
    textAlign: "center",
  },

  statValue: {
    fontFamily: FONTS.regular,
    color: COLORS.buy,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 7,
  },

  weekdays: {
    flexDirection: "row",
    marginBottom: 5,
  },

  weekday: {
    flex: 1,
    textAlign: "center",
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 12,
  },

  calendarGrid: {
    marginBottom: 24,
  },

  calendarWeek: {
    flexDirection: "row",
  },

  daySlot: {
    flex: 1,
    minWidth: 0,
    padding: 2,
  },

  dayCell: {
    height: 68,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  profitableDay: {
    backgroundColor: COLORS.buyBackground,
  },

  lossDay: {
    backgroundColor: COLORS.sellBackground,
  },

  tokenImage: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },

  emptyDay: {
    backgroundColor: COLORS.stonkDarkestG,
  },

  dayNumber: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 14,
  },

  dayProfit: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "600",
  },

  panel: {
    backgroundColor: COLORS.stonkDarkestG,
    borderRadius: 8,
    padding: 18,
    marginBottom: 24,
  },

  panelTitle: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 17,
    marginBottom: 8,
  },

  panelText: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    fontSize: 12,
  },

  rewardsHeading: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 17,
    marginBottom: 10,
  },

  highlight: {
    color: COLORS.stonkGreen,
    fontWeight: "700",
  },

  noRewards: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    paddingVertical: 20,
  },

  feeDashboard: {
    backgroundColor: "#1C2103",
    borderWidth: 1,
    borderColor: "#7D8654",
    borderRadius: 14,
    padding: 17,
    marginBottom: 25,
  },

  feeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 20,
  },

  tokenIcon: {
    width: 49,
    height: 49,
    borderRadius: 25,
    backgroundColor: "#071015",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  tokenLetter: {
    fontFamily: FONTS.regular,
    color: "#C2E2EA",
    fontSize: 27,
    fontWeight: "800",
  },

  tokenInfo: {
    flex: 1,
  },

  tokenTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  tokenName: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "600",
  },

  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.stonkGreen,
  },

  tokenSymbol: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    fontSize: 12,
  },

  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#879548",
    backgroundColor: "#313C05",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },

  officialText: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 10,
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 5,
  },

  address: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    fontSize: 12,
  },

  feeTitle: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 19,
    marginBottom: 11,
  },

  metrics: {
    gap: 7,
  },

  metricCard: {
    backgroundColor: "#111500",
    borderRadius: 7,
    minHeight: 65,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  metricLabel: {
    fontFamily: FONTS.regular,
    color: COLORS.grey,
    fontSize: 13,
  },

  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  metricValue: {
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
});
