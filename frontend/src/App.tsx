import { useState, useEffect, useRef } from "react";
import { useStations } from "./hooks/useStations";
import { TopBar } from "./components/TopBar/TopBar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { StationMap } from "./components/StationMap/StationMap";
import { DetailPanel } from "./components/DetailPanel/DetailPanel";
import { ForecastModal } from "./components/ForecastModal/ForecastModal";
import styles from "./App.module.css";

export default function App() {
    const { stations, loading, error, lastUpdated, refetch } = useStations();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isForecastOpen, setIsForecastOpen] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const searchRef = useRef<HTMLInputElement>(null);

    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem("theme");
        if (stored) return stored === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
        localStorage.setItem("theme", isDark ? "dark" : "light");
    }, [isDark]);

    const selectedStation = stations.find((s) => s.id === selectedId) ?? null;
    const filteredStations = stations.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;

            switch (e.key) {
                case "Escape":
                    if (isForecastOpen) setIsForecastOpen(false);
                    else if (selectedId !== null) {
                        setSelectedId(null);
                        setIsPanelOpen(true);
                    }
                    break;
                case "/":
                    e.preventDefault();
                    setSelectedId(null);
                    setIsPanelOpen(true);
                    setTimeout(() => searchRef.current?.focus(), 50);
                    break;
                case "f":
                case "F":
                    if (selectedId !== null) setIsForecastOpen(true);
                    break;
                case "r":
                case "R":
                    refetch();
                    break;
                case "p":
                case "P":
                    setIsPanelOpen((prev) => !prev);
                    break;
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isForecastOpen, selectedId, refetch]);

    const showDetail = selectedId !== null;
    const showSidebar = !showDetail && isPanelOpen;

    return (
        <div className={styles.layout}>
            <TopBar
                loading={loading}
                error={error}
                stationCount={stations.length}
                lastUpdated={lastUpdated}
                onRefetch={refetch}
                isPanelOpen={isPanelOpen}
                onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
                isDark={isDark}
                onToggleTheme={() => setIsDark((prev) => !prev)}
            />
            <main className={styles.main}>
                <StationMap
                    stations={filteredStations}
                    selectedId={selectedId}
                    onSelect={(id) => {
                        setSelectedId(id);
                        setIsPanelOpen(true);
                    }}
                    onStationAdded={refetch}
                    isDark={isDark}
                />
                {showSidebar && (
                    <Sidebar
                        stations={filteredStations}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        searchQuery={searchQuery}
                        onSearch={setSearchQuery}
                        searchRef={searchRef}
                        error={error}
                    />
                )}
                {showDetail && selectedStation && (
                    <DetailPanel
                        station={selectedStation}
                        onOpenForecast={() => setIsForecastOpen(true)}
                        onBack={() => {
                            setSelectedId(null);
                            setIsPanelOpen(true);
                        }}
                    />
                )}
            </main>
            {isForecastOpen && selectedStation && (
                <ForecastModal
                    isOpen={isForecastOpen}
                    onClose={() => setIsForecastOpen(false)}
                    station={selectedStation}
                />
            )}
        </div>
    );
}
