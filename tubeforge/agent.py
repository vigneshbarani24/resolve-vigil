"""TubeForge agent config — tool declarations + Live API config.

Exports FunctionDeclaration dicts and LiveConnectConfig for use with
the raw google-genai SDK (no ADK dependency).

Pattern: genmedia-live (Google's official creative media demo).
"""

from __future__ import annotations

import os
from pathlib import Path

from google.genai import types

# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------
MODEL_ID = os.environ.get("DEMO_AGENT_MODEL", "gemini-live-2.5-flash-native-audio")

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
_prompt_path = Path(__file__).parent / "prompts" / "system_prompt.txt"
SYSTEM_PROMPT = (
    _prompt_path.read_text(encoding="utf-8")
    if _prompt_path.exists()
    else "You are Forge, an AI Creative Director for YouTube explainer videos."
)

# ---------------------------------------------------------------------------
# Function declarations (mirrors Python tool signatures minus tool_context)
# ---------------------------------------------------------------------------
FUNCTION_DECLARATIONS = [
    types.FunctionDeclaration(
        name="generate_script",
        description=(
            "Generate a narrated video script with inline scene illustrations. "
            "Uses Gemini interleaved TEXT + IMAGE output to produce segments "
            "with narration text and matching scene images."
        ),
        parameters={
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "Main topic of the video (e.g. 'Ancient Roman Colosseum')",
                },
                "duration_minutes": {
                    "type": "integer",
                    "description": "Target video length in minutes (1-10)",
                },
                "style": {
                    "type": "string",
                    "description": "Visual style: documentary, educational, dramatic, fun, cinematic",
                },
                "focus": {
                    "type": "string",
                    "description": "Specific angle or sub-topic to emphasize",
                },
                "research_context": {
                    "type": "string",
                    "description": "Background facts gathered from research (dates, figures, key details)",
                },
            },
            "required": ["topic", "duration_minutes", "style", "focus", "research_context"],
        },
    ),
    types.FunctionDeclaration(
        name="generate_voiceover",
        description=(
            "Generate voiceover audio from script narration text using "
            "Google Cloud Text-to-Speech. Returns WAV file with word timestamps."
        ),
        parameters={
            "type": "object",
            "properties": {
                "script_text": {
                    "type": "string",
                    "description": "Full narration text to synthesize",
                },
                "voice_name": {
                    "type": "string",
                    "description": "Cloud TTS voice ID (e.g. 'en-US-Neural2-D'). Default: en-US-Neural2-D",
                },
                "speaking_rate": {
                    "type": "number",
                    "description": "Speech speed multiplier (0.5-2.0). Default: 0.95",
                },
            },
            "required": ["script_text"],
        },
    ),
    types.FunctionDeclaration(
        name="generate_thumbnail",
        description=(
            "Generate a 1280x720 YouTube thumbnail using Imagen 3. "
            "Falls back to Gemini 2.0 Flash if Imagen fails."
        ),
        parameters={
            "type": "object",
            "properties": {
                "subject": {
                    "type": "string",
                    "description": "Main subject of the thumbnail",
                },
                "title_text": {
                    "type": "string",
                    "description": "Bold headline text for the thumbnail composition",
                },
                "style": {
                    "type": "string",
                    "description": "Visual style: dramatic, colorful, mysterious, clean, cinematic, bold",
                },
            },
            "required": ["subject", "title_text", "style"],
        },
    ),
    types.FunctionDeclaration(
        name="generate_broll",
        description=(
            "Generate a short B-roll video clip (4-8 seconds) using Veo 2. "
            "Takes 1-5 minutes to generate."
        ),
        parameters={
            "type": "object",
            "properties": {
                "scene_description": {
                    "type": "string",
                    "description": "Detailed description of the scene to generate",
                },
                "duration_seconds": {
                    "type": "integer",
                    "description": "Clip length: 4, 6, or 8 seconds. Default: 6",
                },
                "style": {
                    "type": "string",
                    "description": "Visual style: cinematic, documentary, dramatic, slow-motion, timelapse, aerial",
                },
            },
            "required": ["scene_description", "style"],
        },
    ),
    types.FunctionDeclaration(
        name="edit_image",
        description=(
            "Edit or regenerate an existing image based on a text instruction. "
            "Uses Gemini 2.0 Flash with the original image as input."
        ),
        parameters={
            "type": "object",
            "properties": {
                "image_id": {
                    "type": "string",
                    "description": "Filename of image in outputs/images/ (e.g. 'scene_a1b2c3d4.png')",
                },
                "instruction": {
                    "type": "string",
                    "description": "Natural language edit instruction (e.g. 'Make the sky more dramatic')",
                },
            },
            "required": ["image_id", "instruction"],
        },
    ),
    types.FunctionDeclaration(
        name="assemble_video",
        description=(
            "Assemble the final YouTube video from all generated assets: "
            "scene images (Ken Burns effect) + voiceover audio + optional subtitles."
        ),
        parameters={
            "type": "object",
            "properties": {
                "add_subtitles": {
                    "type": "boolean",
                    "description": "Whether to burn subtitles into the video. Default: true",
                },
                "background_music": {
                    "type": "string",
                    "description": "Path to background music file, or empty string for none",
                },
            },
            "required": [],
        },
    ),
]

# ---------------------------------------------------------------------------
# Tools list — our functions + Google Search grounding
# ---------------------------------------------------------------------------
TOOLS = [
    types.Tool(function_declarations=FUNCTION_DECLARATIONS),
    types.Tool(google_search=types.GoogleSearch()),
]


def build_live_config(
    resumption_handle: str | None = None,
) -> types.LiveConnectConfig:
    """Build LiveConnectConfig for a Gemini Live API session."""
    return types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=SYSTEM_PROMPT,
        tools=TOOLS,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        session_resumption=types.SessionResumptionConfig(handle=resumption_handle),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
            )
        ),
    )
