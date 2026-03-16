"""
ADK Multi-Agent Definition for Resolve + Vigil Platform.

Agent graph:
  root_agent (Theepa) — 8 IT FunctionTools + 2 sub-agents
    ├── researcher — google_search (IT research)
    └── vigil — 7 Shield FunctionTools + 1 sub-agent
        └── threat_intel — google_search (scam/fact verification)

Activated via: ENABLE_ADK=true in .env
Default mode: Raw google-genai SDK (server/gemini_live.py)
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

        # IT Helpdesk Tools
        from server.tools.kb_search import search_knowledge_base
        from server.tools.itsm import create_itsm_ticket, update_itsm_ticket
        from server.tools.portal_lookup import lookup_error_code, lookup_portal_page
        from server.tools.issue_tracker import create_issue
        from server.tools.ui_navigator import navigate_user_browser
        from server.agents.diagnostic_expert import diagnose_issue

        # Vigil Shield Tools
        from server.tools.vigil_tools import (
            scan_url_safety,
            check_domain_reputation,
            analyze_page_for_threats,
            verify_domain_legitimacy,
            detect_fake_content,
            report_threat,
            highlight_danger_zones,
        )

        from server.prompts import get_system_prompt, get_vigil_prompt

        # ─── Researcher Sub-Agent ───
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

        _ADK_AVAILABLE = True
        logger.info(
            "ADK multi-agent initialized: theepa (8 tools) "
            "+ researcher (google_search) "
            "+ vigil (7 shield tools) "
            "+ threat_intel (google_search)"
        )

except ImportError as e:
    logger.info(f"ADK not available ({e}), using raw google-genai SDK")
except Exception as e:
    logger.warning(f"ADK initialization failed: {e}", exc_info=True)


def is_adk_enabled() -> bool:
    """Check if ADK orchestration is active."""
    return _ADK_AVAILABLE and root_agent is not None
