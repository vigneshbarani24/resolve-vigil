"""Thumbnail generator tool — Imagen 3 via Vertex AI.

Generates a 16:9 YouTube thumbnail (1280x720) using Imagen 3
(imagen-3.0-generate-002) through the google-genai SDK with Vertex AI.
Falls back to Gemini 2.0 Flash with image output if Imagen fails.

Ported from genmedia-live image generation pattern → ADK FunctionTool.
"""

from __future__ import annotations

import io
import uuid
from pathlib import Path
from typing import Any

from google.adk.tools import ToolContext

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
IMAGES_DIR = OUTPUTS_DIR / "images"
IMAGEN_MODEL = "imagen-3.0-generate-002"
GEMINI_FALLBACK_MODEL = "gemini-2.0-flash"


def _ensure_dirs() -> None:
    """Create output directories if they do not exist."""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# ADK FunctionTool
# ---------------------------------------------------------------------------

def generate_thumbnail(
    subject: str,
    title_text: str,
    style: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Generate a 1280x720 YouTube thumbnail using Imagen 3.

    Creates a high-impact, click-worthy thumbnail suitable for YouTube.
    Uses Imagen 3 (imagen-3.0-generate-002) as the primary model with a
    Gemini 2.0 Flash fallback for resilience.

    Args:
        subject: Main subject of the thumbnail, e.g. "ancient Roman
            Colosseum at sunset with dramatic lighting".
        title_text: Bold headline text to conceptually integrate into the
            image composition (Imagen renders the visual, text overlay is
            handled separately if needed).
        style: Visual style for the thumbnail — "dramatic", "colorful",
            "mysterious", "clean", "cinematic", or "bold".
        tool_context: ADK tool context for session state management.

    Returns:
        dict with keys:
            - status: "success" or "error"
            - thumbnail_id: unique filename for the thumbnail
            - thumbnail_path: absolute file path to the saved PNG
            - model_used: which model produced the image
    """
    try:
        _ensure_dirs()

        from google import genai
        from google.genai import types

        client = genai.Client(vertexai=True)

        thumbnail_id = f"thumb_{uuid.uuid4().hex[:8]}.png"
        thumbnail_path = IMAGES_DIR / thumbnail_id

        prompt = (
            f"Professional YouTube thumbnail, {style} style, 16:9 aspect "
            f"ratio, high contrast, eye-catching: {subject}. "
            f"The composition should evoke the theme: \"{title_text}\". "
            f"Cinematic lighting, sharp focus, vibrant colors, ultra high "
            f"quality digital art suitable for a video thumbnail."
        )

        model_used = IMAGEN_MODEL
        image_saved = False

        # ----- Primary: Imagen 3 -----
        try:
            response = client.models.generate_images(
                model=IMAGEN_MODEL,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="16:9",
                ),
            )

            if response.generated_images:
                image_bytes = response.generated_images[0].image.image_bytes
                from PIL import Image

                image = Image.open(io.BytesIO(image_bytes))
                # Ensure exact 1280x720 for YouTube
                image = image.resize((1280, 720), Image.LANCZOS)
                image.save(str(thumbnail_path), "PNG")
                image_saved = True

        except Exception:
            # Imagen failed — fall through to Gemini fallback
            pass

        # ----- Fallback: Gemini 2.0 Flash with image output -----
        if not image_saved:
            model_used = GEMINI_FALLBACK_MODEL
            response = client.models.generate_content(
                model=GEMINI_FALLBACK_MODEL,
                contents=(
                    f"Generate a single image: {prompt}\n\n"
                    f"Output only the image, no text explanation."
                ),
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            )

            from PIL import Image

            for part in response.candidates[0].content.parts:
                if part.inline_data:
                    image = Image.open(io.BytesIO(part.inline_data.data))
                    image = image.resize((1280, 720), Image.LANCZOS)
                    image.save(str(thumbnail_path), "PNG")
                    image_saved = True
                    break

        if not image_saved:
            return {
                "status": "error",
                "error": "Both Imagen 3 and Gemini fallback failed to produce an image.",
                "thumbnail_id": "",
                "thumbnail_path": "",
                "model_used": "",
            }

        # ----- Store in session state -----
        tool_context.state["thumbnail_id"] = thumbnail_id
        tool_context.state["thumbnail_path"] = str(thumbnail_path)

        return {
            "status": "success",
            "thumbnail_id": thumbnail_id,
            "thumbnail_path": str(thumbnail_path),
            "model_used": model_used,
        }

    except Exception as exc:
        return {
            "status": "error",
            "error": str(exc),
            "thumbnail_id": "",
            "thumbnail_path": "",
            "model_used": "",
        }
