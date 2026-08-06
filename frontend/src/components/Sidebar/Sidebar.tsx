import type { Station } from "../../types/api";
import { SCORE_META } from "../../constants/scores";
import styles from "./Sidebar.module.css";

interface Props {
    stations: Station[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    searchQuery: string;
    onSearch: (query: string) => void;
    searchRef?: React.RefObject<HTMLInputElement | null>;
}

export function Sidebar({
    stations,
    selectedId,
    onSelect,
    searchQuery,
    onSearch,
    searchRef,
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

            <div className={styles.list} role="listbox" aria-label="Stations">
                {stations.length === 0 && (
                    <p className={styles.empty}>No stations match your search.</p>
                )}
                {stations.map((s) => {
                    const meta = SCORE_META[s.final_score];
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
                            <span
                                className={styles.scoreLabel}
                                style={{ color: meta.color }}
                                aria-label={`Score: ${meta.label}`}
                            >
                                {meta.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
