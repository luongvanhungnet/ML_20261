# System Architecture & Technical Design

## 1. High-Level Architecture Overview

The **CyberSecurity Threat Analytics Platform** is a decoupled full-stack architecture designed for high-performance network security exploration, multi-class threat classification, and incident triage.

```mermaid
flowchart TB
    subgraph Frontend [Presentation Layer - Single Page Application]
        UI[React 19 + TypeScript + Tailwind CSS]
        Charts[Apache ECharts Visualizations]
        Client[Typed API Client with Bearer/Cookie Auth]
    end

    subgraph Backend [Application Layer - FastAPI]
        API[RESTful Endpoints /api/v1]
        AuthModule[Auth & Role Authorization (Argon2/Bcrypt + JWT)]
        Ingestion[Dataset Ingestion & Quality Profiling]
        TrafficService[Traffic Filtering, Sorting & Formula Escaping]
        AlertService[Security Alert Triage & Notes Workflow]
        InferenceEngine[Reproducible Threat Classifier & Isolation Forest]
        AuditService[Administrative Action Logging]
    end

    subgraph Storage [Data & Persistence Layer]
        PG[(PostgreSQL 16 / SQLite Engine)]
        TrafficTable[network_traffic (Partitioned/Indexed)]
        AlertsTable[security_alerts]
        PredsTable[predictions]
        ModelsTable[model_versions]
        AuditTable[audit_logs]
    end

    subgraph MLLifecycle [Offline Machine Learning Pipeline]
        CSV[cybersecurity_attacks.csv]
        Preprocess[ColumnTransformer / Scaler / OneHotEncoder]
        Candidates[Dummy, LogisticRegression, RandomForest, XGBoost]
        MetricsReports[Stratified 70/15/15 Evaluation & Confusion Matrices]
    end

    UI --> Client
    Client -->|HTTPS REST| API
    API --> AuthModule
    API --> Ingestion
    API --> TrafficService
    API --> AlertService
    API --> InferenceEngine
    API --> AuditService

    Ingestion --> PG
    TrafficService --> PG
    AlertService --> PG
    InferenceEngine --> PG
    AuditService --> PG

    CSV --> Preprocess --> Candidates --> MetricsReports --> ModelsTable
```

## 2. Key Modules & Data Flow

1. **Authentication & Authorization (`app/core/security.py`, `app/api/v1/deps.py`)**:
   - Implements password hashing via `bcrypt`.
   - Generates and verifies HMAC-SHA256 JWT access tokens.
   - Enforces Role-Based Access Control (RBAC): `administrator` vs. `analyst`.

2. **Dataset Ingestion (`app/services/dataset_service.py`)**:
   - Ingests 25-column CSV files.
   - Validates required fields and computes SHA-256 file checksums.
   - Performs batch insertion into `network_traffic` and profiles null rates and label distributions.

3. **Traffic Exploration & Safety (`app/services/traffic_service.py`)**:
   - Server-side multi-parameter filtering (protocol, attack type, severity, ports, date range).
   - Sanitizes CSV exports against Spreadsheet Formula Injection attacks (`=`, `+`, `-`, `@`).

4. **Inference & Threat Scoring (`app/ml/registry.py`)**:
   - Evaluates input features available strictly before security intervention.
   - Normalizes probabilities via Softmax over candidate attack classes: `[DDoS, Malware, Intrusion]`.
   - Estimates unsupervised anomaly scores using Isolation Forest metrics.
