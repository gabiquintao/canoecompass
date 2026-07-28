import os
from typing import Generator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import DataObservation, SessionLocal, WaterBody
from navigability import evaluate_water_body
from schemas import HistoryEntry, StationCreate, StationCreated, StationScore
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

    return [
        StationScore(**evaluate_water_body(wb, obs_by_id.get(wb.id)))
        for wb in water_bodies
    ]


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
        )
        for obs in observations
    ]


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
    db.refresh(new_wb)

    return StationCreated(id=new_wb.id, message=f"{dist}, {reg}")
