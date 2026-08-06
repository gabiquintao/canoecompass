import type { NavigabilityScore } from "../types/api";

export interface ScoreMeta {
    color: string;
    label: string;
    description: string;
}

export const SCORE_META: Record<NavigabilityScore, ScoreMeta> = {
    EXCELLENT: { color: "hsl(150,35%,42%)", label: "Excellent", description: "Ideal conditions" },
    GOOD: { color: "hsl(38,42%,46%)", label: "Good", description: "Slightly above ideal" },
    POOR: { color: "hsl(20,48%,48%)", label: "Poor", description: "Not recommended" },
    DANGEROUS: { color: "hsl(0,58%,46%)", label: "Dangerous", description: "Do not paddle" },
    UNKNOWN: { color: "hsl(220,8%,56%)", label: "Unknown", description: "No data available" },
};
