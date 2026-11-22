from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.api.v1.schemas import DatasetImportResponse, DataQualitySummary
from app.api.v1.deps import get_current_user, require_admin
from app.services.dataset_service import (
    import_csv_file, get_data_quality_summary, list_dataset_imports
)

router = APIRouter(prefix="/datasets", tags=["Datasets & Ingestion"])

@router.post("/import", response_model=DatasetImportResponse)
async def import_dataset(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported for dataset ingestion."
        )

    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8", errors="ignore")
        import_record = import_csv_file(
            db=db,
            content=content_str,
            filename=file.filename,
            actor_email=current_user.email
        )
        return import_record
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process CSV import: {str(e)}"
        )

@router.get("/imports", response_model=List[DatasetImportResponse])
def get_imports_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return list_dataset_imports(db)

@router.get("/quality", response_model=DataQualitySummary)
def get_dataset_quality_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_data_quality_summary(db)
