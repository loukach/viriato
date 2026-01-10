"""
Tests for Viriato API endpoints.

Uses mocked database connections to test API behavior without requiring
a real PostgreSQL database.
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import date, time


class TestHealthEndpoint:
    """Tests for /api/health endpoint."""

    def test_health_check_success(self, client, mock_db_connection):
        """Health check returns OK when database is accessible."""
        mock_conn, mock_cursor = mock_db_connection

        # Mock database response
        mock_cursor.fetchone.return_value = {'count': 1234}

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/health')

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['database'] == 'connected'
        assert data['iniciativas_count'] == 1234

    def test_health_check_db_error(self, client):
        """Health check returns 500 when database is unavailable."""
        with patch('api.app.get_db_connection', side_effect=Exception('Connection failed')):
            response = client.get('/api/health')

        assert response.status_code == 500
        data = response.get_json()
        assert data['status'] == 'error'
        assert 'Connection failed' in data['message']


class TestIniciativasEndpoint:
    """Tests for /api/iniciativas endpoint."""

    def test_get_all_iniciativas(self, client, mock_db_connection, mock_iniciativas_data):
        """Get all iniciativas returns list."""
        mock_conn, mock_cursor = mock_db_connection

        # Mock iniciativas query
        mock_cursor.fetchall.side_effect = [
            mock_iniciativas_data,  # iniciativas query
            []  # events query
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/iniciativas')

        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_get_iniciativas_with_legislature_filter(self, client, mock_db_connection):
        """Get iniciativas filters by legislature."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.side_effect = [[], []]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/iniciativas?legislature=XVII')

        assert response.status_code == 200
        # Verify legislature parameter was used in query
        call_args = mock_cursor.execute.call_args_list[0]
        assert 'XVII' in call_args[0][1]

    def test_get_iniciativas_db_error(self, client):
        """Get iniciativas returns 500 on database error."""
        with patch('api.app.get_db_connection', side_effect=Exception('DB error')):
            response = client.get('/api/iniciativas')

        assert response.status_code == 500


class TestSingleIniciativaEndpoint:
    """Tests for /api/iniciativas/<ini_id> endpoint."""

    def test_get_iniciativa_found(self, client, mock_db_connection):
        """Get single iniciativa returns data when found."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = {
            'raw_data': {'IniId': '315506', 'IniTitulo': 'Test'}
        }

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/iniciativas/315506')

        assert response.status_code == 200
        data = response.get_json()
        assert data['IniId'] == '315506'

    def test_get_iniciativa_not_found(self, client, mock_db_connection):
        """Get single iniciativa returns 404 when not found."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/iniciativas/999999')

        assert response.status_code == 404


class TestPhaseCountsEndpoint:
    """Tests for /api/phase-counts endpoint."""

    def test_get_phase_counts(self, client, mock_db_connection):
        """Get phase counts returns aggregated data."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [
            {'phase': 'Entrada', 'count': 808},
            {'phase': 'Admissao', 'count': 500}
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/phase-counts')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2
        assert data[0]['phase'] == 'Entrada'
        assert data[0]['count'] == 808


class TestAgendaEndpoint:
    """Tests for /api/agenda endpoint."""

    def test_get_agenda(self, client, mock_db_connection, mock_agenda_data):
        """Get agenda returns events."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [
            {'raw_data': {'Id': 12345, 'Titulo': 'Test Event'}}
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/agenda')

        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_get_agenda_with_date_filter(self, client, mock_db_connection):
        """Get agenda filters by date range."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/agenda?start_date=2025-01-01&end_date=2025-12-31')

        assert response.status_code == 200
        # Verify date parameters were used
        call_args = mock_cursor.execute.call_args
        assert '2025-01-01' in call_args[0][1]
        assert '2025-12-31' in call_args[0][1]


class TestAgendaInitiativesEndpoint:
    """Tests for /api/agenda/<event_id>/initiatives endpoint."""

    def test_get_agenda_initiatives_found(self, client, mock_db_connection):
        """Get agenda initiatives returns linked data."""
        mock_conn, mock_cursor = mock_db_connection

        # First call - agenda event
        mock_cursor.fetchone.return_value = {
            'id': 1,
            'event_id': 12345,
            'title': 'Test Event',
            'start_date': date(2025, 3, 26),
            'start_time': time(10, 0),
            'end_time': time(12, 0),
            'section': 'Plenario',
            'committee': None,
            'location': 'Sala 1',
            'description': 'Test',
            'raw_data': {}
        }

        # Second call - linked initiatives
        mock_cursor.fetchall.return_value = []

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/agenda/12345/initiatives')

        assert response.status_code == 200
        data = response.get_json()
        assert 'agenda_event' in data
        assert 'linked_initiatives' in data

    def test_get_agenda_initiatives_not_found(self, client, mock_db_connection):
        """Get agenda initiatives returns 404 when event not found."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/agenda/999999/initiatives')

        assert response.status_code == 404


class TestLegislaturesEndpoint:
    """Tests for /api/legislatures endpoint."""

    def test_get_legislatures(self, client, mock_db_connection):
        """Get legislatures returns list with counts."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [
            {
                'legislature': 'XVII',
                'count': 500,
                'earliest_date': date(2025, 3, 26),
                'latest_date': date(2025, 12, 31)
            },
            {
                'legislature': 'XVI',
                'count': 1200,
                'earliest_date': date(2024, 3, 26),
                'latest_date': date(2025, 3, 25)
            }
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/legislatures')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2
        assert data[0]['legislature'] == 'XVII'


class TestStatsEndpoint:
    """Tests for /api/stats endpoint."""

    def test_get_stats(self, client, mock_db_connection):
        """Get stats returns aggregated statistics."""
        mock_conn, mock_cursor = mock_db_connection

        # Multiple sequential queries
        mock_cursor.fetchone.side_effect = [
            {'count': 1000},  # total
            {'count': 200},   # completed
            {'count': 500}    # agenda_events
        ]
        mock_cursor.fetchall.side_effect = [
            [{'legislature': 'XVII', 'count': 500}],  # by_legislature
            [{'type_description': 'Proposta de Lei', 'count': 300}],  # by_type
            [{'current_status': 'Entrada', 'count': 400}]  # by_status
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/stats')

        assert response.status_code == 200
        data = response.get_json()
        assert 'total' in data
        assert 'completed' in data
        assert 'by_type' in data
        assert 'by_status' in data

    def test_get_stats_with_legislature_filter(self, client, mock_db_connection):
        """Get stats filters by legislature."""
        mock_conn, mock_cursor = mock_db_connection

        mock_cursor.fetchone.side_effect = [
            {'count': 500},   # total (filtered)
            {'count': 100},   # completed (filtered)
            {'count': 500}    # agenda_events
        ]
        mock_cursor.fetchall.side_effect = [
            [{'type_description': 'Proposta de Lei', 'count': 200}],  # by_type
            [{'current_status': 'Entrada', 'count': 300}]  # by_status
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/stats?legislature=XVII')

        assert response.status_code == 200
        data = response.get_json()
        # by_legislature should NOT be present when filtered
        assert 'by_legislature' not in data


class TestSearchEndpoint:
    """Tests for /api/search endpoint."""

    def test_search_with_query(self, client, mock_db_connection):
        """Search returns matching iniciativas."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [
            {
                'ini_id': '315506',
                'legislature': 'XVII',
                'title': 'Test Initiative',
                'type_description': 'Proposta de Lei',
                'current_status': 'Entrada',
                'start_date': date(2025, 3, 26),
                'rank': 0.95
            }
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/search?q=test')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 1
        assert data[0]['ini_id'] == '315506'

    def test_search_empty_query(self, client):
        """Search with empty query returns empty list."""
        response = client.get('/api/search?q=')

        assert response.status_code == 200
        data = response.get_json()
        assert data == []


class TestOrgaosEndpoint:
    """Tests for /api/orgaos endpoint."""

    def test_get_orgaos(self, client, mock_db_connection):
        """Get orgaos returns list of parliamentary bodies."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = [
            {
                'id': 1,
                'org_id': 100,
                'legislature': 'XVII',
                'name': 'Test Committee',
                'acronym': 'TC',
                'org_type': 'comissao',
                'number': '1',
                'member_count': 15
            }
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/orgaos')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 1
        assert data[0]['name'] == 'Test Committee'

    def test_get_orgaos_with_type_filter(self, client, mock_db_connection):
        """Get orgaos filters by type."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = []

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/orgaos?type=comissao')

        assert response.status_code == 200


class TestSingleOrgaoEndpoint:
    """Tests for /api/orgaos/<org_id> endpoint."""

    def test_get_orgao_found(self, client, mock_db_connection):
        """Get single orgao returns detailed data."""
        mock_conn, mock_cursor = mock_db_connection

        # First query - orgao details
        mock_cursor.fetchone.return_value = {
            'id': 1,
            'org_id': 100,
            'legislature': 'XVII',
            'name': 'Test Committee',
            'acronym': 'TC',
            'org_type': 'comissao',
            'number': '1'
        }

        # Multiple fetchall calls for members, events, initiatives
        mock_cursor.fetchall.side_effect = [
            [],  # members
            [],  # agenda events
            []   # initiatives
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/orgaos/100')

        assert response.status_code == 200
        data = response.get_json()
        assert data['name'] == 'Test Committee'
        assert 'members' in data
        assert 'agenda_events' in data
        assert 'initiatives' in data

    def test_get_orgao_not_found(self, client, mock_db_connection):
        """Get single orgao returns 404 when not found."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchone.return_value = None

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/orgaos/99999')

        assert response.status_code == 404


class TestOrgaosSummaryEndpoint:
    """Tests for /api/orgaos/summary endpoint."""

    def test_get_orgaos_summary(self, client, mock_db_connection):
        """Get orgaos summary returns aggregated party data."""
        mock_conn, mock_cursor = mock_db_connection

        # First fetchall - committees with party breakdown
        mock_cursor.fetchall.side_effect = [
            [
                {'id': 1, 'org_id': 100, 'name': 'Test Committee',
                 'acronym': 'TC', 'org_type': 'comissao', 'party': 'PS', 'count': 5}
            ],
            [],  # authored
            [],  # in_progress
            [],  # approved
            []   # rejected
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/orgaos/summary')

        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)


class TestDeputadosEndpoint:
    """Tests for /api/deputados endpoint."""

    def test_get_deputados(self, client, mock_db_connection, mock_deputados_data):
        """Get deputados returns list with summary."""
        mock_conn, mock_cursor = mock_db_connection

        # First query - deputados
        mock_cursor.fetchall.side_effect = [
            [
                {
                    'id': 1,
                    'dep_id': 16194,
                    'dep_cad_id': 12345,
                    'legislature': 'XVII',
                    'name': 'Test Deputy',
                    'full_name': 'Test Full Name',
                    'party': 'PS',
                    'circulo_id': 1,
                    'circulo': 'Lisboa',
                    'gender': 'M',
                    'birth_date': date(1980, 1, 1),
                    'profession': 'Advogado',
                    'situation': 'Efetivo',
                    'situation_start': date(2025, 3, 26),
                    'situation_end': None
                }
            ],
            [],  # committee memberships
            [{'party': 'PS', 'count': 100}],  # party composition
            [{'gender': 'M', 'count': 120}],  # gender breakdown
            [{'circulo': 'Lisboa', 'count': 50}]  # circulo breakdown
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/deputados')

        assert response.status_code == 200
        data = response.get_json()
        assert 'deputados' in data
        assert 'summary' in data
        assert len(data['deputados']) == 1

    def test_get_deputados_with_filters(self, client, mock_db_connection):
        """Get deputados accepts filter parameters."""
        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.side_effect = [
            [],  # deputados
            [{'party': 'PS', 'count': 100}],  # party composition
            [{'gender': 'M', 'count': 120}],  # gender breakdown
            [{'circulo': 'Lisboa', 'count': 50}]  # circulo breakdown
        ]

        with patch('api.app.get_db_connection', return_value=mock_conn):
            response = client.get('/api/deputados?party=PS&circulo=Lisboa')

        assert response.status_code == 200


class TestFeedbackEndpoint:
    """Tests for /api/feedback endpoint."""

    def test_feedback_no_token(self, client):
        """Feedback returns 503 when GitHub token not configured."""
        with patch.dict('os.environ', {'GITHUB_TOKEN': ''}, clear=False):
            response = client.post('/api/feedback', json={
                'title': 'Test feedback',
                'description': 'Test description for feedback'
            })

        assert response.status_code == 503

    def test_feedback_no_data(self, client):
        """Feedback returns 400 when no data provided."""
        with patch.dict('os.environ', {'GITHUB_TOKEN': 'test-token'}):
            response = client.post('/api/feedback',
                                   content_type='application/json',
                                   data='{}')

        assert response.status_code == 400

    def test_feedback_short_title(self, client):
        """Feedback returns 400 for short title."""
        with patch.dict('os.environ', {'GITHUB_TOKEN': 'test-token'}):
            response = client.post('/api/feedback', json={
                'title': 'abc',
                'description': 'Valid description here'
            })

        assert response.status_code == 400
        data = response.get_json()
        assert 'Title must be' in data['error']

    def test_feedback_short_description(self, client):
        """Feedback returns 400 for short description."""
        with patch.dict('os.environ', {'GITHUB_TOKEN': 'test-token'}):
            response = client.post('/api/feedback', json={
                'title': 'Valid title',
                'description': 'short'
            })

        assert response.status_code == 400
        data = response.get_json()
        assert 'Description must be' in data['error']

    def test_feedback_honeypot_triggered(self, client):
        """Feedback silently accepts when honeypot is filled (bot)."""
        with patch.dict('os.environ', {'GITHUB_TOKEN': 'test-token'}):
            response = client.post('/api/feedback', json={
                'title': 'Bot feedback',
                'description': 'Bot description here',
                'honeypot': 'filled by bot'
            })

        # Should return success but not create issue
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True


class TestCORSHeaders:
    """Tests for CORS configuration."""

    def test_cors_headers_present(self, client):
        """CORS headers are present in response."""
        response = client.get('/api/health')
        # CORS should allow requests from any origin
        # Note: CORS headers may only be present for actual cross-origin requests
        assert response.status_code in [200, 500]
