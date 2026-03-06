# Shorts Creator — Implementation Tasks

## Status Legend
- [ ] Not started
- [x] Complete
- [~] In progress

---

## Phase 1: Clone & Strip (scaffold)

- [x] 1.1 Clone Immergo into `_immergo_ref/` for reference
- [x] 1.2 Create `shorts-creator/` directory structure
- [x] 1.3 Copy Immergo files we keep as-is:
  - `server/gemini_live.py`, `server/config_utils.py`
  - `src/lib/gemini-live/geminilive.js`, `mediaUtils.js`
  - `public/audio-processors/capture.worklet.js`, `playback.worklet.js`
  - `vite.config.js`
- [x] 1.4 Create stripped `requirements.txt` (no redis, slowapi, recaptcha, bigquery)
- [x] 1.5 Create `package.json` (from Immergo, renamed)
- [x] 1.6 Create `.env.example`, `.gitignore`
- [x] 1.7 Create `Dockerfile` (add ffmpeg to apt-get)
- [ ] 1.8 Verify: `cd shorts-creator && pip install -r requirements.txt` succeeds
- [ ] 1.9 Verify: `npm install` succeeds

## Phase 2: Backend — Server + Tools

- [x] 2.1 Create `server/__init__.py`
- [x] 2.2 Create `server/prompts.py` — system prompt + TOOL_DECLARATIONS
- [x] 2.3 Create `server/tools.py` — 5 tool functions:
  - `research_topic()` — Gemini + google_search (separate call)
  - `generate_storyboard()` — Gemini 2.5 Flash TEXT+IMAGE
  - `generate_clip()` — Veo 2 (9:16)
  - `generate_voiceover()` — Cloud TTS
  - `assemble_short()` — FFmpeg (1080x1920)
- [x] 2.4 Create `server/main.py` — stripped FastAPI (no recaptcha/redis/slowapi/fingerprint/tracker)
- [ ] 2.5 **FIX**: Tool registration — names must match frontend declarations exactly
  - Register as `research_topic` not `tool_research_topic`
  - Verify `gemini_live.py` `register_tool()` uses `func.__name__`
- [ ] 2.6 **FIX**: `research_topic` must use separate Gemini client call (not Live session tools)
  - google_search grounding cannot coexist with function_declarations in Live session
- [ ] 2.7 Verify: `python -c "from server.tools import *; print('OK')"` succeeds
- [ ] 2.8 Verify: `uvicorn server.main:app --port 8080` starts without errors

## Phase 3: Frontend — UI Components

- [x] 3.1 Create `index.html` (stripped recaptcha script tag)
- [x] 3.2 Create `src/main.js` (entry point)
- [x] 3.3 Create `src/style.css` (dark theme CSS variables)
- [x] 3.4 Create `src/data/topics.json` (topic categories)
- [x] 3.5 Create `src/components/config.js` (frontend prompt + tool declarations)
- [x] 3.6 Create `src/components/app-root.js` (app shell, 3 views, Gemini client)
- [x] 3.7 Create `src/components/view-topics.js` (topic picker)
- [ ] 3.8 Create `src/components/view-chat.js` (voice conversation + storyboard preview + pipeline progress)
- [ ] 3.9 Create `src/components/view-preview.js` (video player + download button)
- [ ] 3.10 **FIX**: `app-root.js` tool event handling — server sends `{type: "tool_call"}` events
  - The raw WebSocket JSON events from `gemini_live.py` come as `send_json(event)`
  - These are NOT `MultimodalLiveResponseMessage` — they're raw JSON on the `onmessage` handler
  - Need to handle them in `onReceiveMessage` or via a separate event path
- [ ] 3.11 **FIX**: `config.js` tool names must match server registration exactly
- [ ] 3.12 Verify: `npm run build` succeeds (Vite build)

## Phase 4: Integration & Wiring

- [ ] 4.1 Wire frontend WebSocket to backend — verify audio flows both ways
- [ ] 4.2 Tool results flow back to UI via event system
- [ ] 4.3 Storyboard images appear in real-time (base64 in tool result → UI)
- [ ] 4.4 Pipeline progress bar updates as each tool completes
- [ ] 4.5 Final video plays in embedded player
- [ ] 4.6 Download button serves the MP4 via `/api/assets/{filename}`
- [ ] 4.7 End-to-end test: say "Create a short about the Roman Colosseum"
  - Tools execute in sequence
  - Storyboard images appear
  - Final MP4 plays

## Phase 5: Polish & Deploy

- [ ] 5.1 Error handling — tool failures show user-friendly messages
- [ ] 5.2 Loading states — spinners/progress for long-running tools (Veo 2)
- [ ] 5.3 Mobile responsiveness (vertical layout for phone testing)
- [ ] 5.4 `gcloud run deploy` succeeds
- [ ] 5.5 Demo video recording
- [ ] 5.6 Submission write-up

---

## Known Issues to Fix

1. **Tool name mismatch**: Server registers `tool_research_topic` (via `@gemini_client.register_tool` with decorated function name), frontend sends `research_topic`. Must align.
2. **google_search conflict**: Cannot have google_search grounding AND function_declarations in same Live session. `research_topic` must use separate Gemini call.
3. **Tool event routing**: Server `gemini_live.py` sends tool results as `{type: "tool_call", name, args, result}` via `event_queue`. Frontend receives these as raw JSON in `onReceiveMessage`, but `MultimodalLiveResponseMessage` constructor doesn't parse this format — it falls through. Need to handle raw JSON events before constructing `MultimodalLiveResponseMessage`.
4. **Storyboard model**: Plan says `gemini-2.5-flash-image` but that's not a real model ID. Use `gemini-2.5-flash-preview-05-20` with `response_modalities=["TEXT", "IMAGE"]`.

---

*Last Updated: 2026-03-06*
