"""FastAPI backend server for Hyper-Extract Web UI."""

import json
import logging
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from hyperextract import Template
from hyperextract.cli.config import ConfigManager, load_ka_metadata
from hyperextract.cli.utils import get_template_from_ka, read_input, validate_ka_path

# Setup UI Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("he.ui_server")

app = FastAPI(
    title="Hyper-Extract Web UI API",
    description="Backend API for Hyper-Extract knowledge extraction and visualization suite.",
    version="0.2.0",
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration & Paths
HISTORY_FILE = Path.home() / ".he" / "ui_history.json"


def load_history() -> List[str]:
    """Load list of registered KA paths from history file."""
    if not HISTORY_FILE.exists():
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001  # pylint: disable=broad-except
        logger.error("Failed to load history: %s", e)
        return []


def save_history(paths: List[str]) -> None:
    """Save list of registered KA paths to history file."""
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Deduplicate and keep absolute paths
        unique_paths = list(dict.fromkeys([str(Path(p).resolve()) for p in paths]))
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(unique_paths, f, indent=2, ensure_ascii=False)
    except Exception as e:  # noqa: BLE001  # pylint: disable=broad-except
        logger.error("Failed to save history: %s", e)


# In-memory Task State Registry
# task_id -> { "status": "running" | "success" | "failed", "progress": str, "logs": List[str], "started_at": str, "completed_at": str }
tasks_registry: Dict[str, Dict[str, Any]] = {}


class LLMConfigUpdate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class EmbedderConfigUpdate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class AgentConfigUpdate(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class ParseRequest(BaseModel):
    input_text: Optional[str] = None
    input_path: Optional[str] = None
    output_path: str
    template: str
    language: str
    no_index: bool = False
    force: bool = False


class FeedRequest(BaseModel):
    path: str
    input_text: Optional[str] = None
    input_path: Optional[str] = None


class BuildIndexRequest(BaseModel):
    path: str
    force: bool = False


class SearchRequest(BaseModel):
    path: str
    query: str
    top_k: int = 3


class TalkRequest(BaseModel):
    path: str
    query: str
    top_k: int = 3


class AgentRequest(BaseModel):
    query: str
    history: list[dict] = []


class RegisterRequest(BaseModel):
    path: str


# ==================== Config APIs ====================


@app.get("/api/config")
def get_config():
    """Retrieve current LLM and Embedder configurations."""
    try:
        config = ConfigManager()
        return config.show()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/config/llm")
def update_llm_config(data: LLMConfigUpdate):
    """Update LLM configuration."""
    try:
        config = ConfigManager()
        config.set_llm(
            provider=data.provider,
            model=data.model,
            api_key=data.api_key,
            base_url=data.base_url,
        )
        return {"status": "success", "config": config.show()["llm"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/config/embedder")
def update_embedder_config(data: EmbedderConfigUpdate):
    """Update Embedder configuration."""
    try:
        config = ConfigManager()
        config.set_embedder(
            provider=data.provider,
            model=data.model,
            api_key=data.api_key,
            base_url=data.base_url,
        )
        return {"status": "success", "config": config.show()["embedder"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/config/agent")
def update_agent_config(data: AgentConfigUpdate):
    """Update Agent configuration."""
    try:
        config = ConfigManager()
        config.set_agent(
            provider=data.provider,
            model=data.model,
            api_key=data.api_key,
            base_url=data.base_url,
        )
        return {"status": "success", "config": config.show()["agent"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


# ==================== Templates APIs ====================


@app.get("/api/templates")
def get_templates(language: Optional[str] = None):
    """List all available templates."""
    try:
        # Get both preset templates and method templates
        raw_templates = Template.list(filter_by_language=language, include_methods=True)
        templates_list = []

        for key, cfg in raw_templates.items():
            # Check type of description
            desc = getattr(cfg, "description", "")
            if isinstance(desc, dict):
                desc_zh = desc.get("zh", "")
                desc_en = desc.get("en", "")
            else:
                desc_zh = desc or ""
                desc_en = desc or ""

            # Check languages safely
            langs = getattr(cfg, "language", None)
            if not langs:
                langs = ["en"]
            elif isinstance(langs, str):
                langs = [langs]

            # Check tags safely
            tags = getattr(cfg, "tags", None) or []

            templates_list.append(
                {
                    "id": key,
                    "name": getattr(cfg, "name", ""),
                    "type": getattr(cfg, "type", ""),
                    "language": langs,
                    "description_zh": desc_zh,
                    "description_en": desc_en,
                    "tags": tags,
                }
            )
        return templates_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


# ==================== Knowledge Abstract APIs ====================


@app.get("/api/ka/list")
def list_knowledge_abstracts():
    """List registered KAs and scan CWD for valid KAs."""
    history_paths = load_history()

    # Also automatically scan the current directory and its immediate children (depth 1)
    cwd = Path.cwd()
    scanned_paths = [cwd] + [p for p in cwd.iterdir() if p.is_dir()]

    all_candidate_paths = list(
        dict.fromkeys(history_paths + [str(p.resolve()) for p in scanned_paths])
    )

    ka_list = []
    valid_history_paths = []

    for path_str in all_candidate_paths:
        path = Path(path_str)
        metadata_file = path / "metadata.json"
        data_file = path / "data.json"

        if metadata_file.exists() and data_file.exists():
            # This is a valid KA
            if path_str in history_paths:
                valid_history_paths.append(path_str)

            try:
                metadata = load_ka_metadata(path)
                with open(data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                # Calculate node and edge count depending on structure
                node_count = 0
                edge_count = 0

                if isinstance(data, dict):
                    # Graph type
                    if "nodes" in data or "edges" in data:
                        node_count = len(data.get("nodes", []))
                        edge_count = len(data.get("edges", []))
                    # List/Set type
                    elif "items" in data:
                        node_count = len(data.get("items", []))
                elif isinstance(data, list):
                    node_count = len(data)

                index_path = path / "index"
                has_index = index_path.exists() and any(index_path.iterdir())

                # Format created/updated dates
                created_at = metadata.get("created_at") if metadata else None
                updated_at = metadata.get("updated_at") if metadata else None

                ka_list.append(
                    {
                        "path": path_str,
                        "name": path.name,
                        "template": (
                            metadata.get("template", "unknown")
                            if metadata
                            else "unknown"
                        ),
                        "lang": metadata.get("lang", "en") if metadata else "en",
                        "node_count": node_count,
                        "edge_count": edge_count,
                        "has_index": has_index,
                        "created_at": created_at,
                        "updated_at": updated_at,
                    }
                )
            except Exception as e:  # noqa: BLE001  # pylint: disable=broad-except
                logger.warning("Error loading KA details at %s: %s", path_str, e)

    # Keep history file sync'd with valid paths
    save_history(valid_history_paths)
    return ka_list


@app.post("/api/ka/register")
def register_ka(req: RegisterRequest):
    """Register an existing Knowledge Abstract path."""
    path = Path(req.path)
    if not path.exists():
        raise HTTPException(status_code=400, detail="Path does not exist")
    if not path.is_dir():
        raise HTTPException(status_code=400, detail="Path is not a directory")

    metadata_file = path / "metadata.json"
    data_file = path / "data.json"
    if not metadata_file.exists() or not data_file.exists():
        raise HTTPException(
            status_code=400,
            detail="Directory is not a valid Knowledge Abstract (missing metadata.json or data.json)",
        )

    history = load_history()
    path_str = str(path.resolve())
    if path_str not in history:
        history.append(path_str)
        save_history(history)

    return {"status": "success", "path": path_str}


@app.delete("/api/ka/remove")
def remove_ka(path: str = Query(..., description="Absolute path of KA")):
    """Remove KA path from registered history (does not delete files)."""
    history = load_history()
    path_resolved = str(Path(path).resolve())
    if path_resolved in history:
        history.remove(path_resolved)
        save_history(history)
        return {"status": "success"}
    return {"status": "not_found"}


@app.get("/api/ka/data")
def get_ka_data(path: str = Query(..., description="Absolute path of KA")):
    """Retrieve raw JSON data and metadata for visualization/exploration."""
    dir_path = Path(path)
    data_file = dir_path / "data.json"
    metadata_file = dir_path / "metadata.json"

    if not data_file.exists():
        raise HTTPException(status_code=404, detail="data.json not found in directory")

    try:
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        metadata = None
        if metadata_file.exists():
            with open(metadata_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)

        index_path = dir_path / "index"
        has_index = index_path.exists() and any(index_path.iterdir())

        return {
            "path": path,
            "name": dir_path.name,
            "data": data,
            "metadata": metadata,
            "has_index": has_index,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


# ==================== Async Task Execution Runner ====================


def extract_text_from_input(
    input_text: Optional[str], input_path: Optional[str]
) -> str:
    """Resolve text from either direct string input or a file/directory path."""
    if input_text:
        return input_text
    if not input_path:
        raise ValueError("Either input_text or input_path must be provided.")

    path = Path(input_path)
    if not path.exists():
        raise ValueError(f"Path does not exist: {input_path}")

    if path.is_dir():
        text_files = (
            list(path.glob("*.txt"))
            + list(path.glob("*.md"))
            + list(path.glob("*.pdf"))
        )
        if not text_files:
            raise ValueError(
                f"No .txt, .md, or .pdf files found in directory: {input_path}"
            )
        all_text = []
        for file_path in text_files:
            all_text.append(read_input(str(file_path)))
        return "\n\n".join(all_text)
    else:
        return read_input(str(path))


def run_async_extraction(
    task_id: str,
    input_text: Optional[str],
    input_path: Optional[str],
    output_path: str,
    template: str,
    lang: str,
    no_index: bool,
) -> None:
    """Task runner running in background thread to parse document."""
    task = tasks_registry[task_id]
    logger.info(
        "Starting task=%s output=%s template=%s lang=%s",
        task_id,
        output_path,
        template,
        lang,
    )

    try:
        # Step 1: Validate LLM configuration
        task["progress"] = "Validating configuration..."
        task["logs"].append("[1/4] Validating LLM and Embedder configuration...")
        config = ConfigManager()
        valid, msg = config.validate()
        if not valid:
            raise ValueError(msg)

        # Step 2: Initialize Template
        task["progress"] = "Initializing Template..."
        task["logs"].append(f"[2/4] Resolving template '{template}' (lang={lang})...")
        ka = Template.create(template, lang)
        task["logs"].append(f"Template '{template}' instance created successfully.")

        # Step 2.5: Resolve input text
        task["progress"] = "Reading input data..."
        task["logs"].append("Resolving input text from path or provided string...")
        resolved_text = extract_text_from_input(input_text, input_path)

        # Step 3: Parse Document
        task["progress"] = "Extracting knowledge from text..."
        task["logs"].append(
            f"[3/4] Running extraction engine on input ({len(resolved_text)} characters)..."
        )
        task["logs"].append("Invoking LLM batch parser...")

        # Run extraction
        def handle_progress(completed, total):
            task["progress"] = f"Extracting chunk {completed} of {total}..."
            task["logs"].append(f"Processed chunk {completed}/{total}")
            try:
                task["partial_data"] = ka.data.model_dump()
            except Exception:
                pass

        ka.feed_text(resolved_text, on_progress=handle_progress)
        task["logs"].append("Knowledge extracted successfully.")

        # Save to output folder
        task["progress"] = "Saving extracted data..."
        out_dir = Path(output_path)
        out_dir.mkdir(parents=True, exist_ok=True)
        ka.dump(out_dir)
        task["logs"].append(f"Structured data saved to: {out_dir}/data.json")

        # Step 4: Build Search Index
        if not no_index:
            task["progress"] = "Building vector search index..."
            task["logs"].append(
                "[4/4] Generating vector embeddings for search index..."
            )
            ka.build_index()
            ka.dump(out_dir)
            task["logs"].append("Vector search index saved successfully.")
        else:
            task["logs"].append("[4/4] Search index building skipped.")

        # Complete Task
        task["status"] = "success"
        task["progress"] = "Completed successfully"
        task["completed_at"] = datetime.now().isoformat()
        task["logs"].append("Extraction task finished successfully!")

        # Auto-register in history
        history = load_history()
        path_str = str(out_dir.resolve())
        if path_str not in history:
            history.append(path_str)
            save_history(history)

    except Exception as e:  # noqa: BLE001  # pylint: disable=broad-except
        logger.error("Task %s failed: %s", task_id, e, exc_info=True)
        task["status"] = "failed"
        task["progress"] = f"Failed: {str(e)}"
        task["completed_at"] = datetime.now().isoformat()
        task["logs"].append(f"ERROR: {str(e)}")


def run_async_feed(
    task_id: str, path_str: str, input_text: Optional[str], input_path: Optional[str]
) -> None:
    """Task runner to append text to existing KA."""
    task = tasks_registry[task_id]
    try:
        task["progress"] = "Loading Knowledge Abstract..."
        task["logs"].append("[1/3] Loading existing Knowledge Abstract...")

        path = Path(path_str)
        template, lang = get_template_from_ka(path)

        ka = Template.create(template, lang)
        ka.load(path)
        task["logs"].append("Existing knowledge loaded.")

        task["progress"] = "Reading input data..."
        resolved_text = extract_text_from_input(input_text, input_path)

        task["progress"] = "Extracting and merging new knowledge..."
        task["logs"].append(
            f"[2/3] Extracting and merging new document ({len(resolved_text)} chars)..."
        )

        def handle_feed_progress(completed, total):
            task["progress"] = f"Extracting chunk {completed} of {total}..."
            task["logs"].append(f"Processed chunk {completed}/{total}")
            try:
                task["partial_data"] = ka.data.model_dump()
            except Exception:
                pass

        ka.feed_text(resolved_text, on_progress=handle_feed_progress)
        ka.dump(path)
        task["logs"].append("New knowledge merged and saved.")

        task["progress"] = "Rebuilding search index..."
        task["logs"].append("[3/3] Rebuilding vector index for search...")
        ka.clear_index()
        ka.build_index()
        ka.dump(path)
        task["logs"].append("Search index rebuilt and saved.")

        task["status"] = "success"
        task["progress"] = "Completed successfully"
        task["completed_at"] = datetime.now().isoformat()
        task["logs"].append("Append task finished successfully!")

    except Exception as e:  # noqa: BLE001  # pylint: disable=broad-except
        logger.error("Feed task %s failed: %s", task_id, e, exc_info=True)
        task["status"] = "failed"
        task["progress"] = f"Failed: {str(e)}"
        task["completed_at"] = datetime.now().isoformat()
        task["logs"].append(f"ERROR: {str(e)}")


def run_async_build_index(task_id: str, path_str: str, force: bool) -> None:
    """Task runner to build search index."""
    task = tasks_registry[task_id]
    try:
        task["progress"] = "Loading Knowledge Abstract..."
        task["logs"].append("[1/2] Loading existing Knowledge Abstract...")

        path = Path(path_str)
        template, lang = get_template_from_ka(path)

        ka = Template.create(template, lang)
        ka.load(path)
        task["logs"].append("Knowledge loaded.")

        task["progress"] = "Building vector search index..."
        task["logs"].append("[2/2] Generating embeddings and building FAISS index...")

        if force:
            ka.clear_index()

        ka.build_index()
        ka.dump(path)
        task["logs"].append("Index built and saved successfully.")

        task["status"] = "success"
        task["progress"] = "Completed successfully"
        task["completed_at"] = datetime.now().isoformat()
        task["logs"].append("Index build task completed!")

    except Exception as e:  # noqa: BLE001  # pylint: disable=broad-except
        logger.error("Build index task %s failed: %s", task_id, e, exc_info=True)
        task["status"] = "failed"
        task["progress"] = f"Failed: {str(e)}"
        task["completed_at"] = datetime.now().isoformat()
        task["logs"].append(f"ERROR: {str(e)}")


@app.post("/api/ka/parse")
def start_parse_task(req: ParseRequest):
    """Start extraction process in background."""
    if not req.input_text and not req.input_path:
        raise HTTPException(
            status_code=400,
            detail="Either input_text or input_path must be provided.",
        )

    # Safety checks
    out_dir = Path(req.output_path)
    if out_dir.exists() and any(out_dir.iterdir()) and not req.force:
        raise HTTPException(
            status_code=400,
            detail="Output directory already exists and is not empty. Use force to overwrite.",
        )

    task_id = str(uuid.uuid4())
    tasks_registry[task_id] = {
        "id": task_id,
        "type": "parse",
        "status": "running",
        "progress": "Starting...",
        "logs": ["Task initialized."],
        "started_at": datetime.now().isoformat(),
        "completed_at": None,
        "output_path": req.output_path,
        "template": req.template,
    }

    # Start thread
    thread = threading.Thread(
        target=run_async_extraction,
        args=(
            task_id,
            req.input_text,
            req.input_path,
            req.output_path,
            req.template,
            req.language,
            req.no_index,
        ),
    )
    thread.daemon = True
    thread.start()

    return {"task_id": task_id}


@app.post("/api/ka/feed")
def start_feed_task(req: FeedRequest):
    """Start feeding new documents to existing KA in background."""
    if not req.input_text and not req.input_path:
        raise HTTPException(
            status_code=400,
            detail="Either input_text or input_path must be provided.",
        )

    path = Path(req.path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Path does not exist")

    task_id = str(uuid.uuid4())
    tasks_registry[task_id] = {
        "id": task_id,
        "type": "feed",
        "status": "running",
        "progress": "Starting append...",
        "logs": ["Task initialized."],
        "started_at": datetime.now().isoformat(),
        "completed_at": None,
        "output_path": req.path,
    }

    thread = threading.Thread(
        target=run_async_feed, args=(task_id, req.path, req.input_text, req.input_path)
    )
    thread.daemon = True
    thread.start()

    return {"task_id": task_id}


@app.post("/api/ka/build-index")
def start_build_index_task(req: BuildIndexRequest):
    """Rebuild search index in background."""
    path = Path(req.path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Path does not exist")

    task_id = str(uuid.uuid4())
    tasks_registry[task_id] = {
        "id": task_id,
        "type": "build-index",
        "status": "running",
        "progress": "Starting index build...",
        "logs": ["Task initialized."],
        "started_at": datetime.now().isoformat(),
        "completed_at": None,
        "output_path": req.path,
    }

    thread = threading.Thread(
        target=run_async_build_index, args=(task_id, req.path, req.force)
    )
    thread.daemon = True
    thread.start()

    return {"task_id": task_id}


@app.get("/api/tasks/{task_id}")
def get_task_status(task_id: str):
    """Check background task status."""
    if task_id not in tasks_registry:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks_registry[task_id]


# ==================== Search and Chat APIs ====================


@app.post("/api/ka/search")
def search_ka(req: SearchRequest):
    """Run semantic search on KA."""
    try:
        path = validate_ka_path(req.path)
        template, lang = get_template_from_ka(path)

        ka = Template.create(template, lang)
        ka.load(path)

        # Build index if not built
        index_dir = path / "index"
        if not index_dir.exists() or not any(index_dir.iterdir()):
            raise HTTPException(
                status_code=400,
                detail="Vector index is not built. Please build index first.",
            )

        # Run Search
        # Different structures have different search returns
        results = ka.search(req.query, top_k=req.top_k)

        # Serialize results to dictionary format
        serialized_results = []
        if isinstance(results, tuple) and len(results) == 2:
            # Graph type returns (nodes, edges)
            nodes, edges = results
            serialized_results = {
                "nodes": [
                    n.model_dump() if hasattr(n, "model_dump") else n for n in nodes
                ],
                "edges": [
                    e.model_dump() if hasattr(e, "model_dump") else e for e in edges
                ],
            }
        else:
            # Collection or scalar types return a list
            for r in results:
                if hasattr(r, "model_dump"):
                    serialized_results.append(r.model_dump())
                elif hasattr(r, "dict"):
                    serialized_results.append(r.dict())
                else:
                    serialized_results.append(r)

        return {"results": serialized_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/ka/talk")
def talk_ka(req: TalkRequest):
    """Run RAG chat against KA."""
    try:
        path = validate_ka_path(req.path)
        template, lang = get_template_from_ka(path)

        ka = Template.create(template, lang)
        ka.load(path)

        # Build index if not built
        index_dir = path / "index"
        if not index_dir.exists() or not any(index_dir.iterdir()):
            raise HTTPException(
                status_code=400,
                detail="Vector index is not built. Please build index first.",
            )

        # Run Chat
        response = ka.chat(req.query, top_k=req.top_k)

        # Retrieve nodes/edges context injected in additional_kwargs
        retrieved_nodes = response.additional_kwargs.get("retrieved_nodes", [])
        retrieved_edges = response.additional_kwargs.get("retrieved_edges", [])
        retrieved_items = response.additional_kwargs.get("retrieved_items", [])

        # Serialize
        serialized_nodes = [
            n.model_dump() if hasattr(n, "model_dump") else n for n in retrieved_nodes
        ]
        serialized_edges = [
            e.model_dump() if hasattr(e, "model_dump") else e for e in retrieved_edges
        ]
        serialized_items = [
            i.model_dump() if hasattr(i, "model_dump") else i for i in retrieved_items
        ]

        return {
            "answer": response.content,
            "retrieved_nodes": serialized_nodes,
            "retrieved_edges": serialized_edges,
            "retrieved_items": serialized_items,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/agent/talk")
def talk_agent(req: AgentRequest):
    """Run Agent chat."""
    try:
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

        from hyperextract.utils.client import get_agent_client

        agent_client = get_agent_client()
        if not agent_client:
            raise HTTPException(status_code=400, detail="Agent is not configured.")

        messages = [
            SystemMessage(
                content="You are the Hyper-Extract Autonomous Agent. You help the user orchestrate knowledge extraction tasks and interact with the data."
            )
        ]
        for msg in req.history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

        messages.append(HumanMessage(content=req.query))

        response = agent_client.invoke(messages)

        return {"answer": response.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


# ==================== Static Files Mount ====================

# Mount compiled static assets.
# If they do not exist (development mode), we log a warning but don't crash uvicorn.
dist_path = Path(__file__).parent / "dist"
if dist_path.exists() and dist_path.is_dir():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="static")
else:
    logger.warning(
        "Static files directory %s not found. Running API-only mode. "
        "Compile the frontend assets using npm build to enable Web UI.",
        dist_path,
    )
