import os
import uuid
import shutil
from pathlib import Path
from typing import Set

from fastapi import UploadFile
from app.core.exceptions import BadRequestError

class StorageService:
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = Path(upload_dir)
        self.avatars_dir = self.upload_dir / "avatars"
        self.allowed_extensions: Set[str] = {".jpg", ".jpeg", ".png", ".webp"}
        self.max_file_size = 5 * 1024 * 1024  # 5MB
        
        # Ensure directories exist
        self.avatars_dir.mkdir(parents=True, exist_ok=True)

    async def upload_avatar(self, file: UploadFile) -> str:
        # 1. Validate file extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in self.allowed_extensions:
            raise BadRequestError(
                detail=f"Invalid file type. Allowed: {', '.join(self.allowed_extensions)}"
            )

        # 2. Validate MIME type (basic check)
        if not file.content_type.startswith("image/"):
            raise BadRequestError(detail="Uploaded file must be an image")

        # 3. Validate file size
        # Note: We need to read the file to get the size accurately if it's not provided in headers
        # However, for simplicity and performance, we can trust the Content-Length but double check during read
        
        # 4. Generate unique filename
        filename = f"{uuid.uuid4()}{ext}"
        file_path = self.avatars_dir / filename
        
        # 5. Save file
        try:
            with file_path.open("wb") as buffer:
                # Limit read size to prevent MemoryError or large file issues
                size = 0
                while content := await file.read(1024 * 1024):  # Read 1MB chunks
                    size += len(content)
                    if size > self.max_file_size:
                        raise BadRequestError(detail="File too large. Maximum size is 5MB.")
                    buffer.write(content)
        except Exception as e:
            if isinstance(e, BadRequestError):
                # Cleanup partially uploaded file if too large
                if file_path.exists():
                    file_path.unlink()
                raise e
            raise BadRequestError(detail=f"Failed to save file: {str(e)}")
        finally:
            await file.close()

        # 6. Return the public URL
        # For local dev, this is the relative path from common root
        # In a real app, this might be a full URL pointing to a CDN or the app's static mount
        return f"/uploads/avatars/{filename}"

storage_service = StorageService()
