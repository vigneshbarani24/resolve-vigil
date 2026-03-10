# Guardian — AI SAP Support Control Tower

> **Talk to Jessica, your AI SAP veteran. She sees your screen, hears your voice, and resolves issues in real time.**

Guardian is a voice-first AI agent that transforms SAP Application Management Services (AMS). Instead of logging tickets and waiting days, users speak directly to **Jessica** — a battle-hardened SAP support veteran powered by Gemini Live API. She asks the right questions, reads your screen, searches knowledge bases and the web, runs a full diagnostic pipeline, and either resolves the issue live or hands off a complete RCA package to L2 support.

**Category**: Live Agents | **Hackathon**: Gemini Live Agent Challenge

![Architecture](docs/architecture-simple.png)

---

## Features

| Feature | Description |
|---------|-------------|
| **Voice Conversation** | Natural speech with Jessica via Gemini Live API. Interrupt anytime. |
| **Screen Analysis** | Share your screen or paste screenshots — Jessica reads SAP errors directly from the UI |
| **8 Backend Tools** | KB search, SAP error/T-code lookup, diagnostics, issue tracking, ITSM tickets, Google Search grounding |
| **Google Search Grounding** | Anti-hallucination: researches OSS notes and patches from the web via Gemini Flash |
| **4-Stage Diagnostic Pipeline** | Visual progress: Initiation → Diagnosis → Troubleshoot → Resolution |
| **Live T-Code Overlay** | When Jessica says "Run SU53", a command card flashes with copy button |
| **Session Timer + SLA Clock** | Real-time timer with P1/P2/P3 SLA indicators |
| **Post-Session Summary** | RCA report + full transcript download after every session |
| **15 Languages** | Speak in your language — technical terms stay in English |
| **One-Ticket Discipline** | Every session ends with a complete ITSM ticket. No duplicates. |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Google Cloud project with Vertex AI API enabled
- `gcloud` CLI authenticated (`gcloud auth application-default login`)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_REPO/guardian.git
cd guardian

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

Required environment variables:
| Variable | Description | Default |
|----------|-------------|---------|
| `PROJECT_ID` | Your GCP project ID | (auto-detected) |
| `LOCATION` | GCP region | `us-central1` |
| `MODEL` | Gemini Live model | `gemini-live-2.5-flash-native-audio` |
| `SESSION_TIME_LIMIT` | Max session seconds | `300` |

### 3. Run

```bash
python -m uvicorn server.main:app --host 0.0.0.0 --port 8080
# Open http://localhost:8080
```

---

## Architecture

```
Browser (Vite SPA)                    Google Cloud
┌──────────────────┐         ┌──────────────────────────────────┐
│  Web Audio API   │◄──ws──► │  FastAPI (Cloud Run)             │
│  Screen Capture  │  bidi   │  ├── WebSocket Handler           │
│  Transcript UI   │  audio  │  ├── Session State Manager       │
│  Diagnostic UX   │  +json  │  └── Tool Registry (8 tools)     │
└──────────────────┘         │         │                        │
                             │         ▼                        │
                             │  Gemini Live API                 │
                             │  (gemini-live-2.5-flash-native-  │
                             │   audio) — Vertex AI             │
                             │         │                        │
                             │    ┌────┴────┐                   │
                             │    │ 8 Tools │                   │
                             │    ├─────────┤                   │
                             │    │ KB Search│ SAP Lookup       │
                             │    │ Diagnose │ ITSM Tickets     │
                             │    │ Issues   │ Google Search    │
                             │    └─────────┘                   │
                             └──────────────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for the full Mermaid diagram.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI Model** | Gemini Live (`gemini-live-2.5-flash-native-audio`) via Vertex AI |
| **AI SDK** | `google-genai` (Google GenAI SDK for Python) |
| **Search Grounding** | Gemini Flash (`gemini-2.5-flash`) + Google Search |
| **Backend** | Python 3.11 / FastAPI / WebSocket |
| **Frontend** | Vanilla JS / Vite / Web Audio API / Web Components |
| **Hosting** | Google Cloud Run |
| **IaC** | Terraform (Cloud Run + Artifact Registry + IAM) |

---

## Tools (8 Total)

| # | Tool | Purpose |
|---|------|---------|
| 1 | `search_knowledge_base` | Search local SAP KB for errors, known issues, resolutions |
| 2 | `lookup_sap_error` | Look up SAP error codes with root cause and fix steps |
| 3 | `lookup_transaction_code` | Get T-code details, module, and common use cases |
| 4 | `diagnose_sap_issue` | Cross-reference KB + errors + T-codes for complex diagnosis |
| 5 | `create_issue` | Log detected problems with severity and module |
| 6 | `create_itsm_ticket` | Create full ITSM ticket with diagnostic report |
| 7 | `update_itsm_ticket` | Update ticket status, resolution, or escalation notes |
| 8 | `research_sap_topic` | Google Search grounding for OSS notes, patches, latest solutions |

---

## Deployment

### Cloud Run (one command)

```bash
export PROJECT_ID=your-project-id
bash deploy.sh
```

### Docker (local)

```bash
cd frontend && npm run build && cd ..
docker build -t guardian .
docker run -p 8080:8080 \
  -e PROJECT_ID=your-project-id \
  -e LOCATION=us-central1 \
  guardian
```

### Terraform (IaC)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project ID
terraform init && terraform apply
```

---

## Project Structure

```
├── server/
│   ├── main.py                 # FastAPI + WebSocket entry point
│   ├── gemini_live.py          # Gemini Live API wrapper with turn gating
│   ├── prompts.py              # Jessica persona + diagnostic protocol
│   ├── session_state.py        # 4-stage diagnostic state machine
│   ├── config_utils.py         # GCP config helpers
│   ├── tools/
│   │   ├── registry.py         # Tool registration hub
│   │   ├── kb_search.py        # Knowledge base search
│   │   ├── sap_lookup.py       # Error + T-code lookup
│   │   ├── itsm.py             # ITSM ticket management
│   │   ├── issue_tracker.py    # Issue logging
│   │   └── search_grounding.py # Google Search grounding
│   ├── agents/
│   │   └── sap_expert.py       # Diagnostic cross-reference engine
│   └── data/
│       ├── sap_knowledge_base.json
│       └── sap_reference.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Web Components (session, transcript, etc.)
│   │   └── lib/gemini-live/    # Gemini Live client + media utilities
│   └── vite.config.js
├── terraform/                  # Infrastructure as Code
├── Dockerfile
├── deploy.sh
├── requirements.txt
└── README.md
```

---

## Judging Criteria Alignment

| Criteria | How Guardian Delivers |
|----------|----------------------|
| **See** | Screen sharing + screenshot paste — Jessica reads SAP errors from your screen |
| **Hear** | Gemini Live voice — natural conversation with interruption support |
| **Speak** | Jessica persona with Kore voice — professional, authoritative, SLA-obsessed |
| **Grounding** | Google Search grounding tool prevents hallucination on SAP topics |
| **Tools** | 8 backend tools with aggressive parallel calling |
| **Cloud** | Vertex AI + Cloud Run + Terraform IaC |
| **UX** | 4-stage diagnostic pipeline, live T-code overlay, SLA clock, speaking indicators |

---

## License

Built for the Gemini Live Agent Challenge hackathon.

**Team**: KaarTech UK (Solo)
