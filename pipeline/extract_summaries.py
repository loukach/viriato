#!/usr/bin/env python3
"""
Extract "Exposicao de Motivos" summaries from initiative PDF documents.

This script downloads PDF documents from parlamento.pt and extracts the
"Exposicao de Motivos" section, which provides an executive summary of
the initiative's purpose and rationale.

Usage:
    python extract_summaries.py [--legislature XVII] [--limit 100] [--dry-run]

Dependencies:
    pip install pymupdf psycopg2-binary requests

Pipeline position:
    Run AFTER load_to_postgres.py (needs ini_id and text_link to exist)
"""

import argparse
import io
import os
import re
import sys
import time
from datetime import datetime

# Try to load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required if DATABASE_URL is set in environment

import psycopg2
from psycopg2.extras import RealDictCursor
import requests

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF not installed. Run: pip install pymupdf")
    sys.exit(1)


# Placeholder for failed extractions
EXTRACTION_FAILED_PLACEHOLDER = "[Extracao nao disponivel] - consulte o link para o documento oficial abaixo."


def get_db_connection():
    """Get database connection from environment or default."""
    database_url = os.environ.get('DATABASE_URL')

    if database_url:
        return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

    # Local development fallback
    return psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        database=os.environ.get('DB_NAME', 'viriato'),
        user=os.environ.get('DB_USER', 'postgres'),
        password=os.environ.get('DB_PASSWORD', ''),
        cursor_factory=RealDictCursor
    )


def ensure_schema(conn):
    """Ensure summary columns exist in the database."""
    with conn.cursor() as cur:
        # Check if column exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'iniciativas' AND column_name = 'summary'
        """)

        if not cur.fetchone():
            print("Adding summary columns to iniciativas table...")
            cur.execute("""
                ALTER TABLE iniciativas ADD COLUMN summary TEXT;
                ALTER TABLE iniciativas ADD COLUMN summary_extracted_at TIMESTAMP;
            """)
            conn.commit()
            print("Schema updated.")

        # Check if FTS index exists
        cur.execute("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'iniciativas' AND indexname = 'idx_ini_summary_fts'
        """)

        if not cur.fetchone():
            print("Creating full-text search index on summary...")
            cur.execute("""
                CREATE INDEX idx_ini_summary_fts
                ON iniciativas USING GIN(to_tsvector('portuguese', COALESCE(summary, '')));
            """)
            conn.commit()
            print("FTS index created.")


def get_initiatives_to_process(conn, legislature=None, limit=None):
    """Get initiatives that need summary extraction."""
    query = """
        SELECT id, ini_id, title, text_link
        FROM iniciativas
        WHERE text_link IS NOT NULL
          AND text_link != ''
          AND summary IS NULL
    """
    params = []

    if legislature:
        query += " AND legislature = %s"
        params.append(legislature)

    query += " ORDER BY id"

    if limit:
        query += " LIMIT %s"
        params.append(limit)

    with conn.cursor() as cur:
        cur.execute(query, params)
        return cur.fetchall()


def download_pdf(url: str, timeout: int = 30) -> bytes:
    """Download PDF from Parliament website."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    response = requests.get(url, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.content


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF using PyMuPDF."""
    text_parts = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    for page in doc:
        text = page.get_text("text")
        if text:
            text_parts.append(text)

    doc.close()
    return "\n\n".join(text_parts)


def find_exposicao_motivos(text: str) -> str:
    """
    Extract the "Exposicao de Motivos" section from document text.

    This section typically appears after the title and before "Artigo 1".
    """
    if not text or len(text) < 100:
        return ""

    # Common section markers for start
    start_markers = [
        r'Exposi[cç][aã]o\s+de\s+[Mm]otivos',
        r'EXPOSI[CÇ][AÃ]O\s+DE\s+MOTIVOS',
        r'Considerando\s+que',
        r'CONSIDERANDO',
    ]

    # Common end markers
    end_markers = [
        r'Artigo\s+1[.º°]?',
        r'ARTIGO\s+1',
        r'Art\.\s*1[.º°]?',
        r'Assembleia\s+da\s+Rep[uú]blica',
        r'Pal[aá]cio\s+de\s+S[aã]o\s+Bento',
        r'Os?\s+Deputados?',
        r'A\s+Deputada',
        r'Nos\s+termos\s+constitucionais',
    ]

    # Try to find start of exposition
    start_pos = 0
    for pattern in start_markers:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            start_pos = match.start()
            break

    # Try to find end (search after at least 200 chars from start)
    end_pos = len(text)
    search_start = min(start_pos + 200, len(text))

    for pattern in end_markers:
        match = re.search(pattern, text[search_start:], re.IGNORECASE)
        if match:
            end_pos = search_start + match.start()
            break

    # Extract the section
    exposition = text[start_pos:end_pos].strip()

    # If we didn't find explicit markers, take first ~2000 chars after header
    if start_pos == 0 and len(text) > 500:
        exposition = text[200:2200].strip()

    # Cleanup
    exposition = re.sub(r'\n{3,}', '\n\n', exposition)  # Max 2 newlines
    exposition = re.sub(r' {2,}', ' ', exposition)  # Max 1 space

    # Limit to reasonable length (max ~4000 chars for summary)
    if len(exposition) > 4000:
        # Try to cut at sentence boundary
        cut_point = exposition.rfind('. ', 3500, 4000)
        if cut_point > 0:
            exposition = exposition[:cut_point + 1]
        else:
            exposition = exposition[:4000] + "..."

    # Remove NUL characters (PostgreSQL doesn't allow them in strings)
    exposition = exposition.replace('\x00', '')

    return exposition


def update_initiative_summary(conn, initiative_id: int, summary: str):
    """Update initiative with extracted summary."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE iniciativas
            SET summary = %s, summary_extracted_at = %s
            WHERE id = %s
        """, (summary, datetime.now(), initiative_id))
    conn.commit()


def process_initiative(initiative: dict) -> tuple[str, str]:
    """
    Process a single initiative: download PDF and extract summary.

    Returns: (summary, status)
    """
    url = initiative['text_link']

    try:
        # Download PDF
        pdf_bytes = download_pdf(url)

        # Check for error page (small response = likely error)
        if len(pdf_bytes) < 5000:
            text = extract_text_from_pdf(pdf_bytes)
            if "recurso ao qual tentou aceder" in text.lower() or "não existe" in text.lower():
                return EXTRACTION_FAILED_PLACEHOLDER, "expired_url"

        # Extract text
        text = extract_text_from_pdf(pdf_bytes)

        if not text or len(text) < 100:
            return EXTRACTION_FAILED_PLACEHOLDER, "no_text"

        # Find exposition de motivos
        summary = find_exposicao_motivos(text)

        if not summary or len(summary) < 50:
            return EXTRACTION_FAILED_PLACEHOLDER, "no_exposition"

        return summary, "success"

    except requests.exceptions.Timeout:
        return EXTRACTION_FAILED_PLACEHOLDER, "timeout"
    except requests.exceptions.RequestException as e:
        return EXTRACTION_FAILED_PLACEHOLDER, f"request_error: {str(e)[:50]}"
    except Exception as e:
        return EXTRACTION_FAILED_PLACEHOLDER, f"error: {str(e)[:50]}"


def main():
    parser = argparse.ArgumentParser(description='Extract summaries from initiative PDFs')
    parser.add_argument('--legislature', default='XVII', help='Legislature to process (default: XVII)')
    parser.add_argument('--limit', type=int, help='Max initiatives to process')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without DB updates')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    args = parser.parse_args()

    print(f"Summary Extraction for Legislature {args.legislature}")
    print("=" * 60)

    # Connect to database
    print("Connecting to database...")
    conn = get_db_connection()

    # Ensure schema is up to date
    if not args.dry_run:
        ensure_schema(conn)

    # Get initiatives to process
    print(f"Finding initiatives to process...")
    initiatives = get_initiatives_to_process(conn, args.legislature, args.limit)
    print(f"Found {len(initiatives)} initiatives needing summary extraction")

    if not initiatives:
        print("Nothing to do!")
        return

    # Process each initiative
    stats = {'success': 0, 'failed': 0, 'errors': {}}

    for i, ini in enumerate(initiatives, 1):
        ini_id = ini['ini_id']
        title = ini['title'][:50] if ini['title'] else 'N/A'

        if args.verbose:
            print(f"\n[{i}/{len(initiatives)}] {ini_id}: {title}...")
        else:
            print(f"\r[{i}/{len(initiatives)}] Processing {ini_id}...", end='', flush=True)

        summary, status = process_initiative(ini)

        if status == 'success':
            stats['success'] += 1
            if args.verbose:
                print(f"  -> OK ({len(summary)} chars)")
        else:
            stats['failed'] += 1
            stats['errors'][status] = stats['errors'].get(status, 0) + 1
            if args.verbose:
                print(f"  -> FAILED: {status}")

        # Update database
        if not args.dry_run:
            update_initiative_summary(conn, ini['id'], summary)

        # Rate limiting - be nice to the server
        time.sleep(0.5)

    print("\n")
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total processed: {len(initiatives)}")
    print(f"Successful: {stats['success']}")
    print(f"Failed: {stats['failed']}")

    if stats['errors']:
        print("\nFailure breakdown:")
        for error_type, count in sorted(stats['errors'].items(), key=lambda x: -x[1]):
            print(f"  {error_type}: {count}")

    conn.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
