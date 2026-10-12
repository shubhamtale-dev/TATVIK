# TATVIK

> **AI-Powered Data Intelligence**  
> *Beyond Data. Discover the Truth.*

[![Status](https://img.shields.io/badge/phase-Part%204%20Complete-emerald.svg)](#development-roadmap)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Tailwind-blue)](frontend)
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%7C%20pandas%20%7C%20openpyxl-green)](backend)
[![Tests](https://img.shields.io/badge/tests-30%2F30%20pytest%20passing-success)](backend/tests)
[![License](https://img.shields.io/badge/license-unselected%20(proprietary)-lightgrey)](#license)

---

## 📌 Product Vision

**TATVIK** is an enterprise data quality and research verification platform engineered to help businesses, market research teams, and operations teams improve the reliability and integrity of their tabular business data.

Modern organizations make critical decisions based on spreadsheets (CSV and Excel) exported from CRMs, ERPs, scraped directories, and manual data-entry teams. In the real world, these files suffer from:
- Duplicate and near-duplicate records with transposed or conflicting characters
- Incomplete records, sentinel strings, and missing critical contextual fields
- Inconsistent date, currency, phone number, and address formats
- Logical contradictions across relational fields
- Unverifiable claims and unsupported factual assertions

**TATVIK** provides automated quality scanning, deterministic rule heuristics, conservative correction proposals, human-in-the-loop review and approval, immutable audit histories, and clean dataset exports.

---

## 🛡️ Part 4: Issue Review & Correction Approval

Part 4 builds a safe, human-in-the-loop review and approval workflow where users can inspect detected data-quality issues, review conservative proposed corrections side-by-side, approve or reject them individually or in bulk, and apply approved modifications to an active working copy.

### 1. Conservative Proposed Corrections
Corrections are generated only when the intended fix is unambiguous and conservative:
- **Leading / Trailing Whitespace**: Unstripped spaces are safely trimmed (`str.strip()`).
- **Repeated Whitespace**: Consecutive internal spaces/tabs are collapsed to a single space (`re.sub(r'[ \t]+', ' ', s)`).
- **Categorical Casing Standardization**: In columns with bounded cardinality, capitalization variants are harmonized to the column's dominant canonical form.

### 2. Strict Safeguards (No Fabricated Data)
- **Missing & Sentinel Values**: Never populated with fabricated or synthetic placeholder data. Marked as **Manual Review Required**.
- **Invalid Emails & Phones**: Syntax defects are surfaced with actionable guidance, but contact details are never guessed.
- **Duplicate Rows & Colliding Identifiers**: Retained for human entity resolution; records are not silently dropped.
- Non-auto-correctable issues cannot be approved without manual operator intervention.

### 3. Safe Modification Architecture
- **Immutable Source Preservation**: The raw uploaded file DataFrame is preserved in a pristine, unedited state (`original_df`).
- **Isolated Working Copy**: Approved modifications are applied solely to a separate in-memory copy (`working_df`).
- **Two-Stage Curation**:
  1. *Staging*: Users mark suggestions as `approved` or `rejected` individually or via bulk selection.
  2. *Application*: A confirmation modal validates and commits approved changes to `working_df`.
- **Double-Application Prevention**: Stale or previously applied suggestions are blocked from duplicate modification.
- **Audit Logging**: Every applied edit records the issue ID, row index, column name, original value, applied value, and ISO 8601 timestamp.

### 4. Review & Approval Backend API (`/api/review`)
- `POST /api/review/sessions`: Upload CSV/XLSX to initialize in-memory review session.
- `GET /api/review/sessions/{session_id}`: Fetch session details and suggestions with status, category, severity, and search filters.
- `POST /api/review/sessions/{session_id}/decide/{issue_id}`: Approve, reject, or reset a single suggestion.
- `POST /api/review/sessions/{session_id}/bulk-decide`: Bulk approve or reject a list of issue IDs.
- `POST /api/review/sessions/{session_id}/apply`: Apply all staged approved corrections to the working dataset copy.
- `GET /api/review/sessions/{session_id}/preview`: Fetch paginated working dataset preview rows and change statistics.
- `GET /api/review/sessions/{session_id}/changes`: Retrieve complete change log of applied modifications.

### 5. Interactive Review Interface (`/review`)
- **Metric Bar**: Dynamic counters for Total Issues, Pending Review, Approved (Staged), Rejected, Applied, and Auto-Correctable.
- **Side-by-Side Cards**: Original value vs. Proposed value comparison with distinct styling.
- **Bulk Action Toolbar**: Select all auto-correctable items, bulk approve, and bulk reject.
- **Confirmation Modal**: Explains safety guarantees and requires explicit user confirmation before applying changes.
- **Working Dataset Preview Modal**: Searchable, paginated data grid reflecting the working dataset with applied edits counter and change history tab.

---

## 🔍 Part 3: Data Quality Detection Engine

- **7 Deterministic Rules**: Exact duplicates, colliding identifier hashes, missing/whitespace-only/sentinel values, RFC 5322 email syntax, conservative 7-15 digit phone validation, untrimmed text, and empty rows/columns.
- **Bounded Quality Score (0.0–100.0)**: Transparent weighted penalty formula with letter grades (A &ge; 90, B &ge; 80, C &ge; 70, D/F < 70).
- **Endpoint**: `POST /api/datasets/analyze` returning full defect audit report and registering review sessions.

---

## 📤 Part 2: Real CSV/Excel Upload & Dataset Preview

- **Interactive File Uploader**: Drag-and-drop zone and file browser (`.csv`, `.xlsx`) with 10 MB limit.
- **In-Memory Parsing**: Powered by `pandas` (CSV) and `openpyxl` (XLSX) with automatic encoding recovery.
- **Dataset Preview Table**: Responsive virtualized data grid with pagination and instant cell search filtering.

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
│   │   │   ├── dashboard/        # WelcomeBanner, StatCard, DatasetsTable, QualityOverview
│   │   │   ├── datasets/         # FileUploader, DatasetPreviewTable
│   │   │   ├── quality/          # QualityReportView (Score card, issue filters, audit table)
│   │   │   ├── review/           # SuggestionCard, ApplyConfirmationModal, WorkingPreviewModal, ReviewWorkspace
│   │   │   ├── navigation/       # Sidebar, TopNav
│   │   │   └── ui/               # Badge, Button, Card, Modal, EmptyState
│   │   ├── layouts/              # AppLayout (Sidebar + TopNav + Main + Footer)
│   │   ├── lib/                  # api.ts (health, preview, analyze, review APIs), utils.ts
│   │   ├── pages/                # DashboardPage, DatasetsPage, DataQualityPage, ReviewPage, ResearchVerificationPage, AuditLogsPage, SettingsPage
│   │   ├── styles/               # globals.css (Tailwind base and utilities)
│   │   ├── types/                # TypeScript interfaces (DatasetPreviewData, QualityAnalysisResult, Review types)
│   │   ├── App.tsx               # Client-side routing with /review
│   │   └── main.tsx              # Application entrypoint
│   ├── package.json              # Node dependencies
│   ├── tailwind.config.js        # Design tokens
│   └── vite.config.ts            # Vite config with /api proxy
│
└── backend/                      # Python FastAPI Service
    ├── app/
    │   ├── api/
    │   │   ├── datasets.py       # POST /api/datasets/preview, POST /api/datasets/analyze
    │   │   ├── review.py         # Complete Review & Correction Approval REST endpoints
    │   │   └── health.py         # GET /api/health
    │   ├── core/                 # App configuration & CORS settings
    │   ├── schemas/              # Pydantic v2 schemas (dataset.py, quality.py, review.py, health.py)
    │   ├── services/             # parser.py, quality_engine.py, review_service.py (In-memory session manager)
    │   └── main.py               # FastAPI entrypoint with CORS & error handlers
    ├── tests/
    │   ├── test_datasets.py      # Automated tests for CSV/XLSX preview uploads and limits
    │   ├── test_quality_engine.py# Automated tests for duplicates, sentinel values, email/phone formats, scoring
    │   ├── test_review.py        # Automated tests for approvals, rejections, bulk actions, dataset immutability
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
| **Quality Engine** | Python / Heuristic Rules | 7 deterministic quality checks & bounded scoring formula |
| **Review Service** | In-Memory Session Manager | Isolated working copy, conservative suggestions & change logs |
| **Validation** | Pydantic v2 | Strict request/response schema modeling |
| **Testing** | Pytest 9.1+ / HTTPX | Automated endpoint test suite (30 passing tests) |

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

- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Preview Endpoint**: `POST http://localhost:8000/api/datasets/preview`
- **Quality Analysis**: `POST http://localhost:8000/api/datasets/analyze`
- **Review Sessions**: `POST http://localhost:8000/api/review/sessions`
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
- **Dataset Ingestion**: [http://localhost:3000/datasets](http://localhost:3000/datasets)
- **Data Quality Scanner**: [http://localhost:3000/quality](http://localhost:3000/quality)
- **Issue Review & Corrections**: [http://localhost:3000/review](http://localhost:3000/review)

---

## 🧪 Testing and Verification

### Run Backend Tests (30 Test Cases)
With the backend virtual environment active:
```bash
cd backend
pytest -v
```
*Tests cover: valid CSV/XLSX, Latin-1 encoding, multi-sheet workbooks, empty files, unsupported extensions, oversized files, corrupt files, preview limits, exact duplicate rows, sentinel values, email/phone formats, text casing heuristics, quality score bounds, suggestion approvals/rejections, applying only approved changes, preserving original dataset immutability, bulk decisions, invalid issue IDs, duplicate application prevention, and mixed data types.*

### Run Frontend Production Build
```bash
cd frontend
npm run build
```
*Executes `tsc` (strict TypeScript check) and `vite build` (optimized production assets).*

---

## 🗺️ 8-Phase Development Roadmap

- [x] **Phase 1: Production-Quality Foundation & Dashboard**
  - Architecture setup, executive visual design system, responsive shell.
  - Interactive Dashboard with sample metrics, datasets table, and defect breakdown.
  - Minimal FastAPI backend with `/api/health`, Pydantic schemas, and Pytest suite.
- [x] **Phase 2: Real CSV/Excel Upload & Dataset Preview**
  - Multipart upload endpoint `POST /api/datasets/preview` with 10MB size limit.
  - In-memory CSV and Excel parsing with encoding recovery and openpyxl engine.
  - Responsive preview data table with client-side pagination, cell search, and JSON export.
- [x] **Phase 3: Data Quality Heuristics Engine**
  - Deterministic duplicate scanner (exact rows & identifier collision hashes).
  - Missing and sentinel value scanner (`N/A`, `null`, `none`, whitespace-only).
  - RFC 5322 email syntax and conservative 7-15 digit phone validation.
  - Transparent bounded quality scoring formula (0.0 - 100.0) with letter grades.
- [x] **Phase 4: Issue Review & Correction Approval**
  - Conservative correction proposals (whitespace trimming, repeated space normalization, casing standardization).
  - Human-in-the-loop safeguards: no fabricated replacements for missing values, invalid contacts, or duplicates.
  - Dual-dataset architecture preserving original raw data while maintaining working copy.
  - Single and bulk approval/rejection workflows with confirmation modal.
  - Live working dataset preview and audit change log.
- [ ] **Phase 5: AI Research Verification & Evidence Grounding**
  - Semantic anomaly detection using LLM orchestration.
  - Evidence fetching against authoritative registries and external web citations.
  - Attribute-level confidence scoring and source snapshot archiving.
- [ ] **Phase 6: Interactive Diff Inspector & Extended Remediation Workspace**
  - Side-by-side data grid powered by virtualized TanStack Table.
  - Per-cell manual value override with live re-validation.
  - Batch remediation for high-confidence duplicate merges.
- [ ] **Phase 7: Persistence, Database Models & Immutable Audit Ledger**
  - PostgreSQL database integration with SQLAlchemy models and Alembic migrations.
  - Append-only audit trail tracking every human and AI decision.
- [ ] **Phase 8: Enterprise Export Pipelines, Integrations & Production Hardening**
  - Cleaned data export in CSV, formatted Excel, and Parquet.
  - Webhooks and scheduled automated audits.
  - SOC2 / GDPR compliance export package.

---

## 🔒 Known Limitations (Phase 4)

- Dataset review sessions are maintained strictly in-memory and will expire after server restarts or TTL expiration (PostgreSQL persistence planned for Phase 7).
- Manual in-cell value overriding for complex ambiguous errors will be introduced in Phase 6.
- External web research and LLM validation will be added in Phase 5.

---

## 📄 License

*All rights reserved.*  
An open-source license has not been selected for this repository at this time. The code and documentation within this project are proprietary and confidential.
