import os
from datetime import datetime
from typing import Generator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from calibration import calibrate_station_thresholds
from database import DataObservation, HourlyForecast, SessionLocal, WaterBody
from navigability import evaluate_water_body
from openmeteo_fetcher import (
    fetch_data_for_single_body,
    fetch_hourly_forecasts_for_single_body,
)
from schemas import (
    HistoryEntry,
    HourlyForecastEntry,
    StationCreate,
    StationCreated,
    StationScore,
)
from utils import detect_water_body_info, get_distance_km, get_location_details

app = FastAPI(title="Canoeing Navigability API")

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGIN", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/api/stations/detect")
def detect_station(lat: float, lon: float) -> dict[str, str]:
    return detect_water_body_info(lat, lon)


@app.get("/api/stations/score", response_model=list[StationScore])
def get_stations_score(db: Session = Depends(get_db)) -> list[StationScore]:
    water_bodies = db.query(WaterBody).all()

    # Aggregate the most recent observation timestamp per station in a subquery and join
    # the result in a single query rather than querying each station individually.
    latest_date_subq = (
        db.query(
            DataObservation.water_body_id,
            func.max(DataObservation.date).label("max_date"),
        )
        .group_by(DataObservation.water_body_id)
        .subquery()
    )

    latest_obs_rows = (
        db.query(DataObservation)
        .join(
            latest_date_subq,
            (DataObservation.water_body_id == latest_date_subq.c.water_body_id)
            & (DataObservation.date == latest_date_subq.c.max_date),
        )
        .all()
    )

    obs_by_id: dict[int, DataObservation] = {
        o.water_body_id: o for o in latest_obs_rows
    }

    now_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
    hourly_rows = (
        db.query(HourlyForecast)
        .filter(HourlyForecast.timestamp >= now_hour)
        .order_by(HourlyForecast.timestamp)
        .all()
    )
    hourly_by_id: dict[int, HourlyForecast] = {}
    for h in hourly_rows:
        if h.water_body_id not in hourly_by_id:
            hourly_by_id[h.water_body_id] = h

    result: list[StationScore] = []
    for wb in water_bodies:
        hf = hourly_by_id.get(wb.id)
        obs = obs_by_id.get(wb.id)

        def get_val(attr: str) -> float | None:
            val = getattr(hf, attr, None) if hf else None
            return (
                val if val is not None else (getattr(obs, attr, None) if obs else None)
            )

        result.append(
            evaluate_water_body(
                wb,
                latest_obs=obs,
                flow=get_val("flow_rate_m3s"),
                tide=get_val("tide_level_m"),
                wind=get_val("wind_speed_kmh"),
                wind_gust=get_val("wind_gust_kmh"),
                wave_height=get_val("wave_height_m"),
            )
        )

    return result


@app.get("/api/stations/{station_id}/history", response_model=list[HistoryEntry])
def get_station_history(
    station_id: int, db: Session = Depends(get_db)
) -> list[HistoryEntry]:
    observations = (
        db.query(DataObservation)
        .filter(DataObservation.water_body_id == station_id)
        .order_by(DataObservation.date)
        .all()
    )

    return [
        HistoryEntry(
            date=obs.date,
            flow_rate=obs.flow_rate_m3s,
            wind_speed=obs.wind_speed_kmh,
            tide_level=obs.tide_level_m,
            wind_gust=obs.wind_gust_kmh,
            wave_height=obs.wave_height_m,
        )
        for obs in observations
    ]


@app.get(
    "/api/stations/{station_id}/forecast",
    response_model=list[HourlyForecastEntry],
)
def get_station_forecast(
    station_id: int, db: Session = Depends(get_db)
) -> list[HourlyForecastEntry]:
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    forecasts = (
        db.query(HourlyForecast)
        .filter(
            HourlyForecast.water_body_id == station_id,
            HourlyForecast.timestamp >= today_start,
        )
        .order_by(HourlyForecast.timestamp)
        .all()
    )

    return [HourlyForecastEntry.model_validate(f) for f in forecasts]


@app.post("/api/stations", response_model=StationCreated, status_code=201)
def create_station(
    station: StationCreate, db: Session = Depends(get_db)
) -> StationCreated:
    existing_bodies = db.query(WaterBody).all()
    for wb in existing_bodies:
        distance_km = get_distance_km(
            station.latitude, station.longitude, wb.latitude, wb.longitude
        )
        if distance_km < 0.5:
            raise HTTPException(
                status_code=409,
                detail=f"Spot already exists within 500m: {wb.name} ({distance_km:.2f} km away)",
            )

    reg, dist = get_location_details(station.latitude, station.longitude)

    new_wb = WaterBody(
        name=station.name,
        latitude=station.latitude,
        longitude=station.longitude,
        type=station.type,
        region=reg,
        district=dist,
    )
    db.add(new_wb)
    db.commit()
    calibrate_station_thresholds(new_wb, db)
    fetch_data_for_single_body(new_wb, db)
    fetch_hourly_forecasts_for_single_body(new_wb, db)
    db.refresh(new_wb)

    return StationCreated(id=new_wb.id, message=f"{dist}, {reg}")
