# TubeForge Architecture Decision — ADK vs Raw SDK vs Hybrid

> Decision doc | 2026-03-05 | 11 days to deadline

---

## The Three Real Options

### Option A: Google ADK + run_live() (Current Architecture)
**Pattern**: bidi-demo sample
```
Browser <-> WebSocket <-> FastAPI <-> ADK Runner.run_live() <-> Gemini Live
                                        |
                                   FunctionTools (auto-wrapped)
```

**What's good**:
- "Built with ADK" checkbox for judges
- FunctionTool auto-wraps Python functions (nice DX)
- `adk web tubeforge/` gives free dev UI for testing
- `adk deploy cloud_run` one-command deployment
- Session state management via ToolContext

**What's risky**:
- 368 open GitHub issues on adk-python
- Bug #4679: "Policy violation when doing audio streaming and function calling simultaneously"
- Bug #1348: "Cannot add subagents in streaming mode"
- Bug #3754: "streaming=True returns empty text after tool calls"
- Bug #937: "Client does not receive streaming response in real-time"
- Response modality locked at session start (TEXT or AUDIO, can't switch)
- We have NEVER tested this end-to-end with real credentials
- ADK is ~1 year old, streaming mode is newest/least stable part

**Effort to finish**: Low (code exists), HIGH risk of hitting bugs during testing

---

### Option B: Raw google-genai SDK + Live API (genmedia-live Pattern)
**Pattern**: Google's own genmedia-live demo (on the challenge resources page!)
```
Browser <-> SocketIO/WebSocket <-> Flask/FastAPI <-> genai.Client.aio.live.connect()
                                        |
                                   Manual tool dispatch
                                   (FunctionDeclaration + send_tool_response)
```

**What's good**:
- PROVEN WORKING — Google's official creative media demo
- Listed on the hackathon resources page as reference
- Voice + function calling works together (they demo it)
- Full control over tool execution and progress reporting
- No framework abstraction bugs between you and the API
- Session resumption, context window compression built in
- genmedia-live handles: Imagen, Veo, FFmpeg, camera, screen share

**What's risky**:
- Significant rewrite (~3-4 days of work)
- No "ADK" branding (but hackathon says "Live API OR ADK")
- Manual function declarations instead of auto-wrapped
- Flask+SocketIO vs our current FastAPI+WebSocket

**Effort**: MEDIUM rewrite, LOW runtime risk

---

### Option C: ADK Standard Mode (short-movie-agents Pattern)
**Pattern**: ADK get_fast_api_app() — standard request-response, NO streaming
```
Browser <-> HTTP/SSE <-> get_fast_api_app() <-> ADK Runner.run() <-> Gemini
                                                    |
                                              Sub-agents + FunctionTools
```

**What's good**:
- Simplest architecture
- ADK handles everything (routing, UI, sessions)
- Sub-agents work properly (no streaming bugs)
- `adk web` just works out of the box
- short-movie-agents is a proven ADK sample that does exactly our use case

**What's risky**:
- NO voice interaction — text-only chat
- NO real-time streaming — request/response only
- Scores lower on "See, Hear, Speak" (40% of score!)
- Feels like a chatbot wrapper (exactly what judges DON'T want)

**Effort**: LOW, but LOW score ceiling

---

## Comparison Matrix

| Factor | A: ADK Streaming | B: Raw SDK + Live | C: ADK Standard |
|--------|------------------|-------------------|-----------------|
| Voice I/O | Yes (risky) | Yes (proven) | No |
| Camera/Vision | Yes | Yes | Maybe (SSE) |
| "ADK" checkbox | Yes | No (uses Live API) | Yes |
| Framework bugs | HIGH risk | LOW risk | LOW risk |
| Tool calling | Auto-wrapped | Manual dispatch | Auto-wrapped |
| Dev UI (adk web) | Yes | No | Yes |
| Deploy (adk deploy) | Yes | Manual Docker | Yes |
| Rewrite effort | None | 3-4 days | 1-2 days |
| Proven working? | NO (untested) | YES (Google's demo) | YES (sample) |
| Scoring ceiling | 10/10 if works | 10/10 | 6/10 (no voice) |
| Risk of total failure | MEDIUM-HIGH | LOW | VERY LOW |

---

## What genmedia-live ACTUALLY Does (from the source code)

The app.py is ~800 lines. Here's the core architecture:

1. **Flask + SocketIO** server (threading mode)
2. **Live API session**: `client.aio.live.connect(model, config)` with:
   - `response_modalities=["AUDIO"]`
   - `tools=[...]` with FunctionDeclarations
   - `session_resumption` for reconnection
   - `speech_config` for voice selection
3. **Two async loops** (like our current pattern):
   - `sender_loop()`: reads from input queue, sends to session
   - `receiver_loop()`: reads from session, handles audio/text/tool_calls
4. **Tool dispatch**: When model calls a tool:
   - Parse function_call from response
   - Execute the actual function (generate_image, generate_video, etc.)
   - Send result back via `session.send_tool_response()`
   - Emit progress events to frontend via SocketIO
5. **Tools**: generate_image (Imagen), generate_video (Veo), extract_frame, combine_videos

This is EXACTLY what TubeForge needs, minus the ADK wrapper.

---

## My Recommendation

**For a hackathon with 11 days left: Option B (Raw SDK + Live API)**

Reasoning:
1. genmedia-live is literally the reference project for this hackathon category
2. It's PROVEN to work with voice + function calling + media generation
3. The hackathon explicitly allows "Live API OR ADK" — we satisfy with Live API
4. ADK streaming has known bugs that could waste 3+ days debugging
5. We maintain full control over progress reporting to the frontend
6. The rewrite is manageable: our tool functions stay the same, only the server layer changes

**Compromise option**: Keep ADK agent.py for `adk web` testing, but use raw SDK for the production server. This gives us both the ADK dev UI and the proven Live API pattern.

---

## Rewrite Scope (if Option B)

**Keep as-is**:
- All tool functions (script_generator, thumbnail_gen, etc.)
- Frontend HTML + CSS + ui.js (just change WS to SocketIO or keep WS)
- System prompt
- Dockerfile, Terraform, requirements.txt

**Rewrite**:
- `app.py`: Flask+SocketIO or FastAPI+WebSocket with raw Live API
- `agent.py`: Becomes tool declarations (FunctionDeclaration dicts)
- `app.js`: Adapt to new server event protocol

**New**:
- Tool dispatch function (map function calls to our tool functions)
- Progress event emitter (send stage updates to frontend)

Estimated effort: 2-3 days focused work.
