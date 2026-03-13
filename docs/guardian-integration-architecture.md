# Guardian — Integration Architecture for Enterprise Embedding

> Prepared for customer AI team | KaarTech UK

---

## 1. Guardian as an Embeddable Service

Guardian is not a standalone product — it's an **AI service layer** that plugs into your existing IT operations stack.

```
┌─────────────────────────────────────────────────────────────┐
│                YOUR EXISTING ENVIRONMENT                     │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐│
│  │ BMC Remedy │  │ SAP        │  │ Your Portal /          ││
│  │ (Helix     │  │ Landscape  │  │ Teams / Slack /        ││
│  │  ITSM)     │  │            │  │ Mobile App             ││
│  └─────┬──────┘  └─────┬──────┘  └──────────┬─────────────┘│
│        │               │                     │              │
│  ──────┴───────────────┴─────────────────────┴──────────    │
│                         │                                    │
│              ┌──────────▼──────────┐                        │
│              │   GUARDIAN API       │                        │
│              │   (embed here)       │                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Building Blocks — What Guardian Provides vs What You Provide

```
┌─────────────────────────────────────────────────────────────┐
│  GUARDIAN PROVIDES (AI Service Layer)                         │
│                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐ │
│  │ Voice     │ │ SLM       │ │ Agentic   │ │ Tool       │ │
│  │ Pipeline  │ │ Engine    │ │ Reasoning │ │ Dispatch   │ │
│  │           │ │           │ │ Loop      │ │ Framework  │ │
│  │ Bidi      │ │ SAP       │ │           │ │            │ │
│  │ streaming │ │ domain    │ │ Observe   │ │ Parallel   │ │
│  │ PCM16     │ │ reasoning │ │ Orient    │ │ execution  │ │
│  │ @16kHz    │ │           │ │ Decide    │ │ Dependency │ │
│  │ Barge-in  │ │ 20 langs  │ │ Act       │ │ chaining   │ │
│  └───────────┘ └───────────┘ └───────────┘ └────────────┘ │
│                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌────────────┐ │
│  │ Session   │ │ Sentiment │ │ Entity    │ │ Transcript │ │
│  │ Manager   │ │ Classifier│ │ Extractor │ │ + RCA Gen  │ │
│  └───────────┘ └───────────┘ └───────────┘ └────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ GUARDIAN API                                          │   │
│  │                                                        │   │
│  │ REST:                                                  │   │
│  │   POST /api/auth         → session token               │   │
│  │   GET  /api/status       → health check                │   │
│  │   GET  /api/session/:id/summary     → session data     │   │
│  │   GET  /api/session/:id/transcript  → transcript       │   │
│  │   GET  /api/session/:id/rca         → RCA report       │   │
│  │                                                        │   │
│  │ WebSocket:                                             │   │
│  │   WSS /ws?token=:token   → voice + tools + events      │   │
│  │                                                        │   │
│  │ Events emitted on WS:                                  │   │
│  │   tool_call      {name, args, result}                  │   │
│  │   session_state  {tickets, checkpoints, phase}         │   │
│  │   inputTranscription   {text, finished}                │   │
│  │   outputTranscription  {text, finished}                │   │
│  │   turnComplete                                         │   │
│  │   interrupted                                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  YOU PROVIDE (Your Systems — Guardian Connects Via MCP)       │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ MCP SERVER: BMC REMEDY (Helix ITSM)                    │  │
│  │                                                         │  │
│  │ Guardian calls:               Remedy REST API:          │  │
│  │ create_itsm_ticket     →  POST /api/arsys/v1/entry/    │  │
│  │                             HPD:IncidentInterface_Create│  │
│  │ update_itsm_ticket     →  PUT  /api/arsys/v1/entry/    │  │
│  │                             HPD:IncidentInterface/{id}  │  │
│  │ get_ticket_status      →  GET  /api/arsys/v1/entry/    │  │
│  │                             HPD:IncidentInterface/{id}  │  │
│  │                                                         │  │
│  │ Auth: Remedy API token (stored in Secret Manager)       │  │
│  │ Mapping: Guardian severity → Remedy Impact/Urgency      │  │
│  │ Routing: Guardian module → Remedy Support Group          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ MCP SERVER: SAP (Read-Only)                             │  │
│  │                                                         │  │
│  │ Guardian calls:               SAP Interface:            │  │
│  │ check_authorization    →  BAPI_USER_GET_DETAIL (RFC)    │  │
│  │ read_customer_master   →  BAPI_CUSTOMER_GETDETAIL       │  │
│  │ check_config_table     →  RFC_READ_TABLE                │  │
│  │ get_system_log         →  SM21 data via /sap/opu/odata  │  │
│  │                                                         │  │
│  │ Auth: SAP service account (read-only, no write)         │  │
│  │ Connection: SAP Cloud Connector or direct RFC            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ MCP SERVER: KNOWLEDGE BASE (Your Data)                  │  │
│  │                                                         │  │
│  │ Guardian calls:               Your Backend:             │  │
│  │ search_knowledge_base  →  Vector similarity search      │  │
│  │                            (Vertex AI Search /          │  │
│  │                             AlloyDB pgvector /          │  │
│  │                             Elasticsearch)              │  │
│  │                                                         │  │
│  │ Data sources:                                           │  │
│  │ • Resolved Remedy tickets (automated ingestion)         │  │
│  │ • SAP OSS Notes (filtered for your landscape)           │  │
│  │ • Internal runbooks (Confluence/SharePoint/PDF)          │  │
│  │ • KaarTech SAP knowledge (bundled)                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ YOUR IDENTITY PROVIDER                                  │  │
│  │                                                         │  │
│  │ Azure AD / Okta / Ping → SAML/OIDC federation           │  │
│  │ Guardian validates token → maps to user + role            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ YOUR FRONTEND (any of these)                            │  │
│  │                                                         │  │
│  │ • Remedy Self-Service Portal (embed Guardian widget)    │  │
│  │ • Microsoft Teams bot                                   │  │
│  │ • Your internal portal (iframe or API)                  │  │
│  │ • Mobile app (consume Guardian API directly)            │  │
│  │ • Guardian default UI (included)                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Remedy Integration — Detail

```
┌─────────────────────────────────────────────────────────────┐
│  REMEDY TICKET LIFECYCLE (Guardian-Managed)                   │
│                                                              │
│  SESSION START                                               │
│  ────────────                                                │
│  Guardian collects: error, T-code, module, user, impact      │
│       │                                                      │
│       ▼                                                      │
│  CREATE INCIDENT                                             │
│  POST /api/arsys/v1/entry/HPD:IncidentInterface_Create       │
│  {                                                           │
│    "First_Name": "Vignesh",                                  │
│    "Last_Name": (from AD lookup),                            │
│    "Description": "Error VG088 in VA01 — Business partner    │
│                    23 missing role for MKK",                  │
│    "Impact": "2-Significant/Large",        ← Guardian maps   │
│    "Urgency": "2-High",                    ← from severity   │
│    "Reported Source": "AI Agent",                            │
│    "Service_Type": "Infrastructure Event",                   │
│    "Assigned Support Organization": "KaarTech SAP AMS",      │
│    "Assigned Group": "SAP-SD-L1",          ← from module     │
│    "Categorization Tier 1": "SAP",                           │
│    "Categorization Tier 2": "SD",                            │
│    "Categorization Tier 3": "Sales Order"                    │
│  }                                                           │
│  → Returns: Incident Number (INC000000123456)                │
│       │                                                      │
│       ▼                                                      │
│  RESOLUTION LOOP                                             │
│  ────────────                                                │
│  Guardian walks user through diagnostics.                    │
│  Each tool call result → work note added to Remedy:          │
│                                                              │
│  PUT /api/arsys/v1/entry/HPD:IncidentInterface/{id}          │
│  {                                                           │
│    "Work_Log_Type": "Working Log",                           │
│    "Detailed_Description": "SU53 check: no red entries.      │
│      Authorization ruled out. Checking BP master data."      │
│  }                                                           │
│       │                                                      │
│       ▼                                                      │
│  OUTCOME A: RESOLVED                                         │
│  ──────────────────                                          │
│  PUT /api/arsys/v1/entry/HPD:IncidentInterface/{id}          │
│  {                                                           │
│    "Status": "Resolved",                                     │
│    "Status_Reason": "Resolved by AI Agent",                  │
│    "Resolution": "Customer role assigned in BP. User          │
│      verified VA01 sales order creation successful.",        │
│    "Resolution Category Tier 1": "Configuration",           │
│    "Resolution Category Tier 2": "Master Data",             │
│    "Resolution Category Tier 3": "Business Partner"          │
│  }                                                           │
│       │                                                      │
│       ▼                                                      │
│  OUTCOME B: ESCALATE TO L2                                   │
│  ────────────────────────                                    │
│  PUT /api/arsys/v1/entry/HPD:IncidentInterface/{id}          │
│  {                                                           │
│    "Status": "Assigned",                                     │
│    "Assigned Group": "SAP-SD-L2",                            │
│    "Priority": "High",                                       │
│    "Work_Log_Type": "Working Log",                           │
│    "Detailed_Description": "[AMS DIAGNOSTIC REPORT]          │
│      Error: VG088 in VA01                                    │
│      Module: SD                                              │
│      SU53: Clean                                             │
│      BP Master: Customer role exists                         │
│      VD03: Sales area data confirmed                         │
│      Resolution attempts: 3 (auth, master data, config)      │
│      Root cause: Likely customizing — delivery type config    │
│      Recommended: Check SPRO > SD > Shipping > Deliveries"  │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Embedding Options

### Option A: Widget in Remedy Self-Service Portal

```
┌─────────────────────────────────────────────────────────┐
│  BMC REMEDY SELF-SERVICE PORTAL                          │
│                                                          │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │ Existing Portal      │  │ Guardian Widget           │  │
│  │                      │  │ (iframe or Web Component) │  │
│  │ My Tickets           │  │                          │  │
│  │ Create Ticket        │  │  ┌────────────────────┐  │  │
│  │ Knowledge Search     │  │  │ "Talk to Guardian"  │  │  │
│  │ ─────────────────    │  │  │                    │  │  │
│  │                      │  │  │ [Start Voice Call] │  │  │
│  │ Service Catalog      │  │  │                    │  │  │
│  │ Approvals            │  │  │ ┌──────────────┐  │  │  │
│  │                      │  │  │ │ Live session │  │  │  │
│  │                      │  │  │ │ with Jessica │  │  │  │
│  │                      │  │  │ └──────────────┘  │  │  │
│  │                      │  │  │                    │  │  │
│  │                      │  │  │ Ticket auto-       │  │  │
│  │                      │  │  │ created in Remedy  │  │  │
│  └─────────────────────┘  │  └────────────────────┘  │  │
│                            └──────────────────────────┘  │
│                                                          │
│  Integration: iframe pointing to Guardian URL             │
│  Auth: SSO passthrough (same SAML token)                 │
│  Ticket: Created directly in Remedy via API              │
└─────────────────────────────────────────────────────────┘
```

### Option B: API-Only (Headless Guardian)

```
┌─────────────────────────────────────────────────────────┐
│  YOUR APPLICATION (any frontend)                         │
│                                                          │
│  1. POST /api/auth {user_token} → {session_id}          │
│  2. Open WSS /ws?token={session_id}                      │
│  3. Stream PCM16 audio → WS                              │
│  4. Receive: audio + tool_call + transcription events    │
│  5. Render however you want                              │
│  6. GET /api/session/{id}/summary on close               │
│                                                          │
│  You control:           Guardian handles:                 │
│  • UI / UX              • Voice AI                       │
│  • Branding             • Tool orchestration             │
│  • Layout               • Remedy ticket lifecycle        │
│  • Where it lives       • SAP diagnostics                │
│  • User auth flow       • Transcript + RCA generation    │
└─────────────────────────────────────────────────────────┘
```

### Option C: Microsoft Teams Bot

```
  User in Teams → "@Guardian I have an error in VA01"
       │
       ▼
  Teams Bot Framework → POST /api/auth → open WS session
       │
       ▼
  Audio: Teams voice call → PCM stream → Guardian WS
  Text:  Teams chat message → Guardian text input
       │
       ▼
  Guardian processes, calls tools, creates Remedy ticket
       │
       ▼
  Bot posts back: "Ticket INC000123 created. Checking KB..."
  Voice: Jessica speaks response through Teams call
```

---

## 5. Data Flow — With Remedy

```
USER          YOUR PORTAL       GUARDIAN           REMEDY          SAP
 │               │                 │                 │              │
 │  Open page    │                 │                 │              │
 │──────────────►│                 │                 │              │
 │               │  SSO validate   │                 │              │
 │               │────────────────►│                 │              │
 │               │  session_id     │                 │              │
 │               │◄────────────────│                 │              │
 │               │                 │                 │              │
 │  Speak/Type   │  WSS audio      │                 │              │
 │──────────────►│════════════════►│                 │              │
 │               │                 │                 │              │
 │               │                 │  SLM reasons:   │              │
 │               │                 │  create ticket  │              │
 │               │                 │────────────────►│              │
 │               │                 │  INC000123      │              │
 │               │  tool_call evt  │◄────────────────│              │
 │  [Activity]   │◄════════════════│                 │              │
 │◄──────────────│                 │                 │              │
 │               │                 │                 │              │
 │               │                 │  SLM reasons:   │              │
 │               │                 │  check BP data  │              │
 │               │                 │─────────────────┼─────────────►│
 │               │                 │  BP 23 details  │              │
 │               │                 │◄────────────────┼──────────────│
 │               │                 │                 │              │
 │               │                 │  Update ticket  │              │
 │               │                 │  with findings  │              │
 │               │                 │────────────────►│              │
 │               │                 │                 │              │
 │               │  Audio response │                 │              │
 │  [Hear Jessica]◄═══════════════│                 │              │
 │◄──────────────│                 │                 │              │
 │               │                 │                 │              │
 │  Session end  │                 │                 │              │
 │               │  GET /summary   │                 │              │
 │               │────────────────►│                 │              │
 │  [Summary]    │  {summary JSON} │                 │              │
 │◄──────────────│◄────────────────│                 │              │
 │               │                 │                 │              │
 │               │        Ticket INC000123 now in    │              │
 │               │        Remedy with full RCA,      │              │
 │               │        work notes, resolution     │              │
 │               │        or L2 escalation            │              │
```

---

## 6. MCP Tool Interface Contract

Each MCP server implements this interface. Your AI team builds the Remedy and SAP servers. Guardian calls them.

```
MCP Server Interface:
─────────────────────

TOOL DECLARATION (sent to Guardian at session start):
{
  "name": "create_itsm_ticket",
  "description": "Create incident in BMC Remedy",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "title":       {"type": "STRING"},
      "description": {"type": "STRING"},
      "severity":    {"type": "STRING", "enum": ["critical","high","medium","low"]},
      "module":      {"type": "STRING"},
      "error_code":  {"type": "STRING"},
      "tcode":       {"type": "STRING"}
    },
    "required": ["title", "description", "severity"]
  }
}

TOOL EXECUTION (Guardian calls → MCP server handles):
  Input:  {title, description, severity, module, error_code, tcode}
  Output: {success: true, ticket_id: "INC000123", message: "Created"}

MCP SERVER RESPONSIBILITY:
  • Map Guardian fields → Remedy API fields
  • Handle Remedy auth (API token from Secret Manager)
  • Map severity → Impact/Urgency matrix
  • Map module → Assigned Support Group
  • Return Remedy incident number
```

---

## 7. What Your AI Team Builds vs What KaarTech Delivers

```
┌──────────────────────────────┬──────────────────────────────┐
│  KAARTECH DELIVERS            │  YOUR AI TEAM BUILDS          │
├──────────────────────────────┼──────────────────────────────┤
│                              │                              │
│  Guardian Core:              │  MCP Servers:                │
│  • SLM Engine                │  • Remedy connector          │
│  • Voice pipeline            │  • SAP RFC connector         │
│  • Agentic reasoning loop    │  • Your vector store setup   │
│  • Tool dispatch framework   │                              │
│  • Session management        │  Data Pipeline:              │
│  • Transcript + RCA gen      │  • Remedy ticket → embeddings│
│  • Sentiment + entity        │  • Runbook ingestion         │
│  • Multilingual support      │  • OSS Note filtering        │
│                              │                              │
│  Reference MCP Servers:      │  Infrastructure:             │
│  • KB search (template)      │  • GCP project setup         │
│  • ITSM (template)           │  • VPC / firewall rules      │
│  • SAP lookup (template)     │  • Secret Manager entries    │
│                              │  • Cloud Connector config    │
│  Deployment:                 │                              │
│  • Container image           │  Auth:                       │
│  • Cloud Run config          │  • IDP federation config     │
│  • Deployment scripts        │  • Role mapping              │
│                              │                              │
│  SAP Domain Knowledge:       │  Frontend:                   │
│  • System prompt (Jessica)   │  • Portal widget integration │
│  • Diagnostic protocol       │  • OR use Guardian default UI│
│  • KB seed data              │                              │
│                              │                              │
│  Support:                    │  Ongoing:                    │
│  • Model updates             │  • KB content maintenance    │
│  • Prompt tuning             │  • Remedy field mapping      │
│  • New tool development      │  • User feedback triage      │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 8. Deployment in Their GCP Project

```
┌─────────────────────────────────────────────────────────────┐
│  CUSTOMER GCP PROJECT                                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Cloud Run                                               │ │
│  │ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │ │
│  │ │ Guardian     │  │ Remedy MCP   │  │ SAP MCP      │  │ │
│  │ │ Core         │  │ Server       │  │ Server       │  │ │
│  │ │              │  │              │  │              │  │ │
│  │ │ Calls ──────►│  │ Calls ──────►│  │              │  │ │
│  │ └──────────────┘  └──────┬───────┘  └──────┬───────┘  │ │
│  └──────────────────────────┼──────────────────┼──────────┘ │
│                              │                  │            │
│  ┌──────────────────────────┼──────────────────┼──────────┐ │
│  │ VPC Network              │                  │           │ │
│  │                          │                  │           │ │
│  │  ┌──────────────────┐   │    ┌─────────────┼────────┐  │ │
│  │  │ Vertex AI Search │   │    │ SAP Cloud   │        │  │ │
│  │  │ (KB Vector Store)│   │    │ Connector   ▼        │  │ │
│  │  └──────────────────┘   │    │        ┌─────────┐   │  │ │
│  │                          │    │        │ SAP ECC │   │  │ │
│  │  ┌──────────────────┐   │    │        │ / S4    │   │  │ │
│  │  │ Secret Manager   │   │    │        └─────────┘   │  │ │
│  │  │ (API keys, creds)│   │    └──────────────────────┘  │ │
│  │  └──────────────────┘   │                               │ │
│  │                          ▼                               │ │
│  │  ┌──────────────────────────┐                           │ │
│  │  │ BMC Remedy (Helix ITSM)  │                           │ │
│  │  │ On-prem or Remedy Cloud  │                           │ │
│  │  └──────────────────────────┘                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Cloud AI APIs (Google-managed, data stays in region)     │ │
│  │ • SLM Engine (voice + reasoning)                        │ │
│  │ • Search Grounding (web intelligence)                    │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Implementation Phases (With Remedy)

| Phase | What | Duration |
|---|---|---|
| **1. Core Deploy** | Guardian in customer GCP. SSO. Demo KB. Default UI. | 1 week |
| **2. Remedy MCP** | Build Remedy connector. Map fields. Test ticket lifecycle. | 2 weeks |
| **3. RAG Pipeline** | Ingest resolved Remedy tickets + runbooks into vector store. | 2 weeks |
| **4. SAP Connector** | Read-only RFC via Cloud Connector. Auth checks, master data reads. | 2-3 weeks |
| **5. Embed** | Widget in Remedy portal OR Teams bot OR customer portal. | 1-2 weeks |
| **6. Harden** | Security audit. Load test. Monitoring. Audit logging. | 2 weeks |
| **Total** | | **10-12 weeks** |
