import requests
from sqlalchemy.orm import Session

from database import WaterBody, WaterBodyType
from utils import get_percentile


def calibrate_station_thresholds(wb: WaterBody, db: Session) -> None:
    try:
        # Wind is evaluated using fixed safety thresholds rather than historical
        # percentiles because paddling capsizing risk depends on absolute wind speed.
        if wb.type == WaterBodyType.RIVER:
            flood_params = {
                "latitude": str(wb.latitude),
                "longitude": str(wb.longitude),
                "daily": "river_discharge",
                "past_days": "365",
            }

            flood_response = requests.get(
                "https://flood-api.open-meteo.com/v1/flood", params=flood_params
            )

            flood_response.raise_for_status()
            data = flood_response.json()
            flows: list[float] = data.get("daily", {}).get("river_discharge") or []

            wb.flow_min = get_percentile(flows, 15)
            wb.flow_max = get_percentile(flows, 80)
            wb.flow_danger = get_percentile(flows, 95)

            # If the model has negligible data for this coordinate (max flow < 1.0),
            # wipe the thresholds so the system falls back to wind-only scoring.
            current_max = wb.flow_max
            if current_max is not None and current_max < 1.0:
                wb.flow_min = None
                wb.flow_max = None
                wb.flow_danger = None

        if wb.type in (
            WaterBodyType.ESTUARY,
            WaterBodyType.LAGOON,
            WaterBodyType.COASTAL,
        ):
            sea_level_params = {
                "latitude": str(wb.latitude),
                "longitude": str(wb.longitude),
                "hourly": "sea_level_height_msl",
                "past_days": "30",
            }

            sea_level_response = requests.get(
                "https://marine-api.open-meteo.com/v1/marine", params=sea_level_params
            )

            sea_level_response.raise_for_status()
            data = sea_level_response.json()
            sea_levels: list[float] = (
                data.get("hourly", {}).get("sea_level_height_msl") or []
            )

            wb.tide_min_m = get_percentile(sea_levels, 50)
            wb.tide_max_m = get_percentile(sea_levels, 92)

        db.commit()
        db.refresh(wb)

    except Exception as exc:
        print(f"[{wb.name}] Calibration failed: {exc}")
        db.rollback()
