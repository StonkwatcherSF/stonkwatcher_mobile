import React, { memo, useEffect } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

const END = 380;
const Glyph = memo(function Glyph({ text, index, clock }: { text: string; index: number; clock: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, (clock.value - Math.min(index, 35) * 6) / 150)) }));
  return <Animated.Text style={style}>{text}</Animated.Text>;
});
export default memo(function SwapAmountText({ text, swapVersion, style, secondary = false }: { text: string; swapVersion: number; style?: StyleProp<TextStyle>; secondary?: boolean }) {
  const clock = useSharedValue(END);
  const reduced = useReducedMotion();
  useEffect(() => {
    cancelAnimation(clock);
    clock.set(END);
    if (swapVersion > 0 && !reduced) { clock.set(0); clock.set(withTiming(END, { duration: END })); }
    return () => cancelAnimation(clock);
  }, [clock, reduced, swapVersion]);
  const entrance = useAnimatedStyle(() => ({ transform: [{ translateY: (secondary ? -5 : 7) * (1 - Math.min(1, clock.value / 220)) }] }));
  // A shared clock and a bounded number of text spans keep long amounts inexpensive.
  const chars = Array.from(text);
  const size = Math.max(1, Math.ceil(chars.length / 40));
  const chunks = Array.from({ length: Math.ceil(chars.length / size) }, (_, i) => chars.slice(i * size, (i + 1) * size).join(""));
  return <Animated.View style={[{ maxWidth: "100%", flexShrink: 1 }, entrance]}>
    <Text style={style} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.35} accessible accessibilityLabel={text}>
      {chunks.map((chunk, index) => <Glyph key={index} text={chunk} index={index} clock={clock} />)}
    </Text>
  </Animated.View>;
});
