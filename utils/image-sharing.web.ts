import type { SharingOptions } from "expo-sharing";

export async function isAvailableAsync() {
  // Downloads remain available on browsers without file sharing.
  return true;
}

export async function shareAsync(uri: string, options?: SharingOptions) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const file = new File([blob], "stonkwatcher-snapshot.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: options?.dialogTitle });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      // Safari may lose user activation while the image is being captured.
      // Fall back to saving the image instead of silently failing.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
