"""Script generator tool — Gemini interleaved output (text + images).

Uses Gemini 2.0 Flash with response_modalities=["TEXT", "IMAGE"] to produce
a narrated documentary script with inline scene illustrations. Each response
part is classified as narration text or an illustration image, then assembled
into ordered segments.

Ported pattern: genmedia-live interleaved output → ADK FunctionTool.
"""

from __future__ import annotations

import io
import uuid
from pathlib import Path
from typing import Any

from tools.context import ToolContext

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
IMAGES_DIR = OUTPUTS_DIR / "images"
MODEL_ID = "gemini-2.0-flash"
WORDS_PER_MINUTE = 140  # target narration pace (130-150 WPM sweet spot)


def _ensure_dirs() -> None:
    """Create output directories if they do not exist."""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)


def _estimate_duration(text: str) -> float:
    """Estimate speaking duration in seconds from word count."""
    word_count = len(text.split())
    return round((word_count / WORDS_PER_MINUTE) * 60, 1)


# ---------------------------------------------------------------------------
# ADK FunctionTool
# ---------------------------------------------------------------------------

def generate_script(
    topic: str,
    duration_minutes: int,
    style: str,
    focus: str,
    research_context: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Generate a narrated video script with inline scene illustrations.

    Uses Gemini 2.0 Flash with interleaved TEXT + IMAGE output to produce
    a structured documentary script. Each segment contains narration text
    and a matching scene illustration.

    Args:
        topic: The main topic of the video (e.g. "Ancient Roman Colosseum").
        duration_minutes: Target video length in minutes (1-10).
        style: Visual and narrative style — "documentary", "educational",
               "dramatic", "fun", or "cinematic".
        focus: Specific angle or sub-topic to emphasise
               (e.g. "gladiator battles and daily life").
        research_context: Background facts gathered by the researcher agent.
            Include key dates, figures, and interesting angles.
        tool_context: ADK tool context for session state management.

    Returns:
        dict with keys:
            - status: "success" or "error"
            - segment_count: number of segments generated
            - total_duration_seconds: estimated total narration duration
            - segments: list of segment dicts (narration, image_path,
              scene_description, duration_seconds)
    """
    try:
        _ensure_dirs()

        # ----- Build the prompt -----
        target_words = duration_minutes * WORDS_PER_MINUTE
        num_segments = max(3, duration_minutes * 2)  # ~2 segments per minute

        prompt = (
            f"You are a world-class documentary scriptwriter.\n\n"
            f"Create a {duration_minutes}-minute {style} video script about: "
            f"{topic}\n"
            f"Focus on: {focus}\n\n"
            f"RESEARCH CONTEXT (use these facts for accuracy):\n"
            f"{research_context}\n\n"
            f"REQUIREMENTS:\n"
            f"- Write exactly {num_segments} scenes/segments.\n"
            f"- Total narration should be approximately {target_words} words "
            f"(~{WORDS_PER_MINUTE} words per minute).\n"
            f"- For EACH scene, first write the narration paragraph, then "
            f"generate a matching illustration image.\n"
            f"- Before each narration paragraph, write a one-line scene "
            f"description in square brackets, e.g. "
            f"[Scene 1: Aerial view of the Colosseum at sunset]\n"
            f"- Make the narration engaging, vivid, and suitable for "
            f"voiceover.\n"
            f"- Images should be {style} style, high quality, cinematic "
            f"16:9 aspect ratio illustrations.\n"
            f"- End with a strong call-to-action segment.\n\n"
            f"Begin the script now. Alternate between text and image for "
            f"each scene."
        )

        # ----- Call Gemini with interleaved output -----
        from google import genai
        from google.genai import types

        client = genai.Client(vertexai=True)

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        # ----- Parse interleaved response into segments -----
        segments: list[dict[str, Any]] = []
        current_narration = ""
        current_scene_desc = ""

        from PIL import Image

        for part in response.candidates[0].content.parts:
            if part.text:
                text = part.text.strip()
                if not text:
                    continue

                # Extract scene description from [Scene N: ...] markers
                lines = text.split("\n")
                scene_desc_line = ""
                narration_lines = []

                for line in lines:
                    stripped = line.strip()
                    if stripped.startswith("[") and "]" in stripped:
                        # This is a scene description marker
                        scene_desc_line = stripped.strip("[]")
                    else:
                        if stripped:
                            narration_lines.append(stripped)

                if scene_desc_line:
                    current_scene_desc = scene_desc_line

                narration_text = " ".join(narration_lines)
                if narration_text:
                    current_narration += (" " + narration_text).strip()

            elif part.inline_data:
                # Image part — save and create a segment
                image_id = f"scene_{uuid.uuid4().hex[:8]}.png"
                image_path = IMAGES_DIR / image_id

                image = Image.open(io.BytesIO(part.inline_data.data))
                image.save(str(image_path), "PNG")

                # Finalize the current segment
                narration = current_narration.strip()
                if not narration:
                    narration = f"Scene {len(segments) + 1} of {topic}."

                duration = _estimate_duration(narration)

                segments.append({
                    "narration": narration,
                    "image_path": str(image_path),
                    "image_id": image_id,
                    "scene_description": current_scene_desc or f"Scene {len(segments) + 1}",
                    "duration_seconds": duration,
                })

                # Reset accumulators for next segment
                current_narration = ""
                current_scene_desc = ""

        # Handle any trailing narration without a paired image
        trailing = current_narration.strip()
        if trailing and segments:
            # Append to the last segment
            last = segments[-1]
            last["narration"] += " " + trailing
            last["duration_seconds"] = _estimate_duration(last["narration"])
        elif trailing and not segments:
            # No images were generated — create a text-only segment
            segments.append({
                "narration": trailing,
                "image_path": "",
                "image_id": "",
                "scene_description": current_scene_desc or "Introduction",
                "duration_seconds": _estimate_duration(trailing),
            })

        # ----- Store in session state -----
        total_duration = sum(s["duration_seconds"] for s in segments)

        tool_context.state["script_segments"] = segments
        tool_context.state["script_topic"] = topic
        tool_context.state["script_style"] = style

        return {
            "status": "success",
            "segment_count": len(segments),
            "total_duration_seconds": total_duration,
            "segments": segments,
        }

    except Exception as exc:
        return {
            "status": "error",
            "error": str(exc),
            "segment_count": 0,
            "total_duration_seconds": 0,
            "segments": [],
        }
