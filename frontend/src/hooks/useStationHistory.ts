import { useState, useEffect } from "react";
import type { StationHistoryEntry } from "../types/api";
import { apiClient } from "../lib/apiClient";

export function useStationHistory(stationId: number | null) {
    const [history, setHistory] = useState<StationHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (stationId === null) {
            return;
        }

        let cancelled = false;

        const fetchHistory = async () => {
            setHistory([]);
            setLoading(true);
            setError(null);

            try {
                const data = await apiClient.getStationHistory(stationId);

                if (!cancelled) {
                    setHistory(data);
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Unknown error");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchHistory();

        return () => {
            cancelled = true;
        };
    }, [stationId]);

    return { history, loading, error };
}
