#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test the agenda-initiative linking functions.

Usage:
    python scripts/test_linking.py
"""

import sys
from pathlib import Path

# Add parent directory to path to import load_to_postgres functions
sys.path.insert(0, str(Path(__file__).parent))

from load_to_postgres import (
    get_db_connection,
    link_agenda_to_initiatives_bid,
    link_agenda_to_initiatives_committee_date,
    print_stats
)


def check_data_status(conn):
    """Check if required data is loaded."""
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM iniciativas")
    ini_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM agenda_events")
    agenda_count = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM agenda_initiative_links")
    link_count = cur.fetchone()[0]

    cur.close()

    print("="*80)
    print("Database Status")
    print("="*80)
    print(f"Iniciativas: {ini_count:,}")
    print(f"Agenda Events: {agenda_count:,}")
    print(f"Existing Links: {link_count:,}")
    print()

    return ini_count > 0 and agenda_count > 0


def main():
    """Main entry point."""
    print("="*80)
    print("Viriato - Test Agenda → Initiative Linking")
    print("="*80)
    print()

    conn = get_db_connection()
    print("✓ Connected to database\n")

    try:
        # Check data status
        has_data = check_data_status(conn)

        if not has_data:
            print("ERROR: Missing required data!")
            print("Please run: python scripts/load_to_postgres.py")
            sys.exit(1)

        # Clear existing links for fresh test
        print("Clearing existing links...")
        cur = conn.cursor()
        cur.execute("DELETE FROM agenda_initiative_links")
        deleted = cur.rowcount
        conn.commit()
        cur.close()
        print(f"✓ Deleted {deleted} existing links\n")

        # Run linking strategies
        link_agenda_to_initiatives_bid(conn)
        link_agenda_to_initiatives_committee_date(conn)

        # Print stats
        print_stats(conn)

        print("\n" + "="*80)
        print("✓ Linking test completed successfully!")
        print("="*80)

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()
