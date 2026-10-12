# TATVIK

> **AI-Powered Data Intelligence**  
> *Beyond Data. Discover the Truth.*

[![Status](https://img.shields.io/badge/phase-Phase%203%20Complete-emerald.svg)](#development-roadmap)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Tailwind-blue)](frontend)
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%7C%20pandas%20%7C%20openpyxl-green)](backend)
[![Tests](https://img.shields.io/badge/tests-19%2F19%20pytest%20passing-success)](backend/tests)
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

**TATVIK** provides automated quality scanning, deterministic rule heuristics, semantic verification, verifiable external research citations, human-in-the-loop correction review, immutable audit histories, and clean dataset exports.

---

## 🔍 Part 3: Data Quality Detection Engine

Part 3 implements an in-memory, rule-based data quality engine and interactive reporting UI that processes actual uploaded CSV and XLSX datasets without mock results or data fabrication.

### 1. Deterministic Rule-Based Checks
The engine analyzes raw cell values across 7 deterministic heuristics:

1. **Exact Duplicate Rows**: Detects identical records appearing multiple times in the dataset.
2. **Duplicate Identifier Values**: Classifies identifier columns (`email`, `phone`, `id`, `uuid`, `ssn`) and detects collisions across records while ignoring empty or sentinel values.
3. **Missing & Sentinel Values**: Detects nulls, blanks, whitespace-only cells, and standard sentinel strings (`N/A`, `NA`, `null`, `none`, `-`, `?`, `nan`).
4. **Invalid Email Formats**: Classifies email candidate columns case-insensitively and validates values against standard RFC 5322 syntax.
5. **Invalid Phone Formats**: Classifies phone/mobile columns and applies a conservative international phone validator (extracts digits after stripping standard separators `+`, `-`, `(`, `)`, `.`, spaces; flags values with fewer than 7 or more than 15 digits).
6. **Inconsistent Text Values**: Surfaces unstripped leading/trailing whitespaces and casing discrepancies (e.g. `engineering` vs `Engineering`) as actionable suggestions without mutating source data.
7. **Empty Rows & Columns**: Flags completely blank structural rows and empty columns that skew analytics.

### 2. Transparent, Explainable Quality Score Formula
The overall dataset quality score is strictly bounded between **0.0** and **100.0**:

$$\text{Defect Rate} = \frac{(3.0 \times \text{High}) + (1.5 \times \text{Medium}) + (0.5 \times \text{Low}) + (0.1 \times \text{Info})}{\max(\text{Total Cells}, 1)}$$

$$\text{Quality Score} = \text{round}\left(\max\left(0.0, 100.0 \times (1.0 - \min(1.0, \text{Defect Rate}))\right), 1\right)$$

- **Grade A**: 90.0% – 100.0% (Clean dataset, production-ready)
- **Grade B**: 80.0% – 89.9% (Minor non-critical defects)
- **Grade C**: 70.0% – 79.9% (Noticeable formatting or missing field issues)
- **Grade D / F**: Below 70.0% (Severe duplicates or missing identifier integrity)

### 3. API Specification: `POST /api/datasets/analyze`
- Accepts `multipart/form-data` with file upload (`.csv` or `.xlsx`).
- Accepts query parameter `max_issues` (default: 500, max: 2000) for UI performance on large files.
- Returns comprehensive JSON:
  - `filename`, `total_rows`, `total_columns`, `total_cells`, `evaluated_cells`
  - `quality_score`, `letter_grade`, `score_explanation`, `scoring_formula`
  - `total_issues`, `issues_by_category`, `issues_by_severity`
  - `issues`: list of `QualityIssue` items with row index, column name, issue type, category, severity, explanation, current value, and suggested action.

### 4. Interactive Quality Report UI
- **Dual Ingestion Paths**:
  - Upload on `/datasets` &rarr; Preview raw spreadsheet &rarr; One-click **Analyze Quality**.
  - Upload directly on `/quality` &rarr; Instant full audit report.
- **Audit Dashboard**:
  - Dynamic score card with color-coded grade and interactive formula breakdown modal.
  - Category metric cards (Duplicates, Missing Values, Invalid Formats, Inconsistent Values).
  - Severity badge filter pills (High, Medium, Low, Info) and category dropdowns.
  - Live search input across column names, explanations, and cell values.
  - Paginated issue findings table with expandable row details.
  - **Export Audit Report (JSON)** to download findings.

---

## 📤 Part 2: Real CSV/Excel Upload & Dataset Preview

Part 2 delivers an in-memory data ingestion pipeline connecting the React/TypeScript frontend directly to the FastAPI backend:

- **Interactive File Uploader**: Drag-and-drop zone and file browser (`.csv`, `.xlsx`) with 10 MB limit.
- **In-Memory Parsing**: Powered by `pandas` (CSV) and `openpyxl` (XLSX).
- **Encoding Recovery**: Resilient CSV decoding supporting UTF-8, UTF-8-SIG, Latin-1, and Windows-1252.
- **Excel Workbook Support**: Previews the primary worksheet with multi-sheet detection notices.
- **Safe JSON Serialization**: Converts `NaN`, `Inf`, and Python timestamps into valid JSON values.
- **Dataset Preview Table**: Responsive virtualized data grid with pagination (10, 25, 50 rows per page) and instant cell search filtering.

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
│   │   │   ├── navigation/       # Sidebar, TopNav
│   │   │   └── ui/               # Badge, Button, Card, Modal, EmptyState
│   │   ├── layouts/              # AppLayout (Sidebar + TopNav + Main + Footer)
│   │   ├── lib/                  # api.ts (health, preview, analyze), utils.ts (formatters, cn)
│   │   ├── pages/                # DashboardPage, DatasetsPage, DataQualityPage, ResearchVerificationPage, AuditLogsPage, SettingsPage
│   │   ├── styles/               # globals.css (Tailwind base and utilities)
│   │   ├── types/                # TypeScript interfaces (DatasetPreviewData, QualityAnalysisResult)
│   │   ├── App.tsx               # Client-side routing
│   │   └── main.tsx              # Application entrypoint
│   ├── package.json              # Node dependencies
│   ├── tailwind.config.js        # Design tokens
│   └── vite.config.ts            # Vite config with /api proxy
│
└── backend/                      # Python FastAPI Service
    ├── app/
    │   ├── api/
    │   │   ├── datasets.py       # POST /api/datasets/preview, POST /api/datasets/analyze
    │   │   └── health.py         # GET /api/health
    │   ├── core/                 # App configuration & CORS settings
    │   ├── schemas/              # Pydantic v2 schemas (dataset.py, quality.py, health.py)
    │   ├── services/             # parser.py, quality_engine.py (7 deterministic rules + scoring)
    │   └── main.py               # FastAPI entrypoint with CORS & error handlers
    ├── tests/
    │   ├── test_datasets.py      # Automated tests for CSV/XLSX preview uploads and limits
    │   ├── test_quality_engine.py# Automated tests for duplicates, sentinel values, email/phone formats, scoring
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
| **Validation** | Pydantic v2 | Strict request/response schema modeling |
| **Testing** | Pytest 9.1+ / HTTPX | Automated endpoint test suite (19 passing tests) |

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
- **Quality Analysis Endpoint**: `POST http://localhost:8000/api/datasets/analyze`
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
- **Dataset Ingestion & Quality View**: [http://localhost:3000/datasets](http://localhost:3000/datasets)
- **Data Quality Scanner**: [http://localhost:3000/quality](http://localhost:3000/quality)

---

## 🧪 Testing and Verification

### Run Backend Tests (19 Test Cases)
With the backend virtual environment active:
```bash
cd backend
pytest -v
```
*Tests cover: valid CSV, valid XLSX, Latin-1 encoding, multi-sheet workbooks, empty files, unsupported extensions, oversized files (>10MB), corrupt files, preview limit parameters, exact duplicate rows, sentinel/whitespace values, email formatting, phone validation, inconsistent text/casing, missing header edge cases, and quality score bounds (0.0 to 100.0).*

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
  - Dedicated page shells for Datasets, Quality, Research Verification, Audit Logs, and Settings.
  - Minimal FastAPI backend with `/api/health`, Pydantic schemas, and Pytest suite.
- [x] **Phase 2: Real CSV/Excel Upload & Dataset Preview**
  - Multipart upload endpoint `POST /api/datasets/preview` with 10MB size limit.
  - In-memory CSV and Excel parsing with encoding recovery and openpyxl engine.
  - Drag-and-drop file upload zone, client-side pre-validations, and error alerts.
  - Responsive preview data table with client-side pagination, cell search, and JSON export.
- [x] **Phase 3: Data Quality Heuristics Engine**
  - Deterministic duplicate scanner (exact rows & identifier collision hashes).
  - Missing and sentinel value scanner (`N/A`, `null`, `none`, whitespace-only).
  - RFC 5322 email syntax and conservative 7-15 digit phone validation.
  - Inconsistent text and casing discrepancy suggestions.
  - Transparent bounded quality scoring formula (0.0 - 100.0) with letter grades.
  - Integrated audit report UI with severity filters, search, and JSON export.
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

## 🔒 Known Limitations (Phase 3)

- Uploaded files are processed strictly in-memory and are not persisted in a database (persistence planned for Phase 6).
- When an Excel file contains multiple worksheets, the primary worksheet is previewed and analyzed; multi-sheet switching will be added in subsequent phases.
- LLM-powered semantic verification and external web research will be introduced in Phase 4.

---

## 📄 License

*All rights reserved.*  
An open-source license has not been selected for this repository at this time. The code and documentation within this project are proprietary and confidential.
