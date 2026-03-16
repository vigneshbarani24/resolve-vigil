"""
ADK Agent Definition — Resolve + Vigil Platform.

This module is the entry point for:
  - `adk web resolve/`       (local dev with ADK's built-in UI)
  - `adk deploy cloud_run`   (production deployment)

Agent graph:
  root_agent (Theepa) — 8 IT FunctionTools + 2 sub-agents
    ├── researcher — google_search (IT research, isolated per ADK constraint)
    └── vigil — 7 Shield FunctionTools + 1 sub-agent
        └── threat_intel — google_search (scam/fact verification)

google_search CANNOT coexist with other tools in one agent,
so each google_search lives in a dedicated sub-agent.
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

# ─── IT Helpdesk Tools ───
from server.tools.kb_search import search_knowledge_base
from server.tools.itsm import create_itsm_ticket, update_itsm_ticket
from server.tools.portal_lookup import lookup_error_code, lookup_portal_page
from server.tools.issue_tracker import create_issue
from server.tools.ui_navigator import navigate_user_browser
from server.agents.diagnostic_expert import diagnose_issue

# ─── Vigil Shield Tools ───
from server.tools.vigil_tools import (
    scan_url_safety,
    check_domain_reputation,
    analyze_page_for_threats,
    verify_domain_legitimacy,
    detect_fake_content,
    report_threat,
    highlight_danger_zones,
)

# ─── Prompts ───
from server.prompts import get_system_prompt, get_vigil_prompt

MODEL = os.getenv("MODEL", "gemini-2.5-flash")
RESEARCH_MODEL = os.getenv("RESEARCH_MODEL", "gemini-2.5-flash")

# ─── Researcher Sub-Agent ───
# google_search MUST be in its own agent (ADK constraint)
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

# ─── Threat Intel Sub-Agent ───
# Separate google_search agent for scam/domain/fact verification
threat_intel = Agent(
    name="threat_intel",
    model=RESEARCH_MODEL,
    instruction=(
        "You research domains, URLs, and claims for scam/phishing reports "
        "and fact verification. Use Google Search to find scam reports, "
        "domain reputation, fact-checks from Reuters/BBC/AP, and verified sources. "
        "Return citations with source URLs. Be thorough — check multiple sources."
    ),
    tools=[google_search],
)

# ─── Vigil Sub-Agent (Scam Shield) ───
# Delegated to by Theepa for all security/scam/phishing/fact-check tasks
vigil = Agent(
    name="vigil",
    model=MODEL,
    description=(
        "Vigil is the cybersecurity shield agent. Transfer to Vigil when the user "
        "asks about page safety, scams, phishing, fake content, or domain legitimacy. "
        "Also transfer when you see suspicious pages on the user's screen, or when "
        "the user is about to enter credentials or payment on an unfamiliar site."
    ),
    instruction=get_vigil_prompt(),
    tools=[
        FunctionTool(scan_url_safety),
        FunctionTool(check_domain_reputation),
        FunctionTool(analyze_page_for_threats),
        FunctionTool(verify_domain_legitimacy),
        FunctionTool(detect_fake_content),
        FunctionTool(report_threat),
        FunctionTool(highlight_danger_zones),
    ],
    sub_agents=[threat_intel],
)

# ─── Root Agent: Theepa (the voice) ───
# Theepa speaks for everything. Delegates to vigil for security, researcher for IT research.
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
    sub_agents=[researcher, vigil],
)
