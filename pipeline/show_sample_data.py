#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Show sample data from all tables.

Usage:
    python scripts/show_sample_data.py
"""

import os
import sys
import json

# Configure UTF-8 output for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import psycopg2
from psycopg2.extras import RealDictCursor


def print_row(row, exclude_fields=['raw_data']):
    """Pretty print a database row."""
    for key, value in row.items():
        if key in exclude_fields:
            continue
        # Truncate long strings
        if isinstance(value, str) and len(value) > 100:
            value = value[:97] + '...'
        print(f"  {key}: {value}")
    print()


def main():
    print("="*80)
    print("Viriato - Sample Data from Database")
    print("="*80)

    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    # Table 1: iniciativas
    print("\n" + "="*80)
    print("TABLE: iniciativas (first 5 rows)")
    print("="*80)
    cur.execute("""
        SELECT id, ini_id, legislature, number, type, type_description,
               title, author_type, author_name, start_date, end_date,
               current_status, current_phase_code, is_completed, text_link
        FROM iniciativas
        ORDER BY id
        LIMIT 5
    """)
    for i, row in enumerate(cur.fetchall(), 1):
        print(f"\n--- Row {i} ---")
        print_row(row)

    # Table 2: iniciativa_events
    print("\n" + "="*80)
    print("TABLE: iniciativa_events (first 5 rows)")
    print("="*80)
    cur.execute("""
        SELECT id, iniciativa_id, evt_id, oev_id, phase_code, phase_name,
               event_date, committee, observations, order_index
        FROM iniciativa_events
        ORDER BY id
        LIMIT 5
    """)
    for i, row in enumerate(cur.fetchall(), 1):
        print(f"\n--- Row {i} ---")
        print_row(row)

    # Table 3: agenda_events
    print("\n" + "="*80)
    print("TABLE: agenda_events (first 5 rows)")
    print("="*80)
    cur.execute("""
        SELECT id, event_id, legislature, title, subtitle, section, theme,
               location, start_date, start_time, end_date, end_time,
               is_all_day, committee, meeting_number, session_number
        FROM agenda_events
        ORDER BY id
        LIMIT 5
    """)
    for i, row in enumerate(cur.fetchall(), 1):
        print(f"\n--- Row {i} ---")
        print_row(row)

    cur.close()
    conn.close()

    print("="*80)


if __name__ == '__main__':
    main()
