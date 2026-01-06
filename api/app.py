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
                ini_id, legislature, number, type, type_description,
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

        # For each iniciativa, get its events
        result = []
        for ini in iniciativas:
            try:
                # raw_data is already a dict (JSONB automatically parsed by psycopg2)
                original_data = ini['raw_data'] if ini['raw_data'] else {}

                # Use original data but ensure we have the latest status
                original_data['_currentStatus'] = ini['current_status']
                original_data['_isCompleted'] = ini['is_completed']

                result.append(original_data)
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


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'

    print(f"Starting Viriato API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=debug)
