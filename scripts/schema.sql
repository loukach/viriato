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

-- =============================================================================
-- TABLE 5: orgaos (Parliamentary Bodies - Committees, Working Groups, etc.)
-- =============================================================================

CREATE TABLE IF NOT EXISTS orgaos (
    id SERIAL PRIMARY KEY,
    org_id INTEGER UNIQUE NOT NULL,           -- idOrgao from API
    legislature VARCHAR(10) NOT NULL,          -- "XVII"
    name VARCHAR(300) NOT NULL,                -- nomeSigla (full name)
    acronym VARCHAR(50),                       -- siglaOrgao (e.g., "CACDLG")
    org_type VARCHAR(50) NOT NULL,             -- 'comissao', 'grupo_trabalho', 'subcomissao', etc.
    number INTEGER,                            -- numeroOrgao
    raw_data JSONB,                            -- Full original JSON
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for orgao queries
CREATE INDEX IF NOT EXISTS idx_orgaos_legislature ON orgaos(legislature);
CREATE INDEX IF NOT EXISTS idx_orgaos_type ON orgaos(org_type);
CREATE INDEX IF NOT EXISTS idx_orgaos_name ON orgaos(name);

-- Full-text search on name (Portuguese)
CREATE INDEX IF NOT EXISTS idx_orgaos_name_fts
    ON orgaos USING GIN(to_tsvector('portuguese', name));

-- =============================================================================
-- TABLE 6: orgao_membros (Committee Members with Party Affiliation)
-- =============================================================================

CREATE TABLE IF NOT EXISTS orgao_membros (
    id SERIAL PRIMARY KEY,
    orgao_id INTEGER NOT NULL REFERENCES orgaos(id) ON DELETE CASCADE,
    dep_id INTEGER NOT NULL,                   -- depId from API
    dep_cad_id INTEGER,                        -- depCadId (links to biographical registry)
    deputy_name VARCHAR(200) NOT NULL,         -- depNomeParlamentar
    party VARCHAR(20),                         -- gpSigla (e.g., "PS", "PSD", "CH")
    role VARCHAR(100),                         -- depCargo (e.g., "Presidente", "Vice-Presidente")
    member_type VARCHAR(50),                   -- sioTipMem (e.g., "Efetivo", "Suplente")
    start_date DATE,                           -- gpDtInicio or sioDtInicio
    end_date DATE,                             -- gpDtFim or sioDtFim
    raw_data JSONB,                            -- Full member JSON
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for member queries
CREATE INDEX IF NOT EXISTS idx_orgao_membros_orgao ON orgao_membros(orgao_id);
CREATE INDEX IF NOT EXISTS idx_orgao_membros_party ON orgao_membros(party);
CREATE INDEX IF NOT EXISTS idx_orgao_membros_deputy ON orgao_membros(dep_id);
CREATE INDEX IF NOT EXISTS idx_orgao_membros_role ON orgao_membros(role);

-- Unique constraint to prevent duplicate members
CREATE UNIQUE INDEX IF NOT EXISTS idx_orgao_membros_unique
    ON orgao_membros(orgao_id, dep_id);

-- =============================================================================
-- COMMENTS FOR ORGAOS
-- =============================================================================

COMMENT ON TABLE orgaos IS 'Parliamentary bodies: committees, working groups, subcommittees';
COMMENT ON TABLE orgao_membros IS 'Members of parliamentary bodies with party affiliation';

COMMENT ON COLUMN orgaos.org_type IS 'Type: comissao, grupo_trabalho, subcomissao, comissao_permanente, etc.';
COMMENT ON COLUMN orgao_membros.party IS 'Parliamentary group acronym (PS, PSD, CH, IL, etc.)';
COMMENT ON COLUMN orgao_membros.member_type IS 'Efetivo (full member) or Suplente (substitute)';

-- =============================================================================
-- TABLE 7: iniciativa_comissao (Committee-Initiative Relationships)
-- =============================================================================

CREATE TABLE IF NOT EXISTS iniciativa_comissao (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER NOT NULL REFERENCES iniciativas(id) ON DELETE CASCADE,
    orgao_id INTEGER REFERENCES orgaos(id),          -- NULL if committee not in orgaos table

    -- Committee identification (from API)
    committee_name VARCHAR(200) NOT NULL,            -- Nome (trimmed)
    committee_api_id VARCHAR(20),                    -- IdComissao

    -- Link type and role
    link_type VARCHAR(20) NOT NULL,                  -- 'author', 'lead', 'secondary'

    -- Phase/workflow context
    phase_code VARCHAR(10),                          -- CodigoFase (180, 181, 240, 270, 348)
    phase_name VARCHAR(200),                         -- Fase description

    -- Dates
    distribution_date DATE,                          -- DataDistribuicao
    event_date DATE,                                 -- DataFase

    -- Enrichment flags (for quick filtering)
    has_rapporteur BOOLEAN DEFAULT FALSE,
    has_vote BOOLEAN DEFAULT FALSE,
    vote_result VARCHAR(50),                         -- 'Aprovado', 'Rejeitado', etc.
    vote_date DATE,
    has_documents BOOLEAN DEFAULT FALSE,
    document_count INTEGER DEFAULT 0,

    -- Full data for details
    raw_data JSONB,                                  -- Full Comissao object

    created_at TIMESTAMP DEFAULT NOW(),

    -- Same initiative can go to same committee at different phases
    UNIQUE(iniciativa_id, committee_name, link_type, phase_code)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ini_com_iniciativa ON iniciativa_comissao(iniciativa_id);
CREATE INDEX IF NOT EXISTS idx_ini_com_committee ON iniciativa_comissao(committee_name);
CREATE INDEX IF NOT EXISTS idx_ini_com_orgao ON iniciativa_comissao(orgao_id);
CREATE INDEX IF NOT EXISTS idx_ini_com_type ON iniciativa_comissao(link_type);
CREATE INDEX IF NOT EXISTS idx_ini_com_phase ON iniciativa_comissao(phase_code);
CREATE INDEX IF NOT EXISTS idx_ini_com_vote ON iniciativa_comissao(has_vote) WHERE has_vote = TRUE;

-- =============================================================================
-- TABLE 8: iniciativa_conjunta (Initiative-to-Initiative Links)
-- =============================================================================

CREATE TABLE IF NOT EXISTS iniciativa_conjunta (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER NOT NULL REFERENCES iniciativas(id) ON DELETE CASCADE,

    -- Related initiative (may not exist in our DB yet)
    related_ini_id VARCHAR(20) NOT NULL,             -- IniId of related initiative
    related_ini_nr VARCHAR(20),                      -- Nr (e.g., "331")
    related_ini_leg VARCHAR(10),                     -- Legislature
    related_ini_tipo VARCHAR(10),                    -- tipo (J, P, R)
    related_ini_desc_tipo VARCHAR(100),              -- descTipo
    related_ini_titulo TEXT,                         -- titulo

    -- Context where joint processing occurred
    phase_code VARCHAR(10),
    phase_name VARCHAR(200),
    event_date DATE,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(iniciativa_id, related_ini_id, phase_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ini_conj_iniciativa ON iniciativa_conjunta(iniciativa_id);
CREATE INDEX IF NOT EXISTS idx_ini_conj_related ON iniciativa_conjunta(related_ini_id);
CREATE INDEX IF NOT EXISTS idx_ini_conj_phase ON iniciativa_conjunta(phase_code);

-- =============================================================================
-- TABLE 9: iniciativa_autores (Initiative Authorship)
-- =============================================================================

CREATE TABLE IF NOT EXISTS iniciativa_autores (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER NOT NULL REFERENCES iniciativas(id) ON DELETE CASCADE,

    -- Author type
    author_type VARCHAR(20) NOT NULL,        -- 'deputy', 'group', 'government', 'committee'

    -- For deputies (ID-based matching: 98.7% match rate)
    dep_cad_id INTEGER,                       -- idCadastro -> orgao_membros.dep_cad_id
    deputy_name VARCHAR(200),                 -- nome (display/fallback)

    -- For parliamentary groups and deputy party affiliation
    party VARCHAR(20),                        -- GP field (PS, PSD, CH, etc.)

    -- For committees (name-based matching)
    orgao_id INTEGER REFERENCES orgaos(id),  -- Linked via name matching

    -- For government and other entities
    entity_name VARCHAR(200),                 -- nome (Governo, Comissões)
    entity_code VARCHAR(10),                  -- sigla (V=Government, C=Committee)

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for author queries
CREATE INDEX IF NOT EXISTS idx_ini_autores_iniciativa ON iniciativa_autores(iniciativa_id);
CREATE INDEX IF NOT EXISTS idx_ini_autores_type ON iniciativa_autores(author_type);
CREATE INDEX IF NOT EXISTS idx_ini_autores_deputy ON iniciativa_autores(dep_cad_id) WHERE dep_cad_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ini_autores_party ON iniciativa_autores(party) WHERE party IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ini_autores_orgao ON iniciativa_autores(orgao_id) WHERE orgao_id IS NOT NULL;

-- Unique constraint using index (allows COALESCE for NULL handling)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ini_autores_unique
    ON iniciativa_autores(iniciativa_id, author_type,
        COALESCE(dep_cad_id, 0), COALESCE(party, ''), COALESCE(entity_code, ''));

-- =============================================================================
-- COMMENTS FOR RELATIONSHIPS
-- =============================================================================

COMMENT ON TABLE iniciativa_comissao IS 'Links between initiatives and committees at each workflow phase';
COMMENT ON TABLE iniciativa_conjunta IS 'Links between initiatives processed jointly';
COMMENT ON TABLE iniciativa_autores IS 'Authors of initiatives: deputies, parliamentary groups, government, committees';

COMMENT ON COLUMN iniciativa_comissao.link_type IS 'author=committee authored it, lead=primary reviewer (Competente=S), secondary=opinion only (Competente=N)';
COMMENT ON COLUMN iniciativa_comissao.phase_code IS '180=initial, 181=discussion, 240=re-evaluation, 270=speciality, 348=final text';
COMMENT ON COLUMN iniciativa_conjunta.related_ini_id IS 'IniId - may reference initiative not yet in our database';
COMMENT ON COLUMN iniciativa_autores.author_type IS 'deputy=individual deputy, group=parliamentary group, government=executive, committee=parliamentary committee';
COMMENT ON COLUMN iniciativa_autores.dep_cad_id IS 'idCadastro from API - matches orgao_membros.dep_cad_id for 98.7% of deputy authors';
