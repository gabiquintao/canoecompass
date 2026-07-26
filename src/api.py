from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import DataObservation, SessionLocal, WaterBody
from navigability import evaluate_water_body
from schemas import StationCreate
from utils import get_location_details

app = FastAPI(title="Canoeing Navigability API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/stations/score")
def get_stations_score() -> list[dict[str, Any]]:
    db = SessionLocal()

    try:
        water_bodies = db.query(WaterBody).all()
        return [evaluate_water_body(wb) for wb in water_bodies]

    finally:
        db.close()


@app.get("/api/stations/{station_id}/history")
def get_station_history(station_id: int) -> list[dict[str, Any]]:
    db = SessionLocal()

    try:
        observations = (
            db.query(DataObservation)
            .filter(DataObservation.water_body_id == station_id)
            .order_by(DataObservation.date)
            .all()
        )

        return [
            {
                "date": obs.date.isoformat(),
                "flow_rate": obs.flow_rate_m3s,
                "wind_speed": obs.wind_speed_kmh,
            }
            for obs in observations
        ]

    finally:
        db.close()

@app.post("/api/stations")
def create_station(station: StationCreate) -> dict[str, Any]:
    db = SessionLocal()

    try:
        reg, dist = get_location_details(station.latitude, station.longitude)

        new_wb = WaterBody(
            name=station.name,
            latitude=station.latitude,
            longitude=station.longitude,
            type=station.type,
            region=reg,
            district=dist
        )
        db.add(new_wb)
        db.commit()
        db.refresh(new_wb)

        return {"id": new_wb.id, "message": f"{dist}, {reg}"}

    finally:
        db.close()
