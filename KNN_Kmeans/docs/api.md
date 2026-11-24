# REST API Specification

**Base URL:** `/api/v1`  
**Authentication:** Bearer JWT in `Authorization` header or HTTP-only cookie `access_token`.

## Authentication Endpoints
- `POST /auth/login`: Authenticate with email & password. Returns JWT token and user info.
- `POST /auth/logout`: Invalidate session and delete cookie.
- `GET /auth/me`: Get current authenticated user details and role.

## Dataset & Ingestion Endpoints
- `POST /datasets/import`: Upload CSV dataset file with 25 required schema columns (Administrator only).
- `GET /datasets/imports`: List historical import jobs, row counts, and status.
- `GET /datasets/quality`: Automated data profiling report (null rates, class distribution, time span).

## Traffic Explorer Endpoints
- `GET /traffic`: Paginated list of network records with filtering by `protocol`, `attack_type`, `severity_level`, `search`, and sorting.
- `GET /traffic/{id}`: Full 25-field record detail.
- `GET /traffic/export`: Export filtered traffic to formula-injection-safe CSV.

## Analytics & Dashboard Endpoints
- `GET /dashboard/summary`: KPI aggregates (total records, attack events, active alerts, high-severity events).
- `GET /dashboard/timeseries`: Monthly/chronological event counts segmented by attack category.
- `GET /dashboard/attack-types`: Attack class percentages.
- `GET /dashboard/network`: Top source/destination IPs, ports, protocols, and segments.

## Prediction Endpoints
- `POST /predictions`: Execute attack-type classification inference.
  - **Body:** `{ "source_port": 52124, "destination_port": 443, "protocol": "TCP", "packet_length": 840, ... }`
  - **Returns:** `{ "predicted_class": "...", "class_probabilities": { ... }, "anomaly_score": ... }`
- `GET /predictions`: Historical prediction records.

## Security Alerts Endpoints
- `GET /alerts`: List and filter triage alerts by status (`new`, `investigating`, `resolved`, `dismissed`) and severity.
- `GET /alerts/{id}`: Detailed alert view.
- `PATCH /alerts/{id}`: Update alert status and investigative review notes (Administrator only).

## Model Evaluation Endpoints
- `GET /models`: List candidate model versions and active status.
- `GET /models/{id}/metrics`: Confusion matrix, macro-F1, per-class metrics, and split provenance.
- `POST /models/{id}/activate`: Switch active serving model (Administrator only).

## Audit Trail Endpoints
- `GET /audit-logs`: Administrator activity audit trace.

## Health Probes
- `GET /health/live`: Service process liveness.
- `GET /health/ready`: Database and active model readiness check.
