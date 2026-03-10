# Guardian — Demo Video Script (< 4 minutes)

## Recording Tips
- Screen record at 1080p or higher
- Use a quiet room for voice narration
- Have the app running locally or on Cloud Run
- Pre-load a test scenario (VA01 error recommended)

---

## [0:00 – 0:20] HOOK (Problem Statement)

**[Show: SAP error screen / frustrated support ticket queue]**

**Narration:**
> "SAP support costs enterprises billions every year. The average Tier 1 ticket takes 4 hours to resolve — most of that time is wasted on back-and-forth gathering basic information. What if one AI agent could handle Tier 0.5 support live, in real-time, over voice?"

---

## [0:20 – 0:35] SOLUTION INTRO

**[Show: Guardian home screen — dark UI with floating SAP particles]**

**Narration:**
> "This is Guardian. An AI SAP Control Tower powered by Gemini Live API. Meet Jessica — your AI SAP veteran who sees your screen, hears your voice, and resolves issues in real time."

**[Click "Start Session" button]**

---

## [0:35 – 2:30] LIVE DEMO

### Opening (0:35 – 0:50)
**[Jessica greets the user via voice]**

> Jessica: "Hey, I'm Jessica, your S-A-P Guardian at KaarTech..."

**[Call out: Voice is natural, interruptible, professional persona]**

### Voice Interaction (0:50 – 1:15)
**[Speak to Jessica]:**
> "Hi Jessica, I'm having an error in VA01 — Sales Order creation. I'm getting error VG035."

**[Show: Jessica immediately calls multiple tools — KB search, error lookup, T-code lookup]**
**[Show: Diagnostic tracker progresses from Initiation → Diagnosis]**
**[Show: T-code command overlay flashes: "Jessica says: Run SU53"]**

### Screen Sharing (1:15 – 1:45)
**[Click "Share Screen" — show an SAP-like screenshot]**

**Narration:**
> "Watch this — I share my screen, and Jessica reads the error directly from the UI."

**[Jessica identifies the error from the screenshot and calls lookup tools]**
**[Show: Session timer counting, SLA badge appears (P2)]**

### Paste Screenshot (1:45 – 2:00)
**[Ctrl+V paste a screenshot]**

**Narration:**
> "I can also paste screenshots directly. Jessica analyzes them instantly."

### Google Search Grounding (2:00 – 2:15)
**[Jessica calls research_sap_topic for an OSS note]**

**Narration:**
> "When the internal KB doesn't have the answer, Jessica searches the web with Google Search grounding — finding the latest SAP OSS notes and patches. No hallucination."

**[Show: "[Researched: 3 web sources found]" in transcript]**

### Ticket Creation (2:15 – 2:30)
**[Jessica creates an ITSM ticket with full diagnostic report]**
**[Show: "[Ticket INC-xxxxx created]" in transcript]**
**[Click "End Session" → Summary view with RCA download]**

---

## [2:30 – 3:00] ARCHITECTURE

**[Show: Architecture diagram]**

**Narration:**
> "Under the hood: A Vite frontend connects via WebSocket to a FastAPI backend on Cloud Run. Gemini Live API handles voice and vision. 8 backend tools execute in parallel — knowledge base search, SAP error lookup, diagnostics, ITSM ticketing, and Google Search grounding. All running on Google Cloud with Vertex AI."

---

## [3:00 – 3:20] CLOUD DEPLOYMENT

**[Show: GCP Console — Cloud Run service running]**
**[Show: Logs streaming]**

**Narration:**
> "Deployed on Cloud Run with one command. Infrastructure managed with Terraform. The entire backend is production-ready on Google Cloud."

---

## [3:20 – 3:45] KEY DIFFERENTIATORS

**[Show: Feature highlights — quick cuts]**

**Narration:**
> "8 tools, 15 languages, screen analysis with vision, Google Search grounding for anti-hallucination, 4-stage diagnostic pipeline, live T-code command overlay, SLA tracking, and complete RCA generation. All in a single voice conversation."

---

## [3:45 – 4:00] CLOSING

**[Show: Guardian logo / home screen]**

**Narration:**
> "Guardian. Your AI SAP veteran. Built with Gemini Live API on Google Cloud."

**[Show: URL + GitHub link]**

---

## B-Roll Shots to Capture
1. Guardian home screen (dark theme, particles)
2. Session starting — Jessica's greeting
3. Diagnostic tracker progressing through stages
4. T-code overlay toast appearing
5. Screen share with SAP screenshot
6. Ctrl+V paste screenshot
7. Transcript showing tool results
8. Session timer + SLA badge
9. Summary view with RCA download button
10. GCP Console — Cloud Run logs
11. Architecture diagram (full screen, 3-5 seconds)
