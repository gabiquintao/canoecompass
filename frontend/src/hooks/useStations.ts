import { useState, useEffect } from "react";
import type { Station } from "../types/api";

const API_URL = "http://localhost:8000/api/stations/score";

interface UseStationsResult {
    stations: Station[];
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    refetch: () => void;
}

export function useStations(): UseStationsResult {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        setError(null);

        fetch(API_URL)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
                return res.json() as Promise<Station[]>;
            })
            .then((data) => {
                if (cancelled) return;
                setStations(data);
                setLastUpdated(new Date());
                setLoading(false);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "Unknown error");
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [tick]);

    const refetch = () => setTick((t) => t + 1);

    return { stations, loading, error, lastUpdated, refetch };
}
