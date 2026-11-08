import { LocalizedText as Text } from "../../../components/LocalizationContext";

import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Settings } from "lucide-react-native";

import BlacklistSheet from "../../../components/BlacklistSheet";
import { useNavScroll } from "../../../components/NavAnimationContext";
import { Skeleton, SkeletonGroup } from "../../../components/Skeleton";
import BlacklistIcon from "../../../assets/icons/carbon_disable-step.svg";
import { useCreatorAlerts } from "../../../hooks/useCreatorAlerts";
import { formatAge } from "../../../lib/format";
import { dexHref, tracerHref } from "../../../lib/nav";
import { parseCreatorAlert, type CreatorAlert, type CreatorAlertPhrase } from "../../../lib/creator-alerts";

const LIME = "#C6E900";

function alertWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    ago: formatAge(iso),
  };
}

function TickerText({ text }: { text: string }) {
  const parts = text.split(/(\$[A-Za-z][A-Za-z0-9]*)/g);
  return parts.map((part, index) =>
    part.startsWith("$") ? (
      <Text key={`${part}-${index}`} style={styles.highlight} localize={false}>
        {part}
      </Text>
    ) : (
      <Text key={`${part}-${index}`} localize={false}>
        {part}
      </Text>
    ),
  );
}

function AlertCopy({ phrase }: { phrase: CreatorAlertPhrase }) {
  if (phrase.kind === "launch") {
    return (
      <Text style={styles.alertText}>
        Creator of <TickerText text={phrase.previous} /> just launched <TickerText text={phrase.next} />
      </Text>
    );
  }
  if (phrase.kind === "rapid") {
    return (
      <Text style={styles.alertText}>
        Creator of <TickerText text={phrase.previous} /> launched another token{" "}
        <Text localize={false}>{`${phrase.amount}${phrase.unit}`}</Text> after launch
      </Text>
    );
  }
  if (phrase.kind === "sold-all") {
    return (
      <Text style={styles.alertText}>
        Creator of <TickerText text={phrase.subject} /> just sold 100% of their supply
      </Text>
    );
  }
  if (phrase.kind === "sold-some") {
    return (
      <Text style={styles.alertText}>
        Creator of <TickerText text={phrase.subject} /> just sold <Text localize={false}>{phrase.pct}%</Text> of their holdings
      </Text>
    );
  }
  if (phrase.kind === "moved") {
    return (
      <Text style={styles.alertText}>
        Creator of <TickerText text={phrase.subject} /> moved <Text localize={false}>{phrase.usd}</Text> worth of tokens
      </Text>
    );
  }
  return (
    <Text style={styles.alertText} localize={false}>
      <TickerText text={phrase.text} />
    </Text>
  );
}

function openAlert(router: ReturnType<typeof useRouter>, alert: CreatorAlert) {
  if (alert.mint) router.push(dexHref(alert.mint));
  else if (alert.wallet) router.push(tracerHref(alert.wallet));
}

export default function BlacklistHome() {
  const router = useRouter();
  const navScroll = useNavScroll();
  const [open, setOpen] = useState(false);
  const { data, loading, error } = useCreatorAlerts();
  const alerts = data ?? [];

  const openSettings = () => {
    router.push("/settings" as any);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={navScroll.onScroll}
        onScrollBeginDrag={navScroll.onScrollBeginDrag}
        onScrollEndDrag={navScroll.onScrollEndDrag}
        onMomentumScrollEnd={navScroll.onMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {/* HEADER ACTIONS */}
        <View style={styles.topActions}>
          <Pressable
            style={styles.round}
            onPress={() =>
              router.push("/blacklist/list" as any)
            }
            accessibilityRole="button"
            accessibilityLabel="View blacklisted addresses"
          >
            <BlacklistIcon width={20} height={20} />
          </Pressable>

          {/* SETTINGS BUTTON */}
          <Pressable
            style={styles.round}
            onPress={openSettings}
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
            hitSlop={10}
          >
            <Settings color="#CCC" size={18} />
          </Pressable>
        </View>

        <Text style={styles.title}>
          Blacklist
        </Text>

        <Text style={styles.description}>
          A private list of wallets and tokens you will not
          touch. Blocked tokens, and later launches from the
          same dev wallet, stay out of your feed and search.
          Saved on this device.
        </Text>

        <Pressable
          style={styles.add}
          onPress={() => setOpen(true)}
        >
          <Text style={styles.addText}>
            Add to Blacklist
          </Text>
        </Pressable>

        <Text style={styles.section}>
          Token Creator Alerts
        </Text>

        {loading && !data ? (
          <SkeletonGroup label="Loading creator alerts">
            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.alert}>
                <Skeleton width={11} height={11} radius={6} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Skeleton width={row === 1 ? "78%" : "92%"} height={12} />
                  <Skeleton width="46%" height={10} />
                </View>
              </View>
            ))}
          </SkeletonGroup>
        ) : null}

        {alerts.map((alert) => {
          const when = alertWhen(alert.at);
          const bad = alert.tone === "red";
          return (
            <Pressable
              key={alert.id}
              style={[styles.alert, bad && styles.alertBad]}
              onPress={() => openAlert(router, alert)}
              accessibilityRole="button"
              accessibilityLabel={alert.text}
              disabled={!alert.mint && !alert.wallet}
            >
              <View style={[styles.dot, bad && styles.dotBad]} />
              <View style={{ flex: 1 }}>
                <AlertCopy phrase={parseCreatorAlert(alert.text)} />
                {when ? (
                  <Text style={styles.time} localize={false}>
                    {when.day}{" "}
                    <Text style={{ color: LIME }} localize={false}>
                      •
                    </Text>{" "}
                    {when.ago}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}

        {!loading && alerts.length === 0 ? (
          <Text style={styles.note}>{error ? "Could not load creator alerts." : "No live creator alerts in this window."}</Text>
        ) : null}

        {alerts.length > 0 ? (
          <Text style={styles.note}>Live creator alerts from recent StonkFun launches.</Text>
        ) : null}
      </ScrollView>

      {/* BLACKLIST SHEET */}
      <BlacklistSheet
        visible={open}
        onClose={() => setOpen(false)}
        onOpenList={() => {
          router.push("/blacklist/list");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 140,
  },

  topActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },

  round: {
    width: 38,
    height: 38,
    borderRadius: 21,
    backgroundColor: "#292929",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 26,
    color: "white",
    textAlign: "center",
    fontWeight: "700",
    marginTop: 28,
  },

  description: {
    color: "#C0C0C0",
    textAlign: "center",
    lineHeight: 19,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 25,
  },

  add: {
    backgroundColor: LIME,
    borderRadius: 5,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  addText: {
    fontSize: 15,
    color: "#101010",
    fontWeight: "700",
  },

  section: {
    color: "white",
    fontSize: 17,
    marginTop: 29,
    marginBottom: 14,
  },

  alert: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 13,
    borderRadius: 6,
    backgroundColor: "#141905",
    minHeight: 68,
    marginBottom: 5,
  },

  alertBad: {
    backgroundColor: "#230A07",
  },

  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: LIME,
  },

  dotBad: {
    backgroundColor: "#FF5546",
  },

  alertText: {
    color: "white",
    fontSize: 12,
    lineHeight: 17,
  },

  highlight: {
    color: LIME,
  },

  time: {
    color: "#BABABA",
    fontSize: 11,
    marginTop: 4,
  },

  note: {
    color: "#8C8C8C",
    fontSize: 10,
    textAlign: "center",
    marginTop: 16,
  },
});
