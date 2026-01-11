#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Load Committee-Initiative relationships into PostgreSQL.

Extracts from iniciativas JSON:
1. Committee assignments (lead/secondary) from IniEventos[].Comissao[]
2. Author committee from IniAutorOutros.iniAutorComissao
3. Joint initiatives from IniEventos[].IniciativasConjuntas[]

Usage:
    python scripts/load_committee_links.py

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
from psycopg2.extras import Json

# Try to load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data" / "raw"

# Only XVII for now - other legislatures on hold
LEGISLATURE_FILES = {
    'XVII': 'IniciativasXVII_json.txt',
    # 'XVI': 'IniciativasXVI_json.txt',  # On hold
    # 'XV': 'IniciativasXV_json.txt',    # On hold
    # 'XIV': 'IniciativasXIV_json.txt',  # On hold
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


def parse_date(date_str):
    """Parse date string from API format."""
    if not date_str:
        return None
    try:
        if 'T' in date_str:
            date_str = date_str.split('T')[0]
        # Skip invalid dates
        if date_str.startswith('0001'):
            return None
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, AttributeError):
        return None


def load_orgao_id_map(conn):
    """Load mapping of org_id (IdComissao) to database IDs."""
    cur = conn.cursor()
    cur.execute("""
        SELECT id, org_id
        FROM orgaos
    """)

    # Map org_id (API IdComissao) -> database id
    id_map = {}
    for row in cur.fetchall():
        db_id, org_id = row
        id_map[str(org_id)] = db_id  # IdComissao in JSON is string

    cur.close()
    return id_map


def load_iniciativa_id_map(conn):
    """Load mapping of IniId -> database id for all initiatives."""
    cur = conn.cursor()
    cur.execute("SELECT id, ini_id FROM iniciativas")

    id_map = {row[1]: row[0] for row in cur.fetchall()}
    cur.close()
    return id_map


def extract_committee_links(ini, ini_db_id, orgao_id_map):
    """Extract committee links from an initiative."""
    links = []

    # 1. Author committee (no IdComissao available, use name only)
    autor = ini.get('IniAutorOutros', {}) or {}
    if autor.get('sigla') == 'C' and autor.get('iniAutorComissao'):
        committee_name = autor['iniAutorComissao'].strip()
        # Author links don't have IdComissao, so orgao_id will be NULL
        links.append({
            'iniciativa_id': ini_db_id,
            'orgao_id': None,  # Could do name matching as fallback
            'committee_name': committee_name,
            'committee_api_id': None,
            'link_type': 'author',
            'phase_code': None,
            'phase_name': None,
            'distribution_date': None,
            'event_date': None,
            'has_rapporteur': False,
            'has_vote': False,
            'vote_result': None,
            'vote_date': None,
            'has_documents': False,
            'document_count': 0,
            'raw_data': None
        })

    # 2. Committee assignments from events
    eventos = ini.get('IniEventos', []) or []
    for evento in eventos:
        comissoes = evento.get('Comissao', []) or []
        if not isinstance(comissoes, list):
            comissoes = [comissoes]

        phase_code = evento.get('CodigoFase')
        phase_name = evento.get('Fase')
        event_date = parse_date(evento.get('DataFase'))

        for com in comissoes:
            if not com or not com.get('Nome'):
                continue

            committee_name = com['Nome'].strip()
            committee_api_id = com.get('IdComissao')

            # Use IdComissao to lookup orgao_id (direct match!)
            orgao_db_id = orgao_id_map.get(committee_api_id) if committee_api_id else None

            # Determine link type
            competente = com.get('Competente', 'N')
            link_type = 'lead' if competente == 'S' else 'secondary'

            # Extract enrichment data
            relatores = com.get('Relatores', []) or []
            votacao = com.get('Votacao', []) or []
            documentos = com.get('Documentos', []) or []

            vote_result = None
            vote_date = None
            if votacao:
                if isinstance(votacao, list) and votacao:
                    vote_result = votacao[0].get('resultado')
                    vote_date = parse_date(votacao[0].get('data'))

            links.append({
                'iniciativa_id': ini_db_id,
                'orgao_id': orgao_db_id,
                'committee_name': committee_name,
                'committee_api_id': committee_api_id,
                'link_type': link_type,
                'phase_code': phase_code,
                'phase_name': phase_name,
                'distribution_date': parse_date(com.get('DataDistribuicao')),
                'event_date': event_date,
                'has_rapporteur': bool(relatores),
                'has_vote': bool(votacao),
                'vote_result': vote_result,
                'vote_date': vote_date,
                'has_documents': bool(documentos),
                'document_count': len(documentos) if isinstance(documentos, list) else 0,
                'raw_data': Json(com)
            })

    return links


def extract_joint_initiatives(ini, ini_db_id):
    """Extract joint initiative links from an initiative."""
    links = []

    eventos = ini.get('IniEventos', []) or []
    for evento in eventos:
        conjuntas = evento.get('IniciativasConjuntas', []) or []
        if not conjuntas:
            continue

        phase_code = evento.get('CodigoFase')
        phase_name = evento.get('Fase')
        event_date = parse_date(evento.get('DataFase'))

        for conj in conjuntas:
            if not conj or not conj.get('id'):
                continue

            links.append({
                'iniciativa_id': ini_db_id,
                'related_ini_id': conj['id'],
                'related_ini_nr': conj.get('nr'),
                'related_ini_leg': conj.get('leg'),
                'related_ini_tipo': conj.get('tipo'),
                'related_ini_desc_tipo': conj.get('descTipo'),
                'related_ini_titulo': conj.get('titulo'),
                'phase_code': phase_code,
                'phase_name': phase_name,
                'event_date': event_date
            })

    return links


def insert_committee_links(conn, links):
    """Insert committee-initiative links into database."""
    if not links:
        return 0, 0

    cur = conn.cursor()
    inserted = 0
    errors = 0

    for link in links:
        try:
            cur.execute("SAVEPOINT link_insert")

            cur.execute("""
                INSERT INTO iniciativa_comissao (
                    iniciativa_id, orgao_id, committee_name, committee_api_id,
                    link_type, phase_code, phase_name, distribution_date, event_date,
                    has_rapporteur, has_vote, vote_result, vote_date,
                    has_documents, document_count, raw_data
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (iniciativa_id, committee_name, link_type, phase_code)
                DO UPDATE SET
                    orgao_id = EXCLUDED.orgao_id,
                    distribution_date = EXCLUDED.distribution_date,
                    has_rapporteur = EXCLUDED.has_rapporteur,
                    has_vote = EXCLUDED.has_vote,
                    vote_result = EXCLUDED.vote_result,
                    vote_date = EXCLUDED.vote_date,
                    has_documents = EXCLUDED.has_documents,
                    document_count = EXCLUDED.document_count,
                    raw_data = EXCLUDED.raw_data
            """, (
                link['iniciativa_id'], link['orgao_id'], link['committee_name'],
                link['committee_api_id'], link['link_type'], link['phase_code'],
                link['phase_name'], link['distribution_date'], link['event_date'],
                link['has_rapporteur'], link['has_vote'], link['vote_result'],
                link['vote_date'], link['has_documents'], link['document_count'],
                link['raw_data']
            ))

            cur.execute("RELEASE SAVEPOINT link_insert")
            inserted += 1

        except Exception as e:
            cur.execute("ROLLBACK TO SAVEPOINT link_insert")
            errors += 1
            if errors <= 5:
                print(f"  ERROR inserting link: {e}")

    conn.commit()
    return inserted, errors


def insert_joint_links(conn, links):
    """Insert initiative-to-initiative links into database."""
    if not links:
        return 0, 0

    cur = conn.cursor()
    inserted = 0
    errors = 0

    for link in links:
        try:
            cur.execute("SAVEPOINT joint_insert")

            cur.execute("""
                INSERT INTO iniciativa_conjunta (
                    iniciativa_id, related_ini_id, related_ini_nr, related_ini_leg,
                    related_ini_tipo, related_ini_desc_tipo, related_ini_titulo,
                    phase_code, phase_name, event_date
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (iniciativa_id, related_ini_id, phase_code)
                DO UPDATE SET
                    related_ini_nr = EXCLUDED.related_ini_nr,
                    related_ini_titulo = EXCLUDED.related_ini_titulo
            """, (
                link['iniciativa_id'], link['related_ini_id'], link['related_ini_nr'],
                link['related_ini_leg'], link['related_ini_tipo'], link['related_ini_desc_tipo'],
                link['related_ini_titulo'], link['phase_code'], link['phase_name'],
                link['event_date']
            ))

            cur.execute("RELEASE SAVEPOINT joint_insert")
            inserted += 1

        except Exception as e:
            cur.execute("ROLLBACK TO SAVEPOINT joint_insert")
            errors += 1
            if errors <= 5:
                print(f"  ERROR inserting joint link: {e}")

    conn.commit()
    return inserted, errors


def process_legislature(conn, legislature, filename, ini_id_map, orgao_map):
    """Process one legislature file."""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        print(f"  File not found: {filepath}")
        return

    print(f"\nProcessing {legislature} from {filename}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"  Found {len(data)} initiatives in file")

    all_committee_links = []
    all_joint_links = []
    matched = 0

    for ini in data:
        ini_id = ini.get('IniId')
        if not ini_id:
            continue

        # Look up database ID
        ini_db_id = ini_id_map.get(ini_id)
        if not ini_db_id:
            continue  # Initiative not in our database

        matched += 1

        # Extract links
        committee_links = extract_committee_links(ini, ini_db_id, orgao_map)
        joint_links = extract_joint_initiatives(ini, ini_db_id)

        all_committee_links.extend(committee_links)
        all_joint_links.extend(joint_links)

    print(f"  Matched {matched} initiatives in database")
    print(f"  Extracted {len(all_committee_links)} committee links")
    print(f"  Extracted {len(all_joint_links)} joint initiative links")

    # Insert links
    com_inserted, com_errors = insert_committee_links(conn, all_committee_links)
    print(f"  Committee links: {com_inserted} inserted, {com_errors} errors")

    joint_inserted, joint_errors = insert_joint_links(conn, all_joint_links)
    print(f"  Joint links: {joint_inserted} inserted, {joint_errors} errors")


def print_summary(conn):
    """Print summary of loaded data."""
    cur = conn.cursor()

    print("\n" + "=" * 60)
    print("LOAD SUMMARY")
    print("=" * 60)

    # Committee links by type
    cur.execute("""
        SELECT link_type, COUNT(*) as count
        FROM iniciativa_comissao
        GROUP BY link_type
        ORDER BY count DESC
    """)
    print("\nCommittee Links by Type:")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    # Committee links by phase
    cur.execute("""
        SELECT phase_code, phase_name, COUNT(*) as count
        FROM iniciativa_comissao
        WHERE phase_code IS NOT NULL
        GROUP BY phase_code, phase_name
        ORDER BY count DESC
    """)
    print("\nCommittee Links by Phase:")
    for row in cur.fetchall():
        print(f"  {row[0]} ({row[1][:40]}...): {row[2]}")

    # Top committees
    cur.execute("""
        SELECT committee_name, COUNT(*) as count
        FROM iniciativa_comissao
        GROUP BY committee_name
        ORDER BY count DESC
        LIMIT 10
    """)
    print("\nTop 10 Committees:")
    for row in cur.fetchall():
        print(f"  {row[0][:50]}: {row[1]}")

    # Joint initiatives
    cur.execute("SELECT COUNT(*) FROM iniciativa_conjunta")
    joint_count = cur.fetchone()[0]
    print(f"\nJoint Initiative Links: {joint_count}")

    # Totals
    cur.execute("SELECT COUNT(*) FROM iniciativa_comissao")
    total_com = cur.fetchone()[0]

    cur.execute("SELECT COUNT(DISTINCT iniciativa_id) FROM iniciativa_comissao")
    ini_with_com = cur.fetchone()[0]

    print(f"\nTotals:")
    print(f"  Committee Links: {total_com}")
    print(f"  Initiatives with Committee Links: {ini_with_com}")
    print(f"  Joint Initiative Links: {joint_count}")

    cur.close()


def main():
    """Main entry point."""
    print("=" * 60)
    print("Loading Committee-Initiative Links")
    print("=" * 60)

    conn = get_db_connection()
    print("Connected to database")

    try:
        # Load mappings
        print("\nLoading reference data...")
        orgao_map = load_orgao_id_map(conn)
        print(f"  Loaded {len(orgao_map)} committee IDs from orgaos")

        ini_id_map = load_iniciativa_id_map(conn)
        print(f"  Loaded {len(ini_id_map)} initiatives from database")

        # Process each legislature
        for leg, filename in LEGISLATURE_FILES.items():
            process_legislature(conn, leg, filename, ini_id_map, orgao_map)

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
