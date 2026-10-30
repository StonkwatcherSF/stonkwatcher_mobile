
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { List } from "lucide-react-native";
import { useNavScroll } from "../../../components/NavAnimationContext";
import TokenImage from "../../../components/TokenImage";
import { useVolumeLeaders } from "../../../hooks/useVolumeLeaders";
import { useNewLaunches } from "../../../hooks/useNewLaunches";
import { compactUsd, formatAge, formatCount, formatMc, prettySymbol } from "../../../lib/format";
import { isSolanaAddress, truncateAddress } from "../../../lib/solana";
import type { VolumeLeaderWindow } from "../../../lib/types";

type Period = "24 Hours" | "1 Week";

function TokenAvatar({ uri }: { uri?: string | null }) {
  return (
    <View style={styles.tokenIcon}>
      <TokenImage uri={uri} style={styles.tokenImage} />
    </View>
  );
}

export default function TracerScreen() {
  const router = useRouter();
  const navScroll = useNavScroll();

  const [address, setAddress] = useState("");
  const [period, setPeriod] = useState<Period>("24 Hours");
  const window: VolumeLeaderWindow = period === "1 Week" ? "1w" : "24h";
  const { data: volumeRows, loading: volumeLoading } = useVolumeLeaders(window);
  const { data: launches, loading: launchesLoading } = useNewLaunches();
  const preview = (volumeRows ?? []).slice(0, 4);
  const newTokens = (launches ?? []).slice(0, 4);

  function openTrace(target: string) {
    if (!isSolanaAddress(target)) {
      Alert.alert("Invalid address", "Enter a valid Solana wallet or token address.");
      return;
    }
    router.push({ pathname: "/tracer/[address]", params: { address: target } });
  }

  function onTrace() {
    const target = address.trim();
    if (!target) {
      Alert.alert("Trace", "Enter a wallet or token address first.");
      return;
    }
    openTrace(target);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={navScroll.onScroll}
        onScrollBeginDrag={navScroll.onScrollBeginDrag}
        onScrollEndDrag={navScroll.onScrollEndDrag}
        scrollEventThrottle={16}
      >
        <Text style={styles.title}>Tracer</Text>

        <Text style={styles.description}>
          Trace a wallet or token address for launches,
          snipers, new wallets, linked wallets, and
          labeled counterparties.
        </Text>

        <View style={styles.searchRow}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Paste a Solana wallet or token address"
            placeholderTextColor="#777777"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Pressable
            style={styles.traceButton}
            onPress={onTrace}
          >
            <Text style={styles.traceButtonText}>
              Trace
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Top 10 Volume
          </Text>

          <Text style={styles.sectionDescription}>
            Graduated tokens under 1 week old that are
            still above $40k, ranked by 24h volume.
          </Text>
        </View>

        <View style={styles.volumeControls}>
          <View style={styles.periodSelector}>
            {(["24 Hours", "1 Week"] as const).map(
              (option) => (
                <Pressable
                  key={option}
                  onPress={() => setPeriod(option)}
                  style={[
                    styles.periodButton,
                    period === option &&
                      styles.periodSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      period === option &&
                        styles.periodSelectedText,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View full Top 10 Volume"
            onPress={() =>
              router.push(
                "/tracer/top-10-volume" as any
              )
            }
            style={styles.listButton}
          >
            <List size={19} color="#D8D8D8" />
          </Pressable>
        </View>

        <View style={styles.list}>
          {volumeLoading && !preview.length ? (
            <ActivityIndicator color="#C6E900" style={{ marginVertical: 18 }} />
          ) : null}
          {preview.map((token, index) => (
            <Pressable
              key={token.mint}
              style={styles.tokenRow}
              onPress={() => openTrace(token.mint)}
            >
              <View style={styles.rank}>
                <Text style={styles.rankText}>
                  {token.rank || index + 1}
                </Text>
              </View>

              <TokenAvatar uri={token.imageUrl} />

              <View style={styles.tokenInfo}>
                <Text
                  numberOfLines={1}
                  style={styles.tokenName}
                >
                  {token.name || truncateAddress(token.mint)}{" "}
                  <Text style={styles.symbol}>
                    {prettySymbol(token.symbol)}
                  </Text>
                </Text>

                <Text style={styles.subText}>
                  {formatMc(token.marketCapUsd)}
                </Text>
              </View>

              <View style={styles.rightInfo}>
                <Text style={styles.rightText}>
                  {period === "1 Week" ? "7d" : "24h"} {compactUsd(token.volume24hUsd)}
                </Text>

                <Text style={styles.subText}>
                  ♧ {formatCount(token.newHolders)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text
          style={[
            styles.sectionTitle,
            styles.newTokensHeading,
          ]}
        >
          Trace New Tokens
        </Text>

        <View style={styles.list}>
          {launchesLoading && !newTokens.length ? (
            <ActivityIndicator color="#C6E900" style={{ marginVertical: 18 }} />
          ) : null}
          {newTokens.map((token) => (
            <Pressable
              key={token.mint}
              style={styles.tokenRow}
              onPress={() => openTrace(token.mint)}
            >
              <TokenAvatar uri={token.imageUrl || token.logoUrl} />

              <View style={styles.tokenInfo}>
                <Text
                  numberOfLines={1}
                  style={styles.tokenName}
                >
                  {token.name || truncateAddress(token.mint)}{" "}
                  <Text style={styles.symbol}>
                    {prettySymbol(token.symbol)}
                  </Text>
                </Text>

                <Text style={styles.subText}>
                  {formatAge(token.createdAt)}
                </Text>
              </View>

              <View style={styles.rightInfo}>
                <Text style={styles.tokenBadge}>
                  {token.quote?.symbol || "SOL"}
                </Text>

                <Text style={styles.subText}>
                  {formatMc(token.market?.marketCapUsd)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#10110B",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 145,
  },

  title: {
    fontSize: 25,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },

  description: {
    color: "#B9B9B9",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 22,
  },

  searchRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 29,
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: 42,
    backgroundColor: "#202020",
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 6,
    paddingHorizontal: 12,
    color: "#FFFFFF",
    fontSize: 12,
  },

  traceButton: {
    backgroundColor: "#C6E900",
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 5,
    justifyContent: "center",
  },

  traceButtonText: {
    color: "#121600",
    fontWeight: "700",
    fontSize: 13,
  },

  sectionHeader: {
    marginBottom: 0,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  sectionDescription: {
    color: "#B0B0B0",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  volumeControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 13,
    marginBottom: 13,
  },

  listButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#303030",
    justifyContent: "center",
    alignItems: "center",
  },

  periodSelector: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#A4C200",
    borderRadius: 5,
    padding: 2,
  },

  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 3,
  },

  periodSelected: {
    backgroundColor: "#F1F8D0",
  },

  periodText: {
    color: "#FFFFFF",
    fontSize: 11,
  },

  periodSelectedText: {
    color: "#171717",
    fontWeight: "700",
  },

  list: {
    gap: 5,
  },

  tokenRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151515",
    borderRadius: 5,
    minHeight: 69,
    paddingHorizontal: 9,
    gap: 7,
  },

  rank: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "#293000",
    alignItems: "center",
    justifyContent: "center",
  },

  rankText: {
    color: "#D9EF4A",
    fontSize: 12,
    fontWeight: "700",
  },

  tokenIcon: {
    width: 43,
    height: 43,
    borderRadius: 23,
    backgroundColor: "#202B29",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  tokenImage: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
  },

  tokenInfo: {
    flex: 1,
    minWidth: 0,
  },

  tokenName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },

  symbol: {
    color: "#C2C2C2",
    fontWeight: "400",
    fontSize: 10,
  },

  subText: {
    color: "#A9A9A9",
    fontSize: 10,
    marginTop: 5,
  },

  rightInfo: {
    alignItems: "flex-end",
    justifyContent: "center",
  },

  rightText: {
    color: "#F1F1F1",
    fontSize: 10,
  },

  tokenBadge: {
    backgroundColor: "#0B4576",
    color: "#FFFFFF",
    fontSize: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: "hidden",
  },

  newTokensHeading: {
    marginTop: 26,
    marginBottom: 12,
  },

  demoNote: {
    color: "#8E8E8E",
    textAlign: "center",
    fontSize: 10,
    marginTop: 18,
  },
});
