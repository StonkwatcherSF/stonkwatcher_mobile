import { fetchCreatorAlerts } from "../lib/creator-alerts";
import { useAsync } from "./useAsync";

const REFRESH_MS = 20_000;

export function useCreatorAlerts() {
  return useAsync(fetchCreatorAlerts, [], true, REFRESH_MS);
}
