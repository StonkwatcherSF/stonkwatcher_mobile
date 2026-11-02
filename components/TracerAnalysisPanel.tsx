import React, { memo, useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import StonkIcon from "../assets/icons/stonkwatcher-icon.svg";

export type AnalysisRow = { score: string; message: string };
const DISCLAIMER = "This is a transparent behavioral index, not a determination that anyone is a rug-puller.";
const WORD_STEP = 38;
const REVEAL_TIME = 220;

function chunksFor(text: string) {
  const words = text.match(/\S+\s*/g) ?? [text];
  // Bound the number of animated spans for unusually long server messages.
  const group = Math.max(1, Math.ceil(words.length / 40));
  return Array.from({ length: Math.ceil(words.length / group) }, (_, i) => words.slice(i * group, (i + 1) * group).join(""));
}

export const RevealChunk = memo(function RevealChunk({ text, clock, start }: { text: string; clock: SharedValue<number>; start: number }) {
  const animation = useAnimatedStyle(() => {
    const progress = Math.max(0, Math.min(1, (clock.value - start) / REVEAL_TIME));
    return {
      opacity: Math.min(1, progress * 3),
      textShadowRadius: progress > 0 && progress < 1 ? 10 * Math.sin(progress * Math.PI) : 0,
    };
  });
  return <Animated.Text style={[styles.word, animation]}>{text}</Animated.Text>;
});

function RevealText({ text, clock, start }: { text: string; clock: SharedValue<number>; start: number }) {
  const chunks = useMemo(() => chunksFor(text), [text]);
  return (
    <Text style={styles.message} accessible accessibilityLabel={text}>
      {chunks.map((chunk, i) => <RevealChunk key={i} text={chunk} clock={clock} start={start + i * WORD_STEP} />)}
    </Text>
  );
}

export const Glow = memo(function Glow({ clock, end, variant }: { clock: SharedValue<number>; end: number; variant: number }) {
  const animation = useAnimatedStyle(() => {
    const time = clock.value / 1000;
    const angle = time * 0.9 + variant * 2.1;
    return {
      opacity: interpolate(clock.value, [0, 300, end - 600, end], [0, 0.85, 0.65, 0], "clamp"),
      transform: [
        { translateX: Math.sin(angle) * 95 },
        { translateY: Math.cos(angle * 0.8) * 45 },
        { scaleX: 1.2 + Math.sin(angle * 0.6) * 0.25 },
      ],
    };
  });
  const color = ["#C6E900", "#46DE67", "#8DCB16"][variant];
  return (
    <Animated.View style={[styles.glow, variant === 1 ? styles.glowRight : styles.glowLeft, animation]}>
      <Svg width="100%" height="100%" viewBox="0 0 320 240">
        <Defs><RadialGradient id="aura" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.6} />
          <Stop offset="0.45" stopColor={color} stopOpacity={0.23} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient></Defs>
        <Rect width="320" height="240" fill="url(#aura)" />
      </Svg>
    </Animated.View>
  );
});

function TracerAnalysisPanel({ rows, ready, visible }: { rows: AnalysisRow[]; ready: boolean; visible: boolean }) {
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(0);
  const end = Math.max(1600, ...rows.map((row, index) => 650 + index * 180 + chunksFor(row.message).length * WORD_STEP + REVEAL_TIME)) + 700;
  const entrance = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0, 280], [0, 1], "clamp"),
    transform: [{ translateY: interpolate(clock.value, [0, 360], [10, 0], "clamp") }],
  }));

  useFocusEffect(useCallback(() => {
    if (!ready || !visible) return;
    // Let the screen paint before starting the bounded, UI-thread animation.
    clock.set(0);
    clock.set(reduceMotion ? end : withDelay(450, withTiming(end, { duration: end, easing: Easing.linear })));
    return () => { cancelAnimation(clock); };
  }, [clock, end, ready, reduceMotion, visible]));

  return (
    <Animated.View style={[styles.panel, entrance]}>
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        {!reduceMotion && <>{[0, 1, 2].map((variant) => <Glow key={variant} variant={variant} clock={clock} end={end} />)}</>}
      </View>
      <View style={styles.heading}><StonkIcon width={18} height={18} /><Text style={styles.title}>Analysis</Text></View>
      <View style={styles.body}>
        {ready ? <RevealText text={DISCLAIMER} clock={clock} start={0} /> : <Text style={styles.message}>{DISCLAIMER}</Text>}
        {rows.map((row, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.score}><RevealChunk text={row.score} clock={clock} start={650 + index * 180} /></Text>
            {ready ? <RevealText text={row.message} clock={clock} start={650 + index * 180} /> : <Text style={styles.message}>{row.message}</Text>}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default memo(TracerAnalysisPanel, (previous, next) => previous.ready === next.ready && previous.visible === next.visible && previous.rows.length === next.rows.length && previous.rows.every((row, i) => row.score === next.rows[i].score && row.message === next.rows[i].message));

const styles = StyleSheet.create({
  panel: { borderRadius: 12, borderWidth: 1, borderColor: "#849B00", padding: 8, backgroundColor: "#171D05", overflow: "hidden" },
  heading: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  title: { color: "#C6E900", fontSize: 16, fontWeight: "600" },
  body: { backgroundColor: "rgba(10, 15, 7, 0.78)", borderRadius: 7, padding: 10, gap: 12 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  score: { color: "#C6E900", fontWeight: "700", fontSize: 12, width: 27, paddingTop: 1 },
  message: { color: "#E4E4E4", fontSize: 11, lineHeight: 17, flexShrink: 1 },
  word: { textShadowColor: "#A8FF5B", textShadowOffset: { width: 0, height: 0 } },
  glow: { position: "absolute", width: 320, height: 240, top: -30 },
  glowLeft: { left: -90 },
  glowRight: { right: -90, top: 40 },
});
