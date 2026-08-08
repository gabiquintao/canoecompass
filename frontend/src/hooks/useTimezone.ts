import { useState, useEffect } from "react";
import { apiClient } from "../lib/apiClient";
import { useAuth } from "./useAuth";

const TIMEZONE_KEY = "canoecompass_timezone";

export function useTimezone() {
    const { user } = useAuth();

    const [timezone, setTimezoneState] = useState<string>(() => {
        const saved = localStorage.getItem(TIMEZONE_KEY);
        if (saved) return saved;
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return "UTC";
        }
    });

    useEffect(() => {
        if (user) {
            apiClient
                .getUserProfile()
                .then((profile) => {
                    if (profile.timezone && profile.timezone !== "UTC") {
                        setTimezoneState(profile.timezone);
                        localStorage.setItem(TIMEZONE_KEY, profile.timezone);
                    }
                })
                .catch((err) => console.error("Failed to fetch user profile", err));
        }
    }, [user]);

    const setTimezone = (tz: string) => {
        setTimezoneState(tz);
        localStorage.setItem(TIMEZONE_KEY, tz);
        if (user) {
            apiClient
                .updateTimezone(tz)
                .catch((err) => console.error("Failed to update timezone", err));
        }
    };

    return { timezone, setTimezone };
}
