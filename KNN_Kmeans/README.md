# CyberSecurity: AI-Powered Cyber Threat Analytics Dashboard

CyberSecurity is a production-grade administrative dashboard and intelligence platform for exploring network traffic records, analyzing potential cyber threats, classifying attack types, and managing security alerts.

Built strictly according to the Software Requirements Specification (SRS) in [docs/CyberSecurity.md](file:///docs/CyberSecurity.md).

---

## 🛡️ Key Features

- **Executive Analytics Dashboard:** KPI summary cards, interactive chronological time-series trends (Apache ECharts), attack distribution breakdowns, and priority triage previews.
- **Network Traffic Explorer:** Paginated, server-side filtered, and sorted event explorer across all 25 dataset attributes with a 25-column record inspector and formula-injection-safe CSV exports.
- **Threat Pattern Analytics:** High-resolution breakdown of transport protocols, targeted destination ports (HTTP, DNS, SSH, RDP), top source/destination endpoints, and network segment telemetry.
- **Prediction Lab (Inference):** Pre-decision feature inference engine returning multiclass probabilities (`DDoS`, `Malware`, `Intrusion`), Isolation Forest anomaly scores, conditional probability interpretation notices, and persisted history.
- **Security Alert Triage:** Full lifecycle triage queue (`new` -> `investigating` -> `resolved` / `dismissed`) with severity categorization, investigative review notes, and automatic audit tracing.
- **Model Evaluation & Comparison:** Benchmark comparison of 4 candidate models (**XGBoost Primary**, **Random Forest Baseline**, **Logistic Regression Linear**, and **Dummy Sanity**), complete with interactive confusion matrix heatmaps, per-class Precision/Recall/F1 metrics, and active serving switch.
- **Dataset Management & Profiling:** Batch CSV ingestion pipeline, SHA-256 checksum tracking, 25-column schema conformance verification, and missing value profiling.
- **Audit Trail & Role-Based Access:** Role-based authorization (`administrator` vs `analyst`) with immutable administrative action audit logging.

---

## 🏗️ Technology Stack

- **Backend:** FastAPI, Pydantic v2, SQLAlchemy, Alembic, Bcrypt, PyJWT
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Apache ECharts, Lucide Icons
- **Database:** PostgreSQL 16 (production/Docker) & SQLite (local development mode)
- **Deployment:** Docker & Docker Compose
- **Testing:** Pytest

---

## 🚀 Quickstart Guide

### Option 1: Run with Docker Compose (Recommended)

1. Clone or navigate to the repository directory:
   ```bash
   cd cyber_security
   ```

2. Start the entire stack with Docker Compose:
   ```bash
   docker compose up --build
   ```

3. Access the services:
   - **Frontend Dashboard:** [http://localhost](http://localhost) (or port configured in compose)
   - **Backend API & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Run Locally (Development Mode)

#### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run FastAPI backend server (uses SQLite out-of-the-box, seeds initial admin + records)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup

```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Default Credentials

The system seeds two initial accounts upon startup:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@cybersecurity.local` | `Admin@123456` | Full administrative access: import data, run predictions, update alerts, switch models, view audit trail. |
| **Analyst** | `analyst@cybersecurity.local` | `Analyst@123456` | Read-only access: inspect telemetry, dashboards, alerts, and model reports without mutation. |

*Quick-fill demo buttons are provided on the login page for convenience.*

---

## 🧪 Running Automated Tests

Run backend tests using Pytest:

```bash
python -m pytest backend/tests
```

All 7 test suites verify:
- System liveness and database/model readiness probes
- Admin login, JWT issuance, and authentication failure rejection
- Dashboard KPI calculation
- Paginated traffic querying and filtering
- Attack-type prediction inference and probability normalization
- Model evaluation metrics and candidate benchmarks

---

## 📂 Project Structure

```text
cyber_security/
├── README.md
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   ├── app/
│   │   ├── main.py            # Lifespan, CORS, API registration
│   │   ├── core/              # Config, Security, Auth tokens
│   │   ├── db/                # Models, Session, Engine
│   │   ├── services/          # Ingestion, Analytics, Alerts, Inference, Audit
│   │   ├── api/v1/            # Routes & Pydantic Schemas
│   │   └── ml/                # Model Registry & Inference Scoring
│   └── tests/                 # Pytest test suite
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── components/        # Navbar, Sidebar, EChartWrapper
│       ├── pages/             # 8 Main feature pages + Login
│       ├── services/          # Typed API Client
│       └── types/             # TypeScript interfaces
├── ml/
│   ├── src/                  # Preprocessing & Offline training scripts
│   ├── reports/              # Baseline comparison & Evaluation JSON
│   └── artifacts/            # Model registry storage
├── dataset/
│   ├── cybersecurity_attacks.csv  # 40,000 records dataset
│   └── README.md
└── docs/
    ├── CyberSecurity.md       # Full SRS & Technical Design
    ├── architecture.md        # Architecture & Flowcharts
    ├── api.md                 # REST API reference
    ├── data-dictionary.md     # 25 Columns Dictionary
    └── evaluation.md          # Benchmark Evaluation Report
```

---

## 📊 Dataset & AI Notice

Per project requirements, AI model training is currently skipped (`hiện tại không train AI`). The platform includes a pre-evaluated benchmark registry comparing XGBoost, Random Forest, Logistic Regression, and Dummy classifiers, as well as an active inference module with Isolation Forest anomaly scoring. Scripts for full offline model retraining are available under `ml/src/train.py`.
