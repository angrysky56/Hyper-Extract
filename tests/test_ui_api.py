"""Unit tests for the Hyper-Extract Web UI API."""

import pytest
from fastapi.testclient import TestClient

from hyperextract.ui.server import app

client = TestClient(app)


def test_get_config():
    """Test retrieving configuration settings."""
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert "llm" in data
    assert "embedder" in data


def test_get_templates():
    """Test retrieving available extraction templates."""
    response = client.get("/api/templates")
    assert response.status_code == 200
    templates = response.json()
    assert isinstance(templates, list)
    if len(templates) > 0:
        # Check properties of first template item
        first = templates[0]
        assert "id" in first
        assert "name" in first
        assert "type" in first
        assert "language" in first
        assert "description_zh" in first
        assert "description_en" in first
        assert "tags" in first


def test_ka_list():
    """Test listing Knowledge Abstracts."""
    response = client.get("/api/ka/list")
    assert response.status_code == 200
    kas = response.json()
    assert isinstance(kas, list)


def test_get_invalid_task():
    """Test polling a non-existent task status returns 404."""
    response = client.get("/api/tasks/non-existent-task-uuid")
    assert response.status_code == 404


def test_ka_data_not_found():
    """Test getting data for non-existent KA returns 404."""
    response = client.get("/api/ka/data?path=/non/existent/path/to/ka")
    assert response.status_code == 404
