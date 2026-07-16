from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal, WaterBody
from navigability import evaluate_water_body

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
    results: list[dict[str, Any]] = []

    try:
        water_bodies = db.query(WaterBody).all()
        for wb in water_bodies:
            score_data = evaluate_water_body(wb)
            results.append(score_data)
        return results

    finally:
        db.close()
