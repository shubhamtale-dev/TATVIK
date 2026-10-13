"""Authentication Dependency and Token Verification Layer (Part 6).

Handles:
- Supabase JWT token extraction and signature verification
- Supabase Auth REST API verification fallback
- In-database user record sync (ensures foreign key constraints)
- Fast test token handling for automated testing
- Strict server-side ownership enforcement
"""

from typing import Optional
from fastapi import Depends, Header, HTTPException, status
import httpx
import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import get_db
from app.db.models import UserRecord


class AuthenticatedUser(BaseModel):
    """Represents an authenticated user identity."""
    id: str
    email: Optional[str] = None
    role: str = "authenticated"


async def verify_supabase_token(token: str) -> AuthenticatedUser:
    """Verifies a Supabase JWT token and extracts user claims."""
    # 1. Direct JWT Secret verification if SUPABASE_JWT_SECRET is set
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication token missing user subject identifier.",
                )
            return AuthenticatedUser(
                id=str(user_id),
                email=payload.get("email"),
                role=payload.get("role", "authenticated"),
            )
        except jwt.PyJWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired authentication token: {str(exc)}",
            )

    # 2. Supabase Auth REST API verification if project URL is set
    if settings.is_supabase_configured:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                    headers={
                        "apikey": settings.SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {token}",
                    },
                )
                if res.status_code == 200:
                    data = res.json()
                    user_id = data.get("id")
                    if user_id:
                        return AuthenticatedUser(
                            id=str(user_id),
                            email=data.get("email"),
                            role=data.get("role", "authenticated"),
                        )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Supabase rejected authentication token or session has expired.",
                )
        except httpx.RequestError as req_err:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Unable to verify token with Supabase Auth service: {str(req_err)}",
            )

    # 3. Development / Test Token Fallback
    # In unconfigured local dev or test suites, decode without signature check if it resembles a JWT
    try:
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        user_id = unverified_payload.get("sub") or unverified_payload.get("id")
        if user_id:
            return AuthenticatedUser(
                id=str(user_id),
                email=unverified_payload.get("email", "dev-user@tatvik.local"),
                role=unverified_payload.get("role", "authenticated"),
            )
    except Exception:
        pass

    # Simple bearer token string for test isolation (e.g. "dev:usr-test-a:alice@tatvik.ai" or "test-user-1")
    if token.startswith("dev:"):
        parts = token.split(":")
        user_id = parts[1] if len(parts) > 1 else "dev-user"
        email = parts[2] if len(parts) > 2 else f"{user_id}@tatvik.local"
        return AuthenticatedUser(
            id=user_id,
            email=email,
            role="authenticated",
        )

    if token.startswith("test-") or token.startswith("user-"):
        return AuthenticatedUser(
            id=token,
            email=f"{token}@test.local",
            role="authenticated",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication token. Configure Supabase credentials in .env.",
    )


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """Enforces authentication and ensures user record exists in the local database."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split("Bearer ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await verify_supabase_token(token)

    # Ensure user record exists in the database to satisfy foreign keys
    db_user = db.query(UserRecord).filter(UserRecord.id == user.id).first()
    if not db_user:
        db_user = UserRecord(id=user.id, email=user.email)
        db.add(db_user)
        try:
            db.commit()
        except Exception:
            db.rollback()

    return user


async def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> Optional[AuthenticatedUser]:
    """Optional auth dependency allowing guest fallback for public demo routes."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None
