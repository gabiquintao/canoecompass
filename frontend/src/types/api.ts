export type NavigabilityScore = "EXCELLENT" | "GOOD" | "POOR" | "DANGEROUS" | "UNKNOWN";
export type WaterBodyType = "RIVER" | "RESERVOIR" | "ESTUARY" | "COASTAL" | "LAGOON";

export interface Station {
    id: number;
    name: string;
    type: WaterBodyType;
    latitude: number;
    longitude: number;
    flow_rate_m3s: number | null;
    tide_level_m: number | null;
    wind_speed_kmh: number | null;
    wind_gust_kmh: number | null;
    wave_height_m: number | null;
    flow_score: NavigabilityScore | null;
    tide_score: NavigabilityScore | null;
    wind_score: NavigabilityScore;
    final_score: NavigabilityScore;
    flow_min: number | null;
    flow_max: number | null;
    flow_danger: number | null;
    tide_min_m: number | null;
    tide_max_m: number | null;
}

export interface StationHistoryEntry {
    date: string;
    flow_rate: number | null;
    wind_speed: number | null;
}

export interface TidalPeak {
    time: string;
    level: number;
}

export interface PaddlingWindow {
    start_time: string | null;
    end_time: string | null;
    peak_hour: HourlyForecastEntry;
}

export interface DailyMarineSummary {
    high_tides: TidalPeak[];
    low_tides: TidalPeak[];
    best_paddling_window: PaddlingWindow | null;
}

export interface ForecastResponse {
    hourly: HourlyForecastEntry[];
    daily_summaries: Record<string, DailyMarineSummary>;
}

export interface HourlyForecastEntry {
    timestamp: string;
    wind_speed_kmh: number | null;
    wind_gust_kmh: number | null;
    flow_rate_m3s: number | null;
    tide_level_m: number | null;
    wave_height_m: number | null;
    wind_score: NavigabilityScore | null;
    tide_score: NavigabilityScore | null;
    flow_score: NavigabilityScore | null;
    final_score: NavigabilityScore;
}
