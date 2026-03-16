# Vigil — Submission Kit

**Deadline**: Mar 17, 2026 @ 5:30am IST
**Platform**: Devpost (Gemini Live Agent Challenge)
**Prize Pool**: $80,000

---

## Submission Checklist

### Code & Deployment
- [x] GitHub repo public: https://github.com/vigneshbarani24/Gemini-AI-Agents
- [x] Live demo deployed: https://resolve-743776360861.us-central1.run.app
- [x] Cloud Run working with ADK enabled
- [x] Chrome extension loadable from `extension/` folder
- [x] `README.md` complete with Quick Start
- [ ] Final `git push` with all changes

### Devpost Fields
- **Title**: `Vigil — Real-Time Scam Shield + Voice-First IT Support, Powered by Gemini Live`
- **Tagline**: `A Chrome extension that scans every page with a 5-layer AI pipeline. It sees what you see — and warns you before you get phished.`
- **Try It Live URL**: `https://resolve-743776360861.us-central1.run.app`
- **GitHub URL**: `https://github.com/vigneshbarani24/Gemini-AI-Agents`
- **Video URL**: (record and add)
- **Categories**: Live Agents, UI Navigator
- **Built With Tags**: Gemini 2.5 Flash, Google Web Risk API, Google Search Grounding, Google ADK, Gemini Live API, Vertex AI, Google Cloud Run, Google GenAI SDK, Python, FastAPI, JavaScript, Vite, Web Components, Web Audio API, Chrome Extension, Terraform, Docker, WebSocket

### Content (copy from docs/devpost-submission.md)
- [x] Inspiration — mom's phishing story first, then IT support context
- [x] What It Does — shield first, then fake content detection, then voice/IT
- [x] How We Built It — shield pipeline + ADK + voice architecture
- [x] Challenges — Vision flagging Google as scam (lead with shield story)
- [x] Accomplishments — de-escalation, fake content, danger zones, then voice
- [x] What We Learned — prompt eng for security, OSINT, ADK constraints
- [x] What's Next — mobile-native shield, safe shopping, threat sharing

### Demo Video (2-3 minutes)
- [ ] **Record demo video** — this is the #1 thing judges see
- [ ] Upload to YouTube (unlisted)
- [ ] Add URL to Devpost + README

#### Demo Script (suggested flow — LEAD WITH SHIELD):
```
0:00 - 0:10  Hook: "What if every page you visited was automatically scanned
             for scams, phishing, and fake content — before you even click?"

0:10 - 0:50  Vigil Shield Demo (THE STAR):
             - Open a clean page (google.com) → show green ✓ badge
             - Open the extension popup → show Live Status, OSINT domain score
             - Visit a test phishing page → show red ‼ badge + warning banner
             - Show the 5-layer breakdown in popup (OSINT, Web Risk, Vision, Search, Claims)
             - Show danger zone annotations on a deceptive page
             - Mention: "Smart de-escalation — if Google Search confirms
               a flagged site is legit, the threat level goes DOWN"

0:50 - 1:00  Fake Content Detection:
             - Show a fake news page → Vigil fact-checks with citations
             - "Is this article true?" → returns Reuters/BBC/AP sources

1:00 - 1:45  Voice Session Demo:
             - Click "Start Voice Session" on web app
             - Say: "Is this page safe?" → show Vigil shield scan via voice
             - Show System Logs tab → real-time agent transfers + tool calls
             - Say: "I can't find the upload button" → show pulsing overlays
             - Say: "I'm getting error AUTH-003" → show IT diagnostic flow
             - Show ITSM ticket creation in logs

1:45 - 2:10  Architecture Flash:
             - Show architecture diagram
             - Mention: 4 agents, 16 tools, 5-layer shield pipeline
             - "Vigil is the shield engine. Theepa is the voice."
             - Show ADK multi-agent graph
             - Show Cloud Run deployment

2:10 - 2:30  Close: "Vigil. A 5-layer scam shield that protects every page
             you visit. With voice-first IT support built on the same engine.
             Built solo with Gemini Live API."
```

### Images for Devpost
- [ ] Architecture diagram (render from docs/architecture-diagrams.md mermaid)
- [ ] Screenshot: Chrome extension shield result (safe page — green ✓)
- [ ] Screenshot: Chrome extension shield result (threat detected — red banner)
- [ ] Screenshot: Danger zone annotations on a deceptive page
- [ ] Screenshot: Fake content detection with citations
- [ ] Screenshot: Web app home screen
- [ ] Screenshot: Voice session with System Logs showing agent transfers
- [ ] Screenshot: Page annotations from voice-driven UI navigation

---

## Pre-Submission Final Checks

```bash
# 1. Rebuild frontend
cd frontend && npm run build && cd ..

# 2. Copy dist
cp -r frontend/dist/* dist/

# 3. Test locally
python -m uvicorn server.main:app --port 8080

# 4. Test these (IN ORDER — Shield first):
#    - http://localhost:8080 → web app loads
#    - http://localhost:8080/health → {"status":"ok","adk":true}
#    - Chrome extension → connects, shield scans, green badge
#    - Visit a suspicious page → shield flags it, warning banner
#    - Start voice session → mic works, agent responds
#    - Ask "Is this page safe?" → Vigil shield scan via voice
#    - System Logs tab → shows activity with agent transfers

# 5. Deploy
export PROJECT_ID=your-project-id
bash deploy.sh

# 6. Verify live URL
curl https://resolve-743776360861.us-central1.run.app/health

# 7. Git push
git add -A
git commit -m "feat: final submission — Vigil for Gemini Live Agent Challenge"
git push origin main
```

---

## Key Selling Points (for judges)

1. **5-layer shield with smart de-escalation** — OSINT → Web Risk → Gemini Vision → Google Search → Content Claim Verification. Most security tools only escalate. Vigil lowers threat levels when Search confirms legitimacy. Content claims are verified against official sources (e.g. "Qatar Airways" on Reddit → checks qatarairways.com + Reuters/BBC/AP).
2. **Fake content detection with citations** — "Is this article true?" → cross-references Reuters, BBC, AP → returns citations. Novel capability no other submission has.
3. **Danger zone annotations** — Vigil identifies deceptive UI elements → Chrome extension renders red warning overlays on the actual page. Visual protection.
4. **Auto-scans every page** — zero clicks. The extension silently runs the full pipeline on every navigation. Green badge = safe. Red banner = threat.
5. **4-agent multi-agent orchestration** — Theepa + Vigil + Researcher + Threat Intel. Hierarchical delegation, not a flat chatbot. Visible agent transfers in real-time logs.
6. **16 tools** — 7 shield + 8 IT helpdesk + google_search. Firing in parallel, not one at a time.
7. **Voice-driven UI navigation** — the voice agent controls a Chrome extension mid-conversation to annotate page elements. No other submission does this.
8. **Transparent AI orchestration** — every agent transfer, tool call, and reasoning step visible in the live activity log. Judges can SEE the multi-agent brain working.
9. **20 languages, one model** — native speech-to-speech, not translation.
10. **Solo build** — entire platform: backend, frontend, Chrome extension, Terraform, deployment.

---

## Judging Criteria Mapping

| Criteria | What We Show |
|----------|-------------|
| **Multimodal** | Vision (shield screenshot analysis, danger zones) + Voice (Gemini Live) + Text (ADK chat) + DOM annotations |
| **Agentic** | 4 agents, 16 tools, hierarchical delegation. Vigil sub-agent with 7-tool shield pipeline + Threat Intel search agent |
| **Grounding** | Google Search in 2 sub-agents: threat_intel (scam/fact-check with citations) + researcher (IT research) + Content Claim Verification (Layer 4) against official sources |
| **UI Navigator** | Voice → navigate_user_browser → Chrome extension → DOM capture → Gemini Vision → annotations + danger zone overlays |
| **Cloud Native** | Vertex AI + Cloud Run + Terraform + Docker |
| **Innovation** | 5-layer shield with de-escalation + fake content detection with citations + danger zone annotations + transparent AI (live logs) |
| **Multilingual** | 20 languages natively in voice, tool output, threat alerts, and fact-check results |

---

## The Pitch (30 seconds)

"Vigil is a Chrome extension that scans every page you visit with a 5-layer AI pipeline — OSINT, Google Web Risk, Gemini Vision, Google Search, and Content Claim Verification. It catches phishing, fake content, and deceptive UI before you click. When it finds something dangerous, it warns you with a banner and highlights the dangerous elements right on the page. And when you need help, talk to it — Vigil has a voice-first IT agent built on Gemini Live that sees your screen and guides you step-by-step. 4 agents, 16 tools, 20 languages. Built solo."

---

*Good luck. You built something real. Now ship it.*
