from pydantic import BaseModel

from database import WaterBodyType


class StationCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    type: WaterBodyType
