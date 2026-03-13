# Guardian — Customer Pitch (What to Actually Say)

> Internal prep doc — KaarTech UK

---

## The Honest Pitch

> "What you're seeing today is a working prototype — real voice, real tool calling, real diagnostics. The AI layer, the voice pipeline, the agentic reasoning — that's production-grade, running on Google Cloud right now.
>
> What we're building next is the integration layer — connecting Guardian to YOUR systems. Your ServiceNow, your SAP landscape, your knowledge base built from your actual ticket history. That's where KaarTech's SAP expertise meets this AI platform.
>
> The AI brain is ready. The plumbing to your systems is the implementation project."

---

## What to SHOW (demo)

- Live voice conversation with Jessica
- Screenshot upload → instant error detection
- Tool calls firing in real time (Activity panel)
- Ticket creation mid-conversation
- Sentiment detection, entity extraction (Insights panel)
- CSAT at session end
- Text chat alongside voice
- 20-language switch (do German live if presenting to German customer)

---

## What to SAY About Each Layer

### Knowledge Base & RAG

**What exists:** Demo KB with ~20 articles and keyword search.

**What to say:**
> "The knowledge base layer is pluggable. Right now we have a demo set. For your deployment, we build a RAG pipeline on top of your actual data:
>
> - **Your resolved tickets** from ServiceNow/SolMan — we extract error-resolution pairs, embed them, and index them in a vector store
> - **Your internal wikis and runbooks** — PDF/Confluence/SharePoint ingestion
> - **SAP OSS Notes** relevant to your landscape — filtered by your module list and support package level
> - **Real-time web grounding** — already working, searches the internet for latest patches and community solutions
>
> The vector store sits in Vertex AI Search or AlloyDB with pgvector — your choice based on what's already in your GCP project. The agent queries it the same way it queries the demo KB today — zero code change on the AI side."

**What they'll ask:** "How many documents can it handle?"
**Answer:** "Vertex AI Search scales to millions of documents. The bottleneck is ingestion quality, not volume. We'd start with your top 500 resolved tickets and iterate."

---

### MCP Tool Calling (Backend Integrations)

**What exists:** 8 Python functions with mock data.

**What to say:**
> "Guardian uses Model Context Protocol for its tool layer. Each tool is a standalone MCP server that the agent calls autonomously. Today you see 8 tools in the demo. For your deployment, we swap the mock backends for real connectors:
>
> - **ServiceNow MCP Server** — create, read, update tickets via ServiceNow REST API. The agent creates tickets with full diagnostic data, updates them as the conversation progresses, and closes them on resolution.
> - **SAP Read-Only MCP Server** — connects via SAP Cloud Connector or RFC. Read-only access to check config tables, authorization objects, master data. The agent can verify customer master data exists without asking the user to run VD03.
> - **Knowledge Base MCP Server** — RAG retrieval from your vector store. Semantic search, not keyword matching.
> - **Monitoring MCP Server** — pull recent SM21 logs, ST22 dumps, SM37 job status for the user's time window. No manual T-code running needed.
>
> Each MCP server is independently deployable, versioned, and secured with its own service account. The agent doesn't know or care what's behind the MCP interface — it just calls tools."

**What they'll ask:** "Can the AI modify SAP data?"
**Answer:** "By default, no. Read-only. If you want write access — like resetting a user's buffer or releasing a blocked PO — that's a governance decision. We can enable it with approval workflows and audit logging, but we recommend starting read-only."

---

### Authentication & Multi-tenancy

**What exists:** UUID token with no real auth.

**What to say:**
> "For your deployment, Guardian integrates with your identity provider:
>
> - **SSO via SAML/OIDC** — users authenticate with their existing corporate credentials. No separate Guardian password.
> - **Role-based access** — L1 users see the voice interface. Supervisors see dashboards with sentiment trends and session history. Admins manage KB content and tool configuration.
> - **Multi-tenant** — each customer org gets isolated sessions, isolated KB, isolated ticket routing. Data never crosses tenant boundaries.
> - **Audit trail** — every session, every tool call, every ticket action logged with user identity and timestamp."

**What they'll ask:** "Does it work with Azure AD?"
**Answer:** "Yes. Google Identity Platform supports SAML and OIDC federation with Azure AD, Okta, Ping — whatever you're running."

---

### API-First Architecture

**What exists:** Monolith serving frontend + WebSocket + REST from one container.

**What to say:**
> "Guardian exposes a clean API layer that any frontend can consume:
>
> - **REST API** — session management, ticket CRUD, KB search, transcript/RCA export, session summary, CSAT submission
> - **WebSocket API** — real-time voice streaming, tool call events, transcription events, session state updates
>
> The UI you see today is one consumer of that API. You can embed Guardian in:
> - Your existing ServiceNow portal (iframe or API integration)
> - A mobile app for field technicians
> - Microsoft Teams or Slack (bot that opens a Guardian session)
> - Your internal support dashboard
>
> The API is the product. The frontend is just one client."

**What they'll ask:** "Can we build our own UI?"
**Answer:** "Yes. The API contract is documented. Your frontend team connects to the WebSocket for voice and REST for everything else. We provide a reference implementation."

**Actual API surface today:**
```
POST   /api/auth                          → {session_token}
GET    /api/status                        → {status, version}
GET    /api/assets                        → {tools, languages, config}
WS     /ws?token={token}                  → bidirectional voice + events
GET    /api/session/{token}/summary       → {session summary JSON}
GET    /api/session/{token}/transcript    → transcript.txt download
GET    /api/session/{token}/rca           → rca_report.txt download
```

---

### Self-Hosting / On-Premise / Data Residency

**What exists:** Cloud Run in us-central1.

**What to say:**
> "Guardian runs in YOUR GCP project — your billing, your VPC, your IAM. We deploy the container, you own the infrastructure.
>
> For EU data residency: deploy to `europe-west3` (Frankfurt) or `europe-west1` (Belgium). All processing stays in-region.
>
> For full on-premise: Google Distributed Cloud (GDC) supports Vertex AI endpoints inside your data center. The Guardian container runs there with zero code changes. The AI model runs on Google's infrastructure but within your network boundary.
>
> True air-gapped deployment (no Google Cloud at all) is not possible today — the AI model requires Google's API. That's a Google licensing conversation, not a KaarTech limitation."

**What they'll ask:** "Can the model run on our servers?"
**Answer:** "Not today. The model runs on Google's infrastructure. What we CAN guarantee is: your data stays in your chosen region, voice audio is not stored, and all session data is ephemeral unless you choose to persist it in your own database."

---

## What NOT to Say

| Don't Say | Why |
|---|---|
| "We use Gemini" or any model name | Competitive intelligence. Say "Specialized Language Model" or "Google Cloud AI" |
| "It's a prototype" | Say "working platform" or "production-ready core with integration layer in progress" |
| "The KB is just a JSON file" | Say "pluggable knowledge layer — currently demo data, replaced with your data on deployment" |
| "Tickets are in-memory" | Say "ITSM integration layer — configurable for ServiceNow, SolMan, or Jira" |
| "No real auth" | Say "supports SSO federation — we configure it during deployment" |
| "Built in a hackathon" | Never. Say "rapid prototyping methodology" if pressed on timeline |
| "Solo developer" | Say "KaarTech's AI engineering team" |

---

## Pricing Conversation

> "Guardian is a platform license + implementation project:
>
> - **Platform license**: Monthly per-seat or per-session pricing. Covers the AI engine, voice pipeline, and tool framework.
> - **Implementation**: Fixed-price project to connect Guardian to your systems — ServiceNow, SAP, KB ingestion, SSO, deployment. Scoped based on number of integrations.
> - **Ongoing**: KB maintenance, model tuning, new tool development billed as managed service.
>
> The AI compute cost (Google Cloud) is pass-through — you see exactly what you pay. For ~100 sessions/day, expect EUR 200-500/month for AI services."

---

## Implementation Timeline (Realistic)

| Phase | Duration | Deliverable |
|---|---|---|
| **Phase 1: Deploy** | 1 week | Guardian running in customer's GCP project, SSO configured, demo KB |
| **Phase 2: Connect** | 3-4 weeks | ServiceNow integration, RAG pipeline on customer's ticket history, real auth |
| **Phase 3: Expand** | 2-3 weeks | SAP read-only connector, monitoring tools, custom KB articles |
| **Phase 4: Harden** | 2 weeks | Load testing, security audit, audit logging, monitoring dashboards |
| **Total** | 8-10 weeks | Production Guardian with customer's systems connected |

---

## Questions They WILL Ask

**"What's the accuracy?"**
> "The AI doesn't guess. Every recommendation is backed by a tool call — actual KB match, actual error code lookup. When it doesn't know, it escalates. We measure resolution rate, not accuracy — target is 40% L1 resolution without human escalation."

**"What if it hallucinates?"**
> "Guardian is tool-grounded. It calls tools and reasons on their output. It doesn't make up SAP error codes or T-code instructions. The risk is low, but we add guardrails: tool results are the source of truth, not the model's training data."

**"How does it compare to SAP Joule?"**
> "Joule is embedded in SAP's own products. Guardian is vendor-independent — it works with any SAP landscape, any ITSM system, any deployment. And it's voice-first with real-time tool calling. Joule is text-based."

**"Can we see the system prompt?"**
> "The diagnostic protocol is KaarTech's IP — it encodes 15+ years of SAP AMS operational knowledge. We don't expose it, but we can walk you through the diagnostic flow it follows."

**"What happens when Google changes the API?"**
> "The AI layer is abstracted behind our API. If the underlying model changes, we update the backend — your integration, your KB, your tools are unaffected. That's the value of the platform layer."
