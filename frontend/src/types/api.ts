export type NavigabilityScore = "EXCELLENT" | "GOOD" | "POOR" | "DANGEROUS" | "UNKNOWN";

export interface Station {
    station_code: string;
    station_name: string;
    latitude: number;
    longitude: number;
    flow_rate_m3s: number | null;
    wind_speed_kmh: number | null;
    flow_score: NavigabilityScore;
    wind_score: NavigabilityScore;
    final_score: NavigabilityScore;
}
