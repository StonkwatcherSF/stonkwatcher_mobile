import React from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";
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
  const source = useProfileAvatarSource();
  return <Image source={source} style={style} resizeMode="cover" />;
}
