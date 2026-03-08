"""
SAP Expert ADK Agent (pluggable).

When ENABLE_ADK=true, this agent handles complex SAP queries
that need multi-step reasoning (e.g., diagnosing intermittent
errors, planning configuration changes, analyzing cross-module
impacts).

For simple lookups, the direct tool functions are faster.
This agent adds value for:
  - Multi-step diagnostic flows
  - Cross-referencing KB + error codes + transaction context
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
        logger.info("ADK available — SAP Expert Agent enabled")
except ImportError:
    logger.info("google-adk not installed — SAP Expert Agent disabled (direct tools only)")


async def diagnose_sap_issue(
    error_description: str,
    transaction_code: str = "",
    module: str = "",
    screenshot_context: str = "",
) -> str:
    """
    Complex SAP issue diagnosis using ADK agent (if available)
    or fallback to simple heuristic analysis.
    """
    if _ADK_AVAILABLE:
        return await _adk_diagnose(error_description, transaction_code, module, screenshot_context)
    else:
        return _simple_diagnose(error_description, transaction_code, module)


def _simple_diagnose(
    error_description: str,
    transaction_code: str = "",
    module: str = "",
) -> str:
    """Fallback diagnosis without ADK."""
    from server.tools.kb_search import search_knowledge_base
    from server.tools.sap_lookup import lookup_sap_error, lookup_transaction_code

    results = {}

    # Search KB
    kb_result = search_knowledge_base(f"{error_description} {transaction_code} {module}")
    results["knowledge_base"] = json.loads(kb_result)

    # Look up transaction code if provided
    if transaction_code:
        tcode_result = lookup_transaction_code(transaction_code)
        results["transaction_info"] = json.loads(tcode_result)

    # Extract potential error codes from description
    import re
    error_codes = re.findall(r'[A-Z]{1,3}\d{3,4}', error_description.upper())
    if error_codes:
        results["error_lookups"] = []
        for code in error_codes[:3]:
            lookup = lookup_sap_error(code)
            results["error_lookups"].append(json.loads(lookup))

    return json.dumps({
        "diagnosis_mode": "direct",
        "analysis": results,
        "recommendation": "Review the knowledge base results and error lookups above for resolution steps."
    })


async def _adk_diagnose(
    error_description: str,
    transaction_code: str = "",
    module: str = "",
    screenshot_context: str = "",
) -> str:
    """Full ADK-powered diagnosis (requires google-adk)."""
    # This would create an ADK agent with sub-tools
    # and run a multi-step diagnostic flow
    # Placeholder for when ADK is enabled
    return _simple_diagnose(error_description, transaction_code, module)


# Declaration for Gemini function calling
DIAGNOSIS_DECLARATIONS = [
    {
        "name": "diagnose_sap_issue",
        "description": "Perform a comprehensive diagnosis of a complex SAP issue. Use this for problems that need cross-referencing multiple data sources (error codes, KB articles, transaction context). For simple error lookups, use lookup_sap_error instead.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "error_description": {
                    "type": "STRING",
                    "description": "Detailed description of the SAP issue or error"
                },
                "transaction_code": {
                    "type": "STRING",
                    "description": "SAP transaction code where the issue occurred"
                },
                "module": {
                    "type": "STRING",
                    "description": "SAP module (SD, MM, FI, PP, CO, BASIS, etc.)"
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
