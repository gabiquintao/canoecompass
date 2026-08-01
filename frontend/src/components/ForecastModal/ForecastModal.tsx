import type { Station } from "../../types/api";
import { ScoreBadge } from "../ScoreBadge/ScoreBadge";
import styles from "./ForecastModal.module.css";
import {
    ComposedChart,
    Line,
    Area,
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
            index === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" });
        const day = date.toLocaleDateString("en-US", { day: "numeric" });
        return { weekday, date: day };
    } catch {
        return { weekday: dateStr, date: "" };
    }
}

function formatDayHeading(dateStr: string, index: number): string {
    if (!dateStr) return "";
    try {
        const date = new Date(`${dateStr}T00:00:00`);
        const formatted = date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
        return index === 0 ? `Today, ${formatted.split(", ").slice(1).join(", ")}` : formatted;
    } catch {
        return dateStr;
    }
}

export function ForecastModal({ station, isOpen = false, onClose }: Props) {
    const { forecasts, loading, error } = useStationForecast(station?.id ?? null);

    const [selectedDay, setSelectedDay] = useState("");
    const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

    const days = Array.from(new Set(forecasts.map((f) => f.timestamp.slice(0, 10))));
    const activeDay = selectedDay || days[0] || "";
    const activeDayIndex = days.indexOf(activeDay);
    const dayHours = forecasts.filter((f) => f.timestamp.startsWith(activeDay));

    const isRiver = station?.type === "RIVER";

    const chartData = dayHours.map((h) => ({
        time: h.timestamp.slice(11, 16),
        wind: h.wind_speed_kmh ?? null,
        gust: h.wind_gust_kmh ?? null,
        level: isRiver ? (h.flow_rate_m3s ?? null) : (h.tide_level_m ?? null),
    }));

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !station) return null;

    const levelLabel = isRiver ? "Flow rate" : "Tide level";
    const levelUnit = isRiver ? "m\u00b3/s" : "m";

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.titleArea}>
                        <h2 className={styles.title}>{station.name}</h2>
                        <span className={styles.subtitle}>
                            {station.type === "RIVER" ? "River" : "Tidal"} &middot; Hourly wind,
                            gust and {levelLabel.toLowerCase()}
                        </span>
                    </div>
                    <button
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Close forecast"
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
                    {loading && <p className={styles.subtitle}>Loading 7-day forecast\u2026</p>}
                    {error && (
                        <p className={styles.errorText}>Couldn&apos;t load the forecast. {error}</p>
                    )}

                    {!loading && !error && dayHours.length === 0 && (
                        <p className={styles.subtitle}>No forecast data for this day.</p>
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
                                            stroke="#e1e0d9"
                                            strokeWidth={1}
                                        />
                                        <XAxis
                                            dataKey="time"
                                            tick={{ fill: "#898781", fontSize: 11 }}
                                            axisLine={{ stroke: "#c3c2b7" }}
                                            tickLine={false}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tick={{ fill: "#898781", fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={36}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "#ffffff",
                                                border: "0.5px solid #e2e8f0",
                                                borderRadius: 8,
                                                fontSize: 12,
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="level"
                                            name={levelLabel}
                                            stroke="#1baf7a"
                                            fill="#1baf7a"
                                            fillOpacity={0.1}
                                            strokeWidth={1}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="wind"
                                            name="Wind speed"
                                            stroke="#2a78d6"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="gust"
                                            name="Gust"
                                            stroke="#eb6834"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <div className={styles.legend}>
                                <span className={styles.legendItem}>
                                    <span
                                        className={styles.legendSwatchLine}
                                        style={{ background: "#2a78d6" }}
                                    />
                                    Wind speed
                                </span>
                                <span className={styles.legendItem}>
                                    <span
                                        className={styles.legendSwatchLine}
                                        style={{ background: "#eb6834" }}
                                    />
                                    Gust
                                </span>
                                <span className={styles.legendItem}>
                                    <span
                                        className={styles.legendSwatchFill}
                                        style={{ background: "#1baf7a" }}
                                    />
                                    {levelLabel}
                                </span>
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
                                        <th className={styles.numCol}>{levelLabel}</th>
                                        <th className={styles.numCol}>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dayHours.map((dayHour) => (
                                        <tr key={dayHour.timestamp}>
                                            <td className={styles.mono}>
                                                {dayHour.timestamp.slice(11, 16)}
                                            </td>
                                            <td className={`${styles.mono} ${styles.numCol}`}>
                                                {dayHour.wind_speed_kmh != null
                                                    ? `${dayHour.wind_speed_kmh} km/h`
                                                    : "\u2014"}
                                            </td>
                                            <td className={`${styles.mono} ${styles.numCol}`}>
                                                {dayHour.wind_gust_kmh != null
                                                    ? `${dayHour.wind_gust_kmh} km/h`
                                                    : "\u2014"}
                                            </td>
                                            <td className={`${styles.mono} ${styles.numCol}`}>
                                                {isRiver
                                                    ? dayHour.flow_rate_m3s != null
                                                        ? `${dayHour.flow_rate_m3s} ${levelUnit}`
                                                        : "\u2014"
                                                    : dayHour.tide_level_m != null
                                                      ? `${dayHour.tide_level_m} ${levelUnit}`
                                                      : "\u2014"}
                                            </td>
                                            <td className={styles.numCol}>
                                                <div className={styles.badgeCell}>
                                                    <ScoreBadge score={dayHour.final_score} />
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
