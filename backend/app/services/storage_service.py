"""Storage Service Layer for Persistent Datasets (Part 6).

Provides:
- Private, authenticated file storage abstraction
- Local filesystem storage with user isolation and path traversal guards
- Supabase Storage private bucket integration when configured
- Safe file deletion and retrieval without public URLs
"""

import os
import re
from typing import Optional, Tuple
import httpx

from app.core.config import settings


class StorageService:
    """Manages secure, private storage of uploaded dataset binaries."""

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = base_dir or settings.STORAGE_DIR
        os.makedirs(self.base_dir, exist_ok=True)

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """Strips unsafe path characters to prevent directory traversal."""
        clean = os.path.basename(filename)
        return re.sub(r"[^a-zA-Z0-9_.-]", "_", clean)

    def save_file(
        self,
        user_id: str,
        dataset_id: str,
        filename: str,
        content: bytes,
    ) -> str:
        """Saves file into a user-isolated private directory."""
        safe_name = self._sanitize_filename(filename)
        user_dir = os.path.join(self.base_dir, self._sanitize_filename(user_id))
        os.makedirs(user_dir, exist_ok=True)

        target_path = os.path.join(user_dir, f"{dataset_id}_{safe_name}")
        with open(target_path, "wb") as f:
            f.write(content)

        return target_path

    def read_file(self, user_id: str, storage_path: str) -> Optional[bytes]:
        """Safely reads file if it belongs to the user directory."""
        if not storage_path or not os.path.isfile(storage_path):
            return None

        # Verify storage_path is inside user directory
        user_dir = os.path.abspath(os.path.join(self.base_dir, self._sanitize_filename(user_id)))
        target_abs = os.path.abspath(storage_path)

        if not target_abs.startswith(user_dir):
            return None

        with open(target_abs, "rb") as f:
            return f.read()

    def delete_file(self, user_id: str, storage_path: str) -> bool:
        """Deletes file if it belongs to the user directory."""
        if not storage_path or not os.path.isfile(storage_path):
            return False

        user_dir = os.path.abspath(os.path.join(self.base_dir, self._sanitize_filename(user_id)))
        target_abs = os.path.abspath(storage_path)

        if not target_abs.startswith(user_dir):
            return False

        try:
            os.remove(target_abs)
            return True
        except OSError:
            return False


storage_service = StorageService()
