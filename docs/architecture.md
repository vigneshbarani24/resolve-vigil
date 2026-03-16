# Vigil — Multi-Agent Architecture

> Voice-First IT Support + Real-Time Scam Shield
> Updated: 2026-03-16

---

## 1. System Overview

Vigil is a voice-first AI platform with two missions: (1) Theepa, an IT helpdesk agent that diagnoses issues through natural conversation, and (2) Vigil Shield, a Chrome extension that detects scams, phishing, and fake content in real time.

The system uses 4 ADK agents, 16 tools, bidirectional voice streaming via Gemini Live API, and a Chrome extension for browser-level protection and UI navigation.

---

## 2. Four-Agent Graph

```
                    ┌─────────────────────────┐
                    │      theepa (root)       │
                    │  gemini-live-2.5-flash-  │
                    │    native-audio          │
                    │  8 IT helpdesk tools     │
                    └────┬──────┬─────────┬────┘
                         │      │         │
              ┌──────────┘      │         └──────────┐
              ▼                 ▼                     ▼
   ┌──────────────────┐ ┌─────────────┐  ┌───────────────────┐
   │  vigil (sub)     │ │ researcher  │  │  threat_intel     │
   │  gemini-2.5-     │ │ (sub)       │  │  (sub)            │
   │  flash           │ │ gemini-2.5- │  │  gemini-2.5-flash │
   │  7 shield tools  │ │ flash       │  │  google_search    │
   └──────────────────┘ │google_search│  └───────────────────┘
                        └─────────────┘
```

**Agent responsibilities:**

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| `theepa` (root) | `gemini-live-2.5-flash-native-audio` | 8 IT tools | Voice IT helpdesk agent — diagnoses issues, creates tickets, navigates browser |
| `vigil` (sub) | `gemini-2.5-flash` | 7 shield tools | Scam/phishing detection — URL scanning, DOM analysis, fake content detection |
| `researcher` (sub) | `gemini-2.5-flash` | `google_search` | IT topic research with search grounding (anti-hallucination) |
| `threat_intel` (sub) | `gemini-2.5-flash` | `google_search` | Scam/threat fact-checking via web search verification |

**ADK constraint**: `google_search` cannot coexist with other tools in one agent, hence the dedicated `researcher` and `threat_intel` sub-agents.

---

## 3. Tool Pipeline

### IT Helpdesk Tools (8)

| # | Tool | Data Source | Purpose |
|---|------|-------------|---------|
| 1 | `search_knowledge_base` | Local JSON KB | Search 20+ IT helpdesk articles |
| 2 | `lookup_error_code` | Reference JSON | Look up error codes (AUTH, FORM, PAY, DOC, TECH, VISA, ID) |
| 3 | `lookup_portal_page` | Reference JSON | Portal navigation + known issues per page |
| 4 | `diagnose_issue` | Cross-reference engine | Cross-reference KB + errors + pages for diagnosis |
| 5 | `create_issue` | Issue tracker (in-memory) | Log issue with severity + category inference + dedup |
| 6 | `create_itsm_ticket` | ITSM system (in-memory) | Create full ITSM ticket with diagnostic report |
| 7 | `update_itsm_ticket` | ITSM system | Update ticket status + resolution notes |
| 8 | `navigate_user_browser` | Chrome extension | Send DOM actions to user's browser via extension |

### Vigil Shield Tools (7)

| # | Tool | Layer | Purpose |
|---|------|-------|---------|
| 1 | `scan_url_safety` | Web Risk API | Check URL against Google's known threat database |
| 2 | `check_domain_reputation` | Domain analysis | Evaluate domain age, registrar, SSL, and reputation signals |
| 3 | `analyze_page_for_threats` | Gemini Vision | Screenshot + DOM analysis for visual scam indicators |
| 4 | `verify_domain_legitimacy` | Search grounding | Cross-reference domain against known scam reports |
| 5 | `detect_fake_content` | Gemini Vision | Identify AI-generated fake reviews, logos, testimonials |
| 6 | `report_threat` | Threat logging | Log confirmed threats with evidence and severity |
| 7 | `highlight_danger_zones` | Chrome extension | Annotate dangerous DOM elements with visual warnings |

### Google Search Grounding (1)

| # | Tool | Agent | Purpose |
|---|------|-------|---------|
| 1 | `google_search` | researcher / threat_intel | Web search for IT topics and threat verification |

---

## 4. Data Flow

```
User speaks into mic
    │
    ▼
Browser (Web Audio API) ──PCM 16kHz──▶ WebSocket /ws
    │                                       │
    ▼                                       ▼
Frontend SPA                         FastAPI WebSocket Handler
(Vite + Web Components)                     │
    ▲                                       ▼
    │                              Gemini Live API session
    │                              (bidirectional audio + tool calls)
    │                                       │
    │                              ┌────────┴────────┐
    │                              │  Tool dispatch   │
    │                              │  (registry.py)   │
    │                              └────────┬────────┘
    │                                       │
    │                              Tools execute + return
    │                                       │
    │                                       ▼
    └──────── audio + JSON events ◀── Response streamed back
```

---

## 5. WebSocket Protocol (`/ws`)

**Client-to-server messages:**

| Type | Payload | Description |
|------|---------|-------------|
| `audio` | Base64 PCM bytes | Microphone audio at 16kHz mono |
| `image` | Base64 JPEG | Screen capture for vision analysis |
| `config` | JSON | Session configuration (language, mode) |
| `end` | — | End session gracefully |

**Server-to-client messages:**

| Type | Payload | Description |
|------|---------|-------------|
| `audio` | Base64 PCM bytes | Agent voice response |
| `transcript` | `{role, text}` | Real-time transcript (user + agent) |
| `tool_call` | `{name, args, result}` | Tool invocation notification |
| `state` | `{stage, details}` | Session state machine update |
| `shield_alert` | `{threat_level, details}` | Vigil threat detection alert |
| `error` | `{message}` | Error notification |

---

## 6. REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Serve frontend SPA |
| `GET` | `/health` | Health check |
| `POST` | `/api/shield/scan` | Chrome extension: submit URL for shield scan |
| `GET` | `/api/shield/status/{scan_id}` | Poll scan result |
| `POST` | `/api/issue` | Create issue via REST |
| `GET` | `/api/session/{token}/transcript` | Download session transcript |
| `GET` | `/api/session/{token}/report` | Download diagnostic report |

---

## 7. Chrome Extension Integration

The Chrome extension (Manifest V3) operates in two modes:

**Shield Mode (passive):** Background service worker auto-scans every page load. Calls `POST /api/shield/scan` with URL + DOM snapshot + screenshot. Receives threat assessment and annotates dangerous elements via `content.js`.

**Voice Navigation Mode (active):** Theepa's `navigate_user_browser` tool sends DOM action commands to the extension. The content script executes clicks, highlights, scrolls, and form fills on the user's behalf.

```
Extension ──REST──▶ FastAPI /api/shield/scan
    │                        │
    │                   Vigil agent
    │                   (7 shield tools)
    │                        │
    ◀── threat result ───────┘
    │
    ▼
content.js annotates page (red borders, warning overlays)
```

---

## 8. Session State Machine

```
GREETING ──▶ GATHERING ──▶ DIAGNOSING ──▶ RESOLUTION
    │             │              │              │
    │        user describes   tools run     ticket created
    │        the problem      diagnostics   + guidance given
    │             │              │              │
    └─────── can loop back at any stage ───────┘
```

Each stage updates `session_state.py` which tracks: current stage, detected issues, tool call history, diagnostic findings, and ITSM ticket references.

---

## 9. Deployment Architecture

```
┌──────────────────────────────────────┐
│          Google Cloud Run            │
│  ┌────────────────────────────────┐  │
│  │  FastAPI + Uvicorn             │  │
│  │  (Dockerfile, 1 container)    │  │
│  │  - WebSocket /ws              │  │
│  │  - REST /api/*                │  │
│  │  - Static frontend files      │  │
│  └──────────┬─────────────────────┘  │
└─────────────┼────────────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
Vertex AI           Vertex AI
Gemini Live         Gemini Flash
(voice+vision)      (ADK/Vision/Search)
```

**Infrastructure (Terraform):**
- Cloud Run service (auto-scaling, HTTPS)
- Artifact Registry (container images)
- IAM bindings (Vertex AI access)
- Environment variables via Secret Manager
