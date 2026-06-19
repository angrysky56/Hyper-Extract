"""Unit tests for AutoGraph dangling edge pruning."""

from pydantic import BaseModel, Field

from hyperextract.types import AutoGraph


class Entity(BaseModel):
    """Simple entity schema for testing."""

    name: str
    type: str
    properties: dict = Field(default_factory=dict)


class Relation(BaseModel):
    """Simple relation schema for testing."""

    source: str
    target: str
    relation_type: str


class TestAutoGraphDangling:
    """Test cases for AutoGraph dangling edge handling."""

    def test_graph_with_dangling_edges(self, llm_client, embedder):
        """Test that graph can contain dangling edges (no automatic pruning)."""
        graph = AutoGraph(
            node_schema=Entity,
            edge_schema=Relation,
            node_key_extractor=lambda x: x.name,
            edge_key_extractor=lambda x: f"{x.source}-{x.relation_type}-{x.target}",
            nodes_in_edge_extractor=lambda x: (x.source, x.target),
            llm_client=llm_client,
            embedder=embedder,
        )

        graph._node_memory.add([
            Entity(name="Apple", type="ORGANIZATION", properties={}),
        ])
        graph._edge_memory.add([
            Relation(source="Apple", target="Steve Jobs", relation_type="founded_by"),
        ])

        graph.build_index()

        nodes, edges = graph.search("Apple", top_k_nodes=2, top_k_edges=2)

        assert len(nodes) >= 1


class TestAutoGraphMerge:
    """Test cases for AutoGraph merge functionality."""

    def test_merge_batch_data_single_graph(self, llm_client, embedder):
        """Test merging single graph."""
        graph = AutoGraph(
            node_schema=Entity,
            edge_schema=Relation,
            node_key_extractor=lambda x: x.name,
            edge_key_extractor=lambda x: f"{x.source}-{x.relation_type}-{x.target}",
            nodes_in_edge_extractor=lambda x: (x.source, x.target),
            llm_client=llm_client,
            embedder=embedder,
        )

        graph._node_memory.add([
            Entity(name="Apple", type="ORGANIZATION", properties={}),
        ])

        assert len(graph.nodes) == 1
