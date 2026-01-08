# Data Ingestion Strategy & Database Design

**Created:** January 6, 2026
**Purpose:** Foundation-stage database design for Viriato project

## Available Raw Data

### Currently Downloaded (21 datasets, ~210 MB)

| Dataset | Size | Records | Priority | Status |
|---------|------|---------|----------|--------|
| **IniciativasXIV-XVII** | 170 MB | 6,748 | HIGH | ✅ Partially loaded |
| **OrgaoComposicaoXVII** | 2.2 MB | 1,446 deputies | HIGH | ❌ Not loaded |
| **RegistoBiograficoXVII** | 653 KB | 330 | MEDIUM | ❌ Not loaded |
| **AtividadeDeputadoXVII** | 14 MB | ? | MEDIUM | ❌ Not loaded |
| **IntervencoesXVII** | 4.4 MB | ? | LOW | ❌ Not loaded |
| **DiplomasXVII** | 456 KB | ? | LOW | ❌ Not loaded |
| **RequerimentosXVII** | 2.5 MB | ? | LOW | ❌ Not loaded |
| **AgendaParlamentar** | 134 KB | 34 | HIGH | ✅ Loaded |
| Others (13 datasets) | ~10 MB | Various | LOW | ❌ Not loaded |

## Current Architecture Problems

### What We Have Now

```sql
-- iniciativas table
CREATE TABLE iniciativas (
    id SERIAL PRIMARY KEY,
    ini_id TEXT UNIQUE,
    legislature TEXT,
    title TEXT,
    author_name TEXT,              -- ❌ Denormalized: "Governo", "Grupos Parlamentares", etc.
    raw_data JSONB                 -- ❌ Contains queryable data (parties, deputies)
);

-- iniciativa_events table
CREATE TABLE iniciativa_events (
    evt_id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER REFERENCES iniciativas(id),
    phase_name TEXT,
    event_date DATE
);
```

### The Problems

1. **Author data is mixed**: Sometimes in `author_name`, sometimes in `raw_data->IniAutorGruposParlamentares`
2. **No deputy relationships**: Can't query "initiatives by deputy X" or "deputy X's party history"
3. **No party analytics**: Party data is in JSONB array, requires expensive traversal
4. **Can't answer simple questions** like:
   - "Which deputies proposed the most laws?"
   - "Show PS party's legislative activity over time"
   - "Which committee members work on environmental issues?"

## Proposed Database Design

### Core Entities

```sql
-- ============================================================================
-- LEGISLATURES & METADATA
-- ============================================================================

CREATE TABLE legislatures (
    legislature TEXT PRIMARY KEY,              -- 'XIV', 'XV', 'XVI', 'XVII'
    start_date DATE,
    end_date DATE,
    num_deputies INTEGER
);

-- ============================================================================
-- DEPUTIES
-- ============================================================================

CREATE TABLE deputies (
    cad_id INTEGER PRIMARY KEY,                -- Unique across all legislatures
    full_name TEXT NOT NULL,
    parliamentary_name TEXT,
    sex CHAR(1),
    birth_date DATE,
    profession TEXT,
    biography TEXT,                            -- Full text from RegistoBiografico
    raw_data JSONB                             -- Full biographical data
);

-- Deputy party membership with temporal data
CREATE TABLE deputy_parties (
    id SERIAL PRIMARY KEY,
    deputy_id INTEGER REFERENCES deputies(cad_id),
    party_code TEXT NOT NULL,                  -- 'PS', 'PSD', 'CH', etc.
    legislature TEXT REFERENCES legislatures(legislature),
    start_date DATE NOT NULL,
    end_date DATE,                             -- NULL if currently active
    UNIQUE(deputy_id, party_code, start_date)
);

-- Deputy electoral districts
CREATE TABLE deputy_districts (
    id SERIAL PRIMARY KEY,
    deputy_id INTEGER REFERENCES deputies(cad_id),
    district_name TEXT NOT NULL,               -- 'Lisboa', 'Porto', 'Açores', etc.
    legislature TEXT REFERENCES legislatures(legislature),
    UNIQUE(deputy_id, legislature)
);

-- Deputy committee memberships
CREATE TABLE deputy_committees (
    id SERIAL PRIMARY KEY,
    deputy_id INTEGER REFERENCES deputies(cad_id),
    committee_name TEXT NOT NULL,
    role TEXT,                                 -- 'Presidente', 'Membro', etc.
    legislature TEXT REFERENCES legislatures(legislature),
    start_date DATE,
    end_date DATE
);

-- ============================================================================
-- INITIATIVES (Enhanced)
-- ============================================================================

CREATE TABLE iniciativas (
    id SERIAL PRIMARY KEY,
    ini_id TEXT UNIQUE NOT NULL,
    legislature TEXT REFERENCES legislatures(legislature),
    number TEXT,
    type TEXT,                                 -- 'P', 'R', 'D', etc.
    type_description TEXT,
    title TEXT NOT NULL,

    -- Normalized author fields
    author_type TEXT,                          -- 'government', 'parliamentary_group', 'deputy', 'committee'
    author_name TEXT,                          -- Kept for display purposes

    -- Temporal fields
    start_date DATE,
    end_date DATE,

    -- Status
    current_status TEXT,
    is_completed BOOLEAN,

    -- Links
    text_link TEXT,

    -- Full original data (for exploration, future use)
    raw_data JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Initiative authors: Parliamentary Groups (normalized many-to-many)
CREATE TABLE initiative_parliamentary_groups (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER REFERENCES iniciativas(id) ON DELETE CASCADE,
    party_code TEXT NOT NULL,                  -- 'PS', 'PSD', 'CH', etc.
    UNIQUE(iniciativa_id, party_code)
);

-- Initiative authors: Deputies (normalized many-to-many)
CREATE TABLE initiative_deputies (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER REFERENCES iniciativas(id) ON DELETE CASCADE,
    deputy_id INTEGER REFERENCES deputies(cad_id),
    party_code TEXT,                           -- Party at time of initiative
    UNIQUE(iniciativa_id, deputy_id)
);

-- Initiative events (already exists, keep as-is)
CREATE TABLE iniciativa_events (
    evt_id SERIAL PRIMARY KEY,
    oev_id TEXT,                               -- Original event ID
    iniciativa_id INTEGER REFERENCES iniciativas(id) ON DELETE CASCADE,
    phase_code TEXT,
    phase_name TEXT NOT NULL,
    event_date DATE,
    observations TEXT,
    raw_data JSONB                             -- Votes, attachments, etc.
);

-- ============================================================================
-- AGENDA (already exists, keep as-is)
-- ============================================================================

CREATE TABLE agenda_events (
    id SERIAL PRIMARY KEY,
    event_id TEXT UNIQUE,
    title TEXT,
    event_type TEXT,
    start_date DATE,
    start_time TIME,
    end_time TIME,
    location TEXT,
    raw_data JSONB
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Deputies
CREATE INDEX idx_deputies_name ON deputies(parliamentary_name);
CREATE INDEX idx_deputy_parties_deputy ON deputy_parties(deputy_id);
CREATE INDEX idx_deputy_parties_party ON deputy_parties(party_code);
CREATE INDEX idx_deputy_parties_leg ON deputy_parties(legislature);

-- Initiatives
CREATE INDEX idx_iniciativas_legislature ON iniciativas(legislature);
CREATE INDEX idx_iniciativas_type ON iniciativas(type);
CREATE INDEX idx_iniciativas_status ON iniciativas(current_status);
CREATE INDEX idx_iniciativas_author_type ON iniciativas(author_type);
CREATE INDEX idx_iniciativas_date ON iniciativas(start_date);

-- Initiative relationships
CREATE INDEX idx_initiative_groups_ini ON initiative_parliamentary_groups(iniciativa_id);
CREATE INDEX idx_initiative_groups_party ON initiative_parliamentary_groups(party_code);
CREATE INDEX idx_initiative_deputies_ini ON initiative_deputies(iniciativa_id);
CREATE INDEX idx_initiative_deputies_dep ON initiative_deputies(deputy_id);

-- Events
CREATE INDEX idx_events_iniciativa ON iniciativa_events(iniciativa_id);
CREATE INDEX idx_events_phase ON iniciativa_events(phase_name);
CREATE INDEX idx_events_date ON iniciativa_events(event_date);

-- Full-text search (Portuguese)
CREATE INDEX idx_iniciativas_title_fts ON iniciativas
    USING gin(to_tsvector('portuguese', title));
CREATE INDEX idx_deputies_name_fts ON deputies
    USING gin(to_tsvector('portuguese', parliamentary_name));
```

## What This Enables

### Simple, Fast Analytics Queries

```sql
-- Top 10 most active deputies (by initiatives)
SELECT
    d.parliamentary_name,
    dp.party_code,
    COUNT(*) as initiative_count
FROM initiative_deputies id
JOIN deputies d ON id.deputy_id = d.cad_id
JOIN deputy_parties dp ON d.cad_id = dp.deputy_id
    AND dp.legislature = 'XVII'
GROUP BY d.parliamentary_name, dp.party_code
ORDER BY initiative_count DESC
LIMIT 10;

-- Initiatives by party (clean, indexed query)
SELECT
    party_code,
    COUNT(*) as count
FROM initiative_parliamentary_groups ipg
JOIN iniciativas i ON ipg.iniciativa_id = i.id
WHERE i.legislature = 'XVII'
GROUP BY party_code
ORDER BY count DESC;

-- Deputy's full legislative activity
SELECT
    i.ini_id,
    i.title,
    i.type_description,
    i.start_date,
    i.current_status
FROM initiative_deputies id
JOIN iniciativas i ON id.iniciativa_id = i.id
WHERE id.deputy_id = 6864  -- Inês de Sousa Real
ORDER BY i.start_date DESC;

-- Committee members working on health initiatives
SELECT DISTINCT
    d.parliamentary_name,
    dp.party_code,
    dc.role
FROM deputy_committees dc
JOIN deputies d ON dc.deputy_id = d.cad_id
JOIN deputy_parties dp ON d.cad_id = dp.deputy_id
WHERE dc.committee_name ILIKE '%Saúde%'
    AND dc.legislature = 'XVII';
```

### API Endpoints Made Trivial

```python
# /api/stats endpoint becomes simple
@app.route('/api/stats')
def get_stats():
    legislature = request.args.get('legislature')

    # All these become single simple queries
    by_party = execute("SELECT party_code, COUNT(*) FROM initiative_parliamentary_groups ipg JOIN iniciativas i ON ipg.iniciativa_id = i.id WHERE legislature = %s GROUP BY party_code", [legislature])

    by_deputy = execute("SELECT d.parliamentary_name, COUNT(*) FROM initiative_deputies id JOIN deputies d ON ... WHERE legislature = %s GROUP BY d.parliamentary_name ORDER BY COUNT(*) DESC LIMIT 10", [legislature])

    by_committee = execute("SELECT dc.committee_name, COUNT(*) FROM deputy_committees dc JOIN initiative_deputies id ON ... WHERE legislature = %s GROUP BY dc.committee_name", [legislature])

    # No JSONB traversal, no client-side aggregation
    return jsonify({
        'by_party': by_party,
        'by_deputy': by_deputy,
        'by_committee': by_committee
    })
```

## Normalization Strategy

### What to Normalize (Move from JSONB to Columns)

**HIGH PRIORITY (needed for current features):**
- ✅ **Author parties**: `raw_data->IniAutorGruposParlamentares` → `initiative_parliamentary_groups` table
- ✅ **Author deputies**: `raw_data->IniAutorDeputados` → `initiative_deputies` table
- ✅ **Deputy biographical data**: Load from `RegistoBiograficoXVII` → `deputies` table
- ✅ **Deputy-party relationships**: Load from `OrgaoComposicaoXVII` → `deputy_parties` table

**MEDIUM PRIORITY (enables new features):**
- ⏳ **Deputy committees**: From `OrgaoComposicaoXVII` → `deputy_committees` table
- ⏳ **Deputy districts**: From `OrgaoComposicaoXVII.Plenario.Composicao` → `deputy_districts` table
- ⏳ **Event attachments**: `IniEventos.AnexosFase` → separate table or keep in JSONB

**LOW PRIORITY (keep in JSONB for now):**
- ❌ **Event votes**: Complex nested structure, not currently displayed
- ❌ **Initiative attachments**: `IniAnexos` - just download links
- ❌ **Related initiatives**: `IniciativasConjuntas`, `IniciativasOrigem` - complex relationships
- ❌ **European initiatives**: `IniciativasEuropeias` - rarely used
- ❌ **Deputy activities**: 14MB dataset, unclear current use case

### What to Keep in JSONB

- **Full original records** in `raw_data` columns for:
  - Future exploration and pivoting
  - Debugging and data quality checks
  - Supporting edge cases we haven't discovered yet
- **Deeply nested data** that's rarely queried:
  - Vote details and breakdowns
  - Document/attachment metadata
  - Complex procedural data

## Migration Plan

### Phase 1: Normalize Current Initiative Data (CURRENT PRIORITY)

**Goal:** Make existing analytics widgets 100x faster

```bash
# 1. Enhance iniciativas table
ALTER TABLE iniciativas ADD COLUMN author_type TEXT;
UPDATE iniciativas SET author_type =
    CASE
        WHEN raw_data->>'IniAutorOutros'->>'sigla' = 'V' THEN 'government'
        WHEN raw_data->'IniAutorGruposParlamentares' IS NOT NULL THEN 'parliamentary_group'
        WHEN raw_data->'IniAutorDeputados' IS NOT NULL THEN 'deputy'
        ELSE 'other'
    END;

# 2. Create and populate initiative_parliamentary_groups
CREATE TABLE initiative_parliamentary_groups (...);
INSERT INTO initiative_parliamentary_groups (iniciativa_id, party_code)
SELECT
    i.id,
    jsonb_array_elements(i.raw_data->'IniAutorGruposParlamentares')->>'GP'
FROM iniciativas i
WHERE i.raw_data->'IniAutorGruposParlamentares' IS NOT NULL;

# 3. Update /api/stats to use new tables
# (No client changes needed!)
```

**Result:**
- `/api/stats` response time: 6s → <0.5s
- Payload size: 1.1 MB → ~10 KB (just aggregated counts)
- Widget render: Instant (no client-side aggregation)

### Phase 2: Load Deputy Data

**Goal:** Enable deputy-centric features

```bash
# 1. Create deputy tables
CREATE TABLE deputies (...);
CREATE TABLE deputy_parties (...);
CREATE TABLE deputy_districts (...);

# 2. Load biographical data
python scripts/load_deputies.py

# 3. Create initiative_deputies relationships
CREATE TABLE initiative_deputies (...);
INSERT INTO initiative_deputies (iniciativa_id, deputy_id, party_code)
SELECT
    i.id,
    (dep->>'idCadastro')::INTEGER,
    dep->>'GP'
FROM iniciativas i,
    jsonb_array_elements(i.raw_data->'IniAutorDeputados') AS dep
WHERE i.raw_data->'IniAutorDeputados' IS NOT NULL;
```

**Enables:**
- Deputy profile pages
- "Most active deputies" widget
- Party membership history
- Electoral district analytics

### Phase 3: Add Committee and Activity Data (Future)

**Goal:** Deep parliamentary insights

```bash
# Load committee memberships, deputy activities, interventions
# Build cross-referencing between initiatives, deputies, and committees
```

## File Structure

```
viriato/
├── scripts/
│   ├── schema/
│   │   ├── 01_core_tables.sql          # Legislatures, deputies, parties
│   │   ├── 02_initiatives.sql          # Enhanced iniciativas
│   │   ├── 03_relationships.sql        # Many-to-many tables
│   │   └── 04_indexes.sql              # Performance indexes
│   ├── migrations/
│   │   ├── 001_normalize_authors.sql   # Phase 1 migration
│   │   └── 002_add_deputies.sql        # Phase 2 migration
│   ├── loaders/
│   │   ├── load_deputies.py            # Load RegistoBiografico
│   │   ├── load_deputy_parties.py      # Load OrgaoComposicao
│   │   └── load_initiatives.py         # Enhanced initiative loader
│   └── schema.sql                       # Current monolithic schema (keep for reference)
```

## Principles for Foundation Stage

### ✅ DO

1. **Normalize frequently-queried data**
   - Parties, deputies, committees → Proper tables
   - Enable simple SQL queries instead of JSONB traversal

2. **Keep JSONB as source of truth**
   - Store full `raw_data` for audit trail
   - Can always re-normalize if we get it wrong

3. **Build for common queries first**
   - Analytics by party, deputy, type
   - Search and filters
   - Timeline views

4. **Index aggressively**
   - Query patterns are predictable
   - Read-heavy workload
   - Storage is cheap

5. **Design for incremental migration**
   - Can migrate data table-by-table
   - Old code works during transition
   - No big-bang rewrites

### ❌ DON'T

1. **Don't normalize everything**
   - Vote breakdowns → Keep in JSONB
   - Document metadata → Keep in JSONB
   - Edge cases → Keep in JSONB

2. **Don't delete raw data**
   - Always keep `raw_data` column
   - It's our source of truth
   - Enables future pivoting

3. **Don't optimize prematurely**
   - Start with Phase 1 (parties/authors)
   - See what queries are slow
   - Add indexes and tables as needed

4. **Don't break existing features**
   - Frontend expects specific JSON format
   - API responses stay compatible
   - Migrate backend first, frontend later

## Decision Framework

**When deciding whether to normalize a field, ask:**

1. **Is it queried in WHERE/GROUP BY clauses?** → Normalize
2. **Is it aggregated (COUNT, SUM)?** → Normalize
3. **Is it joined across records?** → Normalize
4. **Is it displayed but never filtered?** → Keep in JSONB
5. **Is it deeply nested (3+ levels)?** → Keep in JSONB
6. **Is it rarely accessed?** → Keep in JSONB

**Examples:**
- ✅ Normalize: `IniAutorGruposParlamentares` (filtered, aggregated, joined)
- ✅ Normalize: Deputy names, parties (joined, searched)
- ❌ Keep JSONB: Vote details (complex, rarely queried)
- ❌ Keep JSONB: Attachment metadata (display-only)

## Next Steps

1. **Review this strategy with Lucas** ✅ (this document)
2. **Get approval on Phase 1 scope** ⏳
3. **Write Phase 1 migration SQL** ⏳
4. **Test on local database** ⏳
5. **Deploy to Render.com** ⏳
6. **Update API endpoints** ⏳
7. **Verify frontend still works** ⏳
8. **Monitor query performance** ⏳

## Questions for Lucas

1. **Scope**: Start with just Phase 1 (parties/authors normalization), or include Phase 2 (deputies)?
2. **Breaking changes**: OK to change `/api/stats` response format, or must stay compatible?
3. **Timeline**: Any features you need soon that would influence priority?
4. **Data coverage**: Load just Legislature XVII deputies, or all four legislatures (XIV-XVII)?

---

**Summary:** This is a foundation-stage design that:
- ✅ Normalizes queryable data (parties, deputies)
- ✅ Keeps JSONB as source of truth
- ✅ Makes analytics queries 100x faster
- ✅ Enables incremental migration (no big-bang)
- ✅ Stays simple (no premature optimization)
- ✅ Builds for change (easy to pivot as product evolves)
