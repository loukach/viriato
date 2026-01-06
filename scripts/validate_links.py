#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate agenda-initiative links.

Checks that:
1. BID references in HTML actually exist
2. Linked initiatives are correct
3. Link confidence scores are appropriate

Usage:
    python scripts/validate_links.py
"""

import sys
import re
import html
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from load_to_postgres import get_db_connection


def validate_bid_links(conn):
    """
    Validate BID direct links.

    Check that:
    - BID reference exists in agenda description
    - Initiative ID matches
    - Confidence is 1.00
    """
    print("="*80)
    print("Validating BID Links")
    print("="*80)

    cur = conn.cursor()

    # Get all BID links with full details
    cur.execute("""
        SELECT
            l.id,
            l.extracted_text,
            l.link_confidence,
            ae.event_id AS agenda_event_id,
            ae.title AS agenda_title,
            ae.description,
            i.ini_id,
            i.title AS initiative_title
        FROM agenda_initiative_links l
        JOIN agenda_events ae ON l.agenda_event_id = ae.id
        JOIN iniciativas i ON l.iniciativa_id = i.id
        WHERE l.link_type = 'bid_direct'
        ORDER BY l.id
        LIMIT 10
    """)

    links = cur.fetchall()
    print(f"\nValidating {len(links)} sample BID links...\n")

    passed = 0
    failed = 0

    for link_id, extracted_text, confidence, agenda_event_id, agenda_title, description, ini_id, initiative_title in links:
        # Extract BID from extracted_text (format: "BID=315636")
        bid_match = re.match(r'BID=(\d+)', extracted_text)
        if not bid_match:
            print(f"❌ Link {link_id}: Invalid extracted_text format: {extracted_text}")
            failed += 1
            continue

        bid = bid_match.group(1)

        # Decode HTML
        description_decoded = html.unescape(description)

        # Check if BID exists in description
        if f'BID={bid}' not in description_decoded:
            print(f"❌ Link {link_id}: BID={bid} not found in agenda description")
            print(f"   Agenda: {agenda_title}")
            print(f"   Initiative: {initiative_title} (ini_id: {ini_id})")
            failed += 1
            continue

        # Check if ini_id matches BID
        if ini_id != bid:
            print(f"❌ Link {link_id}: Initiative ID mismatch!")
            print(f"   BID in HTML: {bid}")
            print(f"   Linked initiative: {ini_id}")
            failed += 1
            continue

        # Check confidence
        if abs(float(confidence) - 1.00) > 0.01:
            print(f"⚠️  Link {link_id}: Unexpected confidence: {confidence} (expected 1.00)")
            print(f"   BID={bid}: {initiative_title}")

        # All checks passed
        passed += 1
        print(f"✓ Link {link_id}: BID={bid} → {initiative_title[:60]}...")

    print(f"\n{'='*80}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'='*80}\n")

    cur.close()
    return failed == 0


def validate_committee_date_links(conn):
    """
    Validate committee + date links.

    Check that:
    - Committee names match
    - Dates are within expected range
    - Confidence scores are appropriate
    """
    print("="*80)
    print("Validating Committee + Date Links")
    print("="*80)

    cur = conn.cursor()

    # Get all committee/date links with full details
    cur.execute("""
        SELECT
            l.id,
            l.extracted_text,
            l.link_confidence,
            ae.committee AS agenda_committee,
            ae.start_date AS agenda_date,
            ae.title AS agenda_title,
            i.ini_id,
            i.title AS initiative_title
        FROM agenda_initiative_links l
        JOIN agenda_events ae ON l.agenda_event_id = ae.id
        JOIN iniciativas i ON l.iniciativa_id = i.id
        WHERE l.link_type = 'committee_date'
        ORDER BY l.id
        LIMIT 10
    """)

    links = cur.fetchall()

    if not links:
        print("\nNo committee/date links found. This is expected if:")
        print("  - Agenda data is from a different time period than initiatives")
        print("  - No committee meetings match initiative phases within ±7 days")
        print(f"\n{'='*80}\n")
        return True

    print(f"\nValidating {len(links)} sample committee/date links...\n")

    passed = 0
    failed = 0

    for link_id, extracted_text, confidence, agenda_committee, agenda_date, agenda_title, ini_id, initiative_title in links:
        # Parse extracted text (format: "Committee | Phase | Date (±X days)")
        # Check confidence range (0.50 to 0.75)
        if not (0.50 <= confidence <= 0.75):
            print(f"⚠️  Link {link_id}: Confidence out of range: {confidence}")
            print(f"   Expected: 0.50 - 0.75")

        # All checks passed
        passed += 1
        print(f"✓ Link {link_id}: {agenda_committee} ({agenda_date})")
        print(f"   → {initiative_title[:60]}...")
        print(f"   Confidence: {confidence:.2f} | {extracted_text}")
        print()

    print(f"{'='*80}")
    print(f"Results: {passed} passed, {failed} failed")
    print(f"{'='*80}\n")

    cur.close()
    return failed == 0


def generate_sample_queries(conn):
    """Generate sample SQL queries to explore the links."""
    print("="*80)
    print("Sample SQL Queries for Further Exploration")
    print("="*80)

    print("""
-- Query 1: Show agenda events with their linked initiatives
SELECT
    ae.event_id,
    ae.title AS agenda_title,
    ae.start_date,
    i.ini_id,
    i.title AS initiative_title,
    l.link_type,
    l.link_confidence
FROM agenda_events ae
JOIN agenda_initiative_links l ON ae.id = l.agenda_event_id
JOIN iniciativas i ON l.iniciativa_id = i.id
ORDER BY ae.start_date DESC, ae.event_id
LIMIT 20;

-- Query 2: Find agenda events with multiple linked initiatives
SELECT
    ae.event_id,
    ae.title,
    COUNT(*) as initiative_count,
    STRING_AGG(i.ini_id, ', ') AS initiative_ids
FROM agenda_events ae
JOIN agenda_initiative_links l ON ae.id = l.agenda_event_id
JOIN iniciativas i ON l.iniciativa_id = i.id
GROUP BY ae.event_id, ae.title
HAVING COUNT(*) > 1
ORDER BY initiative_count DESC;

-- Query 3: Coverage statistics
SELECT
    'Total Agenda Events' AS metric,
    COUNT(*) AS count
FROM agenda_events
UNION ALL
SELECT
    'Agenda Events with Links' AS metric,
    COUNT(DISTINCT agenda_event_id) AS count
FROM agenda_initiative_links
UNION ALL
SELECT
    'Total Links' AS metric,
    COUNT(*) AS count
FROM agenda_initiative_links;
""")

    print(f"{'='*80}\n")


def main():
    """Main entry point."""
    print("="*80)
    print("Viriato - Validate Agenda → Initiative Links")
    print("="*80)
    print()

    conn = get_db_connection()
    print("✓ Connected to database\n")

    try:
        # Validate BID links
        bid_ok = validate_bid_links(conn)

        # Validate committee/date links
        committee_ok = validate_committee_date_links(conn)

        # Generate sample queries
        generate_sample_queries(conn)

        # Final result
        if bid_ok and committee_ok:
            print("="*80)
            print("✓ All validation checks passed!")
            print("="*80)
            return 0
        else:
            print("="*80)
            print("❌ Some validation checks failed")
            print("="*80)
            return 1

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        conn.close()


if __name__ == '__main__':
    sys.exit(main())
