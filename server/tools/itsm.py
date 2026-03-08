"""
ITSM (IT Service Management) Tool.

Creates and updates helpdesk tickets in ITSM systems like
ServiceNow, SAP Solution Manager, or Jira Service Management.

In production, this would call the ITSM REST API via MCP.
Currently returns mock responses for demo.
"""
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, List

logger = logging.getLogger(__name__)

# In-memory ticket store (replace with ITSM API in production)
_TICKETS: Dict[str, Dict] = {}

_current_session = None

def set_session(session):
    global _current_session
    _current_session = session


def create_itsm_ticket(
    title: str,
    description: str,
    severity: str = "medium",
    category: str = "SAP Support",
    transaction_code: str = "",
    error_code: str = "",
    steps_to_reproduce: str = "",
) -> str:
    """Create a new ITSM ticket."""
    ticket_id = f"INC{str(uuid.uuid4())[:8].upper()}"

    ticket = {
        "ticket_id": ticket_id,
        "title": title,
        "description": description,
        "severity": severity,
        "category": category,
        "transaction_code": transaction_code,
        "error_code": error_code,
        "steps_to_reproduce": steps_to_reproduce,
        "status": "New",
        "created_at": datetime.now().isoformat(),
        "assigned_to": "L1 SAP Support",
    }

    _TICKETS[ticket_id] = ticket
    logger.info(f"Created ITSM ticket: {ticket_id} - {title}")

    if _current_session:
        _current_session.tickets.append(ticket)
        _current_session.update_checkpoint("resolution", "Document root cause", "complete", f"RCA for {title}")
        _current_session.update_checkpoint("resolution", "Create ITSM ticket", "complete", f"Ticket {ticket_id}")
        _current_session.update_checkpoint("resolution", "Generate RCA report", "complete", "RCA available for download")

    return json.dumps({
        "success": True,
        "ticket_id": ticket_id,
        "message": f"Ticket {ticket_id} created successfully",
        "ticket": ticket
    })


def update_itsm_ticket(
    ticket_id: str,
    status: str = "",
    resolution: str = "",
    notes: str = "",
) -> str:
    """Update an existing ITSM ticket."""
    if ticket_id not in _TICKETS:
        return json.dumps({
            "success": False,
            "message": f"Ticket {ticket_id} not found"
        })

    ticket = _TICKETS[ticket_id]

    if status:
        ticket["status"] = status
    if resolution:
        ticket["resolution"] = resolution
    if notes:
        ticket.setdefault("notes", []).append({
            "text": notes,
            "timestamp": datetime.now().isoformat()
        })

    ticket["updated_at"] = datetime.now().isoformat()

    if _current_session:
        # Update ticket in session too
        for i, t in enumerate(_current_session.tickets):
            if t.get("ticket_id") == ticket_id:
                _current_session.tickets[i] = ticket
                break

    logger.info(f"Updated ITSM ticket: {ticket_id}")

    return json.dumps({
        "success": True,
        "ticket_id": ticket_id,
        "message": f"Ticket {ticket_id} updated",
        "ticket": ticket
    })


def get_all_tickets() -> List[Dict]:
    """Get all tickets (for API endpoint)."""
    return list(_TICKETS.values())


ITSM_DECLARATIONS = [
    {
        "name": "create_itsm_ticket",
        "description": "Create a new ITSM helpdesk ticket when the user has an issue that needs tracking or escalation. Use this for persistent issues, recurring errors, or when the user explicitly asks to log a ticket.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "title": {
                    "type": "STRING",
                    "description": "Short descriptive title for the ticket"
                },
                "description": {
                    "type": "STRING",
                    "description": "Detailed description of the issue including context"
                },
                "severity": {
                    "type": "STRING",
                    "description": "Ticket severity: critical, high, medium, or low"
                },
                "category": {
                    "type": "STRING",
                    "description": "Support category (e.g. 'SAP SD', 'SAP MM', 'SAP BASIS')"
                },
                "transaction_code": {
                    "type": "STRING",
                    "description": "SAP transaction code where the issue occurred"
                },
                "error_code": {
                    "type": "STRING",
                    "description": "SAP error/message number if applicable"
                },
                "steps_to_reproduce": {
                    "type": "STRING",
                    "description": "Steps to reproduce the issue"
                }
            },
            "required": ["title", "description", "severity"]
        }
    },
    {
        "name": "update_itsm_ticket",
        "description": "Update an existing ITSM ticket with new status, resolution notes, or additional information.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "ticket_id": {
                    "type": "STRING",
                    "description": "The ticket ID to update (e.g. INC12345678)"
                },
                "status": {
                    "type": "STRING",
                    "description": "New status: New, In Progress, Resolved, Closed"
                },
                "resolution": {
                    "type": "STRING",
                    "description": "Resolution description if the issue was fixed"
                },
                "notes": {
                    "type": "STRING",
                    "description": "Additional notes or updates"
                }
            },
            "required": ["ticket_id"]
        }
    }
]
