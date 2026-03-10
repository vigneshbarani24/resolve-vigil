# Devpost Submission — Guardian

## Title
Guardian — AI SAP Support Control Tower with Voice Agent Jessica

## Tagline
Talk to your AI SAP veteran. She sees your screen, hears your voice, and resolves issues in real time.

---

## Description (~1000 words)

### The Problem

SAP Application Management Services (AMS) is a $30B+ industry where enterprises pay for ongoing support of their SAP systems. The typical support workflow looks like this: a user encounters an error, logs a ticket with a vague description, waits hours or days for a support agent to respond, then goes through multiple rounds of back-and-forth to provide basic information the agent needs — the error code, the transaction code, the steps to reproduce. By the time Tier 1 support has gathered enough information to actually diagnose the issue, the SLA is blown.

The core problem is information loss. Users don't know what's relevant. Support agents can't see the user's screen. Context is lost between messages. The same "Can you send me the exact error message?" gets asked thousands of times per day across global SAP operations.

### The Solution

Guardian is an AI-powered SAP AMS Control Tower that eliminates this information gap entirely. Instead of logging a ticket and waiting, users speak directly to **Jessica** — an AI SAP support veteran powered by Google's Gemini Live API.

Jessica conducts a structured diagnostic interview over voice, following the exact same protocol a senior SAP consultant would use:

1. **Triage**: Capture the user's name, error code, T-code, and module. Assess impact and set priority.
2. **Sanity Check**: Guide the user to recreate the error while watching their screen.
3. **Tool Blitz**: Simultaneously search the knowledge base, look up error codes, check T-code details, and run cross-reference diagnostics — all in parallel.
4. **Guided Diagnostics**: Command the user to run SU53, SM12, SM37 and report results.
5. **Resolution**: Apply KB solutions or escalate with a complete Root Cause Analysis.
6. **Ticket Discipline**: Create a comprehensive ITSM ticket documenting everything.

### Multimodal Experience — See, Hear, Speak

Guardian breaks the "text box" paradigm completely:

- **Hear**: Users speak naturally to Jessica. She listens, asks probing follow-up questions, and can be interrupted mid-sentence. The conversation flows like a real phone call with a senior consultant.

- **See**: Users can share their screen or paste screenshots (Ctrl+V). Jessica uses Gemini's vision capabilities to read SAP error messages, identify T-codes, and spot issues directly from the UI — no need for the user to type anything.

- **Speak**: Jessica has a distinct persona — she's professional, authoritative, SLA-obsessed, and refuses to accept vague answers. She pronounces "S-A-P" as individual letters and T-codes with clear pauses. She speaks in 15 languages while keeping technical terms in English.

### Technical Architecture

The frontend is a Vite-built SPA using Web Components, Web Audio API for real-time audio streaming, and the MediaDevices API for screen capture. It connects via WebSocket to a FastAPI backend.

The backend manages bidirectional audio/JSON streaming with Gemini Live API (`gemini-live-2.5-flash-native-audio`) through Vertex AI. When Gemini decides to use a tool, the backend executes it server-side and returns the result — the user sees real-time visual feedback as tools fire.

**8 Backend Tools:**
1. `search_knowledge_base` — Searches a curated SAP KB with keyword scoring
2. `lookup_sap_error` — Error code lookup with fuzzy matching
3. `lookup_transaction_code` — T-code details and module mapping
4. `diagnose_sap_issue` — Cross-reference engine combining KB + errors + T-codes
5. `create_issue` — Issue logging with deduplication
6. `create_itsm_ticket` — Full diagnostic report ticket creation
7. `update_itsm_ticket` — Ticket status and resolution updates
8. `research_sap_topic` — **Google Search grounding** via Gemini Flash for latest OSS notes and patches

The Google Search grounding tool is critical for anti-hallucination. When Jessica's internal KB doesn't have an answer, she uses a separate Gemini Flash call with `google_search` grounding to find the latest SAP OSS notes, patches, and community solutions from the web. This ensures her advice is factual and up-to-date.

### Innovation Highlights

- **Turn Gating**: Server-side logic prevents the model from generating multiple responses per turn — a common challenge with Live API voice agents.
- **Live T-Code Overlay**: When Jessica mentions a T-code (like "Run SU53"), a visual command card with a copy button appears in the UI.
- **Session Timer + SLA Clock**: Real-time session duration with P1/P2/P3 SLA indicators based on issue severity.
- **4-Stage Diagnostic Pipeline**: Visual progress tracker showing Initiation → Diagnosis → Troubleshoot → Resolution.
- **Post-Session RCA**: Every session generates a downloadable Root Cause Analysis report and full transcript.

### Impact

Guardian transforms SAP support from a multi-day ticket-based process into a single real-time voice conversation. It captures 100% of diagnostic information on the first interaction, eliminates back-and-forth, and either resolves the issue live or produces a complete L2 handoff package. For enterprises with thousands of SAP users, this means faster resolution, lower support costs, and happier users.

### Built With

- Gemini Live API (`gemini-live-2.5-flash-native-audio`) — Voice + Vision
- Gemini Flash (`gemini-2.5-flash`) — Google Search Grounding
- Google GenAI SDK (`google-genai`)
- Vertex AI
- Google Cloud Run
- FastAPI + WebSocket
- Vite + Web Components
- Terraform (IaC)

---

## Built With (Tags)
Gemini Live API, Vertex AI, Google Cloud Run, Google GenAI SDK, Python, FastAPI, JavaScript, Vite, Terraform, WebSocket, Web Audio API

## Category
Live Agents

## Team
KaarTech UK (Solo)
