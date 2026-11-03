import React, { memo } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 16, stiffness: 300, mass: 0.6 };
type Props = Omit<PressableProps, "style" | "children"> & { style?: StyleProp<ViewStyle>; children: React.ReactNode };

export default memo(function TokenCardPressable({ style, children, disabled, onPress, onPressIn, onPressOut, onHoverIn, onHoverOut, ...props }: Props) {
  const scale = useSharedValue(1);
  const hovered = useSharedValue(0);
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const animation = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    zIndex: hovered.value || pressed.value ? 1 : 0,
  }));
  return <AnimatedPressable
    {...props}
    disabled={disabled}
    style={[style, animation]}
    onHoverIn={(event) => {
      if (!disabled && !reduceMotion) { hovered.set(1); scale.set(withSpring(1.05, SPRING)); }
      onHoverIn?.(event);
    }}
    onHoverOut={(event) => {
      hovered.set(0);
      if (!reduceMotion && !pressed.get()) scale.set(withSpring(1, SPRING));
      onHoverOut?.(event);
    }}
    onPressIn={(event) => {
      pressed.set(1);
      if (!reduceMotion) scale.set(withTiming(0.98, { duration: 60 }));
      onPressIn?.(event);
    }}
    onPressOut={(event) => {
      pressed.set(0);
      if (!reduceMotion) scale.set(withSpring(hovered.get() ? 1.05 : 1, SPRING));
      onPressOut?.(event);
    }}
    onPress={(event) => {
      // Dispatch navigation immediately; never wait for feedback to finish.
      onPress?.(event);
      if (!reduceMotion) {
        const rest = hovered.get() ? 1.05 : 1;
        scale.set(withSequence(withTiming(rest + 0.025, { duration: 75 }), withSpring(rest, SPRING)));
      }
    }}
  >{children}</AnimatedPressable>;
});
