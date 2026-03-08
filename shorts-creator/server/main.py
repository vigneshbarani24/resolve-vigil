"""FastAPI server for YouTube Shorts Creator.

Forked from Immergo (immersive-language-learning) — stripped of:
- reCAPTCHA, Redis, slowapi rate limiting, fingerprint, BigQuery tracking

Kept: WebSocket proxy to Gemini Live, static file serving, session tokens.
"""

import sys
import io
# Fix Windows cp1252 encoding crash on emoji print statements
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import asyncio
import base64
import json
import logging
import os
import time
import uuid
from pathlib import Path
from typing import Dict, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from server.gemini_live import GeminiLive
from server.config_utils import get_project_id
from server.tools import (
    research_topic,
    generate_storyboard,
    generate_clip,
    generate_voiceover,
    assemble_short,
)
from server.prompts import SYSTEM_PROMPT, TOOL_DECLARATIONS

load_dotenv(override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
PROJECT_ID = get_project_id()
LOCATION = os.getenv("LOCATION", "us-central1")
MODEL = os.getenv("MODEL", "gemini-live-2.5-flash-native-audio")
SESSION_TIME_LIMIT = int(os.getenv("SESSION_TIME_LIMIT", "600"))  # 10 min for video gen

app = FastAPI(title="Shorts Creator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve built frontend
if os.path.exists("dist/assets"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
if os.path.exists("dist/audio-processors"):
    app.mount("/audio-processors", StaticFiles(directory="dist/audio-processors"), name="audio-processors")

# In-memory session tokens
valid_tokens: Dict[str, float] = {}
TOKEN_EXPIRY_SECONDS = 60


def cleanup_tokens():
    current = time.time()
    expired = [t for t, ts in valid_tokens.items() if current - ts > TOKEN_EXPIRY_SECONDS]
    for t in expired:
        del valid_tokens[t]


@app.get("/api/status")
async def get_status():
    return {"mode": "simple", "project_id": PROJECT_ID}


@app.post("/api/auth")
async def authenticate(request: Request):
    """Issue a session token (no reCAPTCHA required in dev)."""
    session_token = str(uuid.uuid4())
    cleanup_tokens()
    valid_tokens[session_token] = time.time()
    return {"session_token": session_token, "session_time_limit": SESSION_TIME_LIMIT}


@app.get("/api/assets/{filename}")
async def serve_asset(filename: str):
    """Serve generated assets (images, videos)."""
    for dir_path in [
        Path("outputs/final"),
        Path("outputs/videos"),
        Path("outputs/images"),
        Path("outputs/audio"),
    ]:
        file_path = dir_path / filename
        if file_path.exists():
            return FileResponse(str(file_path))
    raise HTTPException(status_code=404, detail="Asset not found")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = f"dist/{full_path}"
    if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse("dist/index.html")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    await websocket.accept()

    # Validate token
    if not token or token not in valid_tokens:
        logger.warning("Invalid or missing session token")
        await websocket.close(code=4003, reason="Unauthorized")
        return

    del valid_tokens[token]
    logger.info("WebSocket connected and authenticated")

    # Wait for setup message
    setup_config = None
    try:
        message = await websocket.receive_text()
        initial_data = json.loads(message)
        if "setup" in initial_data:
            setup_config = initial_data["setup"]
            logger.info("Received setup configuration")
    except Exception as e:
        logger.warning(f"Error receiving setup config: {e}")

    audio_input_queue = asyncio.Queue()
    video_input_queue = asyncio.Queue()
    text_input_queue = asyncio.Queue()

    async def audio_output_callback(data):
        await websocket.send_bytes(data)

    gemini_client = GeminiLive(
        project_id=PROJECT_ID,
        location=LOCATION,
        model=MODEL,
        input_sample_rate=16000,
    )

    # Register tools — names MUST match frontend function_declarations exactly
    gemini_client.register_tool(research_topic)
    gemini_client.register_tool(generate_storyboard)
    gemini_client.register_tool(generate_clip)
    gemini_client.register_tool(generate_voiceover)
    gemini_client.register_tool(assemble_short)

    async def receive_from_client():
        try:
            while True:
                message = await websocket.receive()

                if "bytes" in message and message["bytes"]:
                    await audio_input_queue.put(message["bytes"])
                elif "text" in message and message["text"]:
                    text = message["text"]
                    try:
                        payload = json.loads(text)
                        if isinstance(payload, dict) and payload.get("type") == "image":
                            image_data = base64.b64decode(payload["data"])
                            await video_input_queue.put(image_data)
                            continue
                    except json.JSONDecodeError:
                        pass
                    await text_input_queue.put(text)
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected")
        except Exception as e:
            logger.error(f"Error receiving from client: {e}")

    receive_task = asyncio.create_task(receive_from_client())

    async def run_session():
        async for event in gemini_client.start_session(
            audio_input_queue=audio_input_queue,
            video_input_queue=video_input_queue,
            text_input_queue=text_input_queue,
            audio_output_callback=audio_output_callback,
            audio_interrupt_callback=None,
            setup_config=setup_config,
        ):
            if event:
                await websocket.send_json(event)

    try:
        await asyncio.wait_for(run_session(), timeout=SESSION_TIME_LIMIT)
    except asyncio.TimeoutError:
        logger.info("Session time limit reached")
        await websocket.close(code=1000, reason="Session time limit reached")
    except Exception as e:
        logger.error(f"Error in Gemini session: {e}")
    finally:
        receive_task.cancel()
        try:
            await websocket.close()
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
