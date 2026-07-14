import styles from "./TopBar.module.css";

interface Props {
    loading: boolean;
    error: string | null;
    stationCount: number;
    lastUpdated: Date | null;
    onRefetch: () => void;
}

export function TopBar({ loading, error, stationCount, lastUpdated, onRefetch }: Props) {
    const statusClass = loading
        ? styles.statusLoading
        : error
          ? styles.statusError
          : styles.statusOk;

    const statusText = loading
        ? "Fetching"
        : error
          ? `Error: ${error}`
          : `${stationCount} station${stationCount !== 1 ? "s" : ""}`;

    return (
        <header className={styles.topbar}>
            <div className={styles.brand}>
                <span className={styles.title}>canoecompass</span>
            </div>

            <div className={styles.meta}>
                {lastUpdated && (
                    <span className={styles.updated}>
                        Updated: {lastUpdated.toLocaleTimeString("pt-PT")}
                    </span>
                )}
                <span className={`${styles.status} ${statusClass}`}>{statusText}</span>
                {!loading && (
                    <button className={styles.refetch} onClick={onRefetch} title="Refresh">
                        ↻
                    </button>
                )}
            </div>
        </header>
    );
}
