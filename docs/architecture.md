# Guardian — Architecture Diagrams

> SAP AMS Control Tower with Voice AI Agent "Jessica"

---

## 1. Detailed Architecture Diagram

```mermaid
---
title: "Guardian — SAP AMS Control Tower (Detailed Architecture)"
---
graph LR
    subgraph Browser["Browser — Vite SPA"]
        direction TB
        UI["Web Components UI\n(Home / Session / Summary)"]
        WA["Web Audio API\n(Mic Capture + Playback)"]
        SC["Screen Capture\n(Vision Input)"]
        WSC["WebSocket Client\n(Audio + JSON)"]
        UI --- WA
        UI --- SC
        WA --- WSC
        SC --- WSC
    end

    WSC <-->|"WebSocket /ws\n(bidirectional:\naudio blobs + JSON events)"| WSH

    subgraph CloudRun["Cloud Run — FastAPI Backend"]
        direction TB
        WSH["WebSocket Handler\n(main.py)"]
        SSM["Session State Manager\n(session_state.py)"]
        GL["GeminiLive Client\n(gemini_live.py)"]
        PR["Jessica Persona\n(prompts.py)"]
        RCA["RCA Generator\n(Transcript + RCA Downloads)"]

        WSH --- SSM
        WSH --- GL
        GL --- PR
        SSM --- RCA

        subgraph Tools["8 Backend Tools"]
            direction TB
            T1["search_knowledge_base"]
            T2["lookup_sap_error"]
            T3["lookup_transaction_code"]
            T4["diagnose_sap_issue"]
            T5["create_issue"]
            T6["create_itsm_ticket"]
            T7["update_itsm_ticket"]
            T8["research_sap_topic"]
        end

        GL --> Tools
    end

    subgraph GCP["Google Cloud Platform"]
        direction TB
        GEMINI["Gemini Live API\ngemini-live-2.5-flash-native-audio\n(Voice + Vision)"]
        FLASH["Gemini Flash\ngemini-2.5-flash\n(+ Google Search Grounding)"]
        VERTEX["Vertex AI"]
    end

    GL <-->|"Live API\n(streaming audio + tool calls)"| GEMINI
    T8 -->|"search grounding"| FLASH
    GEMINI --- VERTEX
    FLASH --- VERTEX

    subgraph DataStores["Data Stores"]
        direction TB
        KB["Local JSON\nKnowledge Base\n(sap_knowledge_base.json)"]
        REF["SAP Reference Data\n(sap_reference.json)"]
        CROSS["Cross-Reference\nEngine"]
        ISSUES["Issue Tracker\n(in-memory)"]
        ITSM["ITSM System\n(in-memory)"]
    end

    T1 --> KB
    T2 --> REF
    T3 --> REF
    T4 --> CROSS
    CROSS --> KB
    CROSS --> REF
    T5 --> ISSUES
    T6 --> ITSM
    T7 --> ITSM

    subgraph Downloads["User Downloads"]
        DL1["Transcript (.txt)"]
        DL2["RCA Report (.txt)"]
    end

    RCA --> Downloads

    %% Styling
    classDef browserStyle fill:#4285F4,stroke:#1a73e8,color:#fff,stroke-width:2px
    classDef serverStyle fill:#34A853,stroke:#1e8e3e,color:#fff,stroke-width:2px
    classDef gcpStyle fill:#FBBC04,stroke:#f9ab00,color:#333,stroke-width:2px
    classDef toolStyle fill:#EA4335,stroke:#d93025,color:#fff,stroke-width:1px
    classDef dataStyle fill:#9C27B0,stroke:#7B1FA2,color:#fff,stroke-width:1px
    classDef downloadStyle fill:#607D8B,stroke:#455A64,color:#fff,stroke-width:1px

    class UI,WA,SC,WSC browserStyle
    class WSH,SSM,GL,PR,RCA serverStyle
    class GEMINI,FLASH,VERTEX gcpStyle
    class T1,T2,T3,T4,T5,T6,T7,T8 toolStyle
    class KB,REF,CROSS,ISSUES,ITSM dataStyle
    class DL1,DL2 downloadStyle
```

---

## 2. Presentation Diagram (Demo-Friendly)

```mermaid
---
title: "Guardian — SAP AMS Control Tower"
---
graph LR
    USER["fa:fa-user SAP Consultant\n(Browser)"]

    subgraph Frontend["Frontend — Vite SPA"]
        APP["Voice Chat + Screen Share\n+ Live Transcript"]
    end

    subgraph Backend["Backend — Cloud Run"]
        API["FastAPI\nWebSocket Server"]
        TOOLS["8 AI Tools\n(KB Search, SAP Lookup,\nDiagnosis, ITSM, Research)"]
        STATE["Session State\n+ RCA Generator"]
        API --- TOOLS
        API --- STATE
    end

    subgraph AI["Google Cloud AI"]
        GEMINI["Gemini Live\n(Voice + Vision)"]
        SEARCH["Gemini Flash\n+ Google Search"]
    end

    subgraph Data["Data Layer"]
        SAP["SAP Knowledge Base\n+ Reference Data"]
        ITSM["Issue Tracker\n+ ITSM System"]
    end

    USER <-->|"Speak / Share Screen"| APP
    APP <-->|"WebSocket\n(Audio + JSON)"| API
    API <-->|"Live API\n(Streaming)"| GEMINI
    TOOLS -->|"Grounded Search"| SEARCH
    TOOLS --> SAP
    TOOLS --> ITSM
    STATE -->|"Download"| USER

    %% Styling
    classDef userStyle fill:#1a73e8,stroke:#0d47a1,color:#fff,stroke-width:3px,font-size:16px
    classDef frontendStyle fill:#4285F4,stroke:#1a73e8,color:#fff,stroke-width:2px
    classDef backendStyle fill:#34A853,stroke:#1e8e3e,color:#fff,stroke-width:2px
    classDef aiStyle fill:#FBBC04,stroke:#f9ab00,color:#333,stroke-width:2px
    classDef dataStyle fill:#9C27B0,stroke:#7B1FA2,color:#fff,stroke-width:2px

    class USER userStyle
    class APP frontendStyle
    class API,TOOLS,STATE backendStyle
    class GEMINI,SEARCH aiStyle
    class SAP,ITSM dataStyle
```

---

## Diagram Legend

| Color | Component |
|-------|-----------|
| Blue | Browser / Frontend |
| Green | Backend (FastAPI on Cloud Run) |
| Yellow | Google Cloud AI (Gemini Live, Gemini Flash) |
| Red | Backend Tools (8 function tools) |
| Purple | Data Stores (JSON KB, SAP Reference, ITSM) |
| Grey | User Downloads (Transcript, RCA Report) |

## Tool Reference

| # | Tool | Target | Purpose |
|---|------|--------|---------|
| 1 | `search_knowledge_base` | Local JSON KB | Search SAP knowledge articles |
| 2 | `lookup_sap_error` | SAP Reference Data | Look up SAP error codes |
| 3 | `lookup_transaction_code` | SAP Reference Data | Look up SAP t-codes |
| 4 | `diagnose_sap_issue` | Cross-reference engine | Cross-reference KB + errors for diagnosis |
| 5 | `create_issue` | Issue Tracker (in-memory) | Log a new issue |
| 6 | `create_itsm_ticket` | ITSM System (in-memory) | Create an ITSM ticket |
| 7 | `update_itsm_ticket` | ITSM System | Update existing ITSM ticket |
| 8 | `research_sap_topic` | Gemini Flash + Google Search | Web-grounded research on SAP topics |
