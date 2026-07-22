from database import SessionLocal


def import_waters():
    # query = """
    # [out:json];
    # area["ISO3166-1"="PT"][admin_level=2]->.searchArea;
    # (
    #   way["waterway"="river"]["name"](area.searchArea);
    #   way["natural"="water"]["water"="lake"]["name"](area.searchArea);
    #   way["natural"="water"]["water"="reservoir"]["name"](area.searchArea);
    # );
    # out center;
    # """

    # headers = {"User-Agent": "CanoeCompass/1.0", "Accept": "application/json"}

    # response = requests.post(
    #     "https://overpass-api.de/api/interpreter", data={"data": query}, headers=headers
    # )

    # print("Status Code:", response.status_code)
    # print("Server Response:", response.text)

    # data = response.json()

    # elements = data.get("elements", [])

    # print(f"Found {len(elements)}.")

    db = SessionLocal()
    try:
        db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    import_waters()
