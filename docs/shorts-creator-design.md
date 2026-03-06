# Shorts Creator — Architecture & Design

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (Web Components + Vite)                         │
│  ┌─────────────┬────────────────┬──────────────────────┐ │
│  │ view-topics  │   view-chat    │   view-preview       │ │
│  │ (topic pick) │ (voice + board)│ (video + download)   │ │
│  └─────────────┴───────┬────────┴──────────────────────┘ │
│                        │ WebSocket (binary audio + JSON)  │
└────────────────────────┼─────────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────────┐
│  FastAPI Server        │                                  │
│  ┌─────────────────────▼───────────────────────────────┐ │
│  │  WebSocket Handler (/ws)                             │ │
│  │  - Receives: PCM audio (binary), text (JSON)         │ │
│  │  - Sends: PCM audio (binary), events (JSON)          │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │  GeminiLive (gemini_live.py)                         │ │
│  │  - Manages Live API session                          │ │
│  │  - Routes tool calls to registered functions         │ │
│  │  - Forwards audio/transcription/events to client     │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │  Tools (tools.py) — 5 registered functions           │ │
│  │                                                      │ │
│  │  research_topic ──► Gemini 2.5 Flash + google_search │ │
│  │  generate_storyboard ──► Gemini 2.5 Flash (TEXT+IMG) │ │
│  │  generate_clip ──► Veo 2 (9:16 vertical)             │ │
│  │  generate_voiceover ──► Cloud TTS (Neural2)          │ │
│  │  assemble_short ──► FFmpeg (1080x1920 MP4)           │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Static Files: /assets, /audio-processors            │ │
│  │  Asset API: /api/assets/{filename}                   │ │
│  │  Auth API: /api/auth (simple token, no reCAPTCHA)    │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Session Initialization
```
Browser                    Server                     Gemini Live API
  │ POST /api/auth ─────────►│                              │
  │◄── {session_token} ──────│                              │
  │ WS /ws?token=xxx ────────►│                              │
  │ {setup: {config}} ───────►│ connect(model, config) ─────►│
  │◄── audio(greeting) ──────│◄── audio ────────────────────│
```

### 2. Tool Execution (e.g., generate_storyboard)
```
Browser                    Server                     Gemini Live    External API
  │◄── audio("creating...") ──│◄── tool_call ──────────│            │
  │                            │ execute tool ──────────┼──►Gemini 2.5 Flash
  │                            │◄── result ─────────────┼───(TEXT+IMAGE)
  │                            │ send_tool_response ────►│            │
  │◄── {tool_call event} ─────│                         │            │
  │◄── audio("done!") ────────│◄── audio ──────────────│            │
```

### 3. Session State (in-memory dict)
```python
_session_state = {
    "topic": "Roman Colosseum",
    "style": "cinematic",
    "research": "...(text from google_search)...",
    "storyboard": [
        {"narration": "...", "image_path": "...", "image_base64": "...", "duration_seconds": 8.0},
        ...
    ],
    "clips": [
        {"clip_id": "clip_abc123.mp4", "video_path": "...", "duration_seconds": 6},
        ...
    ],
    "voiceover_path": "outputs/audio/voiceover_xyz.wav",
    "voiceover_duration": 55.2,
    "final_video_path": "outputs/final/roman_colosseum_abc.mp4",
    "final_video_id": "roman_colosseum_abc.mp4",
}
```

## API Contracts

### REST Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/api/auth` | `{}` | `{session_token, session_time_limit}` |
| GET | `/api/status` | — | `{mode, project_id}` |
| GET | `/api/assets/{filename}` | — | File (MP4/PNG/WAV) |
| GET | `/{path}` | — | SPA fallback (dist/index.html) |

### WebSocket Protocol (`/ws?token=xxx`)

**Client → Server:**
- Binary: Raw PCM16 audio at 16kHz
- JSON: `{setup: {generation_config, system_instruction, tools, ...}}`
- JSON: `{type: "image", data: "<base64>"}` (optional camera frame)
- Text: Plain text message

**Server → Client:**
- Binary: Raw PCM16 audio at 24kHz (Gemini voice response)
- JSON: `{serverContent: {inputTranscription: {text, finished}}}`
- JSON: `{serverContent: {outputTranscription: {text, finished}}}`
- JSON: `{serverContent: {turnComplete: true}}`
- JSON: `{serverContent: {interrupted: true}}`
- JSON: `{type: "tool_call", name: "...", args: {...}, result: {...}}`

## File Structure

```
shorts-creator/
├── server/
│   ├── __init__.py
│   ├── main.py              # FastAPI + WebSocket (stripped Immergo)
│   ├── gemini_live.py        # GeminiLive class (Immergo as-is)
│   ├── config_utils.py       # PROJECT_ID resolver (Immergo as-is)
│   ├── tools.py              # 5 tool functions
│   └── prompts.py            # System prompt + tool declarations
├── src/
│   ├── main.js               # Entry point
│   ├── style.css             # Global styles (dark theme)
│   ├── components/
│   │   ├── app-root.js       # App shell, Gemini client setup
│   │   ├── config.js         # Frontend prompt + tool declarations
│   │   ├── view-topics.js    # Topic picker / niche selector
│   │   ├── view-chat.js      # Voice + transcript + storyboard preview
│   │   └── view-preview.js   # Video player + download
│   ├── data/
│   │   └── topics.json       # Topic categories
│   └── lib/gemini-live/
│       ├── geminilive.js     # WebSocket client (Immergo as-is)
│       └── mediaUtils.js     # Audio/Video utils (Immergo as-is)
├── public/audio-processors/
│   ├── capture.worklet.js    # 16kHz mic capture (Immergo as-is)
│   └── playback.worklet.js   # 24kHz playback (Immergo as-is)
├── outputs/                  # Generated assets (gitignored)
│   ├── images/
│   ├── videos/
│   ├── audio/
│   └── final/
├── index.html
├── package.json
├── vite.config.js
├── requirements.txt
├── Dockerfile
├── .env.example
└── .gitignore
```

## External Service Dependencies

| Service | Model/API | Purpose |
|---------|-----------|---------|
| Gemini Live | `gemini-live-2.5-flash-native-audio` | Voice conversation |
| Gemini Flash | `gemini-2.5-flash` | Research (with google_search) |
| Gemini Flash | `gemini-2.5-flash-preview-05-20` | Storyboard (TEXT+IMAGE) |
| Veo 2 | `veo-2.0-generate-001` | Video clip generation |
| Cloud TTS | Neural2 voices | Voiceover synthesis |
| FFmpeg | Local binary | Video assembly |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PROJECT_ID` | Yes* | auto-detect | GCP project ID |
| `LOCATION` | No | `us-central1` | GCP region |
| `MODEL` | No | `gemini-live-2.5-flash-native-audio` | Live model |
| `SESSION_TIME_LIMIT` | No | `600` | Max session seconds |
| `TTS_DEFAULT_VOICE` | No | `en-US-Neural2-D` | TTS voice |
| `TTS_SPEAKING_RATE` | No | `0.95` | Speech speed |
| `FFMPEG_PATH` | No | auto-detect | FFmpeg binary path |
| `GOOGLE_GENAI_USE_VERTEXAI` | Yes | `TRUE` | Use Vertex AI |
