from datetime import date

import requests

from database import DataObservation, SessionLocal, WaterBody, WaterBodyType


def fetch_data_for_water_bodies() -> None:
    db = SessionLocal()

    try:
        water_bodies = db.query(WaterBody).all()

        for wb in water_bodies:
            try:
                wind_params = {
                    "latitude": str(wb.latitude),
                    "longitude": str(wb.longitude),
                    "current": "wind_speed_10m",
                }

                wind_response = requests.get(
                    "https://api.open-meteo.com/v1/forecast", params=wind_params
                )
                wind_response.raise_for_status()
                wind_data = wind_response.json()
                wind_speed: float | None = wind_data.get("current", {}).get(
                    "wind_speed_10m"
                )

                if wind_speed is None:
                    print(f"[{wb.name}] No wind data returned, skipping.")
                    continue

                flow_rate: float | None = None
                if wb.type == WaterBodyType.RIVER:
                    flow_params = {
                        "latitude": str(wb.latitude),
                        "longitude": str(wb.longitude),
                        "daily": "river_discharge",
                    }

                    flow_response = requests.get(
                        "https://flood-api.open-meteo.com/v1/flood", params=flow_params
                    )
                    flow_response.raise_for_status()
                    flow_data = flow_response.json()

                    flow_list: list[float] = (
                        flow_data.get("daily", {}).get("river_discharge") or []
                    )
                    if flow_list:
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
                print(f"[{wb.name}] Data saved in the DB.")

            except Exception as exc:
                print(f"[{wb.name}] Failed to fetch data, skipping: {exc}")

        db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    fetch_data_for_water_bodies()
