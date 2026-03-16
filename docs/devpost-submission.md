# Devpost Submission — Vigil

## Title
Vigil — Voice-First IT Support + Real-Time Scam Shield, Powered by Gemini Live

## Tagline
Talk to your IT helpdesk. Let it see your screen. Meanwhile, a 4-layer shield silently protects every page you visit.

## Try It Live
https://resolve-743776360861.us-central1.run.app

---

## Inspiration

I work in enterprise IT. Every day, I watch the same scene play out: someone calls support, spends 20 minutes describing an error they can barely read, gets transferred twice, and ends up with a ticket that says "user reports issue with login." The actual fix? Clear the browser cache. Three minutes if you know what you're doing. Two hours through the standard process.

Then there's the other side — my mom called me last month because a site told her she'd "won a free iPhone" and asked for her card details. She almost fell for it. She's not naive; she's just not trained to spot the difference between a real checkout form and a phishing page.

These aren't separate problems. They're the same problem: **people need an AI that can see what they see, understand what they need, and act on their behalf.** So I built Vigil.

---

## What It Does

Vigil does two things really well:

### 1. Voice-First IT Support (Live Agent)

You talk to Vigil like you'd talk to a senior IT person who actually cares. It listens, sees your screen, and runs through a real diagnostic protocol — not a flowchart, a protocol:

- **Identify**: What's the error? What page? How bad is it? (Priority P1/P2/P3 set automatically)
- **Diagnose**: Searches the knowledge base, looks up error codes, checks portal status, cross-references everything — tools fire in parallel, not one at a time
- **Resolve**: Here's where it gets interesting. The agent calls `navigate_user_browser`, which triggers the Chrome extension to capture your page, send it to Gemini Vision, and render pulsing annotations right on the elements you need to click. It can even click them for you
- **Verify**: Confirms the fix worked, creates an ITSM ticket with a full diagnostic report, or escalates with context

It speaks 20 languages natively. Not translation — the Gemini Live model actually speaks Tamil, Hindi, German, Japanese. You can describe your error in Tamil and get your ITSM ticket in English.

### 2. Vigil Shield (Chrome Extension)

A 4-layer scam detection pipeline that runs on every page you visit. No button to click — it just works:

| Layer | What | Speed | How |
|-------|------|-------|-----|
| OSINT | Domain heuristics | <1ms | TLD reputation, typosquatting detection, brand impersonation, known-safe whitelist |
| Web Risk | Google's threat database | ~100ms | Known phishing, malware, social engineering URLs |
| Vision | Gemini sees the page | ~3s | Screenshot + DOM analysis for fake forms, visual cloning, urgency scams, AI-generated content |
| Search | Google Search verification | ~2s | Only triggers if Vision flags something. Cross-references domain against scam reports. **Can de-escalate** — if search confirms it's legit, threat level goes down |

The green checkmark on the extension icon? That means all 4 layers ran and your page is clean. The red warning banner that slides down from the top? That means get out.

### How Voice Drives UI Navigation

This is the part I'm proudest of. There's no "Assist" text box in the extension. The extension is shield-only. But when you're in a voice session and say "I can't find the upload button," here's what happens:

1. Gemini Live calls `navigate_user_browser` (a tool, mid-conversation)
2. The server tells the Chrome extension to capture the page
3. Extension grabs a screenshot + 150 interactive DOM elements with bounding boxes
4. Server sends everything to Gemini Vision
5. Vision returns: "element #23, selector `#upload-btn`, label 'Click here to upload'"
6. Extension renders a pulsing green overlay on that exact button with a step number
7. Agent says: "I've highlighted the upload button on your screen — it's the blue button in the top right"

Voice is the single control plane. One conversation handles diagnosis AND page navigation.

---

## How We Built It

**The honest version**: FastAPI backend with a WebSocket that pipes raw PCM audio to `gemini-live-2.5-flash-native-audio` on Vertex AI. AudioWorklet processors on the frontend handle mic capture and playback with basically zero latency. The Chrome extension is Manifest V3 with a service worker that auto-scans pages and a content script that captures DOM + renders annotations.

The hard part wasn't any single piece — it was making them all talk to each other. Voice session calls a tool, tool triggers the extension, extension captures the page, page goes to a different Gemini model for vision analysis, result goes back to the voice model which speaks the answer. All in real time.

### 8 Backend Tools

| Tool | What It Actually Does |
|------|----------------------|
| `search_knowledge_base` | Fuzzy keyword search across 20 IT helpdesk articles |
| `lookup_error_code` | Resolves codes like AUTH-003, PAY-001 across 7 categories |
| `lookup_portal_page` | "What page am I on?" → navigation paths + known issues |
| `diagnose_issue` | Cross-references KB + errors + pages → root cause |
| `create_issue` | Logs problems with auto-severity + dedup |
| `create_itsm_ticket` | Full ticket with diagnostic report attached |
| `update_itsm_ticket` | Status updates, resolution notes, escalation |
| `navigate_user_browser` | Triggers Chrome extension DOM capture + Gemini Vision annotations |

### ADK Multi-Agent

Google ADK with two agents:
- **Root agent** (8 FunctionTools) — the main diagnostic brain
- **Researcher sub-agent** (`google_search` only) — isolated because ADK's `google_search` literally cannot coexist with other tools in the same agent. Spent 4 hours learning this the hard way.

---

## Challenges We Ran Into

**The real ones, not the polished versions:**

1. **google_search broke everything.** Added it to the main agent, all other tools stopped working. No error message. Just silence. Turns out ADK requires it in a completely separate sub-agent. This isn't in the docs.

2. **Gemini Vision thought Google was a scam.** First version of the shield flagged google.com as "suspicious — contains login form." Had to completely rewrite the prompt with a "safe by default" stance and a whitelist of 50+ legitimate sites. Then it flagged GitHub. More prompt engineering. Then it flagged Amazon. More. Getting a vision model to NOT be paranoid is harder than making it paranoid.

3. **The model ID is wrong in half the examples.** It's `gemini-live-2.5-flash-native-audio`. Not `gemini-2.0-flash-live`. Not `gemini-2.5-flash-live`. I tried every combination before finding the right one.

4. **Content scripts don't exist on tabs opened before you install the extension.** Had to build `ensureContentScript()` — ping the tab, if it doesn't respond, inject the script and CSS, wait 300ms, then proceed.

5. **ADK sessions are async now.** `get_session()` and `create_session()` both return coroutines in newer versions. Got `'coroutine' object has no attribute 'id'` and stared at it for 30 minutes before adding `await`.

---

## Accomplishments That Actually Matter

- **Voice-driven UI navigation** — no other submission does this. The voice agent controls the Chrome extension mid-conversation to annotate and interact with the user's page
- **4-layer shield with de-escalation** — most security tools only escalate. Vigil can lower a threat level when Search confirms legitimacy. This eliminates false positives
- **20 languages, one model** — native speech-to-speech, not translation. The model thinks in the target language
- **Solo build** — one developer, full stack: backend, frontend, Chrome extension, Terraform, deployment
- **It actually works** — live demo at the URL above. Try it. Scan a page. Start a voice session. Break it if you can

---

## What We Learned

- Prompt engineering for security is backwards — you're not teaching the model to find threats, you're teaching it to NOT flag everything as a threat
- ADK's sub-agent pattern exists for a reason, but the documentation doesn't explain why. `google_search` physically cannot share an agent with `FunctionTool` instances
- AudioWorklet processors are the only way to get acceptable voice latency in the browser. MediaRecorder adds 200-500ms. AudioWorklets add <10ms
- OSINT heuristics (TLD reputation, typosquatting detection) are cheap and catch obvious scams before you burn API calls on Gemini Vision

---

## What's Next

- **Safe shopping** — same 4-layer pipeline, expanded prompts. Detect fake storefronts, flag too-good-to-be-true deals, spot AI-generated reviews, verify seller reputation. Voice: "Is this deal legit?" → full pipeline analysis with spoken explanation. "Help me checkout" → annotates cart, shipping, payment fields. Zero new tools needed
- **Real WHOIS integration** — domain age is a strong signal, currently heuristic-only
- **Persistent ITSM backend** — tickets vanish when the server restarts. Needs a real database
- **Multi-tab shield dashboard** — scan history across all tabs, trends, threat heatmap
- **Enterprise deployment** — SSO, role-based access, custom knowledge bases

---

## Built With (Tags)
Gemini Live API, Vertex AI, Google Cloud Run, Google GenAI SDK, Google ADK, Google Web Risk API, Google Search Grounding, Python, FastAPI, JavaScript, Vite, Web Components, Web Audio API, Chrome Extension, Terraform, Docker, WebSocket

## Categories
Live Agents, UI Navigator

## Team
Solo Developer

## Links
- **Live Demo**: https://resolve-743776360861.us-central1.run.app
- **GitHub**: https://github.com/vigneshbarani24/Gemini-AI-Agents
- **Demo Video**: (link to be added)
