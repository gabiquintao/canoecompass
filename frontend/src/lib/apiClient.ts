import type { Station, StationHistoryEntry, ForecastResponse } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, options);
    if (!res.ok) {
        let errorMsg = res.statusText;
        try {
            const body = await res.json();
            if (body.detail) {
                if (typeof body.detail === "string") {
                    errorMsg = body.detail;
                } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
                    errorMsg = body.detail[0].msg;
                }
            }
        } catch {
            // Ignore
        }
        throw new Error(`HTTP ${res.status} — ${errorMsg}`);
    }
    return res.json() as Promise<T>;
}

const forecastCache = new Map<number, { data: ForecastResponse; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5;

export const apiClient = {
    getStationsScore: (): Promise<Station[]> => request<Station[]>("/api/stations/score"),

    getStationHistory: (stationId: number): Promise<StationHistoryEntry[]> =>
        request<StationHistoryEntry[]>(`/api/stations/${stationId}/history`),

    createStation: (body: {
        name: string;
        latitude: number;
        longitude: number;
        type: string;
    }): Promise<{ id: number; message: string }> =>
        request<{ id: number; message: string }>("/api/stations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        }),

    getStationForecast: async (stationId: number): Promise<ForecastResponse> => {
        const cached = forecastCache.get(stationId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
        const data = await request<ForecastResponse>(`/api/stations/${stationId}/forecast`);
        forecastCache.set(stationId, { data, timestamp: Date.now() });
        return data;
    },
};
