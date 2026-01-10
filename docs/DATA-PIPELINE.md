# Data Pipeline Reference

**The authoritative reference for Viriato's data processing pipeline.**

> This document describes how raw data from the Portuguese Parliament's open data portal flows through scripts into the database and ultimately to the frontend.

---

## Table of Contents

1. [Data Flow Overview](#data-flow-overview)
2. [Dataset Inventory](#dataset-inventory)
3. [Pipeline Execution](#pipeline-execution)
4. [Script Reference](#script-reference)
5. [Database Schema](#database-schema)
6. [Field Mappings](#field-mappings)
7. [API Endpoints](#api-endpoints)

---

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PORTUGUESE PARLIAMENT                                │
│                      parlamento.pt (Open Data Portal)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ download_datasets.py
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAW DATA (data/raw/)                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │IniciativasXVII   │  │InformacaoBaseXVII│  │AgendaParlamentar │           │
│  │    (35 MB)       │  │    (546 KB)      │  │    (134 KB)      │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │OrgaoComposicao   │  │RegistoBiografico │  │  + 16 more...    │           │
│  │    (2.2 MB)      │  │    (653 KB)      │  │                  │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
         load_to_postgres.py  load_deputados.py  load_orgaos.py
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL DATABASE                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ iniciativas  │  │  deputados   │  │    orgaos    │  │ agenda_events│     │
│  │ (6,748 rows) │  │ (1,446 rows) │  │  (122 rows)  │  │  (69 rows)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │iniciativa_   │  │deputados_bio │  │orgao_membros │  │iniciativa_   │     │
│  │  events      │  │  (330 rows)  │  │ (1200 rows)  │  │  comissao    │     │
│  │ (5000 rows)  │  │              │  │              │  │ (1500 rows)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ api/app.py (Flask)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REST API                                        │
│  /api/iniciativas  /api/deputados  /api/comissoes  /api/agenda              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ fetch()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (docs/)                                   │
│                     index.html + app.js + styles.css                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dataset Inventory

### Currently Loaded (6 datasets)

| Dataset | Raw File | Size | Loader Script | Target Table(s) | Status |
|---------|----------|------|---------------|-----------------|--------|
| **Iniciativas XVII** | `IniciativasXVII_json.txt` | 35 MB | `load_to_postgres.py` | `iniciativas`, `iniciativa_events`, `iniciativa_comissao` | ✅ Loaded |
| **Informacao Base XVII** | `InformacaoBaseXVII_json.txt` | 546 KB | `load_deputados.py` | `deputados` (1,446 rows) | ✅ Loaded |
| **Registo Biografico XVII** | `RegistoBiograficoXVII_json.txt` | 653 KB | `load_deputados.py` | `deputados_bio` (330 rows) | ✅ Loaded |
| **Orgao Composicao XVII** | `OrgaoComposicaoXVII_json.txt` | 2.2 MB | `load_orgaos.py` | `orgaos`, `orgao_membros` | ✅ Loaded |
| **Agenda Parlamentar** | `AgendaParlamentar_json.txt` | 134 KB | `load_to_postgres.py` | `agenda_events` | ✅ Loaded |
| **Iniciativas XIV-XVI** | `IniciativasXIV/XV/XVI_json.txt` | 152 MB | `load_to_postgres.py` | `iniciativas`, `iniciativa_events` | ✅ Loaded |

### Not Yet Loaded (15 datasets)

| Dataset | Raw File | Size | Priority | Potential Use |
|---------|----------|------|----------|---------------|
| AtividadeDeputado XVII | `AtividadeDeputadoXVII_json.txt` | 14 MB | LOW | Deputy activity metrics |
| Intervencoes XVII | `IntervencoesXVII_json.txt` | 4.4 MB | MEDIUM | Parliamentary speeches |
| Diplomas XVII | `DiplomasXVII_json.txt` | 456 KB | MEDIUM | Final approved laws |
| Requerimentos XVII | `RequerimentosXVII_json.txt` | 2.5 MB | LOW | Parliamentary requests |
| OE2026 Orcamento | `OE2026Or_json.txt` | 2.6 MB | LOW | Budget proposals |
| Atividades XVII | `AtividadesXVII_json.txt` | 547 KB | LOW | Activity records |
| Peticoes XVII | `PeticoesXVII_json.txt` | 239 KB | LOW | Public petitions |
| Registo Interesses XVII | `RegistoInteressesXVII_json.txt` | 416 KB | LOW | Deputy interests |
| Delegacao Permanente XVII | `DelegacaoPermanenteXVII_json.txt` | 15 KB | LOW | Permanent delegations |
| Delegacao Eventual XVII | `DelegacaoEventualXVII_json.txt` | 19 KB | LOW | Event delegations |
| Grupo Amizade XVII | `GrupoDeAmizadeXVII_json.txt` | 13 KB | LOW | Friendship groups |
| Reunioes Visitas XVII | `ReunioesVisitasXVII_json.txt` | 21 KB | LOW | Meetings/visits |

---

## Pipeline Execution

### Quick Start (Fresh Setup)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set database connection
export DATABASE_URL="postgresql://localhost/viriato"

# 3. Create schema
psql $DATABASE_URL -f scripts/schema.sql

# 4. Download latest data from Parliament
python scripts/download_datasets.py

# 5. Load all data
python scripts/load_to_postgres.py      # Iniciativas + Agenda
python scripts/load_deputados.py        # Deputies
python scripts/load_orgaos.py           # Committees
python scripts/load_committee_links.py  # Committee-Initiative links
python scripts/load_authors.py          # Author normalization
```

### Update Workflow (Weekly/Daily)

```bash
# 1. Download fresh data
python scripts/download_datasets.py

# 2. Reload (UPSERT mode - safe to re-run)
python scripts/load_to_postgres.py
python scripts/load_deputados.py
python scripts/load_orgaos.py
```

### Execution Order (Dependencies)

```
1. schema.sql              # Must run first (creates tables)
   │
2. load_to_postgres.py     # Iniciativas (no dependencies)
   │
3. load_deputados.py       # Deputies (no dependencies)
   │
4. load_orgaos.py          # Committees (no dependencies)
   │
5. load_committee_links.py # Requires: iniciativas, orgaos
   │
6. load_authors.py         # Requires: iniciativas, deputados
```

---

## Script Reference

### `scripts/download_datasets.py`

**Purpose:** Download all datasets from parlamento.pt open data portal.

**Input:** Parliament API endpoints
**Output:** `data/raw/*.txt` files
**Idempotent:** Yes (overwrites existing files)

```bash
python scripts/download_datasets.py
# Downloads 17 datasets to data/raw/
# Creates data/manifest.json with download metadata
```

### `scripts/schema.sql`

**Purpose:** Create database schema with all tables, indexes, and triggers.

**Tables Created:**
- `iniciativas` - Legislative initiatives
- `iniciativa_events` - Initiative lifecycle events
- `agenda_events` - Parliamentary calendar
- `agenda_initiative_links` - Agenda-to-initiative links
- `orgaos` - Parliamentary bodies (committees)
- `orgao_membros` - Committee members
- `iniciativa_comissao` - Initiative-committee links
- `iniciativa_conjunta` - Initiative-to-initiative links
- `iniciativa_autores` - Author relationships
- `deputados` - Deputies with biographical data

```bash
psql $DATABASE_URL -f scripts/schema.sql
```

### `scripts/load_to_postgres.py`

**Purpose:** Load initiatives and agenda into database.

**Input Files:**
- `data/raw/IniciativasXVII_json.txt` (and XIV, XV, XVI)
- `data/raw/AgendaParlamentar_json.txt`

**Target Tables:**
- `iniciativas`
- `iniciativa_events`
- `agenda_events`

**Transformations:**
- Extracts events from nested `IniEventos` array
- Computes `current_status` from latest event
- Parses dates to PostgreSQL format
- Preserves `raw_data` as JSONB

```bash
python scripts/load_to_postgres.py
# Expected: ~6,748 iniciativas (all legislatures), ~57,000 events, ~69 agenda events
```

### `scripts/load_deputados.py`

**Purpose:** Load deputies with biographical enrichment.

**Input Files:**
- `data/raw/InformacaoBaseXVII_json.txt` (primary)
- `data/raw/RegistoBiograficoXVII_json.txt` (enrichment)

**Target Tables:**
- `deputados`

**Transformations:**
- Joins InformacaoBase with RegistoBiografico on `DepCadId`
- Extracts current party from `DepGP` array
- Extracts situation (Efetivo, Suspenso, etc.)
- Filters by situation parameter (default: Efetivo)

```bash
python scripts/load_deputados.py
# Expected: ~230 deputies (Efetivo only) or ~330 (all)
```

### `scripts/load_orgaos.py`

**Purpose:** Load committees and their members.

**Input Files:**
- `data/raw/OrgaoComposicaoXVII_json.txt`

**Target Tables:**
- `orgaos`
- `orgao_membros`

**Transformations:**
- Extracts committees, subcommittees, working groups
- Normalizes member roles (Presidente, Vice-Presidente, etc.)
- Links members to their party affiliations

```bash
python scripts/load_orgaos.py
# Expected: ~122 orgaos, ~1200 members
```

### `scripts/load_committee_links.py`

**Purpose:** Create initiative-to-committee relationships.

**Input:** Database tables (`iniciativas`, `orgaos`)
**Target Tables:** `iniciativa_comissao`

**Transformations:**
- Extracts committee assignments from initiative events
- Classifies link type: 'lead', 'secondary', 'author'
- Matches committee names to `orgaos` table

```bash
python scripts/load_committee_links.py
# Expected: ~1500 committee-initiative links
```

### `scripts/load_authors.py`

**Purpose:** Normalize author relationships.

**Input:** Database tables (`iniciativas`, `deputados`)
**Target Tables:** `iniciativa_autores`

**Transformations:**
- Extracts authors from `raw_data->IniAutorGruposParlamentares`
- Extracts deputies from `raw_data->IniAutorDeputados`
- Links to `deputados` table by `dep_cad_id`

```bash
python scripts/load_authors.py
```

---

## Database Schema

### Entity Relationship Diagram

```
                    ┌───────────────────┐
                    │    deputados      │  ← InformacaoBase (1,446 rows)
                    │ (core identity)   │     dep_id, name, party, situation
                    └─────────┬─────────┘
                              │ dep_cad_id
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ deputados_bio   │  │ orgao_membros   │  │iniciativa_      │
│  (330 rows)     │  │ (1200 members)  │  │  autores        │
│ ← RegistoBio    │  └────────┬────────┘  └────────┬────────┘
└─────────────────┘           │                    │
                              │ orgao_id           │ iniciativa_id
                              ▼                    ▼
                    ┌─────────────────┐  ┌─────────────────┐
                    │     orgaos      │  │   iniciativas   │
                    │ (122 committees)│  │(6,748 initiatives)│
                    └────────┬────────┘  └────────┬────────┘
                             │                    │
         │                    ├──────────────────┐
         │                    │                  │
         ▼                    ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ iniciativa_     │  │ iniciativa_     │  │ iniciativa_     │
│   comissao      │  │   events        │  │   conjunta      │
│ (1500 links)    │  │ (5000 events)   │  │ (joint inits)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│  agenda_events  │◄──────│agenda_initiative│
│  (69 events)    │       │    _links       │
└─────────────────┘       └─────────────────┘
```

### Table Summary

| Table | Rows | Description |
|-------|------|-------------|
| `iniciativas` | 6,748 | Legislative initiatives (XIV-XVII legislatures) |
| `iniciativa_events` | ~5,000 | Lifecycle events per initiative |
| `iniciativa_comissao` | ~1,500 | Initiative-committee relationships |
| `iniciativa_conjunta` | ~200 | Joint initiative links |
| `iniciativa_autores` | ~1,000 | Author (party/deputy) relationships |
| `deputados` | 1,446 | All deputies from InformacaoBase (230 serving) |
| `deputados_bio` | 330 | Biographical data from RegistoBiografico |
| `orgaos` | 122 | Committees, working groups |
| `orgao_membros` | ~1,200 | Committee membership |
| `agenda_events` | 69 | Parliamentary calendar |
| `agenda_initiative_links` | ~100 | Agenda-initiative links |

---

## Field Mappings

### Iniciativas: JSON → Database

| Source JSON Field | Database Column | Transformation |
|-------------------|-----------------|----------------|
| `IniId` | `ini_id` | Direct copy |
| `IniNr` | `number` | Direct copy |
| `IniTipo` | `type` | Direct copy (P, R, D, etc.) |
| `IniDescTipo` | `type_description` | Direct copy |
| `IniTitulo` | `title` | Direct copy |
| `DataInicioleg` | `start_date` | Parse to DATE |
| `DataFimleg` | `end_date` | Parse to DATE |
| `IniLinkTexto` | `text_link` | Direct copy |
| `IniEventos[-1].Fase` | `current_status` | Last event's phase name |
| `IniEventos[-1].CodigoFase` | `current_phase_code` | Last event's phase code |
| (derived) | `is_completed` | True if final phase |
| `IniAutorOutros.nome` | `author_name` | For government/other authors |
| `IniAutorGruposParlamentares[0].GP` | `author_name` | For party authors |
| (entire record) | `raw_data` | Full JSON as JSONB |

### Iniciativa Events: JSON → Database

| Source JSON Field | Database Column | Transformation |
|-------------------|-----------------|----------------|
| `IniEventos[].EvtId` | `evt_id` | Direct copy |
| `IniEventos[].OevId` | `oev_id` | Direct copy |
| `IniEventos[].CodigoFase` | `phase_code` | Direct copy |
| `IniEventos[].Fase` | `phase_name` | Direct copy |
| `IniEventos[].DataFase` | `event_date` | Parse to DATE |
| `IniEventos[].Comissao.ComDes` | `committee` | Extracted from nested object |
| `IniEventos[].ObsFase` | `observations` | Direct copy |
| (array index) | `order_index` | 0, 1, 2, ... |
| (entire event) | `raw_data` | Full event JSON as JSONB |

### Deputados (from InformacaoBase): JSON → Database

| Source JSON Field | Database Column | Notes |
|-------------------|-----------------|-------|
| `DepId` | `dep_id` | Unique deputy ID |
| `DepCadId` | `dep_cad_id` | Links to `deputados_bio.cad_id` |
| `DepNomeParlamentar` | `name` | Parliamentary name |
| `DepNomeCompleto` | `full_name` | Full legal name |
| `DepGP[0].gpSigla` | `party` | Current party (active GP entry) |
| `DepCPId` | `circulo_id` | Electoral district ID |
| `DepCPDes` | `circulo` | Electoral district name |
| `DepSituacao[0].sioDes` | `situation` | Efetivo, Suplente, Suspenso(Eleito), etc. |
| `DepSituacao[0].sioDtInicio` | `situation_start` | Situation start date |
| `DepSituacao[0].sioDtFim` | `situation_end` | Situation end date (NULL if current) |
| (entire record) | `raw_data` | Full JSON as JSONB |

### Deputados_bio (from RegistoBiografico): JSON → Database

| Source JSON Field | Database Column | Notes |
|-------------------|-----------------|-------|
| `CadId` | `cad_id` | Links to `deputados.dep_cad_id` |
| `CadNomeCompleto` | `full_name` | Full legal name |
| `CadSexo` | `gender` | 'M' or 'F' |
| `CadDtNascimento` | `birth_date` | Date of birth |
| `CadProfissao` | `profession` | Professional background |
| `CadHabilitacoes` | `education` | Educational qualifications |
| `CadObrasPublicadas` | `published_works` | Published works |
| `CadCondecoracoes` | `awards` | Awards and honors |
| `CadTitulos` | `titles` | Titles held |
| (entire record) | `raw_data` | Full JSON as JSONB |

### Orgaos (Committees): JSON → Database

| Source JSON Field | Database Column | Transformation |
|-------------------|-----------------|----------------|
| `DetalheOrgao.idOrgao` | `org_id` | Direct copy |
| `DetalheOrgao.nomeSigla` | `name` | Full committee name |
| `DetalheOrgao.siglaOrgao` | `acronym` | Abbreviation |
| `DetalheOrgao.numeroOrgao` | `number` | Committee number |
| (derived) | `org_type` | 'comissao', 'subcomissao', 'grupo_trabalho' |
| (entire record) | `raw_data` | Full JSON as JSONB |

### Orgao Membros: JSON → Database

| Source JSON Field | Database Column | Transformation |
|-------------------|-----------------|----------------|
| `HistoricoComposicao[].depId` | `dep_id` | Direct copy |
| `HistoricoComposicao[].depCadId` | `dep_cad_id` | Direct copy |
| `HistoricoComposicao[].depNomeParlamentar` | `deputy_name` | Direct copy |
| `HistoricoComposicao[].gpSigla` | `party` | Direct copy |
| `HistoricoComposicao[].depCargo[0].carDes` | `role` | Presidente, Vice-Presidente, etc. |
| `HistoricoComposicao[].sioTipMem` | `member_type` | Efetivo, Suplente |
| (entire record) | `raw_data` | Full JSON as JSONB |

---

## API Endpoints

### `/api/iniciativas`

**Database Query:**
```sql
SELECT id, ini_id, title, type, type_description, author_name,
       start_date, current_status, is_completed, text_link
FROM iniciativas
WHERE legislature = 'XVII'
ORDER BY start_date DESC;
```

**Response includes:**
- Initiative metadata
- `raw_data` for detail views
- Event timeline from `iniciativa_events`

### `/api/deputados`

**Query Parameters:**
- `serving=true` (default) - Returns 230 serving deputies (Efetivo + Efetivo Temporário + Efetivo Definitivo)
- `serving=false` - Returns non-serving deputies (Suplente, Suspenso, etc.)
- `serving=all` - Returns all 1,446 deputies
- `situation=X` - Filter by exact situation (overrides `serving`)

**Database Query:**
```sql
SELECT d.id, d.dep_id, d.name, d.full_name, d.party, d.circulo,
       b.gender, b.birth_date, b.profession, d.situation
FROM deputados d
LEFT JOIN deputados_bio b ON d.dep_cad_id = b.cad_id
WHERE d.legislature = 'XVII'
  AND d.situation IN ('Efetivo', 'Efetivo Temporário', 'Efetivo Definitivo')
ORDER BY d.party, d.name;
```

**Response includes:**
- Deputy metadata (joined from both tables)
- Party summary counts
- Gender distribution
- Committee memberships

### `/api/comissoes`

**Database Query:**
```sql
SELECT o.id, o.org_id, o.name, o.acronym, o.org_type,
       COUNT(DISTINCT m.dep_id) as member_count
FROM orgaos o
LEFT JOIN orgao_membros m ON o.id = m.orgao_id
WHERE o.legislature = 'XVII'
GROUP BY o.id
ORDER BY o.name;
```

### `/api/agenda`

**Database Query:**
```sql
SELECT id, event_id, title, section, start_date, start_time,
       location, committee
FROM agenda_events
WHERE start_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY start_date, start_time;
```

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| "DATABASE_URL not set" | `export DATABASE_URL="postgresql://localhost/viriato"` |
| "File not found" | Run `python scripts/download_datasets.py` first |
| "relation does not exist" | Run `psql $DATABASE_URL -f scripts/schema.sql` |
| Deputy count mismatch | Check `situation` filter in API (Efetivo vs all) |
| Missing committee links | Run `python scripts/load_committee_links.py` |

### Validation Queries

```sql
-- Check record counts
SELECT 'iniciativas' as table_name, COUNT(*) FROM iniciativas
UNION ALL SELECT 'deputados', COUNT(*) FROM deputados
UNION ALL SELECT 'orgaos', COUNT(*) FROM orgaos
UNION ALL SELECT 'agenda_events', COUNT(*) FROM agenda_events;

-- Check for orphaned events
SELECT COUNT(*) FROM iniciativa_events ie
LEFT JOIN iniciativas i ON ie.iniciativa_id = i.id
WHERE i.id IS NULL;

-- Check deputy-initiative author links
SELECT COUNT(*) FROM iniciativa_autores
WHERE author_type = 'deputy' AND deputy_id IS NOT NULL;
```

---

## Related Documentation

- `scripts/README.md` - Quick start and troubleshooting
- `docs/data-ingestion-strategy.md` - Database design decisions
- `docs/data-ingestion-design.md` - Detailed ingestion logic
- `docs/iniciativas-lifecycle.md` - Legislative process explained
- `docs/data-dictionary.md` - Field definitions
- `data/schemas/` - JSON schemas for all datasets

---

*Last updated: 2026-01-10*
