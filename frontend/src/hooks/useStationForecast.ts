import { useMemo } from "react";
import type { ForecastResponse } from "../types/api";
import { apiClient } from "../lib/apiClient";
import { useAsyncQuery } from "./useAsyncQuery";

export function useStationForecast(stationId: number | null) {
    const fetcher = useMemo(
        () => (stationId !== null ? () => apiClient.getStationForecast(stationId) : null),
        [stationId]
    );
    const { data: forecasts, loading, error } = useAsyncQuery<ForecastResponse | null>(null, fetcher);
    return { forecasts, loading, error };
}
