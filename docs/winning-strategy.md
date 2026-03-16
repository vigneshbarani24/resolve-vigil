# Resolve + Vigil — Winning Strategy for Gemini Live Agent Challenge

> Compiled: 2026-03-16 | Deadline: Mar 17, 2026 @ 5:30am IST
> Prize target: Best Live Agent ($10K) + Best UI Navigator ($10K) + Grand Prize ($25K)

---

## 1. Judging Criteria Breakdown

### Innovation & Multimodal UX — 40% (MOST IMPORTANT)

| What Judges Ask | Resolve + Vigil Answer | Score Target |
|----------------|------------------------|--------------|
| Breaks "text box" paradigm? | Voice-first + Chrome extension actions = zero typing | 10/10 |
| "See, Hear, Speak" seamlessly? | Gemini Live voice + Vision screenshots + DOM actions | 10/10 |
| Distinct persona/voice? | Theepa — professional, SLA-obsessed IT specialist | 9/10 |
| Live and context-aware? | Bidi streaming, interruptible, 4-stage state machine | 9/10 |
| Innovation beyond basic agent? | Vigil auto-scan + dual-mode platform + UI Navigator | 10/10 |

### Technical Implementation & Architecture — 30%

| What Judges Check | Implementation |
|-------------------|---------------|
| GenAI SDK or ADK usage | ADK multi-agent (FunctionTool, sub-agents) + google-genai SDK |
| Google Cloud backend | Cloud Run + Vertex AI + Web Risk API |
| Sound agent logic | 9-tool pipeline with parallel execution + 3-layer shield |
| Error handling | Fallbacks, reconnection, turn gating |
| Anti-hallucination | Google Search grounding in both Theepa and Vigil |
| IaC deployment | Terraform + `deploy.sh` + Docker (bonus points) |

### Demo & Presentation — 30%

| Requirement | Plan |
|-------------|------|
| Clear problem/solution | "IT support is broken + users get scammed" → "Two AI agents solve both" |
| Architecture diagram | ASCII in README + visual in demo video |
| Cloud deployment proof | Cloud Run service + Terraform code |
| Working software demo | Live: voice interaction + Chrome extension + Vigil scan |

---

## 2. Why We Can Win BOTH Categories

### Live Agents ($10K)
- Voice-first with Gemini Live API
- 9 tools firing in parallel
- 4-stage diagnostic pipeline
- 20 languages
- SLA tracking + ITSM tickets
- Google Search grounding (anti-hallucination)

### UI Navigator ($10K)
- Chrome extension captures DOM with bounding rects
- Gemini Vision analyzes page structure
- Extension executes actions: highlight, click, fill, scroll
- Works on ANY webpage (not just a custom app)
- Vigil Shield auto-scans pages (bonus for this category)

### Grand Prize ($25K)
- Uses MORE Google tech than typical entries (ADK + Gemini Live + Gemini Flash + Web Risk + Search Grounding + Vertex AI + Cloud Run)
- TWO categories covered (Live Agents + UI Navigator)
- Most TANGIBLE output (tickets, diagnostic reports, scam alerts)
- REAL commercial value (IT helpdesk + cybersecurity)

---

## 3. Competitive Analysis

### What most competitors will build:
- Text-based chatbot with 1-2 tool calls
- Screenshot analysis without action execution
- Single-purpose agent (help OR protect, not both)
- English-only demo
- Local-only deployment

### What Resolve + Vigil does that others won't:
1. **DUAL-MODE** — Two agents (helpdesk + scam shield) in one platform
2. **CHROME EXTENSION** — Real DOM interaction, not just screenshot analysis
3. **AUTO-SCAN** — Vigil scans every page without user action
4. **3-LAYER DETECTION** — Web Risk + Vision + Search (novel architecture)
5. **20 LANGUAGES** — Speak Tamil, get English tickets
6. **9 TOOLS IN PARALLEL** — Most use 1-2 tools sequentially
7. **PRODUCTION-READY** — Docker + Terraform + Cloud Run

---

## 4. Submission Checklist

### Required Deliverables
- [x] **Text Description** (~1000 words): `docs/devpost-submission.md`
- [x] **Public GitHub Repository**: Clean README with setup instructions
- [ ] **Demo Video** (< 4 min): Record using `docs/demo-script.md`
- [x] **Architecture Diagram**: In README.md
- [ ] **GCP Deployment Proof**: Deploy to Cloud Run + screenshot

### Bonus Points (Do ALL Three)
- [x] **Content publication**: `docs/blog-post.md` — publish with #GeminiLiveAgentChallenge
- [x] **IaC deployment**: `terraform/` + `deploy.sh` in repo
- [ ] **Google Developer Group**: Sign up + link profile

### Submission Quality Checklist
- [x] README has clear setup instructions (copy-paste-run)
- [x] Architecture diagram is clean and readable
- [ ] Demo video has clear audio, no rushing
- [ ] All links work (test after submission!)
- [x] Code is clean, commented where necessary
- [x] .env.example is complete and documented
- [x] No secrets committed to repo

---

## 5. Priority Order (Time Is Short)

1. **Deploy to Cloud Run** — get a live URL
2. **Record demo video** — follow `docs/demo-script.md`
3. **Submit on Devpost** — copy from `docs/devpost-submission.md`
4. **Publish blog post** — copy from `docs/blog-post.md`, post on Medium/Dev.to
5. **GDG signup** — create profile, link in submission

---

## Sources

- [Gemini Live Agent Challenge (Official)](https://geminiliveagentchallenge.devpost.com/)
- [Challenge Resources](https://geminiliveagentchallenge.devpost.com/resources)
- [ADK Hackathon Winners](https://cloud.google.com/blog/products/ai-machine-learning/adk-hackathon-results-winners-and-highlights)
- [Devpost: How to Win (5 Judges)](https://info.devpost.com/blog/hackathon-judging-tips)
- [Devpost: Demo Video Tips](https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video)
