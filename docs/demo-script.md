# Vigil — Demo Video Script (< 4 minutes)

## Recording Tips
- Screen record at 1080p or higher
- Use a quiet room for voice narration
- Have the app running on Cloud Run: https://resolve-743776360861.us-central1.run.app
- Chrome extension installed and connected to the live server
- Pre-open 3 tabs: a safe page, a suspicious page, and a Reddit post with brand claims

---

## [0:00 – 0:15] HOOK

**[Show: A phishing page that looks exactly like PayPal]**

**Narration:**
> "This page looks exactly like PayPal. It's not. And your browser won't warn you. What if your browser could see what you see — and stop you before you click?"

---

## [0:15 – 0:30] INTRO — VIGIL

**[Show: Vigil home screen]**

**Narration:**
> "This is Vigil. A Chrome extension that silently scans every page you visit with a 5-layer AI pipeline. OSINT, Google Web Risk, Gemini Vision, Google Search verification, and Content Claim Verification. No button to click — it just protects you."

---

## [0:30 – 1:15] DEMO — VIGIL SHIELD (THE STAR)

### Safe Page (0:30 – 0:40)
**[Browse to google.com]**
**[Show: Green ✓ badge on extension icon]**

> "Google.com — green checkmark. All 5 layers passed. Open the popup — OSINT domain score 100/100, known trusted domain."

### Threat Detected (0:40 – 1:00)
**[Browse to a suspicious/phishing test page]**
**[Show: Red !! badge, warning banner slides down from top]**

> "Now a suspicious site. Watch — red badge, warning banner. Open the popup — here's the 5-layer breakdown. OSINT flagged typosquatting. Web Risk matched Google's threat database. Gemini Vision detected a fake login form. And danger zone annotations highlight the deceptive elements directly on the page."

**[Show: Red overlays on fake buttons/forms on the page]**

### Content Claim Verification (1:00 – 1:15)
**[Browse to a Reddit post about a brand (e.g. airline, bank)]**

> "Here's what no other tool does. This Reddit post claims Qatar Airways cancelled flights. Reddit.com is safe — but is the content true? Vigil's Layer 4 fires automatically. It checks qatarairways.com and Reuters, BBC, AP. If the claim can't be verified, you see this annotation: UNVERIFIED."

**[Show: Content Claim Verification finding in the popup]**

---

## [1:15 – 1:30] DEMO — DEEPFAKE / AI DETECTION

**[Browse to a page with AI-generated images or fake reviews]**

> "Vigil also detects AI-generated content. Gemini Vision examines every image for deepfake artifacts — unnatural skin, warped fingers, inconsistent lighting. Flagged images get colored warning overlays. Fake reviews, synthetic headshots — all annotated directly on the page."

---

## [1:30 – 2:15] DEMO — VOICE SESSION

### Start Voice (1:30 – 1:40)
**[Click Start Voice Session on web app]**
**[Theepa greets]**

> "Now the voice. This is Theepa — powered by Gemini Live. Native speech-to-speech, 20 languages."

### Shield via Voice (1:40 – 1:55)
**[Speak:]** "Is this page safe?"

**[Show: System Logs tab — agent transfer Theepa → Vigil, scan_url_safety tool fires, result returns]**

> "Watch the System Logs. Theepa transfers to Vigil. Vigil fires the 5-layer scan. Results come back. Theepa speaks the verdict."

### UI Navigation via Voice (1:55 – 2:15)
**[Speak:]** "I can't find the submit button"

**[Show: Chrome extension renders pulsing green overlay on the button]**

> "Voice-driven UI navigation. The agent calls navigate_user_browser, the extension captures 150 DOM elements, sends them to Gemini Vision, and highlights the exact button on your screen. No clicking through menus — just ask."

---

## [2:15 – 2:45] DEMO — IT SUPPORT

### Error Diagnosis (2:15 – 2:30)
**[Speak:]** "I'm getting error AUTH-003 on the login page"

**[Show: System Logs — KB search + error lookup + portal lookup fire in parallel]**

> "IT support mode. Theepa fires 3 tools in parallel — knowledge base search, error code lookup, portal status check. Cross-references everything. Gives you the fix in seconds, not hours."

### Ticket Creation (2:30 – 2:45)
**[Show: ITSM ticket created in logs]**

> "If she can't fix it, she creates a full ITSM ticket with diagnostic report. Every tool call, every finding, documented automatically."

---

## [2:45 – 3:15] ARCHITECTURE

**[Show: Architecture diagram — docs/1-architecture.png]**

> "4 ADK agents in a hierarchical graph. Theepa is the voice — 8 IT tools. Vigil is the shield engine — 7 security tools. Researcher and Threat Intel are isolated google_search sub-agents. 16 tools total, firing in parallel."

**[Show: 5-layer pipeline diagram — docs/2-5layer-detection-pipeline.png]**

> "The 5-layer shield pipeline. OSINT instant heuristics. Google Web Risk API. Gemini Vision for deep page analysis. Google Search for domain verification with smart de-escalation. And Content Claim Verification — checking brand claims against official sources."

**[Show: ADK architecture — docs/3-adk-architecture.png]**

---

## [3:15 – 3:30] CLOUD DEPLOYMENT

**[Show: Cloud Run console OR deploy.sh code]**

> "Deployed on Google Cloud Run. One command: bash deploy.sh. Terraform IaC for the full infrastructure. Vertex AI for both Gemini 2.5 Flash and Gemini Live native audio."

**[Show: Health check response from live URL]**

---

## [3:30 – 3:50] KEY DIFFERENTIATORS

**[Quick cuts of features]**

> "5-layer scam detection with smart de-escalation. Content claim verification against official sources. Deepfake and AI image detection with visual annotations. Fake content fact-checking with Reuters, BBC, AP citations. Voice-driven UI navigation through a Chrome extension. 4 agents, 16 tools, 20 languages. Live orchestration logs — you can see every agent transfer and tool call happening in real time. Built solo."

---

## [3:50 – 4:00] CLOSING

**[Show: Vigil home screen + live URL]**

> "Vigil. A 5-layer scam shield that protects every page you visit — and a voice-first IT agent that sees your screen and guides you step-by-step. The vision: every phone ships with this built in. Built solo with Gemini Live API, Google ADK, and Vertex AI."

**[Show: GitHub URL + Cloud Run URL]**
- https://resolve-743776360861.us-central1.run.app
- https://github.com/vigneshbarani24/resolve-vigil

---

## B-Roll Shots to Capture
1. Extension green ✓ badge on safe page
2. Extension red !! badge + warning banner on threat page
3. 5-layer findings breakdown in extension popup
4. Danger zone annotations (red overlays on fake buttons)
5. Content Claim Verification result (unverified/debunked)
6. AI-generated image detection annotations
7. Voice session — Theepa greeting
8. System Logs showing agent transfers + tool calls
9. Chrome extension pulsing overlay on highlighted element
10. ITSM ticket creation in logs
11. Architecture diagrams (3 of them, 3-5 seconds each)
12. Cloud Run console / deploy.sh
13. Vigil home screen (opening + closing shot)
