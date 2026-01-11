#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Load Initiative Authorship into PostgreSQL.

Extracts from iniciativas JSON:
1. Deputy authors from IniAutorDeputados[] (ID-based: 98.7% match)
2. Parliamentary group authors from IniAutorGruposParlamentares[]
3. Government/Committee authors from IniAutorOutros

Usage:
    python scripts/load_authors.py

Environment variables:
    DATABASE_URL - PostgreSQL connection string (required)
"""

import json
import os
import sys
from pathlib import Path

# Configure UTF-8 output for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

import psycopg2

# Try to load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data" / "raw"

# Only XVII for now
LEGISLATURE_FILES = {
    'XVII': 'IniciativasXVII_json.txt',
}


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


def load_iniciativa_id_map(conn):
    """Load mapping of IniId -> database id for all initiatives."""
    cur = conn.cursor()
    cur.execute("SELECT id, ini_id FROM iniciativas")
    id_map = {row[1]: row[0] for row in cur.fetchall()}
    cur.close()
    return id_map


def load_orgao_name_map(conn):
    """Load mapping of committee name -> database id for name matching."""
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM orgaos")
    # Normalize names by stripping whitespace
    name_map = {row[1].strip(): row[0] for row in cur.fetchall()}
    cur.close()
    return name_map


def extract_authors(ini, ini_db_id, orgao_name_map):
    """Extract all authors from an initiative."""
    authors = []

    # 1. Deputy authors (ID-based matching)
    deputies = ini.get('IniAutorDeputados', []) or []
    for dep in deputies:
        if not dep:
            continue
        authors.append({
            'iniciativa_id': ini_db_id,
            'author_type': 'deputy',
            'dep_cad_id': int(dep['idCadastro']) if dep.get('idCadastro') else None,
            'deputy_name': dep.get('nome'),
            'party': dep.get('GP'),
            'orgao_id': None,
            'entity_name': None,
            'entity_code': None
        })

    # 2. Parliamentary group authors
    groups = ini.get('IniAutorGruposParlamentares', []) or []
    for grp in groups:
        if not grp or not grp.get('GP'):
            continue
        authors.append({
            'iniciativa_id': ini_db_id,
            'author_type': 'group',
            'dep_cad_id': None,
            'deputy_name': None,
            'party': grp['GP'],
            'orgao_id': None,
            'entity_name': None,
            'entity_code': None
        })

    # 3. Other authors (Government, Committees, Regional Assemblies, etc.)
    # Sigla codes:
    #   V = Governo (Government)
    #   G = Grupos Parlamentares (duplicates IniAutorGruposParlamentares - skip)
    #   D = Deputados (duplicates IniAutorDeputados - skip)
    #   C = Comissoes (Committees)
    #   M = Madeira Regional Assembly
    #   A = Azores Regional Assembly
    #   R = PAR (Parliament)
    #   Z = Cidadaos (Citizens)
    outros = ini.get('IniAutorOutros', {}) or {}
    if outros.get('sigla'):
        sigla = outros['sigla']

        # Skip G and D - they duplicate the arrays we already processed
        if sigla in ('G', 'D'):
            pass  # Already captured from IniAutorGruposParlamentares/IniAutorDeputados

        elif sigla == 'V':  # Government
            authors.append({
                'iniciativa_id': ini_db_id,
                'author_type': 'government',
                'dep_cad_id': None,
                'deputy_name': None,
                'party': None,
                'orgao_id': None,
                'entity_name': outros.get('nome', 'Governo'),
                'entity_code': 'V'
            })

        elif sigla == 'C':  # Committee
            committee_name = (outros.get('iniAutorComissao') or '').strip()
            orgao_id = orgao_name_map.get(committee_name) if committee_name else None

            authors.append({
                'iniciativa_id': ini_db_id,
                'author_type': 'committee',
                'dep_cad_id': None,
                'deputy_name': None,
                'party': None,
                'orgao_id': orgao_id,
                'entity_name': committee_name or outros.get('nome'),
                'entity_code': 'C'
            })

        elif sigla in ('M', 'A'):  # Regional Assemblies (Madeira, Azores)
            authors.append({
                'iniciativa_id': ini_db_id,
                'author_type': 'regional',
                'dep_cad_id': None,
                'deputy_name': None,
                'party': None,
                'orgao_id': None,
                'entity_name': outros.get('nome'),
                'entity_code': sigla
            })

        elif sigla == 'R':  # PAR (Parliament)
            authors.append({
                'iniciativa_id': ini_db_id,
                'author_type': 'parliament',
                'dep_cad_id': None,
                'deputy_name': None,
                'party': None,
                'orgao_id': None,
                'entity_name': outros.get('nome'),
                'entity_code': 'R'
            })

        elif sigla == 'Z':  # Citizens
            authors.append({
                'iniciativa_id': ini_db_id,
                'author_type': 'citizen',
                'dep_cad_id': None,
                'deputy_name': None,
                'party': None,
                'orgao_id': None,
                'entity_name': outros.get('nome'),
                'entity_code': 'Z'
            })

        else:  # Unknown types
            authors.append({
                'iniciativa_id': ini_db_id,
                'author_type': 'other',
                'dep_cad_id': None,
                'deputy_name': None,
                'party': None,
                'orgao_id': None,
                'entity_name': outros.get('nome'),
                'entity_code': sigla
            })

    return authors


def insert_authors(conn, authors):
    """Insert authors into database."""
    if not authors:
        return 0, 0

    cur = conn.cursor()
    inserted = 0
    errors = 0

    for author in authors:
        try:
            cur.execute("""
                INSERT INTO iniciativa_autores (
                    iniciativa_id, author_type, dep_cad_id, deputy_name,
                    party, orgao_id, entity_name, entity_code
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (iniciativa_id, author_type,
                    COALESCE(dep_cad_id, 0), COALESCE(party, ''), COALESCE(entity_code, ''))
                DO UPDATE SET
                    deputy_name = EXCLUDED.deputy_name,
                    orgao_id = EXCLUDED.orgao_id,
                    entity_name = EXCLUDED.entity_name
            """, (
                author['iniciativa_id'], author['author_type'],
                author['dep_cad_id'], author['deputy_name'],
                author['party'], author['orgao_id'],
                author['entity_name'], author['entity_code']
            ))
            inserted += 1

        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  ERROR inserting author: {e}")

    conn.commit()
    return inserted, errors


def process_legislature(conn, legislature, filename, ini_id_map, orgao_name_map):
    """Process one legislature file."""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        print(f"  File not found: {filepath}")
        return

    print(f"\nProcessing {legislature} from {filename}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"  Found {len(data)} initiatives in file")

    all_authors = []
    matched = 0
    stats = {'deputy': 0, 'group': 0, 'government': 0, 'committee': 0, 'other': 0}

    for ini in data:
        ini_id = ini.get('IniId')
        if not ini_id:
            continue

        ini_db_id = ini_id_map.get(ini_id)
        if not ini_db_id:
            continue

        matched += 1
        authors = extract_authors(ini, ini_db_id, orgao_name_map)

        for a in authors:
            stats[a['author_type']] = stats.get(a['author_type'], 0) + 1

        all_authors.extend(authors)

    print(f"  Matched {matched} initiatives in database")
    print(f"  Extracted {len(all_authors)} author links:")
    for atype, count in sorted(stats.items(), key=lambda x: -x[1]):
        if count > 0:
            print(f"    - {atype}: {count}")

    # Insert
    inserted, errors = insert_authors(conn, all_authors)
    print(f"  Authors: {inserted} inserted, {errors} errors")


def print_summary(conn):
    """Print summary of loaded data."""
    cur = conn.cursor()

    print("\n" + "=" * 60)
    print("AUTHORSHIP LOAD SUMMARY")
    print("=" * 60)

    # By type
    cur.execute("""
        SELECT author_type, COUNT(*) as count
        FROM iniciativa_autores
        GROUP BY author_type
        ORDER BY count DESC
    """)
    print("\nAuthors by Type:")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    # Deputies with ID match
    cur.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(dep_cad_id) as with_id
        FROM iniciativa_autores
        WHERE author_type = 'deputy'
    """)
    row = cur.fetchone()
    if row and row[0] > 0:
        print(f"\nDeputy ID Match Rate: {row[1]}/{row[0]} ({100*row[1]/row[0]:.1f}%)")

    # Committees with orgao match
    cur.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(orgao_id) as with_orgao
        FROM iniciativa_autores
        WHERE author_type = 'committee'
    """)
    row = cur.fetchone()
    if row and row[0] > 0:
        print(f"Committee Orgao Match Rate: {row[1]}/{row[0]} ({100*row[1]/row[0]:.1f}%)")

    # Top parties
    cur.execute("""
        SELECT party, COUNT(*) as count
        FROM iniciativa_autores
        WHERE party IS NOT NULL
        GROUP BY party
        ORDER BY count DESC
        LIMIT 10
    """)
    print("\nTop Parties (authors):")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    # Totals
    cur.execute("SELECT COUNT(*) FROM iniciativa_autores")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT iniciativa_id) FROM iniciativa_autores")
    ini_count = cur.fetchone()[0]

    print(f"\nTotals:")
    print(f"  Author Links: {total}")
    print(f"  Initiatives with Authors: {ini_count}")

    cur.close()


def main():
    """Main entry point."""
    print("=" * 60)
    print("Loading Initiative Authorship")
    print("=" * 60)

    conn = get_db_connection()
    print("Connected to database")

    try:
        # Load mappings
        print("\nLoading reference data...")
        ini_id_map = load_iniciativa_id_map(conn)
        print(f"  Loaded {len(ini_id_map)} initiatives from database")

        orgao_name_map = load_orgao_name_map(conn)
        print(f"  Loaded {len(orgao_name_map)} committee names from orgaos")

        # Process each legislature
        for leg, filename in LEGISLATURE_FILES.items():
            process_legislature(conn, leg, filename, ini_id_map, orgao_name_map)

        # Print summary
        print_summary(conn)

        print("\nDone!")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == '__main__':
    main()
