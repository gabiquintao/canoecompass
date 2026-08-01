import { useState, useEffect } from "react";
import type { HourlyForecastEntry } from "../types/api";
import { apiClient } from "../lib/apiClient";

export function useStationForecast(stationId: number | null) {
    const [forecasts, setForecasts] = useState<HourlyForecastEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (stationId === null) {
            return;
        }

        let cancelled = false;

        const fetchForecasts = async () => {
            setForecasts([]);
            setLoading(true);
            setError(null);

            try {
                const data = await apiClient.getStationForecast(stationId);
                if (!cancelled) {
                    setForecasts(data);
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

        fetchForecasts();

        return () => {
            cancelled = true;
        };
    }, [stationId]);

    return { forecasts, loading, error };
}
