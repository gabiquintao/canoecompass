import requests

response = requests.get("https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json")

data = response.json()

for station in data:
    properties = station['properties']
    name = properties['localEstacao']

    print(name)