from typing import Optional

from database import DataObservation, WaterBody, WaterBodyType
from schemas import NavigabilityScore, StationScore


def evaluate_river(wb: WaterBody, obs: Optional[DataObservation]) -> NavigabilityScore:
    if (
        not obs
        or obs.flow_rate_m3s is None
        or wb.flow_min is None
        or wb.flow_max is None
        or wb.flow_danger is None
    ):
        return NavigabilityScore.UNKNOWN

    flow = obs.flow_rate_m3s
    if flow >= wb.flow_danger:
        return NavigabilityScore.DANGEROUS
    if flow < wb.flow_min or flow > wb.flow_max:
        return NavigabilityScore.POOR
    if flow <= wb.flow_min + (wb.flow_max - wb.flow_min) * 0.6:
        return NavigabilityScore.EXCELLENT
    return NavigabilityScore.GOOD


def evaluate_estuary(
    wb: WaterBody, obs: Optional[DataObservation]
) -> NavigabilityScore:
    if (
        obs is None
        or obs.tide_level_m is None
        or wb.tide_min_m is None
        or wb.tide_max_m is None
    ):
        return NavigabilityScore.UNKNOWN

    if obs.tide_level_m < wb.tide_min_m:
        return NavigabilityScore.POOR
    if obs.tide_level_m < wb.tide_max_m:
        return NavigabilityScore.GOOD
    else:
        return NavigabilityScore.EXCELLENT


def evaluate_wind(obs: Optional[DataObservation]) -> NavigabilityScore:
    if not obs or obs.wind_speed_kmh is None:
        return NavigabilityScore.UNKNOWN

    wind = obs.wind_speed_kmh
    if wind > 40.0:
        return NavigabilityScore.DANGEROUS
    if wind > 25.0:
        return NavigabilityScore.POOR
    if wind <= 15.0:
        return NavigabilityScore.EXCELLENT
    return NavigabilityScore.GOOD


def evaluate_water_body(
    wb: WaterBody, latest_obs: Optional[DataObservation]
) -> StationScore:
    flow_score = NavigabilityScore.UNKNOWN
    tide_score = NavigabilityScore.UNKNOWN
    wind_score = evaluate_wind(latest_obs)

    if wb.type == WaterBodyType.RIVER:
        flow_score = evaluate_river(wb, latest_obs)
    elif wb.type in (WaterBodyType.ESTUARY, "LAGOON", "ESTUARY"):
        tide_score = evaluate_estuary(wb, latest_obs)

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
        flow_rate_m3s=latest_obs.flow_rate_m3s if latest_obs else None,
        tide_level_m=latest_obs.tide_level_m if latest_obs else None,
        wind_speed_kmh=latest_obs.wind_speed_kmh if latest_obs else None,
        flow_score=(
            flow_score.value if flow_score != NavigabilityScore.UNKNOWN else None
        ),
        tide_score=(
            tide_score.value if tide_score != NavigabilityScore.UNKNOWN else None
        ),
        wind_score=wind_score.value,
        final_score=final_score.value,
    )
