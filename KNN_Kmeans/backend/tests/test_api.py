import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_health_endpoints():
    res = client.get("/api/v1/health/live")
    assert res.status_code == 200
    assert res.json()["alive"] is True

    res_ready = client.get("/api/v1/health/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["database_ready"] is True

def test_login_success_and_me():
    res = client.post("/api/v1/auth/login", json={
        "email": settings.SEED_ADMIN_EMAIL,
        "password": settings.SEED_ADMIN_PASSWORD
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "administrator"
    token = data["access_token"]

    # Test me endpoint
    headers = {"Authorization": f"Bearer {token}"}
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["email"] == settings.SEED_ADMIN_EMAIL

def test_login_invalid_credentials():
    res = client.post("/api/v1/auth/login", json={
        "email": "invalid@cybersecurity.local",
        "password": "wrongpassword"
    })
    assert res.status_code == 401

def test_dashboard_summary():
    # Login to get token
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SEED_ADMIN_EMAIL,
        "password": settings.SEED_ADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] > 0
    assert data["attack_events"] > 0

def test_traffic_explorer():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SEED_ADMIN_EMAIL,
        "password": settings.SEED_ADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/traffic?page=1&page_size=10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    assert len(data["items"]) == 10

def test_prediction_endpoint():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SEED_ADMIN_EMAIL,
        "password": settings.SEED_ADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    req_payload = {
        "source_ip": "192.0.2.10",
        "destination_ip": "198.51.100.20",
        "source_port": 52124,
        "destination_port": 443,
        "protocol": "TCP",
        "packet_length": 840,
        "packet_type": "Data",
        "traffic_type": "HTTP",
        "network_segment": "Segment A"
    }

    res = client.post("/api/v1/predictions", json=req_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_class"] in ["DDoS", "Malware", "Intrusion"]
    assert "class_probabilities" in data
    assert sum(data["class_probabilities"].values()) == pytest.approx(1.0, 0.05)

def test_model_evaluation_metrics():
    login_res = client.post("/api/v1/auth/login", json={
        "email": settings.SEED_ADMIN_EMAIL,
        "password": settings.SEED_ADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/models", headers=headers)
    assert res.status_code == 200
    models_list = res.json()
    assert len(models_list) >= 4
