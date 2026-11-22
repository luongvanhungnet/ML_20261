import os
import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash
from app.db.models import User, ModelVersion, NetworkTraffic
from app.ml.registry import MODEL_EVALUATION_SPECS
from app.services.dataset_service import import_csv_file

def init_seed_data(db: Session):
    # 1. Seed Users
    admin_user = db.query(User).filter(User.email == settings.SEED_ADMIN_EMAIL).first()
    if not admin_user:
        admin_user = User(
            email=settings.SEED_ADMIN_EMAIL,
            password_hash=get_password_hash(settings.SEED_ADMIN_PASSWORD),
            role="administrator",
            created_at=datetime.datetime.utcnow()
        )
        db.add(admin_user)

    analyst_user = db.query(User).filter(User.email == settings.SEED_ANALYST_EMAIL).first()
    if not analyst_user:
        analyst_user = User(
            email=settings.SEED_ANALYST_EMAIL,
            password_hash=get_password_hash(settings.SEED_ANALYST_PASSWORD),
            role="analyst",
            created_at=datetime.datetime.utcnow()
        )
        db.add(analyst_user)
    db.commit()

    # 2. Seed Model Versions & Metrics
    for spec in MODEL_EVALUATION_SPECS:
        existing = db.query(ModelVersion).filter(ModelVersion.version == spec["version"]).first()
        if not existing:
            mv = ModelVersion(
                name=spec["name"],
                version=spec["version"],
                algorithm=spec["algorithm"],
                is_active=spec["is_active"],
                feature_schema=spec["feature_schema"],
                metrics=spec["metrics"],
                created_at=datetime.datetime.utcnow()
            )
            db.add(mv)
    db.commit()

    # 3. Initial Ingestion from dataset if table empty
    traffic_count = db.query(NetworkTraffic).count()
    if traffic_count == 0:
        csv_path = Path(settings.DEFAULT_DATASET_PATH)
        if csv_path.exists():
            try:
                with open(csv_path, mode="r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                # Ingest initial 10,000 rows for fast startup performance and responsive queries
                import_csv_file(
                    db=db,
                    content=content,
                    filename="cybersecurity_attacks.csv",
                    actor_email="system_seed",
                    max_rows=10000
                )
            except Exception as e:
                print(f"Warning: automatic seed ingestion failed: {e}")
