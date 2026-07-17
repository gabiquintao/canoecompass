import type { Station } from "../../types/api";
import { ScoreBadge } from "../ScoreBadge/ScoreBadge";
import styles from "./DetailPanel.module.css";
import { useStationHistory } from "../../hooks/useStationHistory";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
    station: Station | null;
}

export function DetailPanel({ station }: Props) {
    const { history, loading } = useStationHistory(station?.id ?? null);

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

                <SectionTitle>Measurements</SectionTitle>
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

                <SectionTitle>Geolocation</SectionTitle>
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

                <SectionTitle>Recent History</SectionTitle>

                {loading && <p className={styles.loadingText}>Loading</p>}

                {!loading && history.length > 0 && (
                    <div style={{ width: "100%", height: 250, marginTop: "1rem" }}>
                        <ResponsiveContainer>
                            <LineChart
                                data={history}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <XAxis dataKey="date" fontSize={12} />

                                <YAxis
                                    yAxisId="flow"
                                    orientation="left"
                                    stroke="#3b82f6"
                                    fontSize={12}
                                />

                                <YAxis
                                    yAxisId="wind"
                                    orientation="right"
                                    stroke="#10b981"
                                    fontSize={12}
                                />

                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "8px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                    }}
                                />

                                <Line
                                    yAxisId="flow"
                                    type="monotone"
                                    dataKey="flow_rate"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    name="Flow Rate (m³/s)"
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />

                                <Line
                                    yAxisId="wind"
                                    type="monotone"
                                    dataKey="wind_speed"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    name="Vento (km/h)"
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </section>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return <div className={styles.sectionTitle}>{children}</div>;
}
