"""
ADK Agent Definition — Resolve IT Helpdesk.

This module is the entry point for:
  - `adk web resolve/`       (local dev with ADK's built-in UI)
  - `adk deploy cloud_run`   (production deployment)

Agent graph:
  root_agent (Theepa) — 8 FunctionTools + 1 sub-agent
    └── researcher — google_search (isolated per ADK constraint)

google_search CANNOT coexist with other tools in one agent,
so it lives in a dedicated sub-agent that Theepa can transfer to.
"""
import os
import sys

# Ensure project root is on path so server.* imports work
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(_project_root, ".env"), override=True)

from google.adk import Agent
from google.adk.tools import FunctionTool, google_search

from server.tools.kb_search import search_knowledge_base
from server.tools.itsm import create_itsm_ticket, update_itsm_ticket
from server.tools.portal_lookup import lookup_error_code, lookup_portal_page
from server.tools.issue_tracker import create_issue
from server.tools.ui_navigator import navigate_user_browser
from server.agents.diagnostic_expert import diagnose_issue
from server.prompts import get_system_prompt

MODEL = os.getenv("MODEL", "gemini-2.5-flash")
RESEARCH_MODEL = os.getenv("RESEARCH_MODEL", "gemini-2.5-flash")

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

# ─── Main Theepa Agent (root_agent) ───
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
