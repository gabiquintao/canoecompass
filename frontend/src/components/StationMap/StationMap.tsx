import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import type { Station } from "../../types/api";
import type { LeafletEvent } from "leaflet";
import { SCORE_META } from "../../constants/scores";
import styles from "./StationMap.module.css";

interface MapEventsProps {
    onZoom: (zoom: number) => void;
}

function MapEvents({ onZoom }: MapEventsProps) {
    useMapEvents({ zoomend: (e: LeafletEvent) => onZoom(e.target.getZoom()) });
    return null;
}

const PORTUGAL_BOUNDS: [[number, number], [number, number]] = [
    [36.8, -9.8],
    [42.2, -6.1],
];

interface Props {
    stations: Station[];
    selectedId: number | null;
    onSelect: (id: number) => void;
}

function MapClickListener({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export function StationMap({ stations, selectedId, onSelect }: Props) {
    const [, setZoom] = useState(6.5);
    const [newSpotCoords, setNewSpotCoords] = useState<{ lat: number; lng: number } | null>(null);

    const handleMapClick = (lat: number, lng: number) => {
        console.log(lat, lng);
        setNewSpotCoords({ lat, lng });
    };

    return (
        <section className={styles.section} aria-label="Map">
            <MapContainer bounds={PORTUGAL_BOUNDS} className={styles.map}>
                <MapEvents onZoom={setZoom} />

                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

                <MapClickListener onMapClick={handleMapClick} />

                {stations.map((station) => {
                    const isSelected = station.id === selectedId;
                    const color = SCORE_META[station.final_score]?.color ?? "#6b7280";

                    return (
                        <CircleMarker
                            key={station.id}
                            center={[station.latitude, station.longitude]}
                            pathOptions={{
                                fillColor: color,
                                color: isSelected ? "#0f172a" : "#ffffff",
                                weight: isSelected ? 2.5 : 1.5,
                                fillOpacity: 1,
                            }}
                            eventHandlers={{ click: () => onSelect(station.id) }}
                        >
                            <Tooltip>
                                <strong>{station.name}</strong>
                            </Tooltip>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </section>
    );
}
