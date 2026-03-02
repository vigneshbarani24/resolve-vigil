"""TubeForge FastAPI server — bidi streaming with ADK.

Direct adaptation of google/adk-samples bidi-demo main.py.
Pattern: FastAPI + WebSocket + LiveRequestQueue + Runner.run_live()
"""

import asyncio
import base64
import json
import logging
import os
import warnings
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

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Suppress Pydantic serialization warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

# --- FastAPI app ---
APP_NAME = "tubeforge"

app = FastAPI()

# Mount static files (frontend)
static_dir = Path(__file__).parent / "frontend"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Outputs directory (generated assets)
outputs_dir = Path(__file__).parent / "outputs"
outputs_dir.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=outputs_dir), name="outputs")

# --- ADK Runner ---
session_service = InMemorySessionService()
runner = Runner(app_name=APP_NAME, agent=root_agent, session_service=session_service)


# --- Routes ---


@app.get("/")
async def root():
    """Serve the frontend."""
    return FileResponse(static_dir / "index.html")


@app.get("/api/health")
async def health():
    """Health check."""
    return {"status": "ok", "app": APP_NAME}


@app.get("/api/download/{file_type}/{filename}")
async def download_asset(file_type: str, filename: str):
    """Download a generated asset (image, video, audio, final)."""
    file_path = outputs_dir / file_type / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path, filename=filename)
    return {"error": "File not found"}


# --- WebSocket endpoint (exact bidi-demo pattern) ---


@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: str,
) -> None:
    """WebSocket endpoint for bidirectional streaming with ADK."""
    logger.debug(
        f"WebSocket connection request: user_id={user_id}, session_id={session_id}"
    )
    await websocket.accept()
    logger.debug("WebSocket connection accepted")

    # --- Session Initialization ---

    # Determine response modality from model name
    model_name = root_agent.model
    is_native_audio = "native-audio" in model_name.lower()

    if is_native_audio:
        response_modalities = ["AUDIO"]
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=response_modalities,
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            session_resumption=types.SessionResumptionConfig(),
        )
        logger.debug(
            f"Native audio model detected: {model_name}, using AUDIO response modality"
        )
    else:
        response_modalities = ["TEXT"]
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=response_modalities,
            session_resumption=types.SessionResumptionConfig(),
        )
        logger.debug(
            f"Half-cascade model detected: {model_name}, using TEXT response modality"
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

    # --- Concurrent bidirectional communication ---

    async def upstream_task() -> None:
        """Receives messages from WebSocket and sends to LiveRequestQueue."""
        logger.debug("upstream_task started")
        while True:
            message = await websocket.receive()

            # Handle binary frames (audio data)
            if "bytes" in message:
                audio_data = message["bytes"]
                logger.debug(f"Received binary audio chunk: {len(audio_data)} bytes")
                audio_blob = types.Blob(
                    mime_type="audio/pcm;rate=16000", data=audio_data
                )
                live_request_queue.send_realtime(audio_blob)

            # Handle text frames (JSON messages)
            elif "text" in message:
                text_data = message["text"]
                logger.debug(f"Received text message: {text_data[:100]}...")

                json_message = json.loads(text_data)

                if json_message.get("type") == "text":
                    logger.debug(f"Sending text content: {json_message['text']}")
                    content = types.Content(
                        parts=[types.Part(text=json_message["text"])]
                    )
                    live_request_queue.send_content(content)

                elif json_message.get("type") == "image":
                    logger.debug("Received image data")
                    image_data = base64.b64decode(json_message["data"])
                    mime_type = json_message.get("mimeType", "image/jpeg")
                    logger.debug(
                        f"Sending image: {len(image_data)} bytes, type: {mime_type}"
                    )
                    image_blob = types.Blob(mime_type=mime_type, data=image_data)
                    live_request_queue.send_realtime(image_blob)

    async def downstream_task() -> None:
        """Receives Events from run_live() and sends to WebSocket."""
        logger.debug("downstream_task started, calling runner.run_live()")
        async for event in runner.run_live(
            user_id=user_id,
            session_id=session_id,
            live_request_queue=live_request_queue,
            run_config=run_config,
        ):
            event_json = event.model_dump_json(exclude_none=True, by_alias=True)
            logger.debug(f"[SERVER] Event: {event_json[:200]}")
            await websocket.send_text(event_json)
        logger.debug("run_live() generator completed")

    # Run both tasks concurrently
    try:
        logger.debug("Starting asyncio.gather for upstream and downstream tasks")
        await asyncio.gather(upstream_task(), downstream_task())
    except WebSocketDisconnect:
        logger.debug("Client disconnected normally")
    except Exception as e:
        logger.error(f"Unexpected error in streaming tasks: {e}", exc_info=True)
    finally:
        logger.debug("Closing live_request_queue")
        live_request_queue.close()


# --- Run with uvicorn ---
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
