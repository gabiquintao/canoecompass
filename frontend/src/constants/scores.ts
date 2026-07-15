import type { NavigabilityScore } from "../types/api";

export interface ScoreMeta {
    color: string;
    label: string;
    bg: string;
    border: string;
    description: string;
}

export const SCORE_META: Record<NavigabilityScore, ScoreMeta> = {
    EXCELLENT: {
        color: "#16a34a",
        label: "Excellent",
        bg: "#f0fdf4",
        border: "#86efac",
        description: "Ideal conditions",
    },
    GOOD: {
        color: "#d97706",
        label: "Good",
        bg: "#fffbeb",
        border: "#fcd34d",
        description: "Slightly above ideal flow",
    },
    POOR: {
        color: "#ea580c",
        label: "Poor",
        bg: "#fff7ed",
        border: "#fdba74",
        description: "Not recommended",
    },
    DANGEROUS: {
        color: "#dc2626",
        label: "Dangerous",
        bg: "#fef2f2",
        border: "#fca5a5",
        description: "Do not paddle",
    },
    UNKNOWN: {
        color: "#6b7280",
        label: "Unknown",
        bg: "#f9fafb",
        border: "#d1d5db",
        description: "No data available",
    },
};


