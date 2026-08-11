import styles from "./TopBar.module.css";

interface Props {
    loading: boolean;
    error: string | null;
    stationCount: number;
    lastUpdated: Date | null;
    onRefetch: () => void;
    isPanelOpen: boolean;
    onTogglePanel: () => void;
    isDark: boolean;
    onToggleTheme: () => void;
    onOpenAccount: () => void;
    compact?: boolean;
}

import { useNavigate } from "react-router-dom";

export function TopBar({
    loading,
    error,
    stationCount,
    lastUpdated,
    onRefetch,
    isPanelOpen,
    onTogglePanel,
    isDark,
    onToggleTheme,
    onOpenAccount,
    compact = false,
}: Props) {
    const navigate = useNavigate();

    const statusText = loading
        ? "Loading…"
        : error
          ? `Error: ${error}`
          : `${stationCount} station${stationCount !== 1 ? "s" : ""}`;

    const statusClass = loading
        ? styles.statusLoading
        : error
          ? styles.statusError
          : styles.statusOk;

    return (
        <header className={styles.topbar}>
            <div
                className={`${styles.topbarContent} ${compact ? styles.topbarContentCompact : ""}`}
            >
                <div className={styles.left}>
                    {!compact && (
                        <button
                            className={styles.iconBtn}
                            onClick={onTogglePanel}
                            title={`${isPanelOpen ? "Hide" : "Show"} panel [P]`}
                            aria-label="Toggle panel"
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 15 15"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                            >
                                <line x1="1" y1="4" x2="14" y2="4" />
                                <line x1="1" y1="7.5" x2="14" y2="7.5" />
                                <line x1="1" y1="11" x2="14" y2="11" />
                            </svg>
                        </button>
                    )}
                    <span
                        className={styles.brand}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate("/")}
                    >
                        Canoecompass
                    </span>
                    <span className={styles.appBadge}>/ {compact ? "Docs" : "App"}</span>
                </div>

                <div className={styles.right}>
                    {!compact && (
                        <>
                            {lastUpdated && (
                                <span className={styles.updated} title="Time of last data fetch">
                                    {lastUpdated.toLocaleTimeString("pt-PT", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            )}
                            <span className={`${styles.status} ${statusClass}`}>{statusText}</span>
                            <button
                                className={styles.iconBtn}
                                onClick={onRefetch}
                                disabled={loading}
                                title="Refresh station data [R]"
                                aria-label="Refresh"
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                    <path d="M21 3v5h-5" />
                                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                    <path d="M3 21v-5h5" />
                                </svg>
                            </button>
                            
                            <button
                                className={styles.iconBtn}
                                onClick={() => navigate("/docs")}
                                title="Documentation"
                                aria-label="Documentation"
                            >
                                <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                </svg>
                            </button>
                            
                            <button
                                className={styles.iconBtn}
                                onClick={onOpenAccount}
                                title="Account & Settings"
                                aria-label="Account"
                            >
                                <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </button>
                        </>
                    )}
                    {compact && (
                        <button
                            className={styles.iconBtn}
                            onClick={() => navigate("/")}
                            title="Back to Map"
                            aria-label="Back to Map"
                        >
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </button>
                    )}
                    
                    <button
                        className={styles.iconBtn}
                        onClick={onToggleTheme}
                        title={`Switch to ${isDark ? "light" : "dark"} mode`}
                        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
                    >
                        {isDark ? (
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                            </svg>
                        ) : (
                            <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
