import React, { createContext, useCallback, useContext, useRef } from "react";
import { StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

const BackgroundContext = createContext<((down: boolean) => void) | null>(null);
const STOPS = [0, 0.5, 1] as const;

export function AppBackgroundProvider({ children }: { children: React.ReactNode }) {
  const brightness = useSharedValue(0);
  const movingDown = useRef(false);
  const reducedMotion = useReducedMotion();
  const setScrollingDown = useCallback((down: boolean) => {
    if (movingDown.current === down) return;
    movingDown.current = down;
    const target = down ? 1 : 0;
    brightness.set(reducedMotion ? target : withTiming(target, { duration: down ? 240 : 320 }));
  }, [brightness, reducedMotion]);
  const highlight = useAnimatedStyle(() => ({ opacity: brightness.value }));
  return <View style={styles.root}>
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <LinearGradient colors={["#101010", "#101010", "#242A03"]} locations={STOPS} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, highlight]}>
        <LinearGradient colors={["#101010", "#101010", "#475307"]} locations={STOPS} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
    <BackgroundContext.Provider value={setScrollingDown}>{children}</BackgroundContext.Provider>
  </View>;
}

export function useBackgroundScroll() {
  const setScrollingDown = useContext(BackgroundContext);
  if (!setScrollingDown) throw new Error("AppBackgroundProvider missing");
  const previousY = useRef<number | null>(null);
  const focused = useRef(false);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stop = useCallback(() => {
    if (idle.current) clearTimeout(idle.current);
    setScrollingDown(false);
  }, [setScrollingDown]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    previousY.current = null;
    return () => { focused.current = false; stop(); };
  }, [stop]));
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!focused.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
    const y = Math.max(0, Math.min(contentOffset.y, maxY));
    const delta = previousY.current === null ? 0 : y - previousY.current;
    previousY.current = y;
    if (Math.abs(delta) < 0.5) return;
    setScrollingDown(delta > 0);
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(stop, 140);
  }, [setScrollingDown, stop]);
  const onScrollBeginDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    previousY.current = Math.max(0, event.nativeEvent.contentOffset.y);
    stop();
  }, [stop]);
  return { onScroll, onScrollBeginDrag, onScrollEndDrag: stop, onMomentumScrollEnd: stop };
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#101010" } });
