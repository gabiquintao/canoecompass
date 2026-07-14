from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import Any, TypedDict
from navigability import evaluate_station

class StationInfo(TypedDict):
    name: str
    lat: float
    lon: float

app = FastAPI(title="Canoeing Navigability API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIONS_INFO: dict[str, StationInfo] = {
    "17G/02H": {"name": "Tejo (Almourol)", "lat": 39.4626, "lon": -8.3734},
    "12G/01AE": {"name": "Mondego (Açude Coimbra)", "lat": 40.2144, "lon": -8.4357},
    "27L/01H": {"name": "Guadiana (Pulo do Lobo)", "lat": 37.8042, "lon": -7.6333},
}

@app.get("/api/stations/score")
def get_stations_score() -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for code, info in STATIONS_INFO.items():
        score_data = evaluate_station(code)

        score_data["station_name"] = info["name"]
        score_data["latitude"] = info["lat"]
        score_data["longitude"] = info["lon"]

        results.append(score_data)

    return results
