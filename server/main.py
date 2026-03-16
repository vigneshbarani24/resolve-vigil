import base64
import asyncio
import json
import os
import logging
import time
import uuid
from typing import Dict, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from server.gemini_live import GeminiLive
from server.config_utils import get_project_id
from server.tools import register_all_tools, TOOL_DECLARATIONS
from server.session_state import create_session, get_session, end_session
from server.adk_agent import is_adk_enabled

load_dotenv(override=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ID = get_project_id()
LOCATION = os.getenv("LOCATION", "us-central1")
MODEL = os.getenv("MODEL", "gemini-live-2.5-flash-native-audio")
SESSION_TIME_LIMIT = int(os.getenv("SESSION_TIME_LIMIT", "300"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
if os.path.exists("dist/assets"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
if os.path.exists("dist/audio-processors"):
    app.mount("/audio-processors", StaticFiles(directory="dist/audio-processors"), name="audio-processors")
if os.path.exists("extension"):
    app.mount("/extension", StaticFiles(directory="extension"), name="extension")

# In-memory token storage
valid_tokens: Dict[str, float] = {}
TOKEN_EXPIRY_SECONDS = 300

def cleanup_tokens():
    current_time = time.time()
    expired = [token for token, ts in valid_tokens.items() if current_time - ts > TOKEN_EXPIRY_SECONDS]
    for token in expired:
        del valid_tokens[token]

@app.get("/health")
async def health_check():
    return {"status": "ok", "adk": is_adk_enabled()}

@app.get("/api/status")
async def get_status():
    return {
        "mode": "adk" if is_adk_enabled() else "live",
        "model": MODEL,
        "tools": 9,
        "features": ["voice", "vision", "screen_share", "vigil_shield", "ui_navigator", "multilingual"],
        "languages": 20,
        "adk_enabled": is_adk_enabled(),
    }

@app.post("/api/auth")
async def authenticate(request: Request):
    try:
        body = {}
        try:
            body = await request.json()
        except:
            pass
        language = body.get("language", "English")
        session_token = str(uuid.uuid4())
        cleanup_tokens()
        valid_tokens[session_token] = time.time()
        create_session(session_token, language)
        return {"session_token": session_token, "session_time_limit": SESSION_TIME_LIMIT}
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    await websocket.accept()

    if not token or token not in valid_tokens:
        logger.warning("Invalid or missing session token")
        await websocket.close(code=4003, reason="Unauthorized")
        return

    del valid_tokens[token]
    logger.info("WebSocket connection accepted")

    session = get_session(token)
    if session:
        from server.tools import issue_tracker, itsm, kb_search, portal_lookup
        issue_tracker.set_session(session)
        itsm.set_session(session)
        kb_search.set_session(session)
        portal_lookup.set_session(session)

    setup_config = None
    try:
        message = await websocket.receive_text()
        initial_data = json.loads(message)
        if "setup" in initial_data:
            setup_config = initial_data["setup"]
            logger.info("Received setup configuration from client")
    except Exception as e:
        logger.warning(f"Error receiving setup config: {e}")

    async def emit_session_state():
        if session:
            try:
                await websocket.send_json({
                    "type": "session_state",
                    "data": session.generate_call_summary()
                })
            except:
                pass

    audio_input_queue = asyncio.Queue()
    video_input_queue = asyncio.Queue()
    text_input_queue = asyncio.Queue()

    async def audio_output_callback(data):
        await websocket.send_bytes(data)

    async def audio_interrupt_callback():
        pass

    gemini_client = GeminiLive(
        project_id=PROJECT_ID,
        location=LOCATION,
        model=MODEL,
        input_sample_rate=16000
    )

    # Register all pluggable backend tools
    register_all_tools(gemini_client)

    # Merge server-side tool declarations into setup config
    # so Gemini knows about backend-handled tools
    if setup_config:
        if "tools" not in setup_config:
            setup_config["tools"] = {}
        existing_fds = setup_config["tools"].get("function_declarations", [])
        # Add backend tool declarations (avoid duplicates by name)
        existing_names = {fd.get("name") for fd in existing_fds}
        for td in TOOL_DECLARATIONS:
            if td["name"] not in existing_names:
                existing_fds.append(td)
        setup_config["tools"]["function_declarations"] = existing_fds
        logger.info(f"Total tool declarations sent to Gemini: {len(existing_fds)}")

    # Apply language-aware system prompt (server-side augmentation)
    if session and setup_config and session.language != "English":
        from server.prompts import LANGUAGE_INSTRUCTION_TEMPLATE
        lang_suffix = LANGUAGE_INSTRUCTION_TEMPLATE.format(language=session.language)
        si = setup_config.get("system_instruction")
        if isinstance(si, dict):
            # system_instruction is {"parts": [{"text": "..."}]}
            try:
                si["parts"][0]["text"] += lang_suffix
            except (KeyError, IndexError, TypeError):
                pass
        elif isinstance(si, str) and si:
            setup_config["system_instruction"] = si + lang_suffix
        logger.info(f"Applied language instruction: {session.language}")

    # Emit initial session state so frontend tracker shows "Initiation" as active
    if session:
        session.update_checkpoint("initiation", "Capture error details", "active")
        await emit_session_state()

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
                        if isinstance(payload, dict):
                            # Direct image upload: {"type": "image", "data": "<base64>"}
                            if payload.get("type") == "image" and payload.get("data"):
                                image_data = base64.b64decode(payload["data"])
                                await video_input_queue.put(image_data)
                                continue
                            # Screen share frames: {"realtime_input": {"media_chunks": [{"data": "...", "mime_type": "image/jpeg"}]}}
                            if "realtime_input" in payload:
                                chunks = payload["realtime_input"].get("media_chunks", [])
                                for chunk in chunks:
                                    if chunk.get("data") and chunk.get("mime_type", "").startswith("image/"):
                                        try:
                                            image_data = base64.b64decode(chunk["data"])
                                            await video_input_queue.put(image_data)
                                            logger.debug(f"Queued image frame: {len(image_data)} bytes")
                                        except Exception as img_err:
                                            logger.error(f"Error decoding image frame: {img_err}")
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
            audio_interrupt_callback=audio_interrupt_callback,
            setup_config=setup_config
        ):
            if event:
                await websocket.send_json(event)
                # Save transcriptions to session state for download
                sc = event.get("serverContent") if isinstance(event, dict) else None
                if sc and session:
                    inp = sc.get("inputTranscription")
                    if inp and inp.get("text"):
                        session.add_transcript("user", inp["text"])
                    out = sc.get("outputTranscription")
                    if out and out.get("text"):
                        session.add_transcript("model", out["text"])
                # Emit session state after tool events
                if isinstance(event, dict) and event.get("type") in ("tool_call", "tool_result", "server_tool_call"):
                    await emit_session_state()

    try:
        await asyncio.wait_for(run_session(), timeout=SESSION_TIME_LIMIT)
    except asyncio.TimeoutError:
        logger.info("Session time limit reached")
    except Exception as e:
        logger.error(f"Error in Gemini session: {e}", exc_info=True)
    finally:
        end_session(token)
        receive_task.cancel()
        try:
            await websocket.close()
        except:
            pass

@app.get("/api/tickets")
async def get_tickets():
    """Get all ITSM tickets created during sessions."""
    from server.tools.itsm import get_all_tickets
    return {"tickets": get_all_tickets()}

@app.get("/api/session/{token}/summary")
async def get_session_summary(token: str):
    session = get_session(token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return JSONResponse(content=session.generate_call_summary())

@app.get("/api/session/{token}/rca")
async def get_session_rca(token: str):
    session = get_session(token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    rca_text = session.generate_rca()
    return PlainTextResponse(
        content=rca_text,
        headers={"Content-Disposition": f'attachment; filename="resolve-report-{token[:8]}.txt"'}
    )

@app.get("/api/session/{token}/transcript")
async def get_session_transcript(token: str):
    session = get_session(token)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    transcript_text = session.generate_transcript_export()
    return PlainTextResponse(
        content=transcript_text,
        headers={"Content-Disposition": f'attachment; filename="resolve-transcript-{token[:8]}.txt"'}
    )

@app.post("/api/shield")
async def shield_scan(request: Request):
    """Analyze a page screenshot for scam/phishing/fraud indicators.

    Used by the Resolve AI Navigator Chrome extension (Shield Mode).
    """
    from server.tools.shield_analyzer import analyze_page_safety
    try:
        body = await request.json()
        result = await analyze_page_safety(
            screenshot_b64=body.get("screenshot", ""),
            dom_summary=body.get("dom_summary", {}),
            language=body.get("language", "English"),
            page_url=body.get("page_url", ""),
            page_title=body.get("page_title", ""),
        )
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Shield endpoint error: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "threat_level": "safe",
                "summary": f"Analysis error: {str(e)}",
                "threats": [],
                "error": str(e),
            },
        )

@app.post("/api/navigate")
async def navigate_page(request: Request):
    """Analyze a page screenshot via Gemini vision and return UI navigation actions.

    Used by the Resolve AI Navigator Chrome extension.
    """
    from server.tools.ui_navigator import analyze_page_screenshot
    try:
        body = await request.json()
        result = await analyze_page_screenshot(
            screenshot_b64=body.get("screenshot", ""),
            dom_summary=body.get("dom_summary", {}),
            query=body.get("query", "Help me navigate this page"),
            language=body.get("language", "English"),
            page_url=body.get("page_url", ""),
            page_title=body.get("page_title", ""),
        )
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Navigate endpoint error: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "actions": [], "explanation": "Server error"},
        )

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = f"dist/{full_path}"
    if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse("dist/index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
