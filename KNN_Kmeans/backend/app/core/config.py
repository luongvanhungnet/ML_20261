import os
from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings

# Root directory of the repository
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "CyberSecurity Analytics Dashboard"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cybersecurity-threat-analytics-super-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{BASE_DIR / 'cybersecurity.db'}"
    )
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # Paths
    DEFAULT_DATASET_PATH: str = str(BASE_DIR / "dataset" / "cybersecurity_attacks.csv")
    MODEL_ARTIFACTS_PATH: str = str(BASE_DIR / "ml" / "artifacts")
    
    # Initial Admin Seed
    SEED_ADMIN_EMAIL: str = os.getenv("SEED_ADMIN_EMAIL", "admin@cybersecurity.local")
    SEED_ADMIN_PASSWORD: str = os.getenv("SEED_ADMIN_PASSWORD", "Admin@123456")
    
    # Initial Analyst Seed
    SEED_ANALYST_EMAIL: str = os.getenv("SEED_ANALYST_EMAIL", "analyst@cybersecurity.local")
    SEED_ANALYST_PASSWORD: str = os.getenv("SEED_ANALYST_PASSWORD", "Analyst@123456")

    model_config = {"env_file": ".env", "case_sensitive": True}

settings = Settings()
