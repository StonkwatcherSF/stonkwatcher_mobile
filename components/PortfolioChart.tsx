import React, { memo, useCallback, useId, useMemo } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, { cancelAnimation, Easing, useAnimatedProps, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { equityPath, type EquityPoint } from "../lib/portfolio-equity";
import { Skeleton, SkeletonGroup } from "./Skeleton";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const GREEN = "#00D492";

function PortfolioChart({ points, ready }: { points: EquityPoint[]; ready: boolean }) {
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const geometry = useMemo(() => equityPath(points), [points]);
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useFocusEffect(useCallback(() => {
    const update = (status: string) => {
      cancelAnimation(progress);
      progress.set(0);
      if (status === "active" && ready && !reduceMotion) {
        progress.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
      }
    };
    update(AppState.currentState ?? "active");
    const subscription = AppState.addEventListener("change", update);
    return () => { subscription.remove(); cancelAnimation(progress); };
  }, [progress, ready, reduceMotion]));
  const pulse = useAnimatedProps(() => ({
    r: reduceMotion ? 10 : 7 + progress.value * 7,
    opacity: reduceMotion ? 0.2 : 0.28 * (1 - progress.value),
  }));
  if (!ready || !geometry) return <SkeletonGroup label="Loading portfolio history"><Skeleton height={240} radius={8} /></SkeletonGroup>;
  return (
    <Svg width="100%" height={240} viewBox="0 0 348 220" preserveAspectRatio="none" accessibilityLabel="Portfolio value history">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>
      <Path d={geometry.fill} fill={`url(#${gradientId})`} />
      <Path d={geometry.line} fill="none" stroke={GREEN} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <AnimatedCircle cx={geometry.tip.x} cy={geometry.tip.y} fill={GREEN} animatedProps={pulse} />
      <Circle cx={geometry.tip.x} cy={geometry.tip.y} r={5} fill={GREEN} />
    </Svg>
  );
}
export default memo(PortfolioChart);
