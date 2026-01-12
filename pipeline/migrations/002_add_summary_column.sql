-- Migration: Add summary column to iniciativas table
-- Date: 2026-01-11
-- Purpose: Store extracted "Exposicao de Motivos" from PDF documents

-- Add summary column
ALTER TABLE iniciativas ADD COLUMN IF NOT EXISTS summary TEXT;

-- Add extraction timestamp for tracking
ALTER TABLE iniciativas ADD COLUMN IF NOT EXISTS summary_extracted_at TIMESTAMP;

-- Add full-text search index on summary (Portuguese language)
CREATE INDEX IF NOT EXISTS idx_ini_summary_fts
    ON iniciativas USING GIN(to_tsvector('portuguese', COALESCE(summary, '')));

-- Comment for documentation
COMMENT ON COLUMN iniciativas.summary IS 'Extracted "Exposicao de Motivos" from initiative PDF document';
COMMENT ON COLUMN iniciativas.summary_extracted_at IS 'Timestamp when summary was extracted from PDF';
