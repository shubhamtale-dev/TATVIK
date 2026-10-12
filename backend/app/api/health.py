from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
async def get_health():
    """Returns the operational status of the TATVIK backend service.
    """
    return HealthResponse(
        status="healthy",
        service=settings.APP_NAME,
        version=settings.VERSION,
        environment=settings.APP_ENV,
        cors_origins=settings.cors_origins_list,
    )
