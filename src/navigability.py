from enum import Enum
from typing import Any, Optional
from database import SessionLocal, WaterBody, DataObservation, WaterBodyType

class NavigabilityScore(Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    POOR = "POOR"
    DANGEROUS = "DANGEROUS"
    UNKNOWN = "UNKNOWN"

def evaluate_river(wb: WaterBody, obs: Optional[DataObservation]) -> NavigabilityScore:
    if not obs or obs.flow_rate_m3s is None or wb.flow_min is None or wb.flow_max is None or wb.flow_danger is None:
        return NavigabilityScore.UNKNOWN
    
    flow = obs.flow_rate_m3s
    if flow >= wb.flow_danger:
        return NavigabilityScore.DANGEROUS
    if flow < wb.flow_min or flow > wb.flow_max:
        return NavigabilityScore.POOR
    if flow <= wb.flow_min + (wb.flow_max - wb.flow_min) * 0.6:
        return NavigabilityScore.EXCELLENT
    return NavigabilityScore.GOOD

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

def evaluate_water_body(wb: WaterBody) -> dict[str, Any]:
    db = SessionLocal()
    try:
        latest_obs = db.query(DataObservation)\
            .filter(DataObservation.water_body_id == wb.id)\
            .order_by(DataObservation.date.desc())\
            .first()
        
        flow_score = NavigabilityScore.UNKNOWN
        wind_score = evaluate_wind(latest_obs)

        if wb.type == WaterBodyType.RIVER:
            flow_score = evaluate_river(wb, latest_obs)
        
        final_score = NavigabilityScore.UNKNOWN
        scores = [s for s in (flow_score, wind_score) if s != NavigabilityScore.UNKNOWN]
        if scores:
            if NavigabilityScore.DANGEROUS in scores:
                final_score = NavigabilityScore.DANGEROUS
            elif NavigabilityScore.POOR in scores:
                final_score = NavigabilityScore.POOR
            elif all(s == NavigabilityScore.EXCELLENT for s in scores):
                final_score = NavigabilityScore.EXCELLENT
            else:
                final_score = NavigabilityScore.GOOD

        return {
            "id": wb.id,
            "station_name": wb.name,
            "type": wb.type.value,
            "latitude": wb.latitude,
            "longitude": wb.longitude,
            "flow_rate_m3s": latest_obs.flow_rate_m3s if latest_obs else None,
            "wind_speed_kmh": latest_obs.wind_speed_kmh if latest_obs else None,
            "flow_score": flow_score.value,
            "wind_score": wind_score.value,
            "final_score": final_score.value
        }
    finally:
        db.close()