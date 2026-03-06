# Shorts Creator — Build Plan

## Decision Context

**Problem**: TubeForge's ADK-based backend had voice/tool integration bugs.
Immergo (immersive-language-learning) is a proven Live API app with working voice + tools.

**Decision**: Fork Immergo's architecture (raw `google-genai` SDK, NOT ADK),
rebuild as a YouTube Shorts Creator.

**Key competitor**: Storytopia (Cloud Run Grand Prize winner) — polished multi-agent
storybook app but NO Live API, NO voice, NO video output. We beat them on all three.

## What We're Building

**One-liner**: "Talk to your AI director, get a YouTube Short in minutes."

**Flow**:
1. User opens app → picks a topic/niche (or describes one via voice)
2. Voice conversation with AI director about the Short's angle, style, audience
3. AI researches topic (Gemini with google_search grounding — separate call, NOT in Live session)
4. Generates storyboard: 4-6 scenes with narration text + scene images (gemini-2.5-flash-preview)
5. Generates Veo 2 video clips per scene (4-8s each, 9:16 vertical)
6. Generates voiceover (Cloud TTS)
7. Assembles final 60s vertical Short (FFmpeg: clips + voiceover + subtitles)
8. User previews and downloads MP4

## Architecture

```
Browser (Web Components, dark theme UI)
  ↕ WebSocket (binary audio + JSON events)
FastAPI Server (forked from Immergo main.py)
  ↕ google-genai Live API (gemini-live-2.5-flash-native-audio)
GeminiLive wrapper (forked from Immergo gemini_live.py)
  ├── register_tool(research_topic)     → Gemini + google_search (SEPARATE non-Live call)
  ├── register_tool(generate_storyboard)→ gemini-2.5-flash-preview (TEXT+IMAGE)
  ├── register_tool(generate_clip)      → Veo 2 (veo-2.0-generate-001, 9:16)
  ├── register_tool(generate_voiceover) → Cloud TTS
  └── register_tool(assemble_short)     → FFmpeg pipeline (1080x1920)
```

## Critical Design Decisions

### 1. google_search grounding — SEPARATE call, not Live session
Immergo's `geminilive.js` (line 387-393) **deletes** `function_declarations` when
`googleGrounding` is enabled. Google Search cannot coexist with custom tools in the
same Live session. Solution: `research_topic` tool uses a **separate** `genai.Client`
call (non-streaming) with `google_search` tool, not the Live session.

### 2. Tool name alignment
Immergo's `register_tool()` uses `func.__name__` as the tool name. The frontend
`function_declarations` must use the SAME names. We register tools as:
- `research_topic` (not `tool_research_topic`)
- `generate_storyboard`
- `generate_clip`
- `generate_voiceover`
- `assemble_short`

### 3. Vertical format (9:16)
All generated content targets 1080x1920 (YouTube Shorts vertical):
- Veo 2: `aspect_ratio="9:16"`
- FFmpeg Ken Burns: `s=1080x1920`
- Storyboard images: vertical composition prompts
- Subtitle positioning: `MarginV=60` (higher for vertical)

### 4. Session state
Simple in-memory dict per server process. Not shared across instances.
Sufficient for hackathon demo. Would need Redis/Firestore for production.

## What We Keep from Immergo (as-is)
- `server/gemini_live.py` — GeminiLive class (WebSocket → Live API proxy)
- `server/config_utils.py` — PROJECT_ID resolution
- `src/lib/gemini-live/geminilive.js` — WebSocket client
- `src/lib/gemini-live/mediaUtils.js` — AudioStreamer, AudioPlayer, VideoStreamer
- `public/audio-processors/capture.worklet.js` — 16kHz PCM capture
- `public/audio-processors/playback.worklet.js` — 24kHz PCM playback
- `vite.config.js` — dev proxy config

## What We Strip from Immergo
- reCAPTCHA (`recaptcha_validator.py`, enterprise.js script tag)
- Redis (`redis` dependency, rate limit storage)
- slowapi rate limiting
- fingerprint module (`fingerprint.py`)
- BigQuery tracking (`simple_tracker.py`)
- Language learning UI (missions, scoring, summary)

## What We Create New
- `server/tools.py` — 5 tool functions (ported from TubeForge + adapted)
- `server/prompts.py` — System prompt + tool declarations
- `server/main.py` — Stripped FastAPI server with tool registration
- `src/components/app-root.js` — App shell (3 views)
- `src/components/config.js` — Frontend system prompt + tool declarations
- `src/components/view-topics.js` — Topic picker
- `src/components/view-chat.js` — Voice conversation + live storyboard preview
- `src/components/view-preview.js` — Final video player + download

## What We Port from TubeForge (adapted)
| TubeForge Source | Shorts Creator Target | Changes |
|---|---|---|
| `tools/script_generator.py` | `generate_storyboard()` | Model: gemini-2.5-flash-preview, vertical prompts |
| `tools/broll_gen.py` | `generate_clip()` | aspect_ratio: 9:16 (was 16:9) |
| `tools/voiceover_gen.py` | `generate_voiceover()` | Remove ADK ToolContext, use session dict |
| `tools/video_assembler.py` | `assemble_short()` | Output: 1080x1920, subtitle style for vertical |

## Winning Criteria Alignment

| Criteria (Weight) | How We Score |
|---|---|
| **Innovation & Multimodal UX (40%)** | Live voice conversation, real-time storyboard preview, See+Hear+Speak |
| **Technical Implementation (30%)** | google-genai SDK, 5 tools, Veo 2 + Imagen + TTS + FFmpeg, Cloud Run |
| **Demo & Presentation (30%)** | Tangible output (downloadable Short), live demo, architecture diagram |

**vs Storytopia**: NO voice, NO Live API, NO video output. We have all three.
**vs Pixtale**: NO AI-generated images, NO video generation, NO voice.
