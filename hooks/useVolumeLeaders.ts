import { useVisibleRows } from "../components/BlacklistContext";
import { fetchVolumeLeaders } from "../lib/stonk";
import type { VolumeLeader, VolumeLeaderWindow } from "../lib/types";
import { useAsync } from "./useAsync";

export function useVolumeLeaders(window: VolumeLeaderWindow) {
  const result = useAsync<VolumeLeader[]>(
    async () => {
      const body = await fetchVolumeLeaders(window);
      return (body.rows ?? []).map((row) => {
        const extra = row as VolumeLeader & { creator?: string | null; creatorAddress?: string | null };
        return { ...row, creator: extra.creator ?? extra.creatorAddress ?? null };
      });
    },
    [window],
  );
  return { ...result, data: useVisibleRows(result.data) };
}
