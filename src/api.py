import os
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import AsyncGenerator, Generator

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from sqlalchemy import func
from sqlalchemy.orm import Session

from calibration import calibrate_station_thresholds
from database import DataObservation, HourlyForecast, SessionLocal, WaterBody
from marine import find_all_tidal_peaks, find_best_paddling_window
from navigability import evaluate_water_body
from openmeteo_fetcher import (
    fetch_data_for_single_body,
    fetch_data_for_water_bodies,
    fetch_hourly_forecasts_for_single_body,
)
from schemas import (
    DailyMarineSummary,
    ForecastResponse,
    HistoryEntry,
    HourlyForecastEntry,
    StationCreate,
    StationCreated,
    StationScore,
)
from utils import get_distance_km, get_location_details


def update_weather_data() -> None:
    print("Running scheduled background task.")
    try:
        fetch_data_for_water_bodies()
    except Exception as e:
        print(f"Background fetch failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    scheduler = BackgroundScheduler()
    scheduler.add_job(update_weather_data, "interval", hours=6)
    scheduler.start()
    print("Background weather scheduler started.")
    yield
    scheduler.shutdown()
    print("Background weather scheduler shut down.")


limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Canoeing Navigability API", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

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


@app.get("/api/stations/score", response_model=list[StationScore])
@limiter.limit("60/minute")
def get_stations_score(
    request: Request, db: Session = Depends(get_db)
) -> list[StationScore]:
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
@limiter.limit("60/minute")
def get_station_history(
    request: Request, station_id: int, db: Session = Depends(get_db)
) -> list[HistoryEntry]:
    seven_days_ago = datetime.now().date() - timedelta(days=7)
    observations = (
        db.query(DataObservation)
        .filter(
            DataObservation.water_body_id == station_id,
            DataObservation.date >= seven_days_ago,
        )
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
    response_model=ForecastResponse,
)
@limiter.limit("60/minute")
def get_station_forecast(
    request: Request, station_id: int, db: Session = Depends(get_db)
) -> ForecastResponse:
    wb = db.query(WaterBody).filter(WaterBody.id == station_id).first()
    if not wb:
        raise HTTPException(status_code=404, detail="Station not found")

    is_tidal = wb.type in ["ESTUARY", "LAGOON", "COASTAL"]

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

    hourly_entries = [HourlyForecastEntry.model_validate(f) for f in forecasts]

    daily_summaries: dict[str, DailyMarineSummary] = {}
    grouped_by_day: defaultdict[str, list[HourlyForecastEntry]] = defaultdict(list)
    for entry in hourly_entries:
        day_str = entry.timestamp.strftime("%Y-%m-%d")
        grouped_by_day[day_str].append(entry)

    # Calculate all peaks seamlessly across the entire 168-hour array
    all_peaks = find_all_tidal_peaks(hourly_entries)

    for day_str, hours in grouped_by_day.items():
        peaks_for_day = all_peaks.get(day_str, {"highs": [], "lows": []})
        best_window = find_best_paddling_window(hours, is_tidal=is_tidal)

        daily_summaries[day_str] = DailyMarineSummary(
            high_tides=peaks_for_day["highs"],
            low_tides=peaks_for_day["lows"],
            best_paddling_window=best_window,
        )

    return ForecastResponse(hourly=hourly_entries, daily_summaries=daily_summaries)


@app.post("/api/stations", response_model=StationCreated, status_code=201)
@limiter.limit("5/minute")
def create_station(
    request: Request,
    station: StationCreate,
    db: Session = Depends(get_db),
    x_post_secret: str | None = Header(default=None),
) -> StationCreated:
    expected_secret = os.getenv("POST_SECRET")
    if not expected_secret or x_post_secret != expected_secret:
        raise HTTPException(status_code=403, detail="Forbidden")
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
