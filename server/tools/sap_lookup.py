"""
SAP Lookup Tool.

Provides lookups for SAP error codes, transaction codes,
and configuration details. In production, connect to SAP
system via RFC/BAPI or a cached reference database.
"""
import json
import logging
from pathlib import Path
from typing import Dict

logger = logging.getLogger(__name__)

# Load SAP reference data
_REF_PATH = Path(__file__).parent.parent / "data" / "sap_reference.json"
_REF_DATA: Dict = {}

def _load_reference():
    global _REF_DATA
    if _REF_PATH.exists():
        with open(_REF_PATH) as f:
            _REF_DATA = json.load(f)
        logger.info(f"Loaded SAP reference data")
    else:
        logger.warning(f"SAP reference file not found at {_REF_PATH}")

_load_reference()

_current_session = None

def set_session(session):
    global _current_session
    _current_session = session


def lookup_sap_error(error_code: str) -> str:
    """Look up an SAP error/message code and return details."""
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


def lookup_transaction_code(transaction_code: str) -> str:
    """Look up an SAP transaction code and return its details."""
    tcodes = _REF_DATA.get("transaction_codes", {})
    code_upper = transaction_code.upper().strip()

    if code_upper in tcodes:
        return json.dumps({
            "found": True,
            "transaction_code": code_upper,
            **tcodes[code_upper]
        })

    return json.dumps({
        "found": False,
        "transaction_code": transaction_code,
        "message": f"Transaction code '{transaction_code}' not found in reference database."
    })


SAP_DECLARATIONS = [
    {
        "name": "lookup_sap_error",
        "description": "Look up a specific SAP error or message number to get its meaning, common causes, and resolution steps. Use when you see an error message on the user's screen.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "error_code": {
                    "type": "STRING",
                    "description": "The SAP error/message code (e.g. 'VG035', 'M7021', 'F5003')"
                }
            },
            "required": ["error_code"]
        }
    },
    {
        "name": "lookup_transaction_code",
        "description": "Look up an SAP transaction code to get its full name, module, description, and common use cases.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "transaction_code": {
                    "type": "STRING",
                    "description": "The SAP transaction code (e.g. 'VA01', 'ME21N', 'FB60')"
                }
            },
            "required": ["transaction_code"]
        }
    }
]
