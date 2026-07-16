from database import SessionLocal, WaterBody, WaterBodyType


def seed_database() -> None:
    db = SessionLocal()
    try:
        initial_bodies = [
            WaterBody(
                name="Tejo (Almourol)",
                type=WaterBodyType.RIVER,
                latitude=39.4626,
                longitude=-8.3734,
                region="Centro",
                district="Santarém",
                flow_min=50.0,
                flow_max=400.0,
                flow_danger=700.0,
            ),
            WaterBody(
                name="Guadiana (Pulo do Lobo)",
                type=WaterBodyType.RIVER,
                latitude=37.8042,
                longitude=-7.6333,
                region="Alentejo",
                district="Beja",
                flow_min=10.0,
                flow_max=150.0,
                flow_danger=300.0,
            ),
            WaterBody(
                name="Mondego (Penacova)",
                type=WaterBodyType.RIVER,
                latitude=40.27,
                longitude=-8.28,
                region="Centro",
                district="Coimbra",
                flow_min=10.0,
                flow_max=120.0,
                flow_danger=250.0,
            ),
            WaterBody(
                name="Alqueva",
                type=WaterBodyType.RESERVOIR,
                latitude=38.20,
                longitude=-7.50,
                region="Alentejo",
                district="Beja",
            ),
            WaterBody(
                name="Ria de Aveiro",
                type=WaterBodyType.LAGOON,
                latitude=40.64,
                longitude=-8.65,
                region="Centro",
                district="Aveiro",
                wave_max_good=0.4,
                wave_max_poor=0.8,
                wave_max_danger=1.2,
            ),
        ]

        for body in initial_bodies:
            existing = db.query(WaterBody).filter(WaterBody.name == body.name).first()
            if not existing:
                db.add(body)

        db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
