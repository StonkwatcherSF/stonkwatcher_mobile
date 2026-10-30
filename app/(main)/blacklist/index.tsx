
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Settings } from "lucide-react-native";

import BlacklistSheet from "../../../components/BlacklistSheet";
import { useNavScroll } from "../../../components/NavAnimationContext";
import BlacklistIcon from "../../../assets/icons/carbon_disable-step.svg";

const LIME = "#C6E900";

const ALERTS = [
  {
    bad: false,
    creator: "$GIGAWATT",
    message: "launched another token 4 minutes after launch",
    time: "48 seconds ago",
  },
  {
    bad: false,
    creator: "$MUSE",
    message: "just launched $COMPUTE",
    time: "15 minutes ago",
  },
  {
    bad: true,
    creator: "$DAFTPUNK",
    message: "just sold 100% of their supply",
    time: "1 hour ago",
  },
  {
    bad: false,
    creator: "$MUSE",
    message: "just launched $COMPUTE",
    time: "15 minutes ago",
  },
  {
    bad: true,
    creator: "$DAFTPUNK",
    message: "just sold 100% of their supply",
    time: "1 hour ago",
  },
  {
    bad: false,
    creator: "$MUSE",
    message: "just launched $COMPUTE",
    time: "15 minutes ago",
  },
  {
    bad: false,
    creator: "$MUSE",
    message: "just launched $COMPUTE",
    time: "15 minutes ago",
  },
  {
    bad: true,
    creator: "$DAFTPUNK",
    message: "just sold 100% of their supply",
    time: "1 hour ago",
  },
  {
    bad: true,
    creator: "$DAFTPUNK",
    message: "just sold 100% of their supply",
    time: "1 hour ago",
  },
  {
    bad: false,
    creator: "$MUSE",
    message: "just launched $COMPUTE",
    time: "15 minutes ago",
  },
];

export default function BlacklistHome() {
  const router = useRouter();
  const navScroll = useNavScroll();
  const [open, setOpen] = useState(false);

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
          touch. It stays in this app session for the demo.
          It is a reminder, not a public registry and not a
          DEX lock.
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

        {ALERTS.map((alert, i) => (
          <View
            key={i}
            style={[
              styles.alert,
              alert.bad && styles.alertBad,
            ]}
          >
            <View
              style={[
                styles.dot,
                alert.bad && styles.dotBad,
              ]}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.alertText}>
                Creator of{" "}
                <Text style={styles.highlight}>
                  {alert.creator}
                </Text>{" "}
                {alert.message.includes("$COMPUTE") ? (
                  <>
                    just launched{" "}
                    <Text style={styles.highlight}>
                      $COMPUTE
                    </Text>
                  </>
                ) : (
                  alert.message
                )}
              </Text>

              <Text style={styles.time}>
                Oct 21, 2026{" "}
                <Text style={{ color: LIME }}>
                  •
                </Text>{" "}
                {alert.time}
              </Text>
            </View>
          </View>
        ))}

        <Text style={styles.note}>
          Illustrative creator alerts • Not live blockchain
          monitoring.
        </Text>
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
    backgroundColor: "#10110B",
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
