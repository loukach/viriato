#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Viriato API - Flask backend for Portuguese Parliament data.

Provides REST API endpoints for the frontend to query PostgreSQL database.
"""

import os
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

def get_db_connection():
    """Get database connection from environment."""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")

    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as count FROM iniciativas")
        count = cur.fetchone()['count']
        cur.close()
        conn.close()

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
        conn = get_db_connection()
        cur = conn.cursor()

        # Get optional legislature filter
        legislature = request.args.get('legislature')

        # Build query with optional filter
        query = """
            SELECT
                id, ini_id, legislature, number, type, type_description,
                title, author_type, author_name, start_date, end_date,
                current_status, is_completed, text_link, raw_data
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
                    '_isCompleted': ini['is_completed']
                }

                result.append(minimal_data)
            except Exception as e:
                # Skip errors, log
                print(f"Error processing iniciativa {ini['ini_id']}: {e}")
                continue

        cur.close()
        conn.close()

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'type': type(e).__name__}), 500


@app.route('/api/iniciativas/<ini_id>', methods=['GET'])
def get_iniciativa(ini_id):
    """Get single iniciativa by ID."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

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

        cur.close()
        conn.close()

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
        conn = get_db_connection()
        cur = conn.cursor()

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

        cur.close()
        conn.close()

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
        conn = get_db_connection()
        cur = conn.cursor()

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

        cur.close()
        conn.close()

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
        conn = get_db_connection()
        cur = conn.cursor()

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

        cur.close()
        conn.close()

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/legislatures', methods=['GET'])
def get_legislatures():
    """Get list of available legislatures with counts."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

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

        cur.close()
        conn.close()

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
        conn = get_db_connection()
        cur = conn.cursor()

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

        cur.close()
        conn.close()

        return jsonify(stats)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/search', methods=['GET'])
def search_iniciativas():
    """
    Full-text search on iniciativas titles.

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

        conn = get_db_connection()
        cur = conn.cursor()

        # Build query with optional legislature filter
        sql_query = """
            SELECT
                ini_id, legislature, title, type_description, current_status, start_date,
                ts_rank(to_tsvector('portuguese', title), query) as rank
            FROM iniciativas,
                 to_tsquery('portuguese', %s) as query
            WHERE to_tsvector('portuguese', title) @@ query
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

        cur.close()
        conn.close()

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
        conn = get_db_connection()
        cur = conn.cursor()

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

        cur.close()
        conn.close()

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
        conn = get_db_connection()
        cur = conn.cursor()

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

        cur.close()
        conn.close()

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
        conn = get_db_connection()
        cur = conn.cursor()

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
                    'total_members': 0
                }

            party = row['party'] or 'Sem partido'
            committees[org_id]['parties'][party] = row['count']
            committees[org_id]['total_members'] += row['count']

        # Convert to list and sort by name
        result = sorted(committees.values(), key=lambda x: x['name'])

        cur.close()
        conn.close()

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'

    print(f"Starting Viriato API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=debug)
