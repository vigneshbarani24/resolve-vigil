# Guardian — Customer Presentation Script

> Presenter: Vignesh | KaarTech UK
> Audience: Customer AI Team + IT Operations
> Duration: 20-25 minutes (including demo)

---

## SLIDE 1 — Title

**Guardian**
*AI-Powered SAP AMS Control Tower*

KaarTech UK

> SAY: "Thank you for your time today. I'm Vignesh from KaarTech. I'm here to show you Guardian — an AI agent we've built to handle your L1 SAP support calls in real time."

---

## SLIDE 2 — The Problem

**Your L1 Support Today**

- User hits an SAP error → raises a ticket in Remedy
- Ticket sits in queue → average wait: 4-8 hours
- L1 picks it up → calls user → "What error did you see?" → user can't remember
- L1 collects info → escalates to L2 → incomplete RCA → L2 calls user again
- Total resolution: 2-3 days for something that could take 15 minutes

**The cost:**
- 60% of L1 tickets are repeat issues with known fixes
- L2 engineers spend 40% of their time on tickets that shouldn't have reached them
- User frustration → SLA breaches → contract risk

> SAY: "This is the pattern we see across every AMS contract. The information exists to fix most L1 issues — it's just not available at the right time, to the right person, in the right format. That's what Guardian solves."

---

## SLIDE 3 — What Guardian Does

**One sentence:**
User calls Guardian → speaks to Jessica → issue diagnosed, ticket created in Remedy, resolved or escalated with full RCA — in 5 minutes.

**How:**
```
User speaks → AI agent listens, sees screen, reasons
           → fires diagnostic tools autonomously
           → creates Remedy ticket with full context
           → walks user through resolution
           → if unresolved: escalates to L2 with complete RCA
```

> SAY: "Guardian is not a chatbot. It's an autonomous agent. Jessica — the AI — drives the conversation. She asks the questions, she decides which tools to fire, she creates the ticket, and she either fixes it with the user or hands a complete diagnostic package to your L2 team. No queue. No callback. No lost context."

---

## SLIDE 4 — Live Demo

**[SWITCH TO LIVE DEMO — 5 minutes]**

Show:
1. Start session → Jessica greets in English
2. Say: "I'm Vignesh, I have an error in VA01"
3. Watch tools fire (Activity panel)
4. Upload a screenshot → Jessica reads the error
5. She creates a ticket → show the card
6. She guides diagnostics → "Run SU53..."
7. End session → CSAT rating → Summary view
8. Switch language to German → restart → Jessica speaks German

> SAY (before demo): "Let me show you what this looks like. I'm going to call Guardian right now, as a user with an SAP SD issue."

> SAY (after demo): "That was 5 minutes. A real voice conversation. 8 tools fired autonomously. A ticket created with full diagnostic data. And if this was connected to your Remedy, that ticket would already be in your queue — or closed."

---

## SLIDE 5 — Technical Architecture

**9 Components**

```
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Voice      │ │ SLM Engine │ │ Agentic    │
│ Pipeline   │ │ (Domain-   │ │ Reasoning  │
│ (Bidi,     │ │  tuned for │ │ Loop       │
│  16kHz,    │ │  SAP AMS)  │ │ (OODA)     │
│  barge-in) │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Multimodal │ │ Tool       │ │ Sentiment  │
│ Perception │ │ Orchestr.  │ │ + Entity   │
│ (V+A+T)   │ │ (8 tools,  │ │ Classifier │
│            │ │  parallel) │ │            │
└────────────┘ └────────────┘ └────────────┘
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Session    │ │ ITSM       │ │ Neural     │
│ State      │ │ Integration│ │ Voice      │
│ Machine    │ │ Layer      │ │ (20 langs) │
└────────────┘ └────────────┘ └────────────┘
```

> SAY: "Guardian has 9 core components. The SLM — Specialized Language Model — is tuned for SAP diagnostics. It reasons through an OODA loop: observe the user's input, orient to the diagnostic protocol, decide which tools to call, act — then loop back. The tool orchestration fires multiple tools in parallel — KB search, error lookup, T-code reference — in a single reasoning step."

> SAY: "The voice pipeline is full-duplex. Users can interrupt mid-sentence. The multimodal engine fuses voice, screenshots, and text chat into one context. And everything runs over a single WebSocket connection."

---

## SLIDE 6 — Integration Into Your Environment

**Guardian fits into your stack — not the other way around.**

```
YOUR SYSTEMS                    GUARDIAN
─────────────                   ────────
BMC Remedy  ◄── MCP Server ──► Tool: create/update ticket
SAP ECC/S4  ◄── MCP Server ──► Tool: read config, auth, master data
Your KB     ◄── MCP Server ──► Tool: RAG search (vector)
Your Portal ◄── Guardian API ─► Voice + Events + Transcript
Azure AD    ◄── OIDC/SAML ──► Authentication
```

> SAY: "Guardian exposes a clean API — REST and WebSocket. Your portal, your Teams bot, your mobile app — any frontend can consume it. The AI tools connect to your backend systems through MCP servers — Model Context Protocol. We build the MCP server for Remedy, you plug in your API credentials, and Guardian creates tickets directly in your Remedy instance."

> SAY: "We don't replace Remedy. We feed it. Every session produces a ticket with full diagnostic data — error codes, T-code context, diagnostic results, resolution attempts. Your L2 engineer opens the ticket and has everything they need."

---

## SLIDE 7 — Remedy Integration (Detail)

**Ticket lifecycle — fully autonomous**

| Guardian Action | Remedy API Call |
|---|---|
| Collect error + T-code + module | — |
| Create incident | `POST HPD:IncidentInterface_Create` |
| Add diagnostic work notes | `PUT HPD:IncidentInterface/{id}` |
| Resolved → close ticket | Status=Resolved, Resolution filled |
| Not resolved → escalate | Assigned Group=SAP-SD-L2, full RCA in work notes |

**Field mapping:**
- Guardian severity → Remedy Impact + Urgency
- Guardian module (SD/FI/MM) → Remedy Support Group
- Guardian transcript → Remedy Work Log
- Guardian RCA → Remedy Resolution field

> SAY: "The Remedy integration maps directly to your incident management process. Guardian creates the incident as soon as it has the error and T-code. It adds work notes as the diagnosis progresses. If resolved — it closes the ticket. If not — it assigns to your L2 group with a complete RCA in the work notes. Your L2 doesn't need to call the user back."

---

## SLIDE 8 — Knowledge Base & RAG

**Three-layer knowledge architecture:**

```
Layer 1: Resolved Remedy Tickets
         Your historical tickets → embedded → vector store
         Guardian searches semantically, not by keyword

Layer 2: Internal Runbooks
         Confluence / SharePoint / PDF ingestion
         Your team's tribal knowledge, digitized

Layer 3: Real-Time Web Intelligence
         Live search for latest SAP OSS Notes
         Already working today
```

> SAY: "The real power comes when we load YOUR data. Your resolved tickets from Remedy become the knowledge base. Every ticket your team has ever closed — that's training data for Guardian. We embed it, index it in a vector store, and the agent searches it semantically during every session. The more tickets you've closed, the smarter Guardian gets on day one."

---

## SLIDE 9 — Security & Data

**Zero-access security model**

- Guardian **never connects to SAP directly** (unless you enable read-only MCP)
- Voice audio is **streamed, not stored** — zero persistence
- Session data is **ephemeral** — gone on session end unless you persist to your DB
- Runs in **your GCP project**, your VPC, your billing
- **EU data residency**: Frankfurt (`europe-west3`) or Belgium
- SSO via **your identity provider** (Azure AD, Okta, etc.)
- **Audit trail** on every session, tool call, and ticket action

> SAY: "Security was architected from day one. Guardian never stores voice audio. Session data is ephemeral. Everything runs in your GCP project — your network, your keys, your control. For German operations, we deploy to Frankfurt. Data never leaves the EU."

---

## SLIDE 10 — What Changes for Your Team

**Before Guardian:**
```
User → Remedy ticket → Queue (hours) → L1 call → Incomplete info
→ Escalate → L2 calls user again → Fix (days)
```

**After Guardian:**
```
User → Guardian (5 min) → Remedy ticket with full RCA
→ Resolved on call (40%) OR L2 picks up cold and fixes (60%)
```

**Impact:**
- L1 resolution rate: 0% → ~40% (resolved without human)
- L2 rework: -50% (complete RCA, no callback needed)
- Mean time to resolution: days → hours
- User satisfaction: measurable via built-in CSAT
- Every session produces structured, searchable data

> SAY: "The math is simple. If Guardian resolves 40% of L1 calls without a human, and the other 60% get a complete RCA so L2 fixes it first time — you've cut your resolution time from days to hours and freed your senior consultants for work that actually needs human expertise."

---

## SLIDE 11 — Implementation Timeline

| Phase | What | Duration |
|---|---|---|
| 1. Deploy | Guardian in your GCP, SSO, demo KB | 1 week |
| 2. Remedy | MCP connector, field mapping, ticket lifecycle | 2 weeks |
| 3. Knowledge | RAG pipeline on your Remedy history + runbooks | 2 weeks |
| 4. SAP | Read-only RFC connector via Cloud Connector | 2-3 weeks |
| 5. Embed | Widget in your portal / Teams / Remedy | 1-2 weeks |
| 6. Harden | Security audit, load test, monitoring | 2 weeks |
| **Total** | **Production-ready** | **10-12 weeks** |

> SAY: "We can have Guardian running in your GCP project within a week. Remedy integration in three weeks. Full production deployment with your knowledge base, SAP connector, and portal embedding in 10-12 weeks. That's from handshake to live."

---

## SLIDE 12 — Next Steps

1. **Pilot scope** — pick one SAP module (SD or MM), one support group, 30-day pilot
2. **Data access** — we need: Remedy API credentials, sample resolved tickets (100+), SAP Cloud Connector access (read-only)
3. **GCP project** — provision a project or we use ours for pilot
4. **Kick-off** — 1 week from agreement

> SAY: "My recommendation: start with a 30-day pilot on one module. We deploy Guardian, connect Remedy, load your ticket history, and measure. Resolution rate, time to resolution, user satisfaction, L2 escalation quality. The numbers will speak for themselves."

> SAY: "What questions does your team have?"

---

## HANDLING Q&A

**"What model is this?"**
> "It's a Specialized Language Model running on Google Cloud, tuned for SAP AMS diagnostics. The model layer is abstracted behind our API — if the underlying technology evolves, your integration is unaffected."

**"Can it access SAP directly?"**
> "By default, no — zero access. We can enable read-only access via SAP Cloud Connector for things like checking config tables and authorization objects. Write access is possible but requires your governance sign-off."

**"What if it gives wrong advice?"**
> "Every recommendation is grounded in a tool call — an actual KB article, an actual error code definition. When the KB has no match, Guardian escalates instead of guessing. We can show you the audit trail for every decision."

**"We already have Remedy's virtual agent."**
> "Remedy's virtual agent handles ticket routing and FAQ. Guardian handles live diagnosis — voice conversation with autonomous tool use. They complement each other. Guardian creates better tickets for Remedy to manage."

**"Can we start with text only, no voice?"**
> "Yes. Guardian supports text chat alongside voice. You can deploy text-only first and enable voice when ready."

**"How much does it cost?"**
> "Platform license plus implementation. The AI compute is pay-per-session on Google Cloud. For 100 sessions/day, expect EUR 200-500/month for AI services. Compare that to one L1 FTE."

**"What about German language?"**
> "Fully supported. Select German at session start. Jessica speaks native German. Technical terms stay in English. All tickets and RCA reports in English for your global L2 team."
