import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import Prediction, ModelVersion, SecurityAlert
from app.api.v1.schemas import PredictionRequest
from app.ml.registry import predict_threat
from app.services.audit_service import record_audit

def run_prediction_service(
    db: Session,
    req: PredictionRequest,
    actor_email: Optional[str] = None
) -> Dict[str, Any]:
    # Find active model version or fallback
    active_model = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
    if not active_model:
        active_model = db.query(ModelVersion).filter(ModelVersion.version == "attack-type-xgb-v1").first()
    
    version_str = active_model.version if active_model else "attack-type-xgb-v1"
    algorithm_str = active_model.algorithm if active_model else "XGBoost"

    features = {
        "source_ip": req.source_ip,
        "destination_ip": req.destination_ip,
        "source_port": req.source_port,
        "destination_port": req.destination_port,
        "protocol": req.protocol,
        "packet_length": req.packet_length,
        "packet_type": req.packet_type,
        "traffic_type": req.traffic_type,
        "network_segment": req.network_segment
    }

    pred_class, class_scores, anomaly_score, interpretation = predict_threat(
        features=features,
        active_version=version_str
    )

    pred = Prediction(
        traffic_id=req.traffic_id,
        model_version_id=active_model.id if active_model else None,
        predicted_class=pred_class,
        class_scores=class_scores,
        anomaly_score=anomaly_score,
        input_features=features,
        interpretation=interpretation,
        created_at=datetime.datetime.utcnow()
    )
    db.add(pred)
    db.commit()
    db.refresh(pred)

    # If severe or anomalous, trigger a reviewable alert linked to prediction
    if anomaly_score > 75.0 or class_scores.get(pred_class, 0.0) >= 0.70:
        alert = SecurityAlert(
            traffic_id=req.traffic_id,
            prediction_id=pred.id,
            rule_id="ML-INFERENCE-RISK-THRESHOLD",
            severity="High" if anomaly_score > 85 else "Medium",
            status="new",
            reason=f"Model {version_str} flagged record as {pred_class} (confidence: {class_scores.get(pred_class)*100:.1f}%, anomaly score: {anomaly_score})",
            created_at=datetime.datetime.utcnow()
        )
        db.add(alert)
        db.commit()

    record_audit(
        db,
        action="RUN_PREDICTION",
        actor_email=actor_email,
        entity_type="prediction",
        entity_id=str(pred.id),
        details={"predicted_class": pred_class, "version": version_str, "anomaly_score": anomaly_score}
    )

    return {
        "prediction_id": pred.id,
        "task": "attack_type_classification",
        "model_version": version_str,
        "algorithm": algorithm_str,
        "predicted_class": pred_class,
        "class_probabilities": class_scores,
        "anomaly_score": anomaly_score,
        "interpretation": interpretation,
        "created_at": pred.created_at
    }

def list_prediction_history(db: Session, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    query = db.query(Prediction).order_by(Prediction.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    formatted = []
    for p in items:
        formatted.append({
            "id": p.id,
            "traffic_id": p.traffic_id,
            "model_version_id": p.model_version_id,
            "model_name": p.model_version.name if p.model_version else "XGBoost Attack Classifier",
            "predicted_class": p.predicted_class,
            "class_scores": p.class_scores,
            "anomaly_score": p.anomaly_score,
            "input_features": p.input_features,
            "interpretation": p.interpretation,
            "created_at": p.created_at
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": formatted
    }
