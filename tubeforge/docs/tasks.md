# TubeForge — Implementation Tasks

> Kiro-style implementation checklist for tracking build progress.
> Last Updated: 2026-03-02

---

## Phase 1 — Foundation

- [x] Task 1.1: Set up project structure (`tubeforge/` with `agent.py`, `app.py`, `tools/`, `prompts/`, `frontend/`)
- [x] Task 1.2: Configure `.env` with GCP project, Vertex AI, model ID
- [x] Task 1.3: Create ADK Agent with `google_search` + 6 FunctionTools (`agent.py`)
  - Multi-agent pattern: researcher sub-agent (google_search) + root Forge agent (media tools)
  - Model: `gemini-live-2.5-flash-native-audio` (or env var `DEMO_AGENT_MODEL`)
- [x] Task 1.4: Create FastAPI + WebSocket server (`app.py`, bidi-demo pattern)
- [x] Task 1.5: Implement `upstream_task` (audio/text/image -> `LiveRequestQueue`)
- [x] Task 1.6: Implement `downstream_task` (`run_live()` events -> WebSocket)
- [x] Task 1.7: Create Forge system prompt (`prompts/system_prompt.txt`)
- [x] Task 1.8: Create niche presets (`prompts/niche_presets.json` — 6 styles)
- [x] Task 1.9: Set up `requirements.txt` with all dependencies
- [x] Task 1.10: Create `__init__.py` and `tools/__init__.py`

## Phase 2 — Script Engine

- [x] Task 2.1: Implement `generate_script` tool (Gemini interleaved TEXT+IMAGE output)
- [x] Task 2.2: Parse interleaved response into segments (narration + scene images)
- [x] Task 2.3: Save scene images as PNG via PIL
- [x] Task 2.4: Store segments in `tool_context.state`
- [x] Task 2.5: Duration estimation from word count (140 WPM)

## Phase 3 — Voice + Thumbnail

- [x] Task 3.1: Implement `generate_voiceover` tool (Cloud TTS)
- [x] Task 3.2: Neural2 voice support with configurable speaking rate
- [x] Task 3.3: Word timestamp estimation
- [x] Task 3.4: LINEAR16 WAV output at 24kHz
- [x] Task 3.5: Implement `generate_thumbnail` tool (Imagen 3)
- [x] Task 3.6: Gemini 2.0 Flash fallback for resilience
- [x] Task 3.7: PIL resize to 1280x720

## Phase 4 — Video Assembly

- [x] Task 4.1: Implement `assemble_video` tool (FFmpeg pipeline)
- [x] Task 4.2: Ken Burns zoompan effect (alternating zoom in/out)
- [x] Task 4.3: Segment concatenation via concat demuxer
- [x] Task 4.4: Voiceover audio mixing
- [x] Task 4.5: SRT subtitle generation from segments
- [x] Task 4.6: Subtitle burn-in via FFmpeg subtitles filter
- [x] Task 4.7: Background music mixing at -15dB
- [x] Task 4.8: FFmpeg binary via `imageio-ffmpeg` fallback

## Phase 5 — B-Roll + Image Editing

- [x] Task 5.1: Implement `generate_broll` tool (Veo 2)
- [x] Task 5.2: Async polling for video generation completion
- [x] Task 5.3: GCS URI download support
- [x] Task 5.4: Implement `edit_image` tool (Gemini vision)
- [x] Task 5.5: Session state update for edited segments/thumbnails
- [x] Task 5.6: Edit history tracking

## Phase 6 — Frontend

- [x] Task 6.1: Create `index.html` (bidi-demo pattern, TubeForge themed)
- [x] Task 6.2: Create `style.css` (red theme, split layout: chat + console)
- [x] Task 6.3: Create `app.js` (WebSocket client, message bubbles, transcription)
- [x] Task 6.4: Create `audio-player.js` + `audio-recorder.js` (PCM worklets)
- [x] Task 6.5: Create `pcm-player-processor.js` + `pcm-recorder-processor.js`
- [x] Task 6.6: Camera capture modal (JPEG, send via WebSocket)
- [x] Task 6.7: Event console with expandable JSON
- [x] Task 6.8: Connection status indicator + auto-reconnect

## Phase 7 — Deploy + Docs

- [x] Task 7.1: Create `Dockerfile` (python:3.11-slim + ffmpeg + uvicorn)
- [x] Task 7.2: Create `README.md`
- [x] Task 7.3: Create `.env.example`
- [x] Task 7.4: Add download endpoint (`/api/download/{file_type}/{filename}`)
- [x] Task 7.5: Create `docs/requirements.md` (Kiro spec)
- [x] Task 7.6: Create `docs/design.md` (Kiro spec)
- [x] Task 7.7: Create `docs/tasks.md` (this file)
- [ ] Task 7.8: Deploy to Cloud Run (`adk deploy cloud_run` or `gcloud run deploy --source .`)
- [ ] Task 7.9: End-to-end test on cloud URL
- [ ] Task 7.10: Verify all GCP APIs enabled (Vertex AI, Cloud TTS, Cloud Storage, Cloud Run)

## Phase 8 — Demo + Submit

- [ ] Task 8.1: Record 4-minute demo video
- [ ] Task 8.2: Create architecture diagram for submission
- [ ] Task 8.3: Submit to Devpost

## Bonus — Nice-to-Have

- [ ] Bonus 1: Terraform deployment scripts (`terraform/main.tf`)
- [ ] Bonus 2: `deploy.sh` one-command setup
- [ ] Bonus 3: Blog post

---

## Progress Summary

| Phase | Tasks | Done | Remaining |
|-------|-------|------|-----------|
| 1 — Foundation | 10 | 10 | 0 |
| 2 — Script Engine | 5 | 5 | 0 |
| 3 — Voice + Thumbnail | 7 | 7 | 0 |
| 4 — Video Assembly | 8 | 8 | 0 |
| 5 — B-Roll + Image Editing | 6 | 6 | 0 |
| 6 — Frontend | 8 | 8 | 0 |
| 7 — Deploy + Docs | 10 | 7 | 3 |
| 8 — Demo + Submit | 3 | 0 | 3 |
| Bonus | 3 | 0 | 3 |
| **Total** | **60** | **51** | **9** |

**Overall: 85% complete** — All code written, deployment and submission remaining.
