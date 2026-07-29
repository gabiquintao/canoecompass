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


def detect_water_body_info(lat: float, lon: float) -> dict[str, str]:
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&zoom=18"
    headers = {"User-Agent": "CanoeCompass/1.0"}

    default_result = {
        "name": "Custom Spot",
        "type": "RIVER",
        "district": "Unknown",
        "region": "Unknown",
    }

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return default_result

        data = response.json()
        address = data.get("address", {})
        osm_type = str(data.get("type", "")).lower()
        osm_class = str(data.get("class", "")).lower()

        district = address.get("county") or address.get("city") or "Unknown"
        region = address.get("state") or address.get("region") or "Unknown"

        name = (
            address.get("river")
            or address.get("water")
            or address.get("natural")
            or data.get("name")
            or f"Spot in {district}"
        )

        wb_type = "RIVER"
        if osm_type in ["reservoir", "dam"] or "reservoir" in address:
            wb_type = "RESERVOIR"
        elif osm_type in ["estuary", "river_mouth"] or "estuary" in address:
            wb_type = "ESTUARY"
        elif osm_type in ["lagoon", "lake"] or "lagoon" in address:
            wb_type = "LAGOON"
        elif (
            osm_type in ["beach", "coast"]
            or osm_class == "natural"
            and osm_type == "beach"
        ):
            wb_type = "COASTAL"

        return {
            "name": name,
            "type": wb_type,
            "district": district,
            "region": region,
        }

    except Exception:
        return default_result


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
