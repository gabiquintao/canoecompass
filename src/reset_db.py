"""
reset_db.py — DEV ONLY. Drops and recreates the entire public schema.
WARNING: This will destroy ALL data. Never run this in production.

Usage:
    python reset_db.py
"""
import sys

from sqlalchemy import text

from database import Base, engine

CONFIRMATION = "RESET"


def reset_database() -> None:
    confirm = input(
        f"This will permanently DROP all data. Type '{CONFIRMATION}' to confirm: "
    )
    if confirm.strip() != CONFIRMATION:
        print("Aborted.")
        sys.exit(0)

    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))

    Base.metadata.create_all(bind=engine)
    print("Database reset complete.")


if __name__ == "__main__":
    reset_database()
