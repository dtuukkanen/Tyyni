import os

DEFAULT_DATABASE_URL = "postgresql+psycopg://wellbeing:wellbeing@localhost:5432/wellbeing"


def database_url() -> str:
    """Connection string; inside docker compose this points at the `db` service."""
    return os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)
