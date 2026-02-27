# Google GenAI SDK + ADK — Reference for TubeForge

> Compiled from research | Updated: 2026-02-27 | Primary: ADK (wraps GenAI SDK internally)

## SDK: `google-genai` (new unified SDK)

```bash
pip install google-genai
```

### Initialization

```python
from google import genai

# Vertex AI (production — use this for hackathon)
client = genai.Client(vertexai=True, project="tubeforge-hackathon", location="us-central1")

# Or API Key (development only)
client = genai.Client(api_key="YOUR_API_KEY")
```

### Key Models

| Model ID | Use Case |
|----------|----------|
| `gemini-2.0-flash` | Standard generation, interleaved output |
| `gemini-2.0-flash-live-001` | Live API bidi streaming (voice + vision). Use env var `DEMO_AGENT_MODEL` to override. |
| `gemini-2.0-flash-preview-image-generation` | Native text + image generation |
| `imagen-3.0-generate-002` | High-quality image generation |
| `veo-3.1-generate-001` | Video generation (4-8 sec clips) |

### Live API (Bidi Streaming)

```python
from google.genai import types

config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
        )
    ),
    system_instruction=types.Content(parts=[types.Part(text="You are Forge...")]),
    tools=[...],  # Function declarations
    input_audio_transcription=types.AudioTranscriptionConfig(),
    output_audio_transcription=types.AudioTranscriptionConfig(),
)

async with client.aio.live.connect(model="gemini-2.0-flash", config=config) as session:
    # Send audio
    await session.send_realtime_input(
        audio=types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
    )
    # Send image
    await session.send_realtime_input(
        video=types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
    )
    # Receive
    async for msg in session.receive():
        if msg.server_content and msg.server_content.model_turn:
            for part in msg.server_content.model_turn.parts:
                if part.text: print(part.text)
                if part.inline_data: pass  # audio bytes
```

**Available voices**: Puck, Charon, Kore, Fenrir, Aoede

### Interleaved Output (Text + Images)

```python
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Create a documentary script about the Colosseum with illustrations.",
    config=types.GenerateContentConfig(
        response_modalities=["TEXT", "IMAGE"],
    )
)

from PIL import Image
import io

for part in response.candidates[0].content.parts:
    if part.text:
        print(part.text)
    elif part.inline_data:
        image = Image.open(io.BytesIO(part.inline_data.data))
        image.save("scene.png")
```

### Function Calling

```python
tools = [
    types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name="research_topic",
            description="Research a topic using Google Search",
            parameters=types.Schema(
                type="OBJECT",
                properties={
                    "topic": types.Schema(type="STRING"),
                    "aspects": types.Schema(type="ARRAY", items=types.Schema(type="STRING")),
                },
                required=["topic"],
            ),
        )
    ])
]
```

### Key Types

| Type | Purpose |
|------|---------|
| `types.LiveConnectConfig` | Live API session config |
| `types.Blob(data, mime_type)` | Binary data (audio/image) |
| `types.Content(role, parts)` | Conversation message |
| `types.Part` | Text, image, or audio part |
| `types.GenerateContentConfig` | Generation config |
| `types.SessionResumptionConfig` | Resume interrupted sessions |
| `types.AudioTranscriptionConfig` | Enable audio transcription |

## genmedia-live Patterns to Port

### Image Generation (Imagen 3)
Port the `handle_image_generation` pattern from genmedia-live into ADK FunctionTool functions.
Use `genai.Client` inside tool functions to call Imagen/Veo directly.

### Video Generation (Veo 2)
Port the video generation + FFmpeg assembly patterns as FunctionTool functions.

### FFmpeg Pipeline
Port frame extraction, video combining, Ken Burns effect patterns into `video_assembler.py`.

---

## Google ADK (Agent Development Kit) — Primary Framework

```bash
pip install google-adk  # v1.25.0+, requires Python 3.10+
```

### What ADK Provides
- Full agent framework built ON TOP of `google-genai` SDK
- `Agent` class with declarative tool registration
- `FunctionTool` — auto-wraps Python functions from type hints + docstrings
- `run_live()` — async generator for bidi streaming with Gemini Live API
- `LiveRequestQueue` — thread-safe async FIFO buffer
- `SessionService` — session state management
- `ToolContext` — injected into tool functions for state access
- `adk web` — built-in dev UI for testing
- `adk deploy cloud_run` — one-command Cloud Run deployment
- `adk eval` — agent evaluation framework

### ADK Agent Definition (Multi-Agent Pattern)

**CRITICAL**: ADK's `google_search` built-in tool **cannot coexist** with other tools in a single agent. Use a multi-agent architecture:

```python
import os
from google.adk.agents import Agent
from google.adk.tools import google_search

# Sub-agent: google_search ONLY (ADK limitation)
researcher = Agent(
    name="researcher",
    model="gemini-2.0-flash",
    description="Research assistant for gathering facts",
    instruction="Research topics thoroughly. Return key facts, dates, figures.",
    tools=[google_search],  # ONLY tool — cannot mix with others
)

# Main agent: media tools + sub_agents for research
AGENT_MODEL = os.environ.get("DEMO_AGENT_MODEL", "gemini-2.0-flash-live-001")

root_agent = Agent(
    name="forge",
    model=AGENT_MODEL,    # Live API model (use -001 suffix)
    description="AI Creative Director for YouTube videos",
    instruction="You are Forge...",
    tools=[my_tool_function],     # Media tools only
    sub_agents=[researcher],      # Transfer to researcher for google_search
)
```

**Agent transfer flow**: User → Forge → (transfer to Researcher for facts) → back to Forge → media tools

### ADK FunctionTool Pattern

ADK auto-wraps Python functions into tools. Requirements:
- Type hints on all parameters
- Docstring with description
- Optional `tool_context: ToolContext` parameter for state access

```python
from google.adk.tools import ToolContext

def generate_thumbnail(
    subject: str,
    title_text: str,
    style: str,
    tool_context: ToolContext
) -> dict:
    """Generate a YouTube thumbnail using Imagen 3.

    Args:
        subject: Main subject of the thumbnail
        title_text: Bold text overlay
        style: Visual style — dramatic, colorful, mysterious, clean
        tool_context: ADK context for state management

    Returns:
        dict with thumbnail_id and thumbnail_url
    """
    from google import genai
    client = genai.Client(vertexai=True)
    response = client.models.generate_images(
        model="imagen-3.0-generate-002",
        prompt=f"{style} YouTube thumbnail: {subject}. {title_text}",
        config={"number_of_images": 1, "aspect_ratio": "16:9"},
    )
    path = save_image(response.generated_images[0])
    tool_context.state["thumbnail_id"] = path
    return {"thumbnail_id": path}
```

### ADK ToolContext State

```python
# State scopes:
tool_context.state["key"]         # Session-specific (default)
tool_context.state["app:key"]     # Shared across all users
tool_context.state["user:key"]    # Per-user across sessions
tool_context.state["temp:key"]    # Not persisted

# TubeForge state keys:
tool_context.state["script_segments"]   # Generated script
tool_context.state["voiceover_id"]      # Audio file path
tool_context.state["thumbnail_id"]      # Thumbnail path
tool_context.state["broll_ids"]         # B-roll clip paths
tool_context.state["video_url"]         # Final video path
tool_context.state["niche"]             # Selected preset
tool_context.state["research_context"]  # Search results
```

### ADK Bidi Streaming (run_live)

```python
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.live_request_queue import LiveRequestQueue  # CORRECT import path
from google.adk.agents.run_config import RunConfig, StreamingMode  # Optional: run config
from google.genai import types

session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service)

# Per WebSocket connection:
session = session_service.create_session(user_id="u1", session_id="s1")
live_queue = LiveRequestQueue()

# Upstream: client → queue
async def upstream(websocket, queue):
    async for msg in websocket.iter_bytes():
        # Audio: send as realtime blob
        await queue.send_realtime(
            types.Blob(data=msg, mime_type="audio/pcm;rate=16000")
        )
        # Text: send as content
        # await queue.send_content(types.Content(parts=[types.Part(text="...")]))
    await queue.close()  # CRITICAL: graceful shutdown

# Downstream: run_live → client
async def downstream(websocket, runner, queue, session):
    async for event in runner.run_live(session=session, live_request_queue=queue):
        if event.text:
            await websocket.send_text(event.text)
        if event.audio:
            await websocket.send_bytes(event.audio)

# Run concurrently
await asyncio.gather(upstream(...), downstream(...))
```

**Correct LiveRequestQueue methods** (verified):
| Method | Use For |
|--------|---------|
| `queue.send_content(types.Content(...))` | Text and structured content |
| `queue.send_realtime(types.Blob(...))` | Audio/video binary data |
| `queue.close()` | Graceful shutdown |
| ~~`queue.send(msg)`~~ | **WRONG** — does not exist |

**Correct import paths** (verified):
| Our old spec | Correct |
|---|---|
| `from google.adk.streaming import LiveRequestQueue` | `from google.adk.agents.live_request_queue import LiveRequestQueue` |
| `from google.adk.agents.run_config import RunConfig` | `from google.adk.agents.run_config import RunConfig, StreamingMode` |

### ADK Built-in Tools

```python
from google.adk.tools import google_search  # Google Search grounding
# IMPORTANT: google_search CANNOT coexist with other tools in one agent.
# Must be isolated in a dedicated sub-agent:
researcher = Agent(name="researcher", tools=[google_search])
root_agent = Agent(name="forge", tools=[...media_tools...], sub_agents=[researcher])
```

### ADK Deployment

```bash
# Development (free dev UI)
adk web tubeforge/

# Cloud Run deployment
adk deploy cloud_run \
  --project=tubeforge-hackathon \
  --region=us-central1 \
  --with_ui \
  tubeforge/

# What it does:
# 1. Auto-generates Dockerfile
# 2. Pushes to Artifact Registry
# 3. Deploys to Cloud Run with HTTPS
```

### ADK Evaluation (Bonus)

```bash
adk eval golden_dataset.json
```

Evaluates agent trajectory (tool call order) and response quality.

### ADK vs Raw GenAI SDK

| Aspect | google-genai SDK | Google ADK |
|--------|-----------------|------------|
| Scope | Low-level API wrapper | Full agent framework |
| Tools | Manual FunctionDeclaration | Auto-wrapped FunctionTool |
| State | None | ToolContext with scoped state |
| Streaming | Manual session loop | `run_live()` + `LiveRequestQueue` |
| Deploy | DIY Dockerfile | `adk deploy cloud_run` |
| Dev UI | None | `adk web` |
| Testing | None | `adk eval` |

**TubeForge uses ADK** as the primary framework. GenAI SDK is used INSIDE tool functions for Imagen/Veo calls (since ADK wraps genai internally anyway).
