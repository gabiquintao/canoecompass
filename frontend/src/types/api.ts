export type NavigabilityScore = "EXCELLENT" | "GOOD" | "POOR" | "DANGEROUS" | "UNKNOWN";

export interface Station {
    id: number;
    name: string;
    type: string;
    latitude: number;
    longitude: number;
    flow_rate_m3s: number | null;
    wind_speed_kmh: number | null;
    flow_score: NavigabilityScore;
    wind_score: NavigabilityScore;
    final_score: NavigabilityScore;
}

export interface StationHistoryEntry {
    date: string;
    flow_rate: number | null;
    wind_speed: number | null;
}
