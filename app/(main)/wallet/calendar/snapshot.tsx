
import React, { useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    BadgeCheck,
    Send,
    ShieldCheck,
} from "lucide-react-native";
import * as Sharing from "expo-sharing";
import ViewShot, { captureRef } from "react-native-view-shot";
import {
    COLORS,
    FONTS,
} from "../../../../constants/theme";
import GlassButton from "../../../../components/GlassButton";

type ThemeKey =
    | "green"
    | "darkGreen"
    | "lightBlue"
    | "darkBlue";

type Period = "24 Hours" | "All Time";

const THEMES: Record<
    ThemeKey,
    {
        outer: string;
        inner: string;
        text: string;
        secondary: string;
    }
> = {
    green: {
        outer: "#BBDC12",
        inner: "#F1F8D0",
        text: "#242A03",
        secondary: "#585757",
    },
    darkGreen: {
        outer: "#131602",
        inner: "#242A03",
        text: "#F1F8D0",
        secondary: "#C0C0C0",
    },
    lightBlue: {
        outer: "#22396F",
        inner: "#D3D7E2",
        text: "#131F3D",
        secondary: "#585757",
    },
    darkBlue: {
        outer: "#070B15",
        inner: "#131F3D",
        text: "#F1F8D0",
        secondary: "#C0C0C0",
    },
};

const THEME_OPTIONS: {
    key: ThemeKey;
    color: string;
}[] = [
        { key: "green", color: "#BBDC12" },
        { key: "darkGreen", color: "#131602" },
        { key: "lightBlue", color: "#22396F" },
        { key: "darkBlue", color: "#131F3D" },
    ];

const SAMPLE = {
    username: "rasmr",
    handle: "@rasmr",
    token: "STONK",
    symbol: "$STONK",
    address: "6GmAFS...MpUNgx",
    rewards24h: "19.82 STONK",
    rewardsAll: "687.36 STONK",
    value24h: "$2.16",
    valueAll: "$155.76",
    marketCap: "$86.6M",
    holding: "21.51M",
    rewardType: "StonkFun Fee Share",
};

export default function SnapshotScreen() {
    const router = useRouter();
    const shotRef = useRef<React.ElementRef<typeof ViewShot>>(null);

    const [themeKey, setThemeKey] =
        useState<ThemeKey>("green");
    const [period, setPeriod] =
        useState<Period>("24 Hours");
    const [sharing, setSharing] = useState(false);

    const theme = THEMES[themeKey];
    const is24h = period === "24 Hours";

    async function shareSnapshot() {
        if (sharing) return;

        try {
            setSharing(true);

            const available = await Sharing.isAvailableAsync();

            if (!available) {
                Alert.alert(
                    "Sharing unavailable",
                    "Sharing is not supported on this device."
                );
                return;
            }

            if (!shotRef.current) {
                throw new Error("Snapshot is not ready.");
            }

            const uri = await captureRef(shotRef.current, {
                format: "png",
                quality: 1,
                result: "tmpfile",
            });

            if (!uri) {
                throw new Error("Could not capture snapshot.");
            }

            await Sharing.shareAsync(uri, {
                mimeType: "image/png",
                UTI: "public.png",
                dialogTitle: "Share Stonk Watcher Snapshot",
            });
        } catch (error) {
            Alert.alert(
                "Snapshot error",
                error instanceof Error
                    ? error.message
                    : "Something went wrong."
            );
        } finally {
            setSharing(false);
        }
    }

    return (
        <View style={styles.root}>
            <View style={styles.back}>
                <GlassButton
                    icon={
                        <ArrowLeft
                            size={22}
                            color={COLORS.white}
                        />
                    }
                    onPress={() => router.back()}
                    accessibilityLabel="Close snapshot"
                    size={42}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.periodSwitch}>
                    {(["24 Hours", "All Time"] as Period[]).map(
                        (item) => (
                            <Pressable
                                key={item}
                                onPress={() => setPeriod(item)}
                                style={[
                                    styles.periodButton,
                                    period === item &&
                                    styles.periodSelected,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.periodText,
                                        period === item &&
                                        styles.periodSelectedText,
                                    ]}
                                >
                                    {item}
                                </Text>
                            </Pressable>
                        )
                    )}
                </View>

                <ViewShot
                    ref={shotRef}
                    options={{
                        format: "png",
                        quality: 1,
                        result: "tmpfile",
                    }}
                    style={styles.captureArea}
                >
                    <View
                        collapsable={false}
                        style={[
                            styles.snapshotCard,
                            { backgroundColor: theme.outer },
                        ]}
                    >
                        <View style={styles.profileRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    👨🏻‍💻
                                </Text>
                            </View>

                            <View style={styles.profileInfo}>
                                <View style={styles.nameRow}>
                                    <Text
                                        style={[
                                            styles.username,
                                            { color: theme.text },
                                        ]}
                                    >
                                        {SAMPLE.username}
                                    </Text>
                                    <BadgeCheck
                                        size={20}
                                        color={COLORS.stonkGreen}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.handle,
                                        { color: theme.text },
                                    ]}
                                >
                                    {SAMPLE.handle}
                                </Text>
                            </View>

                            <View style={styles.brandIcon}>
                                <ShieldCheck
                                    size={23}
                                    color={COLORS.stonkGreen}
                                />
                            </View>
                        </View>

                        <View
                            style={[
                                styles.snapshotBody,
                                { backgroundColor: theme.inner },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.heading,
                                    { color: theme.text },
                                ]}
                            >
                                {is24h
                                    ? "24H Reward Snapshot"
                                    : "All Time Reward Snapshot"}
                            </Text>

                            <View style={styles.tokenRow}>
                                <View style={styles.tokenIcon}>
                                    <Text style={styles.tokenLetter}>
                                        S
                                    </Text>
                                </View>

                                <View style={styles.tokenInfo}>
                                    <View style={styles.tokenTitleRow}>
                                        <Text
                                            style={[
                                                styles.tokenName,
                                                { color: theme.text },
                                            ]}
                                        >
                                            {SAMPLE.token}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.symbol,
                                                { color: theme.text },
                                            ]}
                                        >
                                            • {SAMPLE.symbol}
                                        </Text>
                                        <View style={styles.official}>
                                            <BadgeCheck
                                                size={12}
                                                color={COLORS.stonkDarkG}
                                            />
                                            <Text style={styles.officialText}>
                                                Official
                                            </Text>
                                        </View>
                                    </View>

                                    <Text
                                        style={[
                                            styles.address,
                                            { color: theme.secondary },
                                        ]}
                                    >
                                        {SAMPLE.address}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.metrics}>
                                <View style={styles.metric}>
                                    <Text
                                        style={[
                                            styles.metricLabel,
                                            { color: theme.text },
                                        ]}
                                    >
                                        Total Rewards
                                    </Text>
                                    <Text
                                        style={[
                                            styles.metricValue,
                                            { color: theme.text },
                                        ]}
                                    >
                                        {is24h
                                            ? SAMPLE.rewards24h
                                            : SAMPLE.rewardsAll}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.metricSmall,
                                            { color: theme.text },
                                        ]}
                                    >
                                        {is24h
                                            ? SAMPLE.value24h
                                            : SAMPLE.valueAll}
                                    </Text>
                                </View>

                                <View style={styles.metric}>
                                    <Text
                                        style={[
                                            styles.metricLabel,
                                            { color: theme.text },
                                        ]}
                                    >
                                        Market Cap
                                    </Text>
                                    <Text
                                        style={[
                                            styles.metricValue,
                                            { color: theme.text },
                                        ]}
                                    >
                                        {SAMPLE.marketCap}
                                    </Text>
                                </View>

                                <View style={styles.metric}>
                                    <Text
                                        style={[
                                            styles.metricLabel,
                                            { color: theme.text },
                                        ]}
                                    >
                                        Holding
                                    </Text>
                                    <Text
                                        style={[
                                            styles.metricValue,
                                            { color: theme.text },
                                        ]}
                                    >
                                        {SAMPLE.holding}
                                    </Text>
                                </View>

                                <View style={styles.metric}>
                                    <Text
                                        style={[
                                            styles.metricLabel,
                                            { color: theme.text },
                                        ]}
                                    >
                                        Reward type
                                    </Text>
                                    <Text
                                        style={[
                                            styles.metricValue,
                                            { color: theme.text },
                                        ]}
                                    >
                                        {SAMPLE.rewardType}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.footer}>
                                <Text
                                    style={[
                                        styles.footerText,
                                        { color: theme.text },
                                    ]}
                                >
                                    Demo Snapshot
                                </Text>
                                <Text
                                    style={[
                                        styles.footerText,
                                        { color: theme.text },
                                    ]}
                                >
                                    stonkwatcher app
                                </Text>
                            </View>
                        </View>
                    </View>
                </ViewShot>

                <View style={styles.customizationRow}>
                    <View style={styles.palette}>
                        {THEME_OPTIONS.map((option) => (
                            <Pressable
                                key={option.key}
                                onPress={() => setThemeKey(option.key)}
                                accessibilityLabel={`${option.key} theme`}
                                style={[
                                    styles.swatch,
                                    { backgroundColor: option.color },
                                    themeKey === option.key &&
                                    styles.activeSwatch,
                                ]}
                            />
                        ))}
                    </View>

                    <GlassButton
                        icon={
                            sharing ? (
                                <ActivityIndicator
                                    color={COLORS.white}
                                />
                            ) : (
                                <Send
                                    size={20}
                                    color={COLORS.white}
                                />
                            )
                        }
                        onPress={shareSnapshot}
                        disabled={sharing}
                        accessibilityLabel="Share snapshot"
                        size={49}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#090A08",
    },
    back: {
        position: "absolute",
        top: 55,
        left: 20,
        zIndex: 10,
    },
    content: {
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 18,
        paddingTop: 110,
        paddingBottom: 120,
    },
    periodSwitch: {
        flexDirection: "row",
        alignSelf: "center",
        borderWidth: 1,
        borderColor: COLORS.stonkGreen,
        borderRadius: 5,
        padding: 2,
        marginBottom: 24,
        backgroundColor: COLORS.stonkDarkG,
    },
    periodButton: {
        paddingHorizontal: 23,
        paddingVertical: 11,
        borderRadius: 3,
    },
    periodSelected: {
        backgroundColor: COLORS.stonkLightG,
    },
    periodText: {
        fontFamily: FONTS.regular,
        fontSize: 14,
        color: COLORS.white,
    },
    periodSelectedText: {
        color: COLORS.black,
        fontWeight: "700",
    },
    captureArea: {
        width: "100%",
    },
    snapshotCard: {
        borderRadius: 12,
        padding: 12,
        overflow: "hidden",
    },
    profileRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        marginBottom: 14,
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: COLORS.stonkDarkB,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        fontSize: 28,
    },
    profileInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    username: {
        fontFamily: FONTS.regular,
        fontSize: 25,
        fontWeight: "700",
    },
    handle: {
        fontFamily: FONTS.regular,
        fontSize: 13,
    },
    brandIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: COLORS.stonkDarkB,
        alignItems: "center",
        justifyContent: "center",
    },
    snapshotBody: {
        borderRadius: 7,
        padding: 16,
        minHeight: 310,
    },
    heading: {
        fontFamily: FONTS.regular,
        fontSize: 17,
        fontWeight: "700",
        marginBottom: 20,
    },
    tokenRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 25,
    },
    tokenIcon: {
        width: 45,
        height: 45,
        borderRadius: 23,
        backgroundColor: COLORS.stonkDarkestB,
        alignItems: "center",
        justifyContent: "center",
    },
    tokenLetter: {
        fontFamily: FONTS.regular,
        fontSize: 27,
        fontWeight: "800",
        color: COLORS.stonkLightB,
    },
    tokenInfo: {
        flex: 1,
    },
    tokenTitleRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 4,
    },
    tokenName: {
        fontFamily: FONTS.regular,
        fontSize: 18,
        fontWeight: "700",
    },
    symbol: {
        fontFamily: FONTS.regular,
        fontSize: 11,
    },
    official: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        borderRadius: 20,
        backgroundColor: COLORS.stonkLightG,
        borderWidth: 1,
        borderColor: COLORS.stonkDarkG,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    officialText: {
        fontFamily: FONTS.regular,
        fontSize: 10,
        color: COLORS.stonkDarkG,
    },
    address: {
        fontFamily: FONTS.regular,
        fontSize: 11,
        marginTop: 5,
    },
    metrics: {
        flexDirection: "row",
        flexWrap: "wrap",
        rowGap: 25,
        marginBottom: 25,
    },
    metric: {
        width: "50%",
        paddingRight: 5,
    },
    metricLabel: {
        fontFamily: FONTS.regular,
        fontSize: 12,
    },
    metricValue: {
        fontFamily: FONTS.regular,
        fontSize: 18,
        fontWeight: "700",
        marginTop: 4,
    },
    metricSmall: {
        fontFamily: FONTS.regular,
        fontSize: 10,
        marginTop: 2,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 5,
    },
    footerText: {
        fontFamily: FONTS.regular,
        fontSize: 9,
    },
    customizationRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        marginTop: 22,
    },
    palette: {
        flexDirection: "row",
        gap: 10,
        padding: 12,
        backgroundColor: COLORS.stonkLightG,
        borderRadius: 12,
    },
    swatch: {
        width: 27,
        height: 27,
        borderRadius: 14,
    },
    activeSwatch: {
        borderWidth: 3,
        borderColor: COLORS.white,
    },
});
