import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import "./index.css";

function MapEvents({ setZoomLevel }) {
  useMapEvents({
    zoomend(e) {
      setZoomLevel(e.target.getZoom());
    },
  });
  return null;
}

function App() {
  const [stations, setStations] = useState([]);
  const [selectedStationCode, setSelectedStationCode] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(6.5);

  useEffect(() => {
    fetch("http://localhost:8000/api/stations/score")
      .then((res) => res.json())
      .then((data) => setStations(data))
      .catch((err) => console.error(err));
  }, []);

  const getColor = (score) => {
    switch (score) {
      case "EXCELLENT":
        return "#059669";
      case "GOOD":
        return "#d97706";
      case "POOR":
        return "#ea580c";
      case "DANGEROUS":
        return "#dc2626";
      default:
        return "#64748b";
    }
  };

  const portugalBounds = [
    [36.8, -9.8],
    [42.2, -6.1],
  ];

  const filteredStations = stations.filter((s) =>
    s.station_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedStation = stations.find(
    (s) => s.station_code === selectedStationCode,
  );

  return (
    <div className="layout">
      <nav className="top-navbar">
        <div className="nav-brand">
          <strong>Dashboard</strong>
        </div>
        <div className="nav-search">
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </nav>

      <main className="main-content">
        <section className="map-section">
          <MapContainer
            bounds={portugalBounds}
            maxBounds={portugalBounds}
            maxBoundsViscosity={1.0}
            minZoom={6}
            className="leaflet-map"
            zoomControl={true}
          >
            <MapEvents setZoomLevel={setZoomLevel} />

            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; CARTO"
            />

            {filteredStations.map((station) => {
              const isSelected = station.station_code === selectedStationCode;
              return (
                <CircleMarker
                  key={station.station_code}
                  center={[station.latitude, station.longitude]}
                  radius={isSelected ? 8 : 5}
                  pathOptions={{
                    fillColor: getColor(station.final_score),
                    color: isSelected ? "#000000" : "#ffffff",
                    weight: isSelected ? 3 : 1.5,
                    fillOpacity: 1,
                  }}
                  eventHandlers={{
                    click: () => setSelectedStationCode(station.station_code),
                  }}
                >
                  <Tooltip
                    direction="right"
                    offset={[10, 0]}
                    opacity={0.9}
                    permanent={zoomLevel >= 8}
                  >
                    {station.station_name}
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </section>

        <section className="data-section">
          {!selectedStation ? (
            <div className="empty-state">
              <p>Select a place</p>
            </div>
          ) : (
            <div className="data-panel">
              <header className="data-header">
                <h2>{selectedStation.station_name}</h2>
                <div className="meta-info">
                  SNIRH: {selectedStation.station_code}
                </div>
              </header>

              <div className="data-content">
                <div className="data-group">
                  <h3>Score</h3>
                  <div
                    className={`status-indicator status-${selectedStation.final_score.toLowerCase()}`}
                  >
                    {selectedStation.final_score}
                  </div>
                </div>

                <div className="data-row">
                  <div className="data-group">
                    <h3>Water Flow</h3>
                    <p className="large-text">
                      {selectedStation.flow_rate_m3s
                        ? `${selectedStation.flow_rate_m3s} m³/s`
                        : "No data"}
                    </p>
                    <p className="sub-text">
                      Score: {selectedStation.flow_score}
                    </p>
                  </div>

                  <div className="data-group">
                    <h3>Atmosphere</h3>
                    <p className="large-text">
                      {selectedStation.wind_speed_kmh !== null
                        ? `${selectedStation.wind_speed_kmh} km/h`
                        : "No data"}
                    </p>
                    <p className="sub-text">
                      Wind (Score): {selectedStation.wind_score}
                    </p>
                  </div>
                </div>

                <div className="data-group technical-details">
                  <h3>Geolocation</h3>
                  <p>LAT: {selectedStation.latitude}</p>
                  <p>LONG: {selectedStation.longitude}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
