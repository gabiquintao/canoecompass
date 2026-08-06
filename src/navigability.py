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
        
    f_min = wb.flow_min
    f_max = wb.flow_max
    f_danger = wb.flow_danger

    if (
        flow is None
        or f_min is None
        or f_max is None
        or f_danger is None
        or f_max < 1.0
    ):
        return NavigabilityScore.UNKNOWN

    if flow >= f_danger:
        return NavigabilityScore.DANGEROUS
    if flow < f_min or flow > f_max:
        return NavigabilityScore.POOR
    if flow <= f_min + (f_max - f_min) * 0.6:
        return NavigabilityScore.EXCELLENT
    return NavigabilityScore.GOOD


def evaluate_estuary(
    wb: WaterBody,
    obs: Optional[DataObservation] = None,
    tide: Optional[float] = None,
) -> NavigabilityScore:
    if obs and obs.tide_level_m is not None:
        tide = obs.tide_level_m
        
    t_min = wb.tide_min_m
    t_max = wb.tide_max_m
    
    if tide is None or t_min is None or t_max is None:
        return NavigabilityScore.UNKNOWN

    if tide < t_min:
        return NavigabilityScore.POOR
    if tide < t_max:
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

    c_flow_max = wb.flow_max

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
        flow_min=wb.flow_min
        if (c_flow_max is not None and c_flow_max >= 1.0)
        else None,
        flow_max=c_flow_max
        if (c_flow_max is not None and c_flow_max >= 1.0)
        else None,
        flow_danger=wb.flow_danger
        if (c_flow_max is not None and c_flow_max >= 1.0)
        else None,
        tide_min_m=wb.tide_min_m,
        tide_max_m=wb.tide_max_m,
    )
