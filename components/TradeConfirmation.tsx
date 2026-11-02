
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import AnimatedAmount from "./AnimatedAmount";
import ConfirmationCelebration from "./ConfirmationCelebration";
import ConfirmationDisintegration from "./ConfirmationDisintegration";
import TokenImage from "./TokenImage";
import { captureRef, releaseCapture } from "react-native-view-shot";
import { useReducedMotion } from "react-native-reanimated";
import ConfirmationWarp, { type WarpFlight, type WarpTarget } from "./ConfirmationWarp";

type Props = {
  tokenName?: string;
  imageUrl?: string | null;
  mint?: string;
  amount?: number;
  mode?: "buy" | "sell";
  onDismiss?: () => void;
  onPrepareExit?: () => Promise<WarpTarget | null>;
};

const BANNER_WIDTH = 320;
const BANNER_HEIGHT = 64;
const LIME = "#C6E900";

export default function TradeConfirmation({
  tokenName = "Stonk Watcher",
  imageUrl,
  mint,
  amount = 2302.42,
  mode = "buy",
  onDismiss,
  onPrepareExit,
}: Props) {
  const [rotation] = useState(() => new Animated.Value(0));
  const [expansion] = useState(() => new Animated.Value(64));
  const [contentOpacity] = useState(() => new Animated.Value(0));
  const [dissolve] = useState(() => new Animated.Value(0));
  const [disintegrating, setDisintegrating] = useState(false);
  const [fallbackWarp] = useState(() => new Animated.Value(0));
  const sourceRef = useRef<React.ElementRef<typeof View>>(null);
  const prepareRef = useRef(onPrepareExit);
  const reduceMotion = useReducedMotion();
  const [flight, setFlight] = useState<WarpFlight | null>(null);
  const [flying, setFlying] = useState(false);
  useEffect(() => { prepareRef.current = onPrepareExit; }, [onPrepareExit]);
  useEffect(() => {
    if (!flight || flight.uri) return;
    Animated.timing(fallbackWarp, { toValue: 1, duration: reduceMotion ? 0 : 550, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (finished) dismissRef.current?.();
    });
    return () => fallbackWarp.stopAnimation();
  }, [fallbackWarp, flight, reduceMotion]);
  useEffect(() => () => { if (flight?.uri) releaseCapture(flight.uri); }, [flight?.uri]);

  const [stage, setStage] = useState<
    "loading" | "expanding" | "confirmed"
  >("loading");

  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);

  useEffect(() => {
    rotation.setValue(0);
    expansion.setValue(64);
    contentOpacity.setValue(0);
    fallbackWarp.setValue(0);
    dissolve.setValue(0);
    let cancelled = false;

    const spinning = Animated.loop(Animated.timing(rotation, {
      toValue: 1,
      duration: 950,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
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
      void (async () => {
        if (mode === "sell") {
          if (reduceMotion) { dismissRef.current?.(); return; }
          setDisintegrating(true);
          Animated.timing(dissolve, { toValue: 1, duration: 980, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => {
            if (finished && !cancelled) dismissRef.current?.();
          });
          return;
        }
        const target = await prepareRef.current?.().catch(() => null);
        if (cancelled) return;
        if (reduceMotion) { dismissRef.current?.(); return; }
        const source = sourceRef.current;
        if (!source) { dismissRef.current?.(); return; }
        source.measureInWindow((x, y, width, height) => {
          if (cancelled) return;
          const dx = target ? target.x + target.width / 2 - (x + width / 2) : 0;
          const dy = target ? target.y + target.height / 2 - (y + height / 2) : 0;
          void captureRef(source, { format: "png", quality: 1, result: "tmpfile" })
            .then((uri) => {
              if (cancelled) releaseCapture(uri);
              else setFlight({ uri, dx, dy });
            })
            .catch(() => { if (!cancelled) setFlight({ dx, dy }); });
        });
      })().catch(() => { if (!cancelled) dismissRef.current?.(); });
    }, 4200);

    return () => {
      cancelled = true;
      clearTimeout(loadingTimer);
      clearTimeout(dismissTimer);
      spinning.stop();
      expansion.stopAnimation();
      contentOpacity.stopAnimation();
      fallbackWarp.stopAnimation();
      dissolve.stopAnimation();
    };
  }, [
    rotation,
    expansion,
    contentOpacity,
    fallbackWarp,
    dissolve,
    mode,
    reduceMotion,
  ]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

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
          opacity: fallbackWarp.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: fallbackWarp.interpolate({ inputRange: [0, 1], outputRange: [0, flight?.dx ?? 0] }) },
            { translateY: fallbackWarp.interpolate({ inputRange: [0, 1], outputRange: [0, flight?.dy ?? 0] }) },
            { scaleX: fallbackWarp.interpolate({ inputRange: [0, 1], outputRange: [1, 0.04] }) },
            { scaleY: fallbackWarp.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.8, 0.04] }) },
          ],
        },
      ]}
    >
      <Animated.View style={[styles.dissolveClip, { transform: [{ translateX: dissolve.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0, BANNER_WIDTH, BANNER_WIDTH] }) }] }]}>
      <Animated.View style={[styles.dissolveContent, { transform: [{ translateX: dissolve.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0, -BANNER_WIDTH, -BANNER_WIDTH] }) }] }]}>
      <View ref={sourceRef} collapsable={false} style={{ opacity: flying ? 0 : 1 }}>
      <ConfirmationCelebration
        active={stage === "confirmed"}
        layoutStyle={{ width: expansion }}
        style={[
          styles.banner,
          { width: "100%" },
          stage === "loading" && styles.loadingBanner,
        ]}
      >
        {(onAmountComplete) => <>
        <Animated.View
          style={[
            styles.logoGroup,
            {
              transform: [{ translateX: logoPosition }],
            },
          ]}
        >
          <TokenImage uri={imageUrl} mint={mint} style={styles.logo} />
          {stage === "loading" && (
            <Animated.View style={[styles.loadingRing, { transform: [{ rotate: spin }] }]}>
              <Svg width={64} height={64} viewBox="0 0 64 64">
                <Circle cx={32} cy={32} r={29} stroke={LIME} strokeWidth={3} strokeLinecap="round" strokeDasharray="38 145" fill="none" />
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
              onComplete={onAmountComplete}
            />
          </Animated.View>
        )}
        </>}
      </ConfirmationCelebration>
      </View>
      </Animated.View>
      </Animated.View>
      {disintegrating && <ConfirmationDisintegration progress={dissolve} />}
      {flight?.uri && <ConfirmationWarp flight={flight} onReady={() => setFlying(true)} onComplete={() => dismissRef.current?.()} onFailure={() => { setFlying(false); setFlight({ dx: flight.dx, dy: flight.dy }); }} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dissolveClip: { width: BANNER_WIDTH, overflow: "hidden", alignItems: "center" },
  dissolveContent: { width: BANNER_WIDTH, alignItems: "center" },
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
    borderRadius: 25,
  },


  loadingRing: { position: "absolute", width: 64, height: 64, alignItems: "center", justifyContent: "center" },

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
