-- ==============================================================================
-- TATVIK - Database Schema Migration & Row Level Security (RLS) (Part 6)
-- Target Database: PostgreSQL 15+ / Supabase PostgreSQL
-- ==============================================================================

-- 1. Create Datasets Table
CREATE TABLE IF NOT EXISTS public.datasets (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(16) NOT NULL,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    total_rows INTEGER NOT NULL DEFAULT 0,
    total_columns INTEGER NOT NULL DEFAULT 0,
    columns_json TEXT NOT NULL,
    quality_score DOUBLE PRECISION NULL,
    score_grade VARCHAR(8) NULL,
    scoring_formula_explanation TEXT NULL,
    storage_path VARCHAR(512) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON public.datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON public.datasets(created_at);

-- 2. Create Dataset Tabular Data Matrix Table (Compact 2D format)
CREATE TABLE IF NOT EXISTS public.dataset_data (
    id VARCHAR(64) PRIMARY KEY,
    dataset_id VARCHAR(64) NOT NULL UNIQUE REFERENCES public.datasets(id) ON DELETE CASCADE,
    original_data_json TEXT NOT NULL,
    working_data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dataset_data_dataset_id ON public.dataset_data(dataset_id);

-- 3. Create Quality Issues Table
CREATE TABLE IF NOT EXISTS public.quality_issues (
    id VARCHAR(64) PRIMARY KEY,
    dataset_id VARCHAR(64) NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    row_index INTEGER NULL,
    column_name VARCHAR(255) NULL,
    category VARCHAR(64) NOT NULL,
    issue_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    current_value TEXT NULL,
    proposed_value TEXT NULL,
    can_auto_correct BOOLEAN NOT NULL DEFAULT FALSE,
    explanation TEXT NOT NULL,
    suggested_action TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_quality_issues_dataset_id ON public.quality_issues(dataset_id);

-- 4. Create Correction Suggestions Table
CREATE TABLE IF NOT EXISTS public.correction_suggestions (
    id VARCHAR(64) PRIMARY KEY,
    dataset_id VARCHAR(64) NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    issue_id VARCHAR(64) NOT NULL,
    row_index INTEGER NULL,
    column_name VARCHAR(255) NULL,
    category VARCHAR(64) NOT NULL,
    issue_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    original_value TEXT NULL,
    proposed_value TEXT NULL,
    can_auto_correct BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT NOT NULL,
    suggested_action TEXT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_correction_suggestions_dataset_id ON public.correction_suggestions(dataset_id);

-- 5. Create Applied Corrections Audit Trail Table
CREATE TABLE IF NOT EXISTS public.applied_corrections (
    id VARCHAR(64) PRIMARY KEY,
    dataset_id VARCHAR(64) NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    issue_id VARCHAR(64) NOT NULL,
    row_index INTEGER NOT NULL,
    column_name VARCHAR(255) NOT NULL,
    original_value TEXT NULL,
    applied_value TEXT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_applied_corrections_dataset_id ON public.applied_corrections(dataset_id);

-- 6. Create Verification Results Table
CREATE TABLE IF NOT EXISTS public.verification_results (
    claim_id VARCHAR(64) PRIMARY KEY,
    dataset_id VARCHAR(64) NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    column_name VARCHAR(255) NOT NULL,
    context_column VARCHAR(255) NULL,
    claim_text TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    status_label VARCHAR(64) NOT NULL,
    confidence_score DOUBLE PRECISION NULL,
    evidence_summary TEXT NOT NULL,
    explanation TEXT NOT NULL,
    sources_json TEXT NOT NULL,
    retrieval_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    provider_name VARCHAR(32) NOT NULL,
    provider_warning TEXT NULL,
    manual_assessment VARCHAR(32) NULL,
    manual_notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_results_dataset_id ON public.verification_results(dataset_id);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- Datasets Table
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own datasets"
    ON public.datasets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own datasets"
    ON public.datasets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own datasets"
    ON public.datasets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own datasets"
    ON public.datasets FOR DELETE
    USING (auth.uid() = user_id);

-- Dataset Tabular Data Matrix Table
ALTER TABLE public.dataset_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own dataset data"
    ON public.dataset_data FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.datasets
        WHERE datasets.id = dataset_data.dataset_id
        AND datasets.user_id = auth.uid()
    ));

CREATE POLICY "Users can only insert their own dataset data"
    ON public.dataset_data FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.datasets
        WHERE datasets.id = dataset_data.dataset_id
        AND datasets.user_id = auth.uid()
    ));

CREATE POLICY "Users can only update their own dataset data"
    ON public.dataset_data FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.datasets
        WHERE datasets.id = dataset_data.dataset_id
        AND datasets.user_id = auth.uid()
    ));

CREATE POLICY "Users can only delete their own dataset data"
    ON public.dataset_data FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.datasets
        WHERE datasets.id = dataset_data.dataset_id
        AND datasets.user_id = auth.uid()
    ));

-- Quality Issues Table
ALTER TABLE public.quality_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own dataset issues"
    ON public.quality_issues FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.datasets
        WHERE datasets.id = quality_issues.dataset_id
        AND datasets.user_id = auth.uid()
    ));

CREATE POLICY "Users can only modify their own dataset issues"
    ON public.quality_issues FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.datasets
        WHERE datasets.id = quality_issues.dataset_id
        AND datasets.user_id = auth.uid()
    ));

-- Correction Suggestions Table
ALTER TABLE public.correction_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own correction suggestions"
    ON public.correction_suggestions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.datasets
        WHERE datasets.id = correction_suggestions.dataset_id
        AND datasets.user_id = auth.uid()
    ));

-- Applied Corrections Table
ALTER TABLE public.applied_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own applied corrections"
    ON public.applied_corrections FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.datasets
        WHERE datasets.id = applied_corrections.dataset_id
        AND datasets.user_id = auth.uid()
    ));

-- Verification Results Table
ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own verification results"
    ON public.verification_results FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.datasets
        WHERE datasets.id = verification_results.dataset_id
        AND datasets.user_id = auth.uid()
    ));
