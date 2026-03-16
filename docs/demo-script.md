# Resolve + Vigil — Demo Video Script (< 4 minutes)

## Recording Tips
- Screen record at 1080p or higher
- Use a quiet room for voice narration
- Have the app running locally or on Cloud Run
- Pre-load a test scenario (portal login error recommended)
- Have the Chrome extension installed and connected

---

## [0:00 – 0:20] HOOK (Problem Statement)

**[Show: Frustrated user on a government portal / support ticket queue]**

**Narration:**
> "IT support wastes billions every year. The average ticket takes hours — most of that time is back-and-forth gathering basic information. And while users wait, they're navigating phishing pages and scam sites that slip past every filter. What if four AI agents could solve both problems at once?"

---

## [0:20 – 0:35] SOLUTION INTRO

**[Show: Resolve home screen — dark UI with professional design]**

**Narration:**
> "This is Resolve + Vigil. Four AI agents, one platform. Meet Theepa — a voice-first IT support agent who sees your screen, speaks 20 languages, and orchestrates 16 tools across 4 agents. And Vigil — a security sub-agent with 7 shield tools that auto-scans every page you visit, fact-checks content, and highlights danger zones."

**[Click "Start Session" button]**

---

## [0:35 – 1:50] LIVE DEMO — THEEPA (IT Support)

### Opening (0:35 – 0:45)
**[Theepa greets the user via voice]**

> Theepa: "Hi, I'm Theepa, your IT support specialist..."

**[Call out: Voice is natural, interruptible, professional persona]**

### Voice Interaction (0:45 – 1:10)
**[Speak to Theepa]:**
> "Hi Theepa, I'm trying to submit a form on the benefits portal but I keep getting error AUTH-003."

**[Show: Theepa immediately calls multiple tools — KB search, error lookup, portal page lookup]**
**[Show: Diagnostic tracker progresses from Initiation → Diagnosis]**

### Screen Navigation (1:10 – 1:30)
**[Show Chrome extension highlighting elements on the page]**

**Narration:**
> "Watch this — Theepa doesn't just tell you what to click. Through the Chrome extension, she highlights the exact button, fills forms, and navigates the page for you."

**[Show: Extension annotations with step badges, pulsing highlights]**

### Google Search Grounding (1:30 – 1:40)
**[Theepa calls research_support_topic]**

**Narration:**
> "When the internal KB doesn't have the answer, Theepa searches the web with Google Search grounding — no hallucination, always verifiable."

### Ticket Creation (1:40 – 1:50)
**[Theepa creates an ITSM ticket with diagnostic report]**
**[Show: Session summary with downloadable report]**

---

## [1:50 – 2:50] LIVE DEMO — VIGIL (Scam Shield + Voice)

### Shield Auto-Scan (1:50 – 2:05)
**[Show: Chrome extension — green ✓ on safe page, then navigate to suspicious page]**

**Narration:**
> "Now the real innovation. Vigil Shield auto-scans every page. Watch — green checkmark means safe. Now I'll visit a suspicious site..."

**[Show: Red warning banner slides down, extension badge turns red]**

### Voice-Driven Security (2:05 – 2:25)
**[In the voice session, speak to Theepa:]**
> "Theepa, is this page safe?"

**[Show: Theepa transfers to Vigil sub-agent → Vigil fires shield tools → activity log shows tool calls in real time]**

> Theepa: "Stop. My security scan detected this page is impersonating PayPal. The domain is paypai-secure.com, not paypal.com. Do NOT enter any information. I've logged this as a confirmed phishing threat."

**[Show: Live activity log showing: agent_transfer → vigil, scan_url_safety → critical, report_threat → logged]**

### Fake Content Detection (2:25 – 2:40)
**[Navigate to a news article with dubious claims]**
**[Speak:]**
> "Is this article true?"

**[Show: Vigil's detect_fake_content tool fires → Google Search grounding → citations appear]**

> Theepa: "I fact-checked that claim. According to Reuters and BBC, this is misleading. The actual statistic is... Here are the verified sources."

**[Show: Citations from Reuters, BBC in the activity log]**

### Danger Zone Annotations (2:40 – 2:50)
**[Navigate to a page with deceptive buttons]**
**[Speak:]**
> "Are there any dangerous buttons on this page?"

**[Show: Red overlays appear on fake download buttons via Chrome extension]**

> Theepa: "I've highlighted 3 deceptive elements in red on your page. The 'Download Now' button is actually an ad redirect. The real download link is the small text below it."

---

## [2:50 – 3:10] ARCHITECTURE

**[Show: Architecture diagram from README]**

**Narration:**
> "Under the hood: 4 ADK agents, 16 tools. Theepa is the voice — she delegates to Vigil for security, to the Researcher for IT intel, and to Threat Intel for scam verification. Each agent transfer and tool call is visible in real-time in the activity log. The Chrome extension shows you exactly what the AI is thinking and doing."

---

## [3:10 – 3:25] CLOUD DEPLOYMENT

**[Show: GCP Console — Cloud Run service running]**
**[Show: Terraform code in the repo]**

**Narration:**
> "Deployed on Cloud Run with one command. Terraform IaC. 4 ADK agents with proper sub-agent isolation for google_search."

---

## [3:25 – 3:45] KEY DIFFERENTIATORS

**[Show: Feature highlights — quick cuts]**

**Narration:**
> "4 agents. 16 tools. 20 languages. Fake content detection with citations. Danger zone annotations. Live orchestration logs. Chrome extension that clicks, fills, navigates, and warns. 5-layer scam detection. 4-stage diagnostic pipeline. ITSM tickets. And the vision: every phone ships with this — mobile-native scam protection + voice IT support. No extension needed."

---

## [3:45 – 4:00] CLOSING

**[Show: Vigil home screen]**

**Narration:**
> "Vigil. 4 agents. 16 tools. Voice-first IT support and real-time scam protection with fact-checking. Built solo with Gemini Live API, Google ADK, and Vertex AI. The future: every mobile device ships with this."

**[Show: GitHub URL + live demo URL]**

---

## B-Roll Shots to Capture
1. Home screen (dark theme, professional design)
2. Session starting — Theepa's greeting
3. Diagnostic tracker progressing through 4 stages
4. Chrome extension highlighting page elements
5. Extension filling a form field
6. Vigil Shield alert popup with threat details
7. Transcript showing parallel tool results
8. Session timer + SLA badge (P1/P2/P3)
9. Summary view with diagnostic report download
10. Chrome extension popup (both modes)
11. GCP Console — Cloud Run service + logs
12. Architecture diagram (full screen, 3-5 seconds)
13. Terraform files in repo
