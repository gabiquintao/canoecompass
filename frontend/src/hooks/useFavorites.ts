import { useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "./useAuth";

export function useFavorites() {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (user) {
            apiClient
                .getFavorites()
                .then((ids) => {
                    setFavorites(new Set(ids));
                })
                .catch(console.error);
        } else {
            // eslint-disable-next-line
            setFavorites(new Set());
        }
    }, [user]);

    const toggleFavorite = async (stationId: number) => {
        if (!user) {
            // Cannot favorite if not logged in
            alert("Please log in to save favorites.");
            return;
        }

        const isFav = favorites.has(stationId);

        setFavorites((prev) => {
            const next = new Set(prev);
            if (isFav) next.delete(stationId);
            else next.add(stationId);
            return next;
        });

        try {
            if (isFav) {
                await apiClient.removeFavorite(stationId);
            } else {
                await apiClient.addFavorite(stationId);
            }
        } catch (error) {
            console.error("Failed to toggle favorite", error);
            // Revert on error
            setFavorites((prev) => {
                const next = new Set(prev);
                if (isFav) next.add(stationId);
                else next.delete(stationId);
                return next;
            });
        }
    };

    return { favorites, toggleFavorite };
}
