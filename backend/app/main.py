"""TATVIK - API Entrypoint (Phase 2)

AI-Powered Business Data Quality and Research Verification Platform.
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.health import router as health_router
from app.api.datasets import router as datasets_router
from app.api.review import router as review_router
from app.api.verification import router as verification_router
from app.api.auth import router as auth_router
from app.db.base import init_db

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered business data quality and research verification platform",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Initialize database schema tables on startup
@app.on_event("startup")
def on_startup():
    init_db()

# Configurable CORS middleware for local frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health_router, prefix="/api", tags=["System"])
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(datasets_router, prefix="/api/datasets", tags=["Datasets"])
app.include_router(review_router, prefix="/api/review", tags=["Review & Corrections"])
app.include_router(verification_router, prefix="/api/verification", tags=["Research Verification"])



@app.get("/", tags=["System"])
async def root():
    """Root status endpoint for quick verification."""
    return {
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "phase": "Part 2 - Real CSV/Excel Upload & Dataset Preview",
        "docs": "/docs",
        "health": "/api/health",
        "endpoints": {
            "health": "/api/health",
            "preview_upload": "/api/datasets/preview",
        },
    }


# HTTP Exception Handler for structured user-safe responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail_msg = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "RequestError",
            "message": detail_msg,
            "detail": detail_msg,
            "status_code": exc.status_code,
        },
    )


# General Exception Handler (Fallback without exposing stack traces)
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
