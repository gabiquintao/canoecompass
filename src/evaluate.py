import json
from navigability import evaluate_station

def run_evaluation() -> None:
    stations: list[str] = ["17G/02H", "12G/01AE", "27L/01H"]

    for station in stations:
        result = evaluate_station(station)
        print(json.dumps(result, indent=4))

if __name__ == "__main__":
    run_evaluation()