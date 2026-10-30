
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Send,
} from "lucide-react-native";

const LIME = "#C6E900";
const SCREEN_HEIGHT = Dimensions.get("window").height;

type Props = {
  visible: boolean;
  onClose: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  onSend: () => void;
};

export default function WalletMoreSheet({
  visible,
  onClose,
  onDeposit,
  onWithdraw,
  onSend,
}: Props) {
  const translateY = useRef(
    new Animated.Value(SCREEN_HEIGHT)
  ).current;

  const closing = useRef(false);
  const startY = useRef(0);

  const callbacks = useRef({
    onClose,
    onDeposit,
    onWithdraw,
    onSend,
  });

  callbacks.current = {
    onClose,
    onDeposit,
    onWithdraw,
    onSend,
  };

  useEffect(() => {
    if (!visible) return;

    closing.current = false;
    translateY.stopAnimation();
    translateY.setValue(SCREEN_HEIGHT);

    Animated.spring(translateY, {
      toValue: 0,
      damping: 25,
      stiffness: 230,
      mass: 0.9,
      useNativeDriver: true,
    }).start();

    return () => translateY.stopAnimation();
  }, [visible, translateY]);

  const closeSheet = () => {
    if (closing.current) return;

    closing.current = true;
    translateY.stopAnimation();

    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) callbacks.current.onClose();
      closing.current = false;
    });
  };

  const snapBack = () => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 24,
      stiffness: 240,
      useNativeDriver: true,
    }).start();
  };

  const closeRef = useRef(closeSheet);
  closeRef.current = closeSheet;

  const snapRef = useRef(snapBack);
  snapRef.current = snapBack;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,

      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 3 &&
        Math.abs(gesture.dy) > Math.abs(gesture.dx),

      onPanResponderGrant: () => {
        translateY.stopAnimation((value: number) => {
          startY.current = value;
        });
      },

      onPanResponderMove: (_, gesture) => {
        if (closing.current) return;

        // Follow the finger in both directions.
        const next = Math.max(
          -80,
          startY.current + gesture.dy
        );

        translateY.setValue(next);
      },

      onPanResponderRelease: (_, gesture) => {
        const distance = startY.current + gesture.dy;

        if (
          distance > 110 ||
          (distance > 35 && gesture.vy > 1)
        ) {
          closeRef.current();
        } else {
          snapRef.current();
        }
      },

      onPanResponderTerminate: () => {
        snapRef.current();
      },

      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const actions = [
    {
      title: "Deposit",
      description: "View your demo deposit address",
      Icon: ArrowDownLeft,
      onPress: onDeposit,
    },
    {
      title: "Withdraw",
      description: "Open simulated withdrawal",
      Icon: ArrowUpRight,
      onPress: onWithdraw,
    },
    {
      title: "Send",
      description: "Send demo funds to a user",
      Icon: Send,
      onPress: onSend,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={35}
          tint="dark"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeSheet}
          accessibilityLabel="Close wallet popup"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Draggable handle */}
          <View
            style={styles.dragArea}
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} />
          </View>

          <Text style={styles.heading}>Wallet</Text>

          <Text style={styles.caption}>
            Available balance
          </Text>

          <Text style={styles.balance}>
            $1,500.14
          </Text>

          <Text style={styles.demo}>
            DEMO WALLET · No real funds
          </Text>

          <View style={styles.actions}>
            {actions.map(
              ({ title, description, Icon, onPress }) => (
                <Pressable
                  key={title}
                  style={styles.action}
                  onPress={onPress}
                  accessibilityRole="button"
                  accessibilityLabel={title}
                >
                  <View style={styles.actionIcon}>
                    <Icon size={22} color={LIME} />
                  </View>

                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>
                      {title}
                    </Text>

                    <Text style={styles.actionDescription}>
                      {description}
                    </Text>
                  </View>

                  <ChevronRight
                    size={21}
                    color="#B5B7B1"
                  />
                </Pressable>
              )
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  sheet: {
    backgroundColor: "#12160B",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    borderWidth: 1,
    borderColor: "#30372B",
    overflow: "hidden",
  },

  dragArea: {
    height: 44,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 12,
  },

  handle: {
    width: 52,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#50534C",
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },

  caption: {
    color: "#A7A9A2",
    fontSize: 12,
    marginTop: 18,
  },

  balance: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    marginTop: 3,
  },

  demo: {
    color: LIME,
    fontSize: 10,
    marginTop: 7,
    marginBottom: 20,
  },

  actions: {
    gap: 9,
  },

  action: {
    minHeight: 67,
    borderRadius: 10,
    backgroundColor: "#20251B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 12,
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: "#303B1D",
    alignItems: "center",
    justifyContent: "center",
  },

  actionText: {
    flex: 1,
  },

  actionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  actionDescription: {
    color: "#A6A9A2",
    fontSize: 11,
    marginTop: 4,
  },
});
