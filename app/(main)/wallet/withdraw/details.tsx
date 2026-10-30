
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ChevronsRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";


const LIME = "#C6E900";
const HANDLE = 48;
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default function WithdrawDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ amount?: string }>();

  const amount = Number(params.amount || "0");

  const [address, setAddress] = useState("");
  const [width, setWidth] = useState(300);
  const [done, setDone] = useState(false);

  const slide = useRef(new Animated.Value(0)).current;

  const max = Math.max(0, width - HANDLE);

  const valid =
    BASE58.test(address.trim()) &&
    amount > 0 &&
    amount <= 1500.14;

  const state = useRef({
    valid,
    max,
    done,
    address,
    amount,
  });

  state.current = {
    valid,
    max,
    done,
    address,
    amount,
  };

  const reset = () => {
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start();
  };

  const finish = () => {
    const current = state.current;

    if (!current.valid || current.done) {
      reset();
      return;
    }

    setDone(true);

    // Haptic feedback when withdrawal swipe succeeds
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    Animated.timing(slide, {
      toValue: current.max,
      duration: 140,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;

      router.replace({
        pathname: "/wallet" as any,
        params: {
          withdrawalAmount: current.amount.toFixed(2),
          withdrawalTo: current.address.trim(),
          withdrawalId: String(Date.now()),
        },
      });
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        state.current.valid && !state.current.done,

      onMoveShouldSetPanResponder: (_, gesture) =>
        state.current.valid &&
        !state.current.done &&
        Math.abs(gesture.dx) > 4,

      onPanResponderMove: (_, gesture) => {
        const current = state.current;

        if (!current.valid || current.done) return;

        slide.setValue(
          Math.max(0, Math.min(current.max, gesture.dx))
        );
      },

      onPanResponderRelease: (_, gesture) => {
        const current = state.current;

        if (!current.valid || current.done) {
          reset();
          return;
        }

        if (
          gesture.dx >= current.max * 0.78 ||
          (gesture.vx > 1.2 &&
            gesture.dx > current.max * 0.45)
        ) {
          finish();
        } else {
          // Light haptic when swipe is incomplete
          void Haptics.impactAsync(
            Haptics.ImpactFeedbackStyle.Light
          );

          reset();
        }
      },

      onPanResponderTerminate: reset,
    })
  ).current;

  // Animated gradient width follows the thumb.
  const fillScale = slide.interpolate({
    inputRange: [0, Math.max(1, max)],
    outputRange: [HANDLE / Math.max(1, width), 1],
    extrapolate: "clamp",
  });

  const short =
    address.length > 22
      ? `${address.slice(0, 11)}...${address.slice(-10)}`
      : address;

  return (
    <View style={s.overlay}>
      <BlurView
        intensity={28}
        tint="dark"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.back()}
        accessibilityLabel="Close withdraw details"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.keyboard}
        pointerEvents="box-none"
      >
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.header}>
            <Pressable
              style={s.back}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ChevronLeft size={22} color="white" />
            </Pressable>

            <Text style={s.heading}>Withdraw</Text>
          </View>

          <TextInput
            value={address}
            onChangeText={(value) => {
              setAddress(value.trim());
              slide.setValue(0);
            }}
            style={s.input}
            placeholder="Paste Solana address"
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={LIME}
          />

          <View style={s.details}>
            <Text style={s.detailsHeading}>Details</Text>

            <View style={s.line}>
              <Text style={s.key}>To</Text>
              <Text style={s.value} numberOfLines={1}>
                {valid ? short : "-"}
              </Text>
            </View>

            <View style={s.line}>
              <Text style={s.key}>Amount</Text>
              <Text style={s.value}>
                ${amount.toFixed(2)} (demo)
              </Text>
            </View>

            <View style={s.line}>
              <Text style={s.key}>Network</Text>
              <Text style={s.value}>Solana</Text>
            </View>

            <View style={s.line}>
              <Text style={s.key}>Fee</Text>
              <Text style={s.value}>$0 (simulated)</Text>
            </View>
          </View>

          <View
            style={[s.slider, !valid && s.sliderDisabled]}
            onLayout={(event: LayoutChangeEvent) => {
              setWidth(event.nativeEvent.layout.width);
            }}
          >
            {/* Animated gradient fill */}
            {valid && (
              <Animated.View
                pointerEvents="none"
                style={[
                  s.gradientFill,
                  {
                    width: "100%",
                    transform: [
                      { translateX: Animated.multiply(Animated.subtract(fillScale, 1), width / 2) },
                      { scaleX: fillScale },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={["#242A03", "#C6E900"]}
                  locations={[0, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            )}

            <Text
              pointerEvents="none"
              style={s.sliderLabel}
            >
              {valid
                ? "Slide to withdraw"
                : "Add an address"}
            </Text>

            {/* Draggable thumb */}
            <Animated.View
              {...pan.panHandlers}
              style={[
                s.thumb,
                valid && s.thumbActive,
                {
                  transform: [{ translateX: slide }],
                },
              ]}
            >
              <ChevronsRight
                color={valid ? "#111111" : "#777777"}
                size={24}
              />
            </Animated.View>
          </View>

          <Text style={s.note}>
            Simulation only • No real transfer will occur.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },

  keyboard: {
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#111407",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 34 : 23,
  },

  handle: {
    width: 55,
    height: 5,
    backgroundColor: "#373A30",
    borderRadius: 5,
    alignSelf: "center",
    marginBottom: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 23,
  },

  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2C3026",
    alignItems: "center",
    justifyContent: "center",
  },

  heading: {
    fontSize: 17,
    color: "white",
    fontWeight: "600",
  },

  input: {
    height: 48,
    backgroundColor: "#20221D",
    borderWidth: 1,
    borderColor: "#41463A",
    borderRadius: 6,
    paddingHorizontal: 13,
    color: "white",
    fontSize: 13,
    marginBottom: 16,
  },

  details: {
    backgroundColor: "#151614",
    borderRadius: 6,
    padding: 13,
    marginBottom: 22,
  },

  detailsHeading: {
    color: "white",
    fontSize: 13,
    marginBottom: 12,
  },

  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 7,
  },

  key: {
    color: "#B8B8B8",
    fontSize: 11,
  },

  value: {
    color: "white",
    fontSize: 11,
    flexShrink: 1,
    textAlign: "right",
  },

  slider: {
    height: 49,
    backgroundColor: "#1C1C1D",
    borderRadius: 5,
    overflow: "hidden",
    justifyContent: "center",
  },

  sliderDisabled: {
    opacity: 0.65,
  },

  gradientFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },

  sliderLabel: {
    color: "#B6B6B6",
    fontSize: 13,
    textAlign: "center",
    zIndex: 1,
  },

  thumb: {
    position: "absolute",
    left: 0,
    top: 0,
    width: HANDLE,
    height: 49,
    borderRadius: 5,
    backgroundColor: "#353535",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  thumbActive: {
    backgroundColor: LIME,
  },

  note: {
    color: "#8B8B8B",
    fontSize: 10,
    textAlign: "center",
    marginTop: 14,
  },
});
