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
                "start_date": "2026-07-01",
                "end_date": "2026-07-17",
                "daily": "wind_speed_10m_max",
            }

            wind_response = requests.get(
                "https://archive-api.open-meteo.com/v1/archive", params=wind_params
            )
            wind_data = wind_response.json()
            dates: list[str] = wind_data["daily"]["time"]
            winds: list[float] = wind_data["daily"]["wind_speed_10m_max"]

            flow_rates: list[float] = []
            if wb.type == WaterBodyType.RIVER:
                flow_params = {
                    "latitude": str(wb.latitude),
                    "longitude": str(wb.longitude),
                    "start_date": "2026-07-01",
                    "end_date": "2026-07-17",
                    "daily": "river_discharge",
                }

                flow_response = requests.get(
                    "https://flood-api.open-meteo.com/v1/flood", params=flow_params
                )
                flow_data = flow_response.json()

                extracted_flows: list[float] = flow_data["daily"]["river_discharge"]
                flow_rates = extracted_flows

            for i in range(len(dates)):
                date_str = dates[i]
                wind_spd = winds[i]

                flow: float | None = None
                if len(flow_rates) > 0:
                    flow = flow_rates[i]

                from datetime import datetime

                real_date = datetime.strptime(date_str, "%Y-%m-%d").date()

                obs = DataObservation(
                    water_body_id=wb.id,
                    date=real_date,
                    is_forecast=False,
                    flow_rate_m3s=flow,
                    wind_speed_kmh=wind_spd,
                )
                db.add(obs)

        db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    fetch_data_for_water_bodies()
