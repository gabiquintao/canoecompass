import math

import requests


def get_location_details(lat: float, lon: float) -> tuple[str, str]:
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
    headers = {"User-Agent": "CanoeCompass/1.0"}

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            address = data.get("address", {})

            district = address.get("county") or address.get("city") or "Unknown"
            region = address.get("state") or address.get("region") or "Unknown"

            return region, district

    except Exception:
        pass

    return "Unknown", "Unknown"




def get_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return r * c


def get_percentile(data: list[float], percentile: float) -> float | None:
    if not data:
        return None

    sorted_data = sorted(data)
    index = int(len(data) * (percentile / 100.00))
    index = min(max(index, 0), len(sorted_data) - 1)

    return round(sorted_data[index], 2)
