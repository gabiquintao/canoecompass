import type { Station, StationHistoryEntry } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, options);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} — ${res.statusText}`);
    }
    return res.json() as Promise<T>;
}

export const apiClient = {
    getStationsScore: (): Promise<Station[]> => request<Station[]>("/api/stations/score"),

    getStationHistory: (stationId: number): Promise<StationHistoryEntry[]> =>
        request<StationHistoryEntry[]>(`/api/stations/${stationId}/history`),

    detectWaterBody: (lat: number, lon: number): Promise<{ name?: string; type?: string }> =>
        request<{ name?: string; type?: string }>(`/api/stations/detect?lat=${lat}&lon=${lon}`),

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
};
