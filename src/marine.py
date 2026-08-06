from collections import defaultdict
from typing import Optional

from schemas import HourlyForecastEntry, PaddlingWindow, TidalPeak


# Finds up to 2 High Tides and 2 Low Tides for each day across a continuous hourly forecast.
# A high tide peak is where the water rose before this hour and ebbing starts after.
# A low tide peak is where the water fell before this hour and flooding starts after.
def find_all_tidal_peaks(
    hours: list[HourlyForecastEntry],
) -> dict[str, dict[str, list[TidalPeak]]]:
    peaks_by_day: dict[str, dict[str, list[TidalPeak]]] = defaultdict(
        lambda: {"highs": [], "lows": []}
    )
    if not hours:
        return dict(peaks_by_day)

    for i in range(len(hours)):
        curr = hours[i].tide_level_m
        if curr is None:
            continue

        prev_h = hours[i - 1].tide_level_m if i > 0 else float("-inf")
        next_h = hours[i + 1].tide_level_m if i < len(hours) - 1 else float("-inf")

        prev_l = hours[i - 1].tide_level_m if i > 0 else float("inf")
        next_l = hours[i + 1].tide_level_m if i < len(hours) - 1 else float("inf")

        if prev_h is None:
            prev_h = float("-inf")
        if next_h is None:
            next_h = float("-inf")
        if prev_l is None:
            prev_l = float("inf")
        if next_l is None:
            next_l = float("inf")

        day_str = hours[i].timestamp.strftime("%Y-%m-%d")
        time = hours[i].timestamp.strftime("%H:%M")

        if curr > prev_h and curr >= next_h:
            if len(peaks_by_day[day_str]["highs"]) < 2:
                peaks_by_day[day_str]["highs"].append(TidalPeak(time=time, level=curr))
        elif curr < prev_l and curr <= next_l:
            if len(peaks_by_day[day_str]["lows"]) < 2:
                peaks_by_day[day_str]["lows"].append(TidalPeak(time=time, level=curr))

    return dict(peaks_by_day)


def find_best_paddling_window(
    hours: list[HourlyForecastEntry], is_tidal: bool
) -> Optional[PaddlingWindow]:
    if not hours:
        return None

    best_idx = 0
    best = hours[0]
    for i, curr in enumerate(hours[1:], start=1):
        if is_tidal:
            tide_best = (
                best.tide_level_m if best.tide_level_m is not None else float("-inf")
            )
            tide_curr = (
                curr.tide_level_m if curr.tide_level_m is not None else float("-inf")
            )
            if tide_curr > tide_best:
                best = curr
                best_idx = i
        else:
            best_wind = (best.wind_speed_kmh or 0) + (best.wind_gust_kmh or 0)
            curr_wind = (curr.wind_speed_kmh or 0) + (curr.wind_gust_kmh or 0)
            if curr_wind < best_wind:
                best = curr
                best_idx = i

    if is_tidal:
        start_idx = max(0, best_idx - 1)
        end_idx = min(len(hours) - 1, best_idx + 1)
        return PaddlingWindow(
            start_time=hours[start_idx].timestamp.strftime("%H:%M"),
            end_time=hours[end_idx].timestamp.strftime("%H:%M"),
            peak_hour=best,
        )
    else:
        return PaddlingWindow(peak_hour=best)
