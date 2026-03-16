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

_current_session = None

def set_session(session):
    global _current_session
    _current_session = session


def create_issue(
    title: str,
    description: str,
    severity: str = "medium",
    portal_page: str = "",
    steps_to_reproduce: str = "",
) -> str:
    """Log a detected issue from the conversation."""
    # Guard: prevent duplicate issues with the same title
    for existing in _SESSION_ISSUES:
        if existing["title"].lower().strip() == title.lower().strip():
            logger.warning(f"Duplicate issue blocked — '{title}' already logged as issue #{existing['id']}")
            return json.dumps({
                "success": False,
                "issue": existing,
                "message": f"Issue #{existing['id']} already logged with title '{title}'. No duplicate created."
            })

    issue = {
        "id": len(_SESSION_ISSUES) + 1,
        "title": title,
        "description": description,
        "severity": severity,
        "portal_page": portal_page,
        "steps_to_reproduce": steps_to_reproduce,
        "timestamp": datetime.now().isoformat(),
        "status": "detected",
    }

    _SESSION_ISSUES.append(issue)
    logger.info(f"Issue detected: [{severity}] {title}")

    if _current_session:
        _current_session.issues.append(issue)
        _current_session.update_checkpoint("initiation", "Capture error details", "complete", f"{title}")
        # Infer category from keywords in title/description
        text = f"{title} {description}".lower()
        if not _current_session.module:
            if any(w in text for w in ["login", "password", "otp", "locked", "auth", "sign in"]):
                _current_session.module = "Authentication"
            elif any(w in text for w in ["payment", "transaction", "deducted", "refund", "receipt"]):
                _current_session.module = "Payments"
            elif any(w in text for w in ["upload", "document", "file", "photo", "certificate"]):
                _current_session.module = "Documents"
            elif any(w in text for w in ["form", "validation", "submit", "field", "mandatory"]):
                _current_session.module = "Forms"
            elif any(w in text for w in ["visa", "passport", "embassy", "consulate", "appointment"]):
                _current_session.module = "Visa/Travel"
            elif any(w in text for w in ["tax", "itr", "filing", "pan", "aadhaar"]):
                _current_session.module = "Tax/Identity"
            elif any(w in text for w in ["error 500", "blank", "loading", "timeout", "browser", "cache"]):
                _current_session.module = "Technical"
            if _current_session.module:
                _current_session.update_checkpoint("initiation", "Identify issue category", "complete", _current_session.module)
        # Set priority from severity
        if severity and not _current_session.priority:
            _current_session.priority = severity
            _current_session.update_checkpoint("initiation", "Assess business impact", "complete", f"Priority: {severity}")

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
        "description": "Log a detected IT helpdesk issue or problem from the conversation. Call this whenever you identify an error, portal problem, or workflow issue the user is experiencing. The issue will be displayed in the user's issue panel.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "title": {
                    "type": "STRING",
                    "description": "Short title of the issue (e.g. 'Login failed — account locked on visa portal')"
                },
                "description": {
                    "type": "STRING",
                    "description": "Detailed description of the issue"
                },
                "severity": {
                    "type": "STRING",
                    "description": "Issue severity: critical, high, medium, or low"
                },
                "portal_page": {
                    "type": "STRING",
                    "description": "Portal page or section if applicable"
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
