from typing import Optional

from database import DataObservation, WaterBody, WaterBodyType
from schemas import NavigabilityScore, StationScore


def evaluate_river(
    wb: WaterBody,
    obs: Optional[DataObservation] = None,
    flow: Optional[float] = None,
) -> NavigabilityScore:
    if obs and obs.flow_rate_m3s is not None:
        flow = obs.flow_rate_m3s
    if (
        flow is None
        or wb.flow_min is None
        or wb.flow_max is None
        or wb.flow_danger is None
    ):
        return NavigabilityScore.UNKNOWN

    if flow >= wb.flow_danger:
        return NavigabilityScore.DANGEROUS
    if flow < wb.flow_min or flow > wb.flow_max:
        return NavigabilityScore.POOR
    if flow <= wb.flow_min + (wb.flow_max - wb.flow_min) * 0.6:
        return NavigabilityScore.EXCELLENT
    return NavigabilityScore.GOOD


def evaluate_estuary(
    wb: WaterBody,
    obs: Optional[DataObservation] = None,
    tide: Optional[float] = None,
) -> NavigabilityScore:
    if obs and obs.tide_level_m is not None:
        tide = obs.tide_level_m
    if tide is None or wb.tide_min_m is None or wb.tide_max_m is None:
        return NavigabilityScore.UNKNOWN

    if tide < wb.tide_min_m:
        return NavigabilityScore.POOR
    if tide < wb.tide_max_m:
        return NavigabilityScore.GOOD
    else:
        return NavigabilityScore.EXCELLENT


def evaluate_wind(
    obs: Optional[DataObservation] = None,
    wind: Optional[float] = None,
) -> NavigabilityScore:
    if obs and obs.wind_speed_kmh is not None:
        wind = obs.wind_speed_kmh
    if wind is None:
        return NavigabilityScore.UNKNOWN

    if wind > 40.0:
        return NavigabilityScore.DANGEROUS
    if wind > 25.0:
        return NavigabilityScore.POOR
    if wind <= 15.0:
        return NavigabilityScore.EXCELLENT
    return NavigabilityScore.GOOD


def evaluate_water_body(
    wb: WaterBody,
    latest_obs: Optional[DataObservation] = None,
    flow: Optional[float] = None,
    wind: Optional[float] = None,
    tide: Optional[float] = None,
    wind_gust: Optional[float] = None,
    wave_height: Optional[float] = None,
) -> StationScore:
    if latest_obs:
        flow = latest_obs.flow_rate_m3s if flow is None else flow
        wind = latest_obs.wind_speed_kmh if wind is None else wind
        tide = latest_obs.tide_level_m if tide is None else tide
        wind_gust = latest_obs.wind_gust_kmh if wind_gust is None else wind_gust
        wave_height = latest_obs.wave_height_m if wave_height is None else wave_height

    flow_score = NavigabilityScore.UNKNOWN
    tide_score = NavigabilityScore.UNKNOWN
    wind_score = evaluate_wind(wind=wind)

    if wb.type == WaterBodyType.RIVER:
        flow_score = evaluate_river(wb, flow=flow)
    elif wb.type in (WaterBodyType.ESTUARY, WaterBodyType.LAGOON):
        tide_score = evaluate_estuary(wb, tide=tide)

    final_score = NavigabilityScore.UNKNOWN
    scores = [
        s
        for s in (flow_score, tide_score, wind_score)
        if s != NavigabilityScore.UNKNOWN
    ]
    if scores:
        if NavigabilityScore.DANGEROUS in scores:
            final_score = NavigabilityScore.DANGEROUS
        elif NavigabilityScore.POOR in scores:
            final_score = NavigabilityScore.POOR
        elif all(s == NavigabilityScore.EXCELLENT for s in scores):
            final_score = NavigabilityScore.EXCELLENT
        else:
            final_score = NavigabilityScore.GOOD

    return StationScore(
        id=wb.id,
        name=wb.name,
        type=wb.type.value if hasattr(wb.type, "value") else str(wb.type),
        latitude=wb.latitude,
        longitude=wb.longitude,
        flow_rate_m3s=flow,
        tide_level_m=tide,
        wind_speed_kmh=wind,
        wind_gust_kmh=wind_gust,
        wave_height_m=wave_height,
        flow_score=(
            flow_score.value if flow_score != NavigabilityScore.UNKNOWN else None
        ),
        tide_score=(
            tide_score.value if tide_score != NavigabilityScore.UNKNOWN else None
        ),
        wind_score=wind_score.value,
        final_score=final_score.value,
        flow_min=wb.flow_min,
        flow_max=wb.flow_max,
        flow_danger=wb.flow_danger,
        tide_min_m=wb.tide_min_m,
        tide_max_m=wb.tide_max_m,
    )
