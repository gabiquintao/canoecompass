import requests
from typing import Any
from database import SessionLocal, WeatherObservation

def fetch_weather_data() -> list[dict[str, Any]]:
    response = requests.get("https://api.ipma.pt/open-data/observation/meteorology/stations/obs-surface.geojson")

    data = response.json()
    stations = data['features']
    weather_data: list[dict[str, Any]] = []

    for feature in stations:
        properties = feature['properties']

        station: dict[str, Any] = {
            "name": properties['localEstacao'],
            "temperature": properties['temperatura'],
            "wind_speed": properties['intensidadeVentoKM']
        }
        weather_data.append(station)

    return weather_data

if __name__ == "__main__":
    weather_data = fetch_weather_data()
    db = SessionLocal()

    try:
        for station in weather_data:
            observation = WeatherObservation(
                station_name=station["name"],
                temperature=station["temperature"],
                wind_speed=station["wind_speed"]
            )
            db.add(observation)
        
        db.commit()

    finally:
        db.close()
