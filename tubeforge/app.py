"""TubeForge FastAPI server — raw Gemini Live API (genmedia-live pattern).

Uses google-genai SDK directly with client.aio.live.connect() for
bidirectional streaming. Tool calls are dispatched server-side.

Pattern: genmedia-live reference (Google's official creative media demo)
adapted from Flask+SocketIO to FastAPI+WebSocket.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import warnings
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.genai import types

# Load environment before importing agent (needs GOOGLE_CLOUD_PROJECT etc.)
load_dotenv(Path(__file__).parent / ".env")

from agent import MODEL_ID, TOOLS, build_live_config  # noqa: E402
from tools import (  # noqa: E402
    assemble_video,
    edit_image,
    generate_broll,
    generate_script,
    generate_thumbnail,
    generate_voiceover,
)
from tools.context import ToolContext  # noqa: E402

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
# Silence noisy websocket debug logs (ping/pong, frame hex dumps)
logging.getLogger("websockets").setLevel(logging.WARNING)
logging.getLogger("websockets.client").setLevel(logging.WARNING)
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

# ---------------------------------------------------------------------------
# FastAPI app + static files
# ---------------------------------------------------------------------------
app = FastAPI()

static_dir = Path(__file__).parent / "frontend"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

outputs_dir = Path(__file__).parent / "outputs"
outputs_dir.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=outputs_dir), name="outputs")

# ---------------------------------------------------------------------------
# Tool dispatch
# ---------------------------------------------------------------------------
TOOL_FUNCTIONS: dict[str, Any] = {
    "generate_script": generate_script,
    "generate_voiceover": generate_voiceover,
    "generate_thumbnail": generate_thumbnail,
    "generate_broll": generate_broll,
    "edit_image": edit_image,
    "assemble_video": assemble_video,
}

# Defaults for optional params the model may omit
TOOL_DEFAULTS: dict[str, dict[str, Any]] = {
    "generate_voiceover": {"voice_name": "en-US-Neural2-D", "speaking_rate": 0.95},
    "generate_broll": {"duration_seconds": 6},
    "assemble_video": {"add_subtitles": True, "background_music": ""},
}

# Per-session state (replaces ADK's session service)
session_states: dict[str, dict[str, Any]] = {}


async def dispatch_tool(name: str, args: dict, state: dict) -> dict:
    """Execute a tool function server-side in a thread executor."""
    func = TOOL_FUNCTIONS.get(name)
    if not func:
        return {"status": "error", "error": f"Unknown tool: {name}"}

    # Apply defaults for optional params
    defaults = TOOL_DEFAULTS.get(name, {})
    for key, val in defaults.items():
        args.setdefault(key, val)

    # Inject our ToolContext shim
    ctx = ToolContext(state=dict(state))  # copy so tool sees current state
    call_args = {**args, "tool_context": ctx}

    # Run in thread executor (tools may block — Veo polls for minutes)
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: func(**call_args))

    # Merge tool's state changes back into the session
    state.update(ctx.state)
    return result


# ---------------------------------------------------------------------------
# REST routes
# ---------------------------------------------------------------------------


@app.get("/")
async def root():
    """Serve the frontend."""
    return FileResponse(static_dir / "index.html")


@app.get("/api/health")
async def health():
    """Health check."""
    return {"status": "ok", "app": "tubeforge"}


@app.get("/api/assets")
async def list_assets():
    """List all generated assets by category."""
    assets: dict[str, list[str]] = {"images": [], "videos": [], "audio": [], "final": []}
    for category in assets:
        dir_path = outputs_dir / category
        if dir_path.exists():
            assets[category] = sorted(
                [f.name for f in dir_path.iterdir() if f.is_file()],
            )
    return assets


@app.get("/api/download/{file_type}/{filename}")
async def download_asset(file_type: str, filename: str):
    """Download a generated asset."""
    file_path = outputs_dir / file_type / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path, filename=filename)
    return {"error": "File not found"}


# ---------------------------------------------------------------------------
# WebSocket — bidirectional streaming with raw Gemini Live API
# ---------------------------------------------------------------------------


@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: str,
) -> None:
    """Bidirectional streaming via raw Gemini Live API.

    Follows the genmedia-live pattern:
      Browser <-> WebSocket <-> FastAPI <-> genai.Client.aio.live.connect()
                                              |
                                        Server-side tool dispatch
    """
    await websocket.accept()
    logger.info(f"WebSocket connected: user={user_id} session={session_id}")

    state = session_states.setdefault(session_id, {})
    client = genai.Client(vertexai=True)
    config = build_live_config()

    # Use an Event to signal all tasks to stop when one fails
    stop_event = asyncio.Event()

    try:
        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            logger.info("Gemini Live session established")

            # --- Upstream: WebSocket -> Gemini ---

            audio_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=20)

            async def audio_sender() -> None:
                """Drain audio queue and send to Gemini at a controlled rate."""
                while not stop_event.is_set():
                    try:
                        data = await asyncio.wait_for(audio_queue.get(), timeout=1.0)
                    except asyncio.TimeoutError:
                        continue
                    audio_blob = types.Blob(
                        mime_type="audio/pcm;rate=16000",
                        data=data,
                    )
                    await session.send_realtime_input(audio=audio_blob)
                    await asyncio.sleep(0.02)  # ~50 chunks/sec max

            async def keepalive() -> None:
                """Send periodic silent audio to prevent websocket idle timeout.

                The Gemini Live server doesn't respond to websocket pings,
                causing the websockets library to close after 20s of silence.
                Sending a tiny silent PCM chunk every 5s keeps it alive.
                """
                silent_chunk = b"\x00\x00" * 160  # 20ms of silence at 16kHz
                while not stop_event.is_set():
                    await asyncio.sleep(5)
                    if stop_event.is_set():
                        break
                    try:
                        await session.send_realtime_input(
                            audio=types.Blob(
                                mime_type="audio/pcm;rate=16000",
                                data=silent_chunk,
                            )
                        )
                    except Exception:
                        logger.debug("Keepalive send failed, session likely closed")
                        break

            async def upstream() -> None:
                """Read from WebSocket, send to Gemini Live session."""
                while not stop_event.is_set():
                    try:
                        message = await websocket.receive()
                    except WebSocketDisconnect:
                        raise

                    # Binary frame = raw PCM audio from mic
                    if "bytes" in message:
                        try:
                            audio_queue.put_nowait(message["bytes"])
                        except asyncio.QueueFull:
                            pass  # Drop oldest if backed up

                    # Text frame = JSON message (text, image, etc.)
                    elif "text" in message:
                        data = json.loads(message["text"])

                        if data.get("type") == "text":
                            await session.send_client_content(
                                turns=types.Content(
                                    role="user",
                                    parts=[types.Part(text=data["text"])],
                                ),
                                turn_complete=True,
                            )

                        elif data.get("type") == "image":
                            # Send image as video frames (genmedia-live pattern)
                            image_bytes = base64.b64decode(data["data"])
                            mime = data.get("mimeType", "image/jpeg")
                            blob = types.Blob(mime_type=mime, data=image_bytes)
                            for _ in range(3):
                                await session.send_realtime_input(video=blob)
                                await asyncio.sleep(0.1)

            # --- Downstream: Gemini -> WebSocket ---

            async def downstream() -> None:
                """Read from Gemini Live session, dispatch tools, send to WebSocket."""
                async for response in session.receive():
                    if stop_event.is_set():
                        break
                    try:
                        # --- Session resumption handle ---
                        if response.session_resumption_update:
                            update = response.session_resumption_update
                            if update.resumable and update.new_handle:
                                logger.debug("Captured session resumption handle")

                        # --- Tool calls: dispatch server-side ---
                        if response.tool_call:
                            for fc in response.tool_call.function_calls:
                                tool_name = fc.name
                                tool_args = dict(fc.args) if fc.args else {}
                                logger.info(f"Tool call: {tool_name}({tool_args})")

                                # Notify frontend (triggers pipeline stage)
                                await websocket.send_json({
                                    "content": {
                                        "parts": [{
                                            "functionCall": {
                                                "name": tool_name,
                                                "args": tool_args,
                                            }
                                        }]
                                    }
                                })

                                # Execute tool
                                result = await dispatch_tool(tool_name, tool_args, state)
                                status = result.get("status", "unknown")
                                logger.info(f"Tool result: {tool_name} -> {status}")

                                # Send response back to Gemini
                                await session.send_tool_response(
                                    function_responses=[
                                        types.FunctionResponse(
                                            id=fc.id,
                                            name=tool_name,
                                            response=result,
                                        )
                                    ]
                                )

                                # Notify frontend (triggers pipeline completion)
                                await websocket.send_json({
                                    "content": {
                                        "parts": [{
                                            "functionResponse": {
                                                "name": tool_name,
                                                "response": result,
                                            }
                                        }]
                                    }
                                })

                        # --- Server content (audio, text, transcription) ---
                        if response.server_content:
                            sc = response.server_content

                            # Model turn — text and audio parts
                            if sc.model_turn:
                                parts = []
                                for part in sc.model_turn.parts:
                                    if part.text:
                                        parts.append({"text": part.text})
                                    if part.inline_data:
                                        b64 = base64.b64encode(
                                            part.inline_data.data
                                        ).decode()
                                        parts.append({
                                            "inlineData": {
                                                "data": b64,
                                                "mimeType": part.inline_data.mime_type,
                                            }
                                        })
                                if parts:
                                    await websocket.send_json({
                                        "content": {"parts": parts}
                                    })

                            # Turn complete
                            if sc.turn_complete:
                                await websocket.send_json({"turnComplete": True})

                            # Interrupted (user spoke over model)
                            if sc.interrupted:
                                await websocket.send_json({"interrupted": True})

                            # Input transcription (what user said)
                            if getattr(sc, "input_transcription", None):
                                t = sc.input_transcription
                                await websocket.send_json({
                                    "inputTranscription": {
                                        "text": getattr(t, "text", "") or "",
                                        "finished": getattr(t, "finished", False),
                                    }
                                })

                            # Output transcription (what model said)
                            if getattr(sc, "output_transcription", None):
                                t = sc.output_transcription
                                await websocket.send_json({
                                    "outputTranscription": {
                                        "text": getattr(t, "text", "") or "",
                                        "finished": getattr(t, "finished", False),
                                    }
                                })

                    except WebSocketDisconnect:
                        raise
                    except Exception as e:
                        logger.error(f"Error processing response: {e}", exc_info=True)

            # Run all tasks concurrently; cancel siblings on first failure
            tasks = [
                asyncio.create_task(upstream(), name="upstream"),
                asyncio.create_task(downstream(), name="downstream"),
                asyncio.create_task(audio_sender(), name="audio_sender"),
                asyncio.create_task(keepalive(), name="keepalive"),
            ]
            try:
                done, pending = await asyncio.wait(
                    tasks, return_when=asyncio.FIRST_EXCEPTION,
                )
                # Re-raise the first exception so outer handler catches it
                for t in done:
                    if t.exception():
                        raise t.exception()
            finally:
                stop_event.set()
                for t in tasks:
                    t.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)

    except WebSocketDisconnect:
        logger.info(f"Client disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"Session error: {e}", exc_info=True)
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
