from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.datasets import router as datasets_router
from app.api.v1.traffic import router as traffic_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.predictions import router as predictions_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.models import router as models_router
from app.api.v1.audit import router as audit_router
from app.api.v1.health import router as health_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(datasets_router)
api_router.include_router(traffic_router)
api_router.include_router(dashboard_router)
api_router.include_router(predictions_router)
api_router.include_router(alerts_router)
api_router.include_router(models_router)
api_router.include_router(audit_router)
api_router.include_router(health_router)
