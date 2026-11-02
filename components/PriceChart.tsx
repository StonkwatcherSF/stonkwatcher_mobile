import React, { useMemo, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Svg, { Line, Rect, Text as SvgLabel } from "react-native-svg";
import { COLORS } from "../constants/theme";
import { chartAxisLabel } from "../lib/format";
import { applyLiveClose } from "../lib/public-data";
import type { OhlcvCandle } from "../lib/types";

const HEIGHT = 255;
const AXIS_WIDTH = 52;
const BAR_STEP = 10;
const BAR_WIDTH = 6;

type Props = {
  width: number;
  candles: OhlcvCandle[];
  marketCapUsd?: number | null;
  priceUsd?: number | null;
  step?: number;
};

function scaleFactor(marketCapUsd?: number | null, priceUsd?: number | null) {
  if (marketCapUsd && marketCapUsd > 0 && priceUsd && priceUsd > 0) return marketCapUsd / priceUsd;
  return 1;
}

export default function PriceChart({ width, candles, marketCapUsd, priceUsd, step = 60 }: Props) {
  const chartWidth = Math.max(160, width - AXIS_WIDTH);
  const visibleCount = Math.max(18, Math.floor((chartWidth - 8) / BAR_STEP));
  const seriesKey = `${candles[0]?.time ?? 0}:${visibleCount}`;
  const [panState, setPanState] = useState({ key: seriesKey, offset: 0, origin: 0 });
  const offset = panState.key === seriesKey ? panState.offset : 0;

  const factor = scaleFactor(marketCapUsd, priceUsd);
  const live = marketCapUsd && marketCapUsd > 0 ? marketCapUsd : priceUsd && priceUsd > 0 ? priceUsd : null;

  const series = useMemo(() => {
    if (!candles.length) return [] as OhlcvCandle[];
    const rows = candles.map((row) => ({
      ...row,
      open: row.open * factor,
      high: row.high * factor,
      low: row.low * factor,
      close: row.close * factor,
    }));
    return applyLiveClose(rows, live, step);
  }, [candles, factor, live, step]);

  const maxOffset = Math.max(0, series.length - visibleCount);
  const clamped = Math.min(maxOffset, Math.max(0, offset));
  const start = Math.max(0, series.length - visibleCount - Math.round(clamped));
  const visible = series.slice(start, start + visibleCount);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setPanState((current) => {
            const value = current.key === seriesKey ? current.offset : 0;
            return { key: seriesKey, offset: value, origin: value };
          });
        },
        onPanResponderMove: (_, gesture) => {
          setPanState((current) => {
            const origin = current.key === seriesKey ? current.origin : 0;
            const next = Math.min(maxOffset, Math.max(0, origin + gesture.dx / BAR_STEP));
            return { key: seriesKey, offset: next, origin };
          });
        },
        onPanResponderRelease: (_, gesture) => {
          setPanState((current) => {
            const origin = current.key === seriesKey ? current.origin : 0;
            const next = Math.min(maxOffset, Math.max(0, Math.round(origin + gesture.dx / BAR_STEP)));
            return { key: seriesKey, offset: next, origin: next };
          });
        },
      }),
    [maxOffset, seriesKey],
  );

  const { bars, labels, liveY } = useMemo(() => {
    if (!visible.length) {
      return {
        bars: [] as { open: number; close: number; high: number; low: number }[],
        labels: ["—", "—", "—", "—", "—"],
        liveY: HEIGHT / 2,
      };
    }
    const highs = visible.map((row) => row.high);
    const lows = visible.map((row) => row.low);
    const max = Math.max(...highs);
    const min = Math.min(...lows);
    const span = max - min || max * 0.04 || 1;
    const pad = span * 0.08;
    const top = max + pad;
    const bottom = Math.max(0, min - pad);
    const range = top - bottom || 1;
    const norm = (price: number) => (top - price) / range;
    const liveClose = live && live > 0 ? live : visible[visible.length - 1]?.close;
    return {
      bars: visible.map((row) => ({
        open: norm(row.open),
        close: norm(row.close),
        high: norm(row.high),
        low: norm(row.low),
      })),
      labels: [0, 1, 2, 3, 4].map((step) => chartAxisLabel(top - (range * step) / 4)),
      liveY: liveClose ? Math.max(8, Math.min(HEIGHT - 8, norm(liveClose) * HEIGHT)) : HEIGHT / 2,
    };
  }, [visible, live]);

  const y = (value: number) => value * HEIGHT;

  return (
    <View style={[styles.root, { width }]} {...pan.panHandlers}>
      <Svg width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`}>
        {Array.from({ length: 7 }, (_, i) => (
          <Line key={`h${i}`} x1={0} x2={chartWidth} y1={i * 42 + 2} y2={i * 42 + 2} stroke="#27300E" strokeWidth={0.5} />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <Line
            key={`v${i}`}
            y1={0}
            y2={HEIGHT}
            x1={(i * chartWidth) / 8}
            x2={(i * chartWidth) / 8}
            stroke="#27300E"
            strokeWidth={0.5}
          />
        ))}
        {bars.map((candle, i) => {
          const x = 5 + i * ((chartWidth - 12) / Math.max(bars.length, 1));
          const rising = candle.close <= candle.open;
          const color = rising ? COLORS.buy : COLORS.sell;
          return (
            <React.Fragment key={`${start}-${i}`}>
              <Line x1={x + 3} x2={x + 3} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth={1.5} />
              <Rect
                x={x}
                y={y(Math.min(candle.open, candle.close))}
                width={BAR_WIDTH}
                height={Math.max(3, Math.abs(y(candle.close) - y(candle.open)))}
                rx={1.5}
                fill={color}
              />
            </React.Fragment>
          );
        })}
        {bars.length ? (
          <Line
            x1={0}
            x2={chartWidth}
            y1={liveY}
            y2={liveY}
            stroke={COLORS.stonkGreen}
            strokeWidth={1}
            strokeDasharray="5 5"
            opacity={0.7}
          />
        ) : null}
        {labels.map((label, i) => (
          <SvgLabel key={`${label}-${i}`} x={chartWidth + 4} y={i * 49 + 17} fill={COLORS.grey} fontSize={9}>
            {label}
          </SvgLabel>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { minHeight: HEIGHT },
});
