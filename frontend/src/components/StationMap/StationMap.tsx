import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import type { Station } from "../../types/api";
import { SCORE_META } from "../../constants/scores";
import styles from "./StationMap.module.css";

interface MapEventsProps {
    onZoom: (zoom: number) => void;
}

function MapEvents({ onZoom }: MapEventsProps) {
    useMapEvents({ zoomend: (e: any) => onZoom(e.target.getZoom()) });
    return null;
}

const PORTUGAL_BOUNDS: [[number, number], [number, number]] = [
    [36.8, -9.8],
    [42.2, -6.1],
];

interface Props {
    stations: Station[];
    selectedCode: string | null;
    onSelect: (code: string) => void;
}

export function StationMap({ stations, selectedCode, onSelect }: Props) {
    const [, setZoom] = useState(6.5);

    return (
        <section className={styles.section} aria-label="Map">
            <MapContainer bounds={PORTUGAL_BOUNDS} className={styles.map}>
                <MapEvents onZoom={setZoom} />

                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

                {stations.map((station) => {
                    const isSelected = station.station_code === selectedCode;
                    const color = SCORE_META[station.final_score]?.color ?? "#6b7280";

                    return (
                        <CircleMarker
                            key={station.station_code}
                            center={[station.latitude, station.longitude]}
                            pathOptions={{
                                fillColor: color,
                                color: isSelected ? "#0f172a" : "#ffffff",
                                weight: isSelected ? 2.5 : 1.5,
                                fillOpacity: 1,
                            }}
                            eventHandlers={{ click: () => onSelect(station.station_code) }}
                        >
                            <Tooltip>
                                <strong>{station.station_name}</strong>
                            </Tooltip>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </section>
    );
}
