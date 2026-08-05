from datetime import date, datetime, timezone

import requests
from sqlalchemy.orm import Session

from database import (
    DataObservation,
    HourlyForecast,
    SessionLocal,
    WaterBody,
    WaterBodyType,
)
from navigability import evaluate_water_body


def fetch_data_for_single_body(wb: WaterBody, db: Session) -> None:
    try:
        wind_params: dict[str, str] = {
            "latitude": str(wb.latitude),
            "longitude": str(wb.longitude),
            "current": "wind_speed_10m,wind_gusts_10m",
            "timezone": "auto",
        }

        wind_response = requests.get(
            "https://api.open-meteo.com/v1/forecast", params=wind_params
        )
        wind_response.raise_for_status()
        wind_data = wind_response.json()
        wind_speed: float | None = wind_data.get("current", {}).get("wind_speed_10m")
        wind_gust: float | None = wind_data.get("current", {}).get("wind_gusts_10m")

        if wind_speed is None:
            print(f"[{wb.name}] No wind data returned, skipping.")
            return

        flow_rate: float | None = None
        tide_level: float | None = None
        wave_height: float | None = None

        if wb.type == WaterBodyType.RIVER:
            flow_params: dict[str, str] = {
                "latitude": str(wb.latitude),
                "longitude": str(wb.longitude),
                "daily": "river_discharge",
                "timezone": "auto",
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
            sea_level_params: dict[str, str] = {
                "latitude": str(wb.latitude),
                "longitude": str(wb.longitude),
                "hourly": "sea_level_height_msl,wave_height",
                "timezone": "auto",
            }

            sea_level_response = requests.get(
                "https://marine-api.open-meteo.com/v1/marine", params=sea_level_params
            )
            sea_level_response.raise_for_status()
            sea_level_data = sea_level_response.json()

            sea_list: list[float] = (
                sea_level_data.get("hourly", {}).get("sea_level_height_msl") or []
            )
            wave_list: list[float] = (
                sea_level_data.get("hourly", {}).get("wave_height") or []
            )
            time_list: list[str] = sea_level_data.get("hourly", {}).get("time") or []

            if sea_list:
                now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
                idx = time_list.index(now_iso) if now_iso in time_list else 0
                tide_level = sea_list[idx]
                wave_height = wave_list[idx] if idx < len(wave_list) else None

        print(
            f"[{wb.name}] Wind: {wind_speed} km/h (Gust: {wind_gust}) | Flow: {flow_rate} | Tide: {tide_level} | Wave: {wave_height}"
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
            existing_obs.wind_gust_kmh = wind_gust
            existing_obs.wave_height_m = wave_height
            print(f"[{wb.name}] Data updated in the DB.")
        else:
            obs = DataObservation(
                water_body_id=wb.id,
                date=date.today(),
                is_forecast=False,
                flow_rate_m3s=flow_rate,
                tide_level_m=tide_level,
                wind_speed_kmh=wind_speed,
                wind_gust_kmh=wind_gust,
                wave_height_m=wave_height,
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
            fetch_hourly_forecasts_for_single_body(wb, db)

    finally:
        db.close()


def fetch_hourly_forecasts_for_single_body(wb: WaterBody, db: Session) -> None:
    try:
        wind_params: dict[str, str | int] = {
            "latitude": str(wb.latitude),
            "longitude": str(wb.longitude),
            "hourly": "wind_speed_10m,wind_gusts_10m",
            "forecast_days": 7,
            "timezone": "auto",
        }
        wind_response = requests.get(
            "https://api.open-meteo.com/v1/forecast", params=wind_params
        )
        wind_response.raise_for_status()
        wind_data = wind_response.json()

        time_list: list[str] = wind_data.get("hourly", {}).get("time") or []
        wind_speeds: list[float] = (
            wind_data.get("hourly", {}).get("wind_speed_10m") or []
        )
        wind_gusts: list[float] = (
            wind_data.get("hourly", {}).get("wind_gusts_10m") or []
        )

        flow_by_day: dict[str, float] = {}
        tide_list: list[float] = []
        wave_list: list[float] = []

        if wb.type == WaterBodyType.RIVER:
            flow_params: dict[str, str | int] = {
                "latitude": str(wb.latitude),
                "longitude": str(wb.longitude),
                "daily": "river_discharge",
                "forecast_days": 7,
                "timezone": "auto",
            }
            flow_response = requests.get(
                "https://flood-api.open-meteo.com/v1/flood", params=flow_params
            )
            flow_data = flow_response.json()
            daily_times: list[str] = flow_data.get("daily", {}).get("time") or []
            daily_flows: list[float] = (
                flow_data.get("daily", {}).get("river_discharge") or []
            )
            # Map daily dates to discharge values so hourly timestamps can look up their
            # corresponding daily flow using the date prefix.
            flow_by_day = {str(d): float(f) for d, f in zip(daily_times, daily_flows)}

        elif wb.type == WaterBodyType.ESTUARY:
            sea_params: dict[str, str | int] = {
                "latitude": str(wb.latitude),
                "longitude": str(wb.longitude),
                "hourly": "sea_level_height_msl,wave_height",
                "forecast_days": 7,
                "timezone": "auto",
            }
            sea_response = requests.get(
                "https://marine-api.open-meteo.com/v1/marine", params=sea_params
            )
            sea_data = sea_response.json()
            tide_list = sea_data.get("hourly", {}).get("sea_level_height_msl") or []
            wave_list = sea_data.get("hourly", {}).get("wave_height") or []

        # Query existing forecast rows once before looping instead of querying per
        # timestamp inside the loop, avoiding repetitive database queries and enabling
        # constant-time lookup.
        existing_map: dict[datetime, HourlyForecast] = {
            fc.timestamp: fc
            for fc in db.query(HourlyForecast)
            .where(HourlyForecast.water_body_id == wb.id)
            .all()
        }

        for i in range(len(time_list)):
            ts = datetime.fromisoformat(time_list[i])
            w_speed = wind_speeds[i] if i < len(wind_speeds) else None
            w_gust = wind_gusts[i] if i < len(wind_gusts) else None
            flow = flow_by_day.get(time_list[i][:10])

            tide = tide_list[i] if i < len(tide_list) else None
            wave = wave_list[i] if i < len(wave_list) else None

            score_obj = evaluate_water_body(
                wb,
                flow=flow,
                wind=w_speed,
                tide=tide,
                wind_gust=w_gust,
                wave_height=wave,
            )

            existing_fc = existing_map.get(ts)

            if existing_fc:
                existing_fc.wind_speed_kmh = w_speed
                existing_fc.wind_gust_kmh = w_gust
                existing_fc.flow_rate_m3s = flow
                existing_fc.tide_level_m = tide
                existing_fc.wave_height_m = wave
                existing_fc.wind_score = score_obj.wind_score
                existing_fc.flow_score = score_obj.flow_score
                existing_fc.tide_score = score_obj.tide_score
                existing_fc.final_score = score_obj.final_score
            else:
                new_fc = HourlyForecast(
                    water_body_id=wb.id,
                    timestamp=ts,
                    wind_speed_kmh=w_speed,
                    wind_gust_kmh=w_gust,
                    flow_rate_m3s=flow,
                    tide_level_m=tide,
                    wave_height_m=wave,
                    wind_score=score_obj.wind_score,
                    flow_score=score_obj.flow_score,
                    tide_score=score_obj.tide_score,
                    final_score=score_obj.final_score,
                )
                db.add(new_fc)

        db.commit()
        print(f"[{wb.name}] forecast hours saved/updated in DB.")

    except Exception as exc:
        print(f"[{wb.name}] Failed to fetch hourly forecasts, skipping: {exc}")
        db.rollback()


if __name__ == "__main__":
    fetch_data_for_water_bodies()
