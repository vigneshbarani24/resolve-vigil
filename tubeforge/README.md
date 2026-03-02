# TubeForge — AI Video Studio

Upload a photo, talk to AI Creative Director "Forge", get a complete YouTube-ready explainer video.

**Category**: Creative Storyteller | **Hackathon**: Gemini Live Agent Challenge

## Quick Start

```bash
# 1. Clone and enter project
cd tubeforge

# 2. Create .env from example
cp .env.example .env
# Edit .env with your Google Cloud project ID

# 3. Install dependencies
pip install -r requirements.txt

# 4. Authenticate with Google Cloud
gcloud auth application-default login

# 5. Run the server
uvicorn app:app --host 0.0.0.0 --port 8080

# 6. Open http://localhost:8080
```

## What It Does

1. **Upload a photo** or point your camera at something
2. **Talk to Forge** — the AI identifies the subject and asks about your video preferences
3. Forge **researches** the topic using Google Search (grounded facts, never hallucinated)
4. Forge **generates a script** with scene-by-scene illustrations (Gemini interleaved output)
5. Forge **creates voiceover** (Cloud TTS), **thumbnail** (Imagen 3), **B-roll clips** (Veo 2)
6. Forge **assembles the final video** (FFmpeg: Ken Burns + subtitles + audio)
7. **Download** your YouTube-ready MP4

## Architecture

```
Browser (WebSocket) → FastAPI Server → ADK Agent ("Forge")
                                          ├── google_search (research)
                                          ├── generate_script (Gemini TEXT+IMAGE)
                                          ├── generate_voiceover (Cloud TTS)
                                          ├── generate_thumbnail (Imagen 3)
                                          ├── generate_broll (Veo 2)
                                          ├── edit_image (Gemini vision)
                                          └── assemble_video (FFmpeg)
```

**Framework**: Google ADK (`google-adk`) with `run_live()` bidirectional streaming

**Model**: `gemini-live-2.5-flash-native-audio` (Vertex AI Live API)

## Google Cloud Services Used

1. **Vertex AI** — Gemini Live API, Imagen 3, Veo 2
2. **Cloud Run** — Backend hosting
3. **Cloud Text-to-Speech** — AI voiceover
4. **Cloud Storage** — Generated asset storage
5. **Google Search** — Topic research/grounding

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 / FastAPI / WebSocket |
| Agent Framework | Google ADK (Agent Development Kit) |
| AI Model | Gemini 2.5 Flash (native audio, live) |
| Image Gen | Imagen 3 (Vertex AI) |
| Video Gen | Veo 2 (Vertex AI) |
| Voiceover | Google Cloud Text-to-Speech |
| Video Assembly | FFmpeg |
| Frontend | Vanilla HTML/CSS/JS |
| Hosting | Cloud Run |

## Project Structure

```
tubeforge/
├── agent.py                 # ADK Agent definition (7 tools)
├── app.py                   # FastAPI + WebSocket server
├── tools/
│   ├── script_generator.py  # Gemini interleaved TEXT+IMAGE
│   ├── voiceover_gen.py     # Cloud TTS
│   ├── thumbnail_gen.py     # Imagen 3
│   ├── broll_gen.py         # Veo 2
│   ├── image_editor.py      # Gemini vision edit
│   └── video_assembler.py   # FFmpeg pipeline
├── prompts/
│   ├── system_prompt.txt    # Forge persona
│   └── niche_presets.json   # Style configs
├── frontend/                # Browser UI
├── outputs/                 # Generated assets
├── Dockerfile
└── requirements.txt
```

## Deploy to Cloud Run

```bash
# Option 1: ADK deploy (one command)
adk deploy cloud_run \
  --project=YOUR_PROJECT_ID \
  --region=us-central1 \
  --with_ui \
  tubeforge/

# Option 2: Docker
docker build -t tubeforge .
docker run -p 8080:8080 --env-file .env tubeforge
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | (required) |
| `GOOGLE_CLOUD_LOCATION` | GCP region | `us-central1` |
| `GOOGLE_GENAI_USE_VERTEXAI` | Use Vertex AI | `TRUE` |
| `DEMO_AGENT_MODEL` | Live API model | `gemini-live-2.5-flash-native-audio` |
| `TTS_DEFAULT_VOICE` | Cloud TTS voice | `en-US-Neural2-D` |
| `TTS_SPEAKING_RATE` | Speech speed | `0.95` |
| `GCS_BUCKET` | Storage bucket | (optional) |
| `PORT` | Server port | `8080` |

## License

Built for the Gemini Live Agent Challenge hackathon.
