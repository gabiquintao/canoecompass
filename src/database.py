import os
from datetime import date as dt_date
from datetime import datetime, timezone
from enum import Enum

from dotenv import load_dotenv
from sqlalchemy import ForeignKey, String, UniqueConstraint, create_engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
)

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class WaterBodyType(str, Enum):
    RIVER = "RIVER"
    RESERVOIR = "RESERVOIR"
    ESTUARY = "ESTUARY"
    COASTAL = "COASTAL"
    LAGOON = "LAGOON"


class WaterBody(Base):
    __tablename__ = "water_bodies"
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    type: Mapped[WaterBodyType] = mapped_column()
    latitude: Mapped[float] = mapped_column()
    longitude: Mapped[float] = mapped_column()
    region: Mapped[str] = mapped_column(String)
    district: Mapped[str] = mapped_column(String)

    flow_min: Mapped[float | None] = mapped_column()
    flow_max: Mapped[float | None] = mapped_column()
    flow_danger: Mapped[float | None] = mapped_column()

    wave_max_good: Mapped[float | None] = mapped_column()
    wave_max_poor: Mapped[float | None] = mapped_column()
    wave_max_danger: Mapped[float | None] = mapped_column()

    tide_min_m: Mapped[float | None] = mapped_column()
    tide_max_m: Mapped[float | None] = mapped_column()

    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )

    hourly_forecasts: Mapped[list["HourlyForecast"]] = relationship(
        back_populates="water_body", cascade="all, delete-orphan"
    )


class DataObservation(Base):
    __tablename__ = "data_observations"
    __table_args__ = (
        UniqueConstraint(
            "water_body_id", "date", name="uq_observation_water_body_date"
        ),
    )
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    water_body_id: Mapped[int] = mapped_column(
        ForeignKey("water_bodies.id"), index=True
    )
    date: Mapped[dt_date] = mapped_column(index=True)
    is_forecast: Mapped[bool] = mapped_column()

    flow_rate_m3s: Mapped[float | None] = mapped_column()
    tide_level_m: Mapped[float | None] = mapped_column()
    wind_speed_kmh: Mapped[float | None] = mapped_column()
    wind_gust_kmh: Mapped[float | None] = mapped_column()
    wave_height_m: Mapped[float | None] = mapped_column()

    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )


class HourlyForecast(Base):
    __tablename__ = "hourly_forecasts"
    __table_args__ = (
        UniqueConstraint("water_body_id", "timestamp", name="uq_wb_timestamp"),
    )
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    water_body_id: Mapped[int] = mapped_column(
        ForeignKey("water_bodies.id"), index=True
    )
    timestamp: Mapped[datetime] = mapped_column(index=True)
    water_body: Mapped["WaterBody"] = relationship(back_populates="hourly_forecasts")

    flow_rate_m3s: Mapped[float | None] = mapped_column()
    tide_level_m: Mapped[float | None] = mapped_column()
    wind_speed_kmh: Mapped[float | None] = mapped_column()
    wind_gust_kmh: Mapped[float | None] = mapped_column()
    wave_height_m: Mapped[float | None] = mapped_column()

    flow_score: Mapped[str | None] = mapped_column()
    tide_score: Mapped[str | None] = mapped_column()
    wind_score: Mapped[str | None] = mapped_column()
    final_score: Mapped[str | None] = mapped_column()

    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )


if __name__ == "__main__":
    from sqlalchemy import text

    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
    Base.metadata.create_all(bind=engine)
