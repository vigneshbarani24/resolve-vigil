# Resolve + Vigil — AI IT Helpdesk & Scam Protection Platform

> **Two AI agents. One platform. Theepa talks you through IT issues. Vigil shields you from scams.**

Resolve is not another chatbot. It's a **voice-first AI control tower** with a **Chrome extension** that does two things no other submission does:

1. **Theepa** (Live Agent) — Speaks 20 languages, sees your screen, runs 9 backend tools in parallel, and resolves IT issues in real time via Gemini Live API
2. **Vigil** (Shield Mode) — Auto-scans every page you visit for scams, phishing, fake sites, AI-generated fraud, and spam — powered by Gemini Vision + Google Search grounding

**Categories**: Live Agents + UI Navigator | **Hackathon**: Gemini Live Agent Challenge

---

## What Makes This Different

| Everyone Else | Resolve + Vigil |
|--------------|-----------------|
| Voice agent that answers questions | Voice agent that **drives diagnostic protocol**, creates tickets, escalates with full reports |
| Text-based tool calling | **9 tools firing in parallel** — KB search + error lookup + web search simultaneously |
| English-only demo | **20 languages** — speak Tamil, get tickets in English |
| Screenshot analysis | **Chrome extension that highlights, clicks, and fills forms** on the actual page |
| Single-purpose agent | **Two-mode platform**: Shield (scam detection) + Assist (IT navigation) |
| No proactive protection | **Vigil auto-scans every page** — alerts before you get phished |
| Mock deployment | **Terraform IaC + Cloud Run** — one command production deployment |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Google Cloud project with Vertex AI API enabled
- `gcloud` CLI authenticated (`gcloud auth application-default login`)

### 1. Clone & Install

```bash
git clone https://github.com/vigneshbarani24/Gemini-AI-Agents.git
cd Gemini-AI-Agents

# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your GCP project ID
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PROJECT_ID` | Your GCP project ID | (auto-detected) |
| `LOCATION` | GCP region | `us-central1` |
| `MODEL` | Gemini Live model | `gemini-live-2.5-flash-native-audio` |
| `SESSION_TIME_LIMIT` | Max session seconds | `300` |
| `ENABLE_ADK` | Enable ADK multi-agent | `false` |

### 3. Run

```bash
python -m uvicorn server.main:app --host 0.0.0.0 --port 8080
# Open http://localhost:8080
```

### 4. Install Chrome Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder
4. Click the Resolve icon → enter server URL → Connect
5. **Shield mode is ON by default** — Vigil auto-scans every page

---

## Architecture

```
                          ┌─────────────────────────────────────┐
                          │         Google Cloud (Vertex AI)     │
                          │                                     │
                          │  ┌─────────────────────────────┐    │
                          │  │  Gemini Live API             │    │
                          │  │  (2.5-flash-native-audio)    │    │
                          │  │  Voice + Vision + Tools      │    │
                          │  └──────────┬──────────────────┘    │
                          │             │                       │
                          │  ┌──────────▼──────────────────┐    │
                          │  │  FastAPI (Cloud Run)         │    │
┌──────────────────┐      │  │  ├── WebSocket (voice/video) │    │
│  Browser (SPA)   │◄─ws──│──│  ├── POST /api/navigate     │    │
│  Web Audio API   │      │  │  ├── POST /api/shield        │──┐ │
│  Screen Capture  │      │  │  └── Tool Registry (9 tools) │  │ │
│  Diagnostic UX   │      │  └─────────────────────────────┘  │ │
└──────────────────┘      │                                    │ │
                          │  ┌─────────────────────────────┐   │ │
┌──────────────────┐      │  │  Gemini 2.5 Flash           │   │ │
│  Chrome Extension│──REST│──│  ├── Vision (Shield/Navigate)│◄──┘ │
│  ├── Vigil Shield│      │  │  └── Google Search Grounding │    │
│  ├── UI Navigator│      │  └─────────────────────────────┘    │
│  └── DOM Actions │      │                                     │
└──────────────────┘      │  ┌─────────────────────────────┐    │
                          │  │  ADK Multi-Agent (optional)  │    │
                          │  │  ├── Theepa (9 FunctionTools)│    │
                          │  │  └── Researcher (google_search)   │
                          │  └─────────────────────────────┘    │
                          └─────────────────────────────────────┘
```

---

## Features

### Theepa — Live Voice Agent (9 Tools)

| # | Tool | Purpose |
|---|------|---------|
| 1 | `search_knowledge_base` | Search 20-article IT helpdesk KB |
| 2 | `lookup_error_code` | Portal error codes (AUTH, FORM, PAY, DOC, TECH, VISA, ID) |
| 3 | `lookup_portal_page` | Portal navigation paths and page details |
| 4 | `diagnose_issue` | Cross-reference KB + errors + pages for complex diagnosis |
| 5 | `create_issue` | Log problems with severity and category |
| 6 | `create_itsm_ticket` | Full ITSM ticket with diagnostic report |
| 7 | `update_itsm_ticket` | Update ticket status, resolution, escalation |
| 8 | `research_support_topic` | Google Search grounding — latest solutions from the web |
| 9 | `navigate_user_browser` | Trigger visual guidance on user's screen via extension |

**Diagnostic Pipeline**: Initiation → Diagnosis → Troubleshoot → Resolution (visual progress tracking)

### Vigil — Scam & Phishing Shield

| Detection | How It Works |
|-----------|-------------|
| **Domain Impersonation** | Gemini Vision compares page branding vs URL domain |
| **Phishing Forms** | DOM analysis of form targets, credential fields, suspicious actions |
| **Scam Indicators** | Fake urgency, too-good-to-be-true offers, fake trust badges |
| **AI-Generated Content** | Detects deepfakes, AI text patterns, fake reviews |
| **Transaction Risk** | Suspicious payment pages, non-HTTPS on sensitive forms |
| **Live Verification** | Google Search grounding cross-references domain against known scam reports |
| **Spam Detection** | Redirect chains, fake downloads, misleading ad placement |

**Auto-scan**: Every page navigation triggers a background scan. No user action needed.

### UI Navigator — Chrome Extension

| Capability | Description |
|-----------|-------------|
| **DOM Capture** | Extracts all interactive elements with bounding rects |
| **Visual Annotations** | Highlight boxes with step badges, labels, pulse animations |
| **Action Execution** | Click buttons, fill forms, scroll — on behalf of the user |
| **Screen Sharing** | Periodic frame capture sent to backend for analysis |
| **20 Languages** | All guidance rendered in the user's chosen language |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Model (Voice)** | Gemini Live `gemini-live-2.5-flash-native-audio` via Vertex AI |
| **AI Model (Vision)** | Gemini Flash `gemini-2.5-flash` via Vertex AI |
| **AI Framework** | Google ADK (`google-adk`) — multi-agent with FunctionTools |
| **AI SDK** | `google-genai` (Google GenAI SDK for Python) |
| **Search Grounding** | Gemini Flash + Google Search (anti-hallucination + domain verification) |
| **Backend** | Python 3.11 / FastAPI / WebSocket (bidirectional streaming) |
| **Frontend** | Vanilla JS / Vite / Web Audio API / Web Components |
| **Extension** | Chrome Manifest V3 / Content Script / Background Worker |
| **Hosting** | Google Cloud Run |
| **IaC** | Terraform (Cloud Run + Artifact Registry + IAM) |

---

## Deployment

### Cloud Run (one command)

```bash
export PROJECT_ID=your-project-id
bash deploy.sh
```

### Docker

```bash
cd frontend && npm run build && cd ..
docker build -t resolve .
docker run -p 8080:8080 \
  -e PROJECT_ID=your-project-id \
  -e LOCATION=us-central1 \
  resolve
```

### Terraform (automated IaC — bonus)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init && terraform apply
```

### ADK Mode (optional)

```bash
# Enable ADK multi-agent orchestration
export ENABLE_ADK=true
python -m uvicorn server.main:app --host 0.0.0.0 --port 8080
```

---

## Project Structure

```
├── server/
│   ├── main.py                     # FastAPI + WebSocket + REST endpoints
│   ├── gemini_live.py              # Gemini Live API wrapper (turn gating)
│   ├── adk_agent.py                # ADK multi-agent (Theepa + Researcher)
│   ├── prompts.py                  # Theepa persona (240+ lines)
│   ├── session_state.py            # 4-stage diagnostic state machine
│   ├── config_utils.py             # GCP config helpers
│   ├── tools/
│   │   ├── registry.py             # Pluggable tool registration (9 tools)
│   │   ├── kb_search.py            # Knowledge base search
│   │   ├── portal_lookup.py        # Error code + portal page lookup
│   │   ├── itsm.py                 # ITSM ticket CRUD
│   │   ├── issue_tracker.py        # Issue logging + category inference
│   │   ├── search_grounding.py     # Google Search grounding
│   │   ├── ui_navigator.py         # Gemini Vision page analysis
│   │   └── shield_analyzer.py      # Vigil scam/phishing detection
│   ├── agents/
│   │   └── diagnostic_expert.py    # Cross-reference diagnostic engine
│   └── data/
│       ├── helpdesk_knowledge_base.json  # 20 IT helpdesk articles
│       └── helpdesk_reference.json       # Error codes + portal paths
├── extension/
│   ├── manifest.json               # Chrome Manifest V3
│   ├── background.js               # Service worker (screenshots, REST, auto-scan)
│   ├── content.js                  # DOM capture, annotations, actions, shield banner
│   ├── popup.html/js/css           # Two-mode UI (Vigil + Assist)
│   ├── overlay.css                 # Page annotation styles
│   └── config.js                   # Modular branding config
├── frontend/
│   ├── src/
│   │   ├── components/             # Web Components
│   │   └── lib/gemini-live/        # Gemini Live client + audio worklets
│   └── vite.config.js
├── terraform/                      # Cloud Run + Artifact Registry + IAM
├── Dockerfile
├── deploy.sh
├── requirements.txt
└── README.md
```

---

## Judging Criteria

| Criteria | How We Deliver |
|----------|---------------|
| **Multimodal** | Voice (Gemini Live) + Vision (screenshots, screen share) + Text (chat input) |
| **Agentic** | 9 tools firing in parallel, 4-stage diagnostic protocol, autonomous escalation |
| **Grounding** | Google Search grounding in both Theepa (support research) and Vigil (domain verification) |
| **UI Navigator** | Chrome extension: DOM capture → Gemini Vision → highlight/click/fill on actual pages |
| **Cloud** | Vertex AI + Cloud Run + Terraform IaC (automated deployment) |
| **Innovation** | Vigil Shield — no other submission has real-time scam detection with auto-scan |
| **20 Languages** | Full multilingual voice + all UI guidance + threat alerts in user's language |
| **Production-Ready** | Docker, Terraform, session management, SLA tracking, ITSM integration |

---

## Bonus Points

- **Automated Cloud Deployment**: `terraform/main.tf` + `deploy.sh` (IaC)
- **Content**: Blog post / demo video (link TBD)
- **GDG**: Profile link TBD

---

## License

Built for the Gemini Live Agent Challenge hackathon.
