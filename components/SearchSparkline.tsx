import { LocalizedText as Text } from "./LocalizationContext";
import React, { memo, useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import Svg, { Polyline } from "react-native-svg";
import { Skeleton } from "./Skeleton";
import { isSolanaAddress } from "../lib/solana";
import { readSearchChart, sparklineData, subscribeSearchChart } from "../lib/search-chart";
import type { OhlcvCandle } from "../lib/types";

function SearchSparkline({ mint, spot }: { mint: string; spot?: number }) {
  const [result, setResult] = useState<{ mint: string; candles: OhlcvCandle[] | undefined } | null>(null);
  useFocusEffect(useCallback(() => {
    if (!isSolanaAddress(mint)) return;
    const update = () => setResult({ mint, candles: readSearchChart(mint) });
    update();
    return subscribeSearchChart(mint, spot, update);
  }, [mint, spot]));
  const candles = result?.mint === mint ? result.candles : readSearchChart(mint);
  const line = useMemo(() => sparklineData(candles ?? []), [candles]);
  return (
    <View style={styles.chart} accessibilityLabel="Recent DEX price history">
      {line ? (
        <Svg width={54} height={47} viewBox="0 0 54 47">
          <Polyline points={line.points} fill="none" stroke={line.positive ? "#00D89A" : "#FF574A"} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : candles ? <Text style={styles.empty}>—</Text> : <Skeleton width={48} height={22} />}
    </View>
  );
}

export default memo(SearchSparkline);
const styles = StyleSheet.create({
  chart: { width: 54, height: 47, overflow: "hidden", marginRight: 1, alignItems: "center", justifyContent: "center" },
  empty: { color: "#777777", fontSize: 14 },
});
