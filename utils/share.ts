
import { Share } from "react-native";

type ShareContent = {
  title: string;
  message: string;
  url?: string;
};

export async function shareExternally({
  title,
  message,
  url,
}: ShareContent) {
  try {
    await Share.share({
      title,
      message,
      ...(url ? { url } : {}),
    });
  } catch (error) {
    console.error("Sharing failed:", error);
  }
}
