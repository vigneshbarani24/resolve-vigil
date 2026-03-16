# Vigil

### Voice-First IT Support + Real-Time Scam Shield

> Talk to Theepa — she sees your screen, diagnoses IT issues, and guides you step-by-step. Meanwhile, Vigil Shield silently protects every page you visit with a 4-layer scam detection pipeline. All powered by Gemini Live.

**[Try It Live](https://resolve-743776360861.us-central1.run.app)** | **[Demo Video](#)** | **[Devpost](https://devpost.com)**

---

## What Is This?

Two problems. One platform.

**Problem 1**: IT support is broken. The average ticket takes hours — most of that is back-and-forth: "What error do you see?" "What page are you on?" "Did you try clearing your cache?" By the time Tier 1 has enough context, the SLA is blown.

**Problem 2**: Scams are getting smarter. Phishing pages look pixel-perfect. AI-generated fake login forms fool even careful users. Your grandma almost enters her card details on a site that "awarded" her a free iPhone.

**Vigil fixes both.** Theepa is a voice-first IT agent that sees your screen and runs real diagnostics. Vigil Shield is a Chrome extension that scans every page for threats before you get phished.

---

## Architecture

![Architecture Diagram](docs/Vigil-Architecture.png)

```
                    ┌──────────────────────────────────────────────────────┐
                    │               Google Cloud Platform                  │
                    │                                                      │
 ┌──────────┐      │  ┌───────────┐    ┌──────────────────────────────┐  │
 │ Web App  │◄────►│  │ FastAPI   │◄──►│ Gemini Live 2.5 Flash        │  │
 │ Vite+WC  │ WS   │  │ Server    │    │ Native Audio (Vertex AI)     │  │
 │ WebAudio │      │  │           │    └──────────────────────────────┘  │
 └──────────┘      │  │           │    ┌──────────────────────────────┐  │
                    │  │ 4 Agents  │◄──►│ Gemini 2.5 Flash             │  │
 ┌──────────┐      │  │ 16 Tools  │    │ Vision + Search (Vertex AI)  │  │
 │ Chrome   │◄────►│  │ Sessions  │    └──────────────────────────────┘  │
 │Extension │ REST │  │ Activity  │    ┌──────────────────────────────┐  │
 │ Shield   │      │  │ Feed      │◄──►│ Google Web Risk API          │  │
 └──────────┘      │  └───────────┘    └──────────────────────────────┘  │
                    │                                                      │
                    │  Cloud Run │ Terraform │ Artifact Registry │ IAM     │
                    └──────────────────────────────────────────────────────┘
```

---

## How It Works

### 1. Theepa — Voice-First IT Agent

**Model**: `gemini-live-2.5-flash-native-audio` via Vertex AI

You talk to Theepa like a real person. She listens, sees your screen, and runs through a 4-stage diagnostic protocol:

```
IDENTIFY → DIAGNOSE → RESOLVE → VERIFY
   │            │           │          │
   ├─ Error?    ├─ KB search├─ Voice   ├─ Fix confirmed?
   ├─ Page?     ├─ Error DB │  guides  ├─ Create ticket
   └─ Priority? ├─ Portal   │  you on  └─ Or escalate
                └─ Web search│  screen
                             └─ Annotations
                                on your page
```

**The magic moment**: You say "I can't find the upload button." Theepa calls `navigate_user_browser` mid-conversation. The Chrome extension captures your page — screenshot + 150 DOM elements with bounding boxes. Gemini Vision analyzes it. A pulsing green overlay appears on the exact button. Theepa says "I've highlighted it — top right corner." All in under 4 seconds.

She speaks **20 languages** natively. Not translation — the model thinks in Tamil, Hindi, German, Japanese. You describe your error in Tamil, she responds in Tamil, your ITSM ticket gets created in English.

### 2. Vigil Shield — 4-Layer Scam Detection

Every page you visit gets scanned automatically. No clicks needed.

| Layer | What | Speed | How It Works |
|-------|------|-------|-------------|
| **0. OSINT** | Domain heuristics | <1ms | TLD reputation, typosquatting detection, brand impersonation, known-safe whitelist, domain authority score (0-100) |
| **1. Web Risk** | Google's threat DB | ~100ms | Known phishing, malware, social engineering — Google's database of bad URLs |
| **2. Vision** | Gemini sees the page | ~3s | Screenshot + DOM → fake forms, visual cloning, urgency scams, AI-generated content |
| **3. Search** | Verify with Google | ~2s | Only triggers if Layer 2 flags something. Searches for scam reports. **Can de-escalate** — confirms legit sites |

Green ✓ on the extension icon = all layers passed. Red warning banner = get out.

### 3. Voice-Driven UI Navigation

No text input in the extension. UI navigation flows through voice:

```
User speaks          →  Gemini Live calls navigate_user_browser
                     →  Server tells extension to capture page
                     →  Extension grabs screenshot + DOM elements
                     →  Server sends to Gemini Vision
                     →  Vision returns: "highlight element #23"
                     →  Extension renders pulsing overlay on button
                     →  Theepa says: "I've highlighted it for you"
```

Voice is the single control plane. One conversation handles both diagnosis AND page navigation.

---

## 16 Backend Tools — 4 ADK Agents

### Theepa Agent (8 IT Helpdesk Tools)

| # | Tool | What It Does |
|---|------|-------------|
| 1 | `search_knowledge_base` | Fuzzy search across 20 IT helpdesk articles |
| 2 | `lookup_error_code` | Resolves codes across 7 categories (AUTH, FORM, PAY, DOC, TECH, VISA, ID) |
| 3 | `lookup_portal_page` | Portal navigation paths + known issues for any page |
| 4 | `diagnose_issue` | Cross-references KB + errors + pages → root cause analysis |
| 5 | `create_issue` | Logs problems with auto-severity + deduplication |
| 6 | `create_itsm_ticket` | Full ITSM ticket with diagnostic report attached |
| 7 | `update_itsm_ticket` | Status updates, resolution notes, escalation path |
| 8 | `navigate_user_browser` | Triggers Chrome extension → Gemini Vision → page annotations |

### Vigil Sub-Agent (7 Shield Tools)

| # | Tool | What It Does |
|---|------|-------------|
| 9 | `scan_url_safety` | Full 4-layer shield scan (OSINT + Web Risk + Vision + Search) |
| 10 | `check_domain_reputation` | Quick OSINT + Web Risk domain check — instant verdict |
| 11 | `analyze_page_for_threats` | Gemini Vision detects visual scams, fake forms, impersonation |
| 12 | `verify_domain_legitimacy` | Google Search cross-references domain against scam reports |
| 13 | `detect_fake_content` | Fact-checks news/social media claims with citations from Reuters, BBC, AP |
| 14 | `report_threat` | Logs confirmed threats with full evidence to threat database |
| 15 | `highlight_danger_zones` | Identifies deceptive UI elements → Chrome extension renders red overlays |

### + 2 Google Search Sub-Agents

| Agent | Role |
|-------|------|
| `researcher` | IT research — portal outages, known issues, government service updates |
| `threat_intel` | Scam/fact verification — domain reputation, scam reports, fact-checks |

---

## Google ADK Multi-Agent Orchestration

```
┌──────────────────────────────────────────────────────────┐
│  Theepa (root_agent) — THE VOICE                         │
│  Model: gemini-2.5-flash │ 8 IT FunctionTools            │
│                                                          │
│  ┌──────────────────────────┐  ┌───────────────────────┐ │
│  │  Researcher Sub-Agent    │  │  Vigil Sub-Agent      │ │
│  │  google_search           │  │  7 Shield FunctionTools│ │
│  │  (IT research)           │  │  (scam/phishing/fake  │ │
│  │                          │  │   content detection)  │ │
│  │  ⚠ ADK constraint:      │  │                       │ │
│  │  google_search CANNOT    │  │  ┌──────────────────┐ │ │
│  │  share an agent with     │  │  │ Threat Intel     │ │ │
│  │  other tools             │  │  │ google_search    │ │ │
│  └──────────────────────────┘  │  │ (scam/fact check)│ │ │
│                                │  └──────────────────┘ │ │
│                                └───────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Flow**: User says "Is this page safe?" → Theepa transfers to Vigil → Vigil runs shield tools → threat_intel searches for scam reports → findings return to Theepa → Theepa speaks the result.

**Flow**: User says "I see error AUTH-003" → Theepa fires 4 IT tools in parallel → researcher searches latest outage info → Theepa synthesizes and speaks the resolution.

---

## Cloud Deployment

| Component | Technology | Where |
|-----------|-----------|-------|
| Web Frontend | Vite + Web Components + Web Audio API | Cloud Run |
| Backend API | FastAPI + WebSocket | Cloud Run |
| Voice Model | `gemini-live-2.5-flash-native-audio` | Vertex AI |
| Vision/Search | `gemini-2.5-flash` | Vertex AI |
| Threat Database | Google Web Risk API | GCP |
| Agent Framework | Google ADK | Cloud Run |
| Infrastructure | Terraform + Docker | Artifact Registry |

---

## Quick Start

```bash
# Clone
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

### Chrome Extension
1. Open `chrome://extensions/` → Enable **Developer mode**
2. Click **Load unpacked** → select the `extension/` folder
3. Click the Vigil icon → enter `http://localhost:8080` → **Connect**
4. Shield auto-scans every page. Green ✓ = safe.

### Deploy to Cloud Run
```bash
export PROJECT_ID=your-project-id
bash deploy.sh        # Standard deploy
bash deploy.sh --adk  # With ADK multi-agent
```

---

## API Endpoints

| Endpoint | What |
|----------|------|
| `GET /health` | Server health + ADK status |
| `GET /api/status` | Multi-agent status — 4 agents, 16 tools, features |
| `GET /api/activity` | Live activity feed — every scan, tool call, session logged |
| `GET /api/tickets` | All ITSM tickets |
| `GET /api/threats` | Vigil threat log — confirmed threats with evidence |
| `POST /api/shield` | Run 4-layer shield scan |
| `POST /api/navigate` | Gemini Vision page analysis |
| `POST /api/adk/chat` | ADK multi-agent text chat |
| `WS /ws` | Bidirectional voice streaming |

---

## What Makes This Different

| Typical Submission | Vigil |
|-------------------|-------|
| 1 agent, 2-3 tools | **4 agents, 16 tools** — multi-agent orchestration with ADK sub-agents |
| Voice agent that answers questions | Voice agent with **4-stage diagnostic protocol** + ITSM tickets + escalation |
| Tools called one at a time | **16 tools firing in parallel** — KB + error lookup + shield scan simultaneously |
| English only | **20 languages** natively — speak Tamil, get tickets in English |
| Screenshot analysis | Chrome extension that **highlights, clicks, fills forms, and warns about danger zones** |
| Single-purpose | **Dual-mode**: IT helpdesk voice agent + scam shield with fake content detection |
| No proactive protection | **Auto-scans every page** — 4-layer pipeline + fact-checking with citations |
| No transparency | **Live orchestration logs** — see every agent transfer, tool call, and reasoning in real time |
| Manual deployment | **Terraform IaC** — one command to production |

---

## Challenges (The Real Ones)

1. **google_search broke all my other tools.** Added it to the main agent. Everything stopped. No error. Just silence. 4 hours later: ADK requires it in a separate sub-agent. Not in the docs.

2. **Gemini Vision thought Google was a scam.** First shield version flagged google.com — "contains login form, possible phishing." Rewrote the prompt 6 times to get "safe by default" right.

3. **Wrong model ID everywhere.** It's `gemini-live-2.5-flash-native-audio`. Not `gemini-2.0-flash-live`. Not `gemini-2.5-flash-live`. Trial and error.

4. **Content scripts don't exist on pre-installed tabs.** Built `ensureContentScript()` — ping, if no response, inject, wait 300ms, retry.

5. **ADK sessions are async now.** `get_session()` returns a coroutine. Got `'coroutine' object has no attribute 'id'` and questioned my career for 30 minutes.

---

## What's Next

- **Mobile-native Vigil** — the real vision: every phone ships with this. Built-in scam shield + voice IT support. No extension needed — the OS does it. Vigil as a platform service.
- **Safe shopping** — same pipeline, expanded prompts. Fake storefronts, too-good-to-be-true deals, AI-generated reviews, seller verification. Voice: "Is this deal legit?" → full analysis.
- **Real WHOIS** — domain age is a strong scam signal, currently heuristic-only
- **Persistent ITSM** — tickets vanish on restart. Needs a real database
- **Multi-tab shield dashboard** — scan history, threat trends, threat intelligence sharing
- **Enterprise** — SSO, custom KBs, role-based access

---

## Project Structure

```
├── resolve/                    # ADK package
│   └── agent.py                # 4-agent graph: Theepa + Vigil + Researcher + Threat Intel
├── server/
│   ├── main.py                 # FastAPI + WebSocket + REST + Activity Feed
│   ├── gemini_live.py          # Gemini Live API bidirectional streaming
│   ├── adk_agent.py            # ADK multi-agent definition (conditional)
│   ├── prompts.py              # Theepa + Vigil personas (400+ lines)
│   ├── session_state.py        # 4-stage diagnostic state machine
│   ├── agents/
│   │   └── diagnostic_expert.py # Cross-reference diagnostic engine
│   └── tools/                  # 16 tool implementations
│       ├── kb_search.py        # Knowledge base search
│       ├── portal_lookup.py    # Error codes + portal pages
│       ├── itsm.py             # Ticket CRUD
│       ├── issue_tracker.py    # Issue logging
│       ├── search_grounding.py # Google Search grounding
│       ├── ui_navigator.py     # Gemini Vision page analysis
│       ├── shield_analyzer.py  # 4-layer scam detection engine
│       └── vigil_tools.py      # 7 Vigil Shield ADK FunctionTools
├── extension/                  # Chrome Extension (Manifest V3)
├── frontend/                   # Vite + Web Components SPA
├── terraform/                  # Cloud Run IaC
├── docs/                       # Architecture diagrams + submission
├── Dockerfile
└── deploy.sh
```

---

## Built With

Gemini Live API, Gemini 2.5 Flash, Vertex AI, Google ADK, Google Web Risk API, Google Search Grounding, Python, FastAPI, WebSocket, Vite, Web Components, Web Audio API, Chrome Extension (Manifest V3), Cloud Run, Terraform, Docker

## Categories
Live Agents, UI Navigator

## Team
**Solo Developer** — Built for the Gemini Live Agent Challenge

---

*Built with too much coffee and not enough sleep. But it works.*
