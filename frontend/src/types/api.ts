export type NavigabilityScore = "EXCELLENT" | "GOOD" | "POOR" | "DANGEROUS" | "UNKNOWN";
export type WaterBodyType = "RIVER" | "RESERVOIR" | "ESTUARY" | "COASTAL" | "LAGOON";

export interface Station {
    id: number;
    name: string;
    type: WaterBodyType;
    latitude: number;
    longitude: number;
    flow_rate_m3s: number | null;
    tide_level_m?: number | null;
    wind_speed_kmh: number | null;
    flow_score?: NavigabilityScore | null;
    tide_score?: NavigabilityScore | null;
    wind_score: NavigabilityScore;
    final_score: NavigabilityScore;
}

export interface StationHistoryEntry {
    date: string;
    flow_rate: number | null;
    wind_speed: number | null;
}
