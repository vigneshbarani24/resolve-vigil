# TubeForge — AI Explainer Video Engine

## Project
- **What**: Upload a photo → talk to AI Creative Director "Forge" → get a complete YouTube-ready explainer video
- **Category**: Creative Storyteller
- **Hackathon**: Gemini Live Agent Challenge (Devpost)
- **Deadline**: Mar 17, 2026 @ 5:30am GMT+5:30
- **Prize Pool**: $80,000 | **Team**: Solo (KaarTech UK)
- **Framework**: Google ADK (`google-adk`) + genmedia-live media patterns ported as FunctionTools

## Quick Start
```bash
cd tubeforge
pip install -r requirements.txt

# Dev mode (ADK built-in UI)
adk web .

# Server mode
uvicorn app:app --host 0.0.0.0 --port 8080

# Open http://localhost:8080
```

## Build & Deploy
```bash
# Development
adk web tubeforge/

# Production (Cloud Run — one command)
adk deploy cloud_run \
  --project=tubeforge-hackathon \
  --region=us-central1 \
  --with_ui \
  tubeforge/
```

## Architecture
- **Agent**: Google ADK `Agent` class with `run_live()` bidi streaming
- **Backend**: Python 3.11 / FastAPI / WebSocket (bidi-demo pattern)
- **AI**: Gemini 2.0 Flash Live (voice + vision + interleaved output)
- **Image Gen**: Imagen 3 (Vertex AI) — ported from genmedia-live
- **Video Gen**: Veo 2 (Vertex AI) — ported from genmedia-live
- **Voiceover**: Google Cloud Text-to-Speech
- **Assembly**: FFmpeg — ported from genmedia-live
- **Hosting**: Cloud Run via `adk deploy`
- **Storage**: Google Cloud Storage

## Project Structure
```
tubeforge/
├── agent.py                   # ADK Agent with root_agent
├── __init__.py                # from . import agent
├── app.py                     # FastAPI + WebSocket (bidi-demo pattern)
├── tools/
│   ├── __init__.py
│   ├── script_generator.py    # Gemini interleaved output (NEW)
│   ├── thumbnail_gen.py       # Imagen 3 (ported from genmedia-live)
│   ├── broll_gen.py           # Veo 2 (ported from genmedia-live)
│   ├── voiceover_gen.py       # Cloud TTS (NEW)
│   ├── video_assembler.py     # FFmpeg pipeline (ported from genmedia-live)
│   └── image_editor.py        # Imagen edit (ported from genmedia-live)
├── prompts/
│   ├── system_prompt.txt      # Forge persona
│   └── niche_presets.json     # Style configs
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── src/
│       ├── main.js            # WebSocket client + app logic
│       ├── audio.js           # Web Audio worklets (from bidi-demo)
│       └── ui.js              # Preview, progress, video player
├── outputs/                   # Generated assets (gitignored)
├── docs/                      # Kiro-style specs
├── terraform/                 # IaC (bonus)
├── requirements.txt           # google-adk, fastapi, uvicorn, etc.
└── README.md
```

## Key Conventions
- Python 3.10+ with type hints (ADK requirement)
- Use `google-adk` as primary framework (wraps `google-genai` internally)
- ADK `FunctionTool` pattern: type hints + docstrings + optional `ToolContext`
- Use `google-genai` SDK inside tool functions for Imagen/Veo calls
- Vertex AI for all model calls (`GOOGLE_GENAI_USE_VERTEXAI=TRUE`)
- All secrets via `.env` (never commit)
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Document first, then implement
- Follow bidi-demo patterns for streaming (`run_live`, `LiveRequestQueue`)
- Port genmedia-live media code (Imagen, Veo, FFmpeg) into ADK FunctionTools

## Tool Pipeline (7 ADK FunctionTools)
1. `google_search` → ADK built-in (topic research/grounding)
2. `generate_script` → Gemini interleaved output (text + images)
3. `generate_voiceover` → Cloud TTS (WAV + word timestamps)
4. `generate_thumbnail` → Imagen 3 (1280x720)
5. `generate_broll` → Veo 2 (4-8 sec clips)
6. `edit_image` → Imagen edit/regenerate
7. `assemble_video` → FFmpeg (images + audio + subtitles → MP4)

## Key Resources
- [ADK Docs](https://google.github.io/adk-docs/)
- [ADK Bidi Demo (BASE PATTERN)](https://github.com/google/adk-samples/tree/main/python/agents/bidi-demo)
- [genmedia-live (MEDIA CODE SOURCE)](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/vision/sample-apps/genmedia-live)
- [Sparkify (Google's version — inspiration)](https://sparkify.withgoogle.com/explore)
- [ADK-MarketingBot (Imagen+Veo in ADK)](https://github.com/jakedibattista/ADK-MarketingBot)

## Specs (in docs/)
- `docs/requirements.md` — Kiro-style: user stories + acceptance criteria (ADK)
- `docs/design.md` — Kiro-style: architecture + API contracts + data flow (ADK)
- `docs/tasks.md` — Kiro-style: implementation checklist (track progress here)
- `docs/genai-sdk-research.md` — GenAI SDK + ADK reference
- `docs/gcp-deployment.md` — Cloud Run + Terraform guide
- `docs/competitor-analysis.md` — Winning strategy

## Common Mistakes
<!-- Add mistakes as you find them during development -->

## Dev Docs
When starting large tasks:
1. Create directory: `mkdir -p dev/active/[task-name]/`
2. Create files: `[task-name]-plan.md`, `[task-name]-context.md`, `[task-name]-tasks.md`
3. Update regularly: Mark tasks complete immediately

When continuing tasks:
- Check `dev/active/` for existing tasks
- Read all three files before proceeding
- Update "Last Updated" timestamps
