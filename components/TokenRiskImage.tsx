import React, { memo, useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import Animated, { cancelAnimation, Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import TokenImage from "./TokenImage";
import { isSolanaAddress } from "../lib/solana";
import { readTokenRisk, subscribeTokenRisk } from "../lib/token-risk";

type Props = React.ComponentProps<typeof TokenImage>;
const CIRCUMFERENCE = 2 * Math.PI * 47;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RiskArc = memo(function RiskArc({ score, color }: { score: number; color: string }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);
  useFocusEffect(useCallback(() => {
    progress.set(0);
    progress.set(reducedMotion ? 1 : withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(progress);
  }, [progress, reducedMotion]));
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE - Math.max(0.1, CIRCUMFERENCE * score / 100) * progress.value,
    opacity: Math.min(1, progress.value * 4),
  }));
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <AnimatedCircle cx={50} cy={50} r={47} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
        strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]} animatedProps={animatedProps}
        rotation={-90} origin="50, 50" />
    </Svg>
  );
});

function TokenRiskImage({ uri, mint, style }: Props) {
  const [result, setResult] = useState<{ mint: string; score: number | null } | null>(null);
  useFocusEffect(useCallback(() => {
    if (!mint || !isSolanaAddress(mint)) return;
    const update = () => setResult({ mint, score: readTokenRisk(mint) });
    update();
    return subscribeTokenRisk(mint, update);
  }, [mint]));
  const score = result && result.mint === mint ? result.score : mint ? readTokenRisk(mint) : null;
  const color = score == null || score <= 25 ? "#BBDC12" : score <= 50 ? "#D8BD00" : score <= 75 ? "#F1A33A" : "#FF584C";
  return (
    <View style={[style, styles.frame]}>
      <TokenImage uri={uri} mint={mint} style={[styles.image, { borderRadius: StyleSheet.flatten(style)?.borderRadius }]} />
      {score != null && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityLabel={`Risk score ${Math.round(score)} out of 100`}>
          <RiskArc key={mint} score={score} color={color} />
        </View>
      )}
    </View>
  );
}

export default memo(TokenRiskImage);

const styles = StyleSheet.create({
  frame: { overflow: "hidden" },
  // Bundled placeholders have intrinsic dimensions; explicitly constrain them to the avatar.
  image: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
});
