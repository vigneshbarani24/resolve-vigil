# TubeForge — Implementation Tasks

> Kiro-style spec | Updated: 2026-02-27 | Framework: Google ADK + genmedia-live hybrid
> Track progress by checking boxes

## Phase 0: Specs & Setup (Day 1) — COMPLETE
- [x] Generate requirements.md (Kiro-style, ADK hybrid)
- [x] Generate design.md (Kiro-style, ADK hybrid)
- [x] Generate tasks.md (this file)
- [x] Generate reference docs (SDK research, deployment guide, competitor analysis)
- [x] Update CLAUDE.md with TubeForge project details
- [ ] Initialize git repository
- [ ] Create .gitignore (outputs/, .env, __pycache__, node_modules, .adk/)

## Phase 1: Foundation (Days 2-3)
> **Goal**: ADK agent running locally with Forge persona, image input, voice I/O
> **Key pattern**: bidi-demo (FastAPI + WebSocket + ADK run_live)

### 1.1 GCP Project Setup
- [ ] Reuse existing GCP project (or create `tubeforge-hackathon`)
- [ ] Enable APIs:
  ```
  gcloud services enable aiplatform.googleapis.com run.googleapis.com \
    storage.googleapis.com texttospeech.googleapis.com \
    cloudbuild.googleapis.com artifactregistry.googleapis.com \
    secretmanager.googleapis.com
  ```
- [ ] Create Cloud Storage bucket: `gsutil mb -l us-central1 gs://tubeforge-assets`
- [ ] Set env vars: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_GENAI_USE_VERTEXAI=TRUE`
- [ ] Test: `gcloud auth application-default login` works

### 1.2 ADK Multi-Agent Setup
- [ ] `pip install google-adk google-cloud-texttospeech pillow`
- [ ] Create `tubeforge/agent.py` with **two agents** (multi-agent architecture):
  ```python
  import os
  from google.adk.agents import Agent
  from google.adk.tools import google_search

  # Sub-agent: google_search CANNOT coexist with other tools
  researcher = Agent(
      name="researcher",
      model="gemini-2.0-flash",
      description="Research assistant for gathering facts",
      instruction="Research topics thoroughly. Return key facts, dates, figures.",
      tools=[google_search],
  )

  AGENT_MODEL = os.environ.get("DEMO_AGENT_MODEL", "gemini-2.0-flash-live-001")

  root_agent = Agent(
      name="forge",
      model=AGENT_MODEL,
      instruction="...",
      tools=[],  # Media tools added in Phase 2-5
      sub_agents=[researcher],
  )
  ```
- [ ] Create `tubeforge/__init__.py`: `from . import agent`
- [ ] Test with `adk web tubeforge/` — verify Forge responds in dev UI
- [ ] Test: ask Forge to research a topic → transfers to researcher → returns facts
- [ ] **Files**: `tubeforge/agent.py`, `tubeforge/__init__.py`

### 1.3 FastAPI WebSocket Server
- [ ] Create `tubeforge/app.py` with FastAPI + WebSocket (bidi-demo pattern):
  - Import `Runner`, `InMemorySessionService` from `google.adk`
  - Import `LiveRequestQueue` from `google.adk.agents.live_request_queue` (NOT `google.adk.streaming`)
  - WebSocket endpoint: `/ws/{user_id}/{session_id}`
  - Upstream task: `websocket.receive → live_queue.send_content(Content(...))` / `live_queue.send_realtime(Blob(...))`
  - Downstream task: `runner.run_live() → websocket.send`
  - `asyncio.gather(upstream, downstream)`
  - Use `live_queue.close()` for graceful shutdown
- [ ] Add static file serving: `app.mount("/", StaticFiles(directory="frontend"))`
- [ ] Add REST endpoint: `/api/download/{file_id}` for asset downloads
- [ ] Test: `uvicorn tubeforge.app:app --port 8080` — WebSocket connects
- [ ] **File**: `tubeforge/app.py`

### 1.4 Frontend (from bidi-demo)
- [ ] Create `tubeforge/frontend/index.html` — base layout with controls
- [ ] Port `audio.js` from bidi-demo — Web Audio API worklets (PCM 16kHz capture, 24kHz playback)
- [ ] Create WebSocket client in `main.js` — connect to `/ws/{user_id}/{session_id}`
- [ ] Add image upload handler (file picker → resize 768x768 → base64 → WebSocket)
- [ ] Add camera capture handler (MediaDevices API → JPEG frame every 2s)
- [ ] **Files**: `tubeforge/frontend/index.html`, `tubeforge/frontend/src/main.js`, `tubeforge/frontend/src/audio.js`

### 1.5 Forge Persona
- [ ] Create `tubeforge/prompts/system_prompt.txt` with Forge Creative Director persona
- [ ] Create `tubeforge/prompts/niche_presets.json` with style configurations
- [ ] Wire system prompt into `agent.py` instruction
- [ ] **Test**: Upload image → Forge identifies it → responds via voice in browser
- [ ] **Files**: `tubeforge/prompts/system_prompt.txt`, `tubeforge/prompts/niche_presets.json`

### 1.6 Project Structure
- [ ] Create `tubeforge/tools/__init__.py`
- [ ] Create `tubeforge/outputs/images/`, `outputs/videos/`, `outputs/audio/`, `outputs/final/`
- [ ] Create `tubeforge/requirements.txt`:
  ```
  google-adk>=1.25.0
  fastapi>=0.115.0
  uvicorn[standard]>=0.30.0
  google-cloud-texttospeech>=2.16.0
  google-cloud-storage>=2.14.0
  pillow>=10.4.0
  ```
- [ ] Create `.env.example`

## Phase 2: Script Engine (Days 4-5)
> **Goal**: Image → researched, interleaved script with scene images
> **Depends on**: Phase 1 complete

### 2.1 Topic Research (via Researcher Sub-Agent)
- [ ] `google_search` is in the researcher sub-agent (set up in Phase 1.2)
- [ ] Test: Voice "research the Colosseum" → Forge transfers to researcher → google_search → facts returned
- [ ] Verify agent transfer works: Forge → Researcher → back to Forge
- [ ] Verify grounded responses (no hallucination)

### 2.2 Script Generation Tool
- [ ] Create `tubeforge/tools/script_generator.py`
- [ ] Implement `generate_script(topic, duration_minutes, style, focus, research_context, tool_context)`:
  - Use `google.genai.Client` with `response_modalities=["TEXT", "IMAGE"]`
  - Parse interleaved response into segments: `[{narration, image_data, scene_desc}]`
  - Save generated images to `outputs/images/`
  - Store segments in `tool_context.state["script_segments"]`
- [ ] ADK auto-wraps as FunctionTool (type hints + docstring)
- [ ] Add to `root_agent.tools` in `agent.py`
- [ ] **Test**: "Create a 5-min documentary about the Colosseum" → script + images
- [ ] **File**: `tubeforge/tools/script_generator.py`

### 2.3 Frontend Script Preview
- [ ] Add script preview panel to `index.html`
- [ ] Stream script segments via WebSocket events as they generate
- [ ] Display narration text alongside scene images
- [ ] **Files**: `tubeforge/frontend/index.html`, `tubeforge/frontend/src/ui.js`

## Phase 3: Voice + Thumbnail (Days 5-6)
> **Goal**: AI voiceover and thumbnail generation working
> **Depends on**: Phase 1 complete (can run parallel with Phase 2)

### 3.1 Voiceover Tool
- [ ] Create `tubeforge/tools/voiceover_gen.py`
- [ ] Implement `generate_voiceover(script_text, voice_name, speaking_rate, tool_context)`:
  - Use `google.cloud.texttospeech` client
  - `SynthesizeSpeechRequest` with `AudioEncoding.LINEAR_16`
  - Extract word-level timestamps from `timepoints` in response
  - Save audio to `outputs/audio/`
  - Store in `tool_context.state["voiceover_id"]`
- [ ] Add to `root_agent.tools`
- [ ] **Test**: Script text → natural voiceover WAV with timestamps
- [ ] **File**: `tubeforge/tools/voiceover_gen.py`

### 3.2 Thumbnail Tool
- [ ] Create `tubeforge/tools/thumbnail_gen.py`
- [ ] Implement `generate_thumbnail(subject, title_text, style, tool_context)`:
  - Use `google.genai.Client` → `generate_images()` with Imagen 3
  - Aspect ratio: 16:9 (1280x720)
  - Ported from genmedia-live's image generation pattern
  - Store in `tool_context.state["thumbnail_id"]`
- [ ] Add to `root_agent.tools`
- [ ] **Test**: "Colosseum dramatic thumbnail" → eye-catching 16:9 image
- [ ] **File**: `tubeforge/tools/thumbnail_gen.py`

## Phase 4: Video Assembly (Days 7-8)
> **Goal**: FFmpeg pipeline producing complete MP4
> **Depends on**: Phase 2 (images), Phase 3 (voiceover)

### 4.1 Core Assembly Pipeline
- [ ] Create `tubeforge/tools/video_assembler.py`
- [ ] Implement image-to-video: single image → Ken Burns effect (pan/zoom) → video segment
- [ ] Implement audio overlay: scene videos + voiceover → synchronized MP4
- [ ] Implement concat: multiple scene videos → single continuous video
- [ ] Port FFmpeg patterns from genmedia-live's `combine_videos` / `extract_frames`
- [ ] **Test**: 5 images + 1 voiceover → smooth 5-min video
- [ ] **File**: `tubeforge/tools/video_assembler.py`

### 4.2 Subtitles
- [ ] Generate SRT file from script text + word timestamps
- [ ] Burn subtitles into video via FFmpeg `-vf subtitles=` filter
- [ ] Style: white text, black outline, bottom-center
- [ ] **Test**: Subtitles sync with voiceover audio

### 4.3 Background Music
- [ ] Source 3-5 royalty-free tracks (per niche mood)
- [ ] Mix background music with voiceover (music at -20dB)
- [ ] FFmpeg audio mixing: `amix` or `amerge` filter
- [ ] **Test**: Video has subtle background music

### 4.4 Full Assembly Tool
- [ ] Implement `assemble_video(segments, voiceover_id, thumbnail_id, add_subtitles, background_music, tool_context)`:
  - Pipeline: images → Ken Burns → concat → add audio → add subtitles → add music → MP4
  - Read segment/voiceover/thumbnail from `tool_context.state`
  - Save to `outputs/final/`
  - Store in `tool_context.state["video_url"]`
- [ ] Add to `root_agent.tools`
- [ ] **Test**: Complete pipeline end-to-end → downloadable MP4

## Phase 5: B-Roll + Iteration (Days 9-10)
> **Goal**: MVP complete with all features working end-to-end
> **Depends on**: Phase 4

### 5.1 B-Roll Tool
- [ ] Create `tubeforge/tools/broll_gen.py`
- [ ] Implement `generate_broll(scene_description, duration_seconds, style, tool_context)`:
  - Use `google.genai.Client` → Veo 2 generation
  - Ported from genmedia-live's video generation pattern
  - Save to `outputs/videos/`
- [ ] Add to `root_agent.tools`
- [ ] **Test**: "Aerial shot of ancient Rome" → 4-second video clip
- [ ] **File**: `tubeforge/tools/broll_gen.py`

### 5.2 Integrate B-Roll into Assembly
- [ ] Modify `video_assembler.py`: if B-roll exists for segment, use it; else Ken Burns
- [ ] **Test**: Mixed video (some B-roll, some static) → smooth transitions

### 5.3 Image Editing Tool
- [ ] Create `tubeforge/tools/image_editor.py`
- [ ] Implement `edit_image(image_id, instruction, tool_context)`:
  - Ported from genmedia-live's image edit pattern
- [ ] Add to `root_agent.tools`
- [ ] **Test**: "Make image 3 darker" → regenerated image
- [ ] **File**: `tubeforge/tools/image_editor.py`

### 5.4 End-to-End Integration Test
- [ ] Upload photo of Colosseum → full voice conversation → download video
- [ ] Upload photo of Eiffel Tower → different style → download video
- [ ] Camera mode: point at printed photo → conversation → video
- [ ] Test with `adk web` dev UI for quick validation
- [ ] **MVP MILESTONE**: All core features working

## Phase 6: Frontend Polish (Days 11-12)
> **Goal**: Professional-looking UI for demo
> **Depends on**: Phase 5 (MVP complete)

### 6.1 UI Improvements
- [ ] Dark theme (studio/creative feel)
- [ ] Upload area with drag-and-drop
- [ ] Camera toggle button
- [ ] Niche preset selector (buttons)
- [ ] Status indicators: listening / processing / generating / ready
- [ ] **Files**: `tubeforge/frontend/index.html`, `tubeforge/frontend/style.css`

### 6.2 Preview Panel
- [ ] Script text with scene images in scrollable view
- [ ] Image click-to-enlarge
- [ ] "Regenerate" button per image
- [ ] **File**: `tubeforge/frontend/src/ui.js`

### 6.3 Progress & Output
- [ ] Progress bar showing generation stages
- [ ] Video player for final preview (HTML5 video element)
- [ ] Download button (prominent, centered)
- [ ] Thumbnail preview

### 6.4 Mobile Responsive
- [ ] Camera input works on mobile browsers
- [ ] Touch-friendly controls
- [ ] Responsive layout

## Phase 7: Deploy + Harden (Days 13-14)
> **Goal**: Running on Cloud Run, battle-tested
> **Depends on**: Phase 6

### 7.1 ADK Deployment
- [ ] Deploy via:
  ```bash
  adk deploy cloud_run \
    --project=tubeforge-hackathon \
    --region=us-central1 \
    --with_ui \
    tubeforge/
  ```
- [ ] Verify public URL works end-to-end
- [ ] Test WebSocket connection over HTTPS
- [ ] **Note**: ADK auto-generates Dockerfile and container config

### 7.2 Manual Dockerfile (fallback)
- [ ] Create `Dockerfile` based on Python 3.11-slim (if `adk deploy` has issues)
- [ ] Install FFmpeg via apt, Python deps, copy source
- [ ] `CMD ["uvicorn", "tubeforge.app:app", "--host", "0.0.0.0", "--port", "8080"]`
- [ ] **File**: `Dockerfile`

### 7.3 Terraform (Bonus)
- [ ] Write `terraform/main.tf` with Cloud Run service, GCS bucket, API enablement
- [ ] **File**: `terraform/main.tf`

### 7.4 Error Handling Hardening
- [ ] Test LiveRequestQueue graceful close on disconnect
- [ ] Test Imagen failure → placeholder fallback
- [ ] Test Veo failure → static image fallback
- [ ] Test TTS failure → error message
- [ ] Test large image upload → resize works
- [ ] Test session resumption after timeout

### 7.5 README
- [ ] Write clear spin-up instructions (hackathon requirement):
  - Prerequisites: Python 3.10+, GCP project, FFmpeg
  - `pip install -r requirements.txt`
  - `adk web tubeforge/` (dev mode)
  - `uvicorn tubeforge.app:app --port 8080` (server mode)
  - `adk deploy cloud_run ...` (production)
- [ ] Include architecture diagram
- [ ] **File**: `README.md`

## Phase 8: Demo + Submit (Days 15-17)
> **Goal**: Winning submission on Devpost

### 8.1 Demo Video (4 minutes)
- [ ] Write demo script:
  - 0:00-0:30 — Problem: "Creating YouTube content takes hours and 5 tools"
  - 0:30-1:00 — Solution: "TubeForge: upload a photo, talk to Forge, get a video"
  - 1:00-3:00 — Live demo (Colosseum photo → complete video)
  - 3:00-3:30 — Architecture + GCP proof (Cloud Console + `adk web` screenshot)
  - 3:30-4:00 — Vision: "Every photo has a story. Forge tells it."
- [ ] Record screen + voiceover
- [ ] Edit to under 4 minutes
- [ ] Upload to YouTube (unlisted)

### 8.2 Architecture Diagram
- [ ] Create polished diagram (Mermaid → PNG or Excalidraw)
- [ ] Show: Browser → FastAPI → ADK Agent → Gemini/Imagen/Veo/TTS → FFmpeg → Video
- [ ] Highlight ADK components (Agent, FunctionTools, run_live, LiveRequestQueue)

### 8.3 GCP Deployment Proof
- [ ] Screen recording: GCP Console → Cloud Run → show running service
- [ ] Show `adk deploy` terminal output
- [ ] Show `adk web` dev UI in action

### 8.4 Bonus Points
- [ ] Write blog post (#GeminiLiveAgentChallenge)
- [ ] Sign up for Google Developer Group
- [ ] Link GDG profile in submission
- [ ] Include Terraform IaC in repo

### 8.5 Devpost Submission
- [ ] Text description: features, tech, findings, learnings
- [ ] Public GitHub repo URL
- [ ] Demo video URL
- [ ] Architecture diagram (image upload)
- [ ] GCP deployment proof
- [ ] Submit 24h before deadline (Mar 16)

---

## Task Dependencies

```
Phase 0 (Specs) ✅ → Phase 1 (Foundation)
Phase 1 → Phase 2 (Script Engine)
Phase 1 → Phase 3 (Voice + Thumbnail) [parallel with Phase 2]
Phase 2 + Phase 3 → Phase 4 (Video Assembly)
Phase 4 → Phase 5 (B-Roll + Integration)
Phase 5 → Phase 6 (Frontend Polish)
Phase 6 → Phase 7 (Deploy + Harden)
Phase 7 → Phase 8 (Demo + Submit)
```

---

## Key Files Summary

| File | Purpose | Source |
|------|---------|--------|
| `tubeforge/agent.py` | ADK multi-agent: researcher (google_search) + root_agent forge (6 tools) | NEW (ADK pattern) |
| `tubeforge/__init__.py` | Package init | NEW |
| `tubeforge/app.py` | FastAPI + WebSocket server (LiveRequestQueue from `google.adk.agents.live_request_queue`) | bidi-demo pattern |
| `tubeforge/tools/script_generator.py` | Gemini interleaved output | NEW |
| `tubeforge/tools/voiceover_gen.py` | Cloud TTS | NEW |
| `tubeforge/tools/thumbnail_gen.py` | Imagen 3 | Ported from genmedia-live |
| `tubeforge/tools/broll_gen.py` | Veo 2 | Ported from genmedia-live |
| `tubeforge/tools/video_assembler.py` | FFmpeg pipeline | Ported from genmedia-live |
| `tubeforge/tools/image_editor.py` | Imagen edit | Ported from genmedia-live |
| `tubeforge/prompts/system_prompt.txt` | Forge persona | NEW |
| `tubeforge/prompts/niche_presets.json` | Style configs | NEW |
| `tubeforge/frontend/index.html` | Web UI | Mixed (bidi-demo + custom) |
| `tubeforge/frontend/src/audio.js` | Audio worklets | From bidi-demo |
| `tubeforge/frontend/src/main.js` | WebSocket + app logic | NEW |
| `tubeforge/frontend/src/ui.js` | Preview + progress | NEW |
