"""TATVIK - Backend API Entrypoint

AI-powered business data quality and research verification platform.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="TATVIK API",
    description="AI-powered business data quality and research verification platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "healthy",
        "service": "TATVIK Data Quality & Verification API",
        "version": "0.1.0",
    }


@app.get("/api/v1/health", tags=["Health"])
async def health_check():
    return {
        "status": "online",
        "engine": "ready",
        "checks": {
            "database": "configured",
            "deduplication_engine": "ready",
            "ai_verifier": "ready",
        },
    }
