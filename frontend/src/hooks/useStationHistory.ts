import { useMemo } from "react";
import type { StationHistoryEntry } from "../types/api";
import { apiClient } from "../lib/apiClient";
import { useAsyncQuery } from "./useAsyncQuery";

export function useStationHistory(stationId: number | null) {
    const fetcher = useMemo(
        () => (stationId !== null ? () => apiClient.getStationHistory(stationId) : null),
        [stationId]
    );
    const { data: history, loading, error } = useAsyncQuery<StationHistoryEntry[]>([], fetcher);
    return { history, loading, error };
}
