# Guardian — Implementation Tasks

> **Format**: Kiro IDE-style | **Version**: 1.1 | **Date**: 2026-03-08
> **Product**: Guardian — SAP AMS Control Tower
> **Status**: All phases complete

**Legend**: `[ ]` pending | `[x]` done | `[~]` in progress

---

## Phase 0: Foundation (COMPLETE)

- [x] Backend server (`server/main.py`) — FastAPI + WebSocket + Gemini Live proxy
- [x] GeminiLive client wrapper (`server/gemini_live.py`)
- [x] System prompt — Jessica persona (`server/prompts.py`)
- [x] Tool: KB search (`server/tools/kb_search.py`)
- [x] Tool: SAP error lookup (`server/tools/sap_lookup.py`)
- [x] Tool: SAP T-code lookup (`server/tools/sap_lookup.py`)
- [x] Tool: Issue tracker (`server/tools/issue_tracker.py`)
- [x] Tool: ITSM ticket creation (`server/tools/itsm.py`)
- [x] Tool: ITSM ticket update (`server/tools/itsm.py`)
- [x] Tool registry (`server/tools/registry.py`)
- [x] KB data seeding — 10 SAP error articles (`server/data/sap_knowledge_base.json`)
- [x] SAP reference data — error codes + T-codes (`server/data/sap_reference.json`)
- [x] Frontend: App root + routing (`frontend/src/components/app-root.js`)
- [x] Frontend: Home view (`frontend/src/components/view-home.js`)
- [x] Frontend: Live session view (`frontend/src/components/view-session.js`)
- [x] Frontend: Audio visualizer (`frontend/src/components/audio-visualizer.js`)
- [x] Frontend: Live transcript (`frontend/src/components/live-transcript.js`)
- [x] Frontend: Issue panel (`frontend/src/components/issue-panel.js`)
- [x] Frontend: GeminiLive JS client (`frontend/src/lib/gemini-live/`)
- [x] Guardian branding (dark theme, accent colors)
- [x] Initial commit on `guardian` branch

---

## Phase 1: Session State Backend (COMPLETE)

**Depends on**: Phase 0 (complete)
**Ref**: GF-001 (Session State), GF-002 (Session API)

### 1.1 Core Session State Module

- [x] Create `server/session_state.py`
- [x] Define `DiagnosticCheckpoint` dataclass (stage, label, status, timestamp, detail)
- [x] Define `TranscriptEntry` dataclass (speaker, text, timestamp)
- [x] Define `SessionState` dataclass (all fields per design spec)
- [x] Initialize default checkpoints for all 4 stages (13 checkpoints total)
- [x] Implement `_SESSIONS: dict[str, SessionState]` global store
- [x] Implement `create_session(token, language)` → `SessionState`
- [x] Implement `get_session(token)` → `SessionState | None`
- [x] Implement `end_session(token)` → `SessionState | None`
- [x] Implement `SessionState.advance_stage(stage)` method
- [x] Implement `SessionState.update_checkpoint(stage, label, status, detail)` method
- [x] Implement `SessionState.add_transcript(speaker, text)` method

### 1.2 Report Generation

- [x] Implement `SessionState.generate_rca()` → plain text RCA report
- [x] Implement `SessionState.generate_transcript_export()` → plain text transcript
- [x] Implement `SessionState.generate_call_summary()` → JSON-serializable dict

### 1.3 API Endpoints

- [x] Add `GET /api/session/{token}/summary` → JSON response
- [x] Add `GET /api/session/{token}/rca` → text/plain download with Content-Disposition
- [x] Add `GET /api/session/{token}/transcript` → text/plain download with Content-Disposition
- [x] Handle 404 for unknown tokens

### 1.4 Server Wiring

- [x] Modify `POST /api/auth` — accept `language` in body, call `create_session(token, language)`
- [x] Modify WS `/ws` handler — call `get_session(token)` on connect
- [x] Modify WS `/ws` handler — wire session into tool modules via `set_session()`
- [x] Modify WS `/ws` handler — call `end_session(token)` on disconnect (in finally block)
- [x] Add `emit_session_state(websocket, session)` helper function
- [x] Emit `session_state` event after each tool call completes

### 1.5 Tool Integration

- [x] Update `server/tools/issue_tracker.py` — add `_current_session` + `set_session()`, push to `session.issues`
- [x] Update `server/tools/itsm.py` — add `_current_session` + `set_session()`, push to `session.tickets`
- [x] Update `server/tools/kb_search.py` — add `_current_session` + `set_session()`, advance "Search knowledge base" checkpoint
- [x] Update `server/tools/sap_lookup.py` — add `_current_session` + `set_session()`, advance "Lookup error codes" checkpoint

---

## Phase 2: Frontend — New Components (COMPLETE)

**Depends on**: Phase 1 (needs `session_state` event format defined)
**Ref**: GF-003 (Diagnostic Tracker), GF-004 (Agent Guidance)

### 2.1 Diagnostic Tracker

- [x] Create `frontend/src/components/diagnostic-tracker.js`
- [x] Implement Shadow DOM with encapsulated styles
- [x] Render 4-stage pipeline (initiation → diagnosis → troubleshoot → resolution)
- [x] Stage indicators: pending (gray), active (pulsing blue), complete (green), skipped (yellow)
- [x] Expandable checkpoint list per stage (click to toggle)
- [x] Checkpoint status icons (pending ○, active ◉, complete ✓, skipped ⊘)
- [x] `updateFromState(state)` public method
- [x] Responsive layout: horizontal (≥768px), vertical (<768px)
- [x] CSS custom properties for theme integration

### 2.2 Agent Guidance Panel

- [x] Create `frontend/src/components/agent-guidance.js`
- [x] Implement Shadow DOM with encapsulated styles
- [x] Render guidance items as cards with title + detail
- [x] Copy-to-clipboard button per card
- [x] Visual feedback on copy ("Copied!" or checkmark, 2s duration)
- [x] `setGuidance(items)` public method (replace all)
- [x] `addGuidance(item)` public method (append)
- [x] Hidden when items array is empty (`display: none`)
- [x] Scrollable overflow

---

## Phase 3: Frontend — Integration (COMPLETE)

**Depends on**: Phase 1 + Phase 2
**Ref**: GF-005 (Live Session Integration)

- [x] Restructure `view-session.js` right panel: diagnostic-tracker → agent-guidance → issue-panel
- [x] Import and register `diagnostic-tracker` and `agent-guidance` components
- [x] Add WebSocket `session_state` event handler in `view-session.js`
- [x] Route `session_state.checkpoints` + `session_state.stage` to `diagnostic-tracker.updateFromState()`
- [x] Route `session_state.agent_guidance` to `agent-guidance.setGuidance()`
- [x] Route `session_state.issues` to issue-panel update
- [x] Store `this.sessionToken` for post-session navigation
- [x] Add language badge to session header (read-only display)
- [x] Right panel independently scrollable

---

## Phase 4: Summary View (COMPLETE)

**Depends on**: Phase 1 (API) + Phase 3 (navigation)
**Ref**: GF-006 (Post-Call Summary View)

### 4.1 Summary Component

- [x] Create `frontend/src/components/view-summary.js`
- [x] Shadow DOM with full-page layout
- [x] Fetch session data from `/api/session/{token}/summary` on mount
- [x] Show loading spinner while fetching
- [x] Show error state if fetch fails (404 or network error)
- [x] Display session metadata: duration, module, priority, language, timestamps
- [x] Embed `<diagnostic-tracker>` in read-only mode with fetched checkpoint data
- [x] Display issues list with severity badges (color-coded)
- [x] Display ITSM ticket card (if exists): ticket_id, title, severity, status
- [x] Display agent guidance section (if exists)
- [x] "Download RCA Report" button — fetch + trigger browser download
- [x] "Download Transcript" button — fetch + trigger browser download
- [x] "New Session" button — navigate to home view

### 4.2 Navigation Wiring

- [x] Add `case 'summary':` to `app-root.js` view switch
- [x] Pass `token` via navigate event detail: `{view: 'summary', token: '...'}`
- [x] Update `view-session.js` end-session flow → dispatch navigate to summary with token

---

## Phase 5: Multi-Language Support (COMPLETE)

**Depends on**: Phase 1 (session stores language)
**Ref**: GF-007 (Multi-Language)

- [x] Add language picker dropdown to `view-home.js` (15 languages)
- [x] Pass selected language in `POST /api/auth` request body
- [x] Add language instruction block to `server/prompts.py`: template string with `{language}` placeholder
- [x] In WS handler: append language directive to system instruction before sending to Gemini
- [x] Client-side language injection in `view-session.js` (dual layer)
- [x] Language passed through `app-root.js` navigation to session view
- [x] GeminiLive client updated to pass language in auth request

---

## Phase 6: Build & Ship (COMPLETE)

**Depends on**: All previous phases
**Ref**: GF-008 (Build & Deploy)

- [x] Run `cd frontend && npm run build` — clean build (15 modules, 233ms, 0 errors)
- [x] Copy `dist/` assets to root — verified served correctly by FastAPI SPA fallback
- [x] Python import verification — all modules import cleanly
- [x] Session state integration test — create_session, tool wiring, checkpoint updates, RCA generation all pass
- [x] Multi-language test — language prompt injection works for non-English, English has no extra
- [ ] Live end-to-end test with Gemini API (requires GCP credentials)
- [ ] Push `guardian` branch to remote

---

## Dependencies Graph

```
Phase 0 (DONE)
    │
    ├── Phase 1: Session State Backend (DONE)
    │       │
    │       ├── Phase 2: New Components (DONE)
    │       │       │
    │       │       └── Phase 3: Integration (DONE)
    │       │               │
    │       │               └──┐
    │       │                  │
    │       └──────────────────┤
    │                          │
    │                          └── Phase 4: Summary View (DONE)
    │
    ├── Phase 5: Multi-Language (DONE)
    │
    └── Phase 6: Build & Ship (DONE — pending live test + push)
```

---

## Key Files Summary

| File | Status | Phase | Description |
|------|--------|-------|-------------|
| `server/session_state.py` | DONE | 1 | Session state manager with dataclasses + store + report generation |
| `server/main.py` | DONE | 1 | Add session API endpoints, wire session into WS handler |
| `server/tools/issue_tracker.py` | DONE | 1 | Push issues to session state |
| `server/tools/itsm.py` | DONE | 1 | Push tickets to session state |
| `server/tools/kb_search.py` | DONE | 1 | Advance checkpoint on search |
| `server/tools/sap_lookup.py` | DONE | 1 | Advance checkpoint on lookup |
| `server/prompts.py` | DONE | 5 | Add language instruction template + get_system_prompt() |
| `frontend/src/components/diagnostic-tracker.js` | DONE | 2 | 4-stage pipeline visualization |
| `frontend/src/components/agent-guidance.js` | DONE | 2 | L2 guidance panel with copy |
| `frontend/src/components/view-summary.js` | DONE | 4 | Post-call summary + downloads |
| `frontend/src/components/view-session.js` | DONE | 3 | Restructure right panel, wire events, language badge |
| `frontend/src/components/view-home.js` | DONE | 5 | Add language picker (15 languages) |
| `frontend/src/components/app-root.js` | DONE | 4 | Add summary view case + token passing |
| `frontend/src/lib/gemini-live/geminilive.js` | DONE | 5 | Pass language in auth request |
