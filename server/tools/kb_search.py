"""
Knowledge Base Search Tool.

Searches SAP knowledge base for error codes, documentation,
known issues, and resolution steps. In production, this would
connect to a vector DB (Vertex AI Search, AlloyDB, etc.).
Currently uses a local JSON knowledge base for demo.
"""
import json
import logging
from pathlib import Path
from typing import List, Dict

logger = logging.getLogger(__name__)

# Load knowledge base
_KB_PATH = Path(__file__).parent.parent / "data" / "sap_knowledge_base.json"
_KB_DATA: List[Dict] = []

def _load_kb():
    global _KB_DATA
    if _KB_PATH.exists():
        with open(_KB_PATH) as f:
            _KB_DATA = json.load(f)
        logger.info(f"Loaded {len(_KB_DATA)} KB articles")
    else:
        logger.warning(f"KB file not found at {_KB_PATH}, using empty KB")

_load_kb()

_current_session = None

def set_session(session):
    global _current_session
    _current_session = session


def search_knowledge_base(query: str, max_results: int = 3) -> str:
    """Search the SAP knowledge base for relevant articles."""
    if not _KB_DATA:
        return json.dumps({
            "results": [],
            "message": "Knowledge base is empty. No articles found."
        })

    query_lower = query.lower()
    scored = []

    for article in _KB_DATA:
        score = 0
        searchable = f"{article.get('title', '')} {article.get('description', '')} {article.get('error_code', '')} {article.get('module', '')} {' '.join(article.get('keywords', []))}".lower()

        # Simple keyword matching (replace with vector search in production)
        for word in query_lower.split():
            if len(word) > 2 and word in searchable:
                score += 1
            # Boost exact error code matches
            if word == article.get('error_code', '').lower():
                score += 5

        if score > 0:
            scored.append((score, article))

    scored.sort(key=lambda x: x[0], reverse=True)

    if _current_session and scored:
        _current_session.update_checkpoint("diagnosis", "Search knowledge base", "complete", f"Found {len(scored)} results for '{query}'")

    results = [item[1] for item in scored[:max_results]]

    return json.dumps({
        "results": results,
        "total_found": len(scored),
        "query": query
    })


KB_DECLARATIONS = [
    {
        "name": "search_knowledge_base",
        "description": "Search the SAP knowledge base for error codes, documentation, known issues, and resolution steps. Use this when the user encounters an error, asks about a process, or needs help with a specific SAP transaction.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query": {
                    "type": "STRING",
                    "description": "Search query — can be an error code (e.g. 'VG035'), transaction code (e.g. 'VA01'), error message text, or description of the issue"
                },
                "max_results": {
                    "type": "INTEGER",
                    "description": "Maximum number of results to return (default 3)"
                }
            },
            "required": ["query"]
        }
    }
]
