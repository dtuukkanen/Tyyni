"""Vercel entrypoint: Vercel's FastAPI preset looks for an `app` in index.py at the project root."""

from app.api.main import app

__all__ = ["app"]
