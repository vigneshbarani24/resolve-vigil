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
> "IT support wastes billions every year. The average ticket takes hours — most of that time is back-and-forth gathering basic information. And while users wait, they're navigating phishing pages and scam sites that slip past every filter. What if two AI agents could solve both problems at once?"

---

## [0:20 – 0:35] SOLUTION INTRO

**[Show: Resolve home screen — dark UI with professional design]**

**Narration:**
> "This is Resolve + Vigil. Two AI agents, one platform. Meet Theepa — a voice-first IT support agent who sees your screen, speaks 20 languages, and runs 9 tools simultaneously. And Vigil — a scam shield that auto-scans every page you visit."

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

## [1:50 – 2:30] LIVE DEMO — VIGIL (Scam Shield)

### Shield Mode (1:50 – 2:05)
**[Show: Chrome extension popup — toggle to Shield mode]**

**Narration:**
> "Now the real innovation. Switch to Vigil Shield mode. Every page you visit is automatically scanned for scams, phishing, and AI-generated fraud."

### Scam Detection (2:05 – 2:25)
**[Navigate to a suspicious-looking page]**

**[Show: Vigil alert popup with threat details]**
- Layer 1: Web Risk API flags the domain
- Layer 2: Gemini Vision detects fake login form
- Layer 3: Google Search confirms scam reports

**Narration:**
> "Three layers of detection. Google Web Risk API checks the URL. Gemini Vision analyzes the page visually — fake branding, suspicious forms, urgency tactics. Then Google Search verifies against known scam reports. All automatic."

**[Show: Threat level badge, detailed recommendations]**

---

## [2:30 – 3:00] ARCHITECTURE

**[Show: Architecture diagram from README]**

**Narration:**
> "Under the hood: A Vite frontend connects via WebSocket to FastAPI on Cloud Run. Gemini Live API handles voice and vision. 9 backend tools execute in parallel. The Chrome extension captures DOM and executes actions. Vigil's 3-layer shield uses Web Risk API, Gemini Vision, and Google Search grounding. All on Google Cloud with Vertex AI."

---

## [3:00 – 3:20] CLOUD DEPLOYMENT

**[Show: GCP Console — Cloud Run service running]**
**[Show: Terraform code in the repo]**

**Narration:**
> "Deployed on Cloud Run with one command. Infrastructure as Code with Terraform. ADK multi-agent pattern with researcher sub-agent for google_search isolation."

---

## [3:20 – 3:45] KEY DIFFERENTIATORS

**[Show: Feature highlights — quick cuts]**

**Narration:**
> "9 parallel tools. 20 languages. Chrome extension that clicks, fills, and navigates. 3-layer scam detection with auto-scan. 4-stage diagnostic pipeline. SLA tracking. Full ITSM ticket generation. And two AI agents working together — one protects, one resolves. No other submission does both."

---

## [3:45 – 4:00] CLOSING

**[Show: Resolve + Vigil home screen]**

**Narration:**
> "Resolve + Vigil. Two agents. One platform. Built with Gemini Live API, Google ADK, and Vertex AI on Google Cloud."

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
