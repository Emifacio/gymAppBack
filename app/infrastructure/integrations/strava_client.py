from datetime import datetime
from typing import Any

import httpx

from app.core.config import get_settings


class StravaClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.strava_api_base_url.rstrip("/")

    async def fetch_activities(
        self,
        access_token: str,
        *,
        after: datetime | None = None,
        per_page: int = 50,
    ) -> list[dict[str, Any]]:
        headers = {"Authorization": f"Bearer {access_token}"}
        params: dict[str, Any] = {"page": 1, "per_page": per_page}
        if after is not None:
            params["after"] = int(after.timestamp())

        async with httpx.AsyncClient(base_url=self.base_url, timeout=30.0) as client:
            response = await client.get("/athlete/activities", headers=headers, params=params)
            response.raise_for_status()
            return response.json()

    async def exchange_token(self, code: str) -> dict[str, Any]:
        settings = get_settings()
        payload = {
            "client_id": settings.strava_client_id,
            "client_secret": settings.strava_client_secret,
            "code": code,
            "grant_type": "authorization_code",
        }
        async with httpx.AsyncClient(base_url=settings.strava_oauth_base_url, timeout=30.0) as client:
            response = await client.post("/token", data=payload)
            response.raise_for_status()
            return response.json()

    async def refresh_token(self, refresh_token: str) -> dict[str, Any]:
        settings = get_settings()
        payload = {
            "client_id": settings.strava_client_id,
            "client_secret": settings.strava_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        async with httpx.AsyncClient(base_url=settings.strava_oauth_base_url, timeout=30.0) as client:
            response = await client.post("/token", data=payload)
            response.raise_for_status()
            return response.json()

    async def create_activity(
        self,
        access_token: str,
        name: str,
        type: str,
        start_date_local: datetime,
        elapsed_time: int,
        description: str | None = None,
        distance: float | None = None,
    ) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "name": name,
            "type": type,
            "start_date_local": start_date_local.isoformat(),
            "elapsed_time": elapsed_time,
            "description": description,
            "distance": distance,
        }
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30.0) as client:
            response = await client.post("/activities", headers=headers, json={k: v for k, v in payload.items() if v is not None})
            response.raise_for_status()
            return response.json()

