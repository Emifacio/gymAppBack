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

