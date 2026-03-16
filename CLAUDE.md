# Resolve + Vigil — AI IT Helpdesk & Scam Protection Platform

## Project
- **What**: Voice-first AI control tower — Theepa (IT helpdesk agent) + Vigil (scam shield Chrome extension)
- **Categories**: Live Agents + UI Navigator
- **Hackathon**: Gemini Live Agent Challenge (Devpost)
- **Deadline**: Mar 17, 2026 @ 5:30am GMT+5:30
- **Prize Pool**: $80,000 | **Team**: Solo
- **Framework**: Google ADK (`google-adk`) + FastAPI/WebSocket (primary mode)

## Quick Start
```bash
# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Run
python -m uvicorn server.main:app --host 0.0.0.0 --port 8080

# ADK mode (alternative)
adk web resolve/
```

## Build & Deploy
```bash
# Cloud Run (one command)
export PROJECT_ID=your-project-id
bash deploy.sh

# ADK deploy
bash deploy.sh --adk

# Terraform
cd terraform && terraform init && terraform apply
```

## Architecture
- **Primary Mode**: FastAPI + WebSocket → Gemini Live API (bidirectional voice/vision streaming)
- **ADK Mode** (optional): Google ADK 4-agent hierarchy — Theepa root (8 FunctionTools) + Vigil sub-agent (7 shield tools) + Researcher (google_search) + Threat Intel (google_search)
- **Voice Model**: `gemini-live-2.5-flash-native-audio` via Vertex AI
- **Vision/Research Model**: `gemini-2.5-flash` via Vertex AI
- **Shield Layer 1**: Google Web Risk API (known threat database)
- **Shield Layer 2**: Gemini Vision (screenshot + DOM analysis)
- **Shield Layer 3**: Google Search grounding (domain verification)
- **Frontend**: Vite + Web Components + Web Audio API
- **Extension**: Chrome Manifest V3 (UI Navigator + Vigil Shield)
- **Hosting**: Google Cloud Run
- **IaC**: Terraform

## Project Structure
```
├── resolve/                    # ADK package (adk web / adk deploy)
│   ├── agent.py                # 4-agent graph: Theepa + Vigil + Researcher + Threat Intel
│   └── __init__.py
├── server/
│   ├── main.py                 # FastAPI + WebSocket + REST endpoints
│   ├── gemini_live.py          # Gemini Live API wrapper
│   ├── adk_agent.py            # ADK multi-agent (conditional, ENABLE_ADK=true)
│   ├── prompts.py              # Theepa + Vigil personas (400+ lines)
│   ├── session_state.py        # 4-stage diagnostic state machine
│   ├── config_utils.py         # GCP config helpers
│   ├── tools/
│   │   ├── registry.py         # 16-tool registration
│   │   ├── kb_search.py        # Knowledge base search
│   │   ├── portal_lookup.py    # Error code + portal page lookup
│   │   ├── itsm.py             # ITSM ticket CRUD
│   │   ├── issue_tracker.py    # Issue logging + category inference
│   │   ├── search_grounding.py # Google Search grounding
│   │   ├── ui_navigator.py     # Gemini Vision page analysis
│   │   ├── shield_analyzer.py  # Vigil 4-layer scam detection engine
│   │   └── vigil_tools.py      # 7 Vigil Shield ADK FunctionTools
│   ├── agents/
│   │   └── diagnostic_expert.py # Cross-reference diagnostic engine
│   └── data/
│       ├── helpdesk_knowledge_base.json
│       └── helpdesk_reference.json
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── background.js           # Service worker (auto-scan, REST)
│   ├── content.js              # DOM capture, annotations, actions
│   ├── popup.html/js/css       # Dual-mode UI
│   ├── overlay.css
│   └── config.js
├── frontend/                   # Vite SPA
│   ├── src/components/         # 8 Web Components
│   ├── src/lib/gemini-live/    # Gemini Live client + audio
│   └── public/audio-processors/ # Web Audio worklets
├── terraform/                  # Cloud Run + Artifact Registry + IAM
├── docs/                       # Specs, submission docs, research
├── Dockerfile
├── deploy.sh
├── requirements.txt
└── README.md
```

## Key Conventions
- Python 3.11+ with type hints
- Use `google-adk` for ADK mode (wraps `google-genai` internally)
- ADK `FunctionTool` pattern: type hints + docstrings + optional `ToolContext`
- Use `google-genai` SDK inside tool functions for Gemini/Vision calls
- Vertex AI for all model calls (`GOOGLE_GENAI_USE_VERTEXAI=TRUE`)
- All secrets via `.env` (never commit)
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Document first, then implement
- **Multi-agent**: `google_search` must be in its own sub-agent (cannot mix with other tools)
- **Model ID**: Use `gemini-live-2.5-flash-native-audio` (not `gemini-2.0-flash-live`)

## Agent Graph (4 Agents, 16 Tools)
```
root_agent (Theepa — the voice) — 8 IT FunctionTools
├── researcher — google_search (IT research)
└── vigil — 7 Shield FunctionTools
    └── threat_intel — google_search (scam/fact verification)
```

**Theepa agent** (8 IT tools):
1. `search_knowledge_base` → 20-article IT helpdesk KB
2. `lookup_error_code` → Error codes (AUTH, FORM, PAY, DOC, TECH, VISA, ID)
3. `lookup_portal_page` → Portal navigation + known issues
4. `diagnose_issue` → Cross-reference KB + errors + pages
5. `create_issue` → Issue logging with severity + dedup
6. `create_itsm_ticket` → Full ITSM ticket with diagnostic report
7. `update_itsm_ticket` → Ticket status + resolution updates
8. `navigate_user_browser` → Chrome extension DOM actions

**Vigil sub-agent** (7 shield tools):
1. `scan_url_safety` → Full 4-layer shield scan (OSINT + Web Risk + Vision + Search)
2. `check_domain_reputation` → Quick OSINT + Web Risk domain check
3. `analyze_page_for_threats` → Gemini Vision scam detection
4. `verify_domain_legitimacy` → Google Search domain reputation
5. `detect_fake_content` → Fact-check claims with citations (Reuters, BBC, AP)
6. `report_threat` → Log confirmed threats with evidence
7. `highlight_danger_zones` → Danger zone annotations for Chrome extension

**Vigil Shield** (4 layers):
0. OSINT → domain heuristics, typosquatting, TLD reputation (instant)
1. Google Web Risk API → known phishing/malware databases
2. Gemini Vision → screenshot analysis for visual scam detection
3. Google Search grounding → domain verification against scam reports

**Researcher sub-agent** (isolated — google_search limitation):
- `google_search` → IT research (portal outages, known issues)

**Threat Intel sub-agent** (isolated — google_search limitation):
- `google_search` → Scam/fact verification (domain reputation, fact-checks)

## Specs (in docs/)
- `docs/requirements.md` — User stories + acceptance criteria
- `docs/design.md` — Architecture + API contracts + data flow
- `docs/tasks.md` — Implementation checklist
- `docs/devpost-submission.md` — Devpost submission text
- `docs/demo-script.md` — Demo video walkthrough
- `docs/blog-post.md` — Blog post for bonus points
- `docs/winning-strategy.md` — Judging criteria + competitive analysis

## Common Mistakes
- **google_search + other tools**: ADK's `google_search` CANNOT coexist with other tools in one agent. Must use sub-agent pattern.
- **Wrong model ID**: Use `gemini-live-2.5-flash-native-audio`, not `gemini-2.0-flash-live`
- **Shield layers**: Must check Web Risk API FIRST (fast/cheap), then Gemini Vision (deeper), then Search grounding (verification)

## Dev Docs
When starting large tasks:
1. Create directory: `mkdir -p dev/active/[task-name]/`
2. Create files: `[task-name]-plan.md`, `[task-name]-context.md`, `[task-name]-tasks.md`
3. Update regularly: Mark tasks complete immediately

When continuing tasks:
- Check `dev/active/` for existing tasks
- Read all three files before proceeding
- Update "Last Updated" timestamps
