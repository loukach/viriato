#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Load Deputies data into PostgreSQL database.

Loads data from two source files into two separate tables:
  - InformacaoBaseXVII_json.txt  -> deputados table (1,446 records)
  - RegistoBiograficoXVII_json.txt -> deputados_bio table (330 records)

This separation keeps ingestion simple and faithful to the source data.
The API layer handles joining and business logic.

Usage:
    python scripts/load_deputados.py

Environment variables:
    DATABASE_URL - PostgreSQL connection string (required)
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Configure UTF-8 output for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

import psycopg2
from psycopg2.extras import execute_values

# Try to load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data" / "raw"
INFO_BASE_FILE = DATA_DIR / "InformacaoBaseXVII_json.txt"
REGISTO_BIO_FILE = DATA_DIR / "RegistoBiograficoXVII_json.txt"


def get_db_connection():
    """Get PostgreSQL database connection from environment."""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        sys.exit(1)

    try:
        conn = psycopg2.connect(database_url)
        return conn
    except psycopg2.Error as e:
        print(f"ERROR: Failed to connect to database: {e}")
        sys.exit(1)


def parse_date(date_str):
    """Parse date string from API format."""
    if not date_str:
        return None
    try:
        # Format: "2025-03-26T00:00:00" or just "2025-03-26"
        if 'T' in date_str:
            return datetime.strptime(date_str.split('T')[0], '%Y-%m-%d').date()
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, AttributeError):
        return None


# =============================================================================
# LOAD DEPUTADOS (from InformacaoBase)
# =============================================================================

def load_deputados_from_file(filepath):
    """Load deputies from InformacaoBase JSON file."""
    print(f"Loading deputados from {filepath.name}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    deputados = []
    deputados_raw = data.get('Deputados', [])

    for dep in deputados_raw:
        dep_id = dep.get('DepId')
        dep_cad_id = dep.get('DepCadId')

        if not dep_id:
            continue

        # Get current party (most recent GP entry without end date)
        party = None
        gp_list = dep.get('DepGP', [])
        if gp_list:
            active_gp = None
            for gp in gp_list:
                if not gp.get('gpDtFim'):  # No end date = currently active
                    active_gp = gp
                    break
            if not active_gp and gp_list:
                active_gp = gp_list[-1]  # Take the last one if all have end dates
            if active_gp:
                party = active_gp.get('gpSigla')

        # Get current situation (Efetivo, Suspenso, etc.)
        situation = None
        situation_start = None
        situation_end = None
        sit_list = dep.get('DepSituacao', [])
        if sit_list:
            active_sit = None
            for sit in sit_list:
                if not sit.get('sioDtFim'):
                    active_sit = sit
                    break
            if not active_sit and sit_list:
                active_sit = sit_list[-1]
            if active_sit:
                situation = active_sit.get('sioDes')
                situation_start = parse_date(active_sit.get('sioDtInicio'))
                situation_end = parse_date(active_sit.get('sioDtFim'))

        deputado = {
            'dep_id': dep_id,
            'dep_cad_id': dep_cad_id,
            'legislature': dep.get('LegDes', 'XVII'),
            'name': dep.get('DepNomeParlamentar', ''),
            'full_name': dep.get('DepNomeCompleto'),
            'party': party,
            'circulo_id': dep.get('DepCPId'),
            'circulo': dep.get('DepCPDes'),
            'situation': situation,
            'situation_start': situation_start,
            'situation_end': situation_end,
            'raw_data': dep
        }

        deputados.append(deputado)

    print(f"  Loaded {len(deputados)} deputados")
    return deputados


def insert_deputados(conn, deputados):
    """Insert deputados into the database."""
    print(f"Inserting {len(deputados)} deputados into database...")

    cur = conn.cursor()

    # Clear existing data for clean reload
    cur.execute("DELETE FROM deputados WHERE legislature = 'XVII'")

    # Prepare data for bulk insert
    values = []
    for dep in deputados:
        values.append((
            dep['dep_id'],
            dep['dep_cad_id'],
            dep['legislature'],
            dep['name'],
            dep['full_name'],
            dep['party'],
            dep['circulo_id'],
            dep['circulo'],
            dep['situation'],
            dep['situation_start'],
            dep['situation_end'],
            json.dumps(dep['raw_data'])
        ))

    # Bulk insert using execute_values
    insert_sql = """
        INSERT INTO deputados (
            dep_id, dep_cad_id, legislature, name, full_name, party,
            circulo_id, circulo, situation, situation_start, situation_end, raw_data
        ) VALUES %s
        ON CONFLICT (dep_id) DO UPDATE SET
            dep_cad_id = EXCLUDED.dep_cad_id,
            legislature = EXCLUDED.legislature,
            name = EXCLUDED.name,
            full_name = EXCLUDED.full_name,
            party = EXCLUDED.party,
            circulo_id = EXCLUDED.circulo_id,
            circulo = EXCLUDED.circulo,
            situation = EXCLUDED.situation,
            situation_start = EXCLUDED.situation_start,
            situation_end = EXCLUDED.situation_end,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
    """

    execute_values(cur, insert_sql, values)
    conn.commit()

    # Get final count
    cur.execute("SELECT COUNT(*) FROM deputados WHERE legislature = 'XVII'")
    count = cur.fetchone()[0]

    cur.close()

    print(f"  Inserted/updated {count} deputados")
    return count


# =============================================================================
# LOAD DEPUTADOS_BIO (from RegistoBiografico)
# =============================================================================

def load_bio_from_file(filepath):
    """Load biographical data from RegistoBiografico JSON file."""
    print(f"Loading biographical data from {filepath.name}...")

    if not filepath.exists():
        print(f"  Warning: {filepath.name} not found, skipping biographical data")
        return []

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    bio_records = []
    for record in data:
        cad_id = record.get('CadId')
        if not cad_id:
            continue

        # Helper to convert lists to newline-separated strings
        def to_text(val):
            if val is None:
                return None
            if isinstance(val, list):
                return '\n'.join(str(item) for item in val if item)
            return str(val) if val else None

        bio = {
            'cad_id': int(cad_id),
            'full_name': record.get('CadNomeCompleto'),
            'gender': record.get('CadSexo'),
            'birth_date': parse_date(record.get('CadDtNascimento')),
            'profession': to_text(record.get('CadProfissao')),
            'education': to_text(record.get('CadHabilitacoes')),
            'published_works': to_text(record.get('CadObrasPublicadas')),
            'awards': to_text(record.get('CadCondecoracoes')),
            'titles': to_text(record.get('CadTitulos')),
            'raw_data': record
        }
        bio_records.append(bio)

    print(f"  Loaded {len(bio_records)} biographical records")
    return bio_records


def insert_bio(conn, bio_records):
    """Insert biographical data into deputados_bio table."""
    print(f"Inserting {len(bio_records)} biographical records into database...")

    cur = conn.cursor()

    # Clear existing data for clean reload
    cur.execute("DELETE FROM deputados_bio")

    # Prepare data for bulk insert
    values = []
    for bio in bio_records:
        values.append((
            bio['cad_id'],
            bio['full_name'],
            bio['gender'],
            bio['birth_date'],
            bio['profession'],
            bio['education'],
            bio['published_works'],
            bio['awards'],
            bio['titles'],
            json.dumps(bio['raw_data'])
        ))

    # Bulk insert using execute_values
    insert_sql = """
        INSERT INTO deputados_bio (
            cad_id, full_name, gender, birth_date, profession,
            education, published_works, awards, titles, raw_data
        ) VALUES %s
        ON CONFLICT (cad_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            gender = EXCLUDED.gender,
            birth_date = EXCLUDED.birth_date,
            profession = EXCLUDED.profession,
            education = EXCLUDED.education,
            published_works = EXCLUDED.published_works,
            awards = EXCLUDED.awards,
            titles = EXCLUDED.titles,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
    """

    execute_values(cur, insert_sql, values)
    conn.commit()

    # Get final count
    cur.execute("SELECT COUNT(*) FROM deputados_bio")
    count = cur.fetchone()[0]

    cur.close()

    print(f"  Inserted/updated {count} biographical records")
    return count


# =============================================================================
# SUMMARY
# =============================================================================

def print_summary(conn):
    """Print summary statistics."""
    cur = conn.cursor()

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    # Total deputados
    cur.execute("SELECT COUNT(*) FROM deputados WHERE legislature = 'XVII'")
    total = cur.fetchone()[0]
    print(f"\nTotal deputados (all situations): {total}")

    # By situation
    cur.execute("""
        SELECT situation, COUNT(*) as count
        FROM deputados
        WHERE legislature = 'XVII'
        GROUP BY situation
        ORDER BY count DESC
    """)
    print("\nBy situation:")
    serving_count = 0
    for row in cur.fetchall():
        situation = row[0] or 'Unknown'
        count = row[1]
        # Mark serving statuses
        is_serving = situation in ('Efetivo', 'Efetivo Temporário', 'Efetivo Definitivo')
        marker = " <- serving" if is_serving else ""
        if is_serving:
            serving_count += count
        print(f"  {situation}: {count}{marker}")
    print(f"  --------")
    print(f"  Total serving: {serving_count}")

    # Biographical coverage
    cur.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(b.cad_id) as with_bio
        FROM deputados d
        LEFT JOIN deputados_bio b ON d.dep_cad_id = b.cad_id
        WHERE d.legislature = 'XVII'
    """)
    row = cur.fetchone()
    print(f"\nBiographical data coverage: {row[1]}/{row[0]} ({100*row[1]//row[0]}%)")

    # By party (serving only)
    cur.execute("""
        SELECT party, COUNT(*) as count
        FROM deputados
        WHERE legislature = 'XVII'
          AND situation IN ('Efetivo', 'Efetivo Temporário', 'Efetivo Definitivo')
        GROUP BY party
        ORDER BY count DESC
    """)
    print("\nBy party (serving deputies only):")
    for row in cur.fetchall():
        print(f"  {row[0] or 'Sem partido'}: {row[1]}")

    # By gender (serving only, from bio table)
    cur.execute("""
        SELECT b.gender, COUNT(*) as count
        FROM deputados d
        JOIN deputados_bio b ON d.dep_cad_id = b.cad_id
        WHERE d.legislature = 'XVII'
          AND d.situation IN ('Efetivo', 'Efetivo Temporário', 'Efetivo Definitivo')
        GROUP BY b.gender
        ORDER BY b.gender
    """)
    print("\nBy gender (serving deputies with bio data):")
    for row in cur.fetchall():
        gender_name = {'M': 'Male', 'F': 'Female'}.get(row[0], 'Unknown')
        print(f"  {gender_name}: {row[1]}")

    cur.close()


def main():
    """Main entry point."""
    print("=" * 60)
    print("LOADING DEPUTADOS DATA")
    print("=" * 60)
    print()
    print("Source files:")
    print(f"  - {INFO_BASE_FILE.name} -> deputados table")
    print(f"  - {REGISTO_BIO_FILE.name} -> deputados_bio table")
    print()

    # Check files exist
    if not INFO_BASE_FILE.exists():
        print(f"ERROR: {INFO_BASE_FILE} not found")
        sys.exit(1)

    # Connect to database
    conn = get_db_connection()

    try:
        # Load and insert deputados (from InformacaoBase)
        deputados = load_deputados_from_file(INFO_BASE_FILE)
        if not deputados:
            print("ERROR: No deputados found")
            sys.exit(1)
        insert_deputados(conn, deputados)

        # Load and insert biographical data (from RegistoBiografico)
        bio_records = load_bio_from_file(REGISTO_BIO_FILE)
        if bio_records:
            insert_bio(conn, bio_records)

        # Print summary
        print_summary(conn)

    finally:
        conn.close()

    print("\nDone!")


if __name__ == '__main__':
    main()
