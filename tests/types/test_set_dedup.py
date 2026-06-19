"""Unit tests for AutoSet deduplication functionality."""

import pytest
from pydantic import BaseModel
from typing import Optional
from ontomem.merger import MergeStrategy

from hyperextract.types import AutoSet


class KeywordItemSchema(BaseModel):
    """Schema for keyword items."""

    term: str
    category: Optional[str] = None
    frequency: Optional[int] = None


class TestAutoSetDedup:
    """Test cases for AutoSet deduplication functionality."""

    def test_init_and_empty_state(self, llm_client, embedder):
        """Test that AutoSet initializes correctly."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        assert auto_set.empty() is True
        assert len(auto_set) == 0

    def test_add_single_item(self, llm_client, embedder):
        """Test adding a single item."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python", category="Programming"))

        assert len(auto_set) == 1
        assert "Python" in auto_set

    def test_deduplication_by_key(self, llm_client, embedder):
        """Test that adding duplicate keys results in single item."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
            strategy_or_merger=MergeStrategy.MERGE_FIELD,
        )

        auto_set.add(KeywordItemSchema(term="Python", category="Programming"))
        auto_set.add(KeywordItemSchema(term="Python", category="Software"))

        assert len(auto_set) == 1
        assert "Python" in auto_set

    def test_multiple_unique_items(self, llm_client, embedder):
        """Test adding multiple unique items."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python", category="Programming"))
        auto_set.add(KeywordItemSchema(term="Java", category="Programming"))
        auto_set.add(KeywordItemSchema(term="React", category="Frontend"))

        assert len(auto_set) == 3

    def test_contains_true(self, llm_client, embedder):
        """Test that contains returns True for existing key."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))

        assert auto_set.contains("Python") is True
        assert "Python" in auto_set

    def test_contains_false(self, llm_client, embedder):
        """Test that contains returns False for non-existing key."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))

        assert auto_set.contains("Java") is False
        assert "Java" not in auto_set

    def test_get_existing_item(self, llm_client, embedder):
        """Test getting an existing item by key."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python", category="Programming"))

        item = auto_set.get("Python")

        assert item is not None
        assert item.term == "Python"
        assert item.category == "Programming"

    def test_get_nonexistent_item(self, llm_client, embedder):
        """Test getting a non-existent item returns None."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        item = auto_set.get("NotFound")

        assert item is None

    def test_get_with_default(self, llm_client, embedder):
        """Test getting with default value."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        result = auto_set.get("NotFound", default="default_value")

        assert result == "default_value"

    def test_remove_existing_item(self, llm_client, embedder):
        """Test removing an existing item."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))
        auto_set.add(KeywordItemSchema(term="Java"))

        removed = auto_set.remove("Python")

        assert len(auto_set) == 1
        assert "Python" not in auto_set
        assert removed.term == "Python"

    def test_remove_nonexistent_item(self, llm_client, embedder):
        """Test removing a non-existent item returns None."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))

        removed = auto_set.remove("NotFound")

        assert removed is None
        assert len(auto_set) == 1

    def test_discard_existing_item(self, llm_client, embedder):
        """Test discarding an existing item."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))

        auto_set.discard("Python")

        assert len(auto_set) == 0

    def test_discard_nonexistent_item(self, llm_client, embedder):
        """Test discarding a non-existent item doesn't raise."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))

        auto_set.discard("NotFound")

        assert len(auto_set) == 1

    def test_pop_item(self, llm_client, embedder):
        """Test popping an item."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))
        auto_set.add(KeywordItemSchema(term="Java"))

        popped = auto_set.pop()

        assert popped is not None
        assert len(auto_set) == 1

    def test_pop_from_empty_raises(self, llm_client, embedder):
        """Test that popping from empty set raises KeyError."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        with pytest.raises(KeyError):
            auto_set.pop()

    def test_keys_property(self, llm_client, embedder):
        """Test that keys property returns all unique keys."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))
        auto_set.add(KeywordItemSchema(term="Java"))

        keys = auto_set.keys

        assert len(keys) == 2
        assert "Python" in keys
        assert "Java" in keys

    def test_iteration(self, llm_client, embedder):
        """Test that AutoSet is iterable."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))
        auto_set.add(KeywordItemSchema(term="Java"))

        terms = [item.term for item in auto_set]

        assert len(terms) == 2
        assert "Python" in terms
        assert "Java" in terms

    def test_copy(self, llm_client, embedder):
        """Test copying the set."""
        auto_set = AutoSet(
            item_schema=KeywordItemSchema,
            llm_client=llm_client,
            embedder=embedder,
            key_extractor=lambda x: x.term,
        )

        auto_set.add(KeywordItemSchema(term="Python"))

        copied = auto_set.copy()

        assert len(copied) == 1
        assert "Python" in copied
        assert copied is not auto_set
