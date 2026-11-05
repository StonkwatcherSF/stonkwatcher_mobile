import { File, Paths } from "expo-file-system";

export async function saveProfileAvatar(uri: string): Promise<string> {
  const source = new File(uri);
  const extension = source.extension.replace(/[^a-zA-Z0-9.]/g, "") || ".jpg";
  const destination = new File(Paths.document, `stonk-avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`);
  await source.copy(destination);
  return destination.uri;
}

export function restoreProfileAvatar(uri: string): string | null {
  // iOS can change the app container path between launches/updates.
  const name = uri.split("/").pop();
  if (name?.startsWith("stonk-avatar-")) {
    const file = new File(Paths.document, name);
    return file.exists ? file.uri : null;
  }
  return uri;
}
