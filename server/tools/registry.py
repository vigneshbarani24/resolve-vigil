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
from server.tools.sap_lookup import lookup_sap_error, lookup_transaction_code, SAP_DECLARATIONS
from server.tools.issue_tracker import create_issue, ISSUE_DECLARATIONS
from server.agents.sap_expert import diagnose_sap_issue, DIAGNOSIS_DECLARATIONS

logger = logging.getLogger(__name__)

# Aggregate all tool declarations for the Gemini setup message
TOOL_DECLARATIONS: List[Dict] = [
    *KB_DECLARATIONS,
    *ITSM_DECLARATIONS,
    *SAP_DECLARATIONS,
    *ISSUE_DECLARATIONS,
    *DIAGNOSIS_DECLARATIONS,
]

# Map of function_name -> callable
_TOOL_HANDLERS = {
    "search_knowledge_base": search_knowledge_base,
    "create_itsm_ticket": create_itsm_ticket,
    "update_itsm_ticket": update_itsm_ticket,
    "lookup_sap_error": lookup_sap_error,
    "lookup_transaction_code": lookup_transaction_code,
    "create_issue": create_issue,
    "diagnose_sap_issue": diagnose_sap_issue,
}


def register_all_tools(gemini_client) -> None:
    """Register all backend tools into GeminiLive's tool_mapping."""
    for name, handler in _TOOL_HANDLERS.items():
        gemini_client.tool_mapping[name] = handler
        logger.info(f"Registered backend tool: {name}")
    logger.info(f"Total backend tools registered: {len(_TOOL_HANDLERS)}")
