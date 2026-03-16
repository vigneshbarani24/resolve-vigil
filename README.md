# Vigil

### AI-Powered IT Helpdesk, Scam Shield & Smart Browser Assistant

> One platform. **Theepa** talks you through IT issues by voice. **Vigil Shield** protects you from scams in real time. **Assist mode** guides you through any page — just type what you need.

---

## Try It Live

| Surface | URL |
|---------|-----|
| **Web App** | [resolve-743776360861.us-central1.run.app](https://resolve-743776360861.us-central1.run.app) |
| **Chrome Extension** | Load `extension/` folder in `chrome://extensions` (Developer Mode) |

> **Note**: Voice sessions require microphone access. Shield scans take ~3-5 seconds per page. Best experienced on desktop Chrome.

---

## High-Level System Overview

Vigil is a **unified AI platform** built on Google Cloud:

- **Theepa** (Virtual Internal Assistant) — A voice-first IT support agent that conducts structured diagnostic interviews, runs 9 backend tools in parallel, sees the user's screen, and speaks 20 languages via **Gemini Live API**
- **Vigil Shield** (Scam Protection) — A Chrome extension that auto-scans every page for phishing, scams, and fraud using a **4-layer detection pipeline**: OSINT Domain Analysis, Google Web Risk API, Gemini Vision, and Google Search Grounding
- **Assist Mode** (Text-Based Browser Guidance) — Users type what they need help with, and Gemini Vision analyzes the page to highlight elements, annotate steps, and auto-execute actions

All three modes run on a single **FastAPI backend** deployed to **Google Cloud Run**, with optional **Google ADK** multi-agent orchestration.

<!-- Architecture diagram -->
![Architecture](Resolve-Architecture.png)

---

## Cloud Deployment

| Component | Technology | Deployment |
|-----------|-----------|-----------|
| **Web Frontend** | Vite + Web Components + Web Audio API | Cloud Run (static) |
| **Backend API** | FastAPI + WebSocket + ADK | Cloud Run |
| **Voice Model** | `gemini-live-2.5-flash-native-audio` | Vertex AI |
| **Vision/Search** | `gemini-2.5-flash` | Vertex AI |
| **Threat DB** | Google Web Risk API | GCP |
| **Search Grounding** | Gemini Flash + Google Search | Vertex AI |
| **Chrome Extension** | Manifest V3 | Self-hosted |
| **IaC** | Terraform | Cloud Run + IAM + Artifact Registry |

---

## How Our Multi-Agent System Works

### Google ADK Integration

Vigil uses the **Google Agent Development Kit (ADK)** for multi-agent orchestration:

1. **Agent Definitions**: `LlmAgent` with `FunctionTool` wrappers — type hints + docstrings auto-generate tool declarations
2. **Sub-Agent Pattern**: `google_search` is isolated in a dedicated Researcher sub-agent (ADK constraint: cannot mix with other tools)
3. **Async Runner**: `runner.run_async()` with `InMemorySessionService` for session management
4. **Dual Mode**: ADK text chat (`/api/adk/chat`) + raw Gemini Live API voice streaming (`/ws`)

---

### Stage 1: Voice Conversation (Theepa — Live Agent)

**Model**: `gemini-live-2.5-flash-native-audio` via Vertex AI

The user speaks naturally to Theepa. She listens, transcribes, understands intent, and responds with natural voice — all in real time via bidirectional WebSocket streaming.

- **Interruptible**: User can cut in mid-sentence
- **20 Languages**: Speak Tamil, get tickets in English
- **Persona**: Professional, warm, SLA-obsessed IT specialist
- **Web Audio**: Capture/playback via AudioWorklet processors (no latency)

<!-- Demo GIF: Voice conversation -->
<!-- ![Voice Demo](Resolve-Voice-Demo.gif) -->

---

### Stage 2: Structured Diagnostic Protocol (9 Tools)

**Model**: `gemini-2.5-flash` (tool execution) + `gemini-live-2.5-flash-native-audio` (voice)

When Theepa identifies an IT issue, she follows a **4-stage diagnostic pipeline**:

```
IDENTIFY → DIAGNOSE → RESOLVE → VERIFY
```

Each stage fires multiple tools **in parallel**:

| # | Tool | What It Does |
|---|------|-------------|
| 1 | `search_knowledge_base` | Searches 20-article IT helpdesk KB with keyword scoring |
| 2 | `lookup_error_code` | Resolves error codes across 7 categories (AUTH, FORM, PAY, DOC, TECH, VISA, ID) |
| 3 | `lookup_portal_page` | Looks up portal page details, navigation paths, known issues |
| 4 | `diagnose_issue` | Cross-references KB + error codes + portal pages for root cause |
| 5 | `create_issue` | Logs issues with severity categorization + deduplication |
| 6 | `create_itsm_ticket` | Creates full ITSM tickets with diagnostic report attached |
| 7 | `update_itsm_ticket` | Updates ticket status, resolution notes, escalation path |
| 8 | `research_support_topic` | Google Search grounding via Gemini Flash (anti-hallucination) |
| 9 | `navigate_user_browser` | Sends visual guidance actions to Chrome extension |

The **Researcher sub-agent** (isolated `google_search`) handles real-time web research when the internal KB doesn't have the answer.

<!-- Demo GIF: Tool execution -->
<!-- ![Tools Demo](Resolve-Tools-Demo.gif) -->

---

### Stage 3: UI Navigator (Chrome Extension)

**Model**: `gemini-2.5-flash` (vision analysis)

The Chrome extension operates in two modes:

#### Voice Mode (via Theepa)
When Theepa says "click the Submit button," the extension:
1. **Captures** all interactive DOM elements with bounding rectangles
2. **Screenshots** the visible tab via `chrome.tabs.captureVisibleTab`
3. **Sends** screenshot + DOM to Gemini Vision for analysis
4. **Renders** visual annotations: pulsing highlight boxes, step badges, directional labels
5. **Executes** actions on behalf of the user: click, fill form fields, scroll to element

#### Assist Mode (text-based)
Users type what they need help with directly in the extension — no voice required:
- "Where is the submit button?"
- "Help me fill this form"
- "How do I change my password on this page?"

Gemini Vision analyzes the page screenshot + DOM and returns annotated actions. The extension highlights target elements with pulsing overlays, step numbers, and labels. Users can review each step individually or hit **auto-execute** to run all actions with one click.

This is real UI navigation — not just screenshot analysis, but actual interaction with the page.

<!-- Demo GIF: UI Navigator -->
<!-- ![Navigator Demo](Resolve-Navigator-Demo.gif) -->

---

### Stage 4: Vigil Shield (Chrome Extension — Shield Mode)

**4-Layer Detection Pipeline** — scans every page automatically:

| Layer | Technology | Speed | What It Checks |
|-------|-----------|-------|---------------|
| **0. OSINT** | Domain heuristics (no API) | <1ms | TLD reputation, typosquatting, brand impersonation, subdomain depth, domain authority score |
| **1. Web Risk** | Google Web Risk API | ~100ms | Known phishing, malware, unwanted software (Google's threat database) |
| **2. Vision** | Gemini 2.5 Flash | ~3s | Screenshot + DOM analysis: visual cloning, phishing forms, scam indicators, AI-generated content, fake urgency |
| **3. Search** | Gemini Flash + Google Search | ~2s | Cross-references domain against scam reports on the web (only triggers if Layer 2 flags suspicious) |

**Key behaviors**:
- **Auto-scan**: Every page navigation triggers a background scan — no user action needed
- **Smart escalation**: Layer 3 only fires when Layer 2 finds something suspicious (saves API calls)
- **Smart de-escalation**: If Google Search confirms a site is legitimate, the threat level is lowered
- **Domain authority score**: OSINT layer produces a 0-100 trust score with specific flags
- **Per-tab caching**: Results persist per tab so reopening the popup shows previous scan
- **Live status bar**: Shows current tab, URL, last scan time, verdict, server connection

<!-- Demo GIF: Vigil Shield -->
<!-- ![Shield Demo](Resolve-Shield-Demo.gif) -->

---

## Activity Feed & Backend Observability

The backend exposes a **live activity feed** at `/api/activity` — every shield scan, voice session, tool call, and ADK query is logged with timestamps and emoji-tagged categories:

```
🛡️ [SHIELD] Scan complete → SAFE — URL: google.com | Layers: osint, web_risk, vision, search
🔧 [TOOL] Tool: tool_call — search_knowledge_base
🎙️ [VOICE] Session started — Token: abc12345..., Model: gemini-live-2.5-flash-native-audio
🤖 [ADK] Chat complete → 3 tools used — Tools: search_knowledge_base, lookup_error_code, diagnose_issue
```

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Server health + ADK status |
| `GET /api/status` | Model, tools, features, project info |
| `GET /api/activity` | Live activity feed with system stats |
| `GET /api/tickets` | All ITSM tickets created |
| `POST /api/adk/chat` | ADK text chat (Theepa + Researcher) |
| `POST /api/shield` | Vigil Shield scan |
| `POST /api/navigate` | UI Navigator analysis |

---

## Quick Start

### Prerequisites

- Python 3.11+, Node.js 18+
- Google Cloud project with Vertex AI API enabled
- `gcloud` CLI authenticated (`gcloud auth application-default login`)

### 1. Install & Run

```bash
git clone https://github.com/vigneshbarani24/Gemini-AI-Agents.git
cd Gemini-AI-Agents

# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Configure
cp .env.example .env
# Edit .env: set PROJECT_ID=your-gcp-project-id

# Run
python -m uvicorn server.main:app --host 0.0.0.0 --port 8080
```

### 2. Install Chrome Extension

1. Open `chrome://extensions/` → Enable **Developer mode**
2. Click **Load unpacked** → select the `extension/` folder
3. Click the Vigil icon → enter server URL (`http://localhost:8080`) → **Connect**
4. Shield mode is ON by default — Vigil auto-scans every page

### 3. Deploy to Cloud Run

```bash
export PROJECT_ID=your-project-id
bash deploy.sh        # Standard deploy (FastAPI + Gemini Live)
bash deploy.sh --adk  # ADK deploy (multi-agent with google_search)
```

### 4. Terraform (IaC)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PROJECT_ID` | GCP project ID | (auto-detected) |
| `LOCATION` | GCP region | `us-central1` |
| `MODEL` | Gemini Live model | `gemini-live-2.5-flash-native-audio` |
| `ENABLE_ADK` | Enable ADK multi-agent | `true` |

---

## Project Structure

```
resolve-submission/
├── resolve/                         # ADK package (adk web / adk deploy)
│   ├── agent.py                     # root_agent: Theepa + Researcher sub-agent
│   └── __init__.py
├── server/
│   ├── main.py                      # FastAPI + WebSocket + REST + Activity Feed
│   ├── gemini_live.py               # Gemini Live API bidirectional streaming
│   ├── adk_agent.py                 # ADK multi-agent definition
│   ├── prompts.py                   # Theepa persona (240+ lines)
│   ├── session_state.py             # 4-stage diagnostic state machine
│   ├── tools/
│   │   ├── registry.py              # 9-tool registration
│   │   ├── kb_search.py             # Knowledge base search
│   │   ├── portal_lookup.py         # Error code + portal page lookup
│   │   ├── itsm.py                  # ITSM ticket CRUD
│   │   ├── issue_tracker.py         # Issue logging + category inference
│   │   ├── search_grounding.py      # Google Search grounding
│   │   ├── ui_navigator.py          # Gemini Vision page analysis
│   │   └── shield_analyzer.py       # Vigil 4-layer scam detection + OSINT
│   ├── agents/
│   │   └── diagnostic_expert.py     # Cross-reference diagnostic engine
│   └── data/
│       ├── helpdesk_knowledge_base.json  # 20 IT helpdesk articles
│       └── helpdesk_reference.json       # Error codes + portal paths
├── extension/                       # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js                # Service worker: auto-scan, REST, per-tab cache
│   ├── content.js                   # DOM capture, annotations, actions, shield banner
│   ├── popup.html/js/css            # Dual-mode UI (Shield + Assist) + Live Status
│   └── overlay.css                  # Page annotation styles
├── frontend/                        # Vite + Web Components SPA
│   ├── src/components/              # 8 Web Components
│   └── src/lib/gemini-live/         # Gemini Live client + AudioWorklets
├── terraform/                       # Cloud Run + Artifact Registry + IAM
├── Dockerfile
├── deploy.sh                        # One-command Cloud Run deployment
└── requirements.txt
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Voice AI** | Gemini Live API (`gemini-live-2.5-flash-native-audio`) via Vertex AI |
| **Vision AI** | Gemini Flash (`gemini-2.5-flash`) via Vertex AI |
| **Agent Framework** | Google ADK (`google-adk`) — multi-agent with FunctionTools |
| **AI SDK** | `google-genai` (Google GenAI SDK for Python) |
| **Search Grounding** | Gemini Flash + Google Search |
| **Threat Detection** | Google Web Risk API + OSINT Domain Analysis |
| **Backend** | Python 3.11 / FastAPI / WebSocket |
| **Frontend** | Vite / Web Components / Web Audio API |
| **Extension** | Chrome Manifest V3 |
| **Hosting** | Google Cloud Run |
| **IaC** | Terraform |

---

## Judging Criteria

| Criteria | How We Deliver |
|----------|---------------|
| **Multimodal** | Voice (Gemini Live) + Vision (screenshots, screen share) + Text (chat, extension assist mode) |
| **Agentic** | 9 tools in parallel, 4-stage diagnostic protocol, autonomous escalation, ADK multi-agent |
| **Grounding** | Google Search in Theepa (support research) AND Vigil (domain verification) |
| **UI Navigator** | Chrome extension: DOM capture → Gemini Vision → highlight/click/fill on actual pages, plus text-based assist mode |
| **Cloud Native** | Vertex AI + Cloud Run + Terraform IaC + Docker |
| **Innovation** | 4-layer real-time scam detection with OSINT scoring — no other submission has this |
| **Multilingual** | 20 languages — voice + UI guidance + threat alerts |
| **Production-Ready** | Session management, SLA tracking, ITSM tickets, activity feed, per-tab scan cache |

---

## What Makes This Different

| Other Submissions | Vigil |
|-------------------|-------|
| Voice agent that answers questions | Voice agent with **4-stage diagnostic protocol** that creates tickets and escalates |
| Text-based tool calling | **9 tools firing in parallel** — KB + error lookup + web search simultaneously |
| English-only | **20 languages** — speak Tamil, get tickets in English |
| Screenshot analysis only | Chrome extension that **highlights, clicks, and fills forms** on the actual page |
| Single-purpose agent | **Tri-mode platform**: Shield (scam detection) + Assist (text-based guidance) + Voice (IT helpdesk) |
| No proactive protection | **Vigil auto-scans every page** — 4-layer pipeline alerts before you get phished |
| Manual deployment | **Terraform IaC + Cloud Run** — one command production deployment |
| No observability | **Live activity feed** with timestamped tool calls, scans, and sessions |

---

## What's Next

- **Safe shopping mode** — Vigil's 4-layer shield naturally extends to e-commerce protection: detecting fake storefronts, flagging too-good-to-be-true deals, verifying seller legitimacy via Search grounding, and spotting AI-generated fake product reviews. The UI Navigator can guide users through complex checkout flows, highlight hidden fees, and annotate confusing return policies. No new tools needed — just expanded prompts on the same architecture
- **Real WHOIS integration** for domain age checking (currently heuristic-only)
- **Persistent ITSM backend** (currently in-memory)
- **Multi-tab Shield dashboard** showing scan history across all tabs
- **Enterprise SSO** integration for real IT helpdesk deployment
- **Mobile companion app** with voice support

---

## Categories

- **Live Agents** — Theepa: voice-first IT support with Gemini Live API
- **UI Navigator** — Chrome Extension: DOM capture → Gemini Vision → page actions + text-based assist mode

---

## Built With

Gemini Live API, Gemini 2.5 Flash, Vertex AI, Google ADK, Google Web Risk API, Google Search Grounding, Google GenAI SDK, FastAPI, Python, WebSocket, Vite, Web Components, Web Audio API, Chrome Extension (Manifest V3), Google Cloud Run, Terraform, Docker

---

## Team

**KaarTech UK** (Solo) — Built for the Gemini Live Agent Challenge
