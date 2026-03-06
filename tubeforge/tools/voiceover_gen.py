"""Voiceover generator tool — Google Cloud Text-to-Speech.

Synthesises narration audio from script text using Cloud TTS with Neural2 or
Studio voices.  Returns a WAV file and word-level timestamps that downstream
tools (subtitles, video assembly) rely on.

New tool for TubeForge (not ported from genmedia-live).
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Any

from tools.context import ToolContext

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
AUDIO_DIR = OUTPUTS_DIR / "audio"
DEFAULT_VOICE = os.environ.get("TTS_DEFAULT_VOICE", "en-US-Neural2-D")
DEFAULT_RATE = float(os.environ.get("TTS_SPEAKING_RATE", "0.95"))


def _ensure_dirs() -> None:
    """Create output directories if they do not exist."""
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# ADK FunctionTool
# ---------------------------------------------------------------------------

def generate_voiceover(
    script_text: str,
    voice_name: str,
    speaking_rate: float,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Generate a voiceover audio file from script narration text.

    Uses Google Cloud Text-to-Speech to synthesise speech with a Neural2 or
    Studio voice.  The output is a LINEAR16 WAV file with word-level
    timestamps for subtitle generation.

    Args:
        script_text: Full narration text to synthesise.  May span multiple
            paragraphs — they will be joined into a single audio file.
        voice_name: Cloud TTS voice identifier, e.g. "en-US-Neural2-D",
            "en-US-Studio-O".  Defaults to env var TTS_DEFAULT_VOICE.
        speaking_rate: Speech speed multiplier (0.5 = half speed, 1.0 =
            normal, 2.0 = double).  Recommended range 0.85 – 1.1.
        tool_context: ADK tool context for session state management.

    Returns:
        dict with keys:
            - status: "success" or "error"
            - voiceover_id: unique identifier for this voiceover
            - audio_path: absolute path to the generated WAV file
            - duration_seconds: total audio duration (estimated from timestamps)
            - word_timestamps: list of {word, start_sec, end_sec} dicts
    """
    try:
        _ensure_dirs()

        from google.cloud import texttospeech

        client = texttospeech.TextToSpeechClient()

        # ----- Build synthesis request -----
        synthesis_input = texttospeech.SynthesisInput(text=script_text)

        voice_params = texttospeech.VoiceSelectionParams(
            language_code=voice_name[:5] if len(voice_name) >= 5 else "en-US",
            name=voice_name or DEFAULT_VOICE,
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
            speaking_rate=speaking_rate or DEFAULT_RATE,
            sample_rate_hertz=24000,
        )

        # Enable word-level timepoints
        request = texttospeech.SynthesizeSpeechRequest(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config,
            enable_time_pointing=[
                texttospeech.SynthesizeSpeechRequest.TimepointType.SSML_MARK,
            ],
        )

        # ----- Synthesise speech -----
        response = client.synthesize_speech(request=request)

        # ----- Save WAV file -----
        voiceover_id = f"voiceover_{uuid.uuid4().hex[:8]}"
        audio_filename = f"{voiceover_id}.wav"
        audio_path = AUDIO_DIR / audio_filename

        with open(audio_path, "wb") as f:
            f.write(response.audio_content)

        # ----- Extract word timestamps -----
        # Cloud TTS returns timepoints for SSML marks.  For plain-text input
        # the timepoints list may be empty.  In that case we estimate from
        # word count and speaking rate.
        word_timestamps: list[dict[str, Any]] = []

        if response.timepoints:
            for tp in response.timepoints:
                word_timestamps.append({
                    "word": tp.mark_name,
                    "start_sec": round(tp.time_seconds, 3),
                })
        else:
            # Estimate timestamps from word count
            words = script_text.split()
            if words:
                effective_rate = speaking_rate or DEFAULT_RATE
                # Average ~150 WPM at rate 1.0
                seconds_per_word = 60.0 / (150.0 * effective_rate)
                current_time = 0.0
                for word in words:
                    word_timestamps.append({
                        "word": word,
                        "start_sec": round(current_time, 3),
                    })
                    current_time += seconds_per_word

        # Estimate total duration
        if word_timestamps:
            last_ts = word_timestamps[-1]["start_sec"]
            # Add ~0.4s for the last word
            duration_seconds = round(last_ts + 0.4, 2)
        else:
            duration_seconds = 0.0

        # ----- Store in session state -----
        tool_context.state["voiceover_id"] = voiceover_id
        tool_context.state["voiceover_path"] = str(audio_path)
        tool_context.state["voiceover_duration"] = duration_seconds
        tool_context.state["word_timestamps"] = word_timestamps

        return {
            "status": "success",
            "voiceover_id": voiceover_id,
            "audio_path": str(audio_path),
            "duration_seconds": duration_seconds,
            "word_timestamps": word_timestamps,
        }

    except Exception as exc:
        return {
            "status": "error",
            "error": str(exc),
            "voiceover_id": "",
            "audio_path": "",
            "duration_seconds": 0.0,
            "word_timestamps": [],
        }
