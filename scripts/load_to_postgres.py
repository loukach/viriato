#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Load Portuguese Parliament data into PostgreSQL database.

Loads data from JSON files in data/raw/ into PostgreSQL tables:
- iniciativas
- iniciativa_events
- agenda_events

Usage:
    python scripts/load_to_postgres.py

Environment variables:
    DATABASE_URL - PostgreSQL connection string (required)
                   Format: postgresql://user:pass@host:port/dbname

Example:
    export DATABASE_URL="postgresql://user:pass@localhost:5432/viriato"
    python scripts/load_to_postgres.py
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
from psycopg2 import sql

# Try to load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required

# Configuration
DATA_DIR = Path(__file__).parent.parent / "data" / "raw"
INICIATIVAS_FILE = DATA_DIR / "IniciativasXVII_json.txt"
AGENDA_FILE = DATA_DIR / "AgendaParlamentar_json.txt"


def get_db_connection():
    """Get PostgreSQL database connection from environment."""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set")
        print("\nExample:")
        print('  export DATABASE_URL="postgresql://user:pass@localhost:5432/viriato"')
        sys.exit(1)

    try:
        conn = psycopg2.connect(database_url)
        return conn
    except psycopg2.Error as e:
        print(f"ERROR: Failed to connect to database: {e}")
        sys.exit(1)


def extract_author(ini_json):
    """
    Extract author type and name from complex nested structure.

    Returns:
        tuple: (author_type, author_name)
    """
    # Check for government author
    if ini_json.get('IniAutorOutros'):
        outros = ini_json['IniAutorOutros']
        nome = outros.get('nome', '')
        if nome == 'Governo':
            return ('Government', 'Governo')
        elif nome == 'Grupos Parlamentares':
            # Get actual party from IniAutorGruposParlamentares
            if ini_json.get('IniAutorGruposParlamentares'):
                gps = ini_json['IniAutorGruposParlamentares']
                if isinstance(gps, list) and len(gps) > 0:
                    party = gps[0].get('GP', '')
                    return ('Parliamentary Group', party)
            return ('Parliamentary Group', nome)
        return ('Other', nome)

    # Check for deputy group authors
    if ini_json.get('IniAutorGruposParlamentares'):
        gps = ini_json['IniAutorGruposParlamentares']
        if isinstance(gps, list) and len(gps) > 0:
            parties = [gp.get('GP', '') for gp in gps if gp.get('GP')]
            return ('Parliamentary Group', ', '.join(parties))

    # Check for individual deputy authors
    if ini_json.get('IniAutorDeputados'):
        deps = ini_json['IniAutorDeputados']
        if isinstance(deps, list) and len(deps) > 0:
            names = [dep.get('nome', '') for dep in deps if dep.get('nome')]
            if len(names) == 1:
                return ('Deputy', names[0])
            elif len(names) > 1:
                return ('Deputies', f"{names[0]} + {len(names)-1} outros")

    return (None, None)


def transform_iniciativa(ini_json):
    """
    Transform IniciativasXVII JSON to database row.

    Returns:
        dict: Row data for iniciativas table
    """
    author_type, author_name = extract_author(ini_json)

    # Get latest event for current status
    events = ini_json.get('IniEventos', [])
    latest_event = events[-1] if events else None

    current_status = None
    current_phase_code = None
    is_completed = False

    if latest_event:
        current_status = latest_event.get('Fase')
        current_phase_code = latest_event.get('CodigoFase')

        # Check if completed
        completed_phases = [
            'Lei (Publicação DR)',
            'Resolução da AR (Publicação DR)',
            'Rejeitado',
            'Retirada da iniciativa',
            'Caducado'
        ]
        is_completed = current_status in completed_phases

    return {
        'ini_id': ini_json['IniId'],
        'legislature': ini_json['IniLeg'],
        'number': ini_json.get('IniNr'),
        'type': ini_json['IniTipo'],
        'type_description': ini_json.get('IniDescTipo'),
        'title': ini_json.get('IniTitulo', ''),
        'author_type': author_type,
        'author_name': author_name,
        'start_date': ini_json.get('DataInicioleg'),
        'end_date': ini_json.get('DataFimleg'),
        'current_status': current_status,
        'current_phase_code': current_phase_code,
        'is_completed': is_completed,
        'text_link': ini_json.get('IniLinkTexto'),
        'raw_data': json.dumps(ini_json)
    }


def transform_iniciativa_events(ini_id, ini_json):
    """
    Transform IniEventos array to list of event rows.

    Returns:
        list: List of row dicts for iniciativa_events table
    """
    events = ini_json.get('IniEventos', [])
    if not events:
        return []

    rows = []
    for idx, event in enumerate(events):
        # Extract committee if present
        committee = None
        if event.get('Comissao'):
            com = event['Comissao']
            if isinstance(com, dict):
                committee = com.get('OrgDes') or com.get('sigla')
            elif isinstance(com, str):
                committee = com

        rows.append({
            'ini_id': ini_id,  # Will be replaced with FK after insert
            'evt_id': event.get('EvtId'),
            'oev_id': event.get('OevId'),
            'phase_code': event.get('CodigoFase'),
            'phase_name': event.get('Fase', ''),
            'event_date': event.get('DataFase'),
            'committee': committee,
            'observations': event.get('ObsFase'),
            'order_index': idx,
            'raw_data': json.dumps(event)
        })

    return rows


def transform_agenda_event(agenda_json):
    """
    Transform AgendaParlamentar JSON to database row.

    Returns:
        dict: Row data for agenda_events table
    """
    # Parse dates - format is DD/MM/YYYY
    start_date = None
    end_date = None

    if agenda_json.get('EventStartDate'):
        try:
            start_date = datetime.strptime(
                agenda_json['EventStartDate'],
                '%d/%m/%Y'
            ).strftime('%Y-%m-%d')
        except ValueError:
            pass

    if agenda_json.get('EventEndDate'):
        try:
            end_date = datetime.strptime(
                agenda_json['EventEndDate'],
                '%d/%m/%Y'
            ).strftime('%Y-%m-%d')
        except ValueError:
            pass

    return {
        'event_id': agenda_json['Id'],
        'legislature': agenda_json.get('LegDes'),
        'title': agenda_json.get('Title', ''),
        'subtitle': agenda_json.get('Subtitle'),
        'section': agenda_json.get('Section'),
        'theme': agenda_json.get('Theme'),
        'location': agenda_json.get('Local'),
        'start_date': start_date,
        'start_time': agenda_json.get('EventStartTime'),
        'end_date': end_date,
        'end_time': agenda_json.get('EventEndTime'),
        'is_all_day': agenda_json.get('AllDayEvent', False),
        'description': agenda_json.get('InternetText'),
        'committee': agenda_json.get('OrgDes'),
        'meeting_number': agenda_json.get('ReuNumero'),
        'session_number': agenda_json.get('SelNumero'),
        'raw_data': json.dumps(agenda_json)
    }


def load_iniciativas(conn):
    """Load iniciativas and their events."""
    print(f"\n=== Loading Iniciativas ===")
    print(f"Reading: {INICIATIVAS_FILE}")

    if not INICIATIVAS_FILE.exists():
        print(f"ERROR: File not found: {INICIATIVAS_FILE}")
        return

    # Load JSON
    with open(INICIATIVAS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Found {len(data)} iniciativas")

    cur = conn.cursor()

    # Prepare data
    iniciativas_data = []
    all_events = []

    for ini_json in data:
        ini_row = transform_iniciativa(ini_json)
        iniciativas_data.append(ini_row)

        events = transform_iniciativa_events(ini_json['IniId'], ini_json)
        all_events.extend(events)

    print(f"Transformed {len(iniciativas_data)} iniciativas")
    print(f"Transformed {len(all_events)} events")

    # Insert iniciativas (UPSERT)
    print("Inserting iniciativas...")

    insert_query = """
        INSERT INTO iniciativas (
            ini_id, legislature, number, type, type_description,
            title, author_type, author_name, start_date, end_date,
            current_status, current_phase_code, is_completed, text_link, raw_data
        ) VALUES %s
        ON CONFLICT (ini_id)
        DO UPDATE SET
            legislature = EXCLUDED.legislature,
            number = EXCLUDED.number,
            type = EXCLUDED.type,
            type_description = EXCLUDED.type_description,
            title = EXCLUDED.title,
            author_type = EXCLUDED.author_type,
            author_name = EXCLUDED.author_name,
            start_date = EXCLUDED.start_date,
            end_date = EXCLUDED.end_date,
            current_status = EXCLUDED.current_status,
            current_phase_code = EXCLUDED.current_phase_code,
            is_completed = EXCLUDED.is_completed,
            text_link = EXCLUDED.text_link,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
        RETURNING id, ini_id
    """

    values = [
        (
            row['ini_id'], row['legislature'], row['number'], row['type'],
            row['type_description'], row['title'], row['author_type'],
            row['author_name'], row['start_date'], row['end_date'],
            row['current_status'], row['current_phase_code'], row['is_completed'],
            row['text_link'], row['raw_data']
        )
        for row in iniciativas_data
    ]

    execute_values(cur, insert_query, values)

    # Get mapping of ini_id -> id
    cur.execute("SELECT id, ini_id FROM iniciativas")
    ini_id_map = {row[1]: row[0] for row in cur.fetchall()}

    print(f"Inserted/updated {len(ini_id_map)} iniciativas")

    # Insert events (delete old events first to avoid duplicates)
    print("Deleting old events...")
    cur.execute("DELETE FROM iniciativa_events")

    print("Inserting events...")

    event_insert_query = """
        INSERT INTO iniciativa_events (
            iniciativa_id, evt_id, oev_id, phase_code, phase_name,
            event_date, committee, observations, order_index, raw_data
        ) VALUES %s
    """

    event_values = [
        (
            ini_id_map[event['ini_id']],  # Replace ini_id with FK
            event['evt_id'], event['oev_id'], event['phase_code'],
            event['phase_name'], event['event_date'], event['committee'],
            event['observations'], event['order_index'], event['raw_data']
        )
        for event in all_events
        if event['ini_id'] in ini_id_map  # Safety check
    ]

    execute_values(cur, event_insert_query, event_values)
    print(f"Inserted {len(event_values)} events")

    cur.close()
    conn.commit()
    print("✓ Iniciativas loaded successfully")


def load_agenda(conn):
    """Load agenda events."""
    print(f"\n=== Loading Agenda ===")
    print(f"Reading: {AGENDA_FILE}")

    if not AGENDA_FILE.exists():
        print(f"ERROR: File not found: {AGENDA_FILE}")
        return

    # Load JSON
    with open(AGENDA_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Found {len(data)} agenda events")

    cur = conn.cursor()

    # Transform data
    agenda_data = [transform_agenda_event(item) for item in data]

    # Insert (UPSERT)
    insert_query = """
        INSERT INTO agenda_events (
            event_id, legislature, title, subtitle, section, theme,
            location, start_date, start_time, end_date, end_time,
            is_all_day, description, committee, meeting_number,
            session_number, raw_data
        ) VALUES %s
        ON CONFLICT (event_id)
        DO UPDATE SET
            legislature = EXCLUDED.legislature,
            title = EXCLUDED.title,
            subtitle = EXCLUDED.subtitle,
            section = EXCLUDED.section,
            theme = EXCLUDED.theme,
            location = EXCLUDED.location,
            start_date = EXCLUDED.start_date,
            start_time = EXCLUDED.start_time,
            end_date = EXCLUDED.end_date,
            end_time = EXCLUDED.end_time,
            is_all_day = EXCLUDED.is_all_day,
            description = EXCLUDED.description,
            committee = EXCLUDED.committee,
            meeting_number = EXCLUDED.meeting_number,
            session_number = EXCLUDED.session_number,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
    """

    values = [
        (
            row['event_id'], row['legislature'], row['title'], row['subtitle'],
            row['section'], row['theme'], row['location'], row['start_date'],
            row['start_time'], row['end_date'], row['end_time'], row['is_all_day'],
            row['description'], row['committee'], row['meeting_number'],
            row['session_number'], row['raw_data']
        )
        for row in agenda_data
    ]

    execute_values(cur, insert_query, values)
    print(f"Inserted/updated {len(values)} agenda events")

    cur.close()
    conn.commit()
    print("✓ Agenda loaded successfully")


def print_stats(conn):
    """Print database statistics."""
    print(f"\n=== Database Statistics ===")

    cur = conn.cursor()

    # Iniciativas stats
    cur.execute("SELECT COUNT(*) FROM iniciativas")
    total_ini = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM iniciativas WHERE is_completed = TRUE")
    completed_ini = cur.fetchone()[0]

    cur.execute("SELECT type, COUNT(*) FROM iniciativas GROUP BY type ORDER BY COUNT(*) DESC")
    type_counts = cur.fetchall()

    cur.execute("SELECT COUNT(*) FROM iniciativa_events")
    total_events = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM agenda_events")
    total_agenda = cur.fetchone()[0]

    print(f"Iniciativas: {total_ini} total, {completed_ini} completed")
    print(f"Events: {total_events}")
    print(f"Agenda: {total_agenda}")

    print(f"\nIniciativas by type:")
    for type_code, count in type_counts:
        print(f"  {type_code}: {count}")

    cur.close()


def main():
    """Main entry point."""
    print("="*60)
    print("Viriato - Load Portuguese Parliament Data to PostgreSQL")
    print("="*60)

    # Check files exist
    if not INICIATIVAS_FILE.exists():
        print(f"ERROR: {INICIATIVAS_FILE} not found")
        print("Run: python scripts/download_datasets.py")
        sys.exit(1)

    if not AGENDA_FILE.exists():
        print(f"ERROR: {AGENDA_FILE} not found")
        print("Run: python scripts/download_datasets.py")
        sys.exit(1)

    # Connect to database
    print("\nConnecting to database...")
    conn = get_db_connection()
    print("✓ Connected")

    try:
        # Load data
        load_iniciativas(conn)
        load_agenda(conn)

        # Print stats
        print_stats(conn)

        print("\n" + "="*60)
        print("✓ All data loaded successfully!")
        print("="*60)

    except Exception as e:
        print(f"\nERROR: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
