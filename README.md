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
                    ┌─────────────────────────────────────────────────┐
                    │              Google Cloud Platform               │
                    │                                                   │
 ┌──────────┐      │  ┌──────────┐    ┌──────────────────────────┐    │
 │ Web App  │◄────►│  │ FastAPI  │◄──►│ Gemini Live 2.5 Flash    │    │
 │ Vite+WC  │ WS   │  │ Server   │    │ Native Audio (Vertex AI) │    │
 │ WebAudio │      │  │          │    └──────────────────────────┘    │
 └──────────┘      │  │ 8 Tools  │    ┌──────────────────────────┐    │
                    │  │ Sessions │◄──►│ Gemini 2.5 Flash         │    │
 ┌──────────┐      │  │ Activity │    │ Vision + Search (Vertex)  │    │
 │ Chrome   │◄────►│  │ Feed     │    └──────────────────────────┘    │
 │Extension │ REST │  │          │    ┌──────────────────────────┐    │
 │ Shield   │      │  │          │◄──►│ Google Web Risk API      │    │
 └──────────┘      │  └──────────┘    └──────────────────────────┘    │
                    │                                                   │
                    │  Cloud Run │ Terraform │ Artifact Registry │ IAM  │
                    └─────────────────────────────────────────────────┘
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

## 8 Backend Tools

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

---

## Google ADK Multi-Agent

```
┌─────────────────────────────────────────┐
│  Theepa Agent (root_agent)              │
│  Model: gemini-2.5-flash                │
│  8 FunctionTools                        │
│                                         │
│  Delegates research queries to:         │
│  ┌─────────────────────────────────┐    │
│  │  Researcher Sub-Agent           │    │
│  │  Tool: google_search (built-in) │    │
│  │                                 │    │
│  │  ⚠ ADK constraint:             │    │
│  │  google_search CANNOT share an  │    │
│  │  agent with other tools         │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

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
| `GET /api/activity` | Live activity feed — every scan, tool call, session logged |
| `GET /api/tickets` | All ITSM tickets |
| `POST /api/shield` | Run 4-layer shield scan |
| `POST /api/navigate` | Gemini Vision page analysis |
| `POST /api/adk/chat` | ADK text chat |
| `WS /ws/session` | Bidirectional voice streaming |

---

## What Makes This Different

| Typical Submission | Vigil |
|-------------------|-------|
| Voice agent that answers questions | Voice agent with **4-stage diagnostic protocol** + ITSM tickets + escalation |
| Tools called one at a time | **8 tools firing in parallel** — KB + error lookup + portal check simultaneously |
| English only | **20 languages** natively — speak Tamil, get tickets in English |
| Screenshot analysis | Chrome extension that **highlights, clicks, and fills forms** on the actual page |
| Single-purpose | **Dual-mode**: IT helpdesk voice agent + scam shield Chrome extension |
| No proactive protection | **Auto-scans every page** — 4-layer pipeline alerts before you get phished |
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

- **Safe shopping** — same pipeline, expanded prompts. Fake storefronts, too-good-to-be-true deals, AI-generated reviews, seller verification. Voice: "Is this deal legit?" → full analysis. "Help me checkout" → annotates cart, shipping, payment. Zero new tools
- **Real WHOIS** — domain age is a strong scam signal, currently heuristic-only
- **Persistent ITSM** — tickets vanish on restart. Needs a real database
- **Multi-tab shield dashboard** — scan history, threat trends
- **Enterprise** — SSO, custom KBs, role-based access

---

## Project Structure

```
├── resolve/                    # ADK package
│   └── agent.py                # root_agent: Theepa + Researcher
├── server/
│   ├── main.py                 # FastAPI + WebSocket + REST + Activity Feed
│   ├── gemini_live.py          # Gemini Live API bidirectional streaming
│   ├── adk_agent.py            # ADK multi-agent definition
│   ├── prompts.py              # Theepa persona (240+ lines)
│   ├── session_state.py        # 4-stage diagnostic state machine
│   └── tools/                  # 8 tool implementations
│       ├── kb_search.py        # Knowledge base
│       ├── portal_lookup.py    # Error codes + portal pages
│       ├── itsm.py             # Ticket CRUD
│       ├── issue_tracker.py    # Issue logging
│       ├── search_grounding.py # Google Search grounding
│       ├── ui_navigator.py     # Gemini Vision page analysis
│       └── shield_analyzer.py  # 4-layer scam detection + OSINT
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
**KaarTech UK** (Solo) — Built for the Gemini Live Agent Challenge

---

*Built with too much coffee and not enough sleep. But it works.*
