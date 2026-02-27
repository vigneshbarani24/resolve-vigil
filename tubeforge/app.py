"""TubeForge FastAPI server — bidi streaming with ADK.

Adapted from google/adk-samples bidi-demo.
Pattern: FastAPI + WebSocket + LiveRequestQueue + Runner.run_live()
"""

import asyncio
import base64
import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Load environment before importing agent (needs GOOGLE_CLOUD_PROJECT etc.)
load_dotenv(Path(__file__).parent / ".env")

from agent import root_agent  # noqa: E402

# --- Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tubeforge")

# --- FastAPI app ---
app = FastAPI(title="TubeForge", description="AI Explainer Video Engine")

# Static files (frontend)
static_dir = Path(__file__).parent / "frontend"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Outputs directory (generated assets)
outputs_dir = Path(__file__).parent / "outputs"
outputs_dir.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=outputs_dir), name="outputs")

# --- ADK Runner ---
APP_NAME = "tubeforge"
session_service = InMemorySessionService()
runner = Runner(app_name=APP_NAME, agent=root_agent, session_service=session_service)


# --- Routes ---


@app.get("/")
async def root():
    """Serve the frontend."""
    index_path = static_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return {"status": "TubeForge running", "ws": "/ws/{user_id}/{session_id}"}


@app.get("/api/health")
async def health():
    """Health check for Cloud Run."""
    return {"status": "ok", "app": APP_NAME}


@app.get("/api/download/{file_type}/{filename}")
async def download_asset(file_type: str, filename: str):
    """Download a generated asset (image, video, audio)."""
    file_path = outputs_dir / file_type / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    return {"error": "File not found"}, 404


# --- WebSocket endpoint (bidi-demo pattern) ---


@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: str,
) -> None:
    """Bidirectional streaming WebSocket endpoint.

    Phase 1: Accept connection
    Phase 2: Initialize session + LiveRequestQueue + RunConfig
    Phase 3: Run concurrent upstream/downstream tasks
    Phase 4: Cleanup on disconnect
    """
    # Phase 1: Accept connection
    await websocket.accept()
    logger.info(f"WebSocket connected: user={user_id} session={session_id}")

    # Phase 2: Session initialization
    run_config = RunConfig(
        streaming_mode=StreamingMode.BIDI,
        response_modalities=["AUDIO"],
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(),
    )

    # Get or create session
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )

    live_request_queue = LiveRequestQueue()

    # Phase 3: Concurrent upstream/downstream tasks

    async def upstream_task() -> None:
        """Client → LiveRequestQueue (audio, images, text)."""
        logger.debug("upstream_task started")
        while True:
            message = await websocket.receive()

            # Binary frames: raw PCM audio
            if "bytes" in message:
                audio_data = message["bytes"]
                audio_blob = types.Blob(
                    mime_type="audio/pcm;rate=16000", data=audio_data
                )
                live_request_queue.send_realtime(audio_blob)

            # Text frames: JSON messages (text, image, camera frame)
            elif "text" in message:
                text_data = message["text"]
                try:
                    json_message = json.loads(text_data)
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON: {text_data[:100]}")
                    continue

                msg_type = json_message.get("type", "")

                if msg_type == "text":
                    # Text message
                    content = types.Content(
                        parts=[types.Part(text=json_message["text"])]
                    )
                    live_request_queue.send_content(content)

                elif msg_type in ("image", "frame"):
                    # Image upload or camera frame
                    image_data = base64.b64decode(json_message["data"])
                    mime_type = json_message.get("mimeType", "image/jpeg")
                    image_blob = types.Blob(mime_type=mime_type, data=image_data)
                    live_request_queue.send_realtime(image_blob)

                    # If image has accompanying text, send that too
                    if "text" in json_message and json_message["text"]:
                        content = types.Content(
                            parts=[types.Part(text=json_message["text"])]
                        )
                        live_request_queue.send_content(content)

    async def downstream_task() -> None:
        """Runner.run_live() events → WebSocket client."""
        logger.debug("downstream_task started")
        async for event in runner.run_live(
            user_id=user_id,
            session_id=session_id,
            live_request_queue=live_request_queue,
            run_config=run_config,
        ):
            # Send full event as JSON (client processes all event types)
            event_json = event.model_dump_json(exclude_none=True, by_alias=True)
            await websocket.send_text(event_json)
        logger.debug("run_live() completed")

    # Run both tasks concurrently
    try:
        await asyncio.gather(upstream_task(), downstream_task())
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: user={user_id} session={session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
    finally:
        # Phase 4: Cleanup
        live_request_queue.close()
        logger.info(f"Session cleaned up: user={user_id} session={session_id}")


# --- Run with uvicorn ---
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
