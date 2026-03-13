# Guardian — Technical Architecture & Data Flow

> Confidential — KaarTech UK | Do not distribute

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GUARDIAN CONTROL TOWER                             │
│                     Real-Time SAP AMS Agent Platform                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────────────────────────────────────────┐  │
│  │   CLIENT      │     │              GUARDIAN CORE ENGINE                │  │
│  │   LAYER       │     │                                                  │  │
│  │  ┌──────────┐ │     │  ┌────────────┐  ┌────────────┐  ┌───────────┐  │  │
│  │  │ Voice    │ │ WS  │  │ Session    │  │ Agentic    │  │ Tool      │  │  │
│  │  │ Pipeline │◄├─────┤► │ Orchestr.  │─►│ Reasoning  │─►│ Orchestr. │  │  │
│  │  │ (Codec)  │ │Bidi │  │            │  │ Loop (ARL) │  │ Framework │  │  │
│  │  └──────────┘ │     │  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘  │  │
│  │  ┌──────────┐ │     │        │               │               │         │  │
│  │  │ Multi-   │ │     │  ┌─────▼──────┐  ┌─────▼──────┐  ┌────▼──────┐  │  │
│  │  │ modal    │ │     │  │ State      │  │ SLM        │  │ 8-Tool    │  │  │
│  │  │ Input    │ │     │  │ Machine    │  │ Engine     │  │ Registry  │  │  │
│  │  │ (V+A+T)  │ │     │  │            │  │            │  │           │  │  │
│  │  └──────────┘ │     │  └────────────┘  └────────────┘  └───────────┘  │  │
│  │  ┌──────────┐ │     │                                                  │  │
│  │  │ Insight  │ │     │  ┌────────────┐  ┌────────────┐  ┌───────────┐  │  │
│  │  │ Panels   │ │◄────┤  │ Sentiment  │  │ Entity     │  │ Neural    │  │  │
│  │  │ (4 tabs) │ │ SSE │  │ Classifier │  │ Extractor  │  │ Voice Gen │  │  │
│  │  └──────────┘ │     │  └────────────┘  └────────────┘  └───────────┘  │  │
│  └──────────────┘     └──────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     DATA & INTEGRATION LAYER                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │   │
│  │  │ SAP KB    │  │ Error     │  │ ITSM      │  │ Web Intelligence │  │   │
│  │  │ Index     │  │ Reference │  │ Connector │  │ (Search Ground.) │  │   │
│  │  │ (500+)    │  │ Database  │  │           │  │                  │  │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     INFRASTRUCTURE LAYER                             │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │   │
│  │  │ Container │  │ Auto-     │  │ TLS 1.3   │  │ Session          │  │   │
│  │  │ Runtime   │  │ Scaling   │  │ Termination│  │ Affinity         │  │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └──────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture (9 Building Blocks)

```
┌─────────────────────────────────────────────────────────────────┐
│                    GUARDIAN COMPONENT MAP                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  C1: BIDIRECTIONAL VOICE PIPELINE                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │    │
│  │  │ PCM16    │  │ Audio    │  │ VAD      │  │ Barge-  │ │    │
│  │  │ Capture  │─►│ Worklet  │─►│ Engine   │─►│ In Ctrl │ │    │
│  │  │ @16kHz   │  │ (WASM)   │  │          │  │         │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  C2: SPECIALIZED LANGUAGE MODEL (SLM) ENGINE             │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │ Domain-tuned reasoning core                       │   │    │
│  │  │ ┌──────────┐  ┌──────────┐  ┌────────────────┐  │   │    │
│  │  │ │ SAP      │  │ ITSM     │  │ Diagnostic     │  │   │    │
│  │  │ │ Domain   │  │ Workflow  │  │ Protocol       │  │   │    │
│  │  │ │ Context  │  │ Context  │  │ Context        │  │   │    │
│  │  │ └──────────┘  └──────────┘  └────────────────┘  │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  C3: AGENTIC REASONING LOOP (ARL)                        │    │
│  │                                                           │    │
│  │  ┌────────┐   ┌─────────┐   ┌─────────┐   ┌──────────┐ │    │
│  │  │OBSERVE │──►│ ORIENT  │──►│ DECIDE  │──►│ ACT      │ │    │
│  │  │        │   │         │   │         │   │          │ │    │
│  │  │Capture │   │Classify │   │Select   │   │Execute   │ │    │
│  │  │user    │   │intent,  │   │tools,   │   │tool call │ │    │
│  │  │input + │   │map to   │   │plan     │   │or voice  │ │    │
│  │  │screen  │   │protocol │   │response │   │response  │ │    │
│  │  └────────┘   └─────────┘   └─────────┘   └────┬─────┘ │    │
│  │       ▲                                         │        │    │
│  │       └─────────────── FEEDBACK ────────────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  C4: MULTIMODAL PERCEPTION ENGINE                        │    │
│  │                                                           │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │    │
│  │  │ AUDIO    │  │ VISION   │  │ TEXT     │               │    │
│  │  │ Stream   │  │ Stream   │  │ Stream   │               │    │
│  │  │          │  │          │  │          │               │    │
│  │  │ Voice    │  │ Screen   │  │ Chat     │               │    │
│  │  │ input    │  │ capture  │  │ input    │               │    │
│  │  │ @16kHz   │  │ @1fps    │  │ UTF-8    │               │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘               │    │
│  │       └──────────────┼─────────────┘                     │    │
│  │                ┌─────▼─────┐                              │    │
│  │                │ UNIFIED   │                              │    │
│  │                │ CONTEXT   │                              │    │
│  │                │ WINDOW    │                              │    │
│  │                └───────────┘                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  C5: TOOL ORCHESTRATION FRAMEWORK                        │    │
│  │                                                           │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │           TOOL DISPATCH ENGINE                   │    │    │
│  │  │  ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │    │    │
│  │  │  │Parallel │ │Dependency│ │Fallback           │ │    │    │
│  │  │  │Executor │ │Chainer   │ │Router             │ │    │    │
│  │  │  └─────────┘ └──────────┘ └──────────────────┘ │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                           │    │
│  │  ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌────┐│    │
│  │  │KB    ││Error ││T-Code││Diag- ││Issue ││ITSM  ││Web ││    │
│  │  │Search││Lookup││Ref   ││nosis ││Track ││Mgmt  ││Res.││    │
│  │  │      ││      ││      ││Engine││      ││      ││    ││    │
│  │  └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘└────┘│    │
│  │     T1      T2      T3      T4      T5     T6/T7   T8  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  C6: LIVE SENTIMENT & INTENT CLASSIFIER                  │    │
│  │                                                           │    │
│  │  INPUT ──► ┌──────────────┐ ──► SENTIMENT TAG            │    │
│  │  (text)    │ Pattern      │     (frustrated/confused/     │    │
│  │            │ Classifier   │      urgent/calm/neutral)     │    │
│  │            └──────┬───────┘                               │    │
│  │                   │                                       │    │
│  │            ┌──────▼───────┐ ──► ENTITY EXTRACTION         │    │
│  │            │ NER          │     (user, T-code, error,     │    │
│  │            │ Extractor    │      module, org data)        │    │
│  │            └──────────────┘                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  C7: SESSION STATE MACHINE                               │    │
│  │                                                           │    │
│  │  ┌───────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐  │    │
│  │  │INIT   │─►│TRIAGE  │─►│DIAGNOSE  │─►│RESOLVE /     │  │    │
│  │  │       │  │        │  │          │  │ESCALATE      │  │    │
│  │  │Connect│  │Collect │  │Tool blitz│  │Fix or RCA    │  │    │
│  │  │Auth   │  │Mandatory│  │Guided   │  │handover      │  │    │
│  │  │Setup  │  │Info    │  │checks   │  │              │  │    │
│  │  └───────┘  └────────┘  └──────────┘  └──────┬───────┘  │    │
│  │                                               │          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────▼────────┐ │    │
│  │  │ Ticket       │  │ Transcript   │  │ CSAT / Close   │ │    │
│  │  │ Lifecycle    │  │ Accumulator  │  │                │ │    │
│  │  └──────────────┘  └──────────────┘  └────────────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  C8: ITSM INTEGRATION LAYER                              │    │
│  │                                                           │    │
│  │  CREATE ──► TRACK ──► UPDATE ──► RESOLVE / ESCALATE      │    │
│  │    │          │          │              │                  │    │
│  │    ▼          ▼          ▼              ▼                  │    │
│  │  [INC-ID]  [Status]  [Notes]    [RCA Package → L2]       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  C9: MULTILINGUAL NEURAL VOICE SYNTHESIS                  │    │
│  │                                                           │    │
│  │  SLM Output ──► Language Router ──► Voice Profile ──► PCM │    │
│  │                 (20 languages)      (Jessica)       Output│    │
│  │                                     Neural voice          │    │
│  │                                     Natural cadence       │    │
│  │                                     SAP term preservation │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow — Full Session Lifecycle

```
                              GUARDIAN DATA FLOW
                         Session Lifecycle (5 min max)

    USER                    CLIENT                   SERVER                  AI ENGINE
     │                        │                        │                        │
     │  1. Click "Start"      │                        │                        │
     │───────────────────────►│                        │                        │
     │                        │  2. POST /api/auth     │                        │
     │                        │───────────────────────►│                        │
     │                        │  3. {session_token}    │                        │
     │                        │◄───────────────────────│                        │
     │                        │                        │                        │
     │                        │  4. WSS /ws?token=T    │                        │
     │                        │═══════════════════════►│                        │
     │                        │                        │  5. Open AI Session    │
     │                        │  6. WS: setup{         │  ──────────────────────►
     │                        │    config, tools,      │     SLM + Tools        │
     │                        │    voice, lang}        │     initialized        │
     │                        │───────────────────────►│                        │
     │                        │                        │  7. Register 8 tools   │
     │                        │  8. setupComplete      │◄──────────────────────│
     │                        │◄═══════════════════════│                        │
     │                        │                        │                        │
     ├────────────────────────┼────────────────────────┼────────────────────────┤
     │                   CONVERSATION LOOP (bidirectional)                      │
     ├────────────────────────┼────────────────────────┼────────────────────────┤
     │                        │                        │                        │
     │  9. Speak / Type       │                        │                        │
     │───────────────────────►│ 10. PCM16 @16kHz       │                        │
     │                        │    (binary frames)     │ 11. Stream to SLM      │
     │                        │═══════════════════════►│───────────────────────►│
     │                        │                        │                        │
     │                        │                        │ 12. Input transcription │
     │                        │ 13. inputTranscription │◄──────────────────────│
     │                        │◄═══════════════════════│                        │
     │                        │                        │                        │
     │  [Screenshot]          │                        │                        │
     │───────────────────────►│ 14. base64 image       │ 15. Vision analysis    │
     │                        │═══════════════════════►│───────────────────────►│
     │                        │                        │                        │
     │                        │                        │ 16. ARL decides:       │
     │                        │                        │     TOOL_CALL          │
     │                        │                        │◄──────────────────────│
     │                        │                        │                        │
     │                        │                        │ 17. Execute tool(s)    │
     │                        │                        │     ┌──────────────┐   │
     │                        │                        │     │ KB Search    │   │
     │                        │                        │     │ Error Lookup │   │
     │                        │                        │     │ T-Code Ref   │   │
     │                        │                        │     └──────┬───────┘   │
     │                        │                        │            │           │
     │                        │ 18. tool_call event    │◄───────────┘           │
     │  [Activity panel]      │◄═══════════════════════│                        │
     │◄───────────────────────│                        │                        │
     │                        │                        │ 19. Tool results       │
     │                        │                        │     → SLM for          │
     │                        │                        │     reasoning          │
     │                        │                        │───────────────────────►│
     │                        │                        │                        │
     │                        │                        │ 20. Audio response     │
     │                        │ 21. binary audio       │◄──────────────────────│
     │  [Hear Jessica]        │◄═══════════════════════│                        │
     │◄───────────────────────│                        │                        │
     │                        │                        │                        │
     │                        │ 22. outputTranscription │                       │
     │  [See transcript]      │◄═══════════════════════│                        │
     │◄───────────────────────│                        │                        │
     │                        │                        │                        │
     │                        │ 23. turnComplete       │                        │
     │                        │◄═══════════════════════│                        │
     │                        │                        │                        │
     │  [Sentiment + Info     │                        │                        │
     │   extracted client-    │                        │                        │
     │   side from transcript]│                        │                        │
     │                        │                        │                        │
     ├────────────────────────┼────────────────────────┼────────────────────────┤
     │                  TICKET LIFECYCLE (autonomous)                           │
     ├────────────────────────┼────────────────────────┼────────────────────────┤
     │                        │                        │                        │
     │                        │                        │ 24. ARL decides:       │
     │                        │                        │     create_itsm_ticket │
     │                        │                        │◄──────────────────────│
     │                        │                        │                        │
     │                        │ 25. tool_call:         │ 26. Generate ticket    │
     │                        │     create_itsm_ticket │     INC-XXXXXXXX       │
     │  [Ticket Created card] │◄═══════════════════════│                        │
     │◄───────────────────────│                        │                        │
     │                        │                        │                        │
     │                        │                        │  ... resolution loop   │
     │                        │                        │                        │
     │                        │                        │ 27. ARL decides:       │
     │                        │                        │     update_itsm_ticket │
     │                        │                        │     status=Resolved    │
     │                        │                        │     OR escalate→L2     │
     │  [Ticket Updated card] │◄═══════════════════════│                        │
     │◄───────────────────────│                        │                        │
     │                        │                        │                        │
     ├────────────────────────┼────────────────────────┼────────────────────────┤
     │                    SESSION END                                           │
     ├────────────────────────┼────────────────────────┼────────────────────────┤
     │                        │                        │                        │
     │                        │ 28. WS close / timeout │                        │
     │                        │◄═══════════════════════│                        │
     │                        │                        │                        │
     │  29. CSAT overlay      │                        │                        │
     │  (1-5 stars + comment) │                        │                        │
     │───────────────────────►│                        │                        │
     │                        │                        │                        │
     │                        │ 30. GET /api/session/  │                        │
     │  31. Summary view      │     {token}/summary    │                        │
     │  (RCA + Transcript     │◄───────────────────────│                        │
     │   downloads available) │                        │                        │
     │◄───────────────────────│                        │                        │
     │                        │                        │                        │
```

---

## 4. Tool Orchestration — Parallel Execution Model

```
    USER SAYS: "I'm getting error VG088 in VA01"

    ┌─────────────────────────────────────────────────────────┐
    │              AGENTIC REASONING LOOP (ARL)                │
    │                                                          │
    │  INPUT: error_code=VG088, tcode=VA01, module=SD          │
    │                                                          │
    │  DECISION: Fire parallel tool blitz                      │
    │                                                          │
    │  ┌──────────────────────────────────────────────────┐   │
    │  │            PARALLEL EXECUTION BATCH 1             │   │
    │  │                                                    │   │
    │  │  ┌────────────────┐  ┌────────────────┐           │   │
    │  │  │ T1: KB Search  │  │ T2: Error      │           │   │
    │  │  │ query="VG088   │  │ Lookup         │           │   │
    │  │  │  VA01 SD"      │  │ code="VG088"   │           │   │
    │  │  │                │  │                │           │   │
    │  │  │ → 3 articles   │  │ → Error detail │           │   │
    │  │  │   with fixes   │  │   + root cause │           │   │
    │  │  └────────────────┘  └────────────────┘           │   │
    │  │                                                    │   │
    │  │  ┌────────────────┐  ┌────────────────┐           │   │
    │  │  │ T3: T-Code Ref │  │ T8: Web Intel  │           │   │
    │  │  │ tcode="VA01"   │  │ query="SAP     │           │   │
    │  │  │                │  │  VG088 OSS"    │           │   │
    │  │  │ → Field map,   │  │                │           │   │
    │  │  │   nav path     │  │ → Latest notes │           │   │
    │  │  └────────────────┘  └────────────────┘           │   │
    │  └──────────────────────────────────────────────────┘   │
    │                          │                               │
    │                          ▼                               │
    │  ┌──────────────────────────────────────────────────┐   │
    │  │         SEQUENTIAL CHAIN (depends on batch 1)     │   │
    │  │                                                    │   │
    │  │  ┌────────────────┐                               │   │
    │  │  │ T4: Diagnosis  │  Cross-reference all results  │   │
    │  │  │ Engine         │  from T1 + T2 + T3 + T8      │   │
    │  │  │                │                               │   │
    │  │  │ → Root cause   │  "Missing delivery type       │   │
    │  │  │   assessment   │   config for order type"      │   │
    │  │  └────────────────┘                               │   │
    │  └──────────────────────────────────────────────────┘   │
    │                          │                               │
    │                          ▼                               │
    │  DECISION: Attempt resolution with user                  │
    │  FALLBACK: If unresolved → create ticket → escalate L2   │
    └─────────────────────────────────────────────────────────┘
```

---

## 5. Security Architecture — Zero-Access Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY BOUNDARY MAP                         │
│                                                                  │
│  ┌───────────────────────┐     ┌───────────────────────────┐   │
│  │    USER ZONE           │     │    GUARDIAN ZONE            │   │
│  │    (Browser)           │     │    (Cloud Run Container)    │   │
│  │                        │     │                             │   │
│  │  ┌──────────────────┐ │     │  ┌───────────────────────┐ │   │
│  │  │ TLS 1.3 Client   │ │     │  │ TLS 1.3 Termination  │ │   │
│  │  └────────┬─────────┘ │     │  └────────┬──────────────┘ │   │
│  │           │           │     │           │               │   │
│  │  ┌────────▼─────────┐ │     │  ┌────────▼──────────────┐ │   │
│  │  │ WebSocket Client │◄├─────┤─►│ WebSocket Server      │ │   │
│  │  │ (WSS only)       │ │ WSS │  │ (Token-gated)         │ │   │
│  │  └──────────────────┘ │     │  └────────┬──────────────┘ │   │
│  │                        │     │           │               │   │
│  │  ┌──────────────────┐ │     │  ┌────────▼──────────────┐ │   │
│  │  │ Audio Codec      │ │     │  │ Session Isolator      │ │   │
│  │  │ (PCM16, no raw   │ │     │  │ (1 session per token, │ │   │
│  │  │  storage)        │ │     │  │  5-min TTL, memory    │ │   │
│  │  └──────────────────┘ │     │  │  only — no disk)      │ │   │
│  │                        │     │  └────────┬──────────────┘ │   │
│  │  ┌──────────────────┐ │     │           │               │   │
│  │  │ Client-side only:│ │     │  ┌────────▼──────────────┐ │   │
│  │  │ • Sentiment      │ │     │  │ AI Engine             │ │   │
│  │  │ • Entity extract │ │     │  │ (Stateless — no data  │ │   │
│  │  │ • Summary build  │ │     │  │  retained post-call)  │ │   │
│  │  │                  │ │     │  └───────────────────────┘ │   │
│  │  │ No data sent to  │ │     │                             │   │
│  │  │ server for these │ │     │  ┌───────────────────────┐ │   │
│  │  └──────────────────┘ │     │  │ ZERO SAP ACCESS       │ │   │
│  └───────────────────────┘     │  │ • No RFC connections  │ │   │
│                                 │  │ • No API keys to SAP  │ │   │
│                                 │  │ • No service accounts │ │   │
│                                 │  │ • Diagnosis via USER  │ │   │
│                                 │  │   guided interaction  │ │   │
│                                 │  └───────────────────────┘ │   │
│                                 └───────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  DATA CLASSIFICATION                                       │  │
│  │                                                             │  │
│  │  IN-TRANSIT ONLY (never persisted):                        │  │
│  │  • Voice audio streams (PCM16 binary)                      │  │
│  │  • Screenshot/screen share frames (base64)                 │  │
│  │                                                             │  │
│  │  SESSION-SCOPED (memory only, cleared on session end):     │  │
│  │  • Transcript text (input + output)                        │  │
│  │  • Ticket data (ID, title, status, resolution)             │  │
│  │  • Tool call history (names, args, results)                │  │
│  │  • Session checkpoints (triage → diagnose → resolve)       │  │
│  │                                                             │  │
│  │  USER-EXPORTABLE (on demand only):                         │  │
│  │  • Transcript download (.txt)                              │  │
│  │  • RCA report download (.txt)                              │  │
│  │  • Session summary (JSON)                                  │  │
│  │                                                             │  │
│  │  NEVER COLLECTED:                                          │  │
│  │  • SAP credentials or passwords                            │  │
│  │  • System connection strings                               │  │
│  │  • Direct SAP data (tables, documents, master data)        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 GOOGLE CLOUD — PRODUCTION DEPLOYMENT             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  CLOUD RUN                                               │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ Instance 1  │  │ Instance 2  │  │ Instance N      │  │   │
│  │  │ (always on) │  │ (auto-scale)│  │ (auto-scale)    │  │   │
│  │  │             │  │             │  │                 │  │   │
│  │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────────┐ │  │   │
│  │  │ │ FastAPI │ │  │ │ FastAPI │ │  │ │ FastAPI     │ │  │   │
│  │  │ │ + WS    │ │  │ │ + WS    │ │  │ │ + WS        │ │  │   │
│  │  │ │ Server  │ │  │ │ Server  │ │  │ │ Server      │ │  │   │
│  │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────────┘ │  │   │
│  │  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────────┐ │  │   │
│  │  │ │ Static  │ │  │ │ Static  │ │  │ │ Static      │ │  │   │
│  │  │ │ SPA     │ │  │ │ SPA     │ │  │ │ SPA         │ │  │   │
│  │  │ └─────────┘ │  │ └─────────┘ │  │ └─────────────┘ │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │   │
│  │         │                │                   │           │   │
│  │  ───────┴────────────────┴───────────────────┴───────    │   │
│  │         SESSION AFFINITY (sticky routing)                │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │  GOOGLE CLOUD LOAD BALANCER                              │   │
│  │  • HTTPS termination (TLS 1.3)                           │   │
│  │  • DDoS protection                                       │   │
│  │  • Global anycast                                        │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                    │
│                        ┌────▼────┐                               │
│                        │ INTERNET│                               │
│                        └─────────┘                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  INTERNAL SERVICES (never exposed to internet)           │   │
│  │                                                           │   │
│  │  ┌────────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │ SLM Engine     │  │ Neural Voice │  │ Web Intel    │ │   │
│  │  │ (AI Reasoning) │  │ Synthesis    │  │ (Search      │ │   │
│  │  │                │  │              │  │  Grounding)  │ │   │
│  │  │ Private API    │  │ Private API  │  │ Private API  │ │   │
│  │  └────────────────┘  └──────────────┘  └──────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  DEPLOYMENT PIPELINE                                     │   │
│  │                                                           │   │
│  │  git push ──► Cloud Build ──► Container Registry          │   │
│  │                                      │                    │   │
│  │              ┌───────────────────────▼─────────────────┐ │   │
│  │              │ Dockerfile                               │ │   │
│  │              │ ┌─────────────────────────────────────┐  │ │   │
│  │              │ │ Stage 1: Python 3.11-slim           │  │ │   │
│  │              │ │ • pip install requirements.txt       │  │ │   │
│  │              │ │ • Copy server/ + dist/ + data/       │  │ │   │
│  │              │ │ • Expose port 8080                   │  │ │   │
│  │              │ │ • CMD: uvicorn server.main:app       │  │ │   │
│  │              │ └─────────────────────────────────────┘  │ │   │
│  │              └─────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Client-Side Intelligence Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│           CLIENT-SIDE INTELLIGENCE (runs in browser)             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  INPUT: Accumulated transcript text (per turn)            │  │
│  └─────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              ▼              ▼              ▼                    │
│  ┌───────────────┐ ┌──────────────┐ ┌──────────────────┐      │
│  │ SENTIMENT     │ │ ENTITY       │ │ SUMMARY          │      │
│  │ CLASSIFIER    │ │ EXTRACTOR    │ │ GENERATOR        │      │
│  │               │ │              │ │                  │      │
│  │ Patterns:     │ │ Detects:     │ │ Builds:          │      │
│  │ • frustrated  │ │ • User name  │ │ • Key events     │      │
│  │   (angry,     │ │   (I'm X)   │ │ • Tool results   │      │
│  │    stupid,    │ │ • T-codes    │ │ • Ticket IDs     │      │
│  │    terrible)  │ │   (VA01..)  │ │ • Error findings  │      │
│  │ • confused    │ │ • Error codes│ │ • Resolution      │      │
│  │   (don't      │ │   (VG088..) │ │   steps           │      │
│  │    understand) │ │ • SAP module │ │                  │      │
│  │ • urgent      │ │   (SAP SD..)│ │                  │      │
│  │   (critical,  │ │              │ │                  │      │
│  │    deadline)  │ │              │ │                  │      │
│  │ • calm        │ │              │ │                  │      │
│  │ • neutral     │ │              │ │                  │      │
│  └───────┬───────┘ └──────┬───────┘ └────────┬─────────┘      │
│          │                │                   │                 │
│          ▼                ▼                   ▼                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  INSIGHT PANELS (4 tabs)                                  │  │
│  │                                                            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐  │  │
│  │  │ Activity │ │ Insights │ │ Transcript│ │ Logs       │  │  │
│  │  │          │ │          │ │           │ │            │  │  │
│  │  │ Tool     │ │ Detected │ │ Full chat │ │ WS events  │  │  │
│  │  │ calls    │ │ info     │ │ history   │ │ Tool calls │  │  │
│  │  │ with     │ │ cards    │ │ with      │ │ Session    │  │  │
│  │  │ colored  │ │ +        │ │ timestamps│ │ lifecycle  │  │  │
│  │  │ cards    │ │ sentiment│ │           │ │ events     │  │  │
│  │  │ + icons  │ │ timeline │ │           │ │ (sanitized)│  │  │
│  │  │          │ │ +        │ │           │ │            │  │  │
│  │  │          │ │ live     │ │           │ │            │  │  │
│  │  │          │ │ summary  │ │           │ │            │  │  │
│  │  └──────────┘ └──────────┘ └───────────┘ └────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TOPBAR INDICATORS (always visible)                       │  │
│  │                                                            │  │
│  │  [LIVE dot] [Timer 02:34] [Sentiment: FRUSTRATED]         │  │
│  │                                                            │  │
│  │  Sentiment badge color:                                    │  │
│  │  • Red pulse    = frustrated/urgent                        │  │
│  │  • Amber        = confused                                 │  │
│  │  • Green        = calm                                     │  │
│  │  • Grey         = neutral                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Protocol Sequence — Diagnostic Session

```
Time  Agent Action                         Tool Calls              Session State
─────┬──────────────────────────────────┬──────────────────────┬──────────────────
0:00 │ Greet, request name + error +    │                      │ INIT
     │ T-code                           │                      │
     │                                  │                      │
0:15 │ User: "I'm Vignesh, VA01 error   │                      │ TRIAGE
     │ VG088"                           │                      │
     │                                  │                      │
0:16 │ ARL: Parallel tool blitz         │ T1: KB Search        │ DIAGNOSE
     │                                  │ T2: Error Lookup     │
     │                                  │ T3: T-Code Ref       │
     │                                  │ T8: Web Intel        │
     │                                  │                      │
0:18 │ ARL: Chain diagnosis             │ T4: Diagnosis Engine │ DIAGNOSE
     │                                  │                      │
0:20 │ Create ticket for tracking       │ T6: Create Ticket    │ DIAGNOSE
     │ (INC-XXXXXXXX)                   │                      │
     │                                  │                      │
0:25 │ Guide user: "Run SU53 and tell   │                      │ TROUBLESHOOT
     │ me if you see red entries"       │                      │
     │                                  │                      │
0:45 │ User reports SU53 result         │                      │ TROUBLESHOOT
     │                                  │                      │
0:50 │ Guide user: "Go to BP, check     │                      │ TROUBLESHOOT
     │ customer role for partner 23"    │                      │
     │                                  │                      │
1:30 │ User confirms role exists        │                      │ TROUBLESHOOT
     │                                  │                      │
1:35 │ Guide user: "Check VD03, verify  │                      │ TROUBLESHOOT
     │ sales area data"                 │                      │
     │                                  │                      │
2:00 │ User confirms sales area OK      │                      │ TROUBLESHOOT
     │                                  │                      │
2:05 │ ARL: Issue likely config-level   │ T7: Update Ticket    │ ESCALATE
     │ → Escalate to L2 with full RCA  │ status=Escalated     │
     │                                  │ notes=RCA package    │
     │                                  │                      │
2:10 │ "I've escalated to L2 with full  │                      │ COMPLETE
     │ diagnostics. They'll pick it up  │                      │
     │ without calling you back."       │                      │
     │                                  │                      │
2:15 │ Session ends → CSAT overlay      │                      │ CSAT
     │                                  │                      │
2:20 │ Summary view with downloads      │                      │ SUMMARY
─────┴──────────────────────────────────┴──────────────────────┴──────────────────
```

---

## 9. Technology Mapping (Internal Reference Only)

> **This section is for KaarTech internal use. NEVER share externally.**

| Public Name | Internal Component | Notes |
|---|---|---|
| SLM Engine | Google Cloud AI (Live) | Voice + reasoning |
| Neural Voice Synthesis | Built into SLM Engine | Jessica persona |
| Web Intelligence | Search Grounding API | Real-time web search |
| Agentic Reasoning Loop | Native function calling | Autonomous tool use |
| Multimodal Perception | Native multimodal input | Audio + image + text |
| Session Orchestrator | FastAPI + WebSocket | Python backend |
| Container Runtime | Cloud Run | Auto-scaling |
| Knowledge Index | JSON + keyword matching | Replace with vector DB |
| ITSM Connector | In-memory mock | Replace with ServiceNow API |

---

## 10. Glossary

| Term | Definition |
|---|---|
| **SLM** | Specialized Language Model — domain-tuned AI reasoning engine |
| **ARL** | Agentic Reasoning Loop — observe-orient-decide-act cycle |
| **Tool Blitz** | Parallel execution of multiple diagnostic tools in one reasoning step |
| **RCA** | Root Cause Analysis — structured diagnostic report for L2 |
| **ITSM** | IT Service Management — ticketing system integration |
| **VAD** | Voice Activity Detection — determines speech start/end |
| **Barge-In** | User interrupts agent mid-speech; agent stops and listens |
| **Session Affinity** | Sticky routing ensuring WS connection stays on same instance |
| **Zero-Access** | Security model where agent never directly connects to SAP |
| **CSAT** | Customer Satisfaction — post-session 1-5 star rating |
