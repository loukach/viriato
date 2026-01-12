#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Viriato API - Flask backend for Portuguese Parliament data.

Provides REST API endpoints for the frontend to query PostgreSQL database.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from contextlib import contextmanager
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configure logging
log_level = os.environ.get('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('viriato-api')

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

def get_db_connection():
    """Get database connection from environment."""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        raise Exception("DATABASE_URL environment variable not set")

    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


@contextmanager
def db_connection():
    """
    Context manager for database connections.

    Automatically closes connection and cursor on exit, even if an exception occurs.
    Usage:
        with db_connection() as (conn, cur):
            cur.execute("SELECT ...")
            results = cur.fetchall()
    """
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        yield conn, cur
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        with db_connection() as (conn, cur):
            cur.execute("SELECT COUNT(*) as count FROM iniciativas")
            count = cur.fetchone()['count']

            return jsonify({
                'status': 'ok',
                'database': 'connected',
                'iniciativas_count': count
            })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/iniciativas', methods=['GET'])
def get_iniciativas():
    """
    Get all iniciativas with their events.

    Query parameters:
        legislature - Filter by legislature (e.g. XIV, XV, XVI, XVII)
                     If not specified, returns all legislatures

    Returns data in format compatible with existing frontend:
    [
        {
            "IniId": "315506",
            "IniTitulo": "...",
            "IniTipo": "P",
            "IniDescTipo": "Proposta de Lei",
            ...
            "IniEventos": [...]
        },
        ...
    ]
    """
    try:
        with db_connection() as (conn, cur):
            # Get optional legislature filter
            legislature = request.args.get('legislature')

            # Build query with optional filter
            query = """
                SELECT
                    id, ini_id, legislature, number, type, type_description,
                    title, author_type, author_name, start_date, end_date,
                    current_status, is_completed, text_link, raw_data, summary
                FROM iniciativas
            """
            params = []

            if legislature:
                query += " WHERE legislature = %s"
                params.append(legislature)

            query += " ORDER BY start_date DESC"

            # Get iniciativas
            cur.execute(query, params)
            iniciativas = cur.fetchall()

            # Get all initiative database IDs for batch event query
            ini_db_ids = [ini['id'] for ini in iniciativas]

            # Batch fetch all events (avoids N+1 query problem)
            events_query = """
                SELECT iniciativa_id, phase_name, event_date, observations
                FROM iniciativa_events
                WHERE iniciativa_id = ANY(%s)
                ORDER BY iniciativa_id, event_date
            """
            cur.execute(events_query, (ini_db_ids,))
            all_events = cur.fetchall()

            # Group events by initiative database ID
            events_by_ini_db_id = {}
            for event in all_events:
                ini_db_id = event['iniciativa_id']
                if ini_db_id not in events_by_ini_db_id:
                    events_by_ini_db_id[ini_db_id] = []
                events_by_ini_db_id[ini_db_id].append({
                    'Fase': event['phase_name'],
                    'DataFase': event['event_date'].isoformat() if event['event_date'] else None,
                    'DescFase': event['observations']
                })

            # Build response using normalized columns (no raw_data needed!)
            # This reduces payload size by ~90% and uses single batch query for events
            result = []
            for ini in iniciativas:
                try:
                    raw_data = ini['raw_data'] or {}
                    minimal_data = {
                        'IniId': ini['ini_id'],
                        'IniTitulo': ini['title'],
                        'IniTipo': ini['type'],
                        'IniDescTipo': ini['type_description'],
                        'IniNr': ini['number'],
                        'IniLeg': ini['legislature'],
                        'IniLinkTexto': ini['text_link'],
                        'IniEventos': events_by_ini_db_id.get(ini['id'], []),
                        'IniAutorGruposParlamentares': raw_data.get('IniAutorGruposParlamentares'),
                        'IniAutorOutros': raw_data.get('IniAutorOutros'),
                        'DataInicioleg': ini['start_date'].isoformat() if ini['start_date'] else None,
                        '_currentStatus': ini['current_status'],
                        '_isCompleted': ini['is_completed'],
                        '_summary': ini['summary']
                    }

                    result.append(minimal_data)
                except Exception as e:
                    logger.warning("Error processing iniciativa %s: %s", ini['ini_id'], e)
                    continue

            return jsonify(result)

    except Exception as e:
        logger.exception("Error fetching iniciativas")
        return jsonify({'error': str(e), 'type': type(e).__name__}), 500


@app.route('/api/iniciativas/<ini_id>', methods=['GET'])
def get_iniciativa(ini_id):
    """Get single iniciativa by ID."""
    try:
        with db_connection() as (conn, cur):
            cur.execute("""
                SELECT raw_data
                FROM iniciativas
                WHERE ini_id = %s
            """, (ini_id,))

            row = cur.fetchone()

            if not row:
                return jsonify({'error': 'Not found'}), 404

            # raw_data is already a dict (JSONB)
            data = row['raw_data']

            return jsonify(data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/phase-counts', methods=['GET'])
def get_phase_counts():
    """
    Get counts of iniciativas by current phase/status.

    Returns: [{"phase": "Entrada", "count": 808}, ...]
    """
    try:
        with db_connection() as (conn, cur):
            # Get phase counts from events table
            cur.execute("""
                SELECT
                    phase_name as phase,
                    COUNT(DISTINCT iniciativa_id) as count
                FROM iniciativa_events
                GROUP BY phase_name
                ORDER BY count DESC
            """)

            phases = [{'phase': row['phase'], 'count': row['count']}
                      for row in cur.fetchall()]

            return jsonify(phases)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/agenda', methods=['GET'])
def get_agenda():
    """
    Get agenda events.

    Returns data in format compatible with existing frontend.
    """
    try:
        with db_connection() as (conn, cur):
            # Optional date filters
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')

            query = "SELECT raw_data FROM agenda_events WHERE 1=1"
            params = []

            if start_date:
                query += " AND start_date >= %s"
                params.append(start_date)

            if end_date:
                query += " AND start_date <= %s"
                params.append(end_date)

            query += " ORDER BY start_date, start_time"

            cur.execute(query, params)

            # raw_data is already a dict (JSONB)
            events = [row['raw_data'] for row in cur.fetchall()]

            return jsonify(events)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/agenda/<int:event_id>/initiatives', methods=['GET'])
def get_agenda_initiatives(event_id):
    """
    Get all initiatives linked to an agenda event.

    Returns:
        {
            "agenda_event": {...},
            "linked_initiatives": [...]
        }
    """
    try:
        with db_connection() as (conn, cur):
            # Get agenda event details
            cur.execute("""
                SELECT
                    id, event_id, title, start_date, start_time, end_time,
                    section, committee, location, description, raw_data
                FROM agenda_events
                WHERE event_id = %s
            """, (event_id,))

            agenda_row = cur.fetchone()

            if not agenda_row:
                return jsonify({'error': 'Agenda event not found'}), 404

            # Get linked initiatives with their details
            cur.execute("""
                SELECT
                    i.ini_id,
                    i.legislature,
                    i.number,
                    i.type,
                    i.type_description,
                    i.title,
                    i.author_name,
                    i.current_status,
                    i.is_completed,
                    i.text_link,
                    l.link_type,
                    l.link_confidence,
                    l.extracted_text
                FROM agenda_initiative_links l
                JOIN iniciativas i ON l.iniciativa_id = i.id
                WHERE l.agenda_event_id = %s
                ORDER BY l.link_confidence DESC, i.ini_id
            """, (agenda_row['id'],))

            initiatives = []
            for row in cur.fetchall():
                initiatives.append({
                    'ini_id': row['ini_id'],
                    'legislature': row['legislature'],
                    'number': row['number'],
                    'type': row['type'],
                    'type_description': row['type_description'],
                    'title': row['title'],
                    'author': row['author_name'],
                    'status': row['current_status'],
                    'is_completed': row['is_completed'],
                    'text_link': row['text_link'],
                    'link_type': row['link_type'],
                    'link_confidence': float(row['link_confidence']) if row['link_confidence'] else None,
                    'link_evidence': row['extracted_text']
                })

            # Extract InternetText from raw_data if available
            raw_data = agenda_row['raw_data'] or {}
            internet_text = raw_data.get('InternetText')

            result = {
                'agenda_event': {
                    'event_id': agenda_row['event_id'],
                    'title': agenda_row['title'],
                    'date': agenda_row['start_date'].isoformat() if agenda_row['start_date'] else None,
                    'start_time': str(agenda_row['start_time']) if agenda_row['start_time'] else None,
                    'end_time': str(agenda_row['end_time']) if agenda_row['end_time'] else None,
                    'section': agenda_row['section'],
                    'committee': agenda_row['committee'],
                    'location': agenda_row['location'],
                    'description_html': internet_text
                },
                'linked_initiatives': initiatives
            }

            return jsonify(result)

    except Exception as e:
        logger.exception("Error fetching agenda initiatives for event %s", event_id)
        return jsonify({'error': str(e)}), 500


@app.route('/api/legislatures', methods=['GET'])
def get_legislatures():
    """Get list of available legislatures with counts."""
    try:
        with db_connection() as (conn, cur):
            cur.execute("""
                SELECT
                    legislature,
                    COUNT(*) as count,
                    MIN(start_date) as earliest_date,
                    MAX(start_date) as latest_date
                FROM iniciativas
                GROUP BY legislature
                ORDER BY legislature DESC
            """)

            legislatures = []
            for row in cur.fetchall():
                legislatures.append({
                    'legislature': row['legislature'],
                    'count': row['count'],
                    'earliest_date': row['earliest_date'].isoformat() if row['earliest_date'] else None,
                    'latest_date': row['latest_date'].isoformat() if row['latest_date'] else None
                })

            return jsonify(legislatures)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """
    Get overall statistics.

    Query parameters:
        legislature - Filter by legislature (optional)
    """
    try:
        with db_connection() as (conn, cur):
            # Get optional legislature filter
            legislature = request.args.get('legislature')

            stats = {}

            # Build WHERE clause
            where_clause = ""
            params = []
            if legislature:
                where_clause = " WHERE legislature = %s"
                params.append(legislature)

            # Total iniciativas
            cur.execute(f"SELECT COUNT(*) as count FROM iniciativas{where_clause}", params)
            stats['total'] = cur.fetchone()['count']

            # Completed
            cur.execute(f"SELECT COUNT(*) as count FROM iniciativas{where_clause} {'AND' if legislature else 'WHERE'} is_completed = TRUE",
                       params + [] if not legislature else params)
            stats['completed'] = cur.fetchone()['count']

            # By legislature (only if not filtered)
            if not legislature:
                cur.execute("""
                    SELECT legislature, COUNT(*) as count
                    FROM iniciativas
                    GROUP BY legislature
                    ORDER BY legislature DESC
                """)
                stats['by_legislature'] = [{'legislature': row['legislature'], 'count': row['count']}
                                           for row in cur.fetchall()]

            # By type
            cur.execute(f"""
                SELECT type_description, COUNT(*) as count
                FROM iniciativas{where_clause}
                GROUP BY type_description
                ORDER BY count DESC
            """, params)
            stats['by_type'] = [{'type': row['type_description'], 'count': row['count']}
                               for row in cur.fetchall()]

            # By status
            cur.execute(f"""
                SELECT current_status, COUNT(*) as count
                FROM iniciativas{where_clause}
                GROUP BY current_status
                ORDER BY count DESC
                LIMIT 10
            """, params)
            stats['by_status'] = [{'status': row['current_status'], 'count': row['count']}
                                 for row in cur.fetchall()]

            # Agenda count (no filter for agenda)
            cur.execute("SELECT COUNT(*) as count FROM agenda_events")
            stats['agenda_events'] = cur.fetchone()['count']

            return jsonify(stats)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/search', methods=['GET'])
def search_iniciativas():
    """
    Full-text search on iniciativas titles and summaries.

    Query params:
        q - search query
        limit - max results (default 20)
        legislature - filter by legislature (optional)
    """
    try:
        query = request.args.get('q', '')
        limit = int(request.args.get('limit', 20))
        legislature = request.args.get('legislature')

        if not query:
            return jsonify([])

        with db_connection() as (conn, cur):
            # Build query with optional legislature filter
            # Search in both title (weight A) and summary (weight B)
            sql_query = """
                SELECT
                    ini_id, legislature, title, type_description, current_status, start_date,
                    ts_rank(
                        setweight(to_tsvector('portuguese', COALESCE(title, '')), 'A') ||
                        setweight(to_tsvector('portuguese', COALESCE(summary, '')), 'B'),
                        query
                    ) as rank
                FROM iniciativas,
                     to_tsquery('portuguese', %s) as query
                WHERE (
                    to_tsvector('portuguese', COALESCE(title, '')) ||
                    to_tsvector('portuguese', COALESCE(summary, ''))
                ) @@ query
            """
            params = [query]

            if legislature:
                sql_query += " AND legislature = %s"
                params.append(legislature)

            sql_query += """
                ORDER BY rank DESC
                LIMIT %s
            """
            params.append(limit)

            cur.execute(sql_query, params)

            results = []
            for row in cur.fetchall():
                results.append({
                    'ini_id': row['ini_id'],
                    'legislature': row['legislature'],
                    'title': row['title'],
                    'type': row['type_description'],
                    'status': row['current_status'],
                    'date': row['start_date'].isoformat() if row['start_date'] else None,
                    'relevance': float(row['rank'])
                })

            return jsonify(results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/orgaos', methods=['GET'])
def get_orgaos():
    """
    Get all parliamentary bodies (committees, working groups, etc.)

    Query parameters:
        type - Filter by type (comissao, grupo_trabalho, subcomissao, etc.)

    Returns list of bodies with member counts by party.
    """
    try:
        with db_connection() as (conn, cur):
            # Optional type filter
            org_type = request.args.get('type')

            query = """
                SELECT
                    o.id, o.org_id, o.legislature, o.name, o.acronym, o.org_type, o.number,
                    COUNT(m.id) as member_count
                FROM orgaos o
                LEFT JOIN orgao_membros m ON o.id = m.orgao_id
            """
            params = []

            if org_type:
                query += " WHERE o.org_type = %s"
                params.append(org_type)

            query += " GROUP BY o.id ORDER BY o.org_type, o.name"

            cur.execute(query, params)

            orgaos = []
            for row in cur.fetchall():
                orgaos.append({
                    'id': row['id'],
                    'org_id': row['org_id'],
                    'legislature': row['legislature'],
                    'name': row['name'],
                    'acronym': row['acronym'],
                    'type': row['org_type'],
                    'number': row['number'],
                    'member_count': row['member_count']
                })

            return jsonify(orgaos)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/orgaos/<int:org_id>', methods=['GET'])
def get_orgao(org_id):
    """
    Get a single parliamentary body with its members and party breakdown.

    Returns body details plus members grouped by party.
    """
    try:
        with db_connection() as (conn, cur):
            # Get body details
            cur.execute("""
                SELECT id, org_id, legislature, name, acronym, org_type, number
                FROM orgaos
                WHERE org_id = %s
            """, (org_id,))

            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Not found'}), 404

            db_id = row['id']

            orgao = {
                'id': row['id'],
                'org_id': row['org_id'],
                'legislature': row['legislature'],
                'name': row['name'],
                'acronym': row['acronym'],
                'type': row['org_type'],
                'number': row['number']
            }

            # Get members
            cur.execute("""
                SELECT dep_id, deputy_name, party, role, member_type
                FROM orgao_membros
                WHERE orgao_id = %s
                ORDER BY
                    CASE WHEN role IS NOT NULL THEN 0 ELSE 1 END,
                    party, deputy_name
            """, (db_id,))

            members = []
            party_counts = {}

            for row in cur.fetchall():
                party = row['party'] or 'Sem partido'
                party_counts[party] = party_counts.get(party, 0) + 1

                members.append({
                    'dep_id': row['dep_id'],
                    'name': row['deputy_name'],
                    'party': party,
                    'role': row['role'],
                    'member_type': row['member_type']
                })

            orgao['members'] = members
            orgao['party_breakdown'] = party_counts
            orgao['member_count'] = len(members)

            # Get agenda events for this committee (by name match)
            # Strip name to handle trailing spaces in data
            committee_name = orgao['name'].strip()
            cur.execute("""
                SELECT event_id, title, subtitle, start_date, start_time,
                       location, description, meeting_number
                FROM agenda_events
                WHERE committee ILIKE %s
                ORDER BY start_date DESC, start_time DESC
                LIMIT 20
            """, (f"%{committee_name}%",))

            agenda_events = []
            for row in cur.fetchall():
                agenda_events.append({
                    'event_id': row['event_id'],
                    'title': row['title'],
                    'subtitle': row['subtitle'],
                    'date': row['start_date'].isoformat() if row['start_date'] else None,
                    'time': row['start_time'].strftime('%H:%M') if row['start_time'] else None,
                    'location': row['location'],
                    'description': row['description'],
                    'meeting_number': row['meeting_number']
                })

            orgao['agenda_events'] = agenda_events

            # Get initiatives linked to this committee (from iniciativa_comissao)
            cur.execute("""
                SELECT
                    ic.id,
                    ic.link_type,
                    ic.phase_code,
                    ic.phase_name,
                    ic.has_vote,
                    ic.vote_result,
                    ic.vote_date,
                    ic.has_rapporteur,
                    ic.distribution_date,
                    i.id as ini_db_id,
                    i.ini_id,
                    i.number,
                    i.type,
                    i.type_description,
                    i.title,
                    i.current_status,
                    i.is_completed,
                    i.author_name
                FROM iniciativa_comissao ic
                JOIN iniciativas i ON ic.iniciativa_id = i.id
                WHERE ic.orgao_id = %s
                ORDER BY
                    CASE ic.link_type WHEN 'lead' THEN 1 WHEN 'secondary' THEN 2 ELSE 3 END,
                    i.is_completed ASC,
                    ic.distribution_date DESC NULLS LAST
            """, (db_id,))

            initiatives = []
            for row in cur.fetchall():
                initiatives.append({
                    'link_id': row['id'],
                    'link_type': row['link_type'],
                    'phase_code': row['phase_code'],
                    'phase_name': row['phase_name'],
                    'has_vote': row['has_vote'],
                    'vote_result': row['vote_result'],
                    'vote_date': row['vote_date'].isoformat() if row['vote_date'] else None,
                    'has_rapporteur': row['has_rapporteur'],
                    'distribution_date': row['distribution_date'].isoformat() if row['distribution_date'] else None,
                    'initiative': {
                        'id': row['ini_db_id'],
                        'ini_id': row['ini_id'],
                        'number': row['number'],
                        'type': row['type'],
                        'type_description': row['type_description'],
                        'title': row['title'],
                        'current_status': row['current_status'],
                        'is_completed': row['is_completed'],
                        'author_name': row['author_name']
                    }
                })

            orgao['initiatives'] = initiatives
            orgao['initiative_count'] = len(initiatives)

            return jsonify(orgao)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/orgaos/summary', methods=['GET'])
def get_orgaos_summary():
    """
    Get summary of all committees with party composition.

    Returns aggregated view suitable for visualization.
    """
    try:
        with db_connection() as (conn, cur):
            # Get all committees (main ones only) with party breakdown
            cur.execute("""
                SELECT
                    o.id, o.org_id, o.name, o.acronym, o.org_type,
                    m.party,
                    COUNT(*) as count
                FROM orgaos o
                JOIN orgao_membros m ON o.id = m.orgao_id
                WHERE o.org_type = 'comissao'
                GROUP BY o.id, o.org_id, o.name, o.acronym, o.org_type, m.party
                ORDER BY o.name, m.party
            """)

            # Build nested structure
            committees = {}
            for row in cur.fetchall():
                org_id = row['org_id']
                if org_id not in committees:
                    committees[org_id] = {
                        'id': row['id'],
                        'org_id': org_id,
                        'name': row['name'],
                        'acronym': row['acronym'],
                        'type': row['org_type'],
                        'parties': {},
                        'total_members': 0,
                        'ini_authored': 0,
                        'ini_in_progress': 0,
                        'ini_approved': 0,
                        'ini_rejected': 0
                    }

                party = row['party'] or 'Sem partido'
                committees[org_id]['parties'][party] = row['count']
                committees[org_id]['total_members'] += row['count']

            # Get initiative statistics for each committee
            # 1. Authored initiatives (rare - committees as authors)
            cur.execute("""
                SELECT orgao_id, COUNT(*) as count
                FROM iniciativa_autores
                WHERE author_type = 'committee' AND orgao_id IS NOT NULL
                GROUP BY orgao_id
            """)
            for row in cur.fetchall():
                db_id = row['orgao_id']
                # Find committee by db id
                for c in committees.values():
                    if c['id'] == db_id:
                        c['ini_authored'] = row['count']
                        break

            # 2. Lead initiatives in progress (not completed)
            cur.execute("""
                SELECT ic.orgao_id, COUNT(*) as count
                FROM iniciativa_comissao ic
                JOIN iniciativas i ON ic.iniciativa_id = i.id
                WHERE ic.link_type = 'lead' AND i.is_completed = FALSE
                GROUP BY ic.orgao_id
            """)
            for row in cur.fetchall():
                db_id = row['orgao_id']
                for c in committees.values():
                    if c['id'] == db_id:
                        c['ini_in_progress'] = row['count']
                        break

            # 3. Approved initiatives (lead only)
            cur.execute("""
                SELECT ic.orgao_id, COUNT(*) as count
                FROM iniciativa_comissao ic
                JOIN iniciativas i ON ic.iniciativa_id = i.id
                WHERE ic.link_type = 'lead'
                  AND i.is_completed = TRUE
                  AND i.current_status ILIKE '%publicação%'
                GROUP BY ic.orgao_id
            """)
            for row in cur.fetchall():
                db_id = row['orgao_id']
                for c in committees.values():
                    if c['id'] == db_id:
                        c['ini_approved'] = row['count']
                        break

            # 4. Rejected initiatives (lead only)
            cur.execute("""
                SELECT ic.orgao_id, COUNT(*) as count
                FROM iniciativa_comissao ic
                JOIN iniciativas i ON ic.iniciativa_id = i.id
                WHERE ic.link_type = 'lead'
                  AND i.is_completed = TRUE
                  AND (i.current_status ILIKE '%rejeitad%'
                       OR i.current_status ILIKE '%retirad%'
                       OR i.current_status ILIKE '%caducad%')
                GROUP BY ic.orgao_id
            """)
            for row in cur.fetchall():
                db_id = row['orgao_id']
                for c in committees.values():
                    if c['id'] == db_id:
                        c['ini_rejected'] = row['count']
                        break

            # Convert to list and sort by name
            result = sorted(committees.values(), key=lambda x: x['name'])

            return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/deputados', methods=['GET'])
def get_deputados():
    """
    Get all deputies with biographical and committee data.

    Query parameters:
        legislature - Filter by legislature (default: XVII)
        party - Filter by party
        circulo - Filter by electoral district
        situation - Filter by situation (Efetivo, Suspenso, etc.)
                   Default: 'serving' (shows all 230 active deputies)
                   Special values: 'serving' = Efetivo + Efetivo Temporario + Efetivo Definitivo
                                  'all' = no situation filter

    Returns list of deputies with party composition summary.
    """
    # Serving situations = deputies currently in office (total 230)
    SERVING_SITUATIONS = ['Efetivo', 'Efetivo Temporário', 'Efetivo Definitivo']

    try:
        with db_connection() as (conn, cur):
            # Get optional filters
            legislature = request.args.get('legislature', 'XVII')
            party = request.args.get('party')
            circulo = request.args.get('circulo')
            # Default to 'serving' - shows all 230 active deputies
            situation = request.args.get('situation', 'serving') or 'serving'

            # Build query - JOIN with deputados_bio for biographical data
            query = """
                SELECT
                    d.id, d.dep_id, d.dep_cad_id, d.legislature,
                    d.name, d.full_name, d.party, d.circulo_id, d.circulo,
                    b.gender, b.birth_date, b.profession, b.education,
                    d.situation, d.situation_start, d.situation_end
                FROM deputados d
                LEFT JOIN deputados_bio b ON d.dep_cad_id = b.cad_id
                WHERE d.legislature = %s
            """
            params = [legislature]

            if party:
                query += " AND d.party = %s"
                params.append(party)

            if circulo:
                query += " AND d.circulo = %s"
                params.append(circulo)

            # Handle situation filter
            if situation == 'serving':
                query += " AND d.situation = ANY(%s)"
                params.append(SERVING_SITUATIONS)
            elif situation != 'all':
                query += " AND d.situation = %s"
                params.append(situation)

            query += " ORDER BY d.party, d.name"

            cur.execute(query, params)

            # Build deputy list
            deputados = []
            dep_ids = []

            for row in cur.fetchall():
                dep_cad_id = row['dep_cad_id']
                dep_ids.append(dep_cad_id)

                # Calculate age from birth_date
                age = None
                if row['birth_date']:
                    today = datetime.now().date()
                    birth = row['birth_date']
                    age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))

                deputados.append({
                    'id': row['id'],
                    'dep_id': row['dep_id'],
                    'dep_cad_id': dep_cad_id,
                    'name': row['name'],
                    'full_name': row['full_name'],
                    'party': row['party'],
                    'circulo': row['circulo'],
                    'gender': row['gender'],
                    'age': age,
                    'profession': row['profession'],
                    'education': row['education'],
                    'situation': row['situation'],
                    'comissoes': [],  # Will be filled below
                    'grupos_trabalho': []  # Will be filled below
                })

            # Get committee and working group memberships for all deputies
            if dep_ids:
                # Fetch comissões
                cur.execute("""
                    SELECT
                        m.dep_cad_id,
                        o.name as orgao_name,
                        o.acronym,
                        m.role,
                        m.member_type
                    FROM orgao_membros m
                    JOIN orgaos o ON m.orgao_id = o.id
                    WHERE m.dep_cad_id = ANY(%s)
                      AND o.org_type = 'comissao'
                    ORDER BY m.dep_cad_id, o.name
                """, (dep_ids,))

                # Group committees by deputy
                comissoes_by_dep = {}
                for row in cur.fetchall():
                    dep_cad_id = row['dep_cad_id']
                    if dep_cad_id not in comissoes_by_dep:
                        comissoes_by_dep[dep_cad_id] = []
                    comissoes_by_dep[dep_cad_id].append({
                        'name': row['orgao_name'],
                        'acronym': row['acronym'],
                        'role': row['role'],
                        'member_type': row['member_type']
                    })

                # Fetch grupos de trabalho
                cur.execute("""
                    SELECT
                        m.dep_cad_id,
                        o.name as orgao_name,
                        o.acronym,
                        m.role,
                        m.member_type
                    FROM orgao_membros m
                    JOIN orgaos o ON m.orgao_id = o.id
                    WHERE m.dep_cad_id = ANY(%s)
                      AND o.org_type = 'grupo_trabalho'
                    ORDER BY m.dep_cad_id, o.name
                """, (dep_ids,))

                # Group working groups by deputy
                grupos_by_dep = {}
                for row in cur.fetchall():
                    dep_cad_id = row['dep_cad_id']
                    if dep_cad_id not in grupos_by_dep:
                        grupos_by_dep[dep_cad_id] = []
                    grupos_by_dep[dep_cad_id].append({
                        'name': row['orgao_name'],
                        'acronym': row['acronym'],
                        'role': row['role'],
                        'member_type': row['member_type']
                    })

                # Add committees and working groups to each deputy
                for dep in deputados:
                    dep['comissoes'] = comissoes_by_dep.get(dep['dep_cad_id'], [])
                    dep['grupos_trabalho'] = grupos_by_dep.get(dep['dep_cad_id'], [])

            # Find who Efetivo Temporário deputies are replacing
            # They replace Suspenso(Eleito) deputies from same circulo and party
            temp_deputies = [d for d in deputados if d['situation'] == 'Efetivo Temporário']
            if temp_deputies:
                # Get all suspended deputies in same legislature
                cur.execute("""
                    SELECT name, party, circulo
                    FROM deputados
                    WHERE legislature = %s AND situation = 'Suspenso(Eleito)'
                """, (legislature,))

                # Group suspended by (circulo, party)
                suspended_by_location = {}
                for row in cur.fetchall():
                    key = (row['circulo'], row['party'])
                    if key not in suspended_by_location:
                        suspended_by_location[key] = []
                    suspended_by_location[key].append(row['name'])

                # Match temp deputies to who they're replacing
                for dep in deputados:
                    if dep['situation'] == 'Efetivo Temporário':
                        key = (dep['circulo'], dep['party'])
                        replacing = suspended_by_location.get(key, [])
                        dep['replaces'] = replacing[0] if len(replacing) == 1 else replacing if replacing else None
                    else:
                        dep['replaces'] = None

            # Get party composition summary (for hemicycle)
            # Use same situation filter as main query for consistency
            if situation == 'serving':
                cur.execute("""
                    SELECT party, COUNT(*) as count
                    FROM deputados
                    WHERE legislature = %s AND situation = ANY(%s)
                    GROUP BY party
                    ORDER BY count DESC
                """, (legislature, SERVING_SITUATIONS))
            elif situation == 'all':
                cur.execute("""
                    SELECT party, COUNT(*) as count
                    FROM deputados
                    WHERE legislature = %s
                    GROUP BY party
                    ORDER BY count DESC
                """, (legislature,))
            else:
                cur.execute("""
                    SELECT party, COUNT(*) as count
                    FROM deputados
                    WHERE legislature = %s AND situation = %s
                    GROUP BY party
                    ORDER BY count DESC
                """, (legislature, situation))

            party_composition = {}
            total_deputados = 0
            for row in cur.fetchall():
                party_name = row['party'] or 'Sem partido'
                party_composition[party_name] = row['count']
                total_deputados += row['count']

            # Get gender breakdown (gender is in deputados_bio table)
            if situation == 'serving':
                cur.execute("""
                    SELECT b.gender, COUNT(*) as count
                    FROM deputados d
                    LEFT JOIN deputados_bio b ON d.dep_cad_id = b.cad_id
                    WHERE d.legislature = %s AND d.situation = ANY(%s)
                    GROUP BY b.gender
                """, (legislature, SERVING_SITUATIONS))
            elif situation == 'all':
                cur.execute("""
                    SELECT b.gender, COUNT(*) as count
                    FROM deputados d
                    LEFT JOIN deputados_bio b ON d.dep_cad_id = b.cad_id
                    WHERE d.legislature = %s
                    GROUP BY b.gender
                """, (legislature,))
            else:
                cur.execute("""
                    SELECT b.gender, COUNT(*) as count
                    FROM deputados d
                    LEFT JOIN deputados_bio b ON d.dep_cad_id = b.cad_id
                    WHERE d.legislature = %s AND d.situation = %s
                    GROUP BY b.gender
                """, (legislature, situation))

            gender_breakdown = {}
            for row in cur.fetchall():
                gender_breakdown[row['gender'] or 'Unknown'] = row['count']

            # Get circulo breakdown
            if situation == 'serving':
                cur.execute("""
                    SELECT circulo, COUNT(*) as count
                    FROM deputados
                    WHERE legislature = %s AND situation = ANY(%s)
                    GROUP BY circulo
                    ORDER BY count DESC
                """, (legislature, SERVING_SITUATIONS))
            elif situation == 'all':
                cur.execute("""
                    SELECT circulo, COUNT(*) as count
                    FROM deputados
                    WHERE legislature = %s
                    GROUP BY circulo
                    ORDER BY count DESC
                """, (legislature,))
            else:
                cur.execute("""
                    SELECT circulo, COUNT(*) as count
                    FROM deputados
                    WHERE legislature = %s AND situation = %s
                    GROUP BY circulo
                    ORDER BY count DESC
                """, (legislature, situation))

            circulo_breakdown = {}
            for row in cur.fetchall():
                circulo_breakdown[row['circulo']] = row['count']

            return jsonify({
                'deputados': deputados,
                'summary': {
                    'total': total_deputados,
                    'party_composition': party_composition,
                    'gender_breakdown': gender_breakdown,
                    'circulo_breakdown': circulo_breakdown
                }
            })

    except Exception as e:
        logger.exception("Error fetching deputados")
        return jsonify({'error': str(e)}), 500


# Simple in-memory rate limiter for feedback
feedback_rate_limit = {}
FEEDBACK_RATE_LIMIT_MINUTES = 5
FEEDBACK_RATE_LIMIT_MAX = 3  # Max 3 submissions per 5 minutes per IP


@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """
    Submit user feedback, creating a GitHub issue.

    Expected JSON body:
    {
        "title": "Feedback title",
        "description": "Detailed feedback",
        "email": "optional@email.com",
        "page": "/iniciativas",
        "honeypot": ""  # Must be empty (bot trap)
    }
    """
    try:
        # Check for GitHub token
        github_token = os.environ.get('GITHUB_TOKEN')
        if not github_token:
            return jsonify({'error': 'Feedback system not configured'}), 503

        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Honeypot check (bot trap - this field should be empty)
        if data.get('honeypot'):
            # Silently accept but don't create issue (it's a bot)
            return jsonify({'success': True, 'message': 'Feedback received'})

        # Validate required fields
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()

        if not title or len(title) < 5:
            return jsonify({'error': 'Title must be at least 5 characters'}), 400

        if not description or len(description) < 10:
            return jsonify({'error': 'Description must be at least 10 characters'}), 400

        if len(title) > 200:
            return jsonify({'error': 'Title too long (max 200 characters)'}), 400

        if len(description) > 5000:
            return jsonify({'error': 'Description too long (max 5000 characters)'}), 400

        # Rate limiting by IP
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if client_ip:
            client_ip = client_ip.split(',')[0].strip()

        now = datetime.now()
        cutoff = now - timedelta(minutes=FEEDBACK_RATE_LIMIT_MINUTES)

        # Clean old entries and check rate limit
        if client_ip in feedback_rate_limit:
            feedback_rate_limit[client_ip] = [
                t for t in feedback_rate_limit[client_ip] if t > cutoff
            ]
            if len(feedback_rate_limit[client_ip]) >= FEEDBACK_RATE_LIMIT_MAX:
                return jsonify({
                    'error': f'Too many submissions. Please wait {FEEDBACK_RATE_LIMIT_MINUTES} minutes.'
                }), 429
        else:
            feedback_rate_limit[client_ip] = []

        # Record this submission
        feedback_rate_limit[client_ip].append(now)

        # Optional fields
        email = data.get('email', '').strip() or 'Anonymous'
        page = data.get('page', '').strip() or 'Unknown'
        user_agent = request.headers.get('User-Agent', 'Unknown')[:200]

        # Build issue body
        issue_body = f"""## User Feedback

**From:** {email}
**Page:** {page}
**Date:** {now.strftime('%Y-%m-%d %H:%M UTC')}
**Browser:** {user_agent}

---

### Description

{description}

---
*Submitted via Viriato feedback form*
"""

        # Create GitHub issue via API
        issue_data = {
            'title': f'[Feedback] {title}',
            'body': issue_body,
            'labels': ['user-feedback']
        }

        github_repo = os.environ.get('GITHUB_REPO', 'loukach/viriato')
        github_url = f'https://api.github.com/repos/{github_repo}/issues'

        req = urllib.request.Request(
            github_url,
            data=json.dumps(issue_data).encode('utf-8'),
            headers={
                'Authorization': f'token {github_token}',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Viriato-Feedback-Bot'
            },
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
                issue_number = result.get('number')
                return jsonify({
                    'success': True,
                    'message': 'Feedback submitted successfully',
                    'issue_number': issue_number
                })
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else str(e)
            logger.error("GitHub API error: %s - %s", e.code, error_body)
            return jsonify({'error': 'Failed to submit feedback'}), 500

    except Exception as e:
        logger.exception("Feedback error")
        return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'

    logger.info("Starting Viriato API on port %s (debug=%s)", port, debug)
    app.run(host='0.0.0.0', port=port, debug=debug)
