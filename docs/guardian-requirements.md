# Guardian — Requirements Specification

> **Format**: Kiro IDE-style | **Version**: 1.0 | **Date**: 2026-03-08
> **Product**: Guardian — SAP AMS Control Tower
> **Status**: Phase 0 complete, Phases 1–6 pending

---

## Product Overview

Guardian is a real-time voice-powered SAP Application Management Services (AMS) control tower. Users speak to **Jessica**, a battle-hardened SAP support veteran (Tier 0.5 agent), who triages incidents, runs diagnostic protocols, searches knowledge bases, logs issues, creates ITSM tickets, and generates Root Cause Analysis (RCA) reports — all through natural voice conversation with optional screen sharing.

**Core Loop**: User describes SAP issue → Jessica triages → runs diagnostics via tool calls → resolves or escalates with full documentation.

**Tech Stack**: Gemini Live (`gemini-live-2.5-flash-native-audio`) + FastAPI + WebSocket + Vanilla JS Web Components.

---

## Feature Requirements

### GF-001: Session State Management (Must-have)

**Description**: Backend session state tracking that persists diagnostic context across a live session — stages, checkpoints, transcript, issues, tickets, and agent guidance.

**User Stories**:

- As a support engineer, I want my session to track which diagnostic stage I'm in so that Jessica can provide contextual guidance.
- As a support engineer, I want my transcript logged so that I can review the full conversation after the call.
- As a manager, I want session data structured so that post-call reports can be generated automatically.

**Acceptance Criteria**:

- [ ] `SessionState` dataclass tracks: session_id, token, language, module, priority, stage, transcript, issues, tickets, checkpoints, agent_guidance, timestamps
- [ ] `DiagnosticCheckpoint` dataclass tracks: stage, label, status (pending/active/complete/skipped), timestamp, detail
- [ ] 4-stage diagnostic pipeline: `initiation` → `diagnosis` → `troubleshoot` → `resolution`
- [ ] Each stage has 3–4 checkpoints (e.g., initiation: capture error, identify module, assess impact)
- [ ] Global in-memory store (`_SESSIONS` dict) manages all active sessions
- [ ] `create_session(token)` → returns new `SessionState`
- [ ] `get_session(token)` → returns existing `SessionState` or None
- [ ] `end_session(token)` → marks session complete, records end timestamp
- [ ] Transcript entries include: speaker (user/jessica), text, timestamp
- [ ] Session auto-captures issues and tickets created by tool calls

---

### GF-002: Session API Endpoints (Must-have)

**Description**: REST endpoints for retrieving session data as structured JSON or downloadable text files.

**User Stories**:

- As a support engineer, I want to download a post-call RCA report so that I can attach it to the ITSM ticket.
- As a support engineer, I want to download the full transcript so that I have a record of the conversation.
- As a manager, I want a JSON summary so that I can integrate session data into dashboards.

**Acceptance Criteria**:

- [ ] `GET /api/session/{token}/summary` → returns JSON with session metadata, stage, checkpoints, issues, tickets, agent guidance
- [ ] `GET /api/session/{token}/rca` → returns `text/plain` RCA report as file download (`Content-Disposition: attachment`)
- [ ] `GET /api/session/{token}/transcript` → returns `text/plain` transcript as file download
- [ ] RCA report includes: incident summary, timeline, root cause, resolution steps, preventive actions
- [ ] Transcript export includes: timestamp + speaker + text per line
- [ ] Returns 404 if session token not found
- [ ] Returns partial data if session is still active (not yet ended) — partial RCA and in-progress transcript are acceptable

---

### GF-003: Diagnostic Tracker UI (Must-have)

**Description**: A 4-stage visual pipeline component showing the diagnostic progression from initiation through resolution, with expandable checkpoints per stage.

**User Stories**:

- As a support engineer, I want to see which diagnostic stage I'm in so that I know how far along the resolution process is.
- As a support engineer, I want to see completed checkpoints so that I can confirm Jessica has covered all diagnostic steps.
- As a manager observing a session, I want a visual pipeline so that I can quickly assess session progress.

**Acceptance Criteria**:

- [ ] `<diagnostic-tracker>` web component with Shadow DOM
- [ ] Displays 4 stages as connected pipeline nodes: Initiation → Diagnosis → Troubleshoot → Resolution
- [ ] Each stage shows status: pending (gray), active (pulsing blue), complete (green), skipped (yellow)
- [ ] Clicking a stage expands its checkpoints list
- [ ] Checkpoints show individual status icons (pending/active/complete/skipped)
- [ ] Active stage has subtle pulse animation
- [ ] Completed stages show checkmark icon
- [ ] `updateFromState(sessionState)` public method accepts session state object
- [ ] Responsive: horizontal on desktop (≥768px), vertical on mobile
- [ ] Uses CSS custom properties for Guardian theme integration

---

### GF-004: Agent Guidance Panel (Must-have)

**Description**: A panel displaying L2 escalation recommendations and expert guidance from Jessica, with copy-to-clipboard functionality.

**User Stories**:

- As a support engineer, I want to see Jessica's L2 recommendations in a dedicated panel so that I can act on them independently of the conversation.
- As a support engineer, I want to copy guidance text so that I can paste it into emails or tickets.

**Acceptance Criteria**:

- [ ] `<agent-guidance>` web component with Shadow DOM
- [ ] Displays guidance items as cards with title and detail text
- [ ] Each card has a "Copy" button that copies the full guidance text to clipboard
- [ ] Shows visual feedback on copy (brief checkmark or "Copied!" text)
- [ ] Hidden when no guidance items exist (not visible, not just empty)
- [ ] `setGuidance(items)` public method accepts array of `{title, detail}` objects
- [ ] `addGuidance(item)` public method appends a single item
- [ ] Scrollable when guidance items exceed panel height
- [ ] Styled consistently with Guardian theme (dark mode, accent colors)

---

### GF-005: Live Session Integration (Must-have)

**Description**: Wire new diagnostic tracker and agent guidance components into the existing `view-session.js` right sidebar, and handle `session_state` WebSocket events.

**User Stories**:

- As a support engineer, I want the diagnostic tracker visible during my live session so that I can track progress in real time.
- As a support engineer, I want agent guidance to appear as Jessica provides it during the conversation.

**Acceptance Criteria**:

- [ ] `view-session.js` right panel restructured: diagnostic-tracker (top) → agent-guidance (middle) → issue-panel (bottom)
- [ ] WebSocket `session_state` events parsed and routed to appropriate components
- [ ] `session_state` event updates diagnostic-tracker via `updateFromState()`
- [ ] `session_state` event updates agent-guidance via `setGuidance()`
- [ ] `session_state` event updates issue-panel with new issues
- [ ] Session token stored in component state for post-session navigation
- [ ] Right panel scrollable independently of transcript panel
- [ ] Layout remains functional on screens ≥1024px width

---

### GF-006: Post-Call Summary View (Must-have)

**Description**: A dedicated full-page view shown after a session ends, displaying the complete session report with download options.

**User Stories**:

- As a support engineer, I want a summary page after the call so that I can review the entire diagnostic session.
- As a support engineer, I want download buttons for RCA and transcript so that I can save them locally.
- As a manager, I want to see the ITSM ticket details in the summary so that I can verify proper documentation.

**Acceptance Criteria**:

- [ ] `<view-summary>` web component with full-page layout
- [ ] Displays session metadata: duration, module, priority, language, timestamp
- [ ] Shows diagnostic pipeline (reuses `<diagnostic-tracker>` in read-only mode)
- [ ] Lists all detected issues with severity badges
- [ ] Shows ITSM ticket card (ticket ID, title, severity, status) if ticket was created
- [ ] Shows agent guidance section if guidance was provided
- [ ] "Download RCA Report" button → fetches `/api/session/{token}/rca` and triggers browser download
- [ ] "Download Transcript" button → fetches `/api/session/{token}/transcript` and triggers browser download
- [ ] "New Session" button → navigates back to home view
- [ ] Fetches session data from `/api/session/{token}/summary` on mount
- [ ] Shows loading state while fetching
- [ ] Shows error state if session not found

---

### GF-007: Multi-Language Support (Should-have)

**Description**: Allow users to select a conversation language so that Jessica responds in their preferred language, while keeping tickets and RCA reports in English.

**User Stories**:

- As a non-English-speaking support engineer, I want to converse with Jessica in my language so that I can describe issues more accurately.
- As a manager, I want tickets and RCA reports always in English so that they're consistent across the global team.

**Acceptance Criteria**:

- [ ] Language picker dropdown on home screen (view-home.js) with 10+ language options
- [ ] Selected language passed to `/api/auth` POST body as `language` field
- [ ] System instruction dynamically includes language directive: "Respond in {language}. All ITSM tickets, RCA reports, and technical documentation must remain in English."
- [ ] Jessica's spoken responses are in the selected language
- [ ] Tool outputs (KB search results, error lookups) remain in English (source data is English)
- [ ] Default language: English
- [ ] Language stored in session state for reference in summary view

---

### GF-008: Build & Deploy (Must-have)

**Description**: Production build of frontend, end-to-end testing, and final push to guardian branch.

**User Stories**:

- As a developer, I want a clean production build so that the app is ready for demo and deployment.
- As a hackathon judge, I want the app accessible so that I can evaluate it.

**Acceptance Criteria**:

- [ ] `npm run build` in `frontend/` produces optimized `dist/` output
- [ ] Built assets served correctly by FastAPI SPA fallback route
- [ ] Full flow tested: home → auth → session → voice conversation → tool calls → session end → summary → downloads
- [ ] No console errors in production build
- [ ] All commits on `guardian` branch with conventional commit messages
- [ ] Final push to remote `guardian` branch

---

## Non-Functional Requirements

### Performance
- WebSocket latency < 200ms for audio round-trip
- Session state updates delivered to frontend within 100ms of tool call completion
- Summary page loads within 1 second
- RCA/transcript download responds within 500ms

### Accessibility
- All interactive elements keyboard-navigable
- Color-coded statuses have text/icon alternatives (not color-only)
- Minimum contrast ratio 4.5:1 for text

### Responsive Design
- Desktop (≥1024px): side-by-side transcript + right panel layout
- Tablet (768px–1023px): stacked layout with collapsible right panel
- Mobile (<768px): single-column with tab navigation

### Security
- Session tokens are UUIDs, expire after 5 minutes
- No PII stored beyond session lifetime
- WebSocket connections validated by token

---

## Out of Scope

- Credit economy / credit tracking (explicitly excluded)
- Persistent database (in-memory only for hackathon)
- Real ITSM integration (ServiceNow, Jira) — mock only
- Microsoft Teams / Slack integration
- Multi-user concurrent sessions on same token
- User authentication / accounts
- SAP GUI direct integration
- Auto-screenshot capture from SAP
- Admin dashboard
- Session replay
