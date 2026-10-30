
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

type CalendarMode = "calendar" | "panel";

const DEMO_PNL: Record<number, number> = {
  1: 10.2,
  2: 12.2,
  3: 20.5,
  4: 50.2,
  5: 20,
  6: 10.1,
  7: 30.4,
  8: 10.5,
  9: 50,
  10: 20.2,
  11: 10.2,
  13: 20,
  14: 30.4,
  15: 20.2,
  16: 10.5,
  17: 50,
  18: 20.2,
  19: 10.2,
  20: 12.2,
  22: 20,
  24: 50,
  25: 2360,
  26: 20.2,
  27: 50,
  28: 50,
  29: 20,
  30: 10.5,
};

const FEE_METRICS = [
  { label: "24h", amount: "13.01 STONK", value: "$2.95" },
  { label: "All Time", amount: "687.36 STONK", value: "$155.76" },
  { label: "Holding", amount: "21.51M", value: "$756.51" },
];

function formatMoney(value: number) {
  return value >= 1000
    ? `+$${(value / 1000).toFixed(2)}K`
    : `+$${value.toFixed(2)}`;
}

function FeeShareDashboard({
  onSnapshot,
}: {
  onSnapshot: () => void;
}) {
  return (
    <View style={styles.feeDashboard}>
      <View style={styles.feeHeader}>
        <View style={styles.tokenIcon}>
          <Text style={styles.tokenLetter}>S</Text>
        </View>

        <View style={styles.tokenInfo}>
          <View style={styles.tokenTitleRow}>
            <Text style={styles.tokenName}>STONK</Text>
            <View style={styles.greenDot} />
            <Text style={styles.tokenSymbol}>$STONK</Text>

            <View style={styles.officialBadge}>
              <BadgeCheck
                size={13}
                color={COLORS.stonkLightG}
              />
              <Text style={styles.officialText}>
                Official
              </Text>
            </View>
          </View>

          <View style={styles.addressRow}>
            <Text style={styles.address}>
              6GmAFS...MpUNgx
            </Text>
            <Copy size={13} color={COLORS.grey} />
          </View>
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
        StonkFun Fee Share
      </Text>

      <View style={styles.metrics}>
        {FEE_METRICS.map((metric) => (
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

  const [mode, setMode] =
    useState<CalendarMode>("calendar");

  // NEW: History sheet visibility
  const [historyVisible, setHistoryVisible] =
    useState(false);

  // September 2024 is used for the sample calendar.
  const [month, setMonth] = useState(
    new Date(2024, 8, 1)
  );

  const isDemoMonth =
    month.getFullYear() === 2024 &&
    month.getMonth() === 8;

  const monthTitle = month.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();

  const firstDay = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  ).getDay();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => i + 1
    ),
  ];

  function changeMonth(direction: number) {
    setMonth(
      new Date(
        month.getFullYear(),
        month.getMonth() + direction,
        1
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
            <Text style={styles.statValue}>
              {isDemoMonth ? "+$8.50K" : "—"}
            </Text>
          </View>

          <View style={styles.stat}>
            <Text style={styles.statLabel}>
              Profitable Days/Amount
            </Text>
            <Text style={styles.statValue}>
              {isDemoMonth ? "27 | +$8.50K" : "—"}
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
              {cells.map((day, index) => {
                const pnl =
                  day !== null && isDemoMonth
                    ? DEMO_PNL[day]
                    : undefined;

                return (
                  <View
                    key={index}
                    style={styles.daySlot}
                  >
                    {day !== null && (
                      <View
                        style={[
                          styles.dayCell,
                          pnl !== undefined
                            ? styles.profitableDay
                            : styles.emptyDay,
                        ]}
                      >
                        <Text style={styles.dayNumber}>
                          {day}
                        </Text>

                        {pnl !== undefined && (
                          <Text
                            style={styles.dayProfit}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {formatMoney(pnl)}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>
              Performance Overview
            </Text>

            <Text style={styles.panelText}>
              {isDemoMonth
                ? "Sample performance for September 2024."
                : "No demo performance for this month."}
            </Text>
          </View>
        )}

        <Text style={styles.rewardsHeading}>
          Rewards{" "}
          <Text style={styles.highlight}>
            {isDemoMonth ? "24" : "0"}
          </Text>
        </Text>

        {isDemoMonth ? (
          <FeeShareDashboard
            onSnapshot={() =>
              router.push("/wallet/calendar/snapshot")
            }
          />
        ) : (
          <Text style={styles.noRewards}>
            No demo rewards for this month.
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
    width: `${100 / 7}%`,
    textAlign: "center",
    fontFamily: FONTS.regular,
    color: COLORS.white,
    fontSize: 12,
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -2,
    marginBottom: 24,
  },

  daySlot: {
    width: `${100 / 7}%`,
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
