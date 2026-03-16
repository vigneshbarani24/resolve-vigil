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
2. **Vigil Shield**: Auto-scans every page via 3-layer detection (Web Risk API → Gemini Vision → Google Search grounding)

### AI Layer (Gemini Live + Gemini Flash + Web Risk)
Three AI services work together:
- **Gemini Live** (`gemini-live-2.5-flash-native-audio`) handles voice conversation and vision input
- **Gemini Flash** (`gemini-2.5-flash`) handles Google Search grounding and vision analysis (because `google_search` conflicts with `function_declarations` in the Live API)
- **Google Web Risk API** checks URLs against known phishing/malware databases

## The Innovation: Dual-Mode Platform

Most hackathon entries build a single-purpose agent. Resolve + Vigil is two agents in one platform:

**Theepa** (reactive): User has a problem → Theepa diagnoses, navigates, and resolves it
**Vigil** (proactive): User browses normally → Vigil silently scans and alerts before damage is done

The Chrome extension is the bridge — it serves both agents. In Assist mode, it captures DOM for Theepa's navigation guidance. In Shield mode, it captures screenshots for Vigil's scam analysis.

## 9 Tools Working Together

Theepa's power comes from parallel tool execution:

| Tool | Purpose |
|------|---------|
| `search_knowledge_base` | 20-article IT helpdesk KB with keyword scoring |
| `lookup_error_code` | Error codes across 7 categories |
| `lookup_portal_page` | Portal navigation + known issues |
| `diagnose_issue` | Cross-reference all data sources |
| `create_issue` | Log problems with dedup + severity |
| `create_itsm_ticket` | Full diagnostic report ticket |
| `update_itsm_ticket` | Status + resolution updates |
| `research_support_topic` | Google Search grounding |
| `navigate_user_browser` | Chrome extension DOM actions |

The system prompt instructs Theepa to call tools **aggressively and in parallel** — the moment she hears an error code, she fires lookup, KB search, and portal page check simultaneously.

## Vigil's 3-Layer Scam Detection

Layer 1 is fast and cheap: Google Web Risk API checks the URL against known databases. If clean, Layer 2 kicks in: Gemini Vision analyzes the page screenshot + DOM for visual impersonation (fake branding vs URL mismatch), suspicious forms (credential harvesting), urgency tactics, and AI-generated content. Layer 3 verifies: Google Search grounding cross-references the domain against scam reports.

This layered approach catches both known threats (Web Risk) and novel ones (Gemini Vision) while providing verifiable evidence (Search grounding).

## What I Learned

1. **Gemini Live API is production-ready** for voice agents — audio quality, latency, and interruption handling are excellent
2. **Multi-agent patterns are essential** — google_search cannot coexist with other tools in one ADK agent, requiring a researcher sub-agent
3. **Google Search grounding is the anti-hallucination layer** — critical for both IT support (accurate solutions) and scam detection (domain verification)
4. **Chrome extensions unlock real interaction** — screenshot analysis alone isn't UI navigation; you need DOM capture + action execution
5. **Vision + Voice + Tools is the killer combo** — users don't need to type anything

## Try It

Resolve + Vigil is deployed on Google Cloud Run. The code is open source.

- GitHub: [link]
- Live Demo: [link]

Built with Gemini Live API, Google ADK, Vertex AI, Google Web Risk API, and Google Cloud Run.

*#GeminiLiveAgentChallenge*
