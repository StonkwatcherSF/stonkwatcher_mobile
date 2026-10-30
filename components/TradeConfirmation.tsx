
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import AnimatedAmount from "./AnimatedAmount";

type Props = {
  tokenName?: string;
  amount?: number;
  mode?: "buy" | "sell";
  onDismiss?: () => void;
};

const BANNER_WIDTH = 320;
const BANNER_HEIGHT = 64;
const LIME = "#C6E900";

export default function TradeConfirmation({
  tokenName = "Stonk Watcher",
  amount = 2302.42,
  mode = "buy",
  onDismiss,
}: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const expansion = useRef(new Animated.Value(64)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const bannerOpacity = useRef(new Animated.Value(1)).current;
  const bannerTranslateY = useRef(new Animated.Value(0)).current;

  const [stage, setStage] = useState<
    "loading" | "expanding" | "confirmed"
  >("loading");

  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    rotation.setValue(0);
    expansion.setValue(64);
    contentOpacity.setValue(0);
    bannerOpacity.setValue(1);
    bannerTranslateY.setValue(0);

    setStage("loading");

    const spinning = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 950,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    spinning.start();

    const loadingTimer = setTimeout(() => {
      spinning.stop();
      setStage("expanding");

      Animated.timing(expansion, {
        toValue: BANNER_WIDTH,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) return;

        setStage("confirmed");

        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }, 1500);

    const dismissTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(bannerOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bannerTranslateY, {
          toValue: -25,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          dismissRef.current?.();
        }
      });
    }, 5000);

    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(dismissTimer);
      spinning.stop();
      expansion.stopAnimation();
      contentOpacity.stopAnimation();
      bannerOpacity.stopAnimation();
      bannerTranslateY.stopAnimation();
    };
  }, [
    rotation,
    expansion,
    contentOpacity,
    bannerOpacity,
    bannerTranslateY,
  ]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const logoPosition = expansion.interpolate({
    inputRange: [64, BANNER_WIDTH],
    outputRange: [0, -(BANNER_WIDTH - 64) / 2],
  });

  const signedAmount =
    mode === "buy"
      ? Math.abs(amount)
      : -Math.abs(amount);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: bannerOpacity,
          transform: [{ translateY: bannerTranslateY }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.banner,
          { width: expansion },
          stage === "loading" && styles.loadingBanner,
        ]}
      >
        <Animated.View
          style={[
            styles.logoGroup,
            {
              transform: [{ translateX: logoPosition }],
            },
          ]}
        >
          <Image
            source={require("../assets/images/stonk-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {stage === "loading" && (
            <Animated.View
              style={[
                styles.loadingRing,
                { transform: [{ rotate: spin }] },
              ]}
            >
              <Svg
                width={64}
                height={64}
                viewBox="0 0 64 64"
              >
                <Circle
                  cx={32}
                  cy={32}
                  r={29}
                  stroke={LIME}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray="38 145"
                  fill="none"
                />
              </Svg>
            </Animated.View>
          )}
        </Animated.View>

        {stage === "confirmed" && (
          <Animated.View
            style={[
              styles.confirmationContent,
              { opacity: contentOpacity },
            ]}
          >
            <Text
              style={styles.tokenName}
              numberOfLines={1}
            >
              {tokenName}
            </Text>

            <AnimatedAmount
              amount={signedAmount}
              duration={650}
              style={styles.amount}
            />
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    height: BANNER_HEIGHT,
  },

  banner: {
    height: BANNER_HEIGHT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LIME,
    backgroundColor: "#101500",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  loadingBanner: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },

  logoGroup: {
    position: "absolute",
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 49,
    height: 49,
  },

  loadingRing: {
    position: "absolute",
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmationContent: {
    position: "absolute",
    left: 64,
    right: 12,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  tokenName: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  amount: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
