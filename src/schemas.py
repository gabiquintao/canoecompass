from datetime import date
from typing import Optional

from pydantic import BaseModel

from database import WaterBodyType


class StationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    type: WaterBodyType


class StationScore(BaseModel):
    id: int
    name: str
    type: str
    latitude: float
    longitude: float
    flow_rate_m3s: Optional[float]
    wind_speed_kmh: Optional[float]
    flow_score: str
    wind_score: str
    final_score: str


class HistoryEntry(BaseModel):
    date: date
    flow_rate: Optional[float]
    wind_speed: Optional[float]


class StationCreated(BaseModel):
    id: int
    message: str
