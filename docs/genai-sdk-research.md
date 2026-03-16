# Vigil — Google GenAI SDK + ADK Reference

> Voice-First IT Support + Real-Time Scam Shield
> Updated: 2026-03-16
> Primary Framework: Google ADK (wraps google-genai internally)

---

## 1. SDK: `google-genai`

```bash
pip install google-genai
```

### Initialization

```python
from google import genai

# Vertex AI (production — used by Vigil)
client = genai.Client(vertexai=True, project="resolve-vigil", location="us-central1")

# Or via environment variables (preferred for Cloud Run):
# GOOGLE_GENAI_USE_VERTEXAI=TRUE
# GOOGLE_CLOUD_PROJECT=resolve-vigil
# GOOGLE_CLOUD_LOCATION=us-central1
```

### Model IDs

| Model ID | Use Case |
|----------|----------|
| `gemini-live-2.5-flash-native-audio` | **Voice streaming** — Theepa voice sessions via Gemini Live API |
| `gemini-2.5-flash` | **ADK agents / Vision** — Vigil shield analysis, researcher, threat_intel |

**WARNING**: Do NOT use `gemini-2.0-flash-live` or `gemini-2.0-flash-live-001`. The correct voice model is `gemini-live-2.5-flash-native-audio`. Using the wrong model ID will cause connection failures.

### Live API (Bidirectional Voice Streaming)

```python
from google.genai import types

config = types.LiveConnectConfig(
    response_modalities=["AUDIO"],
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
        )
    ),
    system_instruction=types.Content(parts=[types.Part(text="You are Theepa...")]),
    tools=[...],  # Function declarations for IT tools
    input_audio_transcription=types.AudioTranscriptionConfig(),
    output_audio_transcription=types.AudioTranscriptionConfig(),
)

async with client.aio.live.connect(
    model="gemini-live-2.5-flash-native-audio",
    config=config
) as session:
    # Send microphone audio
    await session.send_realtime_input(
        audio=types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
    )
    # Send screen capture for vision
    await session.send_realtime_input(
        video=types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
    )
    # Receive responses
    async for msg in session.receive():
        if msg.server_content and msg.server_content.model_turn:
            for part in msg.server_content.model_turn.parts:
                if part.text: print(part.text)       # Transcript
                if part.inline_data: pass             # Audio bytes
```

**Available voices**: Puck, Charon, Kore, Fenrir, Aoede

### Key Types

| Type | Purpose |
|------|---------|
| `types.LiveConnectConfig` | Live API session configuration |
| `types.Blob(data, mime_type)` | Binary data (audio/image) |
| `types.Content(role, parts)` | Conversation message |
| `types.Part` | Text, image, or audio part |
| `types.GenerateContentConfig` | Non-streaming generation config |
| `types.AudioTranscriptionConfig` | Enable input/output audio transcription |

---

## 2. Google ADK (Agent Development Kit)

```bash
pip install google-adk  # Requires Python 3.10+
```

### What ADK Provides

- `Agent` class with declarative tool registration and sub-agent delegation
- `FunctionTool` — auto-wraps Python functions from type hints + docstrings
- `run_live()` — async generator for bidirectional streaming with Gemini Live API
- `LiveRequestQueue` — thread-safe async FIFO for audio/content input
- `SessionService` — session state management
- `ToolContext` — injected into tool functions for scoped state access
- `adk web` — built-in dev UI for testing agents
- `adk deploy cloud_run` — one-command Cloud Run deployment

### ADK Agent Definition (Vigil Multi-Agent)

**CRITICAL**: ADK's `google_search` built-in tool cannot coexist with other tools in a single agent. This is why Vigil uses 4 agents.

```python
import os
from google.adk.agents import Agent
from google.adk.tools import google_search

# Sub-agent 1: Vigil Shield (scam detection)
vigil = Agent(
    name="vigil",
    model="gemini-2.5-flash",
    description="Scam and phishing detection agent",
    instruction="Analyze URLs, pages, and content for threats...",
    tools=[
        scan_url_safety,
        check_domain_reputation,
        analyze_page_for_threats,
        verify_domain_legitimacy,
        detect_fake_content,
        report_threat,
        highlight_danger_zones,
    ],
)

# Sub-agent 2: Researcher (google_search for IT topics)
researcher = Agent(
    name="researcher",
    model="gemini-2.5-flash",
    description="IT topic research with web search grounding",
    instruction="Research IT topics thoroughly. Return key facts and solutions.",
    tools=[google_search],  # ONLY tool — cannot mix with others
)

# Sub-agent 3: Threat Intel (google_search for scam verification)
threat_intel = Agent(
    name="threat_intel",
    model="gemini-2.5-flash",
    description="Threat intelligence via web search verification",
    instruction="Verify scam reports, check domain legitimacy against web sources.",
    tools=[google_search],  # ONLY tool — separate from researcher
)

# Root agent: Theepa (IT helpdesk + orchestrator)
root_agent = Agent(
    name="theepa",
    model="gemini-live-2.5-flash-native-audio",
    description="Voice-first IT helpdesk agent",
    instruction="You are Theepa, an IT helpdesk specialist...",
    tools=[
        search_knowledge_base,
        lookup_error_code,
        lookup_portal_page,
        diagnose_issue,
        create_issue,
        create_itsm_ticket,
        update_itsm_ticket,
        navigate_user_browser,
    ],
    sub_agents=[vigil, researcher, threat_intel],
)
```

**Agent transfer flow**: User speaks to Theepa. Theepa delegates to `vigil` for shield scans, `researcher` for IT knowledge grounding, or `threat_intel` for scam fact-checking. Control returns to Theepa after each sub-agent completes.

### ADK FunctionTool Pattern

ADK auto-wraps Python functions into tools. Requirements:
- Type hints on all parameters
- Docstring with description (becomes tool description for the model)
- Optional `tool_context: ToolContext` parameter for state access

```python
from google.adk.tools import ToolContext

def search_knowledge_base(
    query: str,
    category: str,
    tool_context: ToolContext,
) -> dict:
    """Search the IT helpdesk knowledge base for articles matching a query.

    Args:
        query: Search terms describing the user's issue.
        category: Issue category — one of: network, email, software, hardware,
                  security, account, vpn, printing, general.
        tool_context: ADK context for session state access.

    Returns:
        dict with matching articles, each containing title, content, and relevance score.
    """
    # Implementation searches helpdesk_knowledge_base.json
    results = perform_search(query, category)
    tool_context.state["last_kb_search"] = query
    tool_context.state["kb_results"] = results
    return {"articles": results, "count": len(results)}
```

### ADK ToolContext State Scopes

```python
tool_context.state["key"]          # Session-specific (default)
tool_context.state["app:key"]      # Shared across all users
tool_context.state["user:key"]     # Per-user across sessions
tool_context.state["temp:key"]     # Not persisted

# Vigil state keys:
tool_context.state["diagnostic_stage"]    # GREETING | GATHERING | DIAGNOSING | RESOLUTION
tool_context.state["detected_errors"]     # List of error codes found
tool_context.state["kb_results"]          # Last KB search results
tool_context.state["active_tickets"]      # ITSM tickets in session
tool_context.state["shield_alerts"]       # Vigil threat detections
tool_context.state["scan_history"]        # URLs scanned this session
```

### ADK Bidi Streaming (LiveRequestQueue)

This is how the FastAPI WebSocket handler bridges browser audio to ADK's `run_live()`:

```python
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.genai import types

session_service = InMemorySessionService()
runner = Runner(agent=root_agent, session_service=session_service)

# Per WebSocket connection:
session = session_service.create_session(user_id="user1", session_id="session1")
live_queue = LiveRequestQueue()

# Upstream: browser audio → LiveRequestQueue
async def upstream(websocket, queue):
    async for msg in websocket.iter_bytes():
        await queue.send_realtime(
            types.Blob(data=msg, mime_type="audio/pcm;rate=16000")
        )
    await queue.close()  # CRITICAL: signals end of input

# Downstream: run_live → browser
async def downstream(websocket, runner, queue, session):
    async for event in runner.run_live(session=session, live_request_queue=queue):
        if event.text:
            await websocket.send_text(json.dumps({"type": "transcript", "text": event.text}))
        if event.audio:
            await websocket.send_bytes(event.audio)

# Run both directions concurrently
await asyncio.gather(upstream(ws, live_queue), downstream(ws, runner, live_queue, session))
```

**LiveRequestQueue methods** (verified):

| Method | Use For |
|--------|---------|
| `queue.send_content(types.Content(...))` | Text and structured content |
| `queue.send_realtime(types.Blob(...))` | Audio/video binary data |
| `queue.close()` | Graceful shutdown |

**Correct import paths** (verified):

| Import | Path |
|--------|------|
| LiveRequestQueue | `from google.adk.agents.live_request_queue import LiveRequestQueue` |
| RunConfig | `from google.adk.agents.run_config import RunConfig, StreamingMode` |

### google_search Constraint

The `google_search` built-in tool from `google.adk.tools` has a hard limitation: it cannot be combined with any other tools in one agent's tool list. This is an ADK framework constraint, not a Gemini model limitation.

**Wrong** (will fail):
```python
agent = Agent(tools=[google_search, search_knowledge_base])  # ERROR
```

**Correct** (sub-agent isolation):
```python
researcher = Agent(name="researcher", tools=[google_search])
theepa = Agent(name="theepa", tools=[...it_tools...], sub_agents=[researcher])
```

Vigil uses two separate google_search sub-agents (`researcher` and `threat_intel`) to keep IT research and threat verification contextually separated with different instructions.

---

## 3. ADK Deployment

```bash
# Development (built-in dev UI)
adk web resolve/

# Cloud Run deployment
adk deploy cloud_run \
  --project=resolve-vigil \
  --region=us-central1 \
  --with_ui \
  resolve/

# Custom deployment (Vigil uses this for FastAPI + WebSocket)
python -m uvicorn server.main:app --host 0.0.0.0 --port 8080
```

### ADK vs Raw GenAI SDK

| Aspect | google-genai SDK | Google ADK |
|--------|-----------------|------------|
| Scope | Low-level API wrapper | Full agent framework |
| Tools | Manual FunctionDeclaration JSON | Auto-wrapped from Python functions |
| State | None built-in | ToolContext with scoped state |
| Streaming | Manual session loop | `run_live()` + `LiveRequestQueue` |
| Multi-agent | DIY orchestration | `sub_agents` with automatic transfer |
| Deploy | DIY Dockerfile | `adk deploy cloud_run` |
| Dev UI | None | `adk web` |
| Testing | None | `adk eval` |

**Vigil uses ADK** as the primary framework. The `google-genai` SDK is used inside tool functions (e.g., `analyze_page_for_threats` calls Gemini Vision directly) since ADK wraps genai internally.
