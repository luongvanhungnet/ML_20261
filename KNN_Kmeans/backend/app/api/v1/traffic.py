import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.api.v1.schemas import TrafficListResponse, NetworkTrafficItem
from app.api.v1.deps import get_current_user
from app.services.traffic_service import (
    get_traffic_records, get_traffic_by_id, export_traffic_csv
)

router = APIRouter(prefix="/traffic", tags=["Traffic Explorer"])

@router.get("", response_model=TrafficListResponse)
def list_traffic(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    protocol: Optional[str] = None,
    attack_type: Optional[str] = None,
    severity_level: Optional[str] = None,
    packet_type: Optional[str] = None,
    traffic_type: Optional[str] = None,
    start_time: Optional[datetime.datetime] = None,
    end_time: Optional[datetime.datetime] = None,
    sort_by: str = Query("event_timestamp"),
    sort_order: str = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_traffic_records(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        protocol=protocol,
        attack_type=attack_type,
        severity_level=severity_level,
        packet_type=packet_type,
        traffic_type=traffic_type,
        start_time=start_time,
        end_time=end_time,
        sort_by=sort_by,
        sort_order=sort_order
    )

@router.get("/export")
def export_traffic(
    search: Optional[str] = None,
    protocol: Optional[str] = None,
    attack_type: Optional[str] = None,
    severity_level: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    csv_data = export_traffic_csv(
        db=db,
        search=search,
        protocol=protocol,
        attack_type=attack_type,
        severity_level=severity_level
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=traffic_export.csv"}
    )

@router.get("/{traffic_id}", response_model=NetworkTrafficItem)
def get_traffic_detail(
    traffic_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    record = get_traffic_by_id(db, traffic_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traffic record not found."
        )
    return record
