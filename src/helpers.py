from database import WaterBody, WaterBodyType


TIDAL_TYPES = {WaterBodyType.ESTUARY, WaterBodyType.LAGOON, WaterBodyType.COASTAL}


def is_tidal(wb: WaterBody) -> bool:
    return wb.type in TIDAL_TYPES
