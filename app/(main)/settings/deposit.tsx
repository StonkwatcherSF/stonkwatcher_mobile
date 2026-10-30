
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, FONTS } from "../../../constants/theme";

const PLACEHOLDER = require("../../../assets/images/placeholder.png");

const SHEET_HEIGHT = 340;

export default function DepositScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const translateY = useRef(
    new Animated.Value(500)
  ).current;

  const closing = useRef(false);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 24,
      stiffness: 190,
      mass: 0.85,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const closeSheet = () => {
    if (closing.current) return;

    closing.current = true;

    Animated.timing(translateY, {
      toValue: 500,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/tokens");
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 8 &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx),

      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },

      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 90 || gesture.vy > 1.1) {
          closeSheet();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const copyAddress = () => {
    Alert.alert(
      "Demo Deposit",
      "A real wallet address is not connected yet."
    );
  };

  return (
    <View style={styles.root}>
      {/* BLURRED BACKGROUND */}
      <View style={styles.backdrop}>
        <BlurView
          intensity={70}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />

        <View
          pointerEvents="none"
          style={styles.darkOverlay}
        />

        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeSheet}
          accessibilityRole="button"
          accessibilityLabel="Close deposit"
        />
      </View>

      {/* ORIGINAL DEPOSIT BOTTOM SHEET */}
      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateY }],
          },
        ]}
      >
        <View
          style={styles.dragArea}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />
        </View>

        <Text style={styles.title}>Deposit</Text>

        <View style={styles.body}>
          <Text style={styles.description}>
            Send any token on the Solana network.
          </Text>

          <Text style={styles.description}>
            Deposit SOL to add to your cash balance.
          </Text>

          {/* QR CODE PLACEHOLDER */}
          <View style={styles.qrContainer}>
            <Image
              source={PLACEHOLDER}
              style={styles.qrPlaceholder}
              resizeMode="contain"
            />

            <Text style={styles.qrLabel}>
              Demo QR Placeholder
            </Text>
          </View>

          <Text
            style={styles.address}
            numberOfLines={1}
          >
            Wallet address not connected
          </Text>

          <Pressable
            style={styles.copyButton}
            onPress={copyAddress}
            accessibilityRole="button"
          >
            <Text style={styles.copyButtonText}>
              Copy Wallet Address
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "transparent",
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
  },

  darkOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },

  sheet: {
    backgroundColor: "#171C05",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: SHEET_HEIGHT,
    paddingHorizontal: 14,
    paddingTop: 0,
    overflow: "hidden",
  },

  dragArea: {
    height: 28,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 8,
  },

  handle: {
    width: 45,
    height: 5,
    borderRadius: 10,
    backgroundColor: "#41463B",
  },

  title: {
    color: COLORS.white,
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },

  body: {
    alignItems: "center",
  },

  description: {
    color: "#A5A5A5",
    fontFamily: FONTS.regular,
    fontSize: 11,
    textAlign: "center",
    marginBottom: 4,
  },

  qrContainer: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    marginTop: 10,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  qrPlaceholder: {
    width: 90,
    height: 90,
  },

  qrLabel: {
    fontSize: 10,
    color: "#555555",
    marginTop: 5,
  },

  address: {
    color: "#B6B6B6",
    fontFamily: FONTS.regular,
    fontSize: 10,
    textAlign: "center",
    marginBottom: 10,
  },

  copyButton: {
    backgroundColor: COLORS.stonkGreen,
    height: 38,
    width: "100%",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },

  copyButtonText: {
    color: "#101010",
    fontFamily: FONTS.regular,
    fontSize: 14,
    fontWeight: "700",
  },
});
