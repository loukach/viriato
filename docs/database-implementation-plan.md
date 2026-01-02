# Database Implementation Plan - Viriato

**Status:** Planning approved, ready for implementation
**Date:** 2026-01-02
**Target Platform:** Render.com with PostgreSQL

## Implementation Strategy

### Phase 1: Core Tables (START HERE)

**Goal:** Validate end-to-end feasibility with minimal scope

**Tables to implement:**
1. `iniciativas` - Legislative initiatives (808 items)
2. `iniciativa_events` - Lifecycle phases (~5,000 events)
3. `agenda_events` - Parliamentary calendar (34 items)

**Success criteria:**
- Data loads successfully from JSON files
- Can query and display on web app
- Update mechanism works (weekly refreshes)

### Phase 2: Supporting Tables (LATER)

**Tables to add:**
4. `deputies` - Parliament members
5. `anexos` - Attachments
6. `phase_definitions` - Reference data for lifecycle phases

### Phase 3: Advanced Features (FUTURE)

**Features:**
- Historical change tracking
- Voting records
- Full dataset integration (all 17 datasets)

## Database Schema - Phase 1

### Table 1: `iniciativas`

```sql
CREATE TABLE iniciativas (
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
    current_status VARCHAR(100),            -- Latest phase name (denormalized for performance)
    current_phase_code VARCHAR(10),         -- Latest phase code
    is_completed BOOLEAN DEFAULT FALSE,     -- Computed from phase
    text_link TEXT,                         -- IniLinkTexto (PDF link)
    raw_data JSONB,                         -- Full original JSON for reference
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_ini_type ON iniciativas(type);
CREATE INDEX idx_ini_status ON iniciativas(current_status);
CREATE INDEX idx_ini_dates ON iniciativas(start_date, end_date);
CREATE INDEX idx_ini_completed ON iniciativas(is_completed);

-- Full-text search on title
CREATE INDEX idx_ini_title_fts ON iniciativas USING GIN(to_tsvector('portuguese', title));
```

**Rationale:**
- `raw_data JSONB` - Keep original JSON for debugging and future schema changes
- `current_status` denormalized - Avoids expensive subquery to get latest event
- Full-text search - Lucas confirmed "why not?" - enables search functionality
- Portuguese text search - Parliament data is in Portuguese

### Table 2: `iniciativa_events`

```sql
CREATE TABLE iniciativa_events (
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
    raw_data JSONB,                         -- Full event JSON (contains nested data)
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_iniciativa ON iniciativa_events(iniciativa_id);
CREATE INDEX idx_events_phase ON iniciativa_events(phase_code);
CREATE INDEX idx_events_date ON iniciativa_events(event_date);
CREATE INDEX idx_events_order ON iniciativa_events(iniciativa_id, order_index);
```

**Rationale:**
- `order_index` - Preserve sequence of events for timeline display
- `ON DELETE CASCADE` - If iniciativa is deleted, remove all its events
- `raw_data JSONB` - Events contain nested structures (Votacao, Links, etc.) - store for later parsing

### Table 3: `agenda_events`

```sql
CREATE TABLE agenda_events (
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

-- Indexes
CREATE INDEX idx_agenda_dates ON agenda_events(start_date, end_date);
CREATE INDEX idx_agenda_section ON agenda_events(section);
CREATE INDEX idx_agenda_committee ON agenda_events(committee);
CREATE INDEX idx_agenda_title_fts ON agenda_events USING GIN(to_tsvector('portuguese', title));
```

**Rationale:**
- Full-text search on title - Enable "search agenda" feature
- Date indexes - Calendar views need efficient date range queries
- Keep HTML in `description` - Display as-is or parse later

## Data Loading Strategy

### Script: `scripts/load_to_postgres.py`

**Process:**
1. Read JSON files from `data/raw/`
2. Transform data to match schema
3. UPSERT into PostgreSQL (INSERT ... ON CONFLICT UPDATE)
4. Update `current_status` on iniciativas based on latest event

**UPSERT Logic:**
```python
# For iniciativas - use ini_id as unique key
INSERT INTO iniciativas (ini_id, title, ...)
VALUES (%s, %s, ...)
ON CONFLICT (ini_id)
DO UPDATE SET
    title = EXCLUDED.title,
    updated_at = NOW();

# For events - use evt_id + iniciativa_id as unique constraint
```

**Transformation logic:**

```python
def transform_iniciativa(raw_json):
    """Transform IniciativasXVII JSON to database row"""

    # Extract author (complex nested structure)
    author_type, author_name = extract_author(raw_json)

    # Get latest event for current_status
    events = raw_json.get('IniEventos', [])
    latest_event = events[-1] if events else None
    current_status = latest_event.get('Fase') if latest_event else 'Entrada'

    # Determine if completed
    is_completed = current_status in [
        'Lei (Publicação DR)',
        'Resolução da AR (Publicação DR)',
        'Rejeitado',
        'Caducado'
    ]

    return {
        'ini_id': raw_json['IniId'],
        'legislature': raw_json['IniLeg'],
        'number': raw_json['IniNr'],
        'type': raw_json['IniTipo'],
        'type_description': raw_json['IniDescTipo'],
        'title': raw_json['IniTitulo'],
        'author_type': author_type,
        'author_name': author_name,
        'start_date': raw_json['DataInicioleg'],
        'current_status': current_status,
        'is_completed': is_completed,
        'text_link': raw_json.get('IniLinkTexto'),
        'raw_data': json.dumps(raw_json)
    }
```

### Update Schedule

**Weekly updates (initial):**
```bash
# Cron job or GitHub Actions
0 2 * * 0 python scripts/download_datasets.py && python scripts/load_to_postgres.py
```

**Future: Daily updates**
```bash
0 2 * * * python scripts/download_datasets.py && python scripts/load_to_postgres.py
```

## Deployment on Render.com

### 1. Create PostgreSQL Database

```
Render Dashboard → New PostgreSQL
- Name: viriato-db
- Plan: Free (30 days) → Starter ($7/month)
- Region: Frankfurt (closest to Portugal)
```

**Connection details:**
```
POSTGRES_HOST=<hostname>.render.com
POSTGRES_DB=viriato_xxxxx
POSTGRES_USER=viriato_xxxxx_user
POSTGRES_PASSWORD=<generated>
```

### 2. Initial Setup

**Run migrations locally first:**
```bash
# Create tables
psql $DATABASE_URL -f scripts/schema.sql

# Load data
python scripts/load_to_postgres.py
```

**Or create a migration system:**
```python
# migrations/001_create_core_tables.sql
-- Contains CREATE TABLE statements
```

### 3. Web Application Configuration

**Environment variables:**
```env
DATABASE_URL=postgresql://user:pass@host/db
```

**Python connection:**
```python
import psycopg2
import os

conn = psycopg2.connect(os.environ['DATABASE_URL'])
```

## Sample Queries for Web App

### 1. Homepage - Recent Iniciativas
```sql
SELECT
    ini_id,
    title,
    type_description,
    current_status,
    start_date
FROM iniciativas
ORDER BY start_date DESC
LIMIT 20;
```

### 2. Iniciativas by Status (for funnel view)
```sql
SELECT
    current_status,
    COUNT(*) as count,
    type_description
FROM iniciativas
WHERE type IN ('P', 'R')  -- Laws and Resolutions only
GROUP BY current_status, type_description
ORDER BY count DESC;
```

### 3. Initiative Timeline
```sql
SELECT
    e.phase_name,
    e.event_date,
    e.committee,
    e.observations
FROM iniciativa_events e
JOIN iniciativas i ON e.iniciativa_id = i.id
WHERE i.ini_id = '315506'
ORDER BY e.order_index;
```

### 4. Search Iniciativas
```sql
SELECT
    ini_id,
    title,
    type_description,
    current_status,
    ts_rank(to_tsvector('portuguese', title), query) as rank
FROM iniciativas,
     to_tsquery('portuguese', 'saúde') as query
WHERE to_tsvector('portuguese', title) @@ query
ORDER BY rank DESC;
```

### 5. Calendar View - This Week
```sql
SELECT
    title,
    section,
    start_date,
    start_time,
    location
FROM agenda_events
WHERE start_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY start_date, start_time;
```

### 6. Performance - Initiatives by Type
```sql
SELECT
    type_description,
    COUNT(*) as total,
    SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed,
    ROUND(AVG(EXTRACT(DAY FROM (end_date - start_date)))) as avg_days
FROM iniciativas
WHERE start_date IS NOT NULL
GROUP BY type_description
ORDER BY total DESC;
```

## File Structure

```
viriato/
├── scripts/
│   ├── schema.sql                  # CREATE TABLE statements
│   ├── load_to_postgres.py         # Data loader (Phase 1)
│   └── download_datasets.py        # Existing downloader
├── docs/
│   ├── database-implementation-plan.md  # This file
│   └── database-queries.md         # Query examples (to create)
└── data/
    └── raw/                        # Source JSON files
```

## Implementation Checklist

### Phase 1: Core Setup
- [ ] Create `scripts/schema.sql` with CREATE TABLE statements
- [ ] Create Render.com PostgreSQL database
- [ ] Test connection locally
- [ ] Implement `load_to_postgres.py` script
  - [ ] Load iniciativas table
  - [ ] Load iniciativa_events table
  - [ ] Load agenda_events table
  - [ ] Implement UPSERT logic
  - [ ] Update current_status on iniciativas
- [ ] Run initial data load (808 iniciativas)
- [ ] Verify data integrity (count records, spot check)
- [ ] Test sample queries
- [ ] Document connection process for web app

### Phase 1.5: Web App Integration
- [ ] Update web app to connect to PostgreSQL
- [ ] Replace embedded data.js with database queries
- [ ] Test performance (should be instant with indexes)
- [ ] Deploy to Render.com

### Phase 2: Automation
- [ ] Set up weekly update script
- [ ] Create GitHub Action or cron job
- [ ] Monitor for errors
- [ ] Eventually increase to daily updates

## Estimated Costs

**Render.com PostgreSQL:**
- Free tier: 30 days (good for testing Phase 1)
- After 30 days: **$7/month** (Starter plan - 256 MB RAM, 1 GB storage)
- Storage usage: ~70 MB (well under limit)

**Total monthly cost: $7** (after free trial)

## Success Metrics

**Phase 1 completion means:**
1. ✅ All 808 iniciativas loaded successfully
2. ✅ ~5,000 events loaded with correct relationships
3. ✅ Agenda data queryable
4. ✅ Full-text search works on Portuguese text
5. ✅ Web app displays data from PostgreSQL
6. ✅ Update script runs successfully (can reload data)

## Next Steps

1. **Lucas approves this plan** ✅ (Lucas confirmed)
2. **Claude implements Phase 1**
   - Create schema.sql
   - Create load_to_postgres.py
   - Test locally
3. **Lucas creates Render database**
4. **Claude loads data**
5. **Lucas tests queries**
6. **Move to Phase 1.5** (web app integration)
