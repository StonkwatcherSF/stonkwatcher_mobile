import React, { useEffect, useState } from "react";
import {
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
import TokenImage from "../../../components/TokenImage";
import {
  useDebouncedValue,
  useSearchRecents,
  useSearchTokens,
  useTrendingTokens,
  type SearchRecent,
} from "../../../hooks/useSearchTokens";
import { formatMc, formatPrice, prettySymbol } from "../../../lib/format";
import { dexHref } from "../../../lib/nav";
import { tokenMint, truncateAddress } from "../../../lib/solana";
import type { StonkFunToken } from "../../../lib/types";

const LIME = "#C6E900";
const GREEN = "#00D89A";
const RED = "#FF574A";
const SEARCH_BOTTOM = 106;
const KEYBOARD_GAP = 12;

type SearchItem = {
  id: string;
  name: string;
  symbol: string;
  subtitle: string;
  imageUrl?: string;
  price: string;
  change: number;
  positive: boolean;
  chart?: boolean;
};

function toItem(token: StonkFunToken): SearchItem {
  const change = token.market?.priceChange24h ?? 0;
  const mint = tokenMint(token);
  return {
    id: mint,
    name: token.name || token.symbol || truncateAddress(mint),
    symbol: prettySymbol(token.symbol) || truncateAddress(mint, 4),
    subtitle: formatMc(token.market?.marketCapUsd),
    imageUrl: token.imageUrl || token.logoUrl,
    price: formatPrice(token.market?.priceUsd),
    change,
    positive: change >= 0,
    chart: true,
  };
}

function fromRecent(item: SearchRecent): SearchItem {
  const change = item.change ?? 0;
  return {
    id: item.mint,
    name: item.name,
    symbol: prettySymbol(item.symbol) || item.symbol,
    subtitle: formatMc(item.marketCapUsd),
    imageUrl: item.imageUrl,
    price: formatPrice(item.priceUsd),
    change,
    positive: change >= 0,
    chart: true,
  };
}

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
  const initial = item.name.slice(0, 1).toUpperCase();
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${item.name}`}>
      <View style={styles.avatar}>
        {item.imageUrl ? (
          <TokenImage uri={item.imageUrl} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{initial}</Text>
        )}
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
          {item.positive ? "▲" : "▼"} {Math.abs(item.change).toFixed(2)}%
        </Text>
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const navScroll = useNavScroll();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query);
  const [keyboardOffset] = useState(() => new Animated.Value(0));
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { data: results, loading } = useSearchTokens(debounced);
  const { data: trending } = useTrendingTokens(8);
  const { recents, remember } = useSearchRecents();

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

  function openItem(item: SearchItem) {
    Keyboard.dismiss();
    void remember({
      mint: item.id,
      name: item.name,
      symbol: item.symbol,
      imageUrl: item.imageUrl,
      priceUsd: Number(item.price.replace(/[^0-9.]/g, "")) || undefined,
      marketCapUsd: undefined,
      change: item.change,
    });
    if (!item.id) return;
    router.push(dexHref(item.id));
  }

  const searching = query.trim().length > 0;
  const filtered = (results ?? []).map(toItem);
  const recentItems = recents.map(fromRecent);
  const tokenItems = (trending ?? []).map(toItem);

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
            <Text style={styles.resultCount}>{loading ? "Searching…" : `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`}</Text>
            {filtered.length ? filtered.map((item) => <ResultRow key={item.id} item={item} onPress={() => openItem(item)} />) : (
              !loading ? (
              <View style={styles.empty}>
                <Search size={28} color="#777" />
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptySubtitle}>Try a token name, symbol, or mint address.</Text>
              </View>
              ) : null
            )}
          </>
        ) : (
          <>
            {recentItems.length ? (
              <>
                <Text style={styles.sectionTitle}>Recent</Text>
                {recentItems.map((item, index) => <ResultRow key={`recent-${item.id}-${index}`} item={item} onPress={() => openItem(item)} />)}
              </>
            ) : null}
            <Text style={[styles.sectionTitle, recentItems.length ? styles.sectionGap : undefined]}>Tokens</Text>
            {tokenItems.map((item) => <ResultRow key={`token-${item.id}`} item={item} onPress={() => openItem(item)} />)}
          </>
        )}
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
  avatar: { width: 45, height: 45, borderRadius: 24, backgroundColor: "#13292A", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
  avatarText: { fontSize: 18, color: "#FFFFFF", fontWeight: "700" },
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
