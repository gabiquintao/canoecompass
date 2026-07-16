from datetime import date

import requests

from database import DataObservation, SessionLocal, WaterBody, WaterBodyType


def fetch_data_for_water_bodies() -> None:
    db = SessionLocal()

    try:
        water_bodies = db.query(WaterBody).all()

        for wb in water_bodies:
            wind_params = {
                "latitude": str(wb.latitude),
                "longitude": str(wb.longitude),
                "current": "wind_speed_10m",
            }

            wind_response = requests.get(
                "https://api.open-meteo.com/v1/forecast", params=wind_params
            )
            wind_data = wind_response.json()
            wind_speed = wind_data["current"]["wind_speed_10m"]

            flow_rate = None
            if wb.type == WaterBodyType.RIVER:
                flow_params = {
                    "latitude": str(wb.latitude),
                    "longitude": str(wb.longitude),
                    "daily": "river_discharge",
                }

                flow_response = requests.get(
                    "https://flood-api.open-meteo.com/v1/flood", params=flow_params
                )
                flow_data = flow_response.json()

                if "daily" in flow_data and "river_discharge" in flow_data["daily"]:
                    flow_list = flow_data["daily"]["river_discharge"]
                    if len(flow_list) > 0:
                        flow_rate = flow_list[0]

            print(f"[{wb.name}] Wind: {wind_speed} km/h | Flow {flow_rate}")

            obs = DataObservation(
                water_body_id=wb.id,
                date=date.today(),
                is_forecast=False,
                flow_rate_m3s=flow_rate,
                wind_speed_kmh=wind_speed,
            )
            db.add(obs)
            print(f"[{wb.name}] Dados guardados na base de dados!")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    fetch_data_for_water_bodies()
