"""
ADK Multi-Agent Definition for Resolve IT Helpdesk.

This file defines the Google ADK agent graph:
  - root_agent (Theepa): Main IT support agent with 9 FunctionTools
  - researcher: Sub-agent with google_search (isolated per ADK constraint)

Activated via: ENABLE_ADK=true in .env
Default mode: Raw google-genai SDK (server/gemini_live.py)

Architecture is modular — swap tool imports + system prompt to rebrand
for any vertical.
"""
import os
import logging

logger = logging.getLogger(__name__)

# ADK text chat uses Flash (not Live audio model)
MODEL = os.getenv("ADK_MODEL", "gemini-2.5-flash")
RESEARCH_MODEL = os.getenv("RESEARCH_MODEL", "gemini-2.5-flash")

# Only import ADK if explicitly enabled
_ADK_AVAILABLE = False
root_agent = None

try:
    if os.getenv("ENABLE_ADK", "").lower() == "true":
        from google.adk import Agent
        from google.adk.tools import FunctionTool, google_search

        from server.tools.kb_search import search_knowledge_base
        from server.tools.itsm import create_itsm_ticket, update_itsm_ticket
        from server.tools.portal_lookup import lookup_error_code, lookup_portal_page
        from server.tools.issue_tracker import create_issue
        from server.tools.ui_navigator import navigate_user_browser
        from server.agents.diagnostic_expert import diagnose_issue
        from server.prompts import get_system_prompt

        # ─── Researcher Sub-Agent ───
        # google_search MUST be in its own agent (ADK constraint:
        # cannot coexist with other tools in the same agent)
        researcher = Agent(
            name="researcher",
            model=RESEARCH_MODEL,
            instruction=(
                "You are a research assistant for IT helpdesk support. "
                "Use Google Search to find the latest information about portal outages, "
                "known issues, government service updates, visa processing times, "
                "tax filing deadlines, and technical solutions. "
                "Be specific, cite sources, and focus on actionable information."
            ),
            tools=[google_search],
        )

        # ─── Main Theepa Agent ───
        # All custom FunctionTools live here. ADK auto-generates declarations
        # from type hints + docstrings — no manual DECLARATIONS dicts needed.
        root_agent = Agent(
            name="theepa",
            model=MODEL,
            instruction=get_system_prompt(),
            tools=[
                FunctionTool(search_knowledge_base),
                FunctionTool(create_itsm_ticket),
                FunctionTool(update_itsm_ticket),
                FunctionTool(lookup_error_code),
                FunctionTool(lookup_portal_page),
                FunctionTool(create_issue),
                FunctionTool(diagnose_issue),
                FunctionTool(navigate_user_browser),
            ],
            sub_agents=[researcher],
        )

        _ADK_AVAILABLE = True
        logger.info("ADK multi-agent initialized: theepa (9 tools) + researcher (google_search)")

except ImportError as e:
    logger.info(f"ADK not available ({e}), using raw google-genai SDK")
except Exception as e:
    logger.warning(f"ADK initialization failed: {e}", exc_info=True)


def is_adk_enabled() -> bool:
    """Check if ADK orchestration is active."""
    return _ADK_AVAILABLE and root_agent is not None
