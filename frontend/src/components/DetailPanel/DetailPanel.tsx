import type { Station, NavigabilityScore } from "../../types/api";
import { SCORE_META } from "../../constants/scores";
import styles from "./DetailPanel.module.css";
import { useStationHistory } from "../../hooks/useStationHistory";
import { useStationForecast } from "../../hooks/useStationForecast";
import { useTimezone } from "../../hooks/useTimezone";
import { formatTimestamp } from "../../lib/timeUtils";

import { InfoTooltip } from "../Tooltip/Tooltip";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ScoreBadge } from "../ScoreBadge/ScoreBadge";

interface Props {
    station: Station | null;
    isOpen: boolean;
    onOpenForecast: () => void;
    onBack: () => void;
    isFavorite: boolean;
    onToggleFavorite: (id: number) => void;
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    const rad = (d: number) => ((d - 90) * Math.PI) / 180;
    const s = { x: cx + r * Math.cos(rad(startDeg)), y: cy + r * Math.sin(rad(startDeg)) };
    const e = { x: cx + r * Math.cos(rad(endDeg)), y: cy + r * Math.sin(rad(endDeg)) };
    const large = endDeg - startDeg >= 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function ArcGauge({
    value,
    min = 0,
    max,
    unit,
    label,
    score,
    tooltip,
    formatValue,
}: {
    value: number | null;
    min?: number;
    max: number;
    unit: string;
    label: string;
    score: NavigabilityScore | null;
    tooltip?: string;
    formatValue?: (v: number) => string;
}) {
    const { color } = SCORE_META[score ?? "UNKNOWN"];
    const range = max - min;
    const p = value != null && range > 0 ? Math.min(Math.max((value - min) / range, 0), 1) : 0;
    const fillAngle = -90 + p * 180;
    const displayVal = value != null ? (formatValue ? formatValue(value) : value.toFixed(1)) : "—";

    return (
        <figure className={styles.gauge}>
            <svg viewBox="0 0 110 66" role="img" aria-label={`${label}: ${displayVal} ${unit}`}>
                <path
                    d={arcPath(55, 62, 46, -90, 90)}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth={8}
                    strokeLinecap="round"
                />
                <path
                    d={arcPath(55, 62, 46, -90, fillAngle)}
                    fill="none"
                    stroke={color}
                    strokeWidth={8}
                    strokeLinecap="round"
                />
            </svg>
            <figcaption className={styles.gaugeContent}>
                <span className={styles.gaugeValue}>
                    {displayVal}
                    <small className={styles.gaugeUnit}>{unit}</small>
                </span>
                <span className={styles.gaugeLabel}>
                    {label}
                    {tooltip && <InfoTooltip content={tooltip} />}
                </span>
            </figcaption>
        </figure>
    );
}

function SecondGauge({ station }: { station: Station }) {
    if (station.type === "RIVER") {
        const flowMax = station.flow_danger ?? (station.flow_max ?? 100) * 1.5;
        return (
            <ArcGauge
                value={station.flow_rate_m3s}
                min={0}
                max={flowMax || 100}
                unit="m³/s"
                label="Flow"
                score={station.flow_score}
                tooltip={`River discharge. Calibrated ideal: ${station.flow_min?.toFixed(0) ?? "?"} – ${station.flow_max?.toFixed(0) ?? "?"} m³/s`}
                formatValue={(v) => v.toFixed(0)}
            />
        );
    }
    if (station.type === "ESTUARY" || station.type === "LAGOON" || station.type === "COASTAL") {
        return (
            <ArcGauge
                value={station.tide_level_m}
                min={-1.8}
                max={1.8}
                unit="m MSL"
                label="Tide"
                score={station.tide_score}
                tooltip="Current tide elevation relative to Mean Sea Level (MSL)."
                formatValue={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}`}
            />
        );
    }
    return (
        <ArcGauge
            value={station.wind_gust_kmh}
            min={0}
            max={65}
            unit="km/h"
            label="Gust"
            score={station.wind_score}
            tooltip="Peak wind gust speed at current hour. >30 km/h can cause loss of boat control."
            formatValue={(v) => v.toFixed(0)}
        />
    );
}

function Metric({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
    return (
        <div className={styles.metric}>
            <span className={styles.metricLabel}>
                {label}
                {tooltip && <InfoTooltip content={tooltip} />}
            </span>
            <span className={styles.metricValue}>{value}</span>
        </div>
    );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{label}</span>
            <span className={mono ? styles.metaValueMono : styles.metaValue}>{value}</span>
        </div>
    );
}

function ExtraMetrics({ station }: { station: Station }) {
    const { type } = station;
    const isTidal = type === "ESTUARY" || type === "LAGOON" || type === "COASTAL";
    const items: { label: string; value: string; tooltip?: string }[] = [];

    if (station.wind_speed_kmh != null) {
        items.push({
            label: "Wind speed",
            value: `${station.wind_speed_kmh.toFixed(0)} km/h`,
            tooltip:
                "Sustained 10-minute average wind speed at 10m height. ≤15 km/h is excellent for canoeing.",
        });
    }

    if (station.wind_gust_kmh != null) {
        items.push({
            label: "Gusts",
            value: `${station.wind_gust_kmh.toFixed(0)} km/h`,
            tooltip:
                "Brief, sudden spikes in wind speed lasting under 20 seconds. Gusts >30 km/h can cause capsizing or loss of boat control.",
        });
    }

    if (isTidal && station.tide_level_m != null) {
        items.push({
            label: "Tide Level",
            value: `${station.tide_level_m > 0 ? "+" : ""}${station.tide_level_m.toFixed(2)} m MSL`,
            tooltip:
                "Current tide elevation relative to Mean Sea Level (MSL 0.0m = average sea level). In estuaries, higher tides submerge mudflats and shallow rocks.",
        });
    }

    if (isTidal && station.wave_height_m != null) {
        items.push({
            label: "Wave Height",
            value: `${station.wave_height_m.toFixed(2)} m`,
            tooltip:
                "Significant wave height in meters. For coastal and estuary paddling, calm waves (<0.5m) are best.",
        });
    }

    if (type === "RIVER" && station.flow_rate_m3s != null) {
        items.push({
            label: "Flow rate",
            value: `${station.flow_rate_m3s.toFixed(0)} m³/s`,
            tooltip:
                "Current volumetric river discharge rate in m³/s. Requires enough water to avoid rocks without strong currents.",
        });
    }

    if (type === "RIVER" && station.flow_min != null && station.flow_max != null) {
        items.push({
            label: "Ideal range",
            value: `${station.flow_min.toFixed(0)} – ${station.flow_max.toFixed(0)} m³/s`,
            tooltip:
                "Calibrated ideal flow range for this river (15th–80th percentile of past year).",
        });
    }

    if (items.length === 0) return null;

    return (
        <div className={styles.metrics}>
            {items.map((item) => (
                <Metric
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    tooltip={item.tooltip}
                />
            ))}
        </div>
    );
}

export function DetailPanel({
    station,
    isOpen,
    onOpenForecast,
    onBack,
    isFavorite,
    onToggleFavorite,
}: Props) {
    const {
        history,
        loading: historyLoading,
        error: historyError,
    } = useStationHistory(station?.id ?? null);
    const { forecasts } = useStationForecast(station?.id ?? null);
    const { timezone } = useTimezone();
    const isTidal =
        station?.type === "ESTUARY" || station?.type === "LAGOON" || station?.type === "COASTAL";
    const isRiver = station?.type === "RIVER";
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayHours = forecasts?.hourly?.filter((f) => f.timestamp.startsWith(todayStr)) ?? [];
    const summary = forecasts?.daily_summaries?.[todayStr];
    const highs = summary?.high_tides ?? [];
    const lows = summary?.low_tides ?? [];
    const bestWindow = summary?.best_paddling_window ?? null;

    if (!station) {
        return <section className={`${styles.panel} ${styles.closed}`} aria-hidden="true" />;
    }

    return (
        <section
            className={`${styles.panel} ${!isOpen ? styles.closed : ""}`}
            aria-label="Station detail"
        >
            <div className={styles.header}>
                <button
                    className={styles.backBtn}
                    onClick={onBack}
                    title="Back to list [Esc]"
                    aria-label="Back to list"
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </button>
                <div className={styles.headerText}>
                    <div className={styles.nameColumn}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <h2 className={styles.stationName}>{station.name}</h2>
                            <button
                                onClick={() => onToggleFavorite(station.id)}
                                title={isFavorite ? "Remove favorite" : "Add to favorites"}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "2px",
                                    display: "flex",
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    fill={isFavorite ? "var(--accent-color)" : "none"}
                                    stroke={
                                        isFavorite ? "var(--accent-color)" : "var(--text-secondary)"
                                    }
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                >
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                        </div>
                        <span className={styles.stationType}>{station.type.toLowerCase()}</span>
                    </div>
                    <ScoreBadge score={station.final_score} />
                </div>
            </div>

            <div className={styles.body}>
                <div className={styles.gauges}>
                    <ArcGauge
                        value={station.wind_speed_kmh}
                        min={0}
                        max={50}
                        unit="km/h"
                        label="Wind"
                        score={station.wind_score}
                        tooltip="Sustained wind speed at current hour (10m). ≤15 excellent · ≤25 good · ≤40 poor · >40 dangerous"
                        formatValue={(v) => v.toFixed(0)}
                    />
                    <SecondGauge station={station} />
                </div>

                <ExtraMetrics station={station} />

                {todayHours.length > 0 && (
                    <div className={styles.highlights}>
                        {isTidal && (
                            <div className={styles.highlightCard}>
                                <div className={styles.highlightHeader}>
                                    <span className={styles.highlightTitle}>Tides Today (MSL)</span>
                                    <InfoTooltip content="All high and low tide times and heights above/below Mean Sea Level for today." />
                                </div>
                                <div className={styles.tideGrid}>
                                    <div className={styles.tideRow}>
                                        <span className={styles.tideLabel}>↑ High Tides</span>
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
                                        <span className={styles.tideLabel}>↓ Low Tides</span>
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
                            </div>
                        )}
                        <div className={styles.highlightCard}>
                            <div className={styles.highlightHeader}>
                                <span className={styles.highlightTitle}>
                                    Best Paddling Window Today
                                </span>
                                <InfoTooltip content="The best time window today for canoeing based on tide level, wind speed, gusts, and wave conditions." />
                            </div>
                            <div className={styles.highlightValueRow}>
                                <div className={styles.highlightTime}>
                                    {bestWindow?.start_time && bestWindow?.end_time ? (
                                        <>
                                            <ScoreBadge
                                                variant="dot"
                                                score={bestWindow.peak_hour.final_score}
                                            />{" "}
                                            {bestWindow.start_time} - {bestWindow.end_time}
                                        </>
                                    ) : (
                                        `At ${bestWindow?.peak_hour.timestamp ? formatTimestamp(bestWindow.peak_hour.timestamp, timezone) : "—"}`
                                    )}
                                </div>
                            </div>
                            <div className={styles.highlightPills}>
                                {isTidal ? (
                                    <>
                                        <span className={styles.pill}>
                                            Tide{" "}
                                            {bestWindow?.peak_hour.tide_level_m != null &&
                                            bestWindow.peak_hour.tide_level_m > 0
                                                ? "+"
                                                : ""}
                                            {bestWindow?.peak_hour.tide_level_m?.toFixed(2) ?? "—"}m
                                        </span>
                                        <span className={styles.pill}>
                                            Wind{" "}
                                            {bestWindow?.peak_hour.wind_speed_kmh?.toFixed(0) ??
                                                "—"}{" "}
                                            km/h
                                        </span>
                                        <span className={styles.pill}>
                                            Waves{" "}
                                            {bestWindow?.peak_hour.wave_height_m?.toFixed(2) ?? "—"}
                                            m
                                        </span>
                                    </>
                                ) : isRiver ? (
                                    <>
                                        <span className={styles.pill}>
                                            Flow{" "}
                                            {bestWindow?.peak_hour.flow_rate_m3s?.toFixed(0) ?? "—"}{" "}
                                            m³/s
                                        </span>
                                        <span className={styles.pill}>
                                            Wind{" "}
                                            {bestWindow?.peak_hour.wind_speed_kmh?.toFixed(0) ??
                                                "—"}{" "}
                                            km/h
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <span className={styles.pill}>
                                            Wind{" "}
                                            {bestWindow?.peak_hour.wind_speed_kmh?.toFixed(0) ??
                                                "—"}{" "}
                                            km/h
                                        </span>
                                        <span className={styles.pill}>
                                            Gust{" "}
                                            {bestWindow?.peak_hour.wind_gust_kmh?.toFixed(0) ?? "—"}{" "}
                                            km/h
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {historyLoading && <p className={styles.loadingText}>Loading history…</p>}

                {historyError && (
                    <p className={styles.errorText} style={{ marginTop: 12 }}>
                        Couldn't load the history. {historyError}
                    </p>
                )}

                {!historyLoading && !historyError && history.length > 0 && (
                    <div className={styles.chart}>
                        <div className={styles.chartLabel}>
                            <span>7-day history</span>
                            <InfoTooltip content="Historical daily marine and wind observations over the past 7 days." />
                        </div>
                        <ResponsiveContainer width="100%" height={120}>
                            <LineChart
                                data={history}
                                margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
                            >
                                <XAxis dataKey="date" hide={true} />
                                <YAxis
                                    yAxisId="a"
                                    fontSize={10}
                                    tick={{ fill: "var(--text-xmuted)" }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={28}
                                />
                                <YAxis
                                    yAxisId="b"
                                    orientation="right"
                                    fontSize={10}
                                    tick={{ fill: "var(--text-xmuted)" }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={28}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--surface)",
                                        border: "1px solid var(--border)",
                                        borderRadius: 4,
                                        fontSize: 11,
                                    }}
                                />
                                {isRiver && (
                                    <Line
                                        yAxisId="a"
                                        type="monotone"
                                        dataKey="flow_rate"
                                        stroke="hsl(210,80%,52%)"
                                        strokeWidth={1.5}
                                        dot={false}
                                        isAnimationActive={false}
                                        name="Flow (m³/s)"
                                    />
                                )}
                                {isTidal && (
                                    <>
                                        <Line
                                            yAxisId="a"
                                            type="monotone"
                                            dataKey="tide_level"
                                            stroke="hsl(210,80%,52%)"
                                            strokeWidth={1.5}
                                            dot={false}
                                            isAnimationActive={false}
                                            name="Tide (m MSL)"
                                        />
                                        <Line
                                            yAxisId="a"
                                            type="monotone"
                                            dataKey="wave_height"
                                            stroke="hsl(275,55%,60%)"
                                            strokeWidth={1.5}
                                            dot={false}
                                            isAnimationActive={false}
                                            name="Wave height (m)"
                                        />
                                    </>
                                )}
                                <Line
                                    yAxisId="b"
                                    type="monotone"
                                    dataKey="wind_speed"
                                    stroke="hsl(165,65%,45%)"
                                    strokeWidth={1.5}
                                    dot={false}
                                    isAnimationActive={false}
                                    name="Wind (km/h)"
                                />
                                <Line
                                    yAxisId="b"
                                    type="monotone"
                                    dataKey="wind_gust"
                                    stroke="hsl(28,85%,55%)"
                                    strokeWidth={1.5}
                                    dot={false}
                                    isAnimationActive={false}
                                    name="Gust (km/h)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className={styles.meta}>
                    <MetaRow label="Lat" value={`${station.latitude.toFixed(4)}° N`} mono />
                    <MetaRow label="Lon" value={`${station.longitude.toFixed(4)}° W`} mono />
                    <MetaRow label="Type" value={station.type} />
                </div>

                <button
                    className={styles.forecastBtn}
                    onClick={onOpenForecast}
                    title="Open 7-day hourly forecast [F]"
                >
                    View full forecast
                </button>
            </div>
        </section>
    );
}
