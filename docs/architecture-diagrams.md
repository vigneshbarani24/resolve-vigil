# Vigil — Architecture Diagrams

**Vigil** is an AI-powered scam shield + voice-first IT support platform. The Chrome extension silently scans every page with a 5-layer detection pipeline (OSINT + Web Risk + Gemini Vision + Google Search + Content Claim Verification). When threats are found, it warns users with banners and danger zone annotations. Voice-first IT support extends the same Gemini-powered architecture to enterprise helpdesk with 4 ADK agents and 16 tools.

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Browser"
        EXT[Chrome Extension<br/>Manifest V3]
        POPUP[Popup — Shield + Voice<br/>+ Activity Log]
        BG[Background Service Worker<br/>Auto-scan + Badge + Cache]
        CS[Content Script<br/>DOM Capture + Annotations<br/>+ Shield Banner + Danger Zones]
        UI[Web App — Vite + Web Components]
        WA[Web Audio API<br/>AudioWorklet Processors]
    end

    subgraph "Google Cloud Platform"
        subgraph "Cloud Run"
            FASTAPI[FastAPI Server]
            GM[GeminiLive Wrapper]
            TR[Tool Registry — 16 Tools]
            SHIELD[Shield Analyzer<br/>4-Layer Pipeline]
            NAV[UI Navigator<br/>Gemini Vision]
            AF[Activity Feed]
            SM[Session State Manager]
        end

        subgraph "Vertex AI"
            FLASH[Gemini 2.5 Flash<br/>Vision + Search Grounding]
            LIVE[Gemini Live 2.5 Flash<br/>Native Audio]
        end

        subgraph "Security APIs"
            WEBRISK[Google Web Risk API<br/>Phishing / Malware DB]
            GSEARCH[Google Search<br/>Grounding]
        end
    end

    subgraph "Data Layer"
        KB[(IT Knowledge Base)]
        REF[(Reference Data)]
        ITSM_STORE[(ITSM Ticket Store)]
    end

    %% Shield flow (primary)
    BG -- "POST /api/shield" --> SHIELD
    CS -- "Screenshot + DOM" --> BG
    SHIELD --> WEBRISK
    SHIELD -- "Layer 2: Vision" --> FLASH
    SHIELD -- "Layer 3: Grounding" --> GSEARCH

    %% Voice flow
    POPUP -- "WebSocket (voice)" --> FASTAPI
    UI --> WA
    WA -- "WebSocket /ws" --> FASTAPI
    FASTAPI --> GM
    GM -- "Live API Bidi Stream" --> LIVE
    GM --> TR
    TR --> KB
    TR --> REF
    TR --> ITSM_STORE

    %% UI Navigation
    TR -- "navigate_user_browser" --> NAV
    NAV -- "Page Analysis" --> FLASH
    NAV -- "Annotations" --> CS
```

**Key points:**
- The Chrome extension is the **primary interface** — auto-scans every page via the shield pipeline.
- Voice sessions can be started from the extension popup or the web app.
- Shield scans use Gemini Flash (not the Live session) for vision analysis and search grounding.
- Voice-driven UI navigation flows: voice → tool call → extension → Gemini Vision → annotations.

---

## 2. Vigil Shield — 4-Layer Detection Pipeline

The core innovation. A cascading pipeline with smart gating to minimize latency for safe sites and eliminate false positives via de-escalation.

```mermaid
flowchart TB
    START([Page Navigation Detected]) --> L0

    subgraph L0["Layer 0: OSINT Domain Analysis — instant"]
        O1[TLD Reputation Scoring]
        O2[Typosquatting Detection]
        O3[Brand Impersonation Check]
        O4[Known-Safe Whitelist<br/>50+ verified domains]
        O5[Domain Length + Entropy Analysis]
    end

    L0 --> L0_OUT[Domain Score 0-100 + Flags]
    L0_OUT --> L1

    subgraph L1["Layer 1: Google Web Risk API — ~100ms"]
        W1[SOCIAL_ENGINEERING]
        W2[MALWARE]
        W3[UNWANTED_SOFTWARE]
    end

    L1 --> L1_CHECK{Web Risk match?}
    L1_CHECK -- "Yes" --> IMMEDIATE[Immediate HIGH or CRITICAL<br/>Red banner + badge]
    L1_CHECK -- "No" --> L2

    subgraph L2["Layer 2: Gemini Vision Analysis — ~3s"]
        V1[Screenshot Analysis]
        V2[DOM Structure Analysis]
        V3[Fake Login Detection]
        V4[Visual Brand Cloning]
        V5[Urgency Scam Tactics]
        V6[AI Content Detection]
    end

    L2 --> L2_CHECK{Threat level >= medium?}
    L2_CHECK -- "No" --> SAFE_OUT([SAFE — Green Badge])
    L2_CHECK -- "Yes" --> L3

    subgraph L3["Layer 3: Search Grounding — ~2s"]
        S1[Domain reputation search]
        S2[Scam report cross-reference]
        S3[CAN DE-ESCALATE<br/>if site is legitimate]
    end

    L3 --> L4_CHECK{Content claims<br/>third-party brands?}
    L4_CHECK -- "No" --> VERDICT([Final Verdict])
    L4_CHECK -- "Yes" --> L4

    subgraph L4["Layer 4: Content Claim Verification — ~2s"]
        C1[Detect brand claims in content]
        C2["Check official domain<br/>(e.g. qatarairways.com)"]
        C3[Cross-reference Reuters/BBC/AP]
        C4[Result: verified / unverified / debunked]
    end

    L4 --> VERDICT

    VERDICT --> BADGE[Chrome Badge per-tab]
    VERDICT --> BANNER[Page Banner for medium+]
    VERDICT --> DANGER[Danger Zone Annotations]
    VERDICT --> CACHE[Tab Scan Cache]
    IMMEDIATE --> BADGE
    IMMEDIATE --> BANNER
```

**Pipeline mechanics:**
- **Layer 0** is pure heuristic — no API calls. Known-safe whitelist prevents false positives on Google, GitHub, Amazon, etc.
- **Layer 1** catches known threats from Google's databases (~100ms).
- **Layer 2** is deep analysis — Gemini Vision examines actual page content for visual scams + deepfake/AI detection.
- **Layer 3** only triggers when Layer 2 flags something — minimizing latency for safe sites.
- **Layer 4** verifies content claims against official sources — e.g. "Qatar Airways flight disruption" on Reddit → checks qatarairways.com + Reuters/BBC/AP.
- **Smart de-escalation**: Layers 3 and 4 can LOWER the threat level if verification confirms legitimacy.

---

## 3. Google ADK Multi-Agent Architecture (4 Agents, 16 Tools)

Hierarchical multi-agent orchestration using Google's Agent Development Kit. The voice interface (Theepa) delegates to the shield engine (Vigil) for security analysis.

```mermaid
flowchart TB
    subgraph ADK["Google ADK Runtime"]
        subgraph ROOT["Theepa — root_agent (THE VOICE)"]
            MODEL_R[Model: gemini-2.5-flash]

            subgraph IT_TOOLS["8 IT Helpdesk FunctionTools"]
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

        subgraph VIGIL["Vigil Sub-Agent — Shield Engine"]
            MODEL_V[Model: gemini-2.5-flash]
            VPROMPT[Vigil Persona: cybersecurity analyst]

            subgraph SHIELD_TOOLS["7 Shield FunctionTools"]
                V1[scan_url_safety]
                V2[check_domain_reputation]
                V3[analyze_page_for_threats]
                V4[verify_domain_legitimacy]
                V5[detect_fake_content]
                V6[report_threat]
                V7[highlight_danger_zones]
            end

            subgraph THREAT_INTEL["Threat Intel Sub-Agent"]
                MODEL_S2[Model: gemini-2.5-flash]
                GS2[google_search<br/>scam/fact verification]
            end
        end

        subgraph RESEARCHER["Researcher Sub-Agent"]
            MODEL_S1[Model: gemini-2.5-flash]
            GS1[google_search<br/>IT research]
        end
    end

    USER[User Query] --> ROOT
    ROOT -- "Security / scam / fact-check" --> VIGIL
    ROOT -- "IT research queries" --> RESEARCHER
    VIGIL -- "Domain reputation / fact-check" --> THREAT_INTEL
    VIGIL -- "Shield findings" --> ROOT
    RESEARCHER -- "Search results" --> ROOT
    ROOT --> RESPONSE[Theepa speaks the result]
```

**Key points:**
- **4 agents**: Theepa (voice interface), Vigil (shield engine), Researcher (IT search), Threat Intel (scam search)
- **16 tools total**: 7 shield + 8 IT helpdesk + 1 google_search grounding
- ADK's `google_search` cannot coexist with other tools — requires separate sub-agents.
- Theepa is the single voice — Vigil returns structured findings, Theepa speaks them.
- Every agent transfer and tool call is logged to the activity feed.

---

## 4. Shield Scan Flow (Extension → Backend → Response)

```mermaid
sequenceDiagram
    participant Page as Web Page
    participant CS as Content Script
    participant BG as Background Worker
    participant Server as FastAPI Server
    participant OSINT as OSINT Layer
    participant WebRisk as Web Risk API
    participant Vision as Gemini Vision
    participant Search as Google Search
    participant Claims as Claim Verifier

    Page->>BG: Navigation detected (onUpdated)
    BG->>BG: Wait 1.5s for page render
    BG->>BG: Set badge "..." (scanning)

    BG->>CS: captureVisibleTab (screenshot)
    BG->>CS: capture_dom (150 elements)
    CS-->>BG: Screenshot + DOM summary

    BG->>Server: POST /api/shield

    Server->>OSINT: Domain heuristics
    OSINT-->>Server: Score 0-100 + flags

    Server->>WebRisk: Check URL
    WebRisk-->>Server: Threat matches (or none)

    alt Web Risk match
        Server-->>BG: CRITICAL — immediate
    else No match, proceed to Vision
        Server->>Vision: Screenshot + DOM + prompt
        Vision-->>Server: Threat analysis JSON

        alt Threat >= medium
            Server->>Search: Domain reputation search
            Search-->>Server: Scam reports / legitimacy
            Note over Search: Can DE-ESCALATE if legit
        end

        alt Content references third-party brand
            Server->>Claims: Verify claims vs official source
            Claims-->>Server: verified / unverified / debunked
            Note over Claims: e.g. "Qatar Airways" on Reddit → check qatarairways.com
        end
    end

    Server-->>BG: Final verdict + findings

    BG->>BG: Update badge (green/red)
    BG->>BG: Cache result per tab
    BG->>CS: show_shield_banner (if threat)
    CS->>Page: Render warning banner
```

---

## 5. Voice-Driven UI Navigation Flow

The architectural differentiator: **UI navigation is voice-driven, not text-driven**. The user speaks, the agent calls a tool, the extension captures the page, Gemini Vision analyzes it, and annotations appear on the page.

```mermaid
sequenceDiagram
    participant User
    participant Agent as Gemini Live
    participant Server as FastAPI Server
    participant Navigator as UI Navigator
    participant Flash as Gemini 2.5 Flash
    participant Extension as Chrome Extension
    participant Page as Web Page

    User->>Agent: "I can't find the upload button"

    Agent->>Server: tool_call: navigate_user_browser<br/>guidance: Find the upload button

    Server->>Extension: Request page capture

    Extension->>Page: captureVisibleTab (JPEG screenshot)
    Extension->>Page: querySelectorAll interactive elements<br/>150 elements with bounding rects

    Extension-->>Server: Screenshot base64 + DOM summary

    Server->>Navigator: analyze_page_screenshot

    Navigator->>Flash: Multimodal request<br/>Image + DOM elements + guidance
    Flash-->>Navigator: Structured JSON response<br/>type: highlight, selector: #upload-btn<br/>label: Click this button

    Navigator-->>Server: Actions list + explanation

    Server->>Extension: render_annotations with actions

    Extension->>Page: Create pulsing overlay<br/>on upload button with<br/>step number badge + label

    Server-->>Agent: Tool result — Visual guidance sent

    Agent-->>User: "I've highlighted the upload button —<br/>it's the blue button in the top right"
```

**Key points:**
- The Chrome extension has **no text input** for UI help. All navigation flows through voice.
- The content script captures up to 150 interactive elements with bounding rects, selectors, and attributes.
- Gemini Vision cross-references the screenshot with the DOM summary for precise targeting.
- Annotations include pulsing overlays, step number badges, and action labels.
- The extension can auto-execute actions: `click()`, `fill()`, `scroll()`.

---

## 6. Real-Time Voice Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant WebAudio as Audio Capture
    participant WS as WebSocket
    participant FastAPI
    participant GeminiLive as Gemini Live API
    participant Speaker as Audio Output

    User->>Browser: Speaks into microphone
    Browser->>WebAudio: Capture PCM audio (16kHz)
    WebAudio->>WS: Send audio bytes (binary)

    WS->>FastAPI: Binary audio frames
    FastAPI->>GeminiLive: send_realtime_input(audio)

    GeminiLive-->>FastAPI: model_turn (PCM audio response)
    GeminiLive-->>FastAPI: input_transcription
    GeminiLive-->>FastAPI: output_transcription

    FastAPI-->>WS: Binary audio + JSON events
    WS-->>Browser: Audio bytes + transcript
    Browser->>WebAudio: Decode and play
    WebAudio->>Speaker: Agent's voice response
```

- Audio flows as raw PCM bytes — no HTTP overhead.
- Model: `gemini-live-2.5-flash-native-audio` — native speech-to-speech.
- 20+ languages supported natively.
- Voice works from both the web app AND the Chrome extension popup.

---

## 7. Tool Orchestration Flow

```mermaid
sequenceDiagram
    participant User
    participant Agent as Gemini Live
    participant Registry as Tool Registry
    participant Handler as Tool Handler
    participant Session as Session State
    participant Frontend

    User->>Agent: "Is this page safe?"

    Agent->>Registry: tool_call: scan_url_safety

    Registry->>Handler: Execute scan_url_safety
    Handler->>Handler: OSINT → Web Risk → Vision → Search
    Handler-->>Registry: Return threat analysis

    Handler->>Session: Log to activity feed

    Registry-->>Agent: FunctionResponse with result

    Agent-->>Frontend: Emit tool_call event
    Agent-->>User: Voice — "I've scanned this page...<br/>all 4 security layers passed."
```

---

## 8. Four-Stage Diagnostic Pipeline (IT Support)

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
        r1 --> r2
        r2 --> r3
    }

    Resolution --> [*]
```

---

## 9. Deployment Architecture

```mermaid
flowchart TB
    subgraph DEV["Developer"]
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
        end

        subgraph VAI["Vertex AI"]
            LIVE_MODEL[gemini-live-2.5-flash-native-audio]
            FLASH_MODEL[gemini-2.5-flash]
        end

        subgraph SEC["Security"]
            WEBRISK_API[Google Web Risk API]
        end

        SA[Service Account<br/>Vertex AI User + Web Risk]
    end

    subgraph USERS["End Users"]
        BROWSER[Web App — HTTPS + WSS]
        EXT[Chrome Extension — REST + WS]
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
    SERVICE --> WEBRISK_API
```

---

## 10. Future Vision — Mobile-Native Vigil

```mermaid
flowchart LR
    subgraph CURRENT["Current: Chrome Extension"]
        E0[OSINT] --> E1[Web Risk] --> E2[Vision] --> E3[Search]
    end

    subgraph MOBILE["Mobile: OS-Level Shield"]
        M0[App-level URL interception]
        M1[Background shield service]
        M2[Push notification alerts]
        M3[Voice assistant integration]
    end

    subgraph SHOPPING["Shopping Protection"]
        S1[Seller verification]
        S2[Fake review detection]
        S3[Price comparison]
        S4[Hidden fee detection]
    end

    CURRENT --> MOBILE
    CURRENT --> SHOPPING
    MOBILE --> PLATFORM[Vigil Platform Service<br/>Every device ships with this]
    SHOPPING --> PLATFORM
```

**Same pipeline, expanded surfaces — the real vision is Vigil as a platform service protecting every device.**

---

## Appendix: Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Chrome Extension | Manifest V3, Content Scripts | Shield auto-scan, DOM capture, annotations, voice |
| Frontend | Vite, Web Components, Web Audio API | Browser UI, audio capture, system logs |
| Backend | Python 3.11, FastAPI, WebSocket, Uvicorn | API server, session management, tool orchestration |
| AI — Shield | Gemini 2.5 Flash (Vertex AI) | Vision analysis, search grounding, fake content detection |
| AI — Voice | Gemini Live 2.5 Flash Native Audio | Real-time bidirectional voice + tool calling |
| Security | Google Web Risk API | Known phishing/malware database lookup |
| ADK | Google Agent Development Kit | Multi-agent orchestration (4 agents, 16 tools) |
| Infrastructure | Cloud Run, Docker, Terraform | Containerized deployment, IaC |

---

*Vigil — 5-layer scam shield + voice-first IT support. Built solo for the Gemini Live Agent Challenge.*
