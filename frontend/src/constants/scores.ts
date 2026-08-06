import type { NavigabilityScore } from "../types/api";

export interface ScoreMeta {
    color: string;
    label: string;
}

export const SCORE_META: Record<NavigabilityScore, ScoreMeta> = {
    EXCELLENT: { color: "hsl(150,35%,42%)", label: "Excellent" },
    GOOD: { color: "hsl(38,42%,46%)", label: "Good" },
    POOR: { color: "hsl(20,48%,48%)", label: "Poor" },
    DANGEROUS: { color: "hsl(0,58%,46%)", label: "Dangerous" },
    UNKNOWN: { color: "hsl(220,8%,56%)", label: "Unknown" },
};
