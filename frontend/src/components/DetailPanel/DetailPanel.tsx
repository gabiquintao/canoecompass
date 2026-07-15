import type { Station } from "../../types/api";
import { RIVER_THRESHOLDS, WIND_THRESHOLDS } from "../../constants/scores";
import { ScoreBadge } from "../ScoreBadge/ScoreBadge";
import styles from "./DetailPanel.module.css";

interface Props {
    station: Station | null;
}

export function DetailPanel({ station }: Props) {
    if (!station) {
        return (
            <section className={styles.panel} aria-label="Station detail">
                <div className={styles.empty}>
                    <span>←</span>
                    <p>Select a station from the list or map to view detailed data.</p>
                </div>
            </section>
        );
    }

    // thresholds are now dynamic on the backend

    return (
        <section className={styles.panel} aria-label="Station detail">
            <div className={styles.content}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.name}>{station.name}</h2>
                        <div className={styles.meta}>
                            Type: <code>{station.type}</code>
                        </div>
                    </div>
                    <ScoreBadge score={station.final_score} size="lg" />
                </div>

                <SectionTitle>MEASUREMENTS</SectionTitle>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Parameter</th>
                            <th>Value</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Water Flow</td>
                            <td className={styles.val}>
                                {station.flow_rate_m3s != null ? (
                                    <>
                                        {station.flow_rate_m3s.toFixed(2)}{" "}
                                        <span className={styles.unit}>m³/s</span>
                                    </>
                                ) : (
                                    <span className={styles.na}>No data</span>
                                )}
                            </td>
                            <td>
                                <ScoreBadge score={station.flow_score} />
                            </td>
                        </tr>
                        <tr>
                            <td>Wind Speed</td>
                            <td className={styles.val}>
                                {station.wind_speed_kmh != null ? (
                                    <>
                                        {station.wind_speed_kmh.toFixed(1)}{" "}
                                        <span className={styles.unit}>km/h</span>
                                    </>
                                ) : (
                                    <span className={styles.na}>No data</span>
                                )}
                            </td>
                            <td>
                                <ScoreBadge score={station.wind_score} />
                            </td>
                        </tr>
                    </tbody>
                </table>


                <SectionTitle>WIND THRESHOLDS</SectionTitle>
                <table className={styles.table}>
                    <tbody>
                        <tr>
                            <td>Excellent</td>
                            <td className={styles.val}>≤ {WIND_THRESHOLDS.poor} km/h</td>
                        </tr>
                        <tr>
                            <td>Poor</td>
                            <td className={styles.val}>
                                {WIND_THRESHOLDS.poor}–{WIND_THRESHOLDS.dangerous} km/h
                            </td>
                        </tr>
                        <tr>
                            <td>Dangerous</td>
                            <td className={styles.val}>&gt; {WIND_THRESHOLDS.dangerous} km/h</td>
                        </tr>
                    </tbody>
                </table>

                <SectionTitle>GEOLOCATION</SectionTitle>
                <table className={styles.table}>
                    <tbody>
                        <tr>
                            <td>Latitude</td>
                            <td className={styles.val}>
                                <code>{station.latitude.toFixed(4)}° N</code>
                            </td>
                        </tr>
                        <tr>
                            <td>Longitude</td>
                            <td className={styles.val}>
                                <code>{station.longitude.toFixed(4)}° W</code>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <div className={styles.sectionTitle}>{children}</div>;
}
