# Devpost Submission — Resolve + Vigil

## Title
Resolve + Vigil — AI IT Helpdesk & Real-Time Scam Protection with Voice, Vision & Chrome Extension

## Tagline
Two AI agents, one platform. Theepa resolves IT issues by voice. Vigil shields you from scams in real time.

## Try It Live
https://resolve-743776360861.us-central1.run.app

---

## Inspiration

IT support wastes billions every year. The average ticket takes hours — most of that is back-and-forth gathering basic information: "What error do you see? What page are you on? What did you try?" By the time Tier 1 has enough context to diagnose, the SLA is blown.

But there's a second problem nobody's solving: **scams**. Users navigate phishing pages that impersonate legitimate portals, enter credentials on fake login forms, and fall for AI-generated fraud. Traditional security catches known threats — but the sophisticated ones slip through.

We built Resolve + Vigil to solve both problems with two AI agents on a single platform.

---

## What It Does

**Resolve + Vigil** is a voice-first AI platform with a Chrome extension that tackles IT support and scam protection simultaneously.

### Theepa — Virtual Internal Assistant (Live Agent)

Theepa conducts structured diagnostic interviews over voice, following the protocol a senior IT specialist would use:

1. **Identify**: Captures user name, portal, error code, and page. Assesses impact and sets P1/P2/P3 priority
2. **Diagnose**: Simultaneously searches the knowledge base, looks up error codes, checks portal details, and runs cross-reference diagnostics — all tools fire in parallel
3. **Resolve**: Guides the user step-by-step while watching their screen via the Chrome extension. Highlights buttons, fills forms, navigates pages on the user's behalf
4. **Verify**: Confirms the fix worked, creates ITSM tickets with complete diagnostic reports, or escalates to the right team

She speaks 20 languages, uses 9 backend tools, and the conversation flows like a real phone call — interruptible, natural, contextual.

### Vigil — Scam & Phishing Shield

Vigil runs silently in the Chrome extension with a 4-layer detection pipeline:

- **Layer 0: OSINT Domain Analysis** — Instant heuristic checks: TLD reputation, typosquatting detection, brand impersonation, domain authority score (0-100)
- **Layer 1: Google Web Risk API** — Checks URLs against Google's known phishing/malware database
- **Layer 2: Gemini Vision** — Analyzes page screenshots + DOM for visual impersonation, fake forms, scam indicators, AI-generated content
- **Layer 3: Google Search Grounding** — Cross-references suspicious domains against scam reports on the web

No user action needed — Vigil auto-scans every page navigation and alerts you before you get phished.

### UI Navigator — Chrome Extension

The extension doesn't just analyze pages — it **acts**. When Theepa says "click Submit," the extension captures DOM elements, sends them to Gemini Vision, highlights the target with pulsing annotations, and optionally clicks/fills/scrolls on behalf of the user.

---

## How We Built It

### Architecture

- **Frontend**: Vite SPA with 8 Web Components + Web Audio API (AudioWorklet processors for zero-latency voice capture/playback)
- **Backend**: FastAPI + WebSocket for bidirectional audio/JSON streaming with Gemini Live API
- **Voice Model**: `gemini-live-2.5-flash-native-audio` via Vertex AI — real-time speech-to-speech with tool calling
- **Vision Model**: `gemini-2.5-flash` via Vertex AI — screenshot analysis, search grounding, shield detection
- **ADK Multi-Agent**: Google ADK with Theepa agent (9 FunctionTools) + Researcher sub-agent (isolated `google_search` — required by ADK architecture)
- **Chrome Extension**: Manifest V3 with service worker (auto-scan, REST API), content script (DOM capture, annotations, actions), dual-mode popup (Vigil + Assist)
- **Deployment**: Google Cloud Run + Terraform IaC

### 9 Backend Tools

| Tool | Purpose |
|------|---------|
| `search_knowledge_base` | 20-article IT helpdesk KB with keyword scoring |
| `lookup_error_code` | Error codes across 7 categories |
| `lookup_portal_page` | Portal navigation + known issues |
| `diagnose_issue` | Cross-reference KB + errors + pages |
| `create_issue` | Issue logging with severity + dedup |
| `create_itsm_ticket` | ITSM ticket with diagnostic report |
| `update_itsm_ticket` | Status + resolution updates |
| `research_support_topic` | Google Search grounding (anti-hallucination) |
| `navigate_user_browser` | Chrome extension DOM actions |

### Key Technical Decisions

- **Sub-agent pattern for google_search**: ADK's `google_search` cannot coexist with other tools in one agent. We isolate it in a Researcher sub-agent that Theepa delegates to when the internal KB doesn't have the answer
- **4-layer Shield with smart gating**: OSINT runs instantly (no API calls), Web Risk is fast (~100ms), Vision takes ~3s, Search only triggers when Vision flags suspicious. This minimizes latency for safe sites
- **Smart de-escalation**: If Google Search confirms a flagged domain is legitimate, the threat level is automatically lowered — preventing false positives
- **Per-tab scan caching**: Shield results persist per browser tab so reopening the popup shows previous scan results instantly

---

## Challenges We Ran Into

1. **ADK google_search constraint**: Spent hours debugging why tools stopped working when `google_search` was added to the same agent. ADK requires it in a separate sub-agent
2. **Gemini Live API model ID**: The correct model is `gemini-live-2.5-flash-native-audio`, not `gemini-2.0-flash-live` — documentation was ambiguous
3. **Shield false positives**: Initial Gemini Vision analysis flagged legitimate sites like Google and GitHub as suspicious. Required extensive prompt engineering to establish a "safe by default" stance with concrete evidence requirements
4. **Chrome extension content script injection**: Tabs opened before the extension was installed don't have the content script. Built a `ensureContentScript()` pattern that pings the tab and auto-injects if needed
5. **ADK async session service**: `InMemorySessionService.get_session()` and `create_session()` are async in newer ADK versions — had to `await` them

---

## Accomplishments We're Proud Of

- **Dual-agent platform** that solves two real problems (IT support + scam detection) in one product
- **4-layer scam detection** with OSINT domain scoring, Google Web Risk API, Gemini Vision, and Google Search grounding — with smart escalation AND de-escalation
- **20-language voice support** with Gemini Live API — the agent speaks naturally in Tamil, Hindi, German, Japanese, etc.
- **Chrome extension that acts** — not just analysis but real click/fill/scroll on the user's page
- **Live activity feed** (`/api/activity`) showing real-time backend operations for transparency
- **One-command deployment** to Cloud Run with Terraform IaC
- **Solo build** — entire platform built by one developer

---

## What We Learned

- Google ADK's sub-agent pattern is essential for `google_search` isolation — this constraint isn't well-documented but critical
- Gemini Vision for security analysis requires very careful prompt engineering — the model is eager to flag threats, requiring explicit "safe by default" instructions
- Web Audio API AudioWorklets provide the best voice latency for real-time streaming
- The combination of OSINT heuristics + API-based detection gives the best accuracy/speed tradeoff for scam detection

---

## What's Next

- **Real WHOIS integration** for domain age checking (currently heuristic-only)
- **Persistent ITSM backend** (currently in-memory)
- **Multi-tab Shield dashboard** showing scan history across all tabs
- **Enterprise SSO** integration for real IT helpdesk deployment
- **Mobile companion app** with voice support

---

## Built With (Tags)
Gemini Live API, Vertex AI, Google Cloud Run, Google GenAI SDK, Google ADK, Google Web Risk API, Google Search Grounding, Python, FastAPI, JavaScript, Vite, Web Components, Web Audio API, Chrome Extension, Terraform, Docker, WebSocket

## Categories
Live Agents, UI Navigator

## Team
KaarTech UK (Solo)

## Links
- **Live Demo**: https://resolve-743776360861.us-central1.run.app
- **GitHub**: https://github.com/vigneshbarani24/Gemini-AI-Agents
- **Demo Video**: (link to be added)
