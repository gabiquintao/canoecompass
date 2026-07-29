import type { NavigabilityScore } from "../../types/api";
import { SCORE_META } from "../../constants/scores";
import styles from "./ScoreBadge.module.css";

interface Props {
    score?: NavigabilityScore | null;
    size?: "sm" | "lg";
}

export function ScoreBadge({ score, size = "sm" }: Props) {
    const meta = SCORE_META[(score as NavigabilityScore) ?? "UNKNOWN"] ?? SCORE_META.UNKNOWN;
    return (
        <span
            className={`${styles.badge} ${styles[size]}`}
            style={{
                color: meta.color,
                background: meta.bg,
                borderColor: meta.border,
            }}
        >
            {meta.label}
        </span>
    );
}
