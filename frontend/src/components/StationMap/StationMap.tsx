import { useState, useEffect, useRef } from "react";
import {
    MapContainer,
    TileLayer,
    CircleMarker,
    Tooltip,
    useMapEvents,
    ZoomControl,
} from "react-leaflet";
import type { Station } from "../../types/api";
import { SCORE_META } from "../../constants/scores";
import { ScoreBadge } from "../ScoreBadge/ScoreBadge";
import styles from "./StationMap.module.css";
import { AddStationModal } from "./AddStationModal";
import type L from "leaflet";

const PORTUGAL_BOUNDS: [[number, number], [number, number]] = [
    [36.8, -9.8],
    [42.2, -6.1],
];

function MapClickListener({
    onMapClick,
    disabled,
}: {
    onMapClick: (lat: number, lng: number) => void;
    disabled: boolean;
}) {
    useMapEvents({ click: (e) => !disabled && onMapClick(e.latlng.lat, e.latlng.lng) });
    return null;
}

function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Props {
    stations: Station[];
    selectedId: number | null;
    onSelect: (id: number) => void;
    onStationAdded?: () => void;
    isDark: boolean;
    isAddingMode: boolean;
    onSetAddingMode: (val: boolean) => void;
}

export function StationMap({
    stations,
    selectedId,
    onSelect,
    onStationAdded,
    isDark,
    isAddingMode,
    onSetAddingMode,
}: Props) {
    const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);
    const mapRef = useRef<L.Map | null>(null);

    // After the map mounts, re-measure the container so tiles paint correctly on iOS.
    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.invalidateSize();
        }
    }, []);

    const handleMapClick = (lat: number, lng: number) => {
        const nearby = stations.find((s) => distKm(lat, lng, s.latitude, s.longitude) < 0.5);
        if (nearby) {
            onSelect(nearby.id);
        }
    };

    const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    return (
        <section className={styles.section} aria-label="Station map">
            {newCoords && (
                <AddStationModal
                    lat={newCoords.lat}
                    lng={newCoords.lng}
                    onClose={() => setNewCoords(null)}
                    onSuccess={() => {
                        onStationAdded?.();
                        setNewCoords(null);
                    }}
                />
            )}

            <MapContainer
                ref={(m) => { mapRef.current = m; }}
                bounds={PORTUGAL_BOUNDS}
                className={styles.map}
                zoomControl={false}
            >
                <ZoomControl position="bottomright" />
                <TileLayer key={tileUrl} url={tileUrl} />
                <MapClickListener
                    onMapClick={handleMapClick}
                    disabled={isAddingMode || !!newCoords}
                />
                {stations.map((s) => {
                    const sel = s.id === selectedId;
                    const color = SCORE_META[s.final_score]?.color ?? "hsl(220,8%,56%)";

                    return (
                        <CircleMarker
                            key={s.id}
                            center={[s.latitude, s.longitude]}
                            radius={sel ? 9 : 6}
                            pathOptions={{
                                fillColor: sel ? "#ffffff" : color,
                                color: sel ? color : "#ffffff",
                                weight: sel ? 2.5 : 1.5,
                                fillOpacity: 1,
                            }}
                            eventHandlers={{ click: () => onSelect(s.id) }}
                        >
                            <Tooltip>
                                <strong>{s.name}</strong>
                                <br />
                                <div style={{ marginTop: 4 }}>
                                    <ScoreBadge score={s.final_score} />
                                </div>
                            </Tooltip>
                        </CircleMarker>
                    );
                })}
            </MapContainer>

            {isAddingMode && (
                <div className={styles.crosshairOverlay}>
                    <div className={styles.crosshair}>+</div>
                    <div className={styles.addSpotActions}>
                        <button className={styles.cancelBtn} onClick={() => onSetAddingMode(false)}>
                            Cancel
                        </button>
                        <button
                            className={styles.confirmBtn}
                            onClick={() => {
                                if (mapRef.current) {
                                    const center = mapRef.current.getCenter();
                                    setNewCoords({ lat: center.lat, lng: center.lng });
                                    onSetAddingMode(false);
                                }
                            }}
                        >
                            Confirm Location
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
