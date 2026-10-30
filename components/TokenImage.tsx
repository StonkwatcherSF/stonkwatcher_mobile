import React, { useState } from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";

const PLACEHOLDER = require("../assets/images/placeholder.png");

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
};

export default function TokenImage({ uri, style }: Props) {
  const [failed, setFailed] = useState(false);
  const source = !uri || failed ? PLACEHOLDER : { uri };
  return (
    <Image
      source={source}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}
