import React, { useState } from "react";
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";
import { useSettings } from "./SettingsContext";

const PLACEHOLDER = require("../assets/images/placeholder.png");

export function useProfileAvatarSource() {
  const { prefs } = useSettings();
  return prefs.avatarUri ? { uri: prefs.avatarUri } : PLACEHOLDER;
}

export default function UserAvatar({
  style,
}: {
  style?: StyleProp<ImageStyle>;
}) {
  const { prefs } = useSettings();
  const uri = prefs.avatarUri;
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return (
    <View style={[style, styles.frame]} pointerEvents="none">
      <Image source={PLACEHOLDER} style={styles.image} resizeMode="cover" fadeDuration={0} />
      {uri && uri !== failedUri ? (
        <Image
          key={uri}
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          fadeDuration={0}
          onError={() => setFailedUri(uri)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden", backgroundColor: "#4B4B4B", flexShrink: 0 },
  image: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
});
