# TATVIK

> **AI-Powered Data Intelligence**  
> *Beyond Data. Discover the Truth.*

[![Status](https://img.shields.io/badge/phase-Phase%202%20Complete-emerald.svg)](#development-roadmap)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Tailwind-blue)](frontend)
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%7C%20pandas%20%7C%20openpyxl-green)](backend)
[![Tests](https://img.shields.io/badge/tests-11%2F11%20pytest%20passing-success)](backend/tests)
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

## 📤 Part 2: Real CSV/Excel Upload & Dataset Preview

Part 2 delivers a working, in-memory data ingestion pipeline connecting the React/TypeScript frontend directly to the FastAPI backend:

### Key Capabilities
1. **Interactive File Uploader**:
   - Polished drag-and-drop zone and file browser (`.csv`, `.xlsx`).
   - Client-side pre-validation for file extensions and size constraints (10 MB limit).
   - Real-time loading indicator and dismissible error alerts.
2. **Backend Processing Engine**:
   - Multipart file upload endpoint at `POST /api/datasets/preview`.
   - In-memory parsing via `pandas` (CSV) and `openpyxl` (XLSX).
   - Resilient CSV decoding supporting UTF-8, UTF-8-SIG, Latin-1, and Windows-1252.
   - Excel workbook support previewing the primary worksheet with multi-sheet detection notices.
   - Safe JSON serialization converting `NaN`, `Inf`, and Python timestamps into valid JSON values.
3. **Dataset Preview Table**:
   - Responsive, virtualized data grid with pagination (10, 25, 50 rows per page).
   - Total row count, column count, and column headers.
   - Instant client-side search filtering across preview cells.
   - "Export JSON" and "Upload Another Dataset" workflows.
4. **Security & Data Privacy**:
   - Strict 10 MB file size limit enforced on server (`413 Content Too Large`).
   - Formula codes and macros are never executed (`data_only=True`).
   - Zero database persistence in this phase; files are processed in-memory and discarded.
   - Zero sensitive cell logging.

---

## 📁 Repository Structure

```text
tatvik/
├── .env.example                  # Root environment template
├── .gitignore                    # Production gitignore (React, Python, OS, & Datasets)
├── README.md                     # Comprehensive project documentation
│
├── data/                         # Sample datasets for local testing (git-ignored)
│   ├── sample_customers.csv      # Sample CSV test dataset (8 rows, 8 columns)
│   └── sample_vendors.xlsx       # Sample Excel test workbook (5 rows, 6 columns)
│
├── frontend/                     # React + TypeScript Client
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/           # ComingSoonModal, DemoDataNotice
│   │   │   ├── dashboard/        # WelcomeBanner, StatCard, DatasetsTable, QualityOverview, ActivityFeed, QuickActions
│   │   │   ├── datasets/         # FileUploader, DatasetPreviewTable
│   │   │   ├── navigation/       # Sidebar, TopNav
│   │   │   └── ui/               # Badge, Button, Card, Modal, EmptyState
│   │   ├── layouts/              # AppLayout (Sidebar + TopNav + Main + Footer)
│   │   ├── lib/                  # api.ts (health + upload), utils.ts (formatters, cn)
│   │   ├── pages/                # DashboardPage, DatasetsPage, DataQualityPage, ResearchVerificationPage, AuditLogsPage, SettingsPage
│   │   ├── styles/               # globals.css (Tailwind base and utilities)
│   │   ├── types/                # TypeScript interfaces (DatasetPreviewData, etc.)
│   │   ├── App.tsx               # Client-side routing
│   │   └── main.tsx              # Application entrypoint
│   ├── package.json              # Node dependencies
│   ├── tailwind.config.js        # Design tokens
│   └── vite.config.ts            # Vite config with /api proxy
│
└── backend/                      # Python FastAPI Service
    ├── app/
    │   ├── api/
    │   │   ├── datasets.py       # POST /api/datasets/preview
    │   │   └── health.py         # GET /api/health
    │   ├── core/                 # App configuration & CORS settings
    │   ├── schemas/              # Pydantic v2 schemas (dataset.py, health.py)
    │   ├── services/             # In-memory parser service (parser.py)
    │   └── main.py               # FastAPI entrypoint with CORS & error handlers
    ├── tests/
    │   ├── test_datasets.py      # Automated tests for CSV/XLSX uploads, errors, and limits
    │   └── test_health.py        # Automated tests for service health
    ├── .env.example              # Backend environment variables template
    └── requirements.txt          # Python dependencies (fastapi, pandas, openpyxl, etc.)
```

---

## 💻 Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript + Vite | Type-safe single page application |
| **Styling** | Tailwind CSS + Lucide React | Executive UI design system & iconography |
| **Backend** | Python 3.11+ / FastAPI | Asynchronous REST API service |
| **Data Parsing** | Pandas 3.0+ / Openpyxl 3.1+ | In-memory CSV and Excel spreadsheet ingestion |
| **Validation** | Pydantic v2 | Strict request/response schema modeling |
| **Testing** | Pytest 9.1+ / HTTPX | Automated endpoint test suite |

---

## 🛠️ Getting Started & Setup Instructions

### 1. Backend Setup & Local Server

In your terminal:

```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Health Check Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Preview Endpoint**: `POST http://localhost:8000/api/datasets/preview`
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend Setup & Development Server

In a second terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Dataset Ingestion View**: [http://localhost:3000/datasets](http://localhost:3000/datasets)

---

## 🧪 Testing and Verification

### Run Backend Tests (11 Test Cases)
With the backend virtual environment active:
```bash
cd backend
pytest -v
```
*Tests cover: valid CSV, valid XLSX, Latin-1 encoding, multi-sheet workbooks, empty files, unsupported extensions, oversized files (>10MB), corrupt files, and preview limit parameters.*

### Run Frontend Production Build
```bash
cd frontend
npm run build
```
*Executes `tsc` (strict TypeScript check) and `vite build` (optimized production assets).*

---

## 🔍 How to Test CSV and XLSX Uploads Manually

1. Start both backend and frontend servers as described above.
2. Open [http://localhost:3000/datasets](http://localhost:3000/datasets) in your browser.
3. **Test CSV Upload**:
   - Drag and drop `tatvik/data/sample_customers.csv` or click **Browse Files** to select it.
   - Click **Upload & Generate Preview**.
   - Observe the metadata cards (Format: CSV, 8 Rows, 8 Columns, Parsed).
   - Test table pagination, row search filter, and the **Export JSON** button.
4. **Test XLSX Upload**:
   - Click **Upload Another** to reset the view.
   - Upload `tatvik/data/sample_vendors.xlsx`.
   - Observe the parsed Excel data grid, sheet badge (`Vendors`), and row counts.
5. **Test Error Handling**:
   - Attempt to upload an invalid file type (e.g. `.txt`, `.pdf`) or empty file.
   - Verify the clean error alert displays without crashing the application.

---

## 🗺️ 8-Phase Development Roadmap

- [x] **Phase 1: Production-Quality Foundation & Dashboard**
  - Architecture setup, executive visual design system, responsive shell.
  - Interactive Dashboard with sample metrics, datasets table, and defect breakdown.
  - Dedicated page shells for Datasets, Quality, Research Verification, Audit Logs, and Settings.
  - Minimal FastAPI backend with `/api/health`, Pydantic schemas, and Pytest suite.
- [x] **Phase 2: Real CSV/Excel Upload & Dataset Preview**
  - Multipart upload endpoint `POST /api/datasets/preview` with 10MB size limit.
  - In-memory CSV and Excel parsing with encoding recovery and openpyxl engine.
  - Drag-and-drop file upload zone, client-side pre-validations, and error alerts.
  - Responsive preview data table with client-side pagination, cell search, and JSON export.
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

## 🔒 Known Limitations (Phase 2)

- Uploaded files are processed strictly in-memory and are not persisted in a database (persistence planned for Phase 6).
- When an Excel file contains multiple worksheets, the primary worksheet is previewed; multi-sheet switching will be added in subsequent phases.
- Data anomaly detection and duplicate highlighting will be connected in Phase 3.

---

## 📄 License

*All rights reserved.*  
An open-source license has not been selected for this repository at this time. The code and documentation within this project are proprietary and confidential.
