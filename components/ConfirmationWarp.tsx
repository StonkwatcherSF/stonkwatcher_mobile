import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

const STRIPS = 8;
const WIDTH = 320;
const HEIGHT = 64;
const SLICE = HEIGHT / STRIPS;

export type WarpTarget = { x: number; y: number; width: number; height: number };
export type WarpFlight = { uri?: string; dx: number; dy: number };

type Props = { flight: WarpFlight; onReady: () => void; onComplete: () => void; onFailure: () => void };

export default function ConfirmationWarp({ flight, onReady, onComplete, onFailure }: Props) {
  const [progress] = useState(() => new Animated.Value(0));
  const loaded = useRef(new Set<number>());
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onReady, onComplete, onFailure });
  useEffect(() => { callbacks.current = { onReady, onComplete, onFailure }; }, [onReady, onComplete, onFailure]);
  const imageLoaded = useCallback((index: number) => {
    loaded.current.add(index);
    if (loaded.current.size === STRIPS) setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) {
      const timeout = setTimeout(() => callbacks.current.onFailure(), 700);
      return () => clearTimeout(timeout);
    }
    callbacks.current.onReady();
    Animated.timing(progress, { toValue: 1, duration: 780, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) callbacks.current.onComplete();
    });
    return () => progress.stopAnimation();
  }, [progress, ready]);

  return <View pointerEvents="none" accessible={false} style={styles.overlay}>
    {Array.from({ length: STRIPS }, (_, index) => {
      // The leading edge pinches first, creating a tapered, Mac-inspired funnel.
      const edge = flight.dy >= 0 ? (index + 1) / STRIPS : (STRIPS - index) / STRIPS;
      const pinch = 0.7 - edge * 0.45;
      const centerOffset = HEIGHT / 2 - (index + 0.5) * SLICE;
      return <Animated.View key={index} style={[styles.strip, {
        top: index * SLICE,
        opacity: progress.interpolate({ inputRange: [0, 0.88, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, flight.dx] }) },
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, flight.dy + centerOffset] }) },
          { scaleX: progress.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [1, pinch, 0.12, 0.025] }) },
          { scaleY: progress.interpolate({ inputRange: [0, 0.35, 0.75, 1], outputRange: [1, 2.4, 1.6, 0.15] }) },
        ],
      }]}>
        <Image source={{ uri: flight.uri }} resizeMode="stretch" onLoad={() => imageLoaded(index)} onError={() => callbacks.current.onFailure()} style={{ position: "absolute", width: WIDTH, height: HEIGHT, top: -index * SLICE }} />
      </Animated.View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, overflow: "visible" },
  strip: { position: "absolute", left: 0, width: WIDTH, height: SLICE, overflow: "hidden" },
});
