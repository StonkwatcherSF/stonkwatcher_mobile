import React, { memo, useEffect } from "react";
import { AppState, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

export const SKELETON_COLOR = "#242A03";

export const Skeleton = memo(function Skeleton({ width = "100%", height = 14, radius = 5, style }: { width?: DimensionValue; height?: DimensionValue; radius?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: SKELETON_COLOR }, style]} />;
});

export function SkeletonGroup({ children, style, label = "Loading content" }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; label?: string }) {
  const opacity = useSharedValue(1);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const update = (state: string) => {
      cancelAnimation(opacity);
      opacity.set(1);
      if (state === "active" && !reduceMotion) opacity.set(withRepeat(withTiming(0.5, { duration: 850 }), -1, true));
    };
    update(AppState.currentState ?? "active");
    const subscription = AppState.addEventListener("change", update);
    return () => { subscription.remove(); cancelAnimation(opacity); };
  }, [opacity, reduceMotion]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} pointerEvents="none" style={[style, pulse]}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{children}</View>
  </Animated.View>;
}

export function SkeletonRows({ count = 4, avatar = true }: { count?: number; avatar?: boolean }) {
  return <SkeletonGroup style={styles.rows}>{Array.from({ length: count }, (_, index) => (
    <View key={index} style={styles.row}>
      {avatar && <Skeleton width={44} height={44} radius={22} />}
      <View style={styles.text}><Skeleton width={index % 2 ? "58%" : "74%"} /><Skeleton width="42%" height={10} /></View>
      <View style={styles.end}><Skeleton width={65} height={13} /><Skeleton width={45} height={10} /></View>
    </View>
  ))}</SkeletonGroup>;
}

export function SkeletonChart({ height = 240 }: { height?: number }) {
  const bars = [38, 53, 43, 66, 58, 73, 48, 62, 82, 69, 88, 74];
  return <SkeletonGroup label="Loading chart" style={{ width: "100%" }}>
    <View style={[styles.chart, { height }]}>{bars.map((bar, index) => <Skeleton key={index} width="5%" height={`${bar}%`} radius={3} />)}</View>
    <View style={styles.axis}><Skeleton width="19%" height={9} /><Skeleton width="19%" height={9} /><Skeleton width="19%" height={9} /></View>
  </SkeletonGroup>;
}

export function SkeletonMap({ width, height }: { width: number; height: number }) {
  return <SkeletonGroup label="Loading holder map" style={{ width, height }}><View style={{ width, height }}>
    {[{ x: 36, y: 32, s: 72 }, { x: 12, y: 18, s: 40 }, { x: 67, y: 20, s: 53 }, { x: 16, y: 62, s: 50 }, { x: 65, y: 65, s: 62 }, { x: 44, y: 77, s: 30 }].map((bubble, index) => <Skeleton key={index} width={bubble.s} height={bubble.s} radius={bubble.s / 2} style={{ position: "absolute", left: `${bubble.x}%`, top: `${bubble.y}%`, transform: [{ translateX: -bubble.s / 2 }, { translateY: -bubble.s / 2 }] }} />)}
  </View></SkeletonGroup>;
}

export function SkeletonPage() {
  return <View style={styles.page}>
    <SkeletonGroup><View style={styles.row}><Skeleton width={44} height={44} radius={22} /><View style={styles.text}><Skeleton width="62%" height={20} /><Skeleton width="36%" height={11} /></View></View><Skeleton height={40} style={{ marginTop: 20, marginBottom: 16 }} /></SkeletonGroup>
    <SkeletonRows count={5} />
    <SkeletonChart height={150} />
  </View>;
}

const styles = StyleSheet.create({
  rows: { paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 68, paddingVertical: 10 },
  text: { flex: 1, gap: 9 },
  end: { gap: 9, alignItems: "flex-end" },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 16 },
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 12 },
  page: { width: "100%", paddingHorizontal: 20, paddingVertical: 18 },
});
