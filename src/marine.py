from typing import Optional
from schemas import HourlyForecastEntry, PaddlingWindow, TidalPeak

# Finds up to 2 High Tides and 2 Low Tides for a given day's hourly forecast.
# A high tide peak is where the water rose before this hour and ebbing starts after.
# A low tide peak is where the water fell before this hour and flooding starts after.
def find_tidal_peaks(hours: list[HourlyForecastEntry]) -> dict[str, list[TidalPeak]]:
    highs: list[TidalPeak] = []
    lows: list[TidalPeak] = []
    if not hours:
        return {"highs": highs, "lows": lows}

    for i in range(1, len(hours) - 1):
        curr = hours[i].tide_level_m
        prev_h = hours[i - 1].tide_level_m
        next_h = hours[i + 1].tide_level_m

        if curr is None or prev_h is None or next_h is None:
            continue

        time = hours[i].timestamp.strftime("%H:%M")

        if curr > prev_h and curr >= next_h:
            highs.append(TidalPeak(time=time, level=curr))
        elif curr < prev_h and curr <= next_h:
            lows.append(TidalPeak(time=time, level=curr))

    if not highs:
        max_hr = max(
            hours,
            key=lambda h: (
                h.tide_level_m if h.tide_level_m is not None else float("-inf")
            ),
        )
        if max_hr.tide_level_m is not None:
            highs.append(
                TidalPeak(
                    time=max_hr.timestamp.strftime("%H:%M"), level=max_hr.tide_level_m
                )
            )

    if not lows:
        min_hr = min(
            hours,
            key=lambda h: (
                h.tide_level_m if h.tide_level_m is not None else float("inf")
            ),
        )
        if min_hr.tide_level_m is not None:
            lows.append(
                TidalPeak(
                    time=min_hr.timestamp.strftime("%H:%M"), level=min_hr.tide_level_m
                )
            )

    return {"highs": highs[:2], "lows": lows[:2]}


def find_best_paddling_window(hours: list[HourlyForecastEntry], is_tidal: bool) -> Optional[PaddlingWindow]:
    if not hours:
        return None
        
    best_idx = 0
    best = hours[0]
    for i, curr in enumerate(hours[1:], start=1):
        if is_tidal:
            tide_best = best.tide_level_m if best.tide_level_m is not None else float('-inf')
            tide_curr = curr.tide_level_m if curr.tide_level_m is not None else float('-inf')
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
            peak_hour=best
        )
    else:
        return PaddlingWindow(peak_hour=best)
