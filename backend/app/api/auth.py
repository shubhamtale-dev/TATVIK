"""Authentication Status and Profile Endpoints (Part 6).

Provides:
- Transparent Supabase Auth configuration status
- Authenticated user identity inspection
- Setup instructions when unconfigured
"""

from fastapi import APIRouter, Depends, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import settings
from app.schemas.persistent_dataset import AuthStatusResponse, UserProfileResponse

router = APIRouter()


@router.get(
    "/status",
    response_model=AuthStatusResponse,
    summary="Get Authentication Provider Status",
    description="Returns whether Supabase Auth is configured, project URL, and setup guide.",
)
async def get_auth_status() -> AuthStatusResponse:
    """Returns honest auth provider status without pretending unconfigured service is active."""
    instructions = (
        "To enable Supabase Authentication and durable PostgreSQL persistence:\n"
        "1. Create a project at https://supabase.com\n"
        "2. Copy Project URL and Anon Public Key from Project Settings -> API\n"
        "3. Add to backend/.env and frontend/.env:\n"
        "   SUPABASE_URL=https://your-project.supabase.co\n"
        "   SUPABASE_ANON_KEY=your-supabase-anon-key\n"
        "4. Optionally configure SUPABASE_JWT_SECRET for local signature validation.\n"
        "5. Restart the backend and frontend servers."
    )
    return AuthStatusResponse(
        configured=settings.is_supabase_configured,
        provider="supabase" if settings.is_supabase_configured else "local_dev",
        supabase_url=settings.SUPABASE_URL if settings.is_supabase_configured else None,
        setup_instructions=instructions,
    )


@router.get(
    "/user",
    response_model=UserProfileResponse,
    summary="Get Current Authenticated User",
    description="Validates the Authorization Bearer JWT token and returns the current user profile.",
)
async def get_user_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserProfileResponse:
    """Returns authenticated user profile or 401 if unauthorized."""
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
    )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Alias for /user",
)
async def get_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserProfileResponse:
    return UserProfileResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
    )
