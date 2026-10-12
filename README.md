# TATVIK

> **AI-Powered Data Intelligence**  
> *Beyond Data. Discover the Truth.*

[![Status](https://img.shields.io/badge/phase-Phase%201%20Complete-emerald.svg)](#development-roadmap)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Tailwind-blue)](frontend)
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%7C%20Python%203.11+-green)](backend)
[![Tests](https://img.shields.io/badge/tests-pytest%20passing-success)](backend/tests)
[![License](https://img.shields.io/badge/license-unselected%20(proprietary)-lightgrey)](#license)

---

## 📌 Product Vision

**TATVIK** is an enterprise data quality and research verification platform engineered to help businesses, market research teams, and operations teams improve the reliability and integrity of their tabular business data.

Modern organizations make critical decisions based on spreadsheets (CSV and Excel) exported from CRMs, ERPs, scraped directories, and manual data-entry teams. In the real world, these files suffer from:
- Duplicate and near-duplicate records with transposed or conflicting characters
- Incomplete records and missing critical contextual fields
- Inconsistent date, currency, phone number, and address formats
- Logical contradictions across relational fields
- Unverifiable claims and unsupported factual assertions

**TATVIK** provides automated quality scanning, semantic LLM-powered verification, verifiable external research citations, human-in-the-loop correction review, immutable audit histories, and clean dataset exports.

---

## 🧭 Phase 1 Scope: Production-Quality Foundation & Dashboard

Phase 1 establishes a modular, maintainable, and type-safe foundation for the 8-phase development roadmap:

1. **Design System & Visual Identity**:
   - Executive palette: Deep Navy (`#0B192C`), Muted Teal accent (`#0D9488`), Soft Neutral background (`#F8FAFC`), and subtle Warm Saffron (`#D97706`).
   - Reusable component library: Button, Card, Badge, Modal, EmptyState, StatCard.
   - Consistent typography, clear spacing, accessible contrast, and Lucide icons.

2. **Application Shell**:
   - Responsive Sidebar with active route indicators, mobile collapse drawer, live backend API status ping, and platform phase badge.
   - Top Navigation featuring breadcrumbs, disabled global search placeholder, notifications popover with empty state, and developer mode identity badge.

3. **Complete Dashboard Page (Interactive)**:
   - Welcome banner with product descriptor and primary "Upload Dataset" action.
   - 4 summary metrics cards with explicit sample data labeling.
   - Recent datasets table with format badges, record counts, and inspect actions.
   - Data quality breakdown with accessible progress indicators for 4 defect categories.
   - Illustrative recent activity audit feed.
   - Quick Actions workflow cards.
   - Reusable "Coming Soon" roadmap modal providing transparent feedback on upcoming capabilities.

4. **Dedicated Page Shells**:
   - **Datasets (`/datasets`)**: Supported file specifications (.csv, .xlsx, .xls) and informative empty state.
   - **Data Quality (`/quality`)**: Rule engine overview, 4 quality defect categories, and filterable sample issues.
   - **Research Verification (`/verification`)**: Conceptual evidence grounding architecture and sample verification ledger.
   - **Audit Logs (`/audit`)**: Immutable governance specification and honest empty state.
   - **Settings (`/settings`)**: Live FastAPI backend status checker, workspace metadata, and threshold configuration preview.

5. **FastAPI Backend Foundation**:
   - Minimal asynchronous FastAPI server with structured `/api/health` endpoint.
   - Configurable CORS middleware for local frontend origins.
   - Structured Pydantic v2 schemas (`HealthResponse`).
   - Automated test suite with `pytest` and `fastapi.testclient.TestClient`.

---

## 📁 Repository Structure

```text
tatvik/
├── .env.example                  # Root environment template
├── .gitignore                    # Production gitignore for React, Python, OS, & Datasets
├── README.md                     # Comprehensive project documentation
│
├── frontend/                     # React + TypeScript Client
│   ├── public/                   # Static public assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # ComingSoonModal, DemoDataNotice
│   │   │   ├── dashboard/        # WelcomeBanner, StatCard, DatasetsTable, QualityOverview, ActivityFeed, QuickActions
│   │   │   ├── navigation/       # Sidebar, TopNav
│   │   │   └── ui/               # Badge, Button, Card, Modal, EmptyState
│   │   ├── layouts/              # AppLayout (Sidebar + TopNav + Main + Footer)
│   │   ├── lib/                  # utils.ts (cn, formatters), api.ts (health checker)
│   │   ├── pages/                # DashboardPage, DatasetsPage, DataQualityPage, ResearchVerificationPage, AuditLogsPage, SettingsPage
│   │   ├── styles/               # globals.css (Tailwind base and utilities)
│   │   ├── types/                # TypeScript data interfaces & API contracts
│   │   ├── App.tsx               # React Router navigation tree
│   │   ├── main.tsx              # DOM entrypoint
│   │   └── vite-env.d.ts         # Vite client type definitions
│   ├── .env.example              # Frontend environment variables template
│   ├── index.html                # HTML template with Inter typography
│   ├── package.json              # Node dependencies (React 18, React Router 6, Lucide, Tailwind)
│   ├── postcss.config.js         # PostCSS configuration
│   ├── tailwind.config.js        # Brand color system & theme extension
│   ├── tsconfig.json             # Strict TypeScript compiler options
│   └── vite.config.ts            # Vite bundler with /api proxy to FastAPI backend
│
└── backend/                      # Python FastAPI Service
    ├── app/
    │   ├── api/                  # API routers (health.py)
    │   ├── core/                 # App configuration & CORS settings (config.py)
    │   ├── schemas/              # Pydantic v2 schemas (health.py)
    │   └── main.py               # FastAPI entrypoint with CORS & error handlers
    ├── tests/                    # Automated test suite
    │   └── test_health.py        # Pytest test cases for root & /api/health
    ├── .env.example              # Backend environment variables template
    └── requirements.txt          # Minimal Phase 1 dependencies (fastapi, uvicorn, pydantic, pytest, httpx)
```

---

## 💻 Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React | `^18.3.1` | Single-page UI component architecture |
| **Language** | TypeScript | `^5.6.3` | Strict static typing and contract safety |
| **Routing** | React Router | `^6.28.0` | Client-side navigation across app shells |
| **Styling** | Tailwind CSS | `^3.4.15` | Utility-first styling with custom brand tokens |
| **Icons** | Lucide React | `^0.378.0` | Modern, consistent iconography |
| **Bundler** | Vite | `^5.4.11` | Rapid hot-module-reloading and optimized build |
| **Backend** | FastAPI | `>=0.111.0` | Asynchronous high-performance REST API |
| **Validation**| Pydantic v2 | `>=2.7.0` | Strict data schema validation and settings |
| **Server** | Uvicorn | `>=0.30.0` | ASGI web server for Python |
| **Testing** | Pytest | `>=8.2.0` | Automated backend testing |

---

## 🛠️ Getting Started & Setup Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher ([Node.js](https://nodejs.org/))
- **Python**: v3.11 or higher ([Python](https://www.python.org/))
- **Git**: Installed and configured

---

### 1. Backend Setup & Local Server

In your terminal:

```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Copy environment template
cp .env.example .env

# Start the FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Health Check Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### 2. Frontend Setup & Development Server

In a second terminal window:

```bash
cd frontend

# Install dependencies
npm install

# (Optional) Copy environment template
cp .env.example .env

# Start the Vite development server
npm run dev
```

- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing and Build Verification

### Run Backend Tests
With your backend virtual environment activated:
```bash
cd backend
pytest -v
```
*Tests verify `GET /` metadata and `GET /api/health` response schema.*

### Run Frontend Type Check & Production Build
```bash
cd frontend
npm run build
```
*Executes `tsc` (strict TypeScript validation) and `vite build` (production assets bundling).*

---

## 🗺️ 8-Phase Development Roadmap

- [x] **Phase 1: Production-Quality Foundation & Dashboard**
  - Architecture setup, executive visual design system, responsive shell.
  - Interactive Dashboard with sample metrics, datasets table, and defect breakdown.
  - Dedicated page shells for Datasets, Quality, Research Verification, Audit Logs, and Settings.
  - Minimal FastAPI backend with `/api/health`, Pydantic schemas, and Pytest suite.
- [ ] **Phase 2: Streaming File Ingestion & Parser Pipeline**
  - Chunked streaming upload for CSV, TSV, XLSX, and XLS formats.
  - Automatic delimiter detection, character encoding inference, and schema mapping.
- [ ] **Phase 3: Data Quality Heuristics Engine**
  - Deterministic duplicate scanner with fuzzy Jaro-Winkler string similarity.
  - Regex format verification (ISO dates, E.164 phone numbers, RFC emails).
  - Cross-column chronological and logical consistency validators.
- [ ] **Phase 4: AI Research Verification & Evidence Grounding**
  - Semantic anomaly detection using LLM orchestration.
  - Evidence fetching against authoritative registries and external web citations.
  - Attribute-level confidence scoring and source snapshot archiving.
- [ ] **Phase 5: Interactive Review Workspace & Diff Inspector**
  - Side-by-side data grid powered by virtualized TanStack Table.
  - Per-cell accept, edit, or reject review workflow.
  - Batch remediation for high-confidence duplicate merges.
- [ ] **Phase 6: Persistence, Database Models & Immutable Audit Ledger**
  - PostgreSQL database integration with SQLAlchemy models and Alembic migrations.
  - Append-only audit trail tracking every human and AI decision.
- [ ] **Phase 7: User Authentication & Multi-Tenant Organizations**
  - Role-based access control (Admin, Reviewer, Viewer).
  - Organization workspace isolation.
- [ ] **Phase 8: Enterprise Export Pipelines, Integrations & Production Hardening**
  - Cleaned data export in CSV, formatted Excel, and Parquet.
  - Webhooks and scheduled automated audits.
  - SOC2 / GDPR compliance export package.

---

## 🔒 Known Limitations (Phase 1)

As strictly scoped for Phase 1:
- File uploads are not yet processed; clicking "Upload Dataset" opens an informative roadmap modal detailing Phase 2 streaming ingestion.
- Displayed numbers and dataset tables on the Dashboard are illustrative demo samples.
- The global search bar is disabled with a visible tooltip.
- Settings modifications cannot be saved until database persistence is introduced in Phase 6.
- No real third-party AI models or external search APIs are invoked.

---

## 📄 License

*All rights reserved.*  
An open-source license has not been selected for this repository at this time. The code and documentation within this project are proprietary and confidential.
