"""
Issue Tracker Tool.

Auto-detects and logs issues from conversations. Results are
sent to the frontend's issue-panel component AND can optionally
create ITSM tickets for persistent tracking.
"""
import json
import logging
from datetime import datetime
from typing import List, Dict

logger = logging.getLogger(__name__)

# In-memory issue store per session
_SESSION_ISSUES: List[Dict] = []


def create_issue(
    title: str,
    description: str,
    severity: str = "medium",
    transaction_code: str = "",
    steps_to_reproduce: str = "",
) -> str:
    """Log a detected issue from the conversation."""
    issue = {
        "id": len(_SESSION_ISSUES) + 1,
        "title": title,
        "description": description,
        "severity": severity,
        "transaction_code": transaction_code,
        "steps_to_reproduce": steps_to_reproduce,
        "timestamp": datetime.now().isoformat(),
        "status": "detected",
    }

    _SESSION_ISSUES.append(issue)
    logger.info(f"Issue detected: [{severity}] {title}")

    return json.dumps({
        "success": True,
        "issue": issue,
        "message": f"Issue #{issue['id']} logged: {title}"
    })


def get_session_issues() -> List[Dict]:
    """Get all issues for the current session."""
    return _SESSION_ISSUES


def clear_session_issues() -> None:
    """Clear issues (call on session end)."""
    _SESSION_ISSUES.clear()


ISSUE_DECLARATIONS = [
    {
        "name": "create_issue",
        "description": "Log a detected SAP issue or problem from the conversation. Call this whenever you identify an error, configuration problem, or workflow issue the user is experiencing. The issue will be displayed in the user's issue panel.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "title": {
                    "type": "STRING",
                    "description": "Short title of the issue (e.g. 'Authorization error in VA01')"
                },
                "description": {
                    "type": "STRING",
                    "description": "Detailed description of the issue"
                },
                "severity": {
                    "type": "STRING",
                    "description": "Issue severity: critical, high, medium, or low"
                },
                "transaction_code": {
                    "type": "STRING",
                    "description": "SAP transaction code if applicable"
                },
                "steps_to_reproduce": {
                    "type": "STRING",
                    "description": "Steps that led to the issue"
                }
            },
            "required": ["title", "description", "severity"]
        }
    }
]
