"""
Pytest configuration and fixtures for Viriato API tests.
"""

import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def mock_db_connection():
    """Create a mock database connection and cursor."""
    mock_cursor = MagicMock()
    mock_conn = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    return mock_conn, mock_cursor


@pytest.fixture
def app(mock_db_connection):
    """Create Flask app with mocked database."""
    mock_conn, mock_cursor = mock_db_connection

    with patch.dict(os.environ, {'DATABASE_URL': 'postgresql://test:test@localhost/test'}):
        with patch('api.app.get_db_connection', return_value=mock_conn):
            from api.app import app as flask_app
            flask_app.config['TESTING'] = True
            yield flask_app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def mock_iniciativas_data():
    """Sample iniciativas data for testing."""
    return [
        {
            'id': 1,
            'ini_id': '315506',
            'legislature': 'XVII',
            'number': '28',
            'type': 'P',
            'type_description': 'Proposta de Lei',
            'title': 'Test Initiative',
            'current_status': 'Entrada',
            'is_completed': False,
            'start_date': '2025-03-26',
            'raw_data': {}
        }
    ]


@pytest.fixture
def mock_agenda_data():
    """Sample agenda data for testing."""
    return [
        {
            'id': 1,
            'event_id': 12345,
            'title': 'Test Event',
            'section': 'Plenario',
            'start_date': '2025-03-26',
            'start_time': '10:00:00',
            'location': 'Sala 1'
        }
    ]


@pytest.fixture
def mock_deputados_data():
    """Sample deputados data for testing."""
    return [
        {
            'id': 1,
            'dep_id': 16194,
            'name': 'Test Deputy',
            'party': 'PS',
            'circulo': 'Lisboa',
            'gender': 'M',
            'situation': 'Efetivo'
        }
    ]
