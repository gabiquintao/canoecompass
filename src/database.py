import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Date
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    station_name = Column(String, index=True)
    temperature = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc)) 

class RiverFlowObservation(Base):
    __tablename__ = "river_flow_observations"

    id = Column(Integer, primary_key=True, index=True)
    station_code = Column(String, index=True)
    station_name = Column(String)
    river_name = Column(String)
    flow_rate = Column(Float, nullable=True)
    date = Column(Date)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)