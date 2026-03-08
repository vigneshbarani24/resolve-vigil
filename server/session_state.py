"""
Session State Management for Guardian.

Tracks diagnostic checkpoints, transcript, issues, tickets,
and agent guidance throughout a support session. Provides
RCA report generation, transcript export, and call summary.
"""
import uuid
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class DiagnosticCheckpoint:
    stage: str
    label: str
    status: str  # "pending", "in_progress", "complete", "skipped"
    timestamp: Optional[str] = None
    detail: str = ""


@dataclass
class TranscriptEntry:
    speaker: str  # "user" or "agent"
    text: str
    timestamp: str = ""


# Default checkpoints per stage
_DEFAULT_CHECKPOINTS = {
    "initiation": [
        "Capture error details",
        "Identify SAP module",
        "Assess business impact",
    ],
    "diagnosis": [
        "Search knowledge base",
        "Lookup error codes",
        "Run diagnostic T-codes",
    ],
    "troubleshoot": [
        "Apply KB resolution",
        "Verify fix with user",
        "Check for side effects",
    ],
    "resolution": [
        "Document root cause",
        "Create ITSM ticket",
        "Generate RCA report",
        "Provide L2 guidance",
    ],
}

STAGE_ORDER = ["initiation", "diagnosis", "troubleshoot", "resolution"]


@dataclass
class SessionState:
    session_id: str
    token: str
    language: str = "English"
    module: str = ""
    priority: str = ""
    stage: str = "initiation"
    checkpoints: List[DiagnosticCheckpoint] = field(default_factory=list)
    transcript: List[TranscriptEntry] = field(default_factory=list)
    issues: List[Dict] = field(default_factory=list)
    tickets: List[Dict] = field(default_factory=list)
    agent_guidance: List[Dict] = field(default_factory=list)  # [{title, detail}]
    start_time: str = ""
    end_time: Optional[str] = None
    active: bool = True

    def advance_stage(self) -> str:
        """Advance to the next diagnostic stage. Returns the new stage name."""
        idx = STAGE_ORDER.index(self.stage) if self.stage in STAGE_ORDER else -1
        if idx < len(STAGE_ORDER) - 1:
            self.stage = STAGE_ORDER[idx + 1]
            logger.info(f"Session {self.session_id} advanced to stage: {self.stage}")
        return self.stage

    def update_checkpoint(self, stage: str, label: str, status: str, detail: str = "") -> bool:
        """Update a specific checkpoint's status and detail."""
        for cp in self.checkpoints:
            if cp.stage == stage and cp.label == label:
                cp.status = status
                cp.detail = detail
                cp.timestamp = datetime.now().isoformat()
                logger.info(f"Checkpoint updated: [{stage}] {label} -> {status}")
                return True
        return False

    def add_transcript(self, speaker: str, text: str) -> None:
        """Add a transcript entry."""
        entry = TranscriptEntry(
            speaker=speaker,
            text=text,
            timestamp=datetime.now().isoformat(),
        )
        self.transcript.append(entry)

    def generate_rca(self) -> str:
        """Generate a plain-text Root Cause Analysis report."""
        lines = []
        lines.append("=" * 60)
        lines.append("GUARDIAN — ROOT CAUSE ANALYSIS REPORT")
        lines.append("=" * 60)
        lines.append("")

        # Incident Summary
        lines.append("## Incident Summary")
        lines.append(f"Session ID : {self.session_id}")
        lines.append(f"Language   : {self.language}")
        lines.append(f"SAP Module : {self.module or 'Not identified'}")
        lines.append(f"Priority   : {self.priority or 'Not set'}")
        lines.append(f"Stage      : {self.stage}")
        lines.append(f"Start Time : {self.start_time}")
        lines.append(f"End Time   : {self.end_time or 'Ongoing'}")
        lines.append("")

        # Timeline
        lines.append("## Timeline")
        completed = [cp for cp in self.checkpoints if cp.status == "complete"]
        if completed:
            for cp in completed:
                ts = cp.timestamp or "N/A"
                lines.append(f"  [{ts}] [{cp.stage}] {cp.label} — {cp.detail}")
        else:
            lines.append("  No checkpoints completed.")
        lines.append("")

        # Issues Detected
        lines.append("## Issues Detected")
        if self.issues:
            for i, issue in enumerate(self.issues, 1):
                lines.append(f"  {i}. [{issue.get('severity', 'N/A').upper()}] {issue.get('title', 'Untitled')}")
                lines.append(f"     {issue.get('description', '')}")
        else:
            lines.append("  No issues detected.")
        lines.append("")

        # Root Cause
        lines.append("## Root Cause")
        if self.issues:
            lines.append(f"  Primary issue: {self.issues[0].get('title', 'Unknown')}")
            lines.append(f"  Description: {self.issues[0].get('description', 'N/A')}")
        else:
            lines.append("  Root cause not yet determined.")
        lines.append("")

        # Resolution Steps
        lines.append("## Resolution Steps")
        resolution_cps = [cp for cp in self.checkpoints if cp.stage in ("troubleshoot", "resolution") and cp.status == "complete"]
        if resolution_cps:
            for cp in resolution_cps:
                lines.append(f"  - {cp.label}: {cp.detail}")
        else:
            lines.append("  No resolution steps completed.")
        lines.append("")

        # Preventive Actions
        lines.append("## Preventive Actions")
        if self.agent_guidance:
            for g in self.agent_guidance:
                lines.append(f"  - {g.get('title', '')}: {g.get('detail', '')}")
        else:
            lines.append("  No preventive actions recommended yet.")
        lines.append("")

        # ITSM Tickets
        lines.append("## ITSM Tickets")
        if self.tickets:
            for t in self.tickets:
                lines.append(f"  - {t.get('ticket_id', 'N/A')}: {t.get('title', '')} [{t.get('status', 'N/A')}]")
        else:
            lines.append("  No tickets created.")
        lines.append("")
        lines.append("=" * 60)
        lines.append("End of Report")
        lines.append("=" * 60)

        return "\n".join(lines)

    def generate_transcript_export(self) -> str:
        """Generate transcript in [HH:MM:SS] SPEAKER: text format."""
        lines = []
        for entry in self.transcript:
            ts = entry.timestamp
            # Format timestamp to HH:MM:SS if ISO format
            try:
                dt = datetime.fromisoformat(ts)
                ts_formatted = dt.strftime("%H:%M:%S")
            except (ValueError, TypeError):
                ts_formatted = ts or "00:00:00"
            speaker = entry.speaker.upper()
            lines.append(f"[{ts_formatted}] {speaker}: {entry.text}")
        return "\n".join(lines)

    def generate_call_summary(self) -> Dict:
        """Generate a summary dict for the session."""
        duration = 0
        if self.start_time:
            try:
                start_dt = datetime.fromisoformat(self.start_time)
                end_dt = datetime.fromisoformat(self.end_time) if self.end_time else datetime.now()
                duration = int((end_dt - start_dt).total_seconds())
            except (ValueError, TypeError):
                duration = 0

        return {
            "session_id": self.session_id,
            "language": self.language,
            "module": self.module,
            "priority": self.priority,
            "stage": self.stage,
            "duration_seconds": duration,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "checkpoints": [
                {
                    "stage": cp.stage,
                    "label": cp.label,
                    "status": cp.status,
                    "timestamp": cp.timestamp,
                    "detail": cp.detail,
                }
                for cp in self.checkpoints
            ],
            "issues": self.issues,
            "tickets": self.tickets,
            "agent_guidance": self.agent_guidance,
            "transcript_length": len(self.transcript),
        }


# ---------------------------------------------------------------------------
# Global session store
# ---------------------------------------------------------------------------
_SESSIONS: Dict[str, SessionState] = {}


def create_session(token: str, language: str = "English") -> SessionState:
    """Create a new session state and store it by token."""
    session_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()

    # Build default checkpoints
    checkpoints: List[DiagnosticCheckpoint] = []
    for stage in STAGE_ORDER:
        for label in _DEFAULT_CHECKPOINTS[stage]:
            checkpoints.append(DiagnosticCheckpoint(
                stage=stage,
                label=label,
                status="pending",
            ))

    session = SessionState(
        session_id=session_id,
        token=token,
        language=language,
        checkpoints=checkpoints,
        start_time=now,
    )
    _SESSIONS[token] = session
    logger.info(f"Created session {session_id} for token {token[:8]}... (lang={language})")
    return session


def get_session(token: str) -> Optional[SessionState]:
    """Retrieve a session by token."""
    return _SESSIONS.get(token)


def end_session(token: str) -> Optional[SessionState]:
    """Mark a session as ended."""
    session = _SESSIONS.get(token)
    if session:
        session.end_time = datetime.now().isoformat()
        session.active = False
        logger.info(f"Ended session {session.session_id}")
    return session
