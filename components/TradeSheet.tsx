import { LocalizedAlert as Alert, LocalizedText as Text } from "./LocalizationContext";
import { useBackgroundScroll } from "./AppBackground";
import { SkeletonRows } from "./Skeleton";
import * as Haptics from "expo-haptics";
import React, { useRef, useState, useEffect, } from "react";
import { Animated, Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    ArrowLeftRight,
    BadgeCheck,
    Delete,
    ChevronsRight,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { COLORS, FONTS } from "../constants/theme";
import TokenImage from "./TokenImage";
import { usePortfolio, positionPnl, positionValue } from "./PortfolioContext";
import { useTokenMarket } from "../hooks/useTokenMarket";
import { MOCK_TRADE_FEE } from "../lib/config";
import { compactUsd, formatPrice, formatTokenAmount, prettySymbol } from "../lib/format";
import { isSolanaAddress } from "../lib/solana";

type TradeMode = "buy" | "sell";

type Props = {
    mode: TradeMode;
    tokenId?: string;
    tokenName?: string;
    symbol?: string;
    imageUrl?: string | null;
    verified?: boolean;
    priceUsd?: number | null;
    marketCapUsd?: number | null;
    onClose?: () => void;
    onTradeConfirmed?: (
        mode: TradeMode,
        tokenId: string,
        amount: number
    ) => void;
};

const tokenNames: Record<string, string> = {
    "stonk-watcher": "Stonk Watcher",
    "anonymous-cat": "Anonymous Cat",
    nullmask: "Nullmask",
    "super-inu": "Super Inu",
    allinu: "ALLINU",
};

const formatMoney = (value: number) =>
    value.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function TradeSheet({
    mode,
    tokenId = "stonk-watcher",
    tokenName: tokenNameProp,
    symbol: symbolProp,
    imageUrl,
    verified: verifiedProp,
    priceUsd,
    marketCapUsd,
    onClose,
    onTradeConfirmed,
}: Props) {
    const router = useRouter();
  const backgroundScroll = useBackgroundScroll();
    const { cash, buy, sell, positionFor } = usePortfolio();
    const mint = isSolanaAddress(tokenId) ? tokenId : "";
    const { data: detail, loading: detailLoading } = useTokenMarket(mint || undefined);
    const tokenVerified = detail?.token?.verified ?? verifiedProp ?? false;
    const holding = mint ? positionFor(mint) : undefined;
    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            router.back();
        }
    };
    const screenHeight = Dimensions.get("window").height;
    const closingRef = useRef(false);

    const sheetTranslateY = useRef(
        new Animated.Value(screenHeight)
    ).current;

    useEffect(() => {
        Animated.spring(sheetTranslateY, {
            toValue: 0,
            damping: 25,
            stiffness: 230,
            mass: 1,
            useNativeDriver: true,
        }).start();
    }, [sheetTranslateY]);
    const closeSheet = () => {
        if (closingRef.current) return;
        closingRef.current = true;
        Animated.timing(sheetTranslateY, {
            toValue: screenHeight,
            duration: 220,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) handleClose();
            else closingRef.current = false;
        });
    };

    const closeSheetRef = useRef(closeSheet);
    closeSheetRef.current = closeSheet;

    const handlePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gesture) =>
                gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
            onPanResponderTerminationRequest: () => false,

            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) {
                    sheetTranslateY.setValue(gesture.dy);
                }
            },

            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > 110 || gesture.vy > 1.1) {
                    closeSheetRef.current();
                } else {
                    Animated.spring(sheetTranslateY, {
                        toValue: 0,
                        damping: 25,
                        stiffness: 230,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(sheetTranslateY, {
                    toValue: 0, damping: 25, stiffness: 230, useNativeDriver: true,
                }).start();
            },
        })
    ).current;
    const isBuy = mode === "buy";
    const tokenName =
        tokenNameProp ||
        detail?.token?.name ||
        tokenNames[tokenId] ||
        tokenId
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    const symbol = (symbolProp || detail?.token?.symbol || "TOKEN").replace(/^\$/, "");
    const livePrice =
        priceUsd ||
        detail?.market?.priceUsd ||
        detail?.token?.market?.priceUsd ||
        holding?.lastPriceUsd ||
        0;
    const liveMcap =
        marketCapUsd ||
        detail?.market?.marketCapUsd ||
        detail?.token?.market?.marketCapUsd ||
        null;
    const logo = imageUrl || detail?.token?.imageUrl || detail?.token?.logoUrl;
    const sellPnl = holding ? positionPnl(holding, livePrice) : null;

    const available = isBuy
        ? cash
        : holding
          ? positionValue(holding, livePrice)
          : 0;

    const [amount, setAmount] = useState("");
    const [selectedPercent, setSelectedPercent] =
        useState<number | null>(null);
    const [sliderWidth, setSliderWidth] = useState(0);

    const slideX = useRef(new Animated.Value(0)).current;
    const THUMB_WIDTH = 54;
    const slideMax = Math.max(0, sliderWidth - THUMB_WIDTH);
    // One animated value drives both the handle and the gradient's right edge.
    const animatedFillWidth = slideX.interpolate({
        inputRange: [0, Math.max(1, slideMax)],
        outputRange: [THUMB_WIDTH, Math.max(THUMB_WIDTH, sliderWidth)],
        extrapolate: "clamp",
    });

    const numericAmount = Number(amount) || 0;
    const validAmount =
        numericAmount > 0 && numericAmount <= available;

    const tokenAmount = livePrice > 0 ? numericAmount / livePrice : 0;
    const estimatedOutput = Math.max(
        0,
        numericAmount - MOCK_TRADE_FEE
    );

    function resetSlider() {
        Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: false,
            tension: 90,
            friction: 12,
        }).start();
    }

    function confirmDemoTrade() {
        if (!validAmount || closingRef.current) return;
        if (!(livePrice > 0)) {
            Alert.alert("Demo trade", "No live price yet for this token.");
            return;
        }
        if (!mint) {
            Alert.alert("Demo trade", "Open a live token to paper-trade it.");
            return;
        }

        const result = (isBuy ? buy : sell)({
            mint,
            name: tokenName,
            symbol,
            imageUrl: logo,
            verified: tokenVerified === true,
            amountUsd: numericAmount,
            priceUsd: livePrice,
            marketCapUsd: liveMcap,
        });
        if (!result.ok) {
            Alert.alert("Demo trade", result.error);
            resetSlider();
            return;
        }

        closingRef.current = true;

        Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
        );

        if (onTradeConfirmed) {
            onTradeConfirmed(mode, tokenId, numericAmount);
        } else {
            closingRef.current = false;
            closeSheetRef.current();
        }
    }

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => validAmountRef.current,

            onMoveShouldSetPanResponder: (_, gesture) =>
                validAmountRef.current && Math.abs(gesture.dx) > 3,

            onPanResponderTerminationRequest: () => false,

            onPanResponderMove: (_, gesture) => {
                const next = Math.max(
                    0,
                    Math.min(gesture.dx, slideMaxRef.current)
                );

                slideValueRef.current.setValue(next);
            },

            onPanResponderRelease: (_, gesture) => {
                const reachedEnd =
                    slideMaxRef.current > 0 &&
                    gesture.dx >= slideMaxRef.current * 0.8;

                if (validAmountRef.current && reachedEnd) {
                    slideValueRef.current.setValue(0);
                    confirmRef.current();
                } else {
                    Animated.spring(slideValueRef.current, {
                        toValue: 0,
                        useNativeDriver: false,
                        tension: 90,
                        friction: 12,
                    }).start();
                }
            },

            onPanResponderTerminate: () => {
                Animated.spring(slideValueRef.current, {
                    toValue: 0,
                    useNativeDriver: false,
                    tension: 90,
                    friction: 12,
                }).start();
            },
        })
    ).current;

    // Refs keep the gesture handlers synchronized with current state.
    const slideValueRef = useRef(slideX);
    const slideMaxRef = useRef(slideMax);
    const validAmountRef = useRef(validAmount);
    const confirmRef = useRef(confirmDemoTrade);

    slideMaxRef.current = slideMax;
    validAmountRef.current = validAmount;
    confirmRef.current = confirmDemoTrade;

    function appendDigit(digit: string) {
        setSelectedPercent(null);
        setAmount((previous) => {
            if (digit === ".") {
                if (previous.includes(".")) return previous;
                return previous ? `${previous}.` : "0.";
            }

            const decimals = previous.split(".")[1];
            if (decimals !== undefined && decimals.length >= 2) {
                return previous;
            }

            if (previous === "0") return digit;
            return `${previous}${digit}`;
        });
        resetSlider();
    }

    function deleteDigit() {
        setSelectedPercent(null);
        setAmount((previous) => previous.slice(0, -1));
        resetSlider();
    }

    function selectPercentage(percent: number) {
        setSelectedPercent(percent);
        setAmount(((available * percent) / 100).toFixed(2));
        resetSlider();
    }

    return (
        <View style={styles.overlay}>
            <BlurView
                intensity={60}
                tint="dark"
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closeSheet}
            />

            <Animated.View
                style={[
                    styles.sheet,
                    {
                        transform: [
                            { translateY: sheetTranslateY },
                        ],
                    },
                ]}
            >
                <LinearGradient
                    colors={[
                        COLORS.stonkDarkestG,
                        COLORS.black,
                        COLORS.black,
                    ]}
                    style={StyleSheet.absoluteFill}
                />

                <View
                    {...handlePanResponder.panHandlers}
                    style={styles.handleTouchArea}
                >
                    <View style={styles.handle} />
                </View>

                <ScrollView {...backgroundScroll} scrollEventThrottle={32}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
                    contentContainerStyle={styles.content}
                >
                    {detailLoading && !detail && !tokenNameProp ? <SkeletonRows count={1} /> : <View style={styles.header}>
                        <View style={styles.tokenIcon}>
                            <TokenImage uri={logo} mint={mint || tokenId} style={styles.tokenIconImage} />
                        </View>

                        <View style={styles.tokenDetails}>
                            <View style={styles.nameRow}>
                                <Text localize={false}
                                    style={styles.tokenName}
                                    numberOfLines={1}
                                >
                                    {tokenName}
                                </Text>
                                {tokenVerified === true && <BadgeCheck
                                    size={17}
                                    color={COLORS.stonkGreen}
                                />}
                            </View>

                            <Text style={styles.marketCap}>
                                {compactUsd(liveMcap)}
                            </Text>
                        </View>

                        <View style={styles.priceBlock}>
                            <Text style={styles.tokenPrice}>
                                {formatPrice(livePrice)}
                            </Text>
                            <Text style={styles.change}>
                                Demo paper trade
                            </Text>
                        </View>


                    </View>}

                    <View style={styles.amountSection}>
                        <Text
                            style={[
                                styles.amountText,
                                !validAmount && styles.emptyAmount,
                            ]}
                            adjustsFontSizeToFit
                            numberOfLines={1}
                        >
                            ${amount ? formatMoney(numericAmount) : "0"}
                        </Text>

                        <View style={styles.tokenQuantityRow}>
                            <Text localize={false} style={styles.tokenQuantity}>
                                {formatTokenAmount(tokenAmount)} {prettySymbol(symbol)}
                            </Text>
                            <ArrowLeftRight
                                size={17}
                                color={COLORS.grey}
                            />
                        </View>
                    </View>

                    <View style={styles.availableRow}>
                        <Text style={styles.availableLabel}>
                            Available
                        </Text>
                        <Text style={styles.availableValue}>
                            ${formatMoney(available)}
                        </Text>
                        {!isBuy && sellPnl ? (
                            <Text style={styles.profitText}>
                                {sellPnl.pnl >= 0 ? "+" : ""}
                                {sellPnl.pnl.toLocaleString("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                })}
                            </Text>
                        ) : null}
                    </View>

                    <View style={styles.percentRow}>
                        {[10, 25, 50, 100].map((percent) => {
                            const active = selectedPercent === percent;
                            return (
                                <Pressable
                                    key={percent}
                                    onPress={() => selectPercentage(percent)}
                                    style={[
                                        styles.percentButton,
                                        active && {
                                            backgroundColor: COLORS.stonkLightG,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.percentText,
                                            active && { color: COLORS.black },
                                        ]}
                                    >
                                        {percent === 100 ? "Max" : `${percent}%`}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <View style={styles.keypad}>
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                            (digit) => (
                                <Pressable
                                    key={digit}
                                    style={styles.key}
                                    onPress={() => appendDigit(digit)}
                                >
                                    <Text style={styles.keyText}>
                                        {digit}
                                    </Text>
                                </Pressable>
                            )
                        )}

                        <Pressable
                            style={styles.key}
                            onPress={() => appendDigit(".")}
                        >
                            <Text style={styles.keyText}>.</Text>
                        </Pressable>

                        <Pressable
                            style={styles.key}
                            onPress={() => appendDigit("0")}
                        >
                            <Text style={styles.keyText}>0</Text>
                        </Pressable>

                        <Pressable
                            style={styles.key}
                            onPress={deleteDigit}
                        >
                            <Delete
                                size={27}
                                color={COLORS.white}
                            />
                        </Pressable>
                    </View>

                    <View style={styles.details}>
                        <Text style={styles.detailsTitle}>
                            Details
                        </Text>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                                Fee
                            </Text>
                            <Text style={styles.detailValue}>
                                {validAmount ? `$${MOCK_TRADE_FEE.toFixed(2)}` : "–"}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                                Price Impact
                            </Text>
                            <Text style={styles.detailValue}>
                                {validAmount ? "2.80%" : "–"}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                                Estimated Output
                            </Text>
                            <Text localize={false}
                                style={[
                                    styles.detailValue,
                                    validAmount && {
                                        color: COLORS.stonkGreen,
                                    },
                                ]}
                            >
                                {validAmount
                                    ? isBuy
                                        ? `${formatTokenAmount(
                                            livePrice > 0 ? estimatedOutput / livePrice : 0
                                        )} ${prettySymbol(symbol)}`
                                        : `$${formatMoney(estimatedOutput)}`
                                    : "–"}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>
                                Slippage
                            </Text>
                            <Text
                                style={[
                                    styles.detailValue,
                                    { color: COLORS.stonkGreen },
                                ]}
                            >
                                Auto
                            </Text>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.sliderTrack,
                            !validAmount && styles.sliderDisabled,
                        ]}
                        onLayout={(event) =>
                            setSliderWidth(event.nativeEvent.layout.width)
                        }
                    >
                        {/* The gradient grows with the draggable thumb. */}
                        <Animated.View
                            pointerEvents="none"
                            style={[styles.sliderFill, { width: animatedFillWidth }]}
                        >
                            <LinearGradient
                                colors={
                                    validAmount
                                        ? isBuy
                                            ? ["#003D2C", "#00D492"]
                                            : ["#260B07", "#FF5945"]
                                        : ["#303030", "#555555"]
                                }
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>

                        <Text style={styles.sliderLabel} pointerEvents="none">
                            {validAmount ? `Slide to ${mode}` : "Enter an amount"}
                        </Text>

                        <Animated.View
                            {...panResponder.panHandlers}
                            style={[
                                styles.sliderThumb,
                                { transform: [{ translateX: slideX }] },
                            ]}
                        >
                            <LinearGradient
                                pointerEvents="none"
                                colors={
                                    validAmount
                                        ? isBuy
                                            ? ["#00A87B", "#00D492"]
                                            : ["#D94B3A", "#FF5945"]
                                        : ["#555555", "#444444"]
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <ChevronsRight size={25} color={COLORS.black} />
                        </Animated.View>
                    </View>

                    <Text style={styles.demoNote}>
                        Demo paper trade only. Buys show in your portfolio and position.
                    </Text>
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFill,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0, 0, 0, 0.35)",
        zIndex: 100,
        elevation: 100,
    },
    sheet: {
        width: "100%",
        maxHeight: "88%",
        borderTopLeftRadius: 34,
        borderTopRightRadius: 34,
        overflow: "hidden",
        backgroundColor: COLORS.black,
    },
    handle: {
        width: 65,
        height: 6,
        borderRadius: 10,
        backgroundColor: "#353535",
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 35,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    tokenIcon: {
        width: 53,
        height: 53,
        borderRadius: 27,
        backgroundColor: COLORS.stonkBlue,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
        overflow: "hidden",
    },
    tokenIconImage: {
        width: "100%",
        height: "100%",
        borderRadius: 27,
    },
    tokenIconText: {
        fontSize: 28,
        fontWeight: "800",
        color: COLORS.stonkGreen,
    },
    tokenDetails: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    tokenName: {
        fontSize: 17,
        color: COLORS.white,
        fontFamily: FONTS.regular,
        fontWeight: "700",
        flexShrink: 1,
    },
    marketCap: {
        fontSize: 18,
        color: COLORS.stonkGreen,
        fontWeight: "700",
        marginTop: 3,
    },
    priceBlock: {
        alignItems: "flex-end",
        marginLeft: 8,
    },
    tokenPrice: {
        fontSize: 13,
        color: COLORS.white,
    },
    change: {
        marginTop: 5,
        fontSize: 11,
        color: COLORS.buy,
    },
    closeButton: {
        padding: 5,
        marginLeft: 6,
    },
    amountSection: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 175,
    },
    amountText: {
        color: COLORS.white,
        fontSize: 45,
        fontWeight: "700",
        fontFamily: FONTS.regular,
    },
    emptyAmount: {
        color: COLORS.charcoal,
    },
    tokenQuantityRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 4,
    },
    tokenQuantity: {
        color: COLORS.grey,
        fontSize: 15,
    },
    availableRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    availableLabel: {
        color: COLORS.shark,
        fontSize: 12,
    },
    availableValue: {
        color: COLORS.white,
        fontSize: 15,
    },
    profitText: {
        color: COLORS.buy,
        fontSize: 12,
    },
    percentRow: {
        flexDirection: "row",
        gap: 5,
        marginBottom: 10,
    },
    percentButton: {
        flex: 1,
        height: 37,
        borderRadius: 5,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.stonkDarkG,
    },
    percentText: {
        color: COLORS.white,
        fontSize: 15,
        fontFamily: FONTS.regular,
    },
    keypad: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        rowGap: 6,
    },
    key: {
        width: "32.5%",
        height: 56,
        backgroundColor: "#111111",
        borderRadius: 5,
        alignItems: "center",
        justifyContent: "center",
    },
    keyText: {
        color: COLORS.white,
        fontSize: 28,
        fontWeight: "600",
        fontFamily: FONTS.regular,
    },
    details: {
        marginTop: 20,
        marginBottom: 20,
        gap: 7,
    },
    detailsTitle: {
        color: COLORS.white,
        fontSize: 16,
        marginBottom: 3,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    detailLabel: {
        color: COLORS.grey,
        fontSize: 12,
    },
    detailValue: {
        color: COLORS.white,
        fontSize: 12,
    },
    sliderTrack: {
        height: 52,
        borderRadius: 7,
        backgroundColor: "#1A1A1A",
        justifyContent: "center",
        overflow: "hidden",
    },
    sliderFill: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 6,
    },
    sliderDisabled: {
        opacity: 0.65,
    },
    sliderLabel: {
        alignSelf: "center",
        color: COLORS.white,
        fontSize: 16,
    },
    sliderThumb: {
        position: "absolute",
        left: 0,
        width: 54,
        height: 48,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    demoNote: {
        textAlign: "center",
        color: COLORS.shark,
        fontSize: 10,
        marginTop: 12,
    },
    handleTouchArea: {
        height: 38,
        alignItems: "center",
        justifyContent: "center",
    },
});
