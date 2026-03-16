# Resolve + Vigil — Architecture Diagrams

Use this content to build diagrams in draw.io or Excalidraw.
Copy the sections you need. Each diagram is described with boxes, connections, and labels.

---

## DIAGRAM 1: High-Level System Architecture

```
TITLE: Resolve + Vigil — System Overview

┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACES                             │
│                                                                     │
│  ┌──────────────────────┐         ┌──────────────────────────────┐  │
│  │   Web App (Vite SPA) │         │   Chrome Extension (MV3)     │  │
│  │                      │         │                              │  │
│  │  - Voice Chat (mic)  │         │  ┌────────┐  ┌───────────┐  │  │
│  │  - Live Transcript   │         │  │ Vigil  │  │  Assist   │  │  │
│  │  - Diagnostic Tracker│         │  │ Shield │  │  Mode     │  │  │
│  │  - Issue Panel       │         │  │(scam)  │  │(UI guide) │  │  │
│  │  - Audio Visualizer  │         │  └────────┘  └───────────┘  │  │
│  └──────────┬───────────┘         └──────────────┬───────────────┘  │
│             │                                    │                  │
│             │ WebSocket (audio+JSON)             │ REST API         │
└─────────────┼────────────────────────────────────┼──────────────────┘
              │                                    │
              ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI + ADK)                           │
│                    Python · Cloud Run · Port 8080                    │
│                                                                     │
│  ┌───────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  WebSocket Server  │  │  REST Endpoints │  │  ADK Multi-Agent │  │
│  │  /ws/agent         │  │  /api/shield    │  │  (optional)      │  │
│  │  /ws/extension     │  │  /api/navigate  │  │                  │  │
│  │                    │  │  /health        │  │  Theepa Agent    │  │
│  │  Bidirectional     │  │  /api/chat      │  │  + Researcher    │  │
│  │  audio streaming   │  │                 │  │    Sub-Agent     │  │
│  └────────┬──────────┘  └────────┬────────┘  └────────┬─────────┘  │
│           │                      │                     │            │
│           ▼                      ▼                     ▼            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     TOOL SUITE (9 Tools)                     │   │
│  │                                                              │   │
│  │  search_knowledge_base    lookup_error_code                  │   │
│  │  lookup_portal_page       diagnose_issue                     │   │
│  │  create_issue             create_itsm_ticket                 │   │
│  │  update_itsm_ticket       research_support_topic             │   │
│  │  navigate_user_browser                                       │   │
│  └──────────────────────────────┬───────────────────────────────┘   │
│                                 │                                   │
│  ┌──────────────────────────────┴───────────────────────────────┐   │
│  │              SESSION STATE MACHINE (4 stages)                │   │
│  │  IDENTIFY → DIAGNOSE → RESOLVE → VERIFY                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GOOGLE CLOUD PLATFORM                          │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Gemini Live API  │  │ Gemini Flash │  │ Google Web Risk API   │  │
│  │ 2.5-flash-native │  │ 2.5-flash    │  │ (phishing/malware DB) │  │
│  │ -audio           │  │              │  │                       │  │
│  │                  │  │ Vision +     │  │ 100k lookups/mo free  │  │
│  │ Voice streaming  │  │ Search       │  │                       │  │
│  │ (bidirectional)  │  │ grounding    │  │                       │  │
│  └─────────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ Google Search    │  │ Vertex AI    │  │ Cloud Run             │  │
│  │ (grounding)      │  │ (model host) │  │ (deployment)          │  │
│  └─────────────────┘  └──────────────┘  └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Boxes to create:
| Box | Color | Label |
|-----|-------|-------|
| Web App | Amber/Orange `#e8a73e` | Web App (Vite SPA) |
| Chrome Extension | Teal `#00d4aa` | Chrome Extension (MV3) |
| Backend | Dark blue `#1a1f36` | FastAPI + ADK Backend |
| Tool Suite | Purple `#7c3aed` | 9-Tool Suite |
| Session State | Gray `#374151` | Session State Machine |
| Gemini Live API | Blue `#4285f4` | Gemini Live API |
| Gemini Flash | Blue `#4285f4` | Gemini 2.5 Flash |
| Web Risk API | Red `#ea4335` | Google Web Risk API |
| Google Search | Green `#34a853` | Google Search Grounding |
| Vertex AI | Blue `#4285f4` | Vertex AI |
| Cloud Run | Blue `#4285f4` | Cloud Run |

### Connections:
| From | To | Label | Style |
|------|----|-------|-------|
| Web App | Backend | WebSocket (audio + JSON) | Solid, bidirectional arrow |
| Chrome Extension | Backend | REST API (HTTPS) | Solid arrow |
| Backend | Gemini Live API | Voice streaming | Dashed, bidirectional |
| Backend | Gemini Flash | Vision + text analysis | Dashed arrow |
| Backend | Web Risk API | URL threat check | Dashed arrow |
| Backend | Google Search | Domain verification | Dashed arrow |

---

## DIAGRAM 2: Theepa — Voice Agent Flow

```
TITLE: Theepa — Virtual Internal Assistant (Voice-First IT Helpdesk)

┌──────────┐     ┌─────────────┐     ┌──────────────────┐
│  User    │────▶│  Microphone │────▶│  Web Audio API    │
│  speaks  │     │  (browser)  │     │  capture.worklet  │
└──────────┘     └─────────────┘     └────────┬─────────┘
                                              │ PCM audio chunks
                                              ▼
                                    ┌──────────────────┐
                                    │   WebSocket       │
                                    │   /ws/agent       │
                                    │   (bidirectional) │
                                    └────────┬─────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                            │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │            Gemini Live API Session                    │  │
│   │         gemini-live-2.5-flash-native-audio           │  │
│   │                                                      │  │
│   │   Audio IN ──▶ [Speech-to-Text] ──▶ [LLM] ──▶       │  │
│   │                                       │              │  │
│   │                              ┌────────┴────────┐     │  │
│   │                              │  Tool Calls?    │     │  │
│   │                              │  Yes ──▶ Execute│     │  │
│   │                              │  No ──▶ Respond │     │  │
│   │                              └────────┬────────┘     │  │
│   │                                       │              │  │
│   │   Audio OUT ◀── [Text-to-Speech] ◀────┘              │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │              9 Function Tools                         │  │
│   │                                                      │  │
│   │  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│   │  │ KB Search   │ │ Error Lookup │ │ Portal Lookup│  │  │
│   │  └─────────────┘ └──────────────┘ └──────────────┘  │  │
│   │  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│   │  │ Diagnose    │ │ Create Issue │ │ Create ITSM  │  │  │
│   │  └─────────────┘ └──────────────┘ └──────────────┘  │  │
│   │  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│   │  │ Update ITSM │ │ Web Search  │ │ UI Navigate  │  │  │
│   │  └─────────────┘ └──────────────┘ └──────────────┘  │  │
│   └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼ Audio response
┌──────────────────┐     ┌─────────────┐     ┌──────────┐
│  Web Audio API   │────▶│  Speaker    │────▶│  User    │
│  playback.worklet│     │  (browser)  │     │  hears   │
└──────────────────┘     └─────────────┘     └──────────┘
```

### Key flow:
1. User speaks into mic
2. Web Audio worklet captures PCM chunks
3. WebSocket streams audio to backend
4. Backend pipes audio to Gemini Live API session
5. Gemini transcribes, thinks, may call tools
6. Gemini generates voice response
7. Audio streamed back via WebSocket
8. Playback worklet plays audio to user

---

## DIAGRAM 3: Vigil Shield — 3-Layer Detection Pipeline

```
TITLE: Vigil Shield — Scam/Phishing Detection (3 Layers)

User visits a webpage
         │
         ▼
┌─────────────────────────────────────────┐
│  Chrome Extension (content.js)           │
│                                          │
│  Captures:                               │
│  ├── Screenshot (JPEG via chrome API)    │
│  ├── DOM summary (forms, links, inputs)  │
│  ├── Page URL                            │
│  └── Page Title                          │
└──────────────────┬──────────────────────┘
                   │ POST /api/shield
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SHIELD ANALYZER                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  LAYER 1: Google Web Risk API                            │    │
│  │  ─────────────────────────────────                       │    │
│  │  • Checks URL against Google's known threat database     │    │
│  │  • Covers: phishing, malware, unwanted software          │    │
│  │  • Speed: <100ms (fastest layer)                         │    │
│  │  • If MATCH → threat_level = "critical" (instant block)  │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  LAYER 2: Gemini Vision Analysis                         │    │
│  │  ───────────────────────────────                         │    │
│  │  • Sends screenshot + DOM to Gemini 2.5 Flash            │    │
│  │  • Analyzes: domain impersonation, phishing forms,       │    │
│  │    scam indicators, visual cloning, SSL issues           │    │
│  │  • Returns structured findings with evidence             │    │
│  │  • Conservative: defaults to "safe" unless concrete      │    │
│  │    evidence found                                        │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                              │                                   │
│                              ▼ (only if Layer 2 flags medium+)  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  LAYER 3: Google Search Grounding                        │    │
│  │  ────────────────────────────────                        │    │
│  │  • Cross-references domain against web scam reports      │    │
│  │  • Uses Gemini Flash + Google Search tool                │    │
│  │  • Can ESCALATE (confirmed scam reports → high)          │    │
│  │  • Can DE-ESCALATE (confirmed legitimate → lower)        │    │
│  │  • Smart matching: requires specific phrases, not just   │    │
│  │    keyword presence                                      │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MERGE & VERDICT                                         │    │
│  │  ───────────────                                         │    │
│  │  Combines all 3 layers into final verdict:               │    │
│  │  • threat_level: safe | low | medium | high | critical   │    │
│  │  • findings[]: structured evidence per category          │    │
│  │  • summary: one-line human-readable verdict              │    │
│  │  • recommendation: what user should do                   │    │
│  └──────────────────────────┬──────────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension — Results Display                              │
│                                                                  │
│  ┌─────────┐  ┌──────────────────────────────────────────────┐  │
│  │ Badge   │  │  Popup: Shield Result Card                   │  │
│  │ (icon)  │  │  ├── Verdict: ✅ Safe / ⚠️ Suspicious / 🚨   │  │
│  │         │  │  ├── Findings (per category)                 │  │
│  │ ✅ / ⚠️ │  │  ├── Evidence citations                      │  │
│  │ / 🚨    │  │  ├── Source attribution (which layer)        │  │
│  │         │  │  └── Recommendation                          │  │
│  └─────────┘  └──────────────────────────────────────────────┘  │
│               ┌──────────────────────────────────────────────┐  │
│               │  In-Page Banner (content.js overlay)         │  │
│               │  Shows threat level + summary on the page    │  │
│               └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## DIAGRAM 4: ADK Multi-Agent Architecture

```
TITLE: Google ADK Multi-Agent (Optional Mode)

┌─────────────────────────────────────────────────────┐
│                 ADK ORCHESTRATOR                      │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │         Theepa Agent (root_agent)              │  │
│  │         Model: gemini-2.5-flash                │  │
│  │                                                │  │
│  │  Persona: Virtual Internal Assistant           │  │
│  │  Language: 20 supported languages              │  │
│  │                                                │  │
│  │  8 FunctionTools:                              │  │
│  │  ┌──────────────┐  ┌────────────────────┐     │  │
│  │  │ KB Search    │  │ Error Code Lookup  │     │  │
│  │  └──────────────┘  └────────────────────┘     │  │
│  │  ┌──────────────┐  ┌────────────────────┐     │  │
│  │  │ Portal Lookup│  │ Diagnose Issue     │     │  │
│  │  └──────────────┘  └────────────────────┘     │  │
│  │  ┌──────────────┐  ┌────────────────────┐     │  │
│  │  │ Create Issue │  │ Create ITSM Ticket │     │  │
│  │  └──────────────┘  └────────────────────┘     │  │
│  │  ┌──────────────┐  ┌────────────────────┐     │  │
│  │  │ Update ITSM  │  │ Navigate Browser   │     │  │
│  │  └──────────────┘  └────────────────────┘     │  │
│  │                                                │  │
│  │  Sub-Agent: ──────────────────────────────┐   │  │
│  │  │                                        │   │  │
│  │  │  ┌──────────────────────────────────┐  │   │  │
│  │  │  │  Researcher Agent (sub-agent)    │  │   │  │
│  │  │  │  Model: gemini-2.5-flash         │  │   │  │
│  │  │  │                                  │  │   │  │
│  │  │  │  Tool: google_search             │  │   │  │
│  │  │  │  (isolated — ADK limitation)     │  │   │  │
│  │  │  │                                  │  │   │  │
│  │  │  │  Purpose: Real-time web search   │  │   │  │
│  │  │  │  for latest info grounding       │  │   │  │
│  │  │  └──────────────────────────────────┘  │   │  │
│  │  └────────────────────────────────────────┘   │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

NOTE: google_search CANNOT coexist with other tools
in the same ADK agent — must use sub-agent pattern.
```

---

## DIAGRAM 5: Session State Machine

```
TITLE: 4-Stage Diagnostic State Machine

   ┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
   │ IDENTIFY │─────▶│ DIAGNOSE │─────▶│ RESOLVE  │─────▶│ VERIFY   │
   │          │      │          │      │          │      │          │
   │ Gather   │      │ Cross-   │      │ Apply    │      │ Confirm  │
   │ symptoms │      │ reference│      │ fix or   │      │ fix      │
   │ & context│      │ KB+error │      │ escalate │      │ worked   │
   │          │      │ +portal  │      │ to ITSM  │      │          │
   └──────────┘      └──────────┘      └──────────┘      └──────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
   Tools used:        Tools used:        Tools used:        Tools used:
   - KB Search        - Diagnose Issue   - Create ITSM     - Update ITSM
   - Portal Lookup    - Error Lookup     - Navigate Browser - KB Search
   - Web Search       - Web Search       - Create Issue     - Web Search
```

---

## DIAGRAM 6: Data Flow — End-to-End Request

```
TITLE: Full Request Flow (Voice Query → Resolution)

Browser                  Backend                    Google Cloud
───────                  ───────                    ────────────

  User speaks
    │
    ▼
  [Mic] ─── PCM ──▶ [WebSocket] ──▶ [Gemini Live API]
                      /ws/agent        │
                                       │ Transcribes speech
                                       │ Understands intent
                                       │
                                       ├──▶ tool_call: search_knowledge_base
                                       │      └──▶ helpdesk_knowledge_base.json
                                       │           └──▶ returns matching articles
                                       │
                                       ├──▶ tool_call: lookup_error_code
                                       │      └──▶ helpdesk_reference.json
                                       │           └──▶ returns error details
                                       │
                                       ├──▶ tool_call: diagnose_issue
                                       │      └──▶ cross-references all data
                                       │           └──▶ returns diagnosis
                                       │
                                       ├──▶ tool_call: create_itsm_ticket
                                       │      └──▶ creates ticket with report
                                       │
                                       ├──▶ (optional) delegate to Researcher
                                       │      └──▶ google_search
                                       │           └──▶ latest web info
                                       │
                                       │ Generates voice response
                                       │
  [Speaker] ◀── PCM ◀── [WebSocket] ◀──┘
    │
    ▼
  User hears response
```

---

## DIAGRAM 7: Chrome Extension Architecture

```
TITLE: Chrome Extension Internal Architecture

┌─────────────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   POPUP (popup.html/js/css)            │  │
│  │                                                        │  │
│  │  ┌──────────────┐        ┌──────────────────────────┐  │  │
│  │  │  Mode Toggle │        │  Settings                │  │  │
│  │  │  [Vigil|Assist]       │  Server URL + Language   │  │  │
│  │  └──────────────┘        └──────────────────────────┘  │  │
│  │                                                        │  │
│  │  ┌──────────────────┐    ┌──────────────────────────┐  │  │
│  │  │ SHIELD MODE      │    │ ASSIST MODE              │  │  │
│  │  │ - Auto-scan toggle    │ - Query input            │  │  │
│  │  │ - Scan Now button     │ - Analyze Page           │  │  │
│  │  │ - Verdict display     │ - Execute actions        │  │  │
│  │  │ - Findings list       │ - Screen sharing         │  │  │
│  │  └──────────────────┘    └──────────────────────────┘  │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │ chrome.runtime.sendMessage         │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              SERVICE WORKER (background.js)            │  │
│  │                                                        │  │
│  │  Message Router:                                       │  │
│  │  ├── shield_scan      → captureScreenshot + captureDom │  │
│  │  │                      → POST /api/shield             │  │
│  │  ├── analyze_page     → captureScreenshot + captureDom │  │
│  │  │                      → POST /api/navigate           │  │
│  │  ├── execute_actions  → forward to content script      │  │
│  │  ├── shield_auto_scan → toggle auto-scan on nav        │  │
│  │  ├── check_health     → GET /health                    │  │
│  │  ├── save/get_settings→ chrome.storage.local           │  │
│  │  └── screenshare_*    → WebSocket /ws/extension        │  │
│  │                                                        │  │
│  │  Auto-Scan Listener:                                   │  │
│  │  chrome.tabs.onUpdated → shieldScan() on page load     │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │ chrome.tabs.sendMessage            │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              CONTENT SCRIPT (content.js)               │  │
│  │                                                        │  │
│  │  ├── capture_dom      → walks DOM, extracts elements   │  │
│  │  ├── render_annotations→ draws visual guides on page   │  │
│  │  ├── execute_actions  → clicks, fills, scrolls         │  │
│  │  ├── show_shield_banner→ injects threat banner         │  │
│  │  ├── clear_annotations→ removes overlays               │  │
│  │  └── screenshare      → periodic screenshot capture    │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## DIAGRAM 8: Technology Stack

```
TITLE: Technology Stack

┌─────────────────────────────────────────────────────┐
│  FRONTEND                                            │
│  ┌─────────┐ ┌──────────┐ ┌───────────────────────┐ │
│  │  Vite   │ │   Web    │ │  Web Audio API        │ │
│  │  (build)│ │Components│ │  (capture + playback  │ │
│  │         │ │  (8)     │ │   AudioWorklets)      │ │
│  └─────────┘ └──────────┘ └───────────────────────┘ │
│  Fonts: Syne + Outfit + JetBrains Mono              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  CHROME EXTENSION                                    │
│  ┌─────────────┐ ┌────────────┐ ┌────────────────┐  │
│  │ Manifest V3 │ │  Service   │ │ Content Script │  │
│  │             │ │  Worker    │ │ (DOM + overlay)│  │
│  └─────────────┘ └────────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  BACKEND                                             │
│  ┌─────────┐ ┌──────────┐ ┌───────────────────────┐ │
│  │ Python  │ │ FastAPI  │ │ Google ADK            │ │
│  │ 3.11+   │ │ + Uvicorn│ │ (multi-agent)         │ │
│  └─────────┘ └──────────┘ └───────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ google-genai SDK (Vertex AI)                    │ │
│  │ google-cloud-webrisk (Web Risk API)             │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  GOOGLE CLOUD                                        │
│  ┌─────────────────┐ ┌────────────────────────────┐  │
│  │ Gemini Live API │ │ Gemini 2.5 Flash           │  │
│  │ (voice stream)  │ │ (vision + search grounding)│  │
│  └─────────────────┘ └────────────────────────────┘  │
│  ┌─────────────────┐ ┌────────────────────────────┐  │
│  │ Web Risk API    │ │ Google Search              │  │
│  │ (threat DB)     │ │ (grounding)                │  │
│  └─────────────────┘ └────────────────────────────┘  │
│  ┌─────────────────┐ ┌────────────────────────────┐  │
│  │ Cloud Run       │ │ Artifact Registry          │  │
│  │ (hosting)       │ │ (container images)         │  │
│  └─────────────────┘ └────────────────────────────┘  │
│  ┌─────────────────┐                                 │
│  │ Terraform (IaC) │                                 │
│  └─────────────────┘                                 │
└─────────────────────────────────────────────────────┘
```

---

## QUICK REFERENCE: Draw.io / Excalidraw Setup

### Color Palette
| Component | Hex | Usage |
|-----------|-----|-------|
| Theepa/Web App | `#e8a73e` | Amber — warm, helpdesk |
| Vigil/Extension | `#00d4aa` | Teal — shield, protection |
| Backend | `#1a1f36` | Dark navy — server |
| Google Cloud | `#4285f4` | Google blue |
| Web Risk | `#ea4335` | Google red — threats |
| Search | `#34a853` | Google green |
| Warning | `#f0ab00` | Yellow — caution |
| Danger | `#f44336` | Red — critical |
| Safe | `#81c784` | Green — safe |

### Recommended Fonts for Diagrams
- Headers: **Syne** or **Inter Bold**
- Labels: **Outfit** or **Inter**
- Code/technical: **JetBrains Mono**

### Draw.io Tips
1. Use "Group" to create nested containers
2. Use dashed lines for API calls to external services
3. Use solid lines for internal connections
4. Color-code by domain (amber=Theepa, teal=Vigil, blue=GCP)
5. Add icons: 🛡️ for shield, 🎙️ for voice, 🔍 for search

### Excalidraw Tips
1. Use rectangles with rounded corners for services
2. Use diamonds for decision points
3. Group related components with background rectangles
4. Use arrows with labels for data flow direction
