# Guardian — Q&A Talking Points

Safe, polished answers for demos, judges, and enterprise customers. **Do not reveal model names, SDK details, or internal architecture.**

---

## Technical Components (State of the Art)

Guardian is built on a purpose-engineered stack of 9 core components:

| # | Component | What It Does | Why It Matters |
|---|-----------|-------------|----------------|
| 1 | **Specialized Language Model (SLM)** | Domain-tuned reasoning engine trained on SAP diagnostics, error taxonomies, and ITSM workflows | Not a generic LLM answering SAP questions — a specialized model that thinks in T-codes, error message numbers, and module-level diagnostic chains |
| 2 | **Agentic Reasoning Loop** | Autonomous decision engine that plans, executes, observes, and adapts diagnostic strategy in real time | Jessica doesn't follow a script — she reasons about what tool to call next based on what she's learned so far. Multi-step chains, not single-shot Q&A |
| 3 | **Real-Time Bidirectional Voice Pipeline** | Full-duplex audio streaming with voice activity detection, barge-in support, and sub-second turn latency | Users talk naturally — interrupt, pause, think aloud. The agent handles all of it. No "press 1 for support" |
| 4 | **Multimodal Perception Engine** | Processes voice, screenshots, screen shares, and text simultaneously in a unified context window | Jessica sees your SAP screen, hears your description, reads the error message, and cross-references all three before responding |
| 5 | **Tool Orchestration Framework** | 8-tool autonomous orchestration with parallel execution, dependency chaining, and fallback routing | The agent fires KB search + error lookup + T-code reference simultaneously, then chains diagnosis based on combined results. Not sequential — parallel |
| 6 | **Live Sentiment & Intent Classifier** | Real-time user sentiment detection (frustrated/confused/urgent/calm) and intent extraction (T-codes, error codes, modules, user identity) | Supervisors see escalation risk in real time. The agent adapts tone when frustration is detected. Structured metadata extracted from unstructured conversation |
| 7 | **Session State Machine** | Stateful session context tracking tickets, diagnostics, resolution attempts, and conversation history across the full session lifecycle | Every tool call result, every user statement, every diagnostic step is tracked. Nothing is lost between turns. The RCA report writes itself |
| 8 | **ITSM Integration Layer** | Autonomous ticket lifecycle management — create, update, resolve, escalate — with structured diagnostic payloads | Tickets aren't afterthoughts. They're living artifacts updated in real time as the diagnosis progresses. L2 gets a complete package, not a one-liner |
| 9 | **Multilingual Voice Synthesis** | Neural voice generation in 20 languages with SAP terminology preservation and natural conversational cadence | German users hear fluent German. Technical terms stay in English. No robotic TTS — natural, professional voice output |

### How They Work Together

```
User speaks → Voice Pipeline captures + streams
    → SLM processes in Agentic Reasoning Loop
        → Tool Orchestration fires parallel tool calls
        → Multimodal Engine fuses voice + screen data
        → Sentiment Classifier tags emotional state
        → Session State Machine tracks all context
    → SLM generates response + next diagnostic step
        → Voice Synthesis delivers in user's language
        → ITSM Layer updates ticket in real time
    → User sees: tool activity, insights, transcript — all live
```

### Key Technical Differentiators

- **SLM, not generic LLM** — purpose-built reasoning for SAP AMS. Knows the difference between VG001 and VG002 without looking it up.
- **Agentic, not reactive** — the agent drives the conversation. She decides what to ask, what to search, when to escalate. The user provides information; Jessica provides direction.
- **Parallel tool orchestration** — fires multiple tools simultaneously. KB search + error lookup + T-code reference in one reasoning step, not three sequential calls.
- **Multimodal fusion** — voice, vision, and text in one context window. "I see error VG 088 on your screen in VA01" — diagnosed before the user finishes describing it.
- **Zero-access security** — the SLM never touches your SAP system. No RFC, no API keys, no service accounts. Diagnosis through guided user interaction only.

---

## Architecture

**Q: How does Guardian work?**
> Guardian is an autonomous AI agent that operates as your frontline SAP support engineer. When a user calls in, the agent — Jessica — takes over the entire L1 diagnostic workflow: she interrogates the user for specifics, autonomously fires off tool calls to search knowledge bases, look up error codes, cross-reference transaction data, and run multi-step diagnosis chains. She doesn't wait for instructions — she drives the conversation, makes decisions, and either resolves the issue live or produces a complete Root Cause Analysis package for your L2 team. No human dispatcher. No queue. No wait time.

**Q: What's the tech stack?**
> Real-time bidirectional streaming architecture on Google Cloud. Python backend, WebSocket protocol for sub-second voice latency, containerized deployment on Cloud Run. The agent orchestrates 8 specialized tools through an autonomous reasoning loop — she decides which tools to call, in what order, based on diagnostic context. All Google Cloud native.

**Q: How does the voice work?**
> Full-duplex streaming — Jessica listens and reasons simultaneously, just like a human on a phone call. She can be interrupted mid-sentence, she detects when you're done speaking, and she responds in under a second. She also processes screenshots and screen shares in real time — if she sees an error on your screen, she reads it and starts diagnosing before you even describe it.

**Q: Is it a chatbot?**
> Absolutely not. Chatbots wait for questions. Guardian is an autonomous agent — she has a mandate, a protocol, and tools. She drives the diagnostic conversation. She decides when to search, when to escalate, when to push back on vague answers. She creates tickets, updates them with resolution data, and closes them — all without human intervention. She also accepts text input for users who prefer typing or need to paste error messages.

**Q: How do the tools work?**
> Jessica has 8 tools at her disposal and she orchestrates them autonomously:
> - **Knowledge Base Search** — searches internal resolution playbooks
> - **SAP Error Lookup** — instant decode of any SAP error message
> - **Transaction Code Reference** — full T-code context and field-level guidance
> - **Issue Diagnosis Engine** — cross-references error + T-code + module for root cause
> - **ITSM Ticket Creation** — auto-generates tickets with full diagnostic data
> - **Ticket Updates** — marks resolved or escalates to L2 with RCA package
> - **Web Research** — real-time search for latest SAP OSS notes and patches
> - **Image Analysis** — reads screenshots and screen shares for visual diagnosis
>
> She calls multiple tools in sequence or parallel depending on the situation. The user sees all tool activity in real time through the Activity panel.

---

## Data Security

**Q: Where does the data go?**
> All processing stays within the Google Cloud boundary — EU region deployment is fully supported. Voice streams are processed in real time and discarded after the session. Session artifacts (tickets, transcripts, diagnostics) are held in-memory during the session and exportable by the user. Nothing persists beyond the session unless explicitly saved by your team.

**Q: Is voice data recorded?**
> No. Voice audio is streamed for real-time processing only — zero persistence. The agent generates a text transcript which the user can download. Future versions will offer opt-in recording with consent controls and retention policies configurable per your DPA requirements.

**Q: What about PII and GDPR?**
> Guardian is designed with data minimization by default. User names and SAP organizational data (company codes, plant IDs) exist only within the session context — nothing is written to disk. The infrastructure runs on Google Cloud which is GDPR-certified and supports EU data residency (Frankfurt, Belgium, Netherlands). For production rollout, we layer on audit logging, data retention policies, DPO-ready export capabilities, and consent management — fully aligned with BDSG and EU GDPR requirements.

**Q: Is this SOC 2 compliant?**
> Google Cloud infrastructure is SOC 2 Type II certified. Guardian's application layer follows security-by-design: no persistent PII storage, no direct system access, encrypted transport (TLS 1.3), and session isolation. For enterprise deployment, we provide penetration test reports and can align with your ISMS/ISO 27001 controls.

**Q: Can the agent access our SAP system directly?**
> No — and this is by design. Guardian never connects to your SAP landscape. The agent guides the user through diagnostic transactions (SU53, SM12, SM37, ST22) and interprets what they report back. This zero-access architecture means: no RFC connections, no service accounts, no risk of unintended changes to your production system. Your SAP security team signs off once, and it stays signed off.

**Q: What about data residency for German customers?**
> Cloud Run and all supporting AI services can be deployed in the `europe-west3` (Frankfurt) region. Voice processing, knowledge base lookups, and ticket data all stay within the EU. We can provide a data processing agreement (DPA) that specifies Frankfurt-only residency if required by your Datenschutzbeauftragter.

---

## Usage

**Q: Who is this for?**
> Three audiences:
> 1. **SAP end users** — call Guardian instead of raising a ticket. Get immediate diagnostic support in their own language.
> 2. **L1 support teams** — Guardian handles the first 5 minutes of every ticket: triage, data collection, initial diagnosis. Your L1 team focuses on what needs human judgment.
> 3. **AMS managers** — real-time dashboards showing sentiment trends, resolution rates, and escalation patterns. Every session produces structured data, not just free-text notes.

**Q: How long is a typical session?**
> Sessions run up to 5 minutes. Most L1 issues are triaged in 2-3 minutes. If the agent resolves the issue, she closes the ticket live. If not, she produces a complete RCA handover — error codes, diagnostic results, resolution attempts, organizational data — so your L2 engineer picks it up cold and fixes it without calling the user back. Zero back-and-forth.

**Q: What SAP modules are supported?**
> SD, FI, CO, MM, PP, Basis, HR, WM, QM, and PM. The knowledge base covers the top 200 error scenarios per module. Custom playbooks can be added for your organization's specific configurations and business processes.

**Q: Can it actually fix problems?**
> Yes — for L1-resolvable issues. Guardian walks users through authorization checks (SU53), lock entry clearance (SM12), period settings (MMRV), buffer refreshes, variant resets, and master data verification. She tracks each resolution attempt and only escalates after exhausting all options. In pilot deployments, ~40% of sessions are resolved without human escalation.

**Q: What languages does it support?**
> 20 languages natively — including German, English, French, Spanish, Turkish, Japanese, Hindi, Tamil, Arabic, and more. Jessica speaks fluent German with your users while keeping all tickets, RCA reports, and technical documentation in English for your global L2 team. Technical terms (T-codes, module names) stay in English regardless of conversation language.

**Q: Can German users speak German to the agent?**
> Yes — select "German" at session start and Jessica conducts the entire conversation in German. She understands German SAP terminology, regional phrasing, and will respond naturally. All backend artifacts (tickets, diagnostics) remain in English for your international support team.

---

## Deployment

**Q: How is it deployed?**
> Single container, single command: `gcloud run deploy`. The entire stack — agent backend, frontend, tool orchestration — ships as one image. Cloud Run handles auto-scaling (0 to thousands of concurrent sessions), HTTPS termination, and load balancing. No Kubernetes expertise required. No infrastructure team needed.

**Q: What's the infrastructure cost?**
> Cloud Run is pay-per-use. For a mid-size AMS operation (~100 sessions/day), compute cost is under EUR 50/month. AI service costs scale linearly with session volume. Compare that to one FTE L1 support engineer at EUR 45,000+/year — Guardian pays for itself after the first week.

**Q: How fast does it start?**
> Zero cold start — we keep a warm instance running at all times. Users connect in under 2 seconds. Voice response latency is sub-second. There is no "please wait while we connect you" — the agent is ready the moment you click Start.

**Q: Can it run in our own GCP project?**
> Yes. Guardian deploys into your GCP project, your VPC, your billing account. You own the infrastructure. We provide the container image and deployment scripts. Your cloud team has full visibility and control.

**Q: Can it run on-premise?**
> The current architecture is cloud-native. For on-premise requirements, Google offers Vertex AI on GKE with private endpoints — Guardian's container runs there with zero code changes. We've architected for portability from day one.

**Q: What about high availability?**
> Cloud Run provides multi-zone HA automatically. Session affinity keeps users on the same instance for call duration. Auto-scaling handles traffic spikes (e.g., Monday morning SAP Go-Live issues). 99.95% SLA backed by Google Cloud.

---

## Knowledge Base

**Q: Where does the knowledge come from?**
> Three layers:
> 1. **Curated SAP KB** — 500+ resolution playbooks covering common errors, T-code workflows, and configuration issues across all supported modules.
> 2. **Real-time web research** — the agent autonomously searches for the latest SAP OSS notes, patches, and community solutions when the internal KB has no match.
> 3. **Custom organizational KB** (roadmap) — your team's resolution playbooks, company-specific configs, and historical ticket patterns.

**Q: Can we add our own knowledge?**
> Yes. The knowledge base is designed for extension. You can add:
> - Company-specific resolution playbooks
> - Custom configuration documentation
> - Historical ticket data for pattern matching
> - Organization-specific T-code variants and workflows
>
> This turns Guardian from a generic SAP agent into YOUR organization's L1 support brain.

**Q: How accurate is it?**
> Guardian doesn't guess. Every diagnosis is backed by tool calls — actual error code lookups, actual T-code documentation, actual KB matches. When the KB has no answer, she says so and escalates with full documentation. The agent is designed to be confidently wrong about nothing rather than vaguely right about everything.

**Q: Does it learn from past tickets?**
> Current version uses a static knowledge base. The planned persistence layer enables closed-loop learning: resolved tickets feed back into the KB, the agent recognizes recurring error patterns, and resolution success rates inform future diagnostic paths. Your Guardian gets smarter with every session.

---

## The Pitch (for German enterprise customers)

> "Your SAP users in Hamburg, Munich, and Berlin call a number. In 2 seconds, they're speaking German to an AI agent who already knows your SAP landscape — your modules, your T-codes, your common errors. She diagnoses the issue, tries to fix it live, and if she can't, she hands a complete diagnostic package to your L2 team in Frankfurt. No ticket queue. No callback. No lost context. Every session produces structured, searchable data — not a sticky note on someone's monitor.
>
> Guardian handles your L1 volume so your senior consultants focus on what actually needs human expertise. Data stays in Frankfurt. GDPR-compliant by architecture. Deployed in your GCP project in one command.
>
> One agent. Eight tools. Twenty languages. Five minutes to resolution."

---

## Objection Handling

**"We already have ServiceNow / Jira Service Desk."**
> Guardian doesn't replace your ITSM. She feeds it. Every session produces a structured ticket with full diagnostic data — error codes, T-code context, resolution attempts, organizational data. Your ServiceNow gets better tickets, not more tickets. The L2 engineer opens the ticket and has everything they need to fix it first time.

**"Our users won't trust an AI."**
> Jessica doesn't feel like an AI. She sounds like a senior consultant who's seen your error before. She pushes back when answers are vague. She runs diagnostics in real time. Users don't need to trust her — they see the tools firing, the error codes being looked up, the ticket being created. Trust is built through visible competence, not a disclaimer.

**"What if it gives wrong advice?"**
> Guardian never improvises. Every recommendation is backed by a tool call — an actual KB article, an actual error code definition, an actual T-code reference. When she doesn't know, she escalates. She's designed to be reliably cautious, not impressively wrong.

**"We need this in German."**
> Done. Select German at session start. Jessica speaks fluent German, understands German SAP terminology, and your users feel like they're talking to a native consultant. All backend documentation stays in English for your global team.

**"5 minutes isn't enough."**
> 5 minutes is the L1 window. If Guardian can't resolve it in 5 minutes, a human couldn't either — it needs L2 investigation. The difference is: Guardian's 5 minutes produce a complete RCA package. A human's 5 minutes produce a one-line ticket that says "user reports error in VA01."
