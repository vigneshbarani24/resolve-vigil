"""
Portal Lookup Tool.

Provides lookups for IT helpdesk error codes, portal pages,
and configuration details. In production, connect to a
reference database or API.
"""
import json
import logging
from pathlib import Path
from typing import Dict

logger = logging.getLogger(__name__)

# Load reference data
_REF_PATH = Path(__file__).parent.parent / "data" / "helpdesk_reference.json"
_REF_DATA: Dict = {}

def _load_reference():
    global _REF_DATA
    if _REF_PATH.exists():
        with open(_REF_PATH) as f:
            _REF_DATA = json.load(f)
        logger.info(f"Loaded helpdesk reference data")
    else:
        logger.warning(f"Reference file not found at {_REF_PATH}")

_load_reference()

_current_session = None

def set_session(session):
    global _current_session
    _current_session = session


def lookup_error_code(error_code: str) -> str:
    """Look up an IT helpdesk error code and return details."""
    errors = _REF_DATA.get("errors", {})
    code_upper = error_code.upper().strip()

    if code_upper in errors:
        if _current_session:
            _current_session.update_checkpoint("diagnosis", "Lookup error codes", "complete", f"Found error {code_upper}")
        return json.dumps({
            "found": True,
            "error_code": code_upper,
            **errors[code_upper]
        })

    # Fuzzy match — check if the code is part of any key
    for key, value in errors.items():
        if code_upper in key or key in code_upper:
            if _current_session:
                _current_session.update_checkpoint("diagnosis", "Lookup error codes", "complete", f"Found error {key}")
            return json.dumps({
                "found": True,
                "error_code": key,
                "note": f"Closest match for '{error_code}'",
                **value
            })

    return json.dumps({
        "found": False,
        "error_code": error_code,
        "message": f"Error code '{error_code}' not found in reference database. Try searching the knowledge base for more information."
    })


def lookup_portal_page(page_name: str) -> str:
    """Look up a portal page or section and return its details."""
    pages = _REF_DATA.get("navigation_paths", {})
    name_upper = page_name.upper().strip().replace(" ", "_")

    if name_upper in pages:
        return json.dumps({
            "found": True,
            "page_key": name_upper,
            **pages[name_upper]
        })

    # Fuzzy match by searching in page names and descriptions
    for key, value in pages.items():
        name_lower = value.get("name", "").lower()
        if page_name.lower() in name_lower or name_lower in page_name.lower():
            return json.dumps({
                "found": True,
                "page_key": key,
                **value
            })

    return json.dumps({
        "found": False,
        "page_name": page_name,
        "message": f"Page '{page_name}' not found in reference database."
    })


PORTAL_DECLARATIONS = [
    {
        "name": "lookup_error_code",
        "description": "Look up a specific IT helpdesk error code to get its meaning, common causes, and resolution steps. Use when you see an error message on the user's screen or they mention an error code.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "error_code": {
                    "type": "STRING",
                    "description": "The error code (e.g. 'AUTH001', 'PAY001', 'FORM001', 'TECH001')"
                }
            },
            "required": ["error_code"]
        }
    },
    {
        "name": "lookup_portal_page",
        "description": "Look up a portal page or section to understand its purpose and common issues. Use when the user mentions which page or section they are on.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "page_name": {
                    "type": "STRING",
                    "description": "The portal page or section name (e.g. 'login', 'payment gateway', 'document upload', 'application form')"
                }
            },
            "required": ["page_name"]
        }
    }
]
