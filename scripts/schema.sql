-- Viriato Database Schema - Phase 1
-- PostgreSQL schema for Portuguese Parliament data
-- Created: 2026-01-02

-- =============================================================================
-- TABLE 1: iniciativas (Legislative Initiatives)
-- =============================================================================

CREATE TABLE IF NOT EXISTS iniciativas (
    id SERIAL PRIMARY KEY,
    ini_id VARCHAR(20) UNIQUE NOT NULL,    -- IniId from API (e.g., "315506")
    legislature VARCHAR(10) NOT NULL,      -- "XVII"
    number VARCHAR(10),                     -- IniNr (e.g., "28")
    type VARCHAR(10) NOT NULL,              -- IniTipo: "P" (Proposta), "R" (Resolução), etc.
    type_description VARCHAR(100),          -- IniDescTipo (e.g., "Proposta de Lei")
    title TEXT NOT NULL,                    -- IniTitulo
    author_type VARCHAR(50),                -- "Government", "Deputy Group", etc.
    author_name VARCHAR(200),               -- Extracted from IniAutorOutros/IniAutorGruposParlamentares
    start_date DATE,                        -- DataInicioleg
    end_date DATE,                          -- DataFimleg
    current_status VARCHAR(100),            -- Latest phase name (denormalized)
    current_phase_code VARCHAR(10),         -- Latest phase code
    is_completed BOOLEAN DEFAULT FALSE,     -- Computed from phase
    text_link TEXT,                         -- IniLinkTexto (PDF link)
    raw_data JSONB,                         -- Full original JSON
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ini_type ON iniciativas(type);
CREATE INDEX IF NOT EXISTS idx_ini_status ON iniciativas(current_status);
CREATE INDEX IF NOT EXISTS idx_ini_dates ON iniciativas(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ini_completed ON iniciativas(is_completed);
CREATE INDEX IF NOT EXISTS idx_ini_legislature ON iniciativas(legislature);

-- Full-text search on title (Portuguese)
CREATE INDEX IF NOT EXISTS idx_ini_title_fts
    ON iniciativas USING GIN(to_tsvector('portuguese', title));

-- =============================================================================
-- TABLE 2: iniciativa_events (Legislative Initiative Lifecycle Events)
-- =============================================================================

CREATE TABLE IF NOT EXISTS iniciativa_events (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER NOT NULL REFERENCES iniciativas(id) ON DELETE CASCADE,
    evt_id VARCHAR(20),                     -- EvtId from API
    oev_id VARCHAR(20),                     -- OevId from API
    phase_code VARCHAR(10),                 -- CodigoFase (e.g., "10", "20")
    phase_name VARCHAR(200) NOT NULL,       -- Fase (e.g., "Entrada", "Votação na generalidade")
    event_date DATE,                        -- DataFase
    committee VARCHAR(200),                 -- Comissao
    observations TEXT,                      -- ObsFase
    order_index INTEGER NOT NULL,           -- Sequence within initiative (0, 1, 2...)
    raw_data JSONB,                         -- Full event JSON (nested structures)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_events_iniciativa
    ON iniciativa_events(iniciativa_id);
CREATE INDEX IF NOT EXISTS idx_events_phase
    ON iniciativa_events(phase_code);
CREATE INDEX IF NOT EXISTS idx_events_date
    ON iniciativa_events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_order
    ON iniciativa_events(iniciativa_id, order_index);

-- Unique constraint to prevent duplicate events
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_unique
    ON iniciativa_events(iniciativa_id, evt_id, oev_id);

-- =============================================================================
-- TABLE 3: agenda_events (Parliamentary Calendar)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agenda_events (
    id SERIAL PRIMARY KEY,
    event_id INTEGER UNIQUE NOT NULL,       -- Id from API
    legislature VARCHAR(10),                -- "XVII"
    title VARCHAR(500) NOT NULL,
    subtitle VARCHAR(500),
    section VARCHAR(200),                   -- "Comissões Parlamentares", "Plenário", etc.
    theme VARCHAR(200),
    location VARCHAR(200),                  -- "Sala 7", etc.
    start_date DATE NOT NULL,
    start_time TIME,
    end_date DATE,
    end_time TIME,
    is_all_day BOOLEAN DEFAULT FALSE,
    description TEXT,                       -- InternetText (HTML content)
    committee VARCHAR(200),                 -- OrgDes
    meeting_number VARCHAR(20),             -- ReuNumero
    session_number VARCHAR(20),             -- SelNumero
    raw_data JSONB,                         -- Full original JSON
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for calendar queries
CREATE INDEX IF NOT EXISTS idx_agenda_dates
    ON agenda_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_agenda_section
    ON agenda_events(section);
CREATE INDEX IF NOT EXISTS idx_agenda_committee
    ON agenda_events(committee);
CREATE INDEX IF NOT EXISTS idx_agenda_legislature
    ON agenda_events(legislature);

-- Full-text search on title (Portuguese)
CREATE INDEX IF NOT EXISTS idx_agenda_title_fts
    ON agenda_events USING GIN(to_tsvector('portuguese', title));

-- =============================================================================
-- TABLE 4: agenda_initiative_links (Junction table linking Agenda to Initiatives)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agenda_initiative_links (
    id SERIAL PRIMARY KEY,
    agenda_event_id INTEGER NOT NULL REFERENCES agenda_events(id) ON DELETE CASCADE,
    iniciativa_id INTEGER NOT NULL REFERENCES iniciativas(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL,         -- 'bid_direct', 'committee_date', 'text_reference'
    link_confidence DECIMAL(3,2),           -- 0.00 to 1.00 (1.00 = certain, 0.50 = probable, etc.)
    extracted_text TEXT,                    -- Evidence for the link (BID reference, matched text, etc.)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for link queries
CREATE INDEX IF NOT EXISTS idx_agenda_links_agenda
    ON agenda_initiative_links(agenda_event_id);
CREATE INDEX IF NOT EXISTS idx_agenda_links_iniciativa
    ON agenda_initiative_links(iniciativa_id);
CREATE INDEX IF NOT EXISTS idx_agenda_links_type
    ON agenda_initiative_links(link_type);
CREATE INDEX IF NOT EXISTS idx_agenda_links_confidence
    ON agenda_initiative_links(link_confidence);

-- Prevent duplicate links of same type
CREATE UNIQUE INDEX IF NOT EXISTS idx_agenda_links_unique
    ON agenda_initiative_links(agenda_event_id, iniciativa_id, link_type);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to update iniciativa's current_status based on latest event
CREATE OR REPLACE FUNCTION update_iniciativa_current_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE iniciativas i
    SET
        current_status = (
            SELECT phase_name
            FROM iniciativa_events
            WHERE iniciativa_id = NEW.iniciativa_id
            ORDER BY order_index DESC
            LIMIT 1
        ),
        current_phase_code = (
            SELECT phase_code
            FROM iniciativa_events
            WHERE iniciativa_id = NEW.iniciativa_id
            ORDER BY order_index DESC
            LIMIT 1
        ),
        is_completed = (
            SELECT phase_name IN (
                'Lei (Publicação DR)',
                'Resolução da AR (Publicação DR)',
                'Rejeitado',
                'Retirada da iniciativa',
                'Caducado'
            )
            FROM iniciativa_events
            WHERE iniciativa_id = NEW.iniciativa_id
            ORDER BY order_index DESC
            LIMIT 1
        ),
        updated_at = NOW()
    WHERE id = NEW.iniciativa_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update current_status when events are added
DROP TRIGGER IF EXISTS trigger_update_iniciativa_status ON iniciativa_events;
CREATE TRIGGER trigger_update_iniciativa_status
AFTER INSERT OR UPDATE ON iniciativa_events
FOR EACH ROW
EXECUTE FUNCTION update_iniciativa_current_status();

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE iniciativas IS 'Legislative initiatives (Iniciativas) from Portuguese Parliament';
COMMENT ON TABLE iniciativa_events IS 'Lifecycle events/phases for each legislative initiative';
COMMENT ON TABLE agenda_events IS 'Parliamentary calendar events (agenda)';
COMMENT ON TABLE agenda_initiative_links IS 'Links between agenda events and initiatives (extracted from HTML BID references and committee/date matching)';

COMMENT ON COLUMN iniciativas.ini_id IS 'Unique identifier from Parliament API';
COMMENT ON COLUMN iniciativas.type IS 'P=Proposta, R=Resolução, D=Deliberação, etc.';
COMMENT ON COLUMN iniciativas.current_status IS 'Latest phase name (denormalized for performance)';
COMMENT ON COLUMN iniciativas.is_completed IS 'True if initiative reached final state';

COMMENT ON COLUMN iniciativa_events.order_index IS 'Sequence number (0-based) for ordering events chronologically';
COMMENT ON COLUMN iniciativa_events.raw_data IS 'Full event JSON including nested structures (Votacao, Links, etc.)';

COMMENT ON COLUMN agenda_events.event_id IS 'Unique identifier from Parliament API';
COMMENT ON COLUMN agenda_events.description IS 'HTML content from InternetText field';
