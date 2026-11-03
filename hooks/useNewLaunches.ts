import { useVisibleRows } from "../components/BlacklistContext";
import { fetchTokens } from "../lib/stonk";
import type { StonkFunToken } from "../lib/types";
import { useAsync } from "./useAsync";

export function useNewLaunches() {
  const result = useAsync<StonkFunToken[]>(
    async () => {
      const page = await fetchTokens({ sort: "newest", pageSize: 20 });
      return page.tokens ?? [];
    },
    [],
  );
  return { ...result, data: useVisibleRows(result.data) };
}
