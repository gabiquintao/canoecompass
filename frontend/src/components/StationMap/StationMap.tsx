import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from "react-leaflet";
import type { Station } from "../../types/api";
import type { LeafletEvent } from "leaflet";
import { SCORE_META } from "../../constants/scores";
import styles from "./StationMap.module.css";
import { AddStationModal } from "./AddStationModal";

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
    onStationAdded?: () => void;
}

function MapClickListener({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function StationMap({ stations, selectedId, onSelect, onStationAdded }: Props) {
    const [, setZoom] = useState(6.5);
    const [newSpotCoords, setNewSpotCoords] = useState<{ lat: number; lng: number } | null>(null);

    const handleMapClick = (lat: number, lng: number) => {
        const MIN_DISTANCE_KM = 0.5;
        const nearbyStation = stations.find(
            (s) => getDistanceKm(lat, lng, s.latitude, s.longitude) < MIN_DISTANCE_KM
        );

        if (nearbyStation) {
            onSelect(nearbyStation.id);
            setNewSpotCoords(null);
            return;
        }

        setNewSpotCoords({ lat, lng });
    };

    return (
        <section className={styles.section} aria-label="Map">
            {newSpotCoords && (
                <AddStationModal
                    lat={newSpotCoords.lat}
                    lng={newSpotCoords.lng}
                    onClose={() => setNewSpotCoords(null)}
                    onSuccess={() => {
                        onStationAdded?.();
                    }}
                />
            )}
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

                {newSpotCoords && (
                    <AddStationModal
                        lat={newSpotCoords.lat}
                        lng={newSpotCoords.lng}
                        onClose={() => setNewSpotCoords(null)}
                        onSuccess={() => {
                            onStationAdded?.();
                        }}
                    />
                )}
            </MapContainer>
        </section>
    );
}
