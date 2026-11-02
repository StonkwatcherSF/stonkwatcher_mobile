import { Skeleton, SkeletonGroup } from "./Skeleton";
import React, { memo, useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Glow, RevealChunk } from "./TracerAnalysisPanel";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const CIRCUMFERENCE = 2 * Math.PI * 12;
const END = 2400;

type Props = { score: number | null; label: string; analyzing: boolean; ready: boolean; visible: boolean };

function TracerRiskCard({ score, label, analyzing, ready, visible }: Props) {
  const clock = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const percentage = score !== null && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
  useFocusEffect(useCallback(() => {
    if (!ready || !visible) return;
    clock.set(0);
    clock.set(reduceMotion ? END : withDelay(450, withTiming(END, { duration: END, easing: Easing.linear })));
    return () => cancelAnimation(clock);
  }, [clock, ready, reduceMotion, visible]));
  const entrance = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0, 280], [0, 1], "clamp"),
    transform: [{ translateY: interpolate(clock.value, [0, 360], [10, 0], "clamp") }],
  }));
  const ring = useAnimatedProps(() => {
    const progress = Math.max(0, Math.min(1, (clock.value - 200) / 1400));
    const eased = 1 - Math.pow(1 - progress, 3);
    const amount = eased * (percentage ?? 0) / 100;
    return { strokeDashoffset: CIRCUMFERENCE * (1 - amount), opacity: amount > 0 ? 1 : 0 };
  });
  const value = percentage !== null ? `${Math.round(percentage)} / 100` : analyzing ? "Scoring…" : "— / 100";
  return (
    <Animated.View style={[styles.card, entrance]}>
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        {!reduceMotion && <>{[0, 1, 2].map((variant) => <Glow key={variant} clock={clock} end={END} variant={variant} />)}</>}
      </View>
      <View accessibilityRole="progressbar" accessibilityLabel={percentage === null ? "Risk score unavailable" : "Risk score"} accessibilityValue={percentage === null ? undefined : { min: 0, max: 100, now: percentage }}>
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <Circle cx={16} cy={16} r={12} fill="none" stroke="#454D11" strokeWidth={5} />
          <AnimatedCircle cx={16} cy={16} r={12} fill="none" stroke="#C6E900" strokeWidth={5} strokeLinecap="round" strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]} rotation={-90} origin="16, 16" animatedProps={ring} />
        </Svg>
      </View>
      <View style={styles.text}>
        <Text style={styles.label}><RevealChunk text="Risk " clock={clock} start={100} /><RevealChunk text="Score" clock={clock} start={180} /></Text>
        {percentage === null && analyzing ? <SkeletonGroup label="Calculating risk score" style={{ marginTop: 4 }}><Skeleton width={80} height={14} /></SkeletonGroup> : <Text style={styles.value}><RevealChunk text={value} clock={clock} start={350} /></Text>}
      </View>
      <Text style={styles.badge} accessibilityLabel={label}>
        {label.split(" ").map((word, index, words) => <RevealChunk key={index} text={word + (index < words.length - 1 ? " " : "")} clock={clock} start={550 + index * 80} />)}
      </Text>
    </Animated.View>
  );
}

export default memo(TracerRiskCard);
const styles = StyleSheet.create({
  card: { minHeight: 58, borderRadius: 10, borderWidth: 1, borderColor: "#697E13", backgroundColor: "#202609", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, gap: 9, overflow: "hidden" },
  text: { flex: 1 },
  label: { color: "#B4B4B4", fontSize: 9 },
  value: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginTop: 2 },
  badge: { color: "#FFFFFF", fontWeight: "600", fontSize: 16, backgroundColor: "rgba(21,26,7,0.8)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 4, overflow: "hidden", flexShrink: 1 },
});
