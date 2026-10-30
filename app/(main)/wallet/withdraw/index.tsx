
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { ArrowLeft, Delete } from "lucide-react-native";
import * as Haptics from "expo-haptics";

const LIME = "#C6E900";
const CASH = 1500.14;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const KEYS = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  ".", "0", "del",
];

export default function WithdrawAmount() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const value = Number(amount) || 0;
  const valid = value > 0 && value <= CASH;

  const translateY = useRef(
    new Animated.Value(SCREEN_HEIGHT)
  ).current;

  const closing = useRef(false);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 25,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const close = () => {
    if (closing.current) return;

    closing.current = true;

    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) router.back();
    });
  };

  const closeRef = useRef(close);
  closeRef.current = close;

  const dragStart = useRef(0);

  const handlePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 7 &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx),

      onPanResponderGrant: () => {
        translateY.stopAnimation((current: number) => {
          dragStart.current = current;
        });
      },

      onPanResponderMove: (_, gesture) => {
        translateY.setValue(
          Math.max(0, dragStart.current + gesture.dy)
        );
      },

      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 95 || gesture.vy > 1) {
          closeRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 22,
            stiffness: 230,
            useNativeDriver: true,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 230,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const add = (digit: string) => {
    void Haptics.selectionAsync();

    setAmount((old) => {
      if (digit === "." && old.includes(".")) return old;

      const next =
        digit === "."
          ? (old || "0") + "."
          : old + digit;

      if (next.split(".")[1]?.length > 2) return old;

      return next.replace(/^0+(?=\d)/, "");
    });
  };

  const selectPercent = (percent: number) => {
    void Haptics.selectionAsync();
    setAmount(((CASH * percent) / 100).toFixed(2));
  };

  const pressKey = (key: string) => {
    if (key === "del") {
      void Haptics.selectionAsync();
      setAmount((old) => old.slice(0, -1));
    } else {
      add(key);
    }
  };

  const continueWithdraw = () => {
    if (!valid) return;

    void Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Medium
    );

    router.push({
      pathname: "/wallet/withdraw/details" as any,
      params: {
        amount: value.toFixed(2),
      },
    });
  };

  return (
    <View style={s.overlay}>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "none",
          contentStyle: {
            backgroundColor: "transparent",
          },
        }}
      />

      <BlurView
        intensity={30}
        tint="dark"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={close}
        accessibilityLabel="Close Withdraw"
      />

      <Animated.View
        style={[
          s.sheet,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View
          style={s.handleTouch}
          {...handlePan.panHandlers}
        >
          <View style={s.handle} />
        </View>

        <View style={s.header}>
          <Pressable
            onPress={close}
            style={s.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={20} color="white" />
          </Pressable>

          <Text style={s.heading}>Withdraw</Text>
        </View>

        <View style={s.amountSection}>
          <Text style={s.amount}>
            ${amount || "0"}
          </Text>
        </View>

        <View style={s.balanceRow}>
          <Text style={s.balanceLabel}>Available</Text>
          <Text style={s.balanceValue}>
            ${CASH.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>

        <View style={s.percentRow}>
          {[10, 25, 50, 100].map((percent) => (
            <Pressable
              key={percent}
              style={s.percent}
              onPress={() => selectPercent(percent)}
              accessibilityRole="button"
            >
              <Text style={s.percentText}>
                {percent === 100
                  ? "Max"
                  : `${percent}%`}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={s.keypad}>
          {KEYS.map((key) => (
            <Pressable
              key={key}
              style={s.key}
              onPress={() => pressKey(key)}
              accessibilityRole="button"
              accessibilityLabel={
                key === "del" ? "Delete" : key
              }
            >
              {key === "del" ? (
                <Delete size={23} color="white" />
              ) : (
                <Text style={s.keyText}>
                  {key}
                </Text>
              )}
            </Pressable>
          ))}
        </View>

        <Pressable
          disabled={!valid}
          style={[
            s.continue,
            !valid && s.disabled,
          ]}
          onPress={continueWithdraw}
          accessibilityRole="button"
        >
          <Text style={s.continueText}>
            Continue
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.68)",
  },

  sheet: {
    backgroundColor: "#111407",
    borderTopLeftRadius: 29,
    borderTopRightRadius: 29,
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom:
      Platform.OS === "ios" ? 32 : 22,
    height: "74%",
    overflow: "hidden",
  },

  handleTouch: {
    height: 28,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 5,
  },

  handle: {
    width: 55,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#393939",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 12,
  },

  back: {
    height: 34,
    width: 34,
    borderRadius: 18,
    backgroundColor: "#292C29",
    alignItems: "center",
    justifyContent: "center",
  },

  heading: {
    fontSize: 15,
    color: "white",
    fontWeight: "500",
  },

  amountSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
  },

  amount: {
    fontSize: 43,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 17,
    paddingHorizontal: 2,
  },

  balanceLabel: {
    color: "#AAAAAA",
    fontSize: 11,
  },

  balanceValue: {
    color: "#FFFFFF",
    fontSize: 11,
  },

  percentRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 14,
  },

  percent: {
    flex: 1,
    height: 29,
    backgroundColor: "#272D05",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  percentText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
  },

  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },

  key: {
    width: "33.333%",
    height: 47,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10110F",
  },

  keyText: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "500",
  },

  continue: {
    height: 41,
    backgroundColor: LIME,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  disabled: {
    opacity: 0.45,
  },

  continueText: {
    color: "#101010",
    fontSize: 14,
    fontWeight: "700",
  },
});
