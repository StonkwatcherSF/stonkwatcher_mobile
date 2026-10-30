import { fetchTokens } from "../lib/stonk";
import type { StonkFunToken } from "../lib/types";
import { useAsync } from "./useAsync";

export function useNewLaunches() {
  return useAsync<StonkFunToken[]>(
    async () => {
      const page = await fetchTokens({ sort: "newest", pageSize: 20 });
      return page.tokens ?? [];
    },
    [],
  );
}
