from datetime import date
from enum import Enum
from typing import Optional

from pydantic import BaseModel

from database import WaterBodyType


class NavigabilityScore(Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    POOR = "POOR"
    DANGEROUS = "DANGEROUS"
    UNKNOWN = "UNKNOWN"


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
    flow_rate_m3s: Optional[float] = None
    tide_level_m: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    flow_score: Optional[str] = None
    tide_score: Optional[str] = None
    wind_score: str
    final_score: str


class HistoryEntry(BaseModel):
    date: date
    flow_rate: Optional[float]
    wind_speed: Optional[float]


class StationCreated(BaseModel):
    id: int
    message: str
