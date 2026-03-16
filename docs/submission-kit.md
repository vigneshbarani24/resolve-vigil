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
- **Title**: `Vigil — Voice-First IT Support + Real-Time Scam Shield, Powered by Gemini Live`
- **Tagline**: `Talk to your IT helpdesk. Let it see your screen. Meanwhile, a 4-layer shield silently protects every page you visit.`
- **Try It Live URL**: `https://resolve-743776360861.us-central1.run.app`
- **GitHub URL**: `https://github.com/vigneshbarani24/Gemini-AI-Agents`
- **Video URL**: (record and add)
- **Categories**: Live Agents, UI Navigator
- **Built With Tags**: Gemini Live API, Vertex AI, Google Cloud Run, Google GenAI SDK, Google ADK, Google Web Risk API, Google Search Grounding, Python, FastAPI, JavaScript, Vite, Web Components, Web Audio API, Chrome Extension, Terraform, Docker, WebSocket

### Content (copy from docs/devpost-submission.md)
- [x] Inspiration — personal story, not corporate pitch
- [x] What It Does — voice agent + shield + voice-driven UI nav
- [x] How We Built It — honest architecture + tool table + ADK
- [x] Challenges — the real debugging stories
- [x] Accomplishments — voice-driven UI nav, de-escalation, 20 languages, solo
- [x] What We Learned — prompt eng for security, ADK constraints, AudioWorklets
- [x] What's Next — safe shopping, WHOIS, persistent ITSM

### Demo Video (2-3 minutes)
- [ ] **Record demo video** — this is the #1 thing judges see
- [ ] Upload to YouTube (unlisted)
- [ ] Add URL to Devpost + README

#### Demo Script (suggested flow):
```
0:00 - 0:15  Hook: "What if your IT agent could see your screen and your
             scam shield ran on every page — automatically?"

0:15 - 0:45  Vigil Shield Demo:
             - Open a clean page (google.com) → show green ✓ badge
             - Open the extension popup → show Live Status, OSINT score
             - Visit a test phishing page → show red ‼ badge + warning banner
             - Show the 4-layer breakdown in popup (OSINT, Web Risk, Vision, Search)

0:45 - 1:45  Voice Session Demo:
             - Click "Start Voice Session" on web app
             - Say: "Hi, I'm getting error AUTH-003 on the login page"
             - Show Theepa responding with diagnostic questions
             - Show System Logs tab → real-time tool calls appearing
             - Say: "I can't find the reset password button"
             - Show extension annotating the page with pulsing overlays
             - Say: "Can you create a ticket for this?"
             - Show ITSM ticket creation in logs

1:45 - 2:15  Architecture Flash:
             - Show architecture diagram
             - Mention: 8 tools, 4-layer shield, 20 languages, ADK multi-agent
             - Show Cloud Run deployment

2:15 - 2:30  Close: "Vigil. Voice-first IT support and real-time scam
             protection. Built solo with Gemini Live API."
```

### Images for Devpost
- [ ] Architecture diagram (render from docs/architecture-diagrams.md mermaid)
- [ ] Screenshot: Web app home screen
- [ ] Screenshot: Voice session with System Logs
- [ ] Screenshot: Chrome extension shield result (safe page)
- [ ] Screenshot: Chrome extension shield result (threat detected)
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

# 4. Test these:
#    - http://localhost:8080 → web app loads
#    - http://localhost:8080/health → {"status":"ok","adk":true}
#    - Start voice session → mic works, agent responds
#    - Chrome extension → connects, shield scans, green badge
#    - System Logs tab → shows activity

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

1. **Voice-driven UI navigation** — no other submission has the voice agent controlling a Chrome extension mid-conversation to annotate page elements
2. **4-layer shield with de-escalation** — most security tools only escalate. Vigil lowers threat levels when Search confirms legitimacy
3. **8 tools in parallel** — not sequential chatbot tool calling, parallel diagnostic execution
4. **20 languages, one model** — native speech-to-speech, not translation
5. **Solo build** — entire platform: backend, frontend, Chrome extension, Terraform, deployment
6. **Production-ready observability** — live activity feed, system logs tab, per-tab scan caching
7. **Extensible architecture** — safe shopping is the same pipeline with expanded prompts

---

## Judging Criteria Mapping

| Criteria | What We Show |
|----------|-------------|
| **Multimodal** | Voice (Gemini Live) + Vision (screenshots, page analysis) + Text (ADK chat) |
| **Agentic** | 8 tools, 4-stage diagnostic protocol, auto-escalation, ADK multi-agent |
| **Grounding** | Google Search in tools (anti-hallucination) + Shield Layer 3 (domain verification) |
| **UI Navigator** | Voice → navigate_user_browser → Chrome extension → DOM capture → Gemini Vision → annotations |
| **Cloud Native** | Vertex AI + Cloud Run + Terraform + Docker |
| **Innovation** | 4-layer real-time scam detection with OSINT + de-escalation |
| **Multilingual** | 20 languages natively in voice, tool output, and threat alerts |

---

*Good luck. You built something real. Now ship it.*
