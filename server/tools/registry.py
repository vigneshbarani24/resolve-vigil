"""
Tool registry — single place to register all backend tools.

Each tool module exposes:
  - DECLARATIONS: list of dict (Gemini function declaration schema)
  - handler functions

To add a new tool:
  1. Create server/tools/my_tool.py with handler + DECLARATIONS
  2. Import and register here
"""
import logging
from typing import List, Dict

from server.tools.kb_search import search_knowledge_base, KB_DECLARATIONS
from server.tools.itsm import create_itsm_ticket, update_itsm_ticket, ITSM_DECLARATIONS
from server.tools.portal_lookup import lookup_error_code, lookup_portal_page, PORTAL_DECLARATIONS
from server.tools.issue_tracker import create_issue, ISSUE_DECLARATIONS
from server.agents.diagnostic_expert import diagnose_issue, DIAGNOSIS_DECLARATIONS
from server.tools.search_grounding import research_support_topic, SEARCH_GROUNDING_DECLARATIONS

logger = logging.getLogger(__name__)

# Aggregate all tool declarations for the Gemini setup message
TOOL_DECLARATIONS: List[Dict] = [
    *KB_DECLARATIONS,
    *ITSM_DECLARATIONS,
    *PORTAL_DECLARATIONS,
    *ISSUE_DECLARATIONS,
    *DIAGNOSIS_DECLARATIONS,
    *SEARCH_GROUNDING_DECLARATIONS,
]

# Map of function_name -> callable
_TOOL_HANDLERS = {
    "search_knowledge_base": search_knowledge_base,
    "create_itsm_ticket": create_itsm_ticket,
    "update_itsm_ticket": update_itsm_ticket,
    "lookup_error_code": lookup_error_code,
    "lookup_portal_page": lookup_portal_page,
    "create_issue": create_issue,
    "diagnose_issue": diagnose_issue,
    "research_support_topic": research_support_topic,
}


def register_all_tools(gemini_client) -> None:
    """Register all backend tools into GeminiLive's tool_mapping."""
    for name, handler in _TOOL_HANDLERS.items():
        gemini_client.tool_mapping[name] = handler
        logger.info(f"Registered backend tool: {name}")
    logger.info(f"Total backend tools registered: {len(_TOOL_HANDLERS)}")
