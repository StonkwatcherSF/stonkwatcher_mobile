
import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type GlassButtonProps = {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const AnimatedPressable =
  Animated.createAnimatedComponent(Pressable);

export default function GlassButton({
  icon,
  onPress,
  size = 44,
  disabled = false,
  accessibilityLabel,
  style,
}: GlassButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.9, {
          duration: 100,
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 12,
          stiffness: 250,
        });
      }}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
        animatedStyle,
      ]}
    >
      <BlurView
        intensity={65}
        tint="dark"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(255,255,255,0.18)",
          "rgba(255,255,255,0.08)",
          "rgba(255,255,255,0.04)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />


      <View style={styles.iconContainer}>
        {icon}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(45,45,45,0.30)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  reflection: {
    position: "absolute",
    top: 2,
    left: "18%",
    width: "64%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 2,
  },

  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});
