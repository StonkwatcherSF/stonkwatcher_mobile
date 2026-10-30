import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet, useWindowDimensions, Image } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, useDerivedValue } from "react-native-reanimated";
import { Search } from "lucide-react-native";
import { COLORS } from "../constants/theme";
import { useNavAnimation } from "./NavAnimationContext";
import TokensIcon from "../assets/icons/tokens.svg";
import TracerIcon from "../assets/icons/tracer.svg";
import BlacklistIcon from "../assets/icons/blacklist.svg";
const PLACEHOLDER = require("../assets/images/placeholder.png");
const NAV_HEIGHT = 62;
const NAV_PADDING = 8;
const INDICATOR_HEIGHT = 46;
const SEARCH_SIZE = 62;
const GAP = 10;
const ROUTES = ["/tokens", "/tracer", "/blacklist", "/wallet"] as const;
const ITEMS = [
  { label: "Tokens", Icon: TokensIcon },
  { label: "Tracer", Icon: TracerIcon },
  { label: "Blacklist", Icon: BlacklistIcon },
  { label: "Wallet", Icon: null },
] as const;
export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { compact } = useNavAnimation();
  const totalWidth = Math.min(width - 32, 370);
  const mainWidth = totalWidth - SEARCH_SIZE - GAP;
  const itemWidth = (mainWidth - NAV_PADDING * 2) / 4;
  const activeIndex = pathname.startsWith("/search") ? 4 : pathname.startsWith("/tracer") ? 1 : pathname.startsWith("/blacklist") ? 2 : pathname.startsWith("/wallet") ? 3 : 0;
  const [selectedIndex, setSelectedIndex] = useState(activeIndex);
  const indicatorX = useSharedValue(Math.min(activeIndex, 3) * itemWidth);
  const tapScale = useSharedValue(1);
  const scrollScale = useDerivedValue(() => withTiming(compact.value === 1 ? 0.78 : 1, { duration: 260 }));
  useEffect(() => {
    setSelectedIndex(activeIndex);
    if (activeIndex < 4) indicatorX.value = withTiming(activeIndex * itemWidth, { duration: 230 });
  }, [activeIndex, itemWidth]);
  const wholeNavStyle = useAnimatedStyle(() => ({ transform: [{ scale: scrollScale.value * tapScale.value }] }));
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }], opacity: withTiming(selectedIndex === 4 ? 0 : 1, { duration: 170 }) }));
  function navigate(index: number) {
    compact.value = 0;
    tapScale.value = withSequence(withTiming(0.97, { duration: 75 }), withSpring(1.02, { damping: 16, stiffness: 240, mass: 0.7 }), withTiming(1, { duration: 120 }));
    setSelectedIndex(index);
    if (index < 4) indicatorX.value = withTiming(index * itemWidth, { duration: 230 });
    const target = index === 4 ? "/search" : ROUTES[index];
    if (target && pathname !== target) router.replace(target as any);
  }
  return (
    <Animated.View style={[styles.wrapper, { width: totalWidth }, wholeNavStyle]}>
      <View style={[styles.mainNav, { width: mainWidth }]}>
        <BlurView intensity={65} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
        <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0.17)", "rgba(255,255,255,0.06)", "rgba(187,220,18,0.08)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View pointerEvents="none" style={[styles.indicator, { width: itemWidth }, indicatorStyle]}>
          <LinearGradient colors={["rgba(187,220,18,0.30)", "rgba(187,220,18,0.13)", "rgba(187,220,18,0.20)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.indicatorGlass} />
        </Animated.View>
        <View style={styles.items}>
          {ITEMS.map(({ label, Icon }, index) => (
            <Pressable key={label} style={[styles.item, { width: itemWidth }]} onPress={() => navigate(index)} accessibilityRole="button" accessibilityLabel={label}>
              {Icon ? <Icon width={22} height={22} color={selectedIndex === index ? COLORS.stonkLightG : COLORS.grey} /> : <Image source={PLACEHOLDER} style={styles.walletAvatar} resizeMode="cover" />}
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable style={[styles.searchCircle, selectedIndex === 4 && styles.searchActive]} onPress={() => navigate(4)} accessibilityRole="button" accessibilityLabel="Search">
        {selectedIndex !== 4 && <><BlurView intensity={65} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} /><LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)"]} style={StyleSheet.absoluteFill} /></>}
        <Search size={25} color={selectedIndex === 4 ? "#101010" : COLORS.grey} />
      </Pressable>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  wrapper: { position: "absolute", bottom: 25, alignSelf: "center", height: NAV_HEIGHT, flexDirection: "row", alignItems: "center", gap: GAP, zIndex: 20 },
  mainNav: { height: NAV_HEIGHT, borderRadius: 35, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" },
  indicator: { position: "absolute", left: NAV_PADDING, top: 7, height: INDICATOR_HEIGHT, borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: "rgba(241,248,208,0.45)" },
  indicatorGlass: { flex: 1, borderRadius: 26 },
  items: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: NAV_PADDING },
  item: { height: INDICATOR_HEIGHT, alignItems: "center", justifyContent: "center" },
  walletAvatar: { width: 29, height: 29, borderRadius: 15 },
  searchCircle: { width: SEARCH_SIZE, height: SEARCH_SIZE, borderRadius: SEARCH_SIZE / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" },
  searchActive: { backgroundColor: "#C6E900", borderColor: "#C6E900" },
});
