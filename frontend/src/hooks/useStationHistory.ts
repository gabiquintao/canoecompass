import { useState, useEffect } from "react";
import type { StationHistoryEntry } from "../types/api";

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
            setLoading(true);
            setError(null);

            try {
                const API_URL = `http://localhost:8000/api/stations/${stationId}/history`;
                const res = await fetch(API_URL);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const data = (await res.json()) as StationHistoryEntry[];

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
