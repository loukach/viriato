# Data Ingestion Design

**Created:** January 6, 2026
**Purpose:** Define how raw JSON data from parlamento.pt is ingested and stored in PostgreSQL

## Core Principles

### 1. **Dual Storage Strategy**
- **Normalized columns** for frequently-queried fields
- **`raw_data` JSONB column** as immutable source of truth

### 2. **Normalization Decision Framework**

Normalize a field when it meets **2 or more** of these criteria:
- ✅ Used in WHERE/JOIN/GROUP BY clauses
- ✅ Aggregated (COUNT, SUM, AVG)
- ✅ Searched or filtered by users
- ✅ Displayed in lists/tables (not just detail views)
- ✅ Foreign key to another entity

Keep in JSONB when:
- ❌ Display-only in detail views
- ❌ Deeply nested (3+ levels)
- ❌ Rarely accessed
- ❌ Complex structure we don't fully understand yet

### 3. **Polymorphism Pattern**

When an entity has multiple subtypes sharing common behavior:
- ✅ Use single table with `type` discriminator
- ✅ Use CHECK constraints to enforce type-specific rules
- ✅ Use partial indexes for type-specific queries
- ❌ Don't create separate tables unless types are fundamentally different

### 4. **Temporal Data Pattern**

For time-varying data (party memberships, committee assignments):
- Store `start_date` and `end_date` (NULL = currently active)
- Index on both dates for temporal queries
- Keep historical records (never delete)

### 5. **Migration Safety**

Every ingestion script must:
- Be idempotent (can run multiple times safely)
- Use UPSERT (INSERT ... ON CONFLICT UPDATE)
- Log all transformations
- Preserve original IDs from parlamento.pt

---

## Dataset Ingestion Definitions

### 1. Iniciativas (Legislative Initiatives)

**Source Files:**
- `IniciativasXIV_json.txt` (2,587 records, 55 MB)
- `IniciativasXV_json.txt` (1,952 records, 55 MB)
- `IniciativasXVI_json.txt` (1,401 records, 42 MB)
- `IniciativasXVII_json.txt` (808 records, 18 MB)

#### Database Schema

```sql
-- Main initiatives table
CREATE TABLE iniciativas (
    id SERIAL PRIMARY KEY,
    ini_id TEXT UNIQUE NOT NULL,              -- Original ID from parlamento.pt
    legislature TEXT NOT NULL,                 -- 'XIV', 'XV', 'XVI', 'XVII'

    -- Basic info (normalized)
    number TEXT,                               -- IniNr: '28', '201', etc.
    type TEXT,                                 -- IniTipo: 'P', 'R', 'D', etc.
    type_description TEXT,                     -- IniDescTipo: 'Proposta de Lei', etc.
    title TEXT NOT NULL,                       -- IniTitulo

    -- Temporal
    start_date DATE,                           -- DataInicioleg
    end_date DATE,                             -- DataFimleg (usually NULL)

    -- Status
    current_status TEXT,                       -- Last phase from IniEventos
    is_completed BOOLEAN DEFAULT FALSE,        -- Derived from phases

    -- Links
    text_link TEXT,                            -- IniLinkTexto

    -- Author summary (for display)
    author_type TEXT,                          -- 'parliamentary_group', 'deputy', 'government', 'committee'
    author_name TEXT,                          -- Display name

    -- Source of truth
    raw_data JSONB NOT NULL,                   -- Complete original record

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_legislature CHECK (legislature IN ('XIV', 'XV', 'XVI', 'XVII'))
);

-- Initiative authors (polymorphic)
CREATE TABLE initiative_authors (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER NOT NULL REFERENCES iniciativas(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL,

    -- Type-specific fields (conditionally used based on author_type)
    party_code TEXT,                           -- For type='parliamentary_group'
    deputy_id INTEGER,                         -- For type='deputy' (FK to deputies)
    deputy_party_code TEXT,                    -- Party at time of authorship
    author_name TEXT,                          -- For type='government'/'committee'/'other'
    author_sigla TEXT,                         -- For type='government'/'committee'/'other'

    -- Enforce business rules
    CONSTRAINT chk_author_type CHECK (author_type IN ('parliamentary_group', 'deputy', 'government', 'committee', 'other')),
    CONSTRAINT chk_party_fields CHECK (
        (author_type = 'parliamentary_group' AND party_code IS NOT NULL AND deputy_id IS NULL)
        OR (author_type = 'deputy' AND deputy_id IS NOT NULL)
        OR (author_type IN ('government', 'committee', 'other') AND author_name IS NOT NULL)
    ),
    CONSTRAINT uniq_author UNIQUE (iniciativa_id, author_type, party_code, deputy_id)
);

-- Initiative events (lifecycle phases)
CREATE TABLE iniciativa_events (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER NOT NULL REFERENCES iniciativas(id) ON DELETE CASCADE,

    -- Event identity
    oev_id TEXT,                               -- OevId from source
    evt_id TEXT,                               -- EvtId from source

    -- Phase info (normalized)
    phase_code TEXT,                           -- CodigoFase: '10', '20', etc.
    phase_name TEXT NOT NULL,                  -- Fase: 'Entrada', 'Admissão', etc.
    event_date DATE,                           -- DataFase
    observations TEXT,                         -- ObsFase

    -- Committee assignment
    committee_name TEXT,                       -- Comissao.ComDes

    -- Full event data (votes, attachments, etc.)
    raw_data JSONB NOT NULL,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_iniciativas_legislature ON iniciativas(legislature);
CREATE INDEX idx_iniciativas_type ON iniciativas(type);
CREATE INDEX idx_iniciativas_status ON iniciativas(current_status);
CREATE INDEX idx_iniciativas_date ON iniciativas(start_date);
CREATE INDEX idx_iniciativas_title_fts ON iniciativas USING gin(to_tsvector('portuguese', title));

CREATE INDEX idx_authors_iniciativa ON initiative_authors(iniciativa_id);
CREATE INDEX idx_authors_type ON initiative_authors(author_type);
CREATE INDEX idx_authors_party ON initiative_authors(party_code) WHERE party_code IS NOT NULL;
CREATE INDEX idx_authors_deputy ON initiative_authors(deputy_id) WHERE deputy_id IS NOT NULL;

CREATE INDEX idx_events_iniciativa ON iniciativa_events(iniciativa_id);
CREATE INDEX idx_events_phase ON iniciativa_events(phase_name);
CREATE INDEX idx_events_date ON iniciativa_events(event_date);
```

#### Ingestion Logic

```python
def ingest_iniciativa(record: dict, legislature: str, conn):
    """
    Ingest one iniciativa record.

    Args:
        record: Raw JSON record from IniciativasXVII_json.txt
        legislature: 'XIV', 'XV', 'XVI', or 'XVII'
        conn: Database connection
    """
    cur = conn.cursor()

    # 1. Insert main iniciativa record
    cur.execute("""
        INSERT INTO iniciativas (
            ini_id, legislature, number, type, type_description,
            title, start_date, end_date, text_link, raw_data
        ) VALUES (
            %(IniId)s, %(legislature)s, %(IniNr)s, %(IniTipo)s, %(IniDescTipo)s,
            %(IniTitulo)s, %(DataInicioleg)s, %(DataFimleg)s, %(IniLinkTexto)s, %(raw_data)s
        )
        ON CONFLICT (ini_id) DO UPDATE SET
            title = EXCLUDED.title,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
        RETURNING id
    """, {
        'IniId': record['IniId'],
        'legislature': legislature,
        'IniNr': record.get('IniNr'),
        'IniTipo': record.get('IniTipo'),
        'IniDescTipo': record.get('IniDescTipo'),
        'IniTitulo': record['IniTitulo'],
        'DataInicioleg': record.get('DataInicioleg'),
        'DataFimleg': record.get('DataFimleg'),
        'IniLinkTexto': record.get('IniLinkTexto'),
        'raw_data': json.dumps(record)
    })

    iniciativa_id = cur.fetchone()[0]

    # 2. Insert authors
    # Clear existing authors (simpler than diffing)
    cur.execute("DELETE FROM initiative_authors WHERE iniciativa_id = %s", [iniciativa_id])

    # Parliamentary groups
    if record.get('IniAutorGruposParlamentares'):
        groups = record['IniAutorGruposParlamentares']
        if not isinstance(groups, list):
            groups = [groups]
        for group in groups:
            if group.get('GP'):
                cur.execute("""
                    INSERT INTO initiative_authors (
                        iniciativa_id, author_type, party_code
                    ) VALUES (%s, 'parliamentary_group', %s)
                    ON CONFLICT DO NOTHING
                """, [iniciativa_id, group['GP']])

    # Deputies
    if record.get('IniAutorDeputados'):
        deputies = record['IniAutorDeputados']
        if not isinstance(deputies, list):
            deputies = [deputies]
        for deputy in deputies:
            if deputy.get('idCadastro'):
                cur.execute("""
                    INSERT INTO initiative_authors (
                        iniciativa_id, author_type, deputy_id, deputy_party_code
                    ) VALUES (%s, 'deputy', %s, %s)
                    ON CONFLICT DO NOTHING
                """, [iniciativa_id, int(deputy['idCadastro']), deputy.get('GP')])

    # Government/Other
    if record.get('IniAutorOutros'):
        outros = record['IniAutorOutros']
        author_type = 'government' if outros.get('sigla') == 'V' else 'other'
        cur.execute("""
            INSERT INTO initiative_authors (
                iniciativa_id, author_type, author_name, author_sigla
            ) VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, [iniciativa_id, author_type, outros.get('nome'), outros.get('sigla')])

    # 3. Insert events
    # Clear existing events
    cur.execute("DELETE FROM iniciativa_events WHERE iniciativa_id = %s", [iniciativa_id])

    if record.get('IniEventos'):
        events = record['IniEventos']
        for event in events:
            committee_name = None
            if event.get('Comissao'):
                committee_name = event['Comissao'].get('ComDes')

            cur.execute("""
                INSERT INTO iniciativa_events (
                    iniciativa_id, oev_id, evt_id,
                    phase_code, phase_name, event_date,
                    observations, committee_name, raw_data
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, [
                iniciativa_id,
                event.get('OevId'),
                event.get('EvtId'),
                event.get('CodigoFase'),
                event['Fase'],
                event.get('DataFase'),
                event.get('ObsFase'),
                committee_name,
                json.dumps(event)
            ])

    # 4. Update derived fields (status, author_type, author_name)
    cur.execute("""
        UPDATE iniciativas SET
            current_status = (
                SELECT phase_name FROM iniciativa_events
                WHERE iniciativa_id = %s
                ORDER BY event_date DESC NULLS LAST, id DESC
                LIMIT 1
            ),
            author_type = (
                SELECT author_type FROM initiative_authors
                WHERE iniciativa_id = %s
                LIMIT 1
            ),
            author_name = (
                SELECT COALESCE(
                    party_code,
                    (SELECT parliamentary_name FROM deputies WHERE cad_id = deputy_id),
                    author_name
                )
                FROM initiative_authors
                WHERE iniciativa_id = %s
                LIMIT 1
            )
        WHERE id = %s
    """, [iniciativa_id, iniciativa_id, iniciativa_id, iniciativa_id])

    conn.commit()
```

**Key Decisions:**
- ✅ **Polymorphic authors**: Single `initiative_authors` table with type discriminator
- ✅ **Author summary**: Denormalized `author_type` and `author_name` in main table for display
- ✅ **Events as separate table**: Clean 1-to-many relationship
- ✅ **Committee in events**: Normalized for filtering "initiatives in health committee"
- ❌ **Don't normalize**: Votes, attachments, related initiatives (keep in `raw_data`)

---

### 2. Deputies

**Source Files:**
- `RegistoBiograficoXVII_json.txt` (330 records, 653 KB) - Biographical data
- `OrgaoComposicaoXVII_json.txt` (1 record, 2.2 MB) - Contains 1,446 deputy records across all organs

#### Database Schema

```sql
-- Core deputy data
CREATE TABLE deputies (
    cad_id INTEGER PRIMARY KEY,                -- CadId (unique across all legislatures)
    full_name TEXT NOT NULL,                   -- CadNomeCompleto
    parliamentary_name TEXT,                   -- Derived from OrgaoComposicao
    sex CHAR(1),                               -- CadSexo: 'M', 'F'
    birth_date DATE,                           -- CadDtNascimento

    -- Biographical (from RegistoBiografico)
    profession TEXT,                           -- CadProfissao
    education TEXT,                            -- CadHabilitacoes
    published_works TEXT,                      -- CadObrasPublicadas
    awards TEXT,                               -- CadCondecoracoes

    -- Full source data
    raw_data JSONB NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Deputy party memberships (temporal)
CREATE TABLE deputy_parties (
    id SERIAL PRIMARY KEY,
    deputy_id INTEGER NOT NULL REFERENCES deputies(cad_id) ON DELETE CASCADE,
    party_code TEXT NOT NULL,                  -- 'PS', 'PSD', 'CH', 'BE', etc.
    legislature TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,                             -- NULL = currently active

    CONSTRAINT uniq_deputy_party_period UNIQUE (deputy_id, party_code, legislature, start_date)
);

-- Deputy electoral districts
CREATE TABLE deputy_districts (
    id SERIAL PRIMARY KEY,
    deputy_id INTEGER NOT NULL REFERENCES deputies(cad_id) ON DELETE CASCADE,
    district_name TEXT NOT NULL,               -- 'Lisboa', 'Porto', 'Açores', etc.
    legislature TEXT NOT NULL,

    CONSTRAINT uniq_deputy_district_leg UNIQUE (deputy_id, legislature)
);

-- Deputy committee memberships
CREATE TABLE deputy_committees (
    id SERIAL PRIMARY KEY,
    deputy_id INTEGER NOT NULL REFERENCES deputies(cad_id) ON DELETE CASCADE,
    organ_type TEXT NOT NULL,                  -- 'committee', 'subcommittee', 'working_group'
    organ_id INTEGER,                          -- orgId from source
    committee_name TEXT NOT NULL,              -- Full name
    committee_sigla TEXT,                      -- Abbreviation
    role TEXT,                                 -- 'Presidente', 'Vice-Presidente', NULL (member)
    legislature TEXT NOT NULL,
    start_date DATE,
    end_date DATE,

    CONSTRAINT uniq_deputy_committee UNIQUE (deputy_id, organ_id, legislature)
);

-- Deputy situational status (temporal)
CREATE TABLE deputy_status (
    id SERIAL PRIMARY KEY,
    deputy_id INTEGER NOT NULL REFERENCES deputies(cad_id) ON DELETE CASCADE,
    status_description TEXT NOT NULL,          -- 'Em Funções', 'Renunciou', 'Faleceu', etc.
    legislature TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,                             -- NULL = current status

    raw_data JSONB
);

-- Indexes
CREATE INDEX idx_deputies_name ON deputies(parliamentary_name);
CREATE INDEX idx_deputies_name_fts ON deputies USING gin(to_tsvector('portuguese', parliamentary_name));

CREATE INDEX idx_deputy_parties_deputy ON deputy_parties(deputy_id);
CREATE INDEX idx_deputy_parties_party ON deputy_parties(party_code);
CREATE INDEX idx_deputy_parties_leg ON deputy_parties(legislature);

CREATE INDEX idx_deputy_districts_deputy ON deputy_districts(deputy_id);
CREATE INDEX idx_deputy_districts_leg ON deputy_districts(legislature);

CREATE INDEX idx_deputy_committees_deputy ON deputy_committees(deputy_id);
CREATE INDEX idx_deputy_committees_name ON deputy_committees(committee_name);
CREATE INDEX idx_deputy_committees_leg ON deputy_committees(legislature);
```

#### Ingestion Logic

**Step 1: Load biographical data from RegistoBiografico**

```python
def ingest_deputy_biography(record: dict, conn):
    """
    Ingest deputy biographical data.

    Args:
        record: Record from RegistoBiograficoXVII_json.txt
    """
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO deputies (
            cad_id, full_name, sex, birth_date,
            profession, education, published_works, awards,
            raw_data
        ) VALUES (
            %(CadId)s, %(CadNomeCompleto)s, %(CadSexo)s, %(CadDtNascimento)s,
            %(CadProfissao)s, %(CadHabilitacoes)s, %(CadObrasPublicadas)s, %(CadCondecoracoes)s,
            %(raw_data)s
        )
        ON CONFLICT (cad_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            sex = EXCLUDED.sex,
            birth_date = EXCLUDED.birth_date,
            profession = EXCLUDED.profession,
            education = EXCLUDED.education,
            published_works = EXCLUDED.published_works,
            awards = EXCLUDED.awards,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
    """, {
        'CadId': int(record['CadId']),
        'CadNomeCompleto': record.get('CadNomeCompleto'),
        'CadSexo': record.get('CadSexo'),
        'CadDtNascimento': record.get('CadDtNascimento'),
        'CadProfissao': record.get('CadProfissao'),
        'CadHabilitacoes': record.get('CadHabilitacoes'),
        'CadObrasPublicadas': record.get('CadObrasPublicadas'),
        'CadCondecoracoes': record.get('CadCondecoracoes'),
        'raw_data': json.dumps(record)
    })

    conn.commit()
```

**Step 2: Load deputy memberships from OrgaoComposicao**

```python
def ingest_orgao_composicao(data: dict, legislature: str, conn):
    """
    Ingest organ composition data (deputies, parties, committees).

    Args:
        data: Full OrgaoComposicaoXVII_json.txt content
        legislature: 'XVII'
    """
    cur = conn.cursor()

    # Process Plenario (all deputies)
    plenario = data.get('Plenario', {})
    composicao = plenario.get('Composicao', [])

    for deputy_record in composicao:
        cad_id = int(deputy_record['DepCadId'])

        # Update deputy parliamentary name (may not be in RegistoBiografico)
        cur.execute("""
            INSERT INTO deputies (cad_id, full_name, parliamentary_name, raw_data)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (cad_id) DO UPDATE SET
                parliamentary_name = COALESCE(EXCLUDED.parliamentary_name, deputies.parliamentary_name),
                updated_at = NOW()
        """, [
            cad_id,
            deputy_record.get('DepNomeCompleto'),
            deputy_record.get('DepNomeParlamentar'),
            json.dumps(deputy_record)
        ])

        # Insert party memberships
        for gp in deputy_record.get('DepGP', []):
            cur.execute("""
                INSERT INTO deputy_parties (
                    deputy_id, party_code, legislature, start_date, end_date
                ) VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (deputy_id, party_code, legislature, start_date) DO NOTHING
            """, [
                cad_id,
                gp['gpSigla'],
                legislature,
                gp.get('gpDtInicio'),
                gp.get('gpDtFim')
            ])

        # Insert electoral district
        if deputy_record.get('DepCPDes'):
            cur.execute("""
                INSERT INTO deputy_districts (
                    deputy_id, district_name, legislature
                ) VALUES (%s, %s, %s)
                ON CONFLICT (deputy_id, legislature) DO UPDATE SET
                    district_name = EXCLUDED.district_name
            """, [cad_id, deputy_record['DepCPDes'], legislature])

        # Insert status
        for situacao in deputy_record.get('DepSituacao', []):
            cur.execute("""
                INSERT INTO deputy_status (
                    deputy_id, status_description, legislature,
                    start_date, end_date, raw_data
                ) VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, [
                cad_id,
                situacao.get('sioDes'),
                legislature,
                situacao.get('sioDtInicio'),
                situacao.get('sioDtFim'),
                json.dumps(situacao)
            ])

    # Process Committees
    for committee in data.get('Comissoes', []):
        organ_id = committee['DetalheOrgao']['idOrgao']
        committee_name = committee['DetalheOrgao']['nomeSigla']
        committee_sigla = committee['DetalheOrgao']['siglaOrgao']

        for member in committee.get('HistoricoComposicao', []):
            cad_id = int(member['depCadId'])

            # Determine role
            role = None
            if member.get('depCargo'):
                role = member['depCargo'][0].get('carDes') if isinstance(member['depCargo'], list) else None

            cur.execute("""
                INSERT INTO deputy_committees (
                    deputy_id, organ_type, organ_id, committee_name,
                    committee_sigla, role, legislature
                ) VALUES (%s, 'committee', %s, %s, %s, %s, %s)
                ON CONFLICT (deputy_id, organ_id, legislature) DO UPDATE SET
                    committee_name = EXCLUDED.committee_name,
                    role = EXCLUDED.role
            """, [cad_id, organ_id, committee_name, committee_sigla, role, legislature])

    # Process SubCommittees (same pattern)
    for subcommittee in data.get('SubComissoes', []):
        # Similar logic to committees
        pass

    # Process Working Groups
    for working_group in data.get('GruposTrabalho', []):
        # Similar logic to committees
        pass

    conn.commit()
```

**Key Decisions:**
- ✅ **Temporal party memberships**: Deputies can change parties, track with start/end dates
- ✅ **Multiple sources**: RegistoBiografico for biography, OrgaoComposicao for relationships
- ✅ **Committee roles**: Normalize 'Presidente' vs regular member
- ✅ **Deputy status**: Track resignations, deaths, etc. (useful for historical accuracy)
- ❌ **Don't normalize**: Activity details, interventions (separate dataset/table later)

---

### 3. Agenda (Parliamentary Calendar)

**Source Files:**
- `AgendaParlamentar_json.txt` (34 records, 134 KB)

#### Database Schema

```sql
CREATE TABLE agenda_events (
    id SERIAL PRIMARY KEY,
    event_id TEXT UNIQUE,                      -- EventoId from source

    -- Event info
    title TEXT NOT NULL,                       -- EventoTitulo
    event_type TEXT,                           -- EventoTipo: 'Plenário', 'Comissão', etc.

    -- Temporal
    start_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,

    -- Location
    location TEXT,                             -- EventoLocal

    -- Categorization
    organ_type TEXT,                           -- 'plenario', 'committee', 'visit', etc.
    organ_name TEXT,                           -- Committee name if applicable

    -- Full event data
    raw_data JSONB NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agenda_date ON agenda_events(start_date);
CREATE INDEX idx_agenda_type ON agenda_events(event_type);
CREATE INDEX idx_agenda_organ ON agenda_events(organ_name);
```

#### Ingestion Logic

```python
def ingest_agenda_event(record: dict, conn):
    """Ingest agenda event."""
    cur = conn.cursor()

    # Parse date/time
    start_datetime = record.get('EventoDataHoraInicio')  # ISO format
    end_time = record.get('EventoDataHoraFim')

    cur.execute("""
        INSERT INTO agenda_events (
            event_id, title, event_type,
            start_date, start_time, end_time,
            location, organ_type, organ_name, raw_data
        ) VALUES (
            %(EventoId)s, %(EventoTitulo)s, %(EventoTipo)s,
            %(start_date)s, %(start_time)s, %(end_time)s,
            %(EventoLocal)s, %(organ_type)s, %(organ_name)s, %(raw_data)s
        )
        ON CONFLICT (event_id) DO UPDATE SET
            title = EXCLUDED.title,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
    """, {
        'EventoId': record.get('EventoId'),
        'EventoTitulo': record['EventoTitulo'],
        'EventoTipo': record.get('EventoTipo'),
        'start_date': start_datetime.split('T')[0] if start_datetime else None,
        'start_time': start_datetime.split('T')[1] if start_datetime and 'T' in start_datetime else None,
        'end_time': end_time.split('T')[1] if end_time and 'T' in end_time else None,
        'EventoLocal': record.get('EventoLocal'),
        'organ_type': classify_organ_type(record),
        'organ_name': extract_organ_name(record),
        'raw_data': json.dumps(record)
    })

    conn.commit()

def classify_organ_type(record: dict) -> str:
    """Classify event by organ type based on EventoTipo."""
    tipo = record.get('EventoTipo', '').lower()
    if 'plenário' in tipo:
        return 'plenario'
    elif 'comissão' in tipo or 'comissao' in tipo:
        return 'committee'
    elif 'visita' in tipo:
        return 'visit'
    else:
        return 'other'
```

**Key Decisions:**
- ✅ **Minimal normalization**: Agenda is mostly display-only, keep simple
- ✅ **Temporal indexing**: Primary use case is "events between dates"
- ❌ **Don't normalize**: Event details, related initiatives (keep in JSONB)

---

### 4. Future Datasets (Not Yet Ingested)

#### AtividadeDeputado (Deputy Activity)
**File:** `AtividadeDeputadoXVII_json.txt` (14 MB)

**Ingestion Strategy:** LOW PRIORITY
- Complex nested structure
- Use case unclear (need product requirements first)
- Keep in staging area until we know what queries we need

#### Intervencoes (Parliamentary Interventions)
**File:** `IntervencoesXVII_json.txt` (4.4 MB)

**Potential Schema:**
```sql
CREATE TABLE interventions (
    id SERIAL PRIMARY KEY,
    deputy_id INTEGER REFERENCES deputies(cad_id),
    session_id INTEGER,
    intervention_date DATE,
    intervention_text TEXT,              -- Full text for search
    raw_data JSONB
);
```

**Ingestion Strategy:** MEDIUM PRIORITY
- Useful for deputy profiles ("recent speeches")
- Full-text search on intervention content
- Wait until deputy profiles are built

#### Diplomas (Approved Laws)
**File:** `DiplomasXVII_json.txt` (456 KB)

**Potential Schema:**
```sql
CREATE TABLE diplomas (
    id SERIAL PRIMARY KEY,
    diploma_id TEXT UNIQUE,
    diploma_type TEXT,
    title TEXT,
    publication_date DATE,
    iniciativa_id INTEGER REFERENCES iniciativas(id),  -- Link back to initiative
    raw_data JSONB
);
```

**Ingestion Strategy:** MEDIUM PRIORITY
- Natural extension of iniciativas
- Shows final outcome of legislative process
- Ingest after iniciativas are stable

---

## Ingestion Pipeline

### File Organization

```
scripts/
├── loaders/
│   ├── __init__.py
│   ├── base.py                    # Shared utilities
│   ├── load_iniciativas.py        # Iniciativas loader
│   ├── load_deputies.py           # Deputy biographical data
│   ├── load_orgao_composicao.py   # Deputy relationships
│   └── load_agenda.py             # Agenda events
├── schema/
│   ├── 01_core.sql                # Legislatures, base tables
│   ├── 02_deputies.sql            # Deputy tables
│   ├── 03_iniciativas.sql         # Initiative tables
│   ├── 04_agenda.sql              # Agenda table
│   └── 05_indexes.sql             # All indexes
└── migrations/
    ├── 001_normalize_authors.sql  # Migrate existing data
    └── 002_add_deputies.sql       # Add deputy tables
```

### Master Ingestion Script

```python
#!/usr/bin/env python3
"""
Master data ingestion script.

Usage:
    python scripts/ingest_all.py --legislature XVII
    python scripts/ingest_all.py --all-legislatures
"""

import argparse
from loaders.load_iniciativas import ingest_iniciativas
from loaders.load_deputies import ingest_deputies
from loaders.load_orgao_composicao import ingest_orgao_composicao
from loaders.load_agenda import ingest_agenda

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--legislature', choices=['XIV', 'XV', 'XVI', 'XVII'])
    parser.add_argument('--all-legislatures', action='store_true')
    parser.add_argument('--dataset', choices=['iniciativas', 'deputies', 'agenda', 'all'])
    args = parser.parse_args()

    legislatures = ['XIV', 'XV', 'XVI', 'XVII'] if args.all_legislatures else [args.legislature]

    for leg in legislatures:
        print(f"\n=== Processing Legislature {leg} ===")

        if args.dataset in ['iniciativas', 'all']:
            print(f"Loading iniciativas...")
            ingest_iniciativas(leg)

        if args.dataset in ['deputies', 'all']:
            print(f"Loading deputies...")
            ingest_deputies(leg)
            ingest_orgao_composicao(leg)

        if args.dataset in ['agenda', 'all'] and leg == 'XVII':
            print(f"Loading agenda...")
            ingest_agenda()

    print("\n✅ Ingestion complete")

if __name__ == '__main__':
    main()
```

---

## Data Quality & Validation

### Validation Rules

After each ingestion, run validation queries:

```sql
-- Check for orphaned authors
SELECT COUNT(*) FROM initiative_authors ia
LEFT JOIN iniciativas i ON ia.iniciativa_id = i.id
WHERE i.id IS NULL;

-- Check for deputies in initiative_authors but not in deputies table
SELECT COUNT(*) FROM initiative_authors ia
WHERE ia.author_type = 'deputy'
    AND ia.deputy_id NOT IN (SELECT cad_id FROM deputies);

-- Check for initiatives without authors
SELECT ini_id, title FROM iniciativas
WHERE id NOT IN (SELECT DISTINCT iniciativa_id FROM initiative_authors);

-- Check for initiatives without events
SELECT ini_id, title FROM iniciativas
WHERE id NOT IN (SELECT DISTINCT iniciativa_id FROM iniciativa_events);

-- Check for date consistency
SELECT ini_id, title FROM iniciativas i
WHERE start_date > (
    SELECT MIN(event_date) FROM iniciativa_events
    WHERE iniciativa_id = i.id
);
```

### Data Transformation Log

Each loader should log transformations:

```python
import logging

logging.basicConfig(
    filename='data/logs/ingestion.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def ingest_iniciativa(record, legislature, conn):
    logger.info(f"Ingesting {record['IniId']} from legislature {legislature}")

    # ... ingestion logic ...

    logger.info(f"Inserted {num_authors} authors for {record['IniId']}")
    logger.info(f"Inserted {num_events} events for {record['IniId']}")
```

---

## Migration from Current Schema

### Step 1: Backup Current Data

```sql
-- Create backup tables
CREATE TABLE iniciativas_backup AS SELECT * FROM iniciativas;
CREATE TABLE iniciativa_events_backup AS SELECT * FROM iniciativa_events;
```

### Step 2: Add New Tables

```bash
psql $DATABASE_URL < scripts/schema/02_deputies.sql
psql $DATABASE_URL < scripts/schema/03_iniciativas_enhanced.sql
```

### Step 3: Migrate Data

```bash
python scripts/migrations/001_normalize_authors.py
```

### Step 4: Verify

```sql
-- Count should match
SELECT COUNT(*) FROM iniciativas;
SELECT COUNT(*) FROM iniciativas_backup;

-- Spot check a few records
SELECT * FROM initiative_authors WHERE iniciativa_id = (SELECT id FROM iniciativas WHERE ini_id = '315045');
```

### Step 5: Drop Backup (After Verification)

```sql
DROP TABLE iniciativas_backup;
DROP TABLE iniciativa_events_backup;
```

---

## Summary

### What We Decided

1. **Initiative Authorship**: Unified polymorphic table (`initiative_authors`) with type discriminator
2. **Deputy Data**: Temporal party memberships, committee assignments, biographical info
3. **Normalization Strategy**: Normalize queryable fields, keep JSONB for source truth
4. **Ingestion Pattern**: Idempotent UPSERT scripts, one loader per dataset

### What We're Building

**Foundation tables (HIGH PRIORITY):**
- ✅ `iniciativas` - Enhanced with normalized fields
- ✅ `initiative_authors` - Polymorphic author relationships
- ✅ `iniciativa_events` - Already exists, enhanced
- ✅ `deputies` - Core deputy data
- ✅ `deputy_parties` - Temporal party memberships
- ✅ `deputy_districts` - Electoral districts
- ✅ `deputy_committees` - Committee assignments

**Future tables (LOW PRIORITY):**
- ⏳ `interventions` - Parliamentary speeches
- ⏳ `diplomas` - Approved laws
- ⏳ `votes` - Voting records

### Next Steps

1. Review and approve this design
2. Implement Phase 1: Normalize initiative authors
3. Implement Phase 2: Load deputy data
4. Update API endpoints to use new tables
5. Verify frontend still works
6. Monitor query performance
