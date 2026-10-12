"""TATVIK - Production-Quality Foundation API (Phase 1)

AI-Powered Business Data Quality and Research Verification Platform.
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.health import router as health_router

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered business data quality and research verification platform",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configurable CORS middleware for local frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health_router, prefix="/api", tags=["System"])


@app.get("/", tags=["System"])
async def root():
    """Root status endpoint for quick verification."""
    return {
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "phase": "Phase 1 - Foundation & Dashboard",
        "docs": "/docs",
        "health": "/api/health",
    }


# Standard Error Handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the request.",
            "path": request.url.path,
        },
    )
