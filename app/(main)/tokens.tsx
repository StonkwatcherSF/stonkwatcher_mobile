
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { BadgeCheck } from "lucide-react-native";
import {
  COLORS,
  FONTS,
  GRADIENTS,
} from "../../constants/theme";
import { useNavScroll } from "../../components/NavAnimationContext";
import TokenImage from "../../components/TokenImage";
import { useRouter } from "expo-router";
import { QUOTE_FILTERS, type QuoteFilter } from "../../lib/config";
import { formatMc, formatPrice } from "../../lib/format";
import { truncateAddress } from "../../lib/solana";
import { useTokens } from "../../hooks/useTokens";
import type { StonkFunToken } from "../../lib/types";

const PLACEHOLDER = require("../../assets/images/placeholder.png");

type Tab = "Trending" | "New";

export default function TokensScreen() {
  const router = useRouter();
  const navScroll = useNavScroll();

  const [activeTab, setActiveTab] =
    useState<Tab>("Trending");

  const [quote, setQuote] = useState<QuoteFilter>("All Quotes");
  const [showQuotes, setShowQuotes] = useState(false);
  const { data: tokens, loading, error } = useTokens(activeTab, quote);

  const openDeposit = () => {
    router.push("/settings/deposit" as any);
  };

  const openToken = (token: StonkFunToken) => {
    router.push({
      pathname: "/dex/[tokenId]",
      params: { tokenId: token.mint },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={GRADIENTS.tokens}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.balanceGroup}>
            <View style={styles.avatar}>
              <Image
                source={PLACEHOLDER}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.balance}>
              $93,737.34
            </Text>
          </View>

          <Pressable
            style={styles.depositButton}
            onPress={openDeposit}
            accessibilityRole="button"
            accessibilityLabel="Deposit"
          >
            <Text style={styles.depositText}>
              Deposit
            </Text>
          </Pressable>
        </View>

        {/* TRENDING / NEW TABS */}
        <View style={styles.tabContainer}>
          {(["Trending", "New"] as Tab[]).map(
            (tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  activeTab === tab && styles.activeTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab &&
                      styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </Pressable>
            )
          )}
        </View>

        {/* QUOTE SELECTOR */}
        <Pressable
          style={styles.quoteSelector}
          onPress={() => setShowQuotes(!showQuotes)}
        >
          <Text style={styles.quoteText}>
            {quote === "All Quotes"
              ? "Select Quote"
              : quote}
          </Text>

          <Text style={styles.quoteArrow}>
            {showQuotes ? "⌃" : "⌄"}
          </Text>
        </Pressable>

        {showQuotes && (
          <View style={styles.quoteMenu}>
            {QUOTE_FILTERS.map(
              (option) => (
                <Pressable
                  key={option}
                  style={styles.quoteOption}
                  onPress={() => {
                    setQuote(option);
                    setShowQuotes(false);
                  }}
                >
                  <Text style={styles.quoteText}>
                    {option}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        )}

        {/* TOKEN LIST */}
        <ScrollView
          onScroll={navScroll.onScroll}
          onScrollBeginDrag={
            navScroll.onScrollBeginDrag
          }
          onScrollEndDrag={navScroll.onScrollEndDrag}
          scrollEventThrottle={16}
          style={styles.tokenList}
          contentContainerStyle={{
            paddingBottom: 115,
          }}
          showsVerticalScrollIndicator={false}
        >
          {loading && !(tokens?.length) ? (
            <ActivityIndicator color={COLORS.stonkGreen} style={{ marginTop: 28 }} />
          ) : null}
          {error && !(tokens?.length) ? (
            <Text style={styles.marketCap}>{error}</Text>
          ) : null}
          {(tokens ?? []).map((token) => {
            const change = token.market?.priceChange24h ?? 0;
            return (
            <Pressable
              key={token.mint}
              style={styles.tokenCard}
              onPress={() => openToken(token)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${token.name || token.symbol || "token"}`}
            >
              {/* TOKEN AVATAR */}
              <View style={styles.tokenAvatar}>
                <TokenImage
                  uri={token.imageUrl || token.logoUrl}
                  style={styles.tokenImage}
                />
              </View>

              {/* TOKEN NAME */}
              <View style={styles.tokenDetails}>
                <View style={styles.nameRow}>
                  <Text
                    style={styles.tokenName}
                    numberOfLines={1}
                  >
                    {token.name || token.symbol || truncateAddress(token.mint)}
                  </Text>

                  <BadgeCheck
                    size={17}
                    color={COLORS.stonkGreen}
                    strokeWidth={2.2}
                    style={styles.verifiedIcon}
                  />
                </View>

                <Text style={styles.marketCap}>
                  {formatMc(token.market?.marketCapUsd)}
                </Text>
              </View>

              {/* PRICE */}
              <View style={styles.priceDetails}>
                <Text style={styles.price}>
                  {formatPrice(token.market?.priceUsd)}
                </Text>

                <Text
                  style={[
                    styles.change,
                    {
                      color:
                        change >= 0
                          ? COLORS.buy
                          : COLORS.sell,
                    },
                  ]}
                >
                  {change >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(change).toFixed(2)}%
                </Text>
              </View>
            </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101010",
  },

  safeArea: {
    flex: 1,
    paddingHorizontal: 15,
  },

  header: {
    height: 77,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceGroup: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 37,
    height: 37,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
  },

  balance: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
  },

  depositButton: {
    backgroundColor: COLORS.stonkGreen,
    borderRadius: 5,
    paddingHorizontal: 20,
    height: 35,
    justifyContent: "center",
  },

  depositText: {
    color: "#101010",
    fontSize: 13,
    fontWeight: "700",
  },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#202600",
    borderWidth: 1,
    borderColor: "#4B5800",
    borderRadius: 5,
    alignSelf: "flex-start",
    padding: 2,
    marginBottom: 8,
  },

  tab: {
    minWidth: 73,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 3,
  },

  activeTab: {
    backgroundColor: "#F1FFD0",
  },

  tabText: {
    color: "#B9B9B9",
    fontSize: 12,
  },

  activeTabText: {
    color: "#111111",
    fontWeight: "600",
  },

  quoteSelector: {
    backgroundColor: "#222900",
    height: 35,
    borderRadius: 5,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  quoteText: {
    color: "#DADADA",
    fontSize: 13,
  },

  quoteArrow: {
    color: "#DADADA",
    fontSize: 18,
  },

  quoteMenu: {
    backgroundColor: "#262D0C",
    borderRadius: 5,
    marginBottom: 8,
  },

  quoteOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#404A22",
  },

  tokenList: {
    flex: 1,
  },

  tokenCard: {
    height: 67,
    backgroundColor: "#101010",
    borderRadius: 5,
    marginBottom: 5,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  tokenAvatar: {
    width: 47,
    height: 47,
    borderRadius: 24,
    backgroundColor: "#222B16",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },

  tokenImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },

  tokenDetails: {
    flex: 1,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  tokenName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: FONTS.regular,
    flexShrink: 1,
  },

  verifiedIcon: {
    marginLeft: 5,
  },

  marketCap: {
    color: "#9A9A9A",
    fontFamily: FONTS.regular,
    fontSize: 11,
    marginTop: 3,
  },

  priceDetails: {
    alignItems: "flex-end",
  },

  price: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  change: {
    fontSize: 10,
    marginTop: 3,
  },
});
