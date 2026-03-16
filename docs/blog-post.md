# Building a Voice-First AI IT Helpdesk & Scam Shield with Gemini Live API

*Created for the Gemini Live Agent Challenge hackathon #GeminiLiveAgentChallenge*

---

## The Idea

What if IT support felt like calling a brilliant senior specialist who never sleeps, speaks 20 languages, and can see your screen? And what if the same platform also protected you from scams and phishing — automatically, on every page you visit?

That's **Resolve + Vigil** — a dual-agent AI platform where **Theepa**, a voice AI agent, conducts structured diagnostic interviews and navigates your browser, while **Vigil**, a Chrome extension shield, auto-scans every page for scams, phishing, and AI-generated fraud.

## Why Gemini Live API?

IT support is inherently a **conversation**. Users are frustrated, describe problems imprecisely, and need step-by-step guidance. Text chatbots fail because:

1. Users don't know what information is relevant
2. Typing error codes and descriptions is error-prone
3. Chat back-and-forth is too slow for urgent issues

Gemini Live API solves all three:
- **Voice** means users describe problems naturally
- **Vision** means Theepa reads errors directly from screen captures
- **Real-time** means the conversation flows like a phone call
- **Interruption support** means users can jump in when Theepa is going down the wrong path

## Architecture

The system has four layers:

### Frontend (Vite + Web Components)
A dark-themed SPA with real-time audio visualization, a visual diagnostic pipeline tracker (4 stages), issue panel, and session summary with downloadable reports. Web Audio worklets handle PCM streaming at 16kHz capture / 24kHz playback.

### Backend (FastAPI + WebSocket)
Bidirectional WebSocket streams audio and JSON between the browser and Gemini Live API. The backend manages 9 server-side tools that Gemini calls during conversation. When a tool fires, the result goes back to Gemini and the frontend gets real-time visual feedback.

### Chrome Extension (Manifest V3)
The extension does two things:
1. **UI Navigator**: Captures DOM elements with bounding rectangles, sends to Gemini Vision, receives structured actions (highlight, click, fill, scroll), and executes them on the page
2. **Vigil Shield**: Auto-scans every page via 4-layer detection (OSINT heuristics → Web Risk API → Gemini Vision → Google Search grounding with de-escalation)

### AI Layer (Gemini Live + Gemini Flash + Web Risk)
Three AI services work together:
- **Gemini Live** (`gemini-live-2.5-flash-native-audio`) handles voice conversation and vision input
- **Gemini Flash** (`gemini-2.5-flash`) handles Google Search grounding and vision analysis (because `google_search` conflicts with `function_declarations` in the Live API)
- **Google Web Risk API** checks URLs against known phishing/malware databases

## The Innovation: Dual-Mode Platform

Most hackathon entries build a single-purpose agent. Vigil is a **4-agent multi-agent system**:

**Theepa** (root agent, the voice): Handles everything. Delegates to specialized sub-agents.
**Vigil** (sub-agent): Cybersecurity shield with 7 FunctionTools — scam scanning, fake content detection, danger zone annotations.
**Researcher** (sub-agent): Google Search for IT research — portal outages, known issues.
**Threat Intel** (sub-agent): Google Search for scam/fact verification — domain reputation, citations from Reuters/BBC/AP.

The Chrome extension is the bridge — it serves all agents. It captures DOM for navigation guidance, screenshots for scam analysis, and displays live orchestration logs showing every agent transfer and tool call.

## 16 Tools Across 4 Agents

**Theepa** fires 8 IT tools in parallel:

| Tool | Purpose |
|------|---------|
| `search_knowledge_base` | 20-article IT helpdesk KB |
| `lookup_error_code` | Error codes across 7 categories |
| `lookup_portal_page` | Portal navigation + known issues |
| `diagnose_issue` | Cross-reference all data sources |
| `create_issue` | Log problems with dedup + severity |
| `create_itsm_ticket` | Full diagnostic report ticket |
| `update_itsm_ticket` | Status + resolution updates |
| `navigate_user_browser` | Chrome extension DOM actions |

**Vigil** runs 7 shield tools:

| Tool | Purpose |
|------|---------|
| `scan_url_safety` | Full 4-layer shield scan |
| `check_domain_reputation` | OSINT + Web Risk domain check |
| `analyze_page_for_threats` | Gemini Vision scam detection |
| `verify_domain_legitimacy` | Google Search domain verification |
| `detect_fake_content` | Fact-check with citations (Reuters, BBC, AP) |
| `report_threat` | Log confirmed threats |
| `highlight_danger_zones` | Red overlays on deceptive UI elements |

## Vigil's 4-Layer Scam Detection + Fake Content Detection

Layer 0 is instant: OSINT domain heuristics (TLD reputation, typosquatting, brand impersonation). Layer 1: Google Web Risk API checks the URL against known databases. Layer 2: Gemini Vision analyzes the screenshot for visual impersonation, suspicious forms, urgency tactics. Layer 3: Google Search grounding cross-references the domain against scam reports — and can **de-escalate** if the site is confirmed legitimate.

But the real innovation is `detect_fake_content`: say "Is this article true?" and Vigil fact-checks the claims against Reuters, BBC, and AP, returning citations from verified sources. No other agent does this.

## What I Learned

1. **Multi-agent orchestration is the future** — 4 agents with hierarchical delegation is dramatically more powerful than a flat chatbot with tools
2. **ADK's sub-agent pattern is essential** — google_search cannot coexist with other tools. We needed TWO google_search sub-agents (IT + security)
3. **Google Search grounding is the anti-hallucination layer** — critical for both IT support and scam detection AND fact-checking
4. **Chrome extensions unlock real interaction** — DOM capture + action execution + danger zone annotations
5. **Transparent AI wins trust** — showing every agent transfer and tool call in real-time logs builds confidence
6. **The vision is mobile-native** — every phone should ship with this. OS-level scam protection + voice IT support. No extension needed.

## Try It

Vigil is deployed on Google Cloud Run. The code is open source.

- GitHub: https://github.com/vigneshbarani24/Gemini-AI-Agents
- Live Demo: https://resolve-743776360861.us-central1.run.app

Built with Gemini Live API, Google ADK, Vertex AI, Google Web Risk API, and Google Cloud Run.

*#GeminiLiveAgentChallenge*
