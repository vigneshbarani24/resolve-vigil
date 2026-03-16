"""
Diagnostic Expert Agent (pluggable).

When ENABLE_ADK=true, this agent handles complex IT support queries
that need multi-step reasoning (e.g., diagnosing cross-portal issues,
analyzing authentication chains, troubleshooting payment flows).

For simple lookups, the direct tool functions are faster.
This agent adds value for:
  - Multi-step diagnostic flows
  - Cross-referencing KB + error codes + portal context
  - Generating resolution plans with dependencies
"""
import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ADK is optional — gracefully degrade if not installed
_ADK_AVAILABLE = False
try:
    if os.getenv("ENABLE_ADK", "").lower() == "true":
        from google.adk import Agent
        from google.adk.tools import FunctionTool
        _ADK_AVAILABLE = True
        logger.info("ADK available — Diagnostic Expert Agent enabled")
except ImportError:
    logger.info("google-adk not installed — Diagnostic Expert Agent disabled (direct tools only)")


async def diagnose_issue(
    error_description: str,
    portal_page: str = "",
    category: str = "",
    screenshot_context: str = "",
) -> str:
    """
    Complex IT helpdesk issue diagnosis using ADK agent (if available)
    or fallback to simple heuristic analysis.
    """
    if _ADK_AVAILABLE:
        return await _adk_diagnose(error_description, portal_page, category, screenshot_context)
    else:
        return _simple_diagnose(error_description, portal_page, category)


def _simple_diagnose(
    error_description: str,
    portal_page: str = "",
    category: str = "",
) -> str:
    """Fallback diagnosis without ADK."""
    from server.tools.kb_search import search_knowledge_base
    from server.tools.portal_lookup import lookup_error_code, lookup_portal_page

    results = {}

    # Search KB
    kb_result = search_knowledge_base(f"{error_description} {portal_page} {category}")
    results["knowledge_base"] = json.loads(kb_result)

    # Look up portal page if provided
    if portal_page:
        page_result = lookup_portal_page(portal_page)
        results["page_info"] = json.loads(page_result)

    # Extract potential error codes from description
    import re
    error_codes = re.findall(r'[A-Z]{2,5}\d{3}', error_description.upper())
    if error_codes:
        results["error_lookups"] = []
        for code in error_codes[:3]:
            lookup = lookup_error_code(code)
            results["error_lookups"].append(json.loads(lookup))

    return json.dumps({
        "diagnosis_mode": "direct",
        "analysis": results,
        "recommendation": "Review the knowledge base results and error lookups above for resolution steps."
    })


async def _adk_diagnose(
    error_description: str,
    portal_page: str = "",
    category: str = "",
    screenshot_context: str = "",
) -> str:
    """Full ADK-powered diagnosis (requires google-adk)."""
    # This would create an ADK agent with sub-tools
    # and run a multi-step diagnostic flow
    # Placeholder for when ADK is enabled
    return _simple_diagnose(error_description, portal_page, category)


# Declaration for Gemini function calling
DIAGNOSIS_DECLARATIONS = [
    {
        "name": "diagnose_issue",
        "description": "Perform a comprehensive diagnosis of a complex IT helpdesk issue. Use this for problems that need cross-referencing multiple data sources (error codes, KB articles, portal context). For simple error lookups, use lookup_error_code instead.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "error_description": {
                    "type": "STRING",
                    "description": "Detailed description of the IT helpdesk issue or error"
                },
                "portal_page": {
                    "type": "STRING",
                    "description": "Portal page or section where the issue occurred"
                },
                "category": {
                    "type": "STRING",
                    "description": "Issue category (Authentication, Payments, Forms, Documents, Technical, Visa, Tax)"
                },
                "screenshot_context": {
                    "type": "STRING",
                    "description": "Description of what was visible on the screen when the error occurred"
                }
            },
            "required": ["error_description"]
        }
    }
]
