import type { Station } from "../../types/api";
import styles from "./Sidebar.module.css";
import { ScoreBadge } from "../ScoreBadge/ScoreBadge";

interface Props {
    stations: Station[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    searchQuery: string;
    onSearch: (query: string) => void;
    searchRef?: React.RefObject<HTMLInputElement | null>;
    error?: string | null;
}

export function Sidebar({
    stations,
    selectedId,
    onSelect,
    searchQuery,
    onSearch,
    searchRef,
    error,
}: Props) {
    return (
        <aside className={styles.panel} aria-label="Station list">
            <div className={styles.search}>
                <svg
                    className={styles.searchIcon}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                    ref={searchRef}
                    id="station-search"
                    type="text"
                    placeholder="Search stations [/]"
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                    className={styles.searchInput}
                    aria-label="Filter stations"
                />
                {searchQuery && (
                    <button
                        className={styles.clearBtn}
                        onClick={() => onSearch("")}
                        title="Clear search"
                        aria-label="Clear search"
                    >
                        ✕
                    </button>
                )}
            </div>

            {error && (
                <div className={styles.errorBanner}>
                    <p>
                        <strong>Couldn't load stations</strong>
                    </p>
                    <p>{error}</p>
                </div>
            )}

            <div className={styles.list} role="listbox" aria-label="Stations">
                {stations.length === 0 && (
                    <p className={styles.empty}>No stations match your search.</p>
                )}
                {stations.map((s) => {
                    return (
                        <button
                            key={s.id}
                            role="option"
                            aria-selected={s.id === selectedId}
                            className={`${styles.row} ${s.id === selectedId ? styles.rowActive : ""}`}
                            onClick={() => onSelect(s.id)}
                        >
                            <span className={styles.rowBody}>
                                <span className={styles.name}>{s.name}</span>
                                <span className={styles.type}>{s.type.toLowerCase()}</span>
                            </span>
                            <ScoreBadge score={s.final_score} />
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
