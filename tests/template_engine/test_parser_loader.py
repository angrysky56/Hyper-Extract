"""Unit tests for template parsers - loader."""

import pytest

from hyperextract.utils.template_engine.parsers import (
    load_template,
)


class TestLoadTemplate:
    """Test cases for load_template function."""

    def test_load_nonexistent_file_raises(self):
        """Test that loading a nonexistent file raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            load_template("/nonexistent/path/to/template.yaml")

    def test_load_existing_template(self):
        """Test loading an existing template from the gallery."""
        from hyperextract.utils.template_engine import Gallery

        template = Gallery.get("general/model")

        assert template is not None
        assert hasattr(template, "name")
        assert hasattr(template, "type")
        assert hasattr(template, "output")
