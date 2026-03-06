"""Image editor tool — Gemini 2.0 Flash with vision + image output.

Edits or regenerates an existing scene image based on a natural language
instruction.  Uses Gemini 2.0 Flash with the original image as input and
response_modalities=["IMAGE"] to produce a modified version.

Ported from genmedia-live image editing pattern → ADK FunctionTool.
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


def _ensure_dirs() -> None:
    """Create output directories if they do not exist."""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# ADK FunctionTool
# ---------------------------------------------------------------------------

def edit_image(
    image_id: str,
    instruction: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Edit or regenerate an existing image based on a text instruction.

    Loads the referenced image from the outputs/images directory and sends
    it to Gemini 2.0 Flash along with the editing instruction.  The model
    returns a modified version of the image which is saved alongside the
    original.

    Args:
        image_id: Filename of the image to edit, located in
            outputs/images/ (e.g. "scene_a1b2c3d4.png" or
            "thumb_e5f6g7h8.png").
        instruction: Natural language edit instruction, e.g.
            "Make the sky more dramatic with orange sunset colors",
            "Add fog and mist in the foreground",
            "Change the style to watercolor painting".
        tool_context: ADK tool context for session state management.

    Returns:
        dict with keys:
            - status: "success" or "error"
            - original_image_id: the input image filename
            - new_image_id: filename of the edited image
            - new_image_path: absolute path to the edited image
            - instruction: the edit instruction that was applied
    """
    try:
        _ensure_dirs()

        # ----- Load the original image -----
        original_path = IMAGES_DIR / image_id

        if not original_path.exists():
            return {
                "status": "error",
                "error": f"Image not found: {image_id}. Check outputs/images/ directory.",
                "original_image_id": image_id,
                "new_image_id": "",
                "new_image_path": "",
                "instruction": instruction,
            }

        original_bytes = original_path.read_bytes()

        # Detect MIME type from extension
        suffix = original_path.suffix.lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
        }
        mime_type = mime_map.get(suffix, "image/png")

        # ----- Call Gemini with image + instruction -----
        from google import genai
        from google.genai import types

        client = genai.Client(vertexai=True)

        # Build multimodal content: original image + edit instruction
        contents = [
            types.Part.from_bytes(data=original_bytes, mime_type=mime_type),
            types.Part.from_text(
                f"Edit this image according to this instruction: {instruction}\n\n"
                f"Maintain the same composition and subject matter. "
                f"Apply the requested changes while keeping the image "
                f"high quality and suitable for a YouTube video."
            ),
        ]

        response = client.models.generate_content(
            model=MODEL_ID,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            ),
        )

        # ----- Extract and save edited image -----
        from PIL import Image

        new_image_id = f"edited_{uuid.uuid4().hex[:8]}.png"
        new_image_path = IMAGES_DIR / new_image_id
        image_saved = False

        for part in response.candidates[0].content.parts:
            if part.inline_data:
                image = Image.open(io.BytesIO(part.inline_data.data))
                image.save(str(new_image_path), "PNG")
                image_saved = True
                break

        if not image_saved:
            return {
                "status": "error",
                "error": "Gemini did not return an image in the response.",
                "original_image_id": image_id,
                "new_image_id": "",
                "new_image_path": "",
                "instruction": instruction,
            }

        # ----- Update session state -----
        # If the edited image was a script segment scene, update the
        # segment's image_path to point to the new version.
        segments = tool_context.state.get("script_segments", [])
        for segment in segments:
            if segment.get("image_id") == image_id:
                segment["image_id"] = new_image_id
                segment["image_path"] = str(new_image_path)
                break
        if segments:
            tool_context.state["script_segments"] = segments

        # If the edited image was the thumbnail, update that too.
        if tool_context.state.get("thumbnail_id") == image_id:
            tool_context.state["thumbnail_id"] = new_image_id
            tool_context.state["thumbnail_path"] = str(new_image_path)

        # Track edit history
        edit_history = tool_context.state.get("edit_history", [])
        edit_history.append({
            "original": image_id,
            "edited": new_image_id,
            "instruction": instruction,
        })
        tool_context.state["edit_history"] = edit_history

        return {
            "status": "success",
            "original_image_id": image_id,
            "new_image_id": new_image_id,
            "new_image_path": str(new_image_path),
            "instruction": instruction,
        }

    except Exception as exc:
        return {
            "status": "error",
            "error": str(exc),
            "original_image_id": image_id,
            "new_image_id": "",
            "new_image_path": "",
            "instruction": instruction,
        }
