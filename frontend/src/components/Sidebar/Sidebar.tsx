import type { Station } from "../../types/api";
import { SCORE_META } from "../../constants/scores";
import { ScoreBadge } from "../ScoreBadge/ScoreBadge";
import styles from "./Sidebar.module.css";

interface Props {
    stations: Station[];
    selectedCode: string | null;
    onSelect: (code: string) => void;
    searchQuery: string;
    onSearch: (query: string) => void;
}

export function Sidebar({ stations, selectedCode, onSelect, searchQuery, onSearch }: Props) {
    const filtered = stations.filter((s) =>
        s.station_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <aside className={styles.sidebar}>
            <div className={styles.search}>
                <input
                    id="station-search"
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                    aria-label="Filter stations"
                    className={styles.searchInput}
                />
                <span className={styles.count}>
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table} role="grid" aria-label="Station list">
                    <thead>
                        <tr>
                            <th>Station</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className={styles.empty}>
                                    No stations match your search.
                                </td>
                            </tr>
                        )}
                        {filtered.map((s) => (
                            <tr
                                key={s.station_code}
                                className={`${styles.row} ${s.station_code === selectedCode ? styles.rowActive : ""}`}
                                onClick={() => onSelect(s.station_code)}
                                tabIndex={0}
                                onKeyDown={(e) => e.key === "Enter" && onSelect(s.station_code)}
                                aria-selected={s.station_code === selectedCode}
                            >
                                <td>
                                    <div className={styles.name}>{s.station_name}</div>
                                    <div className={styles.code}>{s.station_code}</div>
                                </td>
                                <td>
                                    <ScoreBadge score={s.final_score} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className={styles.legend}>
                <div className={styles.legendTitle}>NAVIGABILITY LEGEND</div>
                {(
                    Object.entries(SCORE_META) as [
                        string,
                        (typeof SCORE_META)[keyof typeof SCORE_META],
                    ][]
                ).map(([key, meta]) => (
                    <div key={key} className={styles.legendItem}>
                        <span className={styles.dot} style={{ background: meta.color }} />
                        <span className={styles.legendLabel}>{meta.label}</span>
                        <span className={styles.legendNote}>{meta.description}</span>
                    </div>
                ))}
            </div>
        </aside>
    );
}
