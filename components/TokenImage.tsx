import React, { useMemo, useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
import { mediaCandidates } from "../lib/media";

const PLACEHOLDER = require("../assets/images/placeholder.png");

type Props = {
  uri?: string | null;
  mint?: string | null;
  style?: StyleProp<ImageStyle>;
};

export default function TokenImage({ uri, mint, style }: Props) {
  const candidates = useMemo(() => mediaCandidates(uri, mint), [uri, mint]);
  const sourceKey = `${uri ?? ""}|${mint ?? ""}`;
  const [state, setState] = useState({ key: sourceKey, index: 0 });
  const index = state.key === sourceKey ? state.index : 0;
  const current = candidates[index];
  return (
    <Image
      source={current ? { uri: current } : PLACEHOLDER}
      style={style}
      resizeMode="cover"
      onError={() => setState({ key: sourceKey, index: index + 1 })}
    />
  );
}
