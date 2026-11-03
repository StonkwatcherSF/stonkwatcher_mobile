import React, { memo } from "react";
import { Animated, StyleSheet, View } from "react-native";

// A fixed, small particle budget. No randomness, timers, or frame-by-frame renders.
const PARTICLES = Array.from({ length: 24 }, (_, index) => {
  const column = index % 8;
  const row = Math.floor(index / 8);
  const x = 20 + column * 40;
  const start = x / 320 * 0.65;
  return { x, y: 12 + row * 20, size: 2 + index % 4, start, end: Math.min(1, start + 0.38), dx: 18 + index % 5 * 7, dy: -(15 + index % 7 * 6), turn: index % 2 ? "80deg" : "-65deg" };
});

export default memo(function ConfirmationDisintegration({ progress }: { progress: Animated.Value }) {
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
    {PARTICLES.map((particle, index) => <Animated.View key={index} style={[styles.particle, {
      left: particle.x, top: particle.y, width: particle.size, height: particle.size,
      opacity: progress.interpolate({ inputRange: [0, particle.start, particle.start + 0.045, particle.end], outputRange: [0, 0, 0.9, 0], extrapolate: "clamp" }),
      transform: [
        { translateX: progress.interpolate({ inputRange: [particle.start, particle.end], outputRange: [0, particle.dx], extrapolate: "clamp" }) },
        { translateY: progress.interpolate({ inputRange: [particle.start, particle.end], outputRange: [0, particle.dy], extrapolate: "clamp" }) },
        { scale: progress.interpolate({ inputRange: [particle.start, particle.end], outputRange: [1, 0.2], extrapolate: "clamp" }) },
        { rotate: progress.interpolate({ inputRange: [particle.start, particle.end], outputRange: ["0deg", particle.turn], extrapolate: "clamp" }) },
      ],
    }]} />)}
  </View>;
});

const styles = StyleSheet.create({
  particle: { position: "absolute", backgroundColor: "#BBDC12", borderRadius: 1 },
});
