import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.db import models  # ensure models are registered
from app.api.v1 import api_router
from app.services.seed_service import init_seed_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cybersecurity")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed initial data
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized.")

    db = SessionLocal()
    try:
        logger.info("Seeding initial administrator, model metrics, and dataset slice...")
        init_seed_data(db)
        logger.info("Database seeding complete.")
    finally:
        db.close()

    yield
    # Shutdown
    logger.info("Shutting down CyberSecurity service...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Cyber Threat Analytics Dashboard API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Set CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "api_v1": settings.API_V1_STR,
        "documentation": "/docs"
    }
