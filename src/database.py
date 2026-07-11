import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from datetime import datetime, timezone, date
from typing import Optional

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    station_name: Mapped[str] = mapped_column(index=True)
    temperature: Mapped[Optional[float]] = mapped_column()
    wind_speed: Mapped[Optional[float]] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc)) 

class RiverFlowObservation(Base):
    __tablename__ = "river_flow_observations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    station_code: Mapped[str] = mapped_column(index=True)
    station_name: Mapped[str] = mapped_column()
    river_name: Mapped[str] = mapped_column()
    flow_rate: Mapped[Optional[float]] = mapped_column()
    date: Mapped[date] = mapped_column()
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)