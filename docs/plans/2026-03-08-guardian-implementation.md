# Guardian — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Guardian into a hackathon-winning, customer-demo-ready SAP AMS Control Tower voice agent with structured diagnostic sessions, downloadable RCA/transcripts, multi-language support, credit economy display, and a polished post-call summary view.

**Architecture:** Immergo-forked Gemini Live voice app with FastAPI backend, 7+ pluggable tools, in-memory session state tracking diagnostic progress/credits/transcripts. Frontend is vanilla JS web components (no framework). New `view-summary` component for post-call deliverables.

**Tech Stack:** Python 3.13, FastAPI, google-genai SDK, Gemini Live (`gemini-live-2.5-flash-native-audio`), Vite, vanilla JS web components, Google Cloud (Vertex AI).

---

## Phase 1: KB Seeding + Demo Scenarios (Foundation)

### Task 1: Seed KB with PDF page 6 scenario — PGI batch error

**Files:**
- Modify: `server/data/sap_knowledge_base.json`
- Modify: `server/data/sap_reference.json`

**Step 1: Add PGI batch error to knowledge base**

Add to `sap_knowledge_base.json`:
```json
{
  "id": 11,
  "title": "Batch Cannot Be Determined During Post Goods Issue",
  "description": "When attempting PGI in VL02N, error 'Batch cannot be determined' occurs. Material is batch-managed but no batch search strategy is configured, or available batches don't meet selection criteria. Check OMJJ for batch search strategy configuration.",
  "module": "SD",
  "error_code": "VL244",
  "keywords": ["batch", "PGI", "VL02N", "goods issue", "delivery", "batch determination", "OMJJ", "MBC1"],
  "resolution": "1. Check if material is batch-managed in MM03 (Purchasing view)\n2. Verify batch search strategy in OMJJ for movement type 601\n3. Check batch master data in MSC3N — are batches available with unrestricted stock?\n4. Review batch search strategy configuration in MBC1\n5. If SHELF_LIFE selection is active, check batch expiry dates\n6. As workaround, try manually entering batch in VL02N Picking tab"
}
```

**Step 2: Add VL02N and batch error to reference data**

Add to `sap_reference.json` errors:
```json
"VL244": {
  "message": "Batch cannot be determined",
  "module": "SD",
  "cause": "No suitable batch found for the material during automatic batch determination. Batch search strategy may be missing or no batches meet the selection criteria.",
  "resolution": "1. Check batch search strategy in OMJJ for movement type\n2. Verify batches exist with unrestricted stock in MSC3N\n3. Check batch search strategy configuration in MBC1\n4. Verify material batch management indicator in MM03",
  "severity": "high"
}
```

Add to transaction_codes:
```json
"VL02N": {
  "name": "Change Outbound Delivery",
  "module": "SD",
  "description": "Change an existing outbound delivery. Used for picking, packing, and post goods issue (PGI).",
  "related": ["VL01N", "VL03N", "VA01", "MIGO"]
},
"SU53": {
  "name": "Authorization Check Display",
  "module": "BASIS",
  "description": "Display the last authorization check that failed. Run immediately after an authorization error to identify the missing authorization object.",
  "related": ["SU01", "PFCG"]
},
"SM12": {
  "name": "Display and Delete Lock Entries",
  "module": "BASIS",
  "description": "View active lock entries on database objects. Used to identify if records are locked by other users or processes.",
  "related": ["SM04", "SM50"]
}
```

**Step 3: Commit**
```bash
git add server/data/sap_knowledge_base.json server/data/sap_reference.json
git commit -m "feat: seed KB with PGI batch error and PO approval demo scenarios"
```

### Task 2: Seed KB with PDF page 7 scenario — PO approval error

**Files:**
- Modify: `server/data/sap_knowledge_base.json`
- Modify: `server/data/sap_reference.json`

**Step 1: Add PO approval error to KB**

Add to `sap_knowledge_base.json`:
```json
{
  "id": 12,
  "title": "Cannot Determine Approver for Purchase Order",
  "description": "When creating a PO in ME21N above a certain value threshold, error 'Cannot determine approver' occurs. This indicates the release strategy configuration doesn't match the PO characteristics (value, purchasing group, document type).",
  "module": "MM",
  "error_code": "ME390",
  "keywords": ["approver", "release strategy", "ME21N", "purchase order", "workflow", "classification", "CEKB"],
  "resolution": "1. Verify T-code is ME21N (not MM01 which is material master)\n2. Refresh session with /nME21N and re-enter PO\n3. Click Check button to validate mandatory fields\n4. If error persists, this is a release strategy configuration issue\n5. Check release strategy in SPRO > MM > Purchasing > Release Procedure\n6. Verify PO characteristics match classification values in CEKB\n7. Escalate to L2 for backend configuration — user cannot fix this"
}
```

**Step 2: Add ME390 to reference errors**

```json
"ME390": {
  "message": "Cannot determine approver",
  "module": "MM",
  "cause": "The release strategy for the purchase order cannot find a matching approver. The PO characteristics (value, purchasing group, document type) don't match the classification values defined in the workflow configuration.",
  "resolution": "1. Check release strategy in SPRO\n2. Verify classification values in CEKB match PO characteristics\n3. This requires backend configuration access — escalate to L2",
  "severity": "high"
}
```

**Step 3: Commit**
```bash
git add server/data/
git commit -m "feat: seed KB with PO approval error scenario from Guardian PDF"
```

---

## Phase 2: Session State + Diagnostic Tracking (Backend)

### Task 3: Add session state manager

**Files:**
- Create: `server/session_state.py`

**Step 1: Create session state module**

```python
"""
Session state manager for Guardian.

Tracks per-session: diagnostic stage, credits, transcript,
issues, tickets, agent guidance, language, and screenshots.
"""
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict


@dataclass
class DiagnosticCheckpoint:
    label: str
    status: str = "pending"  # pending, passed, failed
    timestamp: Optional[str] = None


@dataclass
class SessionState:
    session_id: str = ""
    language: str = "en"
    module: str = ""
    priority: str = ""
    stage: str = "initiation"  # initiation, diagnosis, troubleshoot, resolution
    credits_consumed: int = 0
    started_at: str = ""
    ended_at: str = ""
    transcript: List[Dict] = field(default_factory=list)
    issues: List[Dict] = field(default_factory=list)
    tickets: List[Dict] = field(default_factory=list)
    agent_guidance: List[str] = field(default_factory=list)
    checkpoints: Dict[str, List[DiagnosticCheckpoint]] = field(default_factory=dict)
    screenshots: List[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.session_id:
            self.session_id = f"GRD-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        if not self.started_at:
            self.started_at = datetime.now().isoformat()
        if not self.checkpoints:
            self.checkpoints = {
                "initiation": [
                    DiagnosticCheckpoint("Module identified"),
                    DiagnosticCheckpoint("Priority assigned"),
                    DiagnosticCheckpoint("T-code captured"),
                ],
                "diagnosis": [
                    DiagnosticCheckpoint("Authorization check (SU53)"),
                    DiagnosticCheckpoint("Lock entry check (SM12)"),
                    DiagnosticCheckpoint("Session refreshed (/n)"),
                ],
                "troubleshoot": [
                    DiagnosticCheckpoint("Knowledge base searched"),
                    DiagnosticCheckpoint("Manual workaround attempted"),
                ],
                "resolution": [
                    DiagnosticCheckpoint("Issue resolved / Ticket created"),
                ],
            }

    def advance_stage(self, stage: str):
        valid = ["initiation", "diagnosis", "troubleshoot", "resolution"]
        if stage in valid:
            self.stage = stage

    def update_checkpoint(self, stage: str, label: str, status: str):
        if stage in self.checkpoints:
            for cp in self.checkpoints[stage]:
                if cp.label == label:
                    cp.status = status
                    cp.timestamp = datetime.now().isoformat()
                    return True
        return False

    def add_transcript_entry(self, speaker: str, text: str):
        self.transcript.append({
            "speaker": speaker,
            "text": text,
            "timestamp": datetime.now().isoformat(),
        })

    def set_credits(self, credits: int):
        self.credits_consumed = credits

    def add_agent_guidance(self, guidance: str):
        if guidance not in self.agent_guidance:
            self.agent_guidance.append(guidance)

    def end_session(self):
        self.ended_at = datetime.now().isoformat()

    def to_dict(self) -> dict:
        d = asdict(self)
        return d

    def generate_rca(self) -> str:
        """Generate the AMS Veteran Diagnostic Report."""
        ticket_info = self.tickets[0] if self.tickets else {}
        ticket_id = ticket_info.get("ticket_id", "N/A")

        checkpoints_text = ""
        for stage_name, cps in self.checkpoints.items():
            stage_lines = []
            for cp in cps:
                icon = "✓" if cp.status == "passed" else ("✗" if cp.status == "failed" else "○")
                stage_lines.append(f"  {icon} {cp.label}")
            checkpoints_text += f"\n{stage_name.upper()}:\n" + "\n".join(stage_lines) + "\n"

        guidance_text = "\n".join(f"  {i+1}. {g}" for i, g in enumerate(self.agent_guidance)) if self.agent_guidance else "  N/A — Resolved by Guardian"

        duration = ""
        if self.started_at and self.ended_at:
            try:
                start = datetime.fromisoformat(self.started_at)
                end = datetime.fromisoformat(self.ended_at)
                delta = end - start
                mins = int(delta.total_seconds() // 60)
                secs = int(delta.total_seconds() % 60)
                duration = f"{mins}m {secs}s"
            except:
                duration = "N/A"

        return f"""[AMS VETERAN DIAGNOSTIC REPORT]
══════════════════════════════════════════════════
TICKET METADATA:
  Ticket ID:    {ticket_id}
  Priority:     {self.priority or 'N/A'}
  Module:       {self.module or 'N/A'}
  Language:     {self.language}
  Duration:     {duration}
  Credits Used: {self.credits_consumed}
  Session ID:   {self.session_id}

DIAGNOSTIC FLOW:
{checkpoints_text}
AGENT GUIDANCE FOR L2:
{guidance_text}

TRANSCRIPT SUMMARY:
  Total exchanges: {len(self.transcript)}
  Screenshots captured: {len(self.screenshots)}

══════════════════════════════════════════════════
Generated by Guardian — SAP AMS Control Tower
{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""

    def generate_transcript_export(self) -> str:
        """Generate downloadable transcript."""
        lines = [
            f"GUARDIAN SESSION TRANSCRIPT",
            f"Session: {self.session_id}",
            f"Date: {self.started_at}",
            f"Language: {self.language}",
            f"{'=' * 60}",
            "",
        ]
        for entry in self.transcript:
            speaker = entry.get("speaker", "Unknown")
            text = entry.get("text", "")
            ts = entry.get("timestamp", "")
            time_short = ts.split("T")[1][:8] if "T" in ts else ts
            lines.append(f"[{time_short}] {speaker}: {text}")
        return "\n".join(lines)

    def generate_call_summary(self) -> dict:
        """Generate call summary for the summary view."""
        duration = ""
        if self.started_at and self.ended_at:
            try:
                start = datetime.fromisoformat(self.started_at)
                end = datetime.fromisoformat(self.ended_at)
                delta = end - start
                mins = int(delta.total_seconds() // 60)
                secs = int(delta.total_seconds() % 60)
                duration = f"{mins}m {secs}s"
            except:
                duration = "N/A"

        return {
            "session_id": self.session_id,
            "duration": duration,
            "language": self.language,
            "module": self.module,
            "priority": self.priority,
            "stage": self.stage,
            "credits_consumed": self.credits_consumed,
            "checkpoints": {
                stage: [asdict(cp) for cp in cps]
                for stage, cps in self.checkpoints.items()
            },
            "tickets": self.tickets,
            "agent_guidance": self.agent_guidance,
            "issues_count": len(self.issues),
            "transcript_count": len(self.transcript),
            "screenshots_count": len(self.screenshots),
        }


# Global session store (in-memory, keyed by WebSocket token)
_SESSIONS: Dict[str, SessionState] = {}


def create_session(token: str, language: str = "en") -> SessionState:
    session = SessionState(language=language)
    _SESSIONS[token] = session
    return session


def get_session(token: str) -> Optional[SessionState]:
    return _SESSIONS.get(token)


def end_session(token: str) -> Optional[SessionState]:
    session = _SESSIONS.get(token)
    if session:
        session.end_session()
    return session
```

**Step 2: Commit**
```bash
git add server/session_state.py
git commit -m "feat: add session state manager with RCA/transcript generation"
```

### Task 4: Wire session state into main.py and tools

**Files:**
- Modify: `server/main.py`
- Modify: `server/tools/issue_tracker.py`
- Modify: `server/tools/itsm.py`

**Step 1: Update main.py to create sessions and add API endpoints**

In `main.py`, import and wire session state:
- On `/api/auth` — create a session with language from request body
- On `/ws` — look up session by token, pass to tools via closure
- Add `GET /api/session/{session_id}/summary`
- Add `GET /api/session/{session_id}/rca` — returns text file download
- Add `GET /api/session/{session_id}/transcript` — returns text file download
- On transcript events, add entries to session state
- On tool events, update diagnostic checkpoints and credits

**Step 2: Update tools to accept session_state parameter**

Modify `create_issue` to also push to `session_state.issues`.
Modify `create_itsm_ticket` to also push to `session_state.tickets` and set credits (50 for escalation).
Modify `diagnose_sap_issue` to add agent guidance entries.

**Step 3: Send diagnostic state events to frontend**

When session state changes (stage advance, checkpoint update, credit change), emit a WebSocket JSON event:
```json
{
  "type": "session_state",
  "data": {
    "stage": "diagnosis",
    "credits": 50,
    "checkpoints": {...},
    "agent_guidance": [...]
  }
}
```

**Step 4: Commit**
```bash
git add server/main.py server/tools/ server/session_state.py
git commit -m "feat: wire session state into WebSocket, tools, and new API endpoints"
```

---

## Phase 3: Frontend — Diagnostic Progress + Credits (Live Session)

### Task 5: Create diagnostic-tracker component

**Files:**
- Create: `frontend/src/components/diagnostic-tracker.js`

Build a web component `<diagnostic-tracker>` that shows 4 horizontal stages with checkpoints:

```
[Initiation ✓] → [Diagnosis ●] → [Troubleshoot ○] → [Resolution ○]
   Module: SD ✓       SU53: ✓          KB search: ○
   Priority: P2 ✓     SM12: ✓          Workaround: ○
   T-code: VL02N ✓    Session: ✓
```

API:
- `tracker.updateFromState(stateData)` — updates from WebSocket event
- Active stage is highlighted, completed stages have green checkmarks, failed have red X
- Animate transitions between stages

**Step 1: Build the component with inline styles (no external CSS)**

**Step 2: Commit**
```bash
git add frontend/src/components/diagnostic-tracker.js
git commit -m "feat: add diagnostic-tracker component with 4-stage progress"
```

### Task 6: Create credit-counter component

**Files:**
- Create: `frontend/src/components/credit-counter.js`

Small badge component showing credits consumed:
- `0` credits: grey badge "0 credits"
- `1` credit: green badge "1 credit — Resolved"
- `50` credits: yellow badge "50 credits — Escalated L1"
- `200` credits: red badge "200 credits — Major Incident"

API: `counter.setCredits(50)`

**Step 1: Build component**
**Step 2: Commit**

### Task 7: Create agent-guidance component

**Files:**
- Create: `frontend/src/components/agent-guidance.js`

Panel that appears below the diagnostic tracker when escalation happens:
- Header: "Agent Guidance for L2"
- Numbered list of recommended next steps
- Styled as a distinct card (different bg color — slightly blue/professional)

API: `guidance.setGuidance(["Check OMJJ...", "Verify batch search..."])`

**Step 1: Build component**
**Step 2: Commit**

### Task 8: Integrate new components into view-session

**Files:**
- Modify: `frontend/src/components/view-session.js`

Replace the `issue-panel` section with a new layout:
```
┌──────────────────────────┬─────────────────┐
│  Transcript              │  Right Panel:   │
│                          │  - Diag Tracker │
│                          │  - Credit Badge │
│                          │  - Agent Guide  │
│                          │  - Issue Panel  │
└──────────────────────────┴─────────────────┘
```

Wire the `session_state` WebSocket events to update all components.
Add language picker to session header (dropdown: English, German, French, Spanish, Japanese, etc.).

**Step 1: Import new components, restructure layout**
**Step 2: Handle `session_state` events from WebSocket**
**Step 3: Add language picker and pass to backend on auth**
**Step 4: Commit**

---

## Phase 4: Frontend — Summary View (Post-Call)

### Task 9: Create view-summary component

**Files:**
- Create: `frontend/src/components/view-summary.js`

Dedicated post-call screen with:

**Header Section:**
```
Session Report  #GRD-2026-0308-001
Duration: 4m 32s | Language: DE → EN
Module: SD | Priority: P2 | Credits: 50
```

**Diagnostic Flow Section:**
Visual 4-stage pipeline with checkpoints (reuses diagnostic-tracker in readonly mode)

**Ticket Section:**
Card showing ticket ID, priority, module, error, assigned team, SLA status

**Agent Guidance Section:**
Numbered list of L2 recommendations (if escalated)

**Download Buttons:**
- "Download RCA Report" → fetches `/api/session/{id}/rca` → downloads .txt
- "Download Transcript" → fetches `/api/session/{id}/transcript` → downloads .txt

**Action Button:**
- "New Session" → navigates back to home

**Step 1: Build the complete view-summary component**
**Step 2: Commit**

### Task 10: Wire view-summary into app-root navigation

**Files:**
- Modify: `frontend/src/components/app-root.js`
- Modify: `frontend/src/components/view-session.js`

Add `'summary'` case to app-root's render switch.
When session ends in view-session, navigate to summary with session_id:
```js
this.dispatchEvent(new CustomEvent('navigate', {
    bubbles: true,
    detail: { view: 'summary', sessionId: this.sessionId }
}));
```

**Step 1: Add summary case to app-root**
**Step 2: Update view-session end flow to navigate to summary**
**Step 3: Commit**

---

## Phase 5: Multi-Language Support

### Task 11: Add language to system prompt and session setup

**Files:**
- Modify: `server/prompts.py`
- Modify: `server/main.py`
- Modify: `frontend/src/components/view-session.js`

**Step 1: Update prompt to include language instruction**

Add to system prompt:
```
# Language
Respond in the user's chosen language. If they speak German, respond in German.
If they speak French, respond in French. You support 40+ languages natively.
HOWEVER: All tickets, RCA reports, and agent guidance MUST be generated in English
regardless of conversation language. This bridges the language gap between
business users and the offshore AMS team.
```

**Step 2: Pass language from frontend to backend via auth endpoint**

Frontend sends `{ language: "de" }` in auth POST body.
Backend creates session with that language.
Backend includes language hint in setup config system instruction.

**Step 3: Commit**

---

## Phase 6: Build, Test, Polish

### Task 12: Rebuild frontend and verify end-to-end

**Step 1: `cd frontend && npm run build`**
**Step 2: Copy dist to root: `rm -rf dist && cp -r frontend/dist .`**
**Step 3: Start server: `python -m uvicorn server.main:app --port 8080`**
**Step 4: Test full flow: Home → Session → Talk → End → Summary → Download RCA**
**Step 5: Commit all remaining changes**

### Task 13: Commit and push guardian branch

```bash
git add -A
git commit -m "feat: Guardian v1 — diagnostic tracker, RCA export, multi-language, credit economy"
git push -u origin guardian
```

---

## Backlog — Post-Hackathon / If Time Permits

### B1: Screenshot auto-capture on error detection
When Jessica detects an error on the shared screen, auto-capture a screenshot and attach it to the session state. Include in RCA download.

### B2: Ticket email notification
When a ticket is created, send a formatted email to a configured AMS team address with the RCA attached.

### B3: Microsoft Teams integration
Guardian as a Teams bot — users open a Teams chat, talk to Jessica, same diagnostic flow. Uses Microsoft Bot Framework + Gemini Live API.

### B4: Persistent session database
Replace in-memory session store with Cloud Firestore or AlloyDB. Users can access past sessions, search tickets.

### B5: Admin dashboard
Analytics view for AMS managers: MTTR by module, credit consumption, top recurring errors, AI deflection rate, SLA compliance.

### B6: Real ITSM integration
Connect to ServiceNow, Jira Service Management, or SAP Solution Manager via REST API. Create real tickets, not mock ones.

### B7: Proactive alerting
Guardian monitors SM37 job failures, SM21 system logs, and proactively contacts affected users before they even call.

### B8: Knowledge base vector search
Replace keyword matching with Vertex AI Search or embeddings-based vector search for more accurate KB retrieval.

### B9: Session recording + playback
Record the full voice session (audio + screen) for compliance and training. Managers can replay sessions.

### B10: SAP GUI co-pilot mode
Browser extension or SAP GUI script that connects to Guardian. Jessica can "see" the SAP screen natively without screen share.

### B11: Automated resolution scripts
For known L0 issues (password reset, user unlock, buffer clear), Jessica executes the fix directly via RFC/BAPI rather than just guiding the user.

### B12: Customer satisfaction survey
After session ends, quick voice-based CSAT: "On a scale of 1-5, how was your experience?" Tracked per session.

### B13: Recurring issue detection
Guardian tracks patterns across sessions. "This is the 4th batch determination error this week on plant 1200. Recommend proactive config review."

### B14: SLA countdown timer
Visual timer showing time remaining on SLA for current priority level. Changes color as deadline approaches.

### B15: Multi-agent escalation
When Jessica escalates to L2, the L2 agent can pick up the Guardian session, see the full context, and continue the conversation.
