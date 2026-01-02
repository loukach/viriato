#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Apply database schema to PostgreSQL.

Usage:
    python scripts/apply_schema.py

Reads DATABASE_URL from environment or .env file.
"""

import os
import sys
from pathlib import Path

# Configure UTF-8 output for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 not installed")
    print("Run: pip install psycopg2-binary")
    sys.exit(1)

# Try to load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required

SCHEMA_FILE = Path(__file__).parent / "schema.sql"


def main():
    print("="*60)
    print("Viriato - Apply Database Schema")
    print("="*60)

    # Get database URL
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        print("\nSet it with:")
        print('  export DATABASE_URL="postgresql://..."')
        print("\nOr create .env file with:")
        print('  DATABASE_URL=postgresql://...')
        sys.exit(1)

    # Mask password in output
    safe_url = database_url.split('@')[1] if '@' in database_url else database_url
    print(f"\nConnecting to: ...@{safe_url}")

    # Read schema file
    if not SCHEMA_FILE.exists():
        print(f"ERROR: Schema file not found: {SCHEMA_FILE}")
        sys.exit(1)

    print(f"Reading schema: {SCHEMA_FILE}")
    with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    # Connect and execute
    try:
        conn = psycopg2.connect(database_url)
        print("✓ Connected to database")

        cur = conn.cursor()
        print("\nApplying schema...")

        cur.execute(schema_sql)
        conn.commit()

        print("✓ Schema applied successfully")

        # Verify tables created
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cur.fetchall()

        print(f"\nTables created ({len(tables)}):")
        for table in tables:
            print(f"  - {table[0]}")

        cur.close()
        conn.close()

        print("\n" + "="*60)
        print("✓ Database ready for data loading!")
        print("="*60)
        print("\nNext step:")
        print("  python scripts/load_to_postgres.py")

    except psycopg2.Error as e:
        print(f"\nERROR: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
