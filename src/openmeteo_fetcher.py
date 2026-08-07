import logging
from datetime import date, datetime

import requests
from sqlalchemy.orm import Session

from database import (
    DataObservation,
    HourlyForecast,
    SessionLocal,
    WaterBody,
    WaterBodyType,
)
from helpers import is_tidal
from navigability import evaluate_water_body

logger = logging.getLogger(__name__)


def _fetch_wind_data(
    wb: WaterBody, forecast_days: int
) -> tuple[list[str], list[float], list[float]]:
    params: dict[str, str | int] = {
        "latitude": str(wb.latitude),
        "longitude": str(wb.longitude),
        "hourly": "wind_speed_10m,wind_gusts_10m",
        "forecast_days": forecast_days,
        "timezone": "auto",
    }
    response = requests.get("https://api.open-meteo.com/v1/forecast", params=params)
    response.raise_for_status()
    data = response.json()
    hourly = data.get("hourly", {})
    return (
        hourly.get("time") or [],
        hourly.get("wind_speed_10m") or [],
        hourly.get("wind_gusts_10m") or [],
    )


def _fetch_flow_data(wb: WaterBody, forecast_days: int) -> dict[str, float]:
    params: dict[str, str | int] = {
        "latitude": str(wb.latitude),
        "longitude": str(wb.longitude),
        "daily": "river_discharge",
        "forecast_days": forecast_days,
        "timezone": "auto",
    }
    response = requests.get("https://flood-api.open-meteo.com/v1/flood", params=params)
    response.raise_for_status()
    data = response.json()
    daily = data.get("daily", {})
    times: list[str] = daily.get("time") or []
    flows: list[float | None] = daily.get("river_discharge") or []
    # Map daily dates to discharge values so hourly timestamps can look up their
    # corresponding daily flow using the date prefix.
    return {str(d): float(f) for d, f in zip(times, flows) if f is not None}


def _fetch_tidal_data(
    wb: WaterBody, forecast_days: int
) -> tuple[list[float], list[float]]:
    params: dict[str, str | int] = {
        "latitude": str(wb.latitude),
        "longitude": str(wb.longitude),
        "hourly": "sea_level_height_msl,wave_height",
        "forecast_days": forecast_days,
        "timezone": "auto",
    }
    response = requests.get(
        "https://marine-api.open-meteo.com/v1/marine", params=params
    )
    response.raise_for_status()
    data = response.json()
    hourly = data.get("hourly", {})
    return (
        hourly.get("sea_level_height_msl") or [],
        hourly.get("wave_height") or [],
    )


def fetch_data_for_single_body(wb: WaterBody, db: Session) -> None:
    try:
        wb_is_tidal = is_tidal(wb)

        time_list, wind_speeds, wind_gusts = _fetch_wind_data(wb, forecast_days=1)

        flow_by_day: dict[str, float] = {}
        tide_list: list[float] = []
        wave_list: list[float] = []

        if wb.type == WaterBodyType.RIVER:
            flow_by_day = _fetch_flow_data(wb, forecast_days=1)
        elif wb_is_tidal:
            tide_list, wave_list = _fetch_tidal_data(wb, forecast_days=1)

        from marine import find_best_paddling_window
        from schemas import HourlyForecastEntry

        today_str = date.today().strftime("%Y-%m-%d")
        today_hours: list[HourlyForecastEntry] = []

        for i, t_str in enumerate(time_list):
            if not t_str.startswith(today_str):
                continue

            ts = datetime.fromisoformat(t_str)
            w_speed = wind_speeds[i] if i < len(wind_speeds) else None
            w_gust = wind_gusts[i] if i < len(wind_gusts) else None
            flow = flow_by_day.get(today_str)
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

            today_hours.append(
                HourlyForecastEntry(
                    timestamp=ts,
                    wind_speed_kmh=w_speed,
                    wind_gust_kmh=w_gust,
                    flow_rate_m3s=flow,
                    tide_level_m=tide,
                    wave_height_m=wave,
                    wind_score=score_obj.wind_score,
                    tide_score=score_obj.tide_score,
                    flow_score=score_obj.flow_score,
                    final_score=score_obj.final_score,
                )
            )

        if not today_hours:
            logger.warning("[%s] No data found for today.", wb.name)
            return

        best_window = find_best_paddling_window(today_hours, is_tidal=wb_is_tidal)
        best_hour = best_window.peak_hour if best_window else today_hours[12]

        logger.info(
            "[%s] Best Hour (%s): Wind: %s (Gust: %s) | Flow: %s | Tide: %s | Wave: %s",
            wb.name,
            best_hour.timestamp.strftime("%H:%M"),
            best_hour.wind_speed_kmh,
            best_hour.wind_gust_kmh,
            best_hour.flow_rate_m3s,
            best_hour.tide_level_m,
            best_hour.wave_height_m,
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
            existing_obs.flow_rate_m3s = best_hour.flow_rate_m3s
            existing_obs.tide_level_m = best_hour.tide_level_m
            existing_obs.wind_speed_kmh = best_hour.wind_speed_kmh
            existing_obs.wind_gust_kmh = best_hour.wind_gust_kmh
            existing_obs.wave_height_m = best_hour.wave_height_m
            logger.info("[%s] Data updated in the DB.", wb.name)
        else:
            obs = DataObservation(
                water_body_id=wb.id,
                date=date.today(),
                is_forecast=False,
                flow_rate_m3s=best_hour.flow_rate_m3s,
                tide_level_m=best_hour.tide_level_m,
                wind_speed_kmh=best_hour.wind_speed_kmh,
                wind_gust_kmh=best_hour.wind_gust_kmh,
                wave_height_m=best_hour.wave_height_m,
            )
            db.add(obs)
            logger.info("[%s] Data saved in the DB.", wb.name)

        db.commit()

    except Exception as exc:
        logger.error("[%s] Failed to fetch data, skipping: %s", wb.name, exc)
        db.rollback()


def fetch_data_for_water_bodies() -> None:
    db = SessionLocal()

    try:
        water_bodies = db.query(WaterBody).all()
        logger.info("Starting fetch cycle for %d station(s).", len(water_bodies))

        for wb in water_bodies:
            fetch_data_for_single_body(wb, db)
            fetch_hourly_forecasts_for_single_body(wb, db)

        logger.info("Fetch cycle complete for %d station(s).", len(water_bodies))

    finally:
        db.close()


def fetch_hourly_forecasts_for_single_body(wb: WaterBody, db: Session) -> None:
    try:
        time_list, wind_speeds, wind_gusts = _fetch_wind_data(wb, forecast_days=7)

        flow_by_day: dict[str, float] = {}
        tide_list: list[float] = []
        wave_list: list[float] = []

        if wb.type == WaterBodyType.RIVER:
            flow_by_day = _fetch_flow_data(wb, forecast_days=7)
        elif is_tidal(wb):
            tide_list, wave_list = _fetch_tidal_data(wb, forecast_days=7)

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
        logger.info("[%s] forecast hours saved/updated in DB.", wb.name)

    except Exception as exc:
        logger.error(
            "[%s] Failed to fetch hourly forecasts, skipping: %s", wb.name, exc
        )
        db.rollback()


if __name__ == "__main__":
    fetch_data_for_water_bodies()
