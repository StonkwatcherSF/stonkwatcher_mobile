
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheck } from "lucide-react-native";
import { COLORS, FONTS } from "../constants/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const PLACEHOLDER = require("../assets/images/placeholder.png");

type Props = {
    visible: boolean;
    onClose: () => void;
};

type Transaction = {
    id: string;
    name: string;
    action: string;
    date: string;
    amount: string;
    detail: string;
    positive: boolean;
};

const TRANSACTIONS: Transaction[] = [
    {
        id: "tx1",
        name: "Stonk Watcher",
        action: "Sell",
        date: "10/24/26 3:22 PM",
        amount: "+$2,302.42",
        detail: "Sold at $0.0₃344",
        positive: true,
    },
    {
        id: "tx2",
        name: "Stonk Watcher",
        action: "Received",
        date: "10/24/26 3:22 PM",
        amount: "$2.23",
        detail: "▲ 20.61%",
        positive: true,
    },
    {
        id: "tx3",
        name: "Stonk Watcher",
        action: "Sell",
        date: "10/24/26 3:22 PM",
        amount: "-$2,302.42",
        detail: "Sold at $0.0₃344",
        positive: false,
    },
];




const getTransactionGradient = (
    amount: string,
    positive: boolean
): [string, string, string] => {
    const value = Math.abs(
        Number(amount.replace(/[^0-9.]/g, ""))
    );

    const intensity = Math.min(value / 3000, 1);
    const strength = Math.pow(intensity, 1.2);

    const base = [17, 17, 17];

    const target = positive
        ? [0, 85, 62]
        : [100, 30, 23];

    const mix = (amount: number) => {
        const t = Math.max(0, Math.min(amount, 1));

        return (
            "#" +
            base
                .map((channel, index) =>
                    Math.round(
                        channel + (target[index] - channel) * t
                    )
                        .toString(16)
                        .padStart(2, "0")
                )
                .join("")
        );
    };

    return [
        mix(strength),
        mix(strength * 0.25),
        "#111111",
    ];
};




function TransactionRow({
    transaction,
}: {
    transaction: Transaction;
}) {


    return (



        <LinearGradient
            colors={getTransactionGradient(
                transaction.amount,
                transaction.positive
            )}
            locations={[0, 0.3, 1]}
            start={{ x: 1, y: 0.5 }}
            end={{ x: 0, y: 0.5 }}
            style={styles.transaction}
        >



            {/* TOKEN AVATAR */}
            <View style={styles.tokenIcon}>
                <Image
                    source={PLACEHOLDER}
                    style={styles.tokenImage}
                    resizeMode="cover"
                />
            </View>

            {/* TOKEN NAME AND DATE */}
            <View style={styles.transactionMiddle}>
                <View style={styles.nameRow}>
                    <Text
                        style={styles.tokenName}
                        numberOfLines={1}
                    >
                        {transaction.name}
                    </Text>

                    <BadgeCheck
                        size={15}
                        color={COLORS.stonkGreen}
                        strokeWidth={2.2}
                    />
                </View>

                <Text
                    style={styles.transactionDate}
                    numberOfLines={1}
                >
                    {transaction.action} {transaction.date}
                </Text>
            </View>

            {/* TRANSACTION VALUE */}
            <View style={styles.transactionRight}>
                <Text
                    style={styles.amount}
                    numberOfLines={1}
                >
                    {transaction.amount}
                </Text>

                <Text
                    style={[
                        styles.detail,
                        transaction.action === "Received" &&
                        styles.positive,
                    ]}
                    numberOfLines={1}
                >
                    {transaction.detail}
                </Text>
            </View>
        </LinearGradient>
    );
}

export default function WalletHistorySheet({
    visible,
    onClose,
}: Props) {
    const translateY = useRef(
        new Animated.Value(SCREEN_HEIGHT)
    ).current;

    const closing = useRef(false);
    const startY = useRef(0);

    const closeCallback = useRef(onClose);
    closeCallback.current = onClose;

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

        return () => {
            translateY.stopAnimation();
        };
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
            if (finished) {
                closeCallback.current();
            }

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
                Math.abs(gesture.dy) >
                Math.abs(gesture.dx),

            onPanResponderGrant: () => {
                translateY.stopAnimation((value: number) => {
                    startY.current = value;
                });
            },

            onPanResponderMove: (_, gesture) => {
                if (closing.current) return;

                const next = Math.max(
                    -80,
                    startY.current + gesture.dy
                );

                translateY.setValue(next);
            },

            onPanResponderRelease: (_, gesture) => {
                const distance =
                    startY.current + gesture.dy;

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
                {/* BLURRED BACKGROUND */}
                <BlurView
                    intensity={28}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />

                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={closeSheet}
                    accessibilityRole="button"
                    accessibilityLabel="Close transaction history"
                />

                {/* HISTORY BOTTOM SHEET */}
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    {/* DRAG HANDLE */}
                    <View
                        style={styles.dragArea}
                        {...panResponder.panHandlers}
                    >
                        <View style={styles.handle} />
                    </View>

                    <Text style={styles.title}>
                        History
                    </Text>

                    {/* TRANSACTION LIST */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        contentContainerStyle={styles.list}
                    >
                        {TRANSACTIONS.map((transaction) => (
                            <TransactionRow
                                key={transaction.id}
                                transaction={transaction}
                            />
                        ))}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.62)",
    },

    sheet: {
        backgroundColor: "#111407",
        borderTopLeftRadius: 29,
        borderTopRightRadius: 29,
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: Platform.OS === "ios" ? 34 : 22,
        maxHeight: "76%",
        minHeight: 300,
        overflow: "hidden",
    },

    dragArea: {
        height: 42,
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: 12,
    },

    handle: {
        width: 55,
        height: 5,
        borderRadius: 4,
        backgroundColor: "#50534C",
    },

    title: {
        color: "#FFFFFF",
        fontFamily: FONTS.regular,
        fontSize: 15,
        marginBottom: 13,
    },

    list: {
        paddingBottom: 4,
        gap: 6,
    },

    transaction: {
        minHeight: 74,
        borderRadius: 7,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 11,
        gap: 9,
        overflow: "hidden",
    },

    tokenIcon: {
        width: 43,
        height: 43,
        borderRadius: 22,
        backgroundColor: "#091C30",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },

    tokenImage: {
        width: "100%",
        height: "100%",
        borderRadius: 22,
    },

    transactionMiddle: {
        flex: 1,
        minWidth: 0,
    },

    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },

    tokenName: {
        color: "#FFFFFF",
        fontFamily: FONTS.regular,
        fontSize: 13,
        fontWeight: "600",
        flexShrink: 1,
    },

    transactionDate: {
        color: "#B5B5B5",
        fontFamily: FONTS.regular,
        fontSize: 10,
        marginTop: 5,
    },

    transactionRight: {
        alignItems: "flex-end",
        maxWidth: "34%",
    },

    amount: {
        color: "#FFFFFF",
        fontFamily: FONTS.regular,
        fontSize: 12,
        fontWeight: "700",
    },

    detail: {
        color: "#B5B5B5",
        fontFamily: FONTS.regular,
        fontSize: 10,
        marginTop: 5,
    },

    positive: {
        color: COLORS.buy,
    },
});
