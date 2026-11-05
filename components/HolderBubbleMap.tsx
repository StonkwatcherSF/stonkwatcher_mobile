import { LocalizedText as Text } from "./LocalizationContext";
import { SkeletonMap } from "./Skeleton";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line, Text as SvgLabel } from "react-native-svg";
import {
  ALPHA_DECAY,
  ALPHA_MIN,
  FIT_FILL,
  fitView,
  seedLayout,
  stepPhysics,
  visibleBubbleMap,
  type BubbleView,
  type PlacedBubble,
} from "../lib/bubble-layout";
import type { BubbleMapData, BubbleMapLink } from "../lib/types";


type Snapshot = {
  key: string;
  nodes: PlacedBubble[];
  links: BubbleMapLink[];
  fitted: BubbleView;
};

type Props = {
  data: BubbleMapData | null;
  loading?: boolean;
  width: number;
  height: number;
  zoom: number;
  fitKey?: number;
};

function copyNodes(nodes: PlacedBubble[]) {
  return nodes.map((node) => ({ ...node }));
}

export default function HolderBubbleMap({ data, loading, width, height, zoom, fitKey = 0 }: Props) {
  const map = useMemo(() => visibleBubbleMap(data), [data]);
  const mapKey = `${map?.computedAt ?? ""}:${map?.nodes?.length ?? 0}:${map?.links?.length ?? 0}:${fitKey}`;
  const nodesRef = useRef<PlacedBubble[]>([]);
  const linksRef = useRef<BubbleMapLink[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    key: "",
    nodes: [],
    links: [],
    fitted: { x: width / 2, y: height / 2, k: 1 },
  });
  const [panState, setPanState] = useState({ key: mapKey, x: 0, y: 0, originX: 0, originY: 0 });
  const panX = panState.key === mapKey ? panState.x : 0;
  const panY = panState.key === mapKey ? panState.y : 0;

  useEffect(() => {
    if (!map?.nodes?.length) {
      nodesRef.current = [];
      linksRef.current = [];
      return;
    }
    const nodes = seedLayout(map);
    const links = map.links ?? [];
    for (let i = 0; i < 2; i += 1) stepPhysics(nodes, links, 1, Date.now());
    nodesRef.current = nodes;
    linksRef.current = links;
    let fitted = fitView(nodes, width, height, FIT_FILL);
    let alpha = 1;
    let frameId = 0;
    let lastPaint = 0;
    const tick = (now: number) => {
      stepPhysics(nodesRef.current, linksRef.current, Math.max(alpha, ALPHA_MIN), now);
      if (alpha > ALPHA_MIN) alpha *= 1 - ALPHA_DECAY;
      if (now - lastPaint > 32 || alpha <= 0.03) {
        lastPaint = now;
        if (alpha <= 0.03) {
          fitted = fitView(nodesRef.current, width, height, FIT_FILL);
        }
        setSnapshot({
          key: mapKey,
          nodes: copyNodes(nodesRef.current),
          links: linksRef.current,
          fitted,
        });
      }
      if (alpha > 0.03) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [map, mapKey, width, height]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          setPanState((current) => {
            const x = current.key === mapKey ? current.x : 0;
            const y = current.key === mapKey ? current.y : 0;
            return { key: mapKey, x, y, originX: x, originY: y };
          });
        },
        onPanResponderMove: (_, gesture) => {
          setPanState((current) => {
            const originX = current.key === mapKey ? current.originX : 0;
            const originY = current.key === mapKey ? current.originY : 0;
            return {
              key: mapKey,
              x: originX + gesture.dx,
              y: originY + gesture.dy,
              originX,
              originY,
            };
          });
        },
      }),
    [mapKey],
  );

  const nodes = snapshot.key === mapKey ? snapshot.nodes : [];
  const links = snapshot.key === mapKey ? snapshot.links : [];
  const fitted = snapshot.key === mapKey ? snapshot.fitted : { x: width / 2, y: height / 2, k: 1 };
  const k = fitted.k * zoom;
  const view = {
    k,
    x: width / 2 - ((width / 2 - fitted.x) / (fitted.k || 1)) * k + panX,
    y: height / 2 - ((height / 2 - fitted.y) / (fitted.k || 1)) * k + panY,
  };

  if (loading || ((map?.nodes?.length ?? 0) > 0 && !nodes.length)) {
    return (
      <SkeletonMap width={width} height={height} />
    );
  }

  if (!nodes.length) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No holder map yet</Text>
      </View>
    );
  }

  const byId = new Map(nodes.map((node) => [node.id, node]));

  return (
    <View style={{ width, height }} {...pan.panHandlers} collapsable={false}>
      <Svg width={width} height={height}>
        <G transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {links.map((link) => {
            const a = byId.get(link.source);
            const b = byId.get(link.target);
            if (!a || !b) return null;
            return (
              <Line
                key={link.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#3d4a63"
                strokeWidth={1.2 / view.k}
                opacity={0.7}
              />
            );
          })}
          {nodes.map((node) => (
            <Circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={node.pal.fill}
              stroke={node.isCreator ? "#ffffff" : node.pal.stroke}
              strokeWidth={(node.isCreator ? 3 : 2) / view.k}
            />
          ))}
          {nodes
            .filter((node) => node.isCreator)
            .map((node) => (
              <SvgLabel
                key={`${node.id}-dev`}
                x={node.x}
                y={node.y + node.r + 10 / view.k}
                fill="#E8E8E8"
                fontSize={10 / view.k}
                textAnchor="middle"
              >
                Dev
              </SvgLabel>
            ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { color: "#8C8C8C", fontSize: 11 },
});
