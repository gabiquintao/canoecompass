import { useState } from "react";
import { useStations } from "./hooks/useStations";
import { TopBar } from "./components/TopBar/TopBar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { StationMap } from "./components/StationMap/StationMap";
import { DetailPanel } from "./components/DetailPanel/DetailPanel";
import styles from "./App.module.css";

export default function App() {
    const { stations, loading, error, lastUpdated, refetch } = useStations();
    const [selectedCode, setSelectedCode] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const selectedStation = stations.find((s) => s.station_code === selectedCode) ?? null;

    const filteredStations = stations.filter((s) =>
        s.station_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.layout}>
            <TopBar
                loading={loading}
                error={error}
                stationCount={stations.length}
                lastUpdated={lastUpdated}
                onRefetch={refetch}
            />

            <main className={styles.main}>
                <Sidebar
                    stations={filteredStations}
                    selectedCode={selectedCode}
                    onSelect={setSelectedCode}
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                />
                <StationMap
                    stations={filteredStations}
                    selectedCode={selectedCode}
                    onSelect={setSelectedCode}
                />
                <DetailPanel station={selectedStation} />
            </main>
        </div>
    );
}
