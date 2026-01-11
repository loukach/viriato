#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Load Parliamentary Bodies (Committees) data into PostgreSQL database.

Loads data from OrgaoComposicaoXVII_json.txt into PostgreSQL tables:
- orgaos (parliamentary bodies)
- orgao_membros (committee members with party affiliation)

Usage:
    python scripts/load_orgaos.py

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
from psycopg2.extras import execute_values, Json

# Try to load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data" / "raw"
ORGAOS_FILE = DATA_DIR / "OrgaoComposicaoXVII_json.txt"


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


def load_orgaos_from_file(filepath):
    """Load all parliamentary bodies from JSON file."""
    print(f"Loading orgaos from {filepath.name}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    orgaos = []

    # Map of data keys to org_type values
    org_type_map = {
        'Comissoes': 'comissao',
        'GruposTrabalho': 'grupo_trabalho',
        'SubComissoes': 'subcomissao',
        'ComissaoPermanente': 'comissao_permanente',
        'ConferenciaLideres': 'conferencia_lideres',
        'ConferenciaPresidentesComissoes': 'conferencia_presidentes',
        'ConselhoAdministracao': 'conselho_administracao',
        'MesaAR': 'mesa_ar',
        'Plenario': 'plenario'
    }

    for key, org_type in org_type_map.items():
        if key not in data:
            continue

        items = data[key]

        # Handle both list and single dict formats
        if isinstance(items, dict):
            items = [items]
        elif not isinstance(items, list):
            continue

        for item in items:
            detalhe = item.get('DetalheOrgao', {})
            if not detalhe:
                continue

            org_id = detalhe.get('idOrgao')
            if org_id is None:
                continue

            # Convert float to int if needed
            if isinstance(org_id, float):
                org_id = int(org_id)

            orgao = {
                'org_id': org_id,
                'legislature': detalhe.get('siglaLegislatura', 'XVII'),
                'name': detalhe.get('nomeSigla', ''),
                'acronym': detalhe.get('siglaOrgao'),
                'org_type': org_type,
                'number': int(detalhe.get('numeroOrgao')) if detalhe.get('numeroOrgao') else None,
                'members': item.get('HistoricoComposicao', []),
                'raw_data': detalhe
            }

            orgaos.append(orgao)

    print(f"  Found {len(orgaos)} parliamentary bodies")
    return orgaos


def extract_members(orgao, orgao_db_id):
    """Extract member records from orgao data."""
    members = []

    historico = orgao.get('members', [])
    if not isinstance(historico, list):
        historico = [historico] if historico else []

    for member in historico:
        if not member:
            continue

        dep_id = member.get('depId')
        if dep_id is None:
            continue

        # Convert float to int
        if isinstance(dep_id, float):
            dep_id = int(dep_id)

        dep_cad_id = member.get('depCadId')
        if dep_cad_id and isinstance(dep_cad_id, float):
            dep_cad_id = int(dep_cad_id)

        # Extract party from nested structure
        party = None
        gp_list = member.get('depGP', [])
        if isinstance(gp_list, list) and gp_list:
            # Get the most recent (first) party affiliation
            party = gp_list[0].get('gpSigla')

        # Extract member type from depSituacao
        member_type = None
        start_date = None
        end_date = None
        situacao_list = member.get('depSituacao', [])
        if isinstance(situacao_list, list) and situacao_list:
            situacao = situacao_list[0]
            member_type = situacao.get('sioTipMem')
            start_date = parse_date(situacao.get('sioDtInicio'))
            end_date = parse_date(situacao.get('sioDtFim'))

        # Extract role
        role = member.get('depCargo')

        members.append({
            'orgao_id': orgao_db_id,
            'dep_id': dep_id,
            'dep_cad_id': dep_cad_id,
            'deputy_name': member.get('depNomeParlamentar', ''),
            'party': party,
            'role': role,
            'member_type': member_type,
            'start_date': start_date,
            'end_date': end_date,
            'raw_data': Json(member)  # Use psycopg2 Json adapter
        })

    return members


def insert_orgaos(conn, orgaos):
    """Insert orgaos into database and return mapping of org_id to db id."""
    print("Inserting orgaos...")

    cur = conn.cursor()
    org_id_map = {}
    inserted = 0
    updated = 0
    errors = 0

    for orgao in orgaos:
        # Skip orgaos with invalid org_id
        if orgao['org_id'] == 0 or orgao['org_id'] is None:
            continue

        try:
            # Use savepoint for each orgao insert
            cur.execute("SAVEPOINT orgao_insert")

            # Use UPSERT (INSERT ... ON CONFLICT)
            cur.execute("""
                INSERT INTO orgaos (org_id, legislature, name, acronym, org_type, number, raw_data)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (org_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    acronym = EXCLUDED.acronym,
                    org_type = EXCLUDED.org_type,
                    number = EXCLUDED.number,
                    raw_data = EXCLUDED.raw_data,
                    updated_at = NOW()
                RETURNING id, (xmax = 0) as inserted
            """, (
                orgao['org_id'],
                orgao['legislature'],
                orgao['name'],
                orgao['acronym'][:50] if orgao['acronym'] else None,  # Truncate if needed
                orgao['org_type'],
                orgao['number'],
                Json(orgao['raw_data'])  # Use psycopg2 Json adapter
            ))

            result = cur.fetchone()
            db_id = result[0]
            was_inserted = result[1]

            org_id_map[orgao['org_id']] = {
                'db_id': db_id,
                'members': orgao.get('members', []),
                'name': orgao['name']
            }

            cur.execute("RELEASE SAVEPOINT orgao_insert")

            if was_inserted:
                inserted += 1
            else:
                updated += 1

        except Exception as e:
            cur.execute("ROLLBACK TO SAVEPOINT orgao_insert")
            errors += 1
            if errors <= 5:
                print(f"  ERROR inserting orgao {orgao['org_id']}: {e}")
            continue

    conn.commit()
    print(f"  Inserted: {inserted}, Updated: {updated}, Errors: {errors}")

    return org_id_map


def insert_members(conn, orgaos, org_id_map):
    """Insert committee members into database."""
    print("Inserting committee members...")

    cur = conn.cursor()
    total_inserted = 0
    total_updated = 0
    errors = 0

    for orgao in orgaos:
        org_id = orgao['org_id']
        if org_id not in org_id_map:
            continue

        db_id = org_id_map[org_id]['db_id']
        members = extract_members(orgao, db_id)

        for member in members:
            try:
                # Use savepoint for each member insert
                cur.execute("SAVEPOINT member_insert")

                cur.execute("""
                    INSERT INTO orgao_membros
                        (orgao_id, dep_id, dep_cad_id, deputy_name, party, role,
                         member_type, start_date, end_date, raw_data)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (orgao_id, dep_id) DO UPDATE SET
                        party = EXCLUDED.party,
                        role = EXCLUDED.role,
                        member_type = EXCLUDED.member_type,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        raw_data = EXCLUDED.raw_data
                    RETURNING (xmax = 0) as inserted
                """, (
                    member['orgao_id'],
                    member['dep_id'],
                    member['dep_cad_id'],
                    member['deputy_name'],
                    member['party'],
                    member['role'],
                    member['member_type'],
                    member['start_date'],
                    member['end_date'],
                    member['raw_data']
                ))

                was_inserted = cur.fetchone()[0]
                if was_inserted:
                    total_inserted += 1
                else:
                    total_updated += 1

                cur.execute("RELEASE SAVEPOINT member_insert")

            except Exception as e:
                cur.execute("ROLLBACK TO SAVEPOINT member_insert")
                errors += 1
                if errors <= 5:  # Only show first 5 errors
                    print(f"  ERROR inserting member {member['deputy_name']}: {e}")
                continue

    conn.commit()
    print(f"  Members - Inserted: {total_inserted}, Updated: {total_updated}, Errors: {errors}")


def print_summary(conn):
    """Print summary of loaded data."""
    cur = conn.cursor()

    print("\n" + "=" * 60)
    print("LOAD SUMMARY")
    print("=" * 60)

    # Count orgaos by type
    cur.execute("""
        SELECT org_type, COUNT(*) as count
        FROM orgaos
        GROUP BY org_type
        ORDER BY count DESC
    """)

    print("\nParliamentary Bodies by Type:")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    # Count members by party
    cur.execute("""
        SELECT party, COUNT(*) as count
        FROM orgao_membros
        GROUP BY party
        ORDER BY count DESC
    """)

    print("\nCommittee Memberships by Party:")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")

    # Total counts
    cur.execute("SELECT COUNT(*) FROM orgaos")
    orgao_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM orgao_membros")
    member_count = cur.fetchone()[0]

    print(f"\nTotals:")
    print(f"  Parliamentary Bodies: {orgao_count}")
    print(f"  Committee Memberships: {member_count}")

    cur.close()


def main():
    """Main entry point."""
    print("=" * 60)
    print("Loading Parliamentary Bodies (Committees) into PostgreSQL")
    print("=" * 60)

    # Check file exists
    if not ORGAOS_FILE.exists():
        print(f"ERROR: Data file not found: {ORGAOS_FILE}")
        sys.exit(1)

    # Connect to database
    conn = get_db_connection()
    print("Connected to database")

    try:
        # Load data from file
        orgaos = load_orgaos_from_file(ORGAOS_FILE)

        # Insert orgaos
        org_id_map = insert_orgaos(conn, orgaos)

        # Insert members
        insert_members(conn, orgaos, org_id_map)

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
