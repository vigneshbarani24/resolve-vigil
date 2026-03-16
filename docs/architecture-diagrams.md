# Vigil — Architecture Diagrams

**Vigil** is an AI-powered IT support and scam protection platform developed by KaarTech UK. At its core is a **voice-first support agent** powered by the Gemini Live API. The agent sees the user's screen, listens to their voice, diagnoses IT issues in real time, and manages the full lifecycle of incident resolution. Simultaneously, the **Vigil Shield** Chrome extension runs a 4-layer scam detection pipeline on every page the user visits.

This document provides a comprehensive set of architecture diagrams covering the system's major components, data flows, and deployment topology.

---

## 1. System Architecture Overview

The high-level architecture is organised around four layers: the browser-based frontend + Chrome extension, the FastAPI backend, the Gemini AI engine on Google Cloud, and the data/tooling layer. Real-time voice communication flows over WebSocket, while REST endpoints handle shield scans, UI navigation, and session management.

```mermaid
graph TB
    subgraph "Browser Frontend"
        UI[Web UI — Vite + Web Components]
        WA[Web Audio API<br/>AudioWorklet Processors]
        LOGS[System Logs Tab<br/>Real-time Activity Feed]
        WS_CLIENT[WebSocket Client]
    end

    subgraph "Chrome Extension Manifest V3"
        POPUP[Popup — Shield Controls<br/>+ Live Status]
        BG[Background Service Worker<br/>Auto-scan + Badge + Cache]
        CS[Content Script<br/>DOM Capture + Annotations<br/>+ Shield Banner]
    end

    subgraph "Google Cloud Platform"
        subgraph "Cloud Run"
            FASTAPI[FastAPI Server]
            GM[GeminiLive Wrapper]
            TR[Tool Registry — 8 Tools]
            SM[Session State Manager]
            AF[Activity Feed]
            SHIELD[Shield Analyzer<br/>4-Layer Pipeline]
            NAV[UI Navigator<br/>Gemini Vision]
        end

        subgraph "Vertex AI"
            LIVE[Gemini Live 2.5 Flash<br/>Native Audio]
            FLASH[Gemini 2.5 Flash<br/>Vision + Search Grounding]
        end

        subgraph "Security APIs"
            WEBRISK[Google Web Risk API<br/>Phishing / Malware DB]
            GSEARCH[Google Search<br/>Grounding]
        end
    end

    subgraph "Data Layer"
        KB[(IT Knowledge Base<br/>helpdesk_knowledge_base.json)]
        REF[(Reference Data<br/>helpdesk_reference.json)]
        ITSM_STORE[(ITSM Ticket Store)]
        SESSION_STORE[(Session Store<br/>In-Memory)]
    end

    UI --> WS_CLIENT
    WA --> WS_CLIENT
    WS_CLIENT -- "WebSocket /ws/session" --> FASTAPI
    LOGS -- "GET /api/activity" --> AF
    FASTAPI --> GM
    GM -- "Live API Bidi Stream" --> LIVE
    GM --> TR
    TR --> SM
    TR --> KB
    TR --> REF
    TR --> ITSM_STORE
    SM --> SESSION_STORE

    POPUP --> BG
    BG -- "POST /api/shield" --> SHIELD
    BG -- "GET /health" --> FASTAPI
    CS -- "Screenshot + DOM" --> BG
    SHIELD --> WEBRISK
    SHIELD -- "Layer 2: Vision" --> FLASH
    SHIELD -- "Layer 3: Grounding" --> GSEARCH
    NAV -- "Page Analysis" --> FLASH

    TR -- "navigate_user_browser" --> NAV
    NAV -- "Annotations" --> CS
```

**Key observations:**

- The Gemini Live session uses a bidirectional stream for real-time audio. Tool calls flow through the same connection.
- The Chrome extension is **shield-only** — it has no text input for UI help. UI navigation is driven entirely through voice: the user speaks, Gemini Live calls the `navigate_user_browser` tool, which triggers the extension to capture the page and render annotations.
- Shield scans use a separate Gemini Flash call (not the Live session) for vision analysis and search grounding.
- Session state is held in-memory on the FastAPI server, scoped to each session token.

---

## 2. Real-Time Voice Flow

This sequence diagram traces a single voice interaction from the moment the user speaks through to the audio response played back in the browser. It also shows how voice commands drive UI annotations on the Chrome extension.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant WebAudio as Web Audio API
    participant WS as WebSocket
    participant FastAPI
    participant GeminiLive as Gemini Live API
    participant Speaker as Audio Output

    User->>Browser: Speaks into microphone
    Browser->>WebAudio: Capture PCM audio (16kHz)
    WebAudio->>WS: Send audio bytes (base64 chunks)

    WS->>FastAPI: Binary audio frames
    FastAPI->>FastAPI: Route to audio_input_queue

    FastAPI->>GeminiLive: send_realtime_input(audio blob)

    GeminiLive-->>FastAPI: server_content.model_turn<br/>(inline_data: PCM audio)
    GeminiLive-->>FastAPI: server_content.input_transcription
    GeminiLive-->>FastAPI: server_content.output_transcription

    FastAPI-->>WS: Binary audio response
    FastAPI-->>WS: JSON transcription events

    WS-->>Browser: Audio bytes + transcript
    Browser->>WebAudio: Decode and play audio
    WebAudio->>Speaker: Agent's voice response
    Browser->>Browser: Render transcript in UI

    GeminiLive-->>FastAPI: server_content.turn_complete
    FastAPI-->>WS: turnComplete event
```

**Key observations:**

- Audio flows as raw PCM bytes over WebSocket — no HTTP overhead.
- The model is `gemini-live-2.5-flash-native-audio` — native speech-to-speech with no separate STT/TTS pipeline.
- 20+ languages supported natively by the model.
- AudioWorklet processors (`capture-processor.js` and `playback-processor.js`) handle zero-latency audio capture and playback.

---

## 3. Tool Orchestration Flow

When Gemini detects that a user's request requires a backend action, it emits a `tool_call` event. The backend dispatches the call to the appropriate handler, updates session state, and returns the result so the agent can formulate a voice response.

```mermaid
sequenceDiagram
    participant User
    participant Agent as Agent - Gemini Live
    participant GeminiLive as GeminiLive Wrapper
    participant Registry as Tool Registry
    participant Handler as Tool Handler
    participant Session as Session State
    participant Frontend

    User->>Agent: "I'm getting error AUTH-003 on the login page"

    Agent->>GeminiLive: tool_call event<br/>function: lookup_error_code<br/>args: error_code AUTH-003

    GeminiLive->>Registry: Lookup handler for lookup_error_code
    Registry->>Handler: Execute lookup_error_code

    Handler->>Handler: Search helpdesk_reference.json
    Handler-->>Registry: Return result JSON

    Note over Handler,Session: Tool updates session state
    Handler->>Session: update_checkpoint - diagnosis<br/>Lookup error codes - complete

    Registry-->>GeminiLive: FunctionResponse with result

    GeminiLive->>Agent: send_tool_response

    GeminiLive-->>Frontend: Emit tool_call event via WebSocket
    GeminiLive-->>Frontend: Emit session_state update

    Agent-->>User: Voice - Error AUTH-003 relates to<br/>multi-factor authentication failure.<br/>Let me search the knowledge base...
```

**Key observations:**

- Tool handlers can be synchronous or asynchronous. The GeminiLive wrapper detects the type via `inspect.iscoroutinefunction` and dispatches accordingly.
- After every tool call, the backend logs to the Activity Feed and emits an updated `session_state` event to the frontend.
- The agent can call multiple tools in sequence within a single turn (e.g., `lookup_error_code` then `search_knowledge_base` then `diagnose_issue`).

---

## 4. Voice-Driven UI Navigation Flow

This is the key architectural differentiator: **UI navigation is voice-driven, not text-driven**. The user speaks to the agent, the agent calls the `navigate_user_browser` tool, which triggers the Chrome extension to capture the page and render visual annotations.

```mermaid
sequenceDiagram
    participant User
    participant Agent as Agent - Gemini Live
    participant Server as FastAPI Server
    participant Navigator as UI Navigator
    participant Flash as Gemini 2.5 Flash
    participant Extension as Chrome Extension
    participant Page as Web Page

    User->>Agent: "I can't find the upload button"

    Agent->>Server: tool_call: navigate_user_browser<br/>guidance: Find the upload documents button

    Server->>Extension: Request capture page screenshot + DOM

    Extension->>Page: captureVisibleTab - JPEG screenshot
    Extension->>Page: querySelectorAll interactive elements<br/>150 elements with bounding rects

    Extension-->>Server: Screenshot base64 + DOM summary

    Server->>Navigator: analyze_page_screenshot

    Navigator->>Flash: Multimodal request<br/>Image JPEG + DOM elements + guidance
    Flash-->>Navigator: Structured JSON response<br/>type highlight, selector upload-btn<br/>label Click this button

    Navigator-->>Server: Actions list + explanation

    Server->>Extension: render_annotations with actions

    Extension->>Page: Create pulsing overlay<br/>on upload button with<br/>step number badge + label

    Server-->>Agent: Tool result - Visual guidance sent

    Agent-->>User: Voice - I have highlighted the upload<br/>button on your screen, it is<br/>the blue button in the top right
```

**Key observations:**

- The Chrome extension has **no text input for UI help**. All UI navigation flows through voice.
- The content script captures up to 150 interactive elements with bounding rects, selectors, and attributes.
- Gemini Vision cross-references the screenshot with the DOM summary for precise element targeting.
- Annotations include pulsing overlays, step number badges, and action labels.
- The extension can also auto-execute actions: `click()`, `fill()`, `scroll()` on behalf of the user.

---

## 5. Eight-Tool Ecosystem

The agent's eight tools are organised into four functional categories. Each tool is declared as a Gemini function declaration and registered in the central tool registry at startup.

```mermaid
flowchart TB
    subgraph AGENT["Agent - Gemini Live 2.5 Flash Native Audio"]
        INTENT[Intent Detection<br/>via Function Calling]
    end

    subgraph KNOWLEDGE["Knowledge and Lookup"]
        KB[search_knowledge_base<br/>Search 20-article IT helpdesk KB<br/>for errors and resolutions]
        ERR[lookup_error_code<br/>Look up error codes across<br/>7 categories AUTH FORM PAY etc]
        PAGE[lookup_portal_page<br/>Get portal page details<br/>navigation paths known issues]
    end

    subgraph DIAGNOSIS["Diagnosis"]
        DIAG[diagnose_issue<br/>Cross-reference KB + errors + pages<br/>for multi-factor diagnosis]
        RESEARCH[research_support_topic<br/>Google Search grounding for<br/>latest solutions anti-hallucination]
    end

    subgraph ISSUE_MGMT["Issue Management"]
        CREATE[create_issue<br/>Log detected problems with<br/>severity and category inference]
        TICKET[create_itsm_ticket<br/>Create full ITSM ticket with<br/>diagnostic report and RCA]
        UPDATE[update_itsm_ticket<br/>Update ticket status resolution<br/>or escalation notes]
    end

    subgraph NAVIGATION["UI Navigation"]
        NAV[navigate_user_browser<br/>Trigger Chrome extension to<br/>capture page + render annotations]
    end

    INTENT --> KB
    INTENT --> ERR
    INTENT --> PAGE
    INTENT --> DIAG
    INTENT --> RESEARCH
    INTENT --> CREATE
    INTENT --> TICKET
    INTENT --> UPDATE
    INTENT --> NAV

    KB -- "helpdesk_knowledge_base.json" --> DATA[(Data Layer)]
    ERR -- "helpdesk_reference.json" --> DATA
    PAGE -- "helpdesk_reference.json" --> DATA
    DIAG -- "Cross-references all sources" --> DATA
    RESEARCH -- "Gemini Flash + Google Search" --> GSEARCH[Google Search API]
    NAV -- "Screenshot + DOM to Gemini Vision" --> FLASH[Gemini 2.5 Flash]
    TICKET --> ITSM_STORE[(ITSM Ticket Store)]
    UPDATE --> ITSM_STORE
    CREATE --> SESSION[(Session State)]
```

---

## 6. ADK Multi-Agent Architecture

When running in ADK mode, the system uses Google's Agent Development Kit for multi-agent orchestration. The `google_search` tool **must** be isolated in a separate sub-agent due to an ADK constraint.

```mermaid
flowchart TB
    subgraph ADK["Google ADK Runtime"]
        subgraph SESSION["InMemorySessionService"]
            SS[Async Session Management<br/>get_session / create_session]
        end

        subgraph ROOT["Theepa Agent - root_agent"]
            MODEL_R[Model: gemini-2.5-flash]
            PROMPT[System Prompt: 240+ lines<br/>Diagnostic protocol + persona]

            subgraph TOOLS["8 FunctionTools"]
                T1[search_knowledge_base]
                T2[lookup_error_code]
                T3[lookup_portal_page]
                T4[diagnose_issue]
                T5[create_issue]
                T6[create_itsm_ticket]
                T7[update_itsm_ticket]
                T8[navigate_user_browser]
            end
        end

        subgraph SUB["Researcher Sub-Agent"]
            MODEL_S[Model: gemini-2.5-flash]
            GS[google_search<br/>ADK Built-in Tool]
        end
    end

    USER[User Query] --> ROOT
    ROOT -- "Delegates research queries" --> SUB
    SUB -- "Web search results" --> ROOT
    ROOT --> RESPONSE[Voice or Text Response]
```

**Key observations:**

- ADK's `google_search` tool cannot coexist with other tools in the same agent — this is an undocumented constraint requiring sub-agent isolation.
- The Researcher sub-agent is only invoked when the internal knowledge base lacks the answer.
- ADK mode uses `gemini-2.5-flash` (text), while primary voice mode uses `gemini-live-2.5-flash-native-audio`.
- `InMemorySessionService.get_session()` and `create_session()` are async and must be awaited.

---

## 7. Vigil Shield — 4-Layer Detection Pipeline

The Shield runs silently in the Chrome extension, auto-scanning every page navigation. It uses a cascading 4-layer pipeline with smart gating to minimise latency for safe sites.

```mermaid
flowchart TB
    START([Page Navigation Detected]) --> L0

    subgraph L0["Layer 0: OSINT Domain Analysis -- 0ms"]
        O1[TLD Reputation Scoring]
        O2[Typosquatting Detection]
        O3[Brand Impersonation Check]
        O4[Known-Safe Whitelist]
        O5[Domain Length Analysis]
    end

    L0 --> L0_OUT[Domain Score 0-100 + Flags]
    L0_OUT --> L1

    subgraph L1["Layer 1: Google Web Risk API -- 100ms"]
        W1[SOCIAL_ENGINEERING]
        W2[MALWARE]
        W3[UNWANTED_SOFTWARE]
    end

    L1 --> L1_CHECK{Web Risk match?}
    L1_CHECK -- "Yes" --> IMMEDIATE[Immediate HIGH or CRITICAL]
    L1_CHECK -- "No" --> L2

    subgraph L2["Layer 2: Gemini Vision Analysis -- 3s"]
        V1[Screenshot Analysis]
        V2[DOM Structure Analysis]
        V3[Fake Login Detection]
        V4[Visual Brand Cloning]
        V5[Urgency Scam Tactics]
        V6[AI Content Detection]
    end

    L2 --> L2_CHECK{Threat level >= medium?}
    L2_CHECK -- "No" --> SAFE_OUT([SAFE - Green Badge])
    L2_CHECK -- "Yes" --> L3

    subgraph L3["Layer 3: Search Grounding -- 2s"]
        S1[Domain reputation search]
        S2[Scam report cross-reference]
        S3[CAN DE-ESCALATE if legitimate]
    end

    L3 --> VERDICT([Final Verdict])

    VERDICT --> BADGE[Chrome Badge per-tab]
    VERDICT --> BANNER[Page Banner for medium+]
    VERDICT --> CACHE[Tab Scan Cache]
    IMMEDIATE --> BADGE
    IMMEDIATE --> BANNER
```

**Pipeline mechanics:**

- **Layer 0** is pure heuristic — no API calls, instant results. Known-safe whitelist prevents false positives.
- **Layer 1** is fast (~100ms) and catches known threats from Google's databases.
- **Layer 2** is deep analysis — Gemini Vision examines the actual page content.
- **Layer 3** only triggers when Layer 2 flags something suspicious — minimising latency for safe sites.
- **Smart de-escalation**: Layer 3 can LOWER the threat level if Google Search confirms legitimacy.

---

## 8. Four-Stage Diagnostic Pipeline

Every voice support session follows a structured four-stage diagnostic pipeline with 12 checkpoints tracked in real time.

```mermaid
stateDiagram-v2
    [*] --> Initiation

    state Initiation {
        i1: Capture error details
        i2: Identify issue category
        i3: Assess business impact
        i1 --> i2
        i2 --> i3
    }

    Initiation --> Diagnosis

    state Diagnosis {
        d1: Search knowledge base
        d2: Lookup error codes
        d3: Check portal status
        d1 --> d2
        d2 --> d3
    }

    Diagnosis --> Troubleshoot

    state Troubleshoot {
        t1: Apply KB resolution
        t2: Verify fix with user
        t3: Check for side effects
        t1 --> t2
        t2 --> t3
    }

    Troubleshoot --> Resolution

    state Resolution {
        r1: Document root cause
        r2: Create ITSM ticket
        r3: Generate diagnostic report
        r4: Provide specialist guidance
        r1 --> r2
        r2 --> r3
        r3 --> r4
    }

    Resolution --> [*]
```

**Pipeline mechanics:**

- Checkpoints initialise as `pending` when a session is created.
- As tools execute, checkpoints update to `in_progress`, `complete`, or `skipped`.
- Supports **auto-advancement**: completing a later-stage checkpoint auto-advances the session stage.
- All updates logged to Activity Feed and visible in System Logs tab.

---

## 9. Deployment Architecture

Vigil is deployed on Google Cloud using a containerised architecture managed by Terraform.

```mermaid
flowchart TB
    subgraph DEV["Developer Workstation"]
        CODE[Source Code]
        TF[Terraform CLI]
        DOCKER[Docker Build]
    end

    subgraph GCP["Google Cloud Platform"]
        subgraph AR["Artifact Registry"]
            IMAGE[Container Image<br/>Python 3.11 + FastAPI + Dist]
        end

        subgraph CR["Cloud Run"]
            SERVICE[vigil-service<br/>Port 8080]
            ENV[Environment Variables<br/>PROJECT_ID LOCATION<br/>ENABLE_ADK MODEL]
        end

        subgraph VAI["Vertex AI"]
            LIVE_MODEL[gemini-live-2.5-flash-native-audio]
            FLASH_MODEL[gemini-2.5-flash]
        end

        subgraph SEC["Security"]
            WEBRISK_API[Google Web Risk API]
        end

        subgraph IAM_BLOCK["IAM"]
            SA[Service Account<br/>Vertex AI User + Web Risk]
        end
    end

    subgraph USERS["End Users"]
        BROWSER[Web App HTTPS + WSS]
        EXT[Chrome Extension REST]
    end

    CODE --> DOCKER
    DOCKER --> IMAGE
    TF --> SERVICE
    IMAGE --> SERVICE
    SA --> SERVICE
    SERVICE --> BROWSER
    SERVICE --> EXT
    SERVICE --> LIVE_MODEL
    SERVICE --> FLASH_MODEL
    FLASH_MODEL --> WEBRISK_API
```

---

## 10. Shopping Extension — Future Vision

Vigil's 4-layer shield pipeline naturally extends to **safe shopping** with zero new tools — only expanded prompts.

```mermaid
flowchart LR
    subgraph EXISTING["Existing Shield Pipeline"]
        E0[Layer 0: OSINT]
        E1[Layer 1: Web Risk]
        E2[Layer 2: Gemini Vision]
        E3[Layer 3: Search Grounding]
    end

    subgraph SHOPPING["Shopping Protection"]
        S0[Seller Domain Verification]
        S1[Known Scam Store DB]
        S2[Product Page Analysis<br/>Fake deals + AI reviews<br/>+ hidden fees]
        S3[Seller Reputation<br/>Trustpilot + price compare]
    end

    subgraph VOICE_SHOP["Voice Shopping Assist"]
        V1[Is this deal legit?]
        V2[Help me checkout]
        V3[Any hidden fees?]
        V4[Are these reviews real?]
    end

    E0 --> S0
    E1 --> S1
    E2 --> S2
    E3 --> S3
    S2 --> VOICE_SHOP
    S3 --> VOICE_SHOP
```

**Same pipeline, expanded prompts — zero new code needed.**

---

## Appendix: Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vite, Web Components, Web Audio API | Browser UI, audio capture, system logs |
| Extension | Chrome Manifest V3, Content Scripts | Shield auto-scan, DOM capture, annotations |
| Backend | Python 3.11, FastAPI, WebSocket, Uvicorn | API server, session management, tool orchestration |
| AI — Voice | Gemini Live 2.5 Flash Native Audio (Vertex AI) | Real-time bidirectional voice + tool calling |
| AI — Vision | Gemini 2.5 Flash (Vertex AI) | Shield detection, UI navigation, search grounding |
| Security | Google Web Risk API | Known phishing/malware database lookup |
| ADK | Google Agent Development Kit | Multi-agent orchestration (optional mode) |
| Infrastructure | Cloud Run, Docker, Terraform, Artifact Registry | Containerised deployment, IaC |
| Data | JSON files (in-repo), in-memory session store | Knowledge base, reference data, session state |

---

*This document is maintained as part of the Vigil project by KaarTech UK for the Gemini Live Agent Challenge.*
