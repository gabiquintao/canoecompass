import { useState } from "react";
import type { Station } from "../../types/api";
import styles from "./Sidebar.module.css";
import { ScoreBadge } from "../ScoreBadge/ScoreBadge";

interface Props {
    stations: Station[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    searchQuery: string;
    onSearch: (q: string) => void;
    searchRef: React.RefObject<HTMLInputElement | null>;
    error: string | null;
    onAddSpot: () => void;
    isOpen: boolean;
    favorites: Set<number>;
    onToggleFavorite: (id: number) => void;
}

export function Sidebar({
    stations,
    selectedId,
    onSelect,
    searchQuery,
    onSearch,
    searchRef,
    error,
    onAddSpot,
    isOpen,
    favorites,
    onToggleFavorite,
}: Props) {
    const [isListExpanded, setIsListExpanded] = useState(false);

    const handleFocus = () => {
        setIsListExpanded(true);
    };

    const handleSearchChange = (val: string) => {
        onSearch(val);
        if (val) setIsListExpanded(true);
    };

    return (
        <aside
            className={`${styles.panel} ${!isOpen ? styles.closed : ""}`}
            aria-label="Station list"
        >
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
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={handleFocus}
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
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
                <button
                    className={styles.addBtn}
                    onClick={onAddSpot}
                    title="Add new spot"
                    aria-label="Add new spot"
                >
                    +
                </button>
                <button
                    className={styles.toggleBtn}
                    onClick={() => setIsListExpanded(!isListExpanded)}
                    title={isListExpanded ? "Hide results" : "Show results"}
                    aria-label={isListExpanded ? "Hide results" : "Show results"}
                    aria-expanded={isListExpanded}
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                            transform: isListExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                        }}
                    >
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            </div>

            {error && (
                <div className={styles.errorBanner}>
                    <p>
                        <strong>Couldn't load stations</strong>
                    </p>
                    <p>{error}</p>
                </div>
            )}

            <div
                className={`${styles.list} ${!isListExpanded ? styles.listCollapsed : ""}`}
                role="listbox"
                aria-label="Stations"
            >
                {stations.length === 0 && (
                    <p className={styles.empty}>No stations match your search.</p>
                )}
                {stations.map((s) => {
                    return (
                        <div
                            key={s.id}
                            role="option"
                            aria-selected={s.id === selectedId}
                            className={`${styles.row} ${s.id === selectedId ? styles.rowActive : ""}`}
                            onClick={() => onSelect(s.id)}
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    onSelect(s.id);
                                    e.preventDefault();
                                }
                            }}
                        >
                            <span className={styles.rowBody}>
                                <span className={styles.name}>{s.name}</span>
                                <span className={styles.type}>{s.type.toLowerCase()}</span>
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button
                                    className={styles.favBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleFavorite(s.id);
                                    }}
                                    title={
                                        favorites.has(s.id) ? "Remove favorite" : "Add to favorites"
                                    }
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        display: "flex",
                                    }}
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        fill={favorites.has(s.id) ? "#eab308" : "none"}
                                        stroke={favorites.has(s.id) ? "#eab308" : "var(--text-xmuted)"}
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                </button>
                                <ScoreBadge score={s.final_score} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
