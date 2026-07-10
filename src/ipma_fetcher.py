import requests

def fetch_weather_data():
    response = requests.get("https://api.ipma.pt/open-data/observation/meteorology/stations/obs-surface.geojson")

    data = response.json()
    stations = data['features']
    weather_data = []

    for s in stations:
        properties = s['properties']

        station = {
            "name": properties['localEstacao'],
            "temperature": properties['temperatura'],
            "wind_speed": properties['intensidadeVentoKM']
        }
        weather_data.append(station)

    return weather_data

if __name__ == "__main__":
    result = fetch_weather_data()
    print(result)
