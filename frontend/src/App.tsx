import { useState, useEffect, useRef } from "react";
import { useStations } from "./hooks/useStations";
import { TopBar } from "./components/TopBar/TopBar";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { StationMap } from "./components/StationMap/StationMap";
import { DetailPanel } from "./components/DetailPanel/DetailPanel";
import { ForecastModal } from "./components/ForecastModal/ForecastModal";
import { AccountModal } from "./components/AccountModal/AccountModal";
import { useFavorites } from "./hooks/useFavorites";
import styles from "./App.module.css";

export default function App() {
    const { stations, loading, error, lastUpdated, refetch } = useStations();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isForecastOpen, setIsForecastOpen] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const { favorites, toggleFavorite } = useFavorites();
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
    const filteredStations = stations
        .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => {
            const aFav = favorites.has(a.id) ? 1 : 0;
            const bFav = favorites.has(b.id) ? 1 : 0;
            if (aFav !== bFav) return bFav - aFav;
            return a.name.localeCompare(b.name);
        });

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
                return;

            switch (e.key) {
                case "Escape":
                    if (isAccountOpen) setIsAccountOpen(false);
                    else if (isForecastOpen) setIsForecastOpen(false);
                    else if (isAddingMode) setIsAddingMode(false);
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
    }, [isForecastOpen, isAddingMode, selectedId, isAccountOpen, refetch]);

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
                onOpenAccount={() => setIsAccountOpen(true)}
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
                    isAddingMode={isAddingMode}
                    onSetAddingMode={setIsAddingMode}
                />
                <Sidebar
                    stations={filteredStations}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    searchRef={searchRef}
                    error={error}
                    onAddSpot={() => setIsAddingMode(true)}
                    isOpen={showSidebar}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                />
                <DetailPanel
                    station={selectedStation}
                    isOpen={showDetail}
                    onOpenForecast={() => setIsForecastOpen(true)}
                    onBack={() => {
                        setSelectedId(null);
                        setIsPanelOpen(true);
                    }}
                    isFavorite={selectedStation ? favorites.has(selectedStation.id) : false}
                    onToggleFavorite={toggleFavorite}
                />
            </main>
            {isForecastOpen && selectedStation && (
                <ForecastModal
                    isOpen={isForecastOpen}
                    onClose={() => setIsForecastOpen(false)}
                    station={selectedStation}
                />
            )}
            <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
        </div>
    );
}
