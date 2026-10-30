
import React, { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import BlacklistIcon from "../assets/icons/carbon_disable-step.svg";
import {
  useBlacklist,
  type BlacklistEntry,
} from "./BlacklistContext";

const LIME = "#C6E900";
const ACTION_WIDTH = 92;

const PLACEHOLDER = require("../assets/images/placeholder.png");

type Props = {
  onBack: () => void;
  onDragDown?: () => void;
};

function SwipeableEntry({
  entry,
  onUnblock,
}: {
  entry: BlacklistEntry;
  onUnblock: (entry: BlacklistEntry) => void;
}) {
  const translateX = useRef(
    new Animated.Value(0)
  ).current;

  const offset = useRef(0);

  const unblockRef = useRef(onUnblock);
  unblockRef.current = onUnblock;

  const settle = (value: number) => {
    offset.current = value;

    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      speed: 22,
      bounciness: 0,
    }).start();
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 3 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.1,

      // Capture horizontal gestures before
      // the enclosing ScrollView can scroll.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > 4 &&
        Math.abs(g.dx) > Math.abs(g.dy) * 1.1,

      onPanResponderGrant: () =>
        translateX.stopAnimation(),

      onPanResponderMove: (_, g) => {
        translateX.setValue(
          Math.max(
            -ACTION_WIDTH,
            Math.min(
              0,
              offset.current + g.dx
            )
          )
        );
      },

      onPanResponderRelease: (_, g) => {
        const next = offset.current + g.dx;

        if (
          g.vx < -0.5 ||
          (g.vx <= 0 &&
            next < -ACTION_WIDTH * 0.45)
        ) {
          settle(-ACTION_WIDTH);
        } else if (
          g.vx > 0.5 ||
          next > -ACTION_WIDTH * 0.55
        ) {
          settle(0);
        } else {
          settle(-ACTION_WIDTH);
        }
      },

      onPanResponderTerminate: () =>
        settle(offset.current),
    })
  ).current;

  useEffect(
    () => () => translateX.stopAnimation(),
    [translateX]
  );

  return (
    <View style={styles.swipeContainer}>
      {/* UNBLOCK ACTION */}
      <View style={styles.actionArea}>
        <Pressable
          style={styles.unblock}
          onPress={() =>
            unblockRef.current(entry)
          }
          accessibilityRole="button"
          accessibilityLabel={`Unblock ${entry.kind.toLowerCase()} ${entry.address}`}
        >
          <Text style={styles.unblockText}>
            Unblock
          </Text>
        </Pressable>
      </View>

      {/* BLACKLISTED ENTRY */}
      <Animated.View
        {...pan.panHandlers}
        style={[
          styles.row,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        {/* UPDATED PROFILE PICTURE */}
        <View style={styles.coin}>
          <Image
            source={PLACEHOLDER}
            style={styles.coinImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.entryText}>
          <Text
            style={styles.kind}
            numberOfLines={1}
          >
            {entry.kind === "Token"
              ? "Blacklisted Token"
              : "Blacklisted Wallet"}
          </Text>

          <Text
            style={styles.address}
            numberOfLines={1}
          >
            {entry.address}
          </Text>

          <Text
            style={styles.reasons}
            numberOfLines={1}
          >
            {entry.reasons.join(" · ")}
          </Text>
        </View>

        <View style={styles.blockedPill}>
          <Text style={styles.blockedText}>
            Blocked
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function BlacklistListPanel({
  onBack,
  onDragDown,
}: Props) {
  const { entries, removeEntry } =
    useBlacklist();

  const backRef = useRef(onBack);
  backRef.current = onBack;

  const dragRef = useRef(
    onDragDown ?? onBack
  );
  dragRef.current =
    onDragDown ?? onBack;

  const dragY = useRef(
    new Animated.Value(700)
  ).current;

  useEffect(() => {
    Animated.spring(dragY, {
      toValue: 0,
      speed: 20,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }, [dragY]);

  const dismiss = () => {
    Animated.timing(dragY, {
      toValue: 700,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        dragRef.current();
      }
    });
  };

  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        true,

      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 3 &&
        Math.abs(g.dy) > Math.abs(g.dx),

      onPanResponderMove: (_, g) =>
        dragY.setValue(
          Math.max(0, g.dy)
        ),

      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 1) {
          dismissRef.current();
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 22,
            bounciness: 0,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const confirmUnblock = (
    entry: BlacklistEntry
  ) => {
    Alert.alert(
      "Unblock address?",
      "Remove this address from your demo blacklist?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unblock",
          onPress: () =>
            removeEntry(entry.id),
        },
      ]
    );
  };

  return (
    <Animated.View
      style={[
        styles.sheet,
        {
          transform: [
            { translateY: dragY },
          ],
        },
      ]}
    >
      {/* DRAG HANDLE */}
      <View
        style={styles.handleTouch}
        {...handlePan.panHandlers}
      >
        <View style={styles.handle} />
      </View>

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            backRef.current()
          }
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back to blacklist search"
        >
          <ArrowLeft
            size={20}
            color="#EEEEEE"
          />
        </Pressable>

        <Text style={styles.title}>
          Blacklist
        </Text>
      </View>

      {/* BLACKLIST ENTRIES */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        directionalLockEnabled
        scrollEnabled={
          entries.length > 5
        }
        keyboardShouldPersistTaps="always"
      >
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <BlacklistIcon
              width={34}
              height={34}
            />

            <Text
              style={styles.emptyTitle}
            >
              No blacklisted addresses yet
            </Text>

            <Text style={styles.emptySub}>
              Add a wallet or token from
              the Blacklist form to see
              it here.
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <SwipeableEntry
              key={entry.id}
              entry={entry}
              onUnblock={
                confirmUnblock
              }
            />
          ))
        )}
      </ScrollView>

      {entries.length > 0 && (
        <Text style={styles.hint}>
          Swipe an entry left to unblock
          {" · "}
          {entries.length} saved
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: "#111407",
    borderTopLeftRadius: 29,
    borderTopRightRadius: 29,
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom:
      Platform.OS === "ios"
        ? 35
        : 22,
    maxHeight: "76%",
    minHeight: 235,
    overflow: "hidden",
  },

  handleTouch: {
    height: 48,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 8,
  },

  handle: {
    width: 55,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#393939",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 19,
  },

  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#30322A",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "500",
  },

  scroll: {
    flexGrow: 0,
  },

  content: {
    paddingBottom: 8,
  },

  swipeContainer: {
    height: 68,
    marginBottom: 7,
    overflow: "hidden",
    borderRadius: 5,
  },

  actionArea: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    backgroundColor: LIME,
  },

  unblock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  unblockText: {
    color: "#111600",
    fontWeight: "700",
    fontSize: 13,
  },

  row: {
    height: 68,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    backgroundColor: "#210B09",
    borderColor: "#E74630",
    borderWidth: 1,
    borderRadius: 5,
  },

  // AVATAR CONTAINER
  coin: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#153A56",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  // PLACEHOLDER IMAGE
  coinImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },

  entryText: {
    flex: 1,
    minWidth: 0,
  },

  kind: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  address: {
    color: "#DADADA",
    fontSize: 10,
    marginTop: 3,
  },

  reasons: {
    color: "#A9A9A9",
    fontSize: 10,
    marginTop: 4,
  },

  blockedPill: {
    borderRadius: 4,
    backgroundColor: "#273100",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  blockedText: {
    color: LIME,
    fontSize: 9,
    fontWeight: "600",
  },

  empty: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 12,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
  },

  emptySub: {
    color: "#AAAAAA",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    fontSize: 12,
  },

  hint: {
    color: "#8F8F8F",
    textAlign: "center",
    fontSize: 10,
    marginTop: 9,
  },
});
