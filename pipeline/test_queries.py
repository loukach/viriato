#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test queries to verify database is working correctly.

Usage:
    python scripts/test_queries.py
"""

import os
import sys

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


def main():
    print("="*60)
    print("Viriato - Test Database Queries")
    print("="*60)

    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    # Test 1: Recent iniciativas
    print("\n=== Test 1: Recent 5 Iniciativas ===")
    cur.execute("""
        SELECT ini_id, title, type_description, current_status, start_date
        FROM iniciativas
        ORDER BY start_date DESC
        LIMIT 5
    """)
    for row in cur.fetchall():
        print(f"{row['ini_id']}: {row['title'][:60]}...")
        print(f"  Type: {row['type_description']}")
        print(f"  Status: {row['current_status']}")
        print()

    # Test 2: Iniciativas by status
    print("=== Test 2: Top 5 Current Statuses ===")
    cur.execute("""
        SELECT current_status, COUNT(*) as count
        FROM iniciativas
        GROUP BY current_status
        ORDER BY count DESC
        LIMIT 5
    """)
    for row in cur.fetchall():
        print(f"{row['current_status']}: {row['count']}")

    # Test 3: Full-text search
    print("\n=== Test 3: Full-text Search for 'saúde' ===")
    cur.execute("""
        SELECT ini_id, title, current_status
        FROM iniciativas
        WHERE to_tsvector('portuguese', title) @@ to_tsquery('portuguese', 'saude')
        LIMIT 3
    """)
    results = cur.fetchall()
    print(f"Found {len(results)} iniciativas mentioning 'saúde'")
    for row in results:
        print(f"  {row['ini_id']}: {row['title'][:70]}...")

    # Test 4: Initiative timeline
    print("\n=== Test 4: Timeline for First Initiative ===")
    cur.execute("""
        SELECT i.ini_id, i.title, e.phase_name, e.event_date
        FROM iniciativas i
        JOIN iniciativa_events e ON i.id = e.iniciativa_id
        WHERE i.ini_id = (SELECT ini_id FROM iniciativas LIMIT 1)
        ORDER BY e.order_index
        LIMIT 5
    """)
    for row in cur.fetchall():
        print(f"{row['event_date']}: {row['phase_name']}")

    # Test 5: Upcoming agenda
    print("\n=== Test 5: Recent Agenda Events ===")
    cur.execute("""
        SELECT title, section, start_date, location
        FROM agenda_events
        ORDER BY start_date DESC
        LIMIT 3
    """)
    for row in cur.fetchall():
        print(f"{row['start_date']}: {row['title'][:50]}...")
        print(f"  Section: {row['section']}, Location: {row['location']}")

    # Test 6: Completion rates
    print("\n=== Test 6: Completion Rates by Type ===")
    cur.execute("""
        SELECT
            type_description,
            COUNT(*) as total,
            SUM(CASE WHEN is_completed THEN 1 ELSE 0 END) as completed
        FROM iniciativas
        GROUP BY type_description
        ORDER BY total DESC
        LIMIT 5
    """)
    for row in cur.fetchall():
        pct = (row['completed'] / row['total'] * 100) if row['total'] > 0 else 0
        print(f"{row['type_description']}: {row['completed']}/{row['total']} ({pct:.1f}%)")

    cur.close()
    conn.close()

    print("\n" + "="*60)
    print("✓ All test queries completed successfully!")
    print("="*60)


if __name__ == '__main__':
    main()
