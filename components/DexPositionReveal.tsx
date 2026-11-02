import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from "react-native-reanimated";
import { Glow, RevealChunk } from "./TracerAnalysisPanel";

const END = 2400;
const DELAY = 0;

export function PositionRevealText({ text, clock, start, style }: { text: string; clock: SharedValue<number>; start: number; style?: StyleProp<TextStyle> }) {
  const chunks = useMemo(() => {
    const words = text.match(/\S+\s*/g) ?? [text];
    const group = Math.max(1, Math.ceil(words.length / 32));
    return Array.from({ length: Math.ceil(words.length / group) }, (_, index) => words.slice(index * group, (index + 1) * group).join(""));
  }, [text]);
  return <Text style={style} accessibilityLabel={text}>
    {chunks.map((chunk, index) => <RevealChunk key={index} text={chunk} clock={clock} start={start + index * 38} />)}
  </Text>;
}

export default function DexPositionReveal({ active, replayKey, style, children }: { active: boolean; replayKey: string; style?: StyleProp<ViewStyle>; children: (clock: SharedValue<number>, complete: boolean) => React.ReactNode }) {
  const clock = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const [completedKey, setCompletedKey] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    clock.set(0);
    if (!active) return;
    clock.set(reduceMotion ? END : withDelay(DELAY, withTiming(END, { duration: END, easing: Easing.linear })));
    // A single completion update enables sharing after all revealed text is visible.
    const timer = setTimeout(() => setCompletedKey(replayKey), reduceMotion ? 0 : DELAY + END);
    return () => { clearTimeout(timer); cancelAnimation(clock); };
  }, [active, clock, reduceMotion, replayKey]));
  const entrance = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0, 280], [0, 1], "clamp"),
    transform: [
      { translateY: interpolate(clock.value, [0, 360], [6, 0], "clamp") },
      { scale: interpolate(clock.value, [0, 360], [0.97, 1], "clamp") },
    ],
  }));
  return <Animated.View pointerEvents={active ? "auto" : "none"} style={[styles.panel, style, entrance]}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      {!reduceMotion && [0, 1, 2].map((variant) => <Glow key={variant} clock={clock} end={END} variant={variant} />)}
    </View>
    {children(clock, active && completedKey === replayKey)}
  </Animated.View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#171D05", borderColor: "#849B00", borderWidth: 1, overflow: "hidden" },
});
