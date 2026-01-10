-- Migration: Split deputados into 2-table architecture
-- Run this BEFORE running load_deputados.py
--
-- Usage:
--   psql $DATABASE_URL -f scripts/migrate_deputados_2table.sql

BEGIN;

-- Step 1: Drop old table (contains bio columns we're moving out)
DROP TABLE IF EXISTS deputados CASCADE;

-- Step 2: Create new deputados table (core data only)
CREATE TABLE deputados (
    id SERIAL PRIMARY KEY,
    dep_id INTEGER UNIQUE NOT NULL,
    dep_cad_id INTEGER,
    legislature VARCHAR(10) NOT NULL,
    name VARCHAR(200) NOT NULL,
    full_name VARCHAR(300),
    party VARCHAR(20),
    circulo_id INTEGER,
    circulo VARCHAR(100),
    situation VARCHAR(50),
    situation_start DATE,
    situation_end DATE,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create indexes for deputados
CREATE INDEX idx_deputados_party ON deputados(party);
CREATE INDEX idx_deputados_circulo ON deputados(circulo);
CREATE INDEX idx_deputados_legislature ON deputados(legislature);
CREATE INDEX idx_deputados_cad_id ON deputados(dep_cad_id);
CREATE INDEX idx_deputados_situation ON deputados(situation);
CREATE INDEX idx_deputados_name_fts ON deputados USING GIN(to_tsvector('portuguese', name));

-- Step 4: Create new deputados_bio table
CREATE TABLE IF NOT EXISTS deputados_bio (
    id SERIAL PRIMARY KEY,
    cad_id INTEGER UNIQUE NOT NULL,
    full_name VARCHAR(300),
    gender VARCHAR(1),
    birth_date DATE,
    profession VARCHAR(500),
    education VARCHAR(1000),
    published_works TEXT,
    awards TEXT,
    titles TEXT,
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Create indexes for deputados_bio
CREATE INDEX IF NOT EXISTS idx_deputados_bio_gender ON deputados_bio(gender);

-- Step 6: Add comments
COMMENT ON TABLE deputados IS 'Deputies from InformacaoBase - core identity and parliamentary status';
COMMENT ON TABLE deputados_bio IS 'Deputy biographical data from RegistoBiografico';
COMMENT ON COLUMN deputados.situation IS 'Parliamentary status: Efetivo, Efetivo Temporário, Efetivo Definitivo, Suspenso(Eleito), Suplente, etc.';

COMMIT;

-- After running this, run: python scripts/load_deputados.py
