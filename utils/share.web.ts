import { Alert } from "./alert";

export async function shareExternally({ title, message, url }: {
  title: string; message: string; url?: string;
}) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text: message, url });
    } else {
      await navigator.clipboard.writeText([message, url].filter(Boolean).join("\n"));
      Alert.alert("Copied", "The share text has been copied to your clipboard.");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
    Alert.alert("Unable to share", "Please try again or copy the address manually.");
  }
}
