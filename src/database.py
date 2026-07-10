import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
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
    created_at = Column(DateTime, default=datetime.now(timezone.utc)) 

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)