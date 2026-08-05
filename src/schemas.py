from datetime import date, datetime
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
    wind_gust_kmh: Optional[float] = None
    wave_height_m: Optional[float] = None
    flow_score: Optional[str] = None
    tide_score: Optional[str] = None
    wind_score: str
    final_score: str
    flow_min: Optional[float] = None
    flow_max: Optional[float] = None
    flow_danger: Optional[float] = None
    tide_min_m: Optional[float] = None
    tide_max_m: Optional[float] = None


class HistoryEntry(BaseModel):
    date: date
    flow_rate: Optional[float] = None
    wind_speed: Optional[float] = None
    tide_level: Optional[float] = None
    wind_gust: Optional[float] = None
    wave_height: Optional[float] = None


class StationCreated(BaseModel):
    id: int
    message: str


class HourlyForecastEntry(BaseModel):
    timestamp: datetime
    wind_speed_kmh: Optional[float] = None
    wind_gust_kmh: Optional[float] = None
    flow_rate_m3s: Optional[float] = None
    tide_level_m: Optional[float] = None
    wave_height_m: Optional[float] = None
    wind_score: Optional[str] = None
    tide_score: Optional[str] = None
    flow_score: Optional[str] = None
    final_score: str

    class Config:
        from_attributes = True


class TidalPeak(BaseModel):
    time: str
    level: float


class PaddlingWindow(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    peak_hour: HourlyForecastEntry

class DailyMarineSummary(BaseModel):
    high_tides: list[TidalPeak]
    low_tides: list[TidalPeak]
    best_paddling_window: Optional[PaddlingWindow] = None


class ForecastResponse(BaseModel):
    hourly: list[HourlyForecastEntry]
    daily_summaries: dict[str, DailyMarineSummary]
