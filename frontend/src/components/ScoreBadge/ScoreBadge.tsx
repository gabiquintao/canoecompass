import type { NavigabilityScore } from "../../types/api";
import { SCORE_META } from "../../constants/scores";
import styles from "./ScoreBadge.module.css";

interface Props {
    score?: NavigabilityScore | null;
    variant?: "badge" | "dot";
}

export function ScoreBadge({ score, variant = "badge" }: Props) {
    const meta = SCORE_META[score ?? "UNKNOWN"] ?? SCORE_META.UNKNOWN;
    if (variant === "dot") {
        return <span className={styles.dot} style={{ background: meta.color }} />;
    }
    return (
        <span className={styles.badge} style={{ color: meta.color, borderColor: meta.color }}>
            {meta.label}
        </span>
    );
}
