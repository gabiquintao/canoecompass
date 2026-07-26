import requests


def get_location_details(lat: float, lon: float) -> tuple[str, str]:
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
    headers = {"User-Agent": "CanoeCompass/1.0"}

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            address = data.get("address", {})

            district = address.get("county") or address.get("city") or "Unkown"
            region = address.get("state") or address.get("region") or "Unknown"

            return region, district

    except Exception:
        pass

    return "Unkown", "Unkown"
