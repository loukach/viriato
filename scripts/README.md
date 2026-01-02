# Viriato Scripts - Database Setup & Data Loading

Scripts for managing Portuguese Parliament data in PostgreSQL.

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
psql $DATABASE_URL -f scripts/schema.sql
```

Or if using `.env`:

```bash
source .env
psql $DATABASE_URL -f scripts/schema.sql
```

### 4. Download Latest Data

```bash
# Downloads all 17 datasets from parlamento.pt
python scripts/download_datasets.py
```

This creates/updates files in `data/raw/`:
- `IniciativasXVII_json.txt` (18 MB)
- `AgendaParlamentar_json.txt` (134 KB)
- ... and 15 more datasets

### 5. Load Data into PostgreSQL

```bash
# Load iniciativas, events, and agenda
python scripts/load_to_postgres.py
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

### `schema.sql`

Creates database schema with 3 core tables:

1. **`iniciativas`** - Legislative initiatives (laws, resolutions)
2. **`iniciativa_events`** - Lifecycle events for each initiative
3. **`agenda_events`** - Parliamentary calendar

Features:
- JSONB columns for raw data (future-proofing)
- Full-text search indexes (Portuguese language)
- Automatic trigger to update `current_status`
- ON DELETE CASCADE for referential integrity

### `load_to_postgres.py`

Loads data from JSON files into PostgreSQL.

**What it does:**
- Reads `IniciativasXVII_json.txt` and `AgendaParlamentar_json.txt`
- Transforms nested JSON to flat table structure
- Uses UPSERT (INSERT ... ON CONFLICT UPDATE) for safe re-runs
- Handles complex author extraction (Government, Deputies, Parties)
- Preserves event order with `order_index`

**UPSERT behavior:**
- Safe to run multiple times
- Updates existing records
- Inserts new records
- Keeps database in sync with source files

### `download_datasets.py`

Downloads all 17 datasets from Portuguese Parliament open data portal.

**Usage:**
```bash
python scripts/download_datasets.py
```

Saves to `data/raw/` directory.

## Update Workflow

### Weekly Updates (Current)

```bash
# 1. Download latest data
python scripts/download_datasets.py

# 2. Load into database (UPSERT mode)
python scripts/load_to_postgres.py
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
      - run: python scripts/download_datasets.py
      - run: python scripts/load_to_postgres.py
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

**Option B: Cron job (if hosting on server)**

```cron
0 2 * * * cd /path/to/viriato && python scripts/download_datasets.py && python scripts/load_to_postgres.py
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
python scripts/download_datasets.py
```

### "relation 'iniciativas' does not exist"

```bash
# Create schema first
psql $DATABASE_URL -f scripts/schema.sql
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

## Next Steps

After Phase 1 is complete:

1. **Phase 1.5**: Integrate web app with PostgreSQL
   - Update frontend to query database instead of embedded data.js
   - Add API layer (Flask, FastAPI, or direct queries)

2. **Phase 2**: Add remaining tables
   - `deputies` - Parliament members (330 records)
   - `anexos` - Document attachments
   - `phase_definitions` - Reference data

3. **Phase 3**: Advanced features
   - Historical change tracking
   - Voting records
   - Deputy activity tracking

## Related Documentation

- `docs/database-implementation-plan.md` - Full implementation plan
- `docs/iniciativas-lifecycle.md` - Legislative process explained
- `data/schemas/` - JSON schemas for all datasets
