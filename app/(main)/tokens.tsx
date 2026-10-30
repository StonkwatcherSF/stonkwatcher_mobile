
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Image,
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
import { useRouter } from "expo-router";

const PLACEHOLDER = require("../../assets/images/placeholder.png");

type Token = {
  id: string;
  name: string;
  symbol: string;
  marketCap: string;
  price: string;
  change: number;
  isNew: boolean;
};

const TOKENS: Token[] = [
  {
    id: "1",
    name: "Stonk Watcher",
    symbol: "STNK",
    marketCap: "$1.32 MC",
    price: "$0.00156",
    change: 20.61,
    isNew: false,
  },
  {
    id: "2",
    name: "Anonymous Cat",
    symbol: "CAT",
    marketCap: "$52.87 MC",
    price: "$0.054631",
    change: -10.23,
    isNew: true,
  },
  {
    id: "3",
    name: "Nullmask",
    symbol: "NULL",
    marketCap: "$28.71 MC",
    price: "$0.028718",
    change: -2.59,
    isNew: false,
  },
  {
    id: "4",
    name: "Super Inu",
    symbol: "INU",
    marketCap: "$15.39 MC",
    price: "$0.0154",
    change: 32.64,
    isNew: true,
  },
];

type Tab = "Trending" | "New";

export default function TokensScreen() {
  const router = useRouter();
  const navScroll = useNavScroll();

  const [activeTab, setActiveTab] =
    useState<Tab>("Trending");

  const [quote, setQuote] = useState("All Quotes");
  const [showQuotes, setShowQuotes] = useState(false);

  const visibleTokens = TOKENS.filter((token) => {
    if (activeTab === "New") {
      return token.isNew;
    }

    return true;
  });

  const openDeposit = () => {
    router.push("/settings/deposit" as any);
  };

  const openToken = (token: Token) => {
    const tokenId = token.name
      .toLowerCase()
      .replace(/\s+/g, "-");

    router.push({
      pathname: "/dex/[tokenId]",
      params: { tokenId },
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
            {["All Quotes", "SOL", "USDC"].map(
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
          {visibleTokens.map((token) => (
            <Pressable
              key={token.id}
              style={styles.tokenCard}
              onPress={() => openToken(token)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${token.name}`}
            >
              {/* TOKEN AVATAR */}
              <View style={styles.tokenAvatar}>
                <Image
                  source={PLACEHOLDER}
                  style={styles.tokenImage}
                  resizeMode="cover"
                />
              </View>

              {/* TOKEN NAME */}
              <View style={styles.tokenDetails}>
                <View style={styles.nameRow}>
                  <Text
                    style={styles.tokenName}
                    numberOfLines={1}
                  >
                    {token.name}
                  </Text>

                  <BadgeCheck
                    size={17}
                    color={COLORS.stonkGreen}
                    strokeWidth={2.2}
                    style={styles.verifiedIcon}
                  />
                </View>

                <Text style={styles.marketCap}>
                  {token.marketCap}
                </Text>
              </View>

              {/* PRICE */}
              <View style={styles.priceDetails}>
                <Text style={styles.price}>
                  {token.price}
                </Text>

                <Text
                  style={[
                    styles.change,
                    {
                      color:
                        token.change >= 0
                          ? COLORS.buy
                          : COLORS.sell,
                    },
                  ]}
                >
                  {token.change >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(token.change).toFixed(2)}%
                </Text>
              </View>
            </Pressable>
          ))}
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
