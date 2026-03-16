# Vigil — Excalidraw Architecture Diagrams

Copy each prompt into Claude with the Excalidraw connector to generate visuals.

---

## Diagram 1: GCP Foundation Blocks

```
Create a clean architecture diagram titled "Vigil — Built on Google Cloud"

Dark background (#0a0b10). Google Cloud logo centered at the top.

Three rows of service blocks, each row labeled on the left side:

ROW 1 — "AI / ML" (purple tint):

Box 1: "Gemini Live API"
  Subtitle: gemini-live-2.5-flash-native-audio
  Bullets:
  - Bidirectional voice streaming
  - Real-time tool calling mid-conversation
  - Native speech-to-speech (no STT/TTS)
  - 20+ language support

Box 2: "Gemini 2.5 Flash"
  Subtitle: Vision + Text + Search
  Bullets:
  - Shield Layer 2: screenshot + DOM analysis
  - Shield Layer 3: search grounding verification
  - UI Navigator: page element detection
  - JSON schema structured output

Box 3: "Google ADK"
  Subtitle: Agent Development Kit
  Bullets:
  - Multi-agent orchestration
  - Theepa root agent (8 FunctionTools)
  - Researcher sub-agent (google_search)
  - Sub-agent pattern for tool isolation

ROW 2 — "Platform" (blue tint):

Box 4: "Vertex AI"
  Bullets:
  - All model calls routed through Vertex
  - Enterprise authentication
  - Regional endpoints (us-central1)
  - Quota management

Box 5: "Web Risk API"
  Bullets:
  - Shield Layer 1
  - Known phishing database
  - Known malware database
  - Social engineering detection
  - ~100ms lookup

Box 6: "Cloud Run"
  Bullets:
  - Serverless container hosting
  - Auto-scaling 0→N
  - HTTPS with custom domain
  - FastAPI + WebSocket server

ROW 3 — "Infrastructure" (green tint):

Box 7: "Artifact Registry"
  Bullets:
  - Docker image storage
  - CI/CD pipeline target
  - Version-tagged builds

Box 8: "IAM"
  Bullets:
  - Service account management
  - API key scoping
  - Vertex AI + Web Risk access

Box 9: "Terraform"
  Bullets:
  - Infrastructure as Code
  - One-command deployment
  - Cloud Run + IAM + Registry

Arrows: Vertical from each Row 1 box down to corresponding Row 2 box. Row 2 down to Row 3. Horizontal arrow from Vertex AI → Web Risk API labeled "Shield Pipeline". Horizontal arrow from Gemini Live → Gemini 2.5 Flash labeled "Tool Results".

Style: Rounded rectangles with colored borders matching row tint. White text. Subtle row background bands.
```

---

## Diagram 2: ADK Multi-Agent Orchestration

```
Create a diagram titled "Google ADK — Multi-Agent Architecture"

Dark background. Show the agent hierarchy:

TOP: Small box "ADK InMemorySessionService" with note "async get_session() / create_session()"

CENTER: Large rounded rectangle "Theepa Agent (root_agent)"
  Model: gemini-2.5-flash
  Border color: amber (#e8a73e)

  Inside, 8 FunctionTools as pill-shaped boxes in a 4x2 grid:

  Row 1:
  - search_knowledge_base (20-article IT KB)
  - lookup_error_code (7 error categories)

  Row 2:
  - lookup_portal_page (portal nav + known issues)
  - diagnose_issue (cross-reference engine)

  Row 3:
  - create_issue (severity + dedup)
  - create_itsm_ticket (full ticket + RCA)

  Row 4:
  - update_itsm_ticket (status updates)
  - navigate_user_browser (Chrome extension DOM)

  Each pill colored purple (#a78bfa)

BELOW Theepa: Dashed arrow labeled "delegates when KB lacks answer"

  Rounded rectangle "Researcher Sub-Agent"
  Model: gemini-2.5-flash
  Border color: blue (#60a5fa)

  Inside: Single green pill "google_search (ADK built-in)"

  Red warning box: "ADK Constraint: google_search CANNOT coexist with other tools in the same agent — must isolate in sub-agent"

LEFT: Arrow from "User (Voice or Text)" → Theepa
RIGHT: Arrow from Theepa → "Response (Voice + Actions)"

BOTTOM RIGHT: Arrow from "navigate_user_browser" tool → "Chrome Extension" box labeled "triggers DOM capture + annotation"

The key insight to show: navigate_user_browser is a TOOL that Theepa calls during voice conversation. When user says "help me find the submit button", Theepa calls this tool, which sends a request to the Chrome extension to capture the page and annotate it. Voice drives UI navigation.
```

---

## Diagram 3: End-to-End Data Flow

```
Create a data flow diagram titled "Vigil — End-to-End Data Flow"

Dark background. Three horizontal swim lanes:

LANE 1: "CLIENT" (top)

  Left box: "Web App (SPA)"
    - Vite + 8 Web Components
    - AudioWorklet capture (PCM16 @ 16kHz)
    - AudioWorklet playback
    - System Logs tab (polls /api/activity)
    - Session onboarding (name + language)

  Right box: "Chrome Extension (Manifest V3)"
    - Shield: auto-scan every page navigation
    - Screenshot capture (JPEG)
    - DOM element capture (150 max, bounding rects)
    - Annotation renderer (pulsing overlays)
    - Action executor (click, fill, scroll)
    - Shield banner (threat warnings)

  Arrow from Web App down: "WebSocket /ws/session (bidirectional audio + JSON)"
  Arrow from Chrome Extension down: "REST POST /api/shield (screenshot + DOM)"

  CRITICAL ARROW: Dashed line from Web App → Chrome Extension labeled:
  "Voice triggers UI annotations: User says 'find the submit button' → Theepa calls navigate_user_browser tool → server sends to extension → extension captures page → Gemini Vision analyzes → annotations rendered on page"

LANE 2: "SERVER" (middle)

  Large box: "FastAPI Server"
    Inside boxes:
    - "Voice Session Handler" (/ws/session) — bidirectional audio with Gemini Live
    - "Shield Handler" (/api/shield) — 4-layer detection pipeline
    - "Navigate Handler" (/api/navigate) — Gemini Vision page analysis
    - "ADK Chat Handler" (/api/adk/chat) — text-based ADK sessions
    - "Activity Feed" (/api/activity) — real-time event log (deque)

    Below: "Session State Machine"
    4 stages: initiation → diagnosis → troubleshoot → resolution
    12 checkpoints across stages

LANE 3: "GOOGLE CLOUD" (bottom)

  Three boxes:
  - "Gemini Live API" — voice streaming, tool calling, 20 languages
  - "Gemini 2.5 Flash" — vision analysis, search grounding, JSON schema
  - "Web Risk API" — URL threat lookup, ~100ms

  Arrows up from each to the server showing which handler uses which API.

Key data flows to highlight:
1. Voice: Mic → AudioWorklet → WebSocket → Server → Gemini Live → Tool calls → Server → Tools execute → Results back → Gemini Live → Voice response → WebSocket → AudioWorklet → Speaker
2. Shield: Page nav → Extension captures screenshot+DOM → POST /api/shield → OSINT → Web Risk → Gemini Vision → Search Grounding → Verdict → Badge + Banner
3. UI Navigation (voice-driven): User speaks → Gemini Live calls navigate_user_browser → Server → POST to extension → Extension captures page → Server sends to Gemini Vision → Actions returned → Extension renders annotations
```

---

## Diagram 4: Shield Detection Pipeline

```
Create a flowchart titled "Vigil Shield — 4-Layer Detection Pipeline"

Dark background. Vertical flow:

START (circle): "Page Navigation Detected"
Arrow labeled "Auto-scan on chrome.tabs.onUpdated"

LAYER 0 (gray #6b7280):
"OSINT Domain Analysis" — ⚡ 0ms (pure heuristic)
6 small boxes inside:
  - TLD Reputation Scoring (.com=high, .xyz=low)
  - Typosquatting Detection (Levenshtein against known brands)
  - Brand Impersonation Check
  - Subdomain Depth Analysis
  - Known-Safe Whitelist (Google, GitHub, Amazon...)
  - Domain Length & Character Analysis
Output: "Domain Score 0-100 + Flags"

Arrow down

LAYER 1 (green #81c784):
"Google Web Risk API" — ⏱ ~100ms
Checks against:
  - SOCIAL_ENGINEERING (phishing)
  - MALWARE
  - UNWANTED_SOFTWARE
Note: "If match → immediate HIGH/CRITICAL verdict"

Arrow down

LAYER 2 (purple #a78bfa):
"Gemini Vision Analysis" — ⏱ ~3s
Sends: Screenshot (JPEG) + DOM structure + OSINT findings + Web Risk results
Analyzes for:
  - Fake Login Forms (credential harvesting)
  - Visual Brand Cloning (logo/layout matching)
  - Urgency Scam Tactics (fake timers, "act now")
  - Payment Fraud (non-HTTPS forms)
  - AI-Generated Content (deepfake indicators)
  - Credential Harvesting (form posting to different domain)
Output: "threat_level + findings[] + evidence"

Diamond decision: "threat_level >= medium?"
  No → arrow right to "SAFE ✓" (green circle)
  Yes → arrow down

LAYER 3 (amber #f0ab00):
"Google Search Grounding" — ⏱ ~2s
Query: "What is [domain]? Is it legitimate or reported as scam?"
Two columns:
  Negative phrases: "confirmed scam", "phishing site", "reported fraud"
  Positive phrases: "is legitimate", "official website", "trusted company"
Key feature: "⚡ CAN DE-ESCALATE — if search confirms legitimacy, threat level LOWERED"

Arrow down

END: "Final Verdict"
Five badges: SAFE(green) | LOW(green) | MEDIUM(amber) | HIGH(red) | CRITICAL(red)
Two outputs:
  - Chrome badge (per-tab: ✓ or ⚠ or ‼)
  - Page banner (top overlay for medium+ threats)
  - Cached per tab (instant popup on reopen)
```

---

## Diagram 5: Voice Session — Real-Time Architecture

```
Create a sequence diagram titled "Voice Session — WebSocket Architecture"

Dark background. Three vertical columns:

COLUMN 1: "Browser (Web App)" — amber
COLUMN 2: "FastAPI Server" — blue
COLUMN 3: "Gemini Live API (Vertex AI)" — purple

Sequence:

1. Browser → Server: "WebSocket Connect /ws/session?token=xxx"
2. Server → Gemini: "Live Connect (gemini-live-2.5-flash-native-audio)"
   Config: system_instruction (240-line Theepa prompt), voice config, 9 tool declarations
3. Browser → Server: "Audio chunks (PCM16 base64, ~60ms intervals)"
   Note on Browser: "AudioWorklet capture-processor.js → PCM16 @ 16kHz"
4. Server → Gemini: "Forward audio stream"
5. Gemini → Server: "Audio response chunks"
6. Server → Browser: "Audio playback"
   Note on Browser: "AudioWorklet playback-processor.js → Speaker"

Then show tool calling flow:
7. Gemini → Server: "Tool call: search_knowledge_base({query: 'VPN error'})"
8. Server box: "Execute tool locally → returns results"
9. Server → Gemini: "Tool result: {articles: [...]}"
10. Gemini → Server → Browser: "Voice: 'I found 3 relevant articles...'"

Then show UI navigation flow (THE KEY DIFFERENTIATOR):
11. User speaks: "I can't find the upload button"
12. Gemini → Server: "Tool call: navigate_user_browser({guidance: 'Find upload button'})"
13. Server → Chrome Extension: "POST: capture page screenshot + DOM"
14. Chrome Extension → Server: "Screenshot + DOM elements"
15. Server → Gemini 2.5 Flash: "Vision analysis of page"
16. Gemini Flash → Server: "Actions: [{type:'highlight', selector:'#upload-btn', label:'Click here'}]"
17. Server → Chrome Extension: "render_annotations(actions)"
18. Extension renders: pulsing overlay on the upload button with label
19. Gemini Live → Browser: "Voice: 'I've highlighted the upload button on your screen'"

Session state updates throughout:
- Stage progression: initiation → diagnosis → troubleshoot → resolution
- Checkpoint completions logged to Activity Feed
- Real-time visibility in System Logs tab

Bottom note: "Native speech-to-speech — no separate STT/TTS. Voice + tool calling + UI navigation in one seamless conversation."
```

---

## Diagram 6: Chrome Extension Architecture

```
Create a layered diagram titled "Vigil Chrome Extension — Shield-Only Architecture"

Dark background. Three horizontal layers stacked:

LAYER 1 — "Popup UI" (amber border):
  Three sections side by side:

  "Shield Controls":
  - Auto-scan toggle (on/off)
  - "Scan This Page" button
  - Verdict display (icon + level + summary)
  - OSINT domain score (0-100)
  - Layer-by-layer findings
  - Threat evidence citations

  "Live Status":
  - Current tab name
  - Current URL hostname
  - Last scan time
  - Verdict badge (Safe/Suspicious/Danger)
  - Server connection status

  "Settings":
  - Server URL input
  - Language selector (20 languages)
  - Connect/Disconnect

LAYER 2 — "Background Service Worker" (blue border):
  "Message Router":
  - shield_scan → shieldScan() → POST /api/shield
  - check_health → GET /health
  - get_tab_scan → tabScanCache lookup
  - save_settings → chrome.storage.local

  Three sub-boxes:
  - "Auto-Scan Listener": chrome.tabs.onUpdated → auto-scan on navigation (1.5s delay)
  - "Per-Tab Scan Cache": tabId → {threat_level, summary, timestamp}
  - "Badge Manager": ✓ green (safe) | ! amber (medium) | !! red (high/critical)

  Also handles (from voice session server-side):
  - render_annotations → forwards to content script
  - execute_actions → forwards to content script

LAYER 3 — "Content Script" (green border):
  Injected into every page. Four boxes:

  "DOM Capture": 150 max interactive elements, bounding rects, selectors, attributes
  "Shield Banner": Top-of-page warning overlay for medium+ threats
  "Annotation Renderer": Pulsing overlays, step # badges, action labels (triggered by voice session)
  "Action Executor": click(), fill(), scroll(), highlight() (triggered by voice session)

RIGHT SIDE: Arrow from Layer 2 → "Vigil Backend Server"
  REST calls:
  - POST /api/shield → 4-layer pipeline → verdict
  - GET /health → connectivity check

  The server also pushes to extension via the voice session:
  - navigate_user_browser tool → triggers annotation rendering
  - This is how voice commands drive UI annotations

KEY INSIGHT BOX at bottom:
"The extension has NO text input for UI help. UI navigation is voice-driven:
User speaks → Gemini Live → navigate_user_browser tool → Server → Extension → Annotations
This makes the voice session the single control plane for both IT support AND page navigation."
```

---

## Diagram 7: Shopping Extension (Future Vision)

```
Create a diagram titled "Vigil for Shopping — Architecture Extension (Future)"

Dark background. Show existing pipeline on left extending to shopping on right.

LEFT: Existing 4-Layer Shield Pipeline (compact version):
Layer 0: OSINT Domain Analysis
Layer 1: Google Web Risk API
Layer 2: Gemini Vision
Layer 3: Search Grounding

ARROWS from each layer to shopping-specific capabilities on the RIGHT:

Layer 0 → "Seller Domain Verification"
  - Store registration age heuristic
  - TLD reputation (sketchy TLDs = flag)
  - Brand typosquatting for e-commerce brands

Layer 1 → "Known Scam Store Database"
  - Reported fake storefronts
  - Payment fraud blacklists

Layer 2 → "Product Page Analysis"
  - Too-good-to-be-true deal detection
  - Fake countdown timer detection
  - AI-generated product review spotting
  - Stock photo detection on "real product" claims
  - Hidden fee scanning in checkout flows
  - Fake trust badge identification

Layer 3 → "Seller Reputation Verification"
  - BBB / Trustpilot cross-reference
  - Scam report search
  - Price comparison (is this deal realistic?)

BELOW: "Voice-Driven Shopping Assistance"
  User says → Vigil responds:
  "Is this deal legit?" → Shield pipeline analyzes + voice explains findings
  "Help me checkout" → navigate_user_browser highlights cart, shipping, payment fields
  "Any hidden fees?" → Gemini Vision scans fine print, highlights extra charges
  "Are these reviews real?" → Vision analyzes review patterns for AI generation

BOTTOM NOTE: "Same pipeline, same tools, expanded prompts. Zero new code needed — just prompt engineering on Layer 2 and Layer 3."

Colors: Existing pipeline in Vigil colors. Shopping extensions in gold (#f59e0b).
```

---

## Color Reference

| Element | Hex | Usage |
|---------|-----|-------|
| Vigil/Shield | #00d4aa | Teal — shield, safe indicators |
| Voice/Theepa | #e8a73e | Amber — voice, agent |
| Server | #4d9ff7 | Blue — FastAPI, platform |
| Gemini/AI | #a78bfa | Purple — AI models, tools |
| Safe | #81c784 | Green — safe verdicts |
| Danger | #e57373 | Red — threats |
| Warning | #f0ab00 | Amber — suspicious |
| System | #6b7280 | Gray — OSINT, infra |
| Shopping | #f59e0b | Gold — future commerce |
| Background | #0a0b10 | Dark — consistent BG |
