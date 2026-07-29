from datetime import date, datetime, timezone

import requests
from sqlalchemy.orm import Session

from database import DataObservation, SessionLocal, WaterBody, WaterBodyType


def fetch_data_for_single_body(wb: WaterBody, db: Session) -> None:
    try:
        wind_params = {
            "latitude": str(wb.latitude),
            "longitude": str(wb.longitude),
            "current": "wind_speed_10m",
        }

        wind_response = requests.get(
            "https://api.open-meteo.com/v1/forecast", params=wind_params
        )
        wind_response.raise_for_status()
        wind_data = wind_response.json()
        wind_speed: float | None = wind_data.get("current", {}).get("wind_speed_10m")

        if wind_speed is None:
            print(f"[{wb.name}] No wind data returned, skipping.")
            return

        flow_rate: float | None = None
        tide_level: float | None = None

        if wb.type == WaterBodyType.RIVER:
            flow_params = {
                "latitude": str(wb.latitude),
                "longitude": str(wb.longitude),
                "daily": "river_discharge",
            }

            flow_response = requests.get(
                "https://flood-api.open-meteo.com/v1/flood", params=flow_params
            )
            flow_response.raise_for_status()
            flow_data = flow_response.json()

            flow_list: list[float] = (
                flow_data.get("daily", {}).get("river_discharge") or []
            )
            if flow_list:
                flow_rate = flow_list[0]

        elif wb.type == WaterBodyType.ESTUARY:
            sea_level_params = {
                "latitude": str(wb.latitude),
                "longitude": str(wb.longitude),
                "hourly": "sea_level_height_msl",
            }

            sea_level_response = requests.get(
                "https://marine-api.open-meteo.com/v1/marine", params=sea_level_params
            )
            sea_level_response.raise_for_status()
            sea_level_data = sea_level_response.json()

            sea_list: list[float] = (
                sea_level_data.get("hourly", {}).get("sea_level_height_msl") or []
            )
            time_list: list[str] = sea_level_data.get("hourly", {}).get("time") or []

            if sea_list:
                now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
                idx = time_list.index(now_iso) if now_iso in time_list else 0
                tide_level = sea_list[idx]

        print(
            f"[{wb.name}] Wind: {wind_speed} km/h | Flow: {flow_rate} | Tide: {tide_level}"
        )

        existing_obs = (
            db.query(DataObservation)
            .where(
                DataObservation.water_body_id == wb.id,
                DataObservation.date == date.today(),
            )
            .first()
        )

        if existing_obs:
            existing_obs.flow_rate_m3s = flow_rate
            existing_obs.tide_level_m = tide_level
            existing_obs.wind_speed_kmh = wind_speed
            print(f"[{wb.name}] Data updated in the DB.")
        else:
            obs = DataObservation(
                water_body_id=wb.id,
                date=date.today(),
                is_forecast=False,
                flow_rate_m3s=flow_rate,
                tide_level_m=tide_level,
                wind_speed_kmh=wind_speed,
            )
            db.add(obs)
            print(f"[{wb.name}] Data saved in the DB.")

        db.commit()

    except Exception as exc:
        print(f"[{wb.name}] Failed to fetch data, skipping: {exc}")
        db.rollback()


def fetch_data_for_water_bodies() -> None:
    db = SessionLocal()

    try:
        water_bodies = db.query(WaterBody).all()

        for wb in water_bodies:
            fetch_data_for_single_body(wb, db)

    finally:
        db.close()


if __name__ == "__main__":
    fetch_data_for_water_bodies()
