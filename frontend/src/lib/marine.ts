import type { HourlyForecastEntry } from "../types/api";

/**
 * Finds up to 2 High Tides and 2 Low Tides for a given day's hourly forecast.
 * A high tide peak is where the water rose before this hour and ebbing starts after (curr > prev && curr >= next).
 * A low tide peak is where the water fell before this hour and flooding starts after (curr < prev && curr <= next).
 */
export function findTidalPeaks(hours: HourlyForecastEntry[]) {
    const highs: {
        time: string;
        level: number;
    }[] = [];

    const lows: {
        time: string;
        level: number;
    }[] = [];

    if (hours.length === 0) return { highs, lows };

    for (let i = 1; i < hours.length - 1; i++) {
        const curr = hours[i].tide_level_m;
        const prev = hours[i - 1].tide_level_m;
        const next = hours[i + 1].tide_level_m;
        if (curr == null || prev == null || next == null) continue;

        const time = hours[i].timestamp.slice(11, 16);

        if (curr > prev && curr >= next) {
            highs.push({ time, level: curr });
        } else if (curr < prev && curr <= next) {
            lows.push({ time, level: curr });
        }
    }

    // Fallback if no turning points were found (e.g. short dataset): use absolute max/min
    if (highs.length === 0) {
        const max = hours.reduce(
            (best, c) =>
                (c.tide_level_m ?? -Infinity) > (best.tide_level_m ?? -Infinity) ? c : best,
            hours[0]
        );
        if (max.tide_level_m != null)
            highs.push({ time: max.timestamp.slice(11, 16), level: max.tide_level_m });
    }
    if (lows.length === 0) {
        const min = hours.reduce(
            (best, c) =>
                (c.tide_level_m ?? Infinity) < (best.tide_level_m ?? Infinity) ? c : best,
            hours[0]
        );
        if (min.tide_level_m != null)
            lows.push({ time: min.timestamp.slice(11, 16), level: min.tide_level_m });
    }

    return { highs: highs.slice(0, 2), lows: lows.slice(0, 2) };
}

/**
 * Finds the single best hour for paddling in a day.
 * - For tidal waters (Estuary, Lagoon, Coastal): selects the hour with the highest tide level.
 * - For inland waters (River, Reservoir): selects the hour with the calmest wind and gusts.
 */
export function findBestPaddlingWindow(hours: HourlyForecastEntry[], isTidal: boolean) {
    if (hours.length === 0) return null;

    return hours.reduce((best, curr) => {
        if (!best) return curr;

        if (isTidal) {
            const tideBest = best.tide_level_m ?? -Infinity;
            const tideCurr = curr.tide_level_m ?? -Infinity;
            return tideCurr > tideBest ? curr : best;
        } else {
            const bestWind = (best.wind_speed_kmh ?? 0) + (best.wind_gust_kmh ?? 0);
            const currWind = (curr.wind_speed_kmh ?? 0) + (curr.wind_gust_kmh ?? 0);
            return currWind < bestWind ? curr : best;
        }
    }, hours[0]);
}
