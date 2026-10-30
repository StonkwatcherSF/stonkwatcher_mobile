import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { BadgeCheck, Search, X } from "lucide-react-native";
import { useNavScroll } from "../../../components/NavAnimationContext";

const LIME = "#C6E900";
const GREEN = "#00D89A";
const RED = "#FF574A";
const SEARCH_BOTTOM = 106;
const KEYBOARD_GAP = 12;

type SearchItem = {
  id: string;
  type: "token" | "user";
  name: string;
  symbol: string;
  subtitle: string;
  avatar: string;
  price: string;
  change: string;
  positive: boolean;
  chart?: boolean;
};

const stonk: SearchItem = { id: "stonk-watcher", type: "token", name: "Stonk Watcher", symbol: "$STWC", subtitle: "$1.32M MC", avatar: "🛡️", price: "$0.00156", change: "20.61%", positive: true, chart: true };
const rasmr: SearchItem = { id: "rasmr", type: "user", name: "Rasmr", symbol: "@rasmr", subtitle: "@rasmr", avatar: "🧑🏻‍💻", price: "$89,432.90", change: "120.43%", positive: true };
const cat: SearchItem = { id: "anonymous-cat", type: "token", name: "Anonymous Cat", symbol: "$ANONCAT", subtitle: "$52.87M MC", avatar: "🐱", price: "$0.054631", change: "10.23%", positive: false, chart: true };
const nullmask: SearchItem = { id: "nullmask", type: "token", name: "Nullmask", symbol: "$NULL", subtitle: "$8.14M MC", avatar: "🎭", price: "$0.028718", change: "4.85%", positive: true, chart: true };
const recent: SearchItem[] = [stonk, rasmr, cat, rasmr];
const users: SearchItem[] = [rasmr, rasmr, rasmr, rasmr];
const tokens: SearchItem[] = [stonk, cat, nullmask];
const allItems: SearchItem[] = [stonk, rasmr, cat, nullmask];

function Sparkline({ positive }: { positive: boolean }) {
  const points = positive
    ? [22, 12, 26, 17, 31, 23, 33, 13, 25, 29, 19, 36, 27, 39]
    : [25, 33, 18, 28, 23, 32, 12, 29, 17, 21, 14, 17, 10, 12];
  const color = positive ? GREEN : RED;
  return (
    <View style={styles.chart} accessible={false}>
      {points.slice(0, -1).map((p, i) => {
        const next = points[i + 1];
        const dx = 4;
        const dy = next - p;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <View key={i} style={{ position: "absolute", left: i * 4, bottom: p, width: length, height: 1.3, backgroundColor: color, transform: [{ rotate: `${-angle}deg` }] }} />
        );
      })}
    </View>
  );
}

function ResultRow({ item, onPress }: { item: SearchItem; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${item.name}`}>
      <View style={[styles.avatar, item.type === "user" && styles.userAvatar]}>
        <Text style={styles.avatarText}>{item.avatar}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameLine}>
          <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
          <BadgeCheck size={13} color={LIME} />
        </View>
        <Text numberOfLines={1} style={styles.subtitle}>{item.subtitle}</Text>
      </View>
      {item.chart && <Sparkline positive={item.positive} />}
      <View style={styles.priceBlock}>
        <Text style={styles.price}>{item.price}</Text>
        <Text style={[styles.change, { color: item.positive ? GREEN : RED }]}>
          {item.positive ? "▲" : "▼"} {item.change}
        </Text>
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const navScroll = useNavScroll();
  const [query, setQuery] = useState("");
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow",
      (event) => {
        const height = Math.max(0, event.endCoordinates.height);
        setKeyboardHeight(height);
        Animated.timing(keyboardOffset, {
          toValue: Math.max(0, height - (SEARCH_BOTTOM - KEYBOARD_GAP)),
          duration: Platform.OS === "ios" ? (event.duration || 250) : 180,
          useNativeDriver: true,
        }).start();
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      (event) => {
        setKeyboardHeight(0);
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: Platform.OS === "ios" ? (event.duration || 250) : 180,
          useNativeDriver: true,
        }).start();
      }
    );
    return () => { show.remove(); hide.remove(); };
  }, [keyboardOffset]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return allItems.filter((item) => [item.name, item.symbol, item.subtitle].some((value) => value.toLowerCase().includes(term)));
  }, [query]);

  function openItem(item: SearchItem) {
    Keyboard.dismiss();
    if (item.type === "token") {
      Alert.alert("Demo token", `${item.name} is sample search data. Live token details are not connected yet.`);
    } else {
      Alert.alert("Demo profile", `${item.name} is a sample user profile.`);
    }
  }

  const searching = query.trim().length > 0;
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, keyboardHeight > 0 && { paddingBottom: keyboardHeight + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        scrollEventThrottle={16}
        onScroll={navScroll.onScroll}
        onScrollBeginDrag={navScroll.onScrollBeginDrag}
        onScrollEndDrag={navScroll.onScrollEndDrag}
      >
        {searching ? (
          <>
            <Text style={styles.sectionTitle}>Search Results</Text>
            <Text style={styles.resultCount}>{filtered.length} demo {filtered.length === 1 ? "result" : "results"}</Text>
            {filtered.length ? filtered.map((item) => <ResultRow key={item.id} item={item} onPress={() => openItem(item)} />) : (
              <View style={styles.empty}>
                <Search size={28} color="#777" />
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptySubtitle}>Try a token name, symbol, or username.</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Recent</Text>
            {recent.map((item, index) => <ResultRow key={`recent-${index}`} item={item} onPress={() => openItem(item)} />)}
            <Text style={[styles.sectionTitle, styles.sectionGap]}>Users</Text>
            {users.map((item, index) => <ResultRow key={`user-${index}`} item={item} onPress={() => openItem(item)} />)}
            <Text style={[styles.sectionTitle, styles.sectionGap]}>Tokens</Text>
            {tokens.map((item, index) => <ResultRow key={`token-${index}`} item={item} onPress={() => openItem(item)} />)}
          </>
        )}
        <Text style={styles.demoNote}>Demo data • Prices, accounts, and changes are illustrative.</Text>
      </ScrollView>

      <Animated.View
        style={[
          styles.searchWrap,
          { transform: [{ translateY: keyboardOffset.interpolate({ inputRange: [0, 1000], outputRange: [0, -1000], extrapolate: "clamp" }) }] },
        ]}
      >
        <Search size={17} color="#BEBEBE" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search token or user"
          placeholderTextColor="#C9C9C9"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
          accessibilityLabel="Search token or user"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} accessibilityLabel="Clear search">
            <X size={18} color="#D8D8D8" />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#101108" },
  scroll: { flex: 1 },
  content: { paddingTop: 49, paddingHorizontal: 17, paddingBottom: 175 },
  sectionTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "500", marginBottom: 10 },
  sectionGap: { marginTop: 25 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#121212", borderRadius: 6, minHeight: 72, marginBottom: 5, paddingHorizontal: 9, gap: 9 },
  avatar: { width: 45, height: 45, borderRadius: 24, backgroundColor: "#13292A", alignItems: "center", justifyContent: "center" },
  userAvatar: { backgroundColor: "#263443" },
  avatarText: { fontSize: 27 },
  info: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { color: "#FFFFFF", fontSize: 12, fontWeight: "700", flexShrink: 1 },
  subtitle: { color: "#B7B7B7", fontSize: 10, marginTop: 5 },
  chart: { width: 54, height: 47, overflow: "hidden", marginRight: 1 },
  priceBlock: { minWidth: 77, alignItems: "flex-end" },
  price: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  change: { fontSize: 10, marginTop: 6 },
  resultCount: { color: "#AFAFAF", fontSize: 11, marginBottom: 12 },
  empty: { alignItems: "center", paddingVertical: 70, gap: 9 },
  emptyTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  emptySubtitle: { color: "#AAAAAA", fontSize: 12 },
  demoNote: { color: "#8F8F8F", textAlign: "center", fontSize: 10, marginTop: 20 },
  searchWrap: { position: "absolute", bottom: SEARCH_BOTTOM, left: 28, right: 28, height: 45, backgroundColor: "rgba(66,67,61,0.89)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13 },
  searchInput: { flex: 1, height: "100%", color: "#FFFFFF", fontSize: 13, paddingVertical: 0 },
});
