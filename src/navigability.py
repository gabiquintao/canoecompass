from enum import Enum
from typing import Any, Optional
from database import SessionLocal, RiverFlowObservation, WeatherObservation

class NavigabilityScore(Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    POOR = "POOR"
    DANGEROUS = "DANGEROUS"
    UNKNOWN = "UNKNOWN"

RIVER_THRESHOLDS: dict[str, dict[str, float]] = {
    "17G/02H": {
        "min_flow": 50.0,
        "max_flow": 400.0,
        "danger_flow": 700.0
    },
    "27L/01H": {
        "min_flow": 10.0,
        "max_flow": 150.0,
        "danger_flow": 300.0
    }
}

def evaluate_flow(station_code: str, flow_rate: Optional[float]) -> NavigabilityScore:
    if flow_rate is None:
        return NavigabilityScore.UNKNOWN
    
    if station_code not in RIVER_THRESHOLDS:
        return NavigabilityScore.UNKNOWN
    
    thresholds = RIVER_THRESHOLDS[station_code]

    if flow_rate >= thresholds["danger_flow"]:
        return NavigabilityScore.DANGEROUS
    
    elif flow_rate < thresholds["min_flow"]:
        return NavigabilityScore.POOR
    
    elif flow_rate <= thresholds["max_flow"]:
        return NavigabilityScore.EXCELLENT
    
    else:
        return NavigabilityScore.GOOD
    
def evaluate_station(station_code: str) -> dict[str, Any]:
    db = SessionLocal()

    try:
        latest_flow = db.query(RiverFlowObservation)\
            .filter(RiverFlowObservation.station_code == station_code)\
            .order_by(RiverFlowObservation.date.desc())\
            .first()
        
        flow_rate = latest_flow.flow_rate if latest_flow else None
        flow_score = evaluate_flow(station_code, flow_rate)

        latest_weather = db.query(WeatherObservation)\
            .order_by(WeatherObservation.created_at.desc())\
            .first()
        
        wind_speed = latest_weather.wind_speed if latest_weather else None
        wind_score = NavigabilityScore.UNKNOWN

        if wind_speed is not None:
            if wind_speed > 40.0:
                wind_score = NavigabilityScore.DANGEROUS
            elif wind_speed > 25.0:
                wind_score = NavigabilityScore.POOR
            else:
                wind_score = NavigabilityScore.EXCELLENT

        final_score = flow_score
        if flow_score == NavigabilityScore.DANGEROUS or wind_score == NavigabilityScore.DANGEROUS:
            final_score = NavigabilityScore.DANGEROUS
        elif flow_score == NavigabilityScore.POOR or wind_score == NavigabilityScore.POOR:
            final_score = NavigabilityScore.POOR

        return {
            "station_code": station_code,
            "flow_rate_m3s": flow_rate,
            "wind_speed_kmh": wind_speed,
            "flow_score": flow_score.value,
            "wind_score": wind_score.value,
            "final_score": final_score.value
        }
    
    finally:
        db.close()