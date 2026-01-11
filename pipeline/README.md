# Viriato Data Pipeline

Scripts for downloading, transforming, and loading Portuguese Parliament data into PostgreSQL.

## Overview

The pipeline transforms raw JSON data from parlamento.pt into a structured PostgreSQL database that powers the Viriato web and mobile apps.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `psycopg2-binary` - PostgreSQL adapter
- `requests` - For downloading datasets
- `python-dotenv` - For environment variables (optional)

### 2. Set Up PostgreSQL Database

**Option A: Local PostgreSQL**

```bash
# Install PostgreSQL (if not already installed)
# macOS: brew install postgresql
# Windows: Download from postgresql.org
# Linux: apt-get install postgresql

# Create database
createdb viriato

# Set environment variable
export DATABASE_URL="postgresql://localhost/viriato"
```

**Option B: Render.com (Production)**

```bash
# Create PostgreSQL database in Render dashboard
# Copy connection string from Render

export DATABASE_URL="postgresql://user:pass@hostname.render.com/dbname"
```

**Option C: Use .env file (Recommended for development)**

Create `.env` file in project root:

```env
DATABASE_URL=postgresql://localhost/viriato
```

### 3. Create Database Schema

```bash
# Apply schema (creates tables and indexes)
psql $DATABASE_URL -f pipeline/schema.sql
```

Or if using `.env`:

```bash
source .env
psql $DATABASE_URL -f pipeline/schema.sql
```

### 4. Download Latest Data

```bash
# Downloads all 17 datasets from parlamento.pt
python pipeline/download_datasets.py
```

This creates/updates files in `data/raw/`:
- `IniciativasXVII_json.txt` (18 MB)
- `AgendaParlamentar_json.txt` (134 KB)
- ... and 15 more datasets

### 5. Load Data into PostgreSQL

```bash
# Load iniciativas, events, and agenda
python pipeline/load_to_postgres.py
```

Expected output:
```
=== Loading Iniciativas ===
Found 808 iniciativas
Transformed 808 iniciativas
Transformed ~5000 events
Inserting iniciativas...
Inserted/updated 808 iniciativas
Inserting events...
Inserted 5000 events
✓ Iniciativas loaded successfully

=== Loading Agenda ===
Found 34 agenda events
Inserted/updated 34 agenda events
✓ Agenda loaded successfully

=== Database Statistics ===
Iniciativas: 808 total, 94 completed
Events: 5000
Agenda: 34
```

## Scripts Overview

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `download_datasets.py` | Fetch raw data | parlamento.pt API | `data/raw/*.txt` |
| `load_to_postgres.py` | Load initiatives + agenda | JSON files | `iniciativas`, `iniciativa_events`, `agenda_events` |
| `load_deputados.py` | Load deputies | JSON files | `deputados`, `deputados_bio` |
| `load_orgaos.py` | Load committees | JSON files | `orgaos`, `orgao_membros` |
| `load_committee_links.py` | Link initiatives to committees | DB queries | `comissao_iniciativa_links` |
| `load_authors.py` | Link initiatives to authors | DB queries | `iniciativa_autores` |
| `schema.sql` | Database schema | - | All tables |

### `download_datasets.py`

Downloads all 17 datasets from Portuguese Parliament open data portal.

```bash
python pipeline/download_datasets.py
```

Saves to `data/raw/` directory.

### `load_to_postgres.py`

Loads initiatives and agenda from JSON into PostgreSQL.

**What it does:**
- Reads `IniciativasXVII_json.txt` and `AgendaParlamentar_json.txt`
- Transforms nested JSON to flat table structure
- Uses UPSERT for safe re-runs
- Extracts 60+ legislative phases into `iniciativa_events`

### `load_deputados.py`

Loads deputy data into two tables:
- `deputados` - Core identity (name, party, district)
- `deputados_bio` - Biographical data (gender, age, profession)

### `load_orgaos.py`

Loads parliamentary committees:
- `orgaos` - Committee info (name, type, legislature)
- `orgao_membros` - Committee membership with roles

### `load_committee_links.py`

Creates links between initiatives and committees based on:
- Direct committee assignments in initiative data
- Phase events mentioning committee names

### `schema.sql`

Creates all database tables with:
- JSONB columns for raw data preservation
- Full-text search indexes (Portuguese)
- Foreign key relationships
- Triggers for computed fields

## Update Workflow

### Weekly Updates (Current)

```bash
# 1. Download latest data
python pipeline/download_datasets.py

# 2. Load into database (UPSERT mode)
python pipeline/load_to_postgres.py
```

### Future: Automated Daily Updates

**Option A: GitHub Actions**

Create `.github/workflows/update-data.yml`:

```yaml
name: Update Parliament Data

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:      # Manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install -r requirements.txt
      - run: python pipeline/download_datasets.py
      - run: python pipeline/load_to_postgres.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Option B: Cron job (if hosting on server)**

```cron
0 2 * * * cd /path/to/viriato && python pipeline/download_datasets.py && python pipeline/load_to_postgres.py
```

## Testing Queries

After loading data, test with these SQL queries:

### 1. Count iniciativas by type

```sql
SELECT type_description, COUNT(*)
FROM iniciativas
GROUP BY type_description
ORDER BY COUNT(*) DESC;
```

### 2. Search iniciativas (full-text)

```sql
SELECT ini_id, title, current_status
FROM iniciativas
WHERE to_tsvector('portuguese', title) @@ to_tsquery('portuguese', 'saúde')
LIMIT 10;
```

### 3. Get initiative timeline

```sql
SELECT
    i.title,
    e.phase_name,
    e.event_date,
    e.committee
FROM iniciativas i
JOIN iniciativa_events e ON i.id = e.iniciativa_id
WHERE i.ini_id = '315506'
ORDER BY e.order_index;
```

### 4. Upcoming agenda events

```sql
SELECT title, section, start_date, location
FROM agenda_events
WHERE start_date >= CURRENT_DATE
ORDER BY start_date, start_time
LIMIT 10;
```

## Troubleshooting

### "DATABASE_URL environment variable not set"

```bash
# Set it temporarily
export DATABASE_URL="postgresql://localhost/viriato"

# Or create .env file
echo 'DATABASE_URL=postgresql://localhost/viriato' > .env
```

### "File not found: IniciativasXVII_json.txt"

```bash
# Download data first
python pipeline/download_datasets.py
```

### "relation 'iniciativas' does not exist"

```bash
# Create schema first
psql $DATABASE_URL -f pipeline/schema.sql
```

### psycopg2 installation fails

```bash
# Use binary version (no compilation needed)
pip install psycopg2-binary
```

### Can't connect to PostgreSQL

```bash
# Test connection
psql $DATABASE_URL

# If fails, check:
# - Is PostgreSQL running?
# - Is DATABASE_URL correct?
# - Are credentials valid?
```

## File Sizes

After loading all data:

| Table | Rows | Size (approx) |
|-------|------|---------------|
| iniciativas | 808 | ~2 MB |
| iniciativa_events | ~5,000 | ~10 MB |
| agenda_events | 34 | ~50 KB |
| **Total** | | **~12 MB** |

With indexes: ~25 MB total
With raw_data JSONB: ~50 MB total

Well under Render.com's 1 GB free tier limit.

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |

## Domain Knowledge

Understanding the raw data requires knowledge of the Portuguese legislative process:

- **60+ legislative phases** - Mapped to 7 simplified statuses in the frontend
- **7 initiative types** - P (Proposta de Lei), J (Projeto de Lei), R (Resolução), etc.
- **Party spectrum** - Left-to-right ordering for hemicycle visualizations

See documentation:
- `docs/iniciativas-lifecycle.md` - All 60 phases explained
- `docs/data-entity-relationships.md` - Database entity relationships
- `data/schemas/` - JSON schemas for raw Parliament data

## Full Pipeline Run

To refresh all data:

```bash
# 1. Download fresh data
python pipeline/download_datasets.py

# 2. Load in order (dependencies matter)
python pipeline/load_to_postgres.py      # Initiatives + agenda
python pipeline/load_deputados.py        # Deputies
python pipeline/load_orgaos.py           # Committees
python pipeline/load_committee_links.py  # Committee-initiative links
python pipeline/load_authors.py          # Author links
```
