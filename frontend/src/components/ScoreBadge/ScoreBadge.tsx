import type { NavigabilityScore } from "../../types/api";
import { SCORE_META } from "../../constants/scores";
import styles from "./ScoreBadge.module.css";

interface Props {
    score: NavigabilityScore;
    size?: "sm" | "lg";
}

export function ScoreBadge({ score, size = "sm" }: Props) {
    const meta = SCORE_META[score];
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
