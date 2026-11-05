export async function saveProfileAvatar(uri: string): Promise<string> {
  if (uri.startsWith("data:")) return uri;
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Could not save profile image");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function restoreProfileAvatar(uri: string): string | null {
  return uri.startsWith("blob:") ? null : uri;
}
