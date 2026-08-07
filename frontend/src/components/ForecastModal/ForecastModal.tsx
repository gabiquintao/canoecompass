import type { Station } from "../../types/api";
import { ScoreBadge } from "../ScoreBadge/ScoreBadge";
import styles from "./ForecastModal.module.css";
import {
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { useStationForecast } from "../../hooks/useStationForecast";

import { useState, useEffect } from "react";

interface Props {
    station: Station | null;
    isOpen: boolean;
    onClose: () => void;
}

function formatDayLabel(dateStr: string, index: number): { weekday: string; date: string } {
    if (!dateStr) return { weekday: "", date: "" };
    try {
        const date = new Date(`${dateStr}T00:00:00`);
        const weekday =
            index === 0 ? "Today" : date.toLocaleDateString("en-GB", { weekday: "short" });
        const day = date.toLocaleDateString("en-GB", { day: "numeric" });
        return { weekday, date: day };
    } catch {
        return { weekday: dateStr, date: "" };
    }
}

function formatDayHeading(dateStr: string, index: number): string {
    if (!dateStr) return "";
    try {
        const date = new Date(`${dateStr}T00:00:00`);
        const monthDay = date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
        const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
        return index === 0 ? `Today, ${monthDay}` : `${weekday}, ${monthDay}`;
    } catch {
        return dateStr;
    }
}

export function ForecastModal({ station, isOpen = false, onClose }: Props) {
    const { forecasts, loading, error } = useStationForecast(station?.id ?? null);

    const [selectedDay, setSelectedDay] = useState("");
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

    const days = forecasts ? Object.keys(forecasts.daily_summaries) : [];
    const activeDay = selectedDay || days[0] || "";
    const activeDayIndex = days.indexOf(activeDay);
    const dayHours = forecasts
        ? forecasts.hourly.filter((f) => f.timestamp.startsWith(activeDay))
        : [];

    const type = station?.type ?? "RIVER";
    const isRiver = type === "RIVER";
    const isTidal = type === "ESTUARY" || type === "LAGOON" || type === "COASTAL";
    const levelLabel = isRiver ? "Flow" : "Tide level";

    const summary = forecasts?.daily_summaries?.[activeDay];
    const highs = summary?.high_tides ?? [];
    const lows = summary?.low_tides ?? [];
    const bestHour = summary?.best_paddling_window ?? null;
    const chartData = dayHours.map((h) => ({
        time: h.timestamp.slice(11, 16),
        wind: h.wind_speed_kmh ?? null,
        gust: h.wind_gust_kmh ?? null,
        level: isRiver ? (h.flow_rate_m3s ?? null) : isTidal ? (h.tide_level_m ?? null) : null,
        wave: isTidal ? (h.wave_height_m ?? null) : null,
    }));

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    if (!isOpen || !station) return null;

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <h2 className={styles.title}>{station.name}</h2>
                        <p className={styles.subtitle}>
                            {station.type} · Hourly wind, gust
                            {isTidal ? ", tide and waves" : isRiver ? " and flow" : ""}
                        </p>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close forecast  [Esc]"
                        title="Close  [Esc]"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M1 1L13 13M13 1L1 13"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                <div className={styles.days}>
                    {days.map((day, idx) => {
                        const { weekday, date } = formatDayLabel(day, idx);
                        const active = day === activeDay;
                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`${styles.dayChip} ${active ? styles.dayChipActive : ""}`}
                            >
                                <span className={styles.dayWeekday}>{weekday}</span>
                                <span className={styles.dayDate}>{date}</span>
                            </button>
                        );
                    })}
                </div>

                <div className={styles.toolbar}>
                    <span className={styles.toolbarTitle}>
                        {formatDayHeading(activeDay, activeDayIndex)}
                    </span>
                    <div className={styles.viewTabs}>
                        <button
                            className={`${styles.viewTab} ${viewMode === "chart" ? styles.viewTabActive : ""}`}
                            onClick={() => setViewMode("chart")}
                        >
                            Chart
                        </button>
                        <button
                            className={`${styles.viewTab} ${viewMode === "table" ? styles.viewTabActive : ""}`}
                            onClick={() => setViewMode("table")}
                        >
                            Table
                        </button>
                    </div>
                </div>

                <div className={styles.body}>
                    {loading && <p className={styles.subtitle}>Loading 7-day forecast…</p>}
                    {error && (
                        <p className={styles.errorText}>Couldn&apos;t load the forecast. {error}</p>
                    )}
                    {!loading && !error && dayHours.length === 0 && (
                        <p className={styles.subtitle}>No forecast data for this day.</p>
                    )}

                    {!loading && dayHours.length > 0 && viewMode === "chart" && (
                        <div className={styles.summaryGrid}>
                            {(isRiver || isTidal) && (
                                <div className={styles.summaryItem}>
                                    <span className={styles.summaryLabel}>
                                        {isRiver ? "Daily flow" : "Tides Today (MSL)"}
                                    </span>
                                    {isRiver ? (
                                        <>
                                            <div className={styles.summaryValue}>
                                                <span>
                                                    {station.flow_rate_m3s?.toFixed(0) ?? "—"} m³/s
                                                </span>
                                                <ScoreBadge
                                                    score={station.flow_score ?? "UNKNOWN"}
                                                />
                                            </div>
                                            <span className={styles.summarySubtext}>
                                                Same throughout the day
                                            </span>
                                        </>
                                    ) : (
                                        <div className={styles.tideGrid}>
                                            <div className={styles.tideRow}>
                                                <span className={styles.tideLabel}>
                                                    ↑ High Tides
                                                </span>
                                                <span className={styles.tideValHigh}>
                                                    {highs
                                                        .map(
                                                            (h) =>
                                                                `${h.time} (${h.level > 0 ? "+" : ""}${h.level.toFixed(2)}m)`
                                                        )
                                                        .join("   ·   ") || "—"}
                                                </span>
                                            </div>
                                            <div className={styles.tideRow}>
                                                <span className={styles.tideLabel}>
                                                    ↓ Low Tides
                                                </span>
                                                <span className={styles.tideValLow}>
                                                    {lows
                                                        .map(
                                                            (l) =>
                                                                `${l.time} (${l.level > 0 ? "+" : ""}${l.level.toFixed(2)}m)`
                                                        )
                                                        .join("   ·   ") || "—"}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Best paddling window</span>
                                <div className={styles.summaryValue}>
                                    <div className={styles.summaryTop}>
                                        <ScoreBadge
                                            variant="dot"
                                            score={bestHour?.peak_hour.final_score ?? "UNKNOWN"}
                                        />
                                        <h4 className={styles.summaryTitle}>
                                            {bestHour?.start_time && bestHour?.end_time
                                                ? `${bestHour.start_time} - ${bestHour.end_time}`
                                                : `At ${bestHour?.peak_hour.timestamp.slice(11, 16) ?? "—"}`}
                                        </h4>
                                    </div>
                                </div>
                                <div className={styles.summarySub}>
                                    {isTidal
                                        ? `Tide: ${bestHour?.peak_hour.tide_level_m?.toFixed(2) ?? "—"} m · Wind: ${bestHour?.peak_hour.wind_speed_kmh ?? "—"} km/h · Waves: ${bestHour?.peak_hour.wave_height_m?.toFixed(2) ?? "—"} m`
                                        : `Wind: ${bestHour?.peak_hour.wind_speed_kmh ?? "—"} km/h · Gust: ${bestHour?.peak_hour.wind_gust_kmh ?? "—"} km/h`}
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && dayHours.length > 0 && viewMode === "chart" && (
                        <div className={styles.chartCard}>
                            <div className={styles.chartArea}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={chartData}
                                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid
                                            vertical={false}
                                            stroke="var(--border)"
                                            strokeWidth={1}
                                        />
                                        <XAxis
                                            dataKey="time"
                                            ticks={[
                                                "03:00",
                                                "06:00",
                                                "09:00",
                                                "12:00",
                                                "15:00",
                                                "18:00",
                                                "21:00",
                                            ]}
                                            tick={{ fill: "var(--text-xmuted)", fontSize: 11 }}
                                            axisLine={{ stroke: "var(--border)" }}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            tick={{ fill: "var(--text-xmuted)", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={36}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "var(--surface)",
                                                border: "1px solid var(--border)",
                                                borderRadius: 6,
                                                fontSize: 12,
                                            }}
                                        />
                                        {(isRiver || isTidal) && (
                                            <Line
                                                type="monotone"
                                                dataKey="level"
                                                name={levelLabel}
                                                stroke="hsl(210,80%,52%)"
                                                strokeWidth={2}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        )}
                                        {isTidal && (
                                            <Line
                                                type="monotone"
                                                dataKey="wave"
                                                name="Wave height (m)"
                                                stroke="hsl(275,55%,60%)"
                                                strokeWidth={2}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        )}
                                        <Line
                                            type="monotone"
                                            dataKey="wind"
                                            name="Wind speed"
                                            stroke="hsl(165,65%,45%)"
                                            strokeWidth={2}
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="gust"
                                            name="Gust"
                                            stroke="hsl(28,85%,55%)"
                                            strokeWidth={2}
                                            dot={false}
                                            isAnimationActive={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <div className={styles.legend}>
                                {(isRiver || isTidal) && (
                                    <span className={styles.legendItem}>
                                        <span
                                            className={styles.legendSwatchFill}
                                            style={{ background: "hsl(210,80%,52%)" }}
                                        />
                                        {levelLabel}
                                    </span>
                                )}
                                <span className={styles.legendItem}>
                                    <span
                                        className={styles.legendSwatchLine}
                                        style={{ background: "hsl(165,65%,45%)" }}
                                    />
                                    Wind
                                </span>
                                <span className={styles.legendItem}>
                                    <span
                                        className={styles.legendSwatchLine}
                                        style={{ background: "hsl(28,85%,55%)" }}
                                    />
                                    Gust
                                </span>
                                {isTidal && (
                                    <span className={styles.legendItem}>
                                        <span
                                            className={styles.legendSwatchLine}
                                            style={{ background: "hsl(275,55%,60%)" }}
                                        />
                                        Wave height
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {!loading && dayHours.length > 0 && viewMode === "table" && (
                        <div className={styles.tableCard}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Hour</th>
                                        <th className={styles.numCol}>Wind</th>
                                        <th className={styles.numCol}>Gust</th>
                                        {isTidal && <th className={styles.numCol}>Tide</th>}
                                        {isTidal && <th className={styles.numCol}>Waves</th>}
                                        {isRiver && <th className={styles.numCol}>Flow</th>}
                                        <th className={styles.numCol}>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dayHours.map((h) => (
                                        <tr key={h.timestamp}>
                                            <td className={styles.mono} data-label="Hour">
                                                {h.timestamp.slice(11, 16)}
                                            </td>
                                            <td
                                                className={`${styles.mono} ${styles.numCol}`}
                                                data-label="Wind"
                                            >
                                                {h.wind_speed_kmh != null
                                                    ? `${h.wind_speed_kmh} km/h`
                                                    : "—"}
                                            </td>
                                            <td
                                                className={`${styles.mono} ${styles.numCol}`}
                                                data-label="Gust"
                                            >
                                                {h.wind_gust_kmh != null
                                                    ? `${h.wind_gust_kmh} km/h`
                                                    : "—"}
                                            </td>
                                            {isTidal && (
                                                <td
                                                    className={`${styles.mono} ${styles.numCol}`}
                                                    data-label="Tide"
                                                >
                                                    {h.tide_level_m != null
                                                        ? `${h.tide_level_m.toFixed(2)} m`
                                                        : "—"}
                                                </td>
                                            )}
                                            {isTidal && (
                                                <td
                                                    className={`${styles.mono} ${styles.numCol}`}
                                                    data-label="Waves"
                                                >
                                                    {h.wave_height_m != null
                                                        ? `${h.wave_height_m.toFixed(2)} m`
                                                        : "—"}
                                                </td>
                                            )}
                                            {isRiver && (
                                                <td
                                                    className={`${styles.mono} ${styles.numCol}`}
                                                    data-label="Flow"
                                                >
                                                    {h.flow_rate_m3s != null
                                                        ? `${h.flow_rate_m3s.toFixed(0)} m³/s`
                                                        : "—"}
                                                </td>
                                            )}
                                            <td className={styles.numCol} data-label="Score">
                                                <div className={styles.badgeCell}>
                                                    <ScoreBadge score={h.final_score} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
