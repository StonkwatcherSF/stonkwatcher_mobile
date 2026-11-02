import React, { useCallback, useEffect, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useReducedMotion } from "react-native-reanimated";

type Props = {
  active?: boolean;
  style?: React.ComponentProps<typeof Animated.View>["style"];
  layoutStyle?: React.ComponentProps<typeof Animated.View>["style"];
  children: (onAmountComplete: () => void) => React.ReactNode;
};

export default function ConfirmationCelebration({ active = true, style, layoutStyle, children }: Props) {
  const [shine] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1));
  const [width, setWidth] = useState(320);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    shine.setValue(0);
    scale.setValue(1);
    if (active && !reduceMotion) {
      Animated.sequence([
        Animated.delay(80),
        Animated.timing(shine, { toValue: 1, duration: 540, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]).start();
    }
    return () => { shine.stopAnimation(); scale.stopAnimation(); };
  }, [active, reduceMotion, scale, shine]);
  const onAmountComplete = useCallback(() => {
    if (!active || reduceMotion) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.035, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }),
    ]).start();
  }, [active, reduceMotion, scale]);
  const content = <Animated.View pointerEvents="none" style={[style, { transform: [{ scale }] }]}>
    {children(onAmountComplete)}
    {active && !reduceMotion && <Animated.View pointerEvents="none" accessible={false} style={styles.clip} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Animated.View style={[styles.shine, {
        opacity: shine.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-110, width + 110] }) }, { skewX: "-18deg" }],
      }]}>
        <LinearGradient colors={["rgba(198,233,0,0)", "rgba(241,255,208,0.3)", "rgba(255,255,255,0.48)", "rgba(198,233,0,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </Animated.View>}
  </Animated.View>;
  // Keep JS-driven layout values out of the native-driven bounce's props graph.
  return layoutStyle ? <Animated.View pointerEvents="none" style={layoutStyle}>{content}</Animated.View> : content;
}

const styles = StyleSheet.create({
  clip: { ...StyleSheet.absoluteFill, overflow: "hidden", borderRadius: 10 },
  shine: { position: "absolute", left: 0, top: -30, bottom: -30, width: 90 },
});
