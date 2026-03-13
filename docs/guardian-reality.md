# Guardian — What Actually Exists (Reality Document)

> Internal only — KaarTech UK | Last updated: 2026-03-12

---

## What Guardian Is

A voice-first AI agent that acts as L1 SAP support. User calls in, speaks to "Jessica", she diagnoses using 8 tools, creates a ticket, attempts resolution, escalates if she can't fix it. 5-minute sessions.

---

## Stack (Actual)

| Layer | What's There | What's NOT There |
|---|---|---|
| **AI Model** | Google Gemini Live API (cloud) | No self-hosted model. No on-premise. No fine-tuning. |
| **Voice** | Gemini native voice (bidirectional streaming) | No custom TTS. No custom STT. Built into the model. |
| **Backend** | Python FastAPI + WebSocket | No microservices. No message queue. Single process. |
| **Frontend** | Vanilla JS SPA (Vite build) | No React/Vue/Angular. No framework. |
| **Knowledge Base** | Static JSON file, keyword matching | No RAG. No vectors. No embeddings. No Vertex AI Search. |
| **Error/T-Code DB** | Static JSON file with ~50 entries | No real SAP connection. Hardcoded reference data. |
| **ITSM** | In-memory Python dict | No ServiceNow. No Jira. No SAP SolMan. Mock only. |
| **Storage** | Nothing persists | No database. No file storage. Container restart = data gone. |
| **Deployment** | Cloud Run (single container) | No Kubernetes. No Terraform. No CI/CD pipeline. |
| **Auth** | UUID session token (no real auth) | No OAuth. No SSO. No IAM. Token is just a random string. |
| **MCP** | Does not exist | No Model Context Protocol. Tools are plain Python functions. |
| **Data Pipeline** | Does not exist | No ticket→KB feedback. No ETL. No streaming. |
| **Monitoring** | Cloud Run logs only | No Datadog. No custom metrics. No alerting. |
| **Testing** | Manual testing only | No unit tests. No integration tests. No CI. |

---

## The 8 Tools (Actual Implementation)

| Tool | What It Actually Does |
|---|---|
| `search_knowledge_base` | Keyword search against `sap_knowledge_base.json` (~20 articles). Counts word overlap. Returns top 3. |
| `lookup_sap_error` | Dict lookup in `sap_reference.json`. If error code exists, return it. If not, "not found". |
| `lookup_transaction_code` | Same dict lookup. ~30 T-codes hardcoded. |
| `diagnose_sap_issue` | Calls KB search + error lookup + T-code lookup together, merges results. No actual reasoning. |
| `create_issue` | Appends to an in-memory list. Generates UUID. That's it. |
| `create_itsm_ticket` | Appends to an in-memory dict. Generates `INC` + UUID. One per session (guard). |
| `update_itsm_ticket` | Updates the in-memory dict entry. Status/resolution/notes fields. |
| `research_sap_topic` | Gemini Flash call with Google Search grounding. This one actually hits the internet. |

---

## Data Flow (Actual)

```
User speaks
  → Browser captures PCM16 @16kHz via AudioWorklet
  → Binary frames sent over WebSocket to FastAPI
  → FastAPI proxies audio to Gemini Live API (Google Cloud)
  → Gemini processes, decides to call tools or respond
  → Tool calls: FastAPI executes Python function, returns result to Gemini
  → Gemini generates audio response
  → Binary audio streamed back over WebSocket to browser
  → Browser plays audio via AudioPlayer (Web Audio API)

Screenshots:
  → Browser encodes to base64
  → Sent as realtime_input over WebSocket
  → Gemini sees the image in its context window

Text chat:
  → Sent as client_content over WebSocket
  → Gemini processes as text turn

Transcription:
  → Gemini returns input_transcription and output_transcription
  → Server saves to session state (in-memory)
  → Client shows in transcript panel
```

---

## What the Client Does (Browser-Only, No Server)

| Feature | How |
|---|---|
| Sentiment detection | Regex pattern matching on transcript text. "angry" → frustrated, "don't understand" → confused. |
| Entity extraction | Regex for T-codes (`VA\d{2}`), error codes (`[A-Z]{2}\d{3,5}`), user names (`I'm X`), modules (`SAP SD`). |
| Live summary | Appends bullet points when tools fire or info is detected. String concatenation. |
| CSAT rating | CSS overlay with 5 clickable stars. Logged to console. Not sent anywhere. |
| Info cards | DOM updates when regex matches. User, Module, T-Code, Error fields. |

---

## Session Lifecycle (Actual)

```
1. User clicks Start → POST /api/auth → get UUID token
2. WebSocket opens to /ws?token=UUID
3. Server creates GeminiLive session with system prompt + 8 tool declarations
4. Gemini sends setupComplete
5. Audio streams bidirectionally for up to 5 minutes (hard timeout)
6. Tool calls handled server-side, results returned to Gemini
7. On session end: WebSocket closes
8. Client shows CSAT overlay → navigates to summary view
9. Summary view fetches /api/session/{token}/summary (in-memory data)
10. Container restart → all session data lost
```

---

## Files That Matter

```
server/
  main.py              — FastAPI app, WebSocket handler, 5-min timeout, routes
  gemini_live.py       — GeminiLive class, proxies audio/tools to Gemini API
  prompts.py           — Jessica's system prompt (250 lines), language config
  session_state.py     — In-memory session: tickets, transcript, checkpoints
  config_utils.py      — GCP project ID detection
  tools/
    kb_search.py       — Keyword search against JSON file
    sap_lookup.py      — Dict lookup for errors + T-codes
    itsm.py            — In-memory ticket create/update
    issue_tracker.py   — In-memory issue logging
    search_grounding.py — Gemini Flash + Google Search (real web search)
    registry.py        — Maps tool names to functions
  agents/
    sap_expert.py      — diagnose_sap_issue (combines other tools)
  data/
    sap_knowledge_base.json  — ~20 KB articles
    sap_reference.json       — ~50 error codes + ~30 T-codes

frontend/
  src/
    components/
      view-session.js  — The entire session UI (~1700 lines, one file)
      view-home.js     — Landing page
      view-summary.js  — Post-session summary
    lib/
      gemini-live/
        geminilive.js  — WebSocket client, setup messages, tool handling
        mediaUtils.js  — AudioStreamer, AudioPlayer, ScreenCapture
```

---

## What Would Need to Change for Production

| Gap | What's Needed | Effort |
|---|---|---|
| No persistence | PostgreSQL or Firestore for tickets, transcripts, CSAT | 2-3 days |
| No RAG | Vertex AI Search or pgvector + embedding pipeline | 1-2 weeks |
| No real ITSM | ServiceNow REST API integration (or MCP server) | 1 week |
| No auth | Google Identity Platform or Auth0 | 2-3 days |
| No SAP connection | RFC/BAPI via SAP Cloud Connector (read-only) | 2-3 weeks |
| No monitoring | Cloud Monitoring + custom metrics + alerting | 2-3 days |
| No tests | pytest + Playwright e2e | 1 week |
| No CI/CD | Cloud Build trigger on push | 1 day |
| No on-premise | Vertex AI on GKE + private endpoints | 2-4 weeks |
| KB too small | Need 500+ articles from real AMS ticket history | Ongoing |
| Mock data | Replace all JSON with real API backends | 2-3 weeks |

---

## What's Actually Impressive (Despite the Above)

- Real-time voice conversation with an AI that autonomously calls tools mid-conversation
- Sub-second voice latency with full-duplex streaming
- Multimodal: voice + screenshots + text in one session
- 8 tools orchestrated by the model autonomously (not scripted)
- Live sentiment + entity extraction + summary in the browser
- 20-language support with one config change
- Deployed and running on Cloud Run in production
- Complete session workflow: triage → diagnose → resolve/escalate → ticket → CSAT → summary
- Built solo in a hackathon timeframe
