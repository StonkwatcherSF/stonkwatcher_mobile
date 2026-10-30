import { fetchVolumeLeaders } from "../lib/stonk";
import type { VolumeLeader, VolumeLeaderWindow } from "../lib/types";
import { useAsync } from "./useAsync";

export function useVolumeLeaders(window: VolumeLeaderWindow) {
  return useAsync<VolumeLeader[]>(
    async () => {
      const body = await fetchVolumeLeaders(window);
      return body.rows ?? [];
    },
    [window],
  );
}
