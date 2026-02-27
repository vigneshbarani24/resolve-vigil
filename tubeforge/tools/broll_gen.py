"""B-roll video generator tool — Veo 2 via Vertex AI.

Generates short (4/6/8 second) cinematic B-roll clips using Veo 2
(veo-2.0-generate-001) through the google-genai SDK.  The operation is
asynchronous — the tool polls until the video is ready, then downloads
and saves the result.

Ported from genmedia-live video generation pattern → ADK FunctionTool.
"""

from __future__ import annotations

import time
import uuid
from pathlib import Path
from typing import Any

from google.adk.tools import ToolContext

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
VIDEOS_DIR = OUTPUTS_DIR / "videos"
VEO_MODEL = "veo-2.0-generate-001"
POLL_INTERVAL_SECONDS = 10
MAX_POLL_ATTEMPTS = 60  # 10 minutes max wait


def _ensure_dirs() -> None:
    """Create output directories if they do not exist."""
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)


def _normalize_duration(seconds: int) -> int:
    """Normalize requested duration to nearest Veo-supported value (4, 6, 8)."""
    if seconds <= 5:
        return 4
    elif seconds <= 7:
        return 6
    else:
        return 8


# ---------------------------------------------------------------------------
# ADK FunctionTool
# ---------------------------------------------------------------------------

def generate_broll(
    scene_description: str,
    duration_seconds: int,
    style: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Generate a short B-roll video clip using Veo 2.

    Creates a cinematic B-roll clip from a text description.  The video is
    generated asynchronously via Vertex AI — the tool polls for completion
    and then saves the result.

    Args:
        scene_description: Detailed description of the scene to generate,
            e.g. "Aerial slow-motion shot of the Roman Colosseum at golden
            hour, cinematic drone footage".
        duration_seconds: Target clip length in seconds.  Will be normalized
            to the nearest supported value (4, 6, or 8 seconds).
        style: Visual style — "cinematic", "documentary", "dramatic",
            "slow-motion", "timelapse", or "aerial".
        tool_context: ADK tool context for session state management.

    Returns:
        dict with keys:
            - status: "success" or "error"
            - video_id: unique filename for the clip
            - video_path: absolute file path to the saved MP4
            - duration_seconds: actual clip duration
            - generation_time_seconds: how long Veo took to generate
    """
    try:
        _ensure_dirs()

        from google import genai
        from google.genai import types

        client = genai.Client(vertexai=True)

        duration = _normalize_duration(duration_seconds)

        prompt = (
            f"{style} style video: {scene_description}. "
            f"Cinematic quality, smooth camera movement, professional "
            f"lighting, 16:9 aspect ratio."
        )

        video_id = f"broll_{uuid.uuid4().hex[:8]}.mp4"
        video_path = VIDEOS_DIR / video_id

        # ----- Submit video generation request -----
        operation = client.models.generate_videos(
            model=VEO_MODEL,
            prompt=prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio="16:9",
                number_of_videos=1,
                duration_seconds=duration,
                person_generation="allow_adults",
            ),
        )

        # ----- Poll for completion -----
        start_time = time.time()
        poll_count = 0

        while not operation.done:
            if poll_count >= MAX_POLL_ATTEMPTS:
                return {
                    "status": "error",
                    "error": f"Video generation timed out after {MAX_POLL_ATTEMPTS * POLL_INTERVAL_SECONDS}s.",
                    "video_id": "",
                    "video_path": "",
                    "duration_seconds": 0,
                    "generation_time_seconds": 0,
                }

            time.sleep(POLL_INTERVAL_SECONDS)
            operation = client.operations.get(operation)
            poll_count += 1

        generation_time = round(time.time() - start_time, 1)

        # ----- Download the generated video -----
        if not operation.result or not operation.result.generated_videos:
            return {
                "status": "error",
                "error": "Veo returned no video in the result.",
                "video_id": "",
                "video_path": "",
                "duration_seconds": 0,
                "generation_time_seconds": generation_time,
            }

        video_result = operation.result.generated_videos[0]

        # Handle video data — may come as bytes or a GCS URI
        if hasattr(video_result, "video") and video_result.video:
            video_obj = video_result.video

            if hasattr(video_obj, "video_bytes") and video_obj.video_bytes:
                # Direct bytes
                with open(video_path, "wb") as f:
                    f.write(video_obj.video_bytes)

            elif hasattr(video_obj, "uri") and video_obj.uri:
                # GCS URI — download via google.cloud.storage
                _download_from_gcs(video_obj.uri, video_path)

            else:
                return {
                    "status": "error",
                    "error": "Video result has neither bytes nor URI.",
                    "video_id": "",
                    "video_path": "",
                    "duration_seconds": 0,
                    "generation_time_seconds": generation_time,
                }
        else:
            return {
                "status": "error",
                "error": "Unexpected video result structure.",
                "video_id": "",
                "video_path": "",
                "duration_seconds": 0,
                "generation_time_seconds": generation_time,
            }

        # ----- Store in session state -----
        broll_ids = tool_context.state.get("broll_ids", [])
        broll_ids.append({
            "video_id": video_id,
            "video_path": str(video_path),
            "scene_description": scene_description,
            "duration_seconds": duration,
        })
        tool_context.state["broll_ids"] = broll_ids

        return {
            "status": "success",
            "video_id": video_id,
            "video_path": str(video_path),
            "duration_seconds": duration,
            "generation_time_seconds": generation_time,
        }

    except Exception as exc:
        return {
            "status": "error",
            "error": str(exc),
            "video_id": "",
            "video_path": "",
            "duration_seconds": 0,
            "generation_time_seconds": 0,
        }


def _download_from_gcs(gcs_uri: str, local_path: Path) -> None:
    """Download a file from a gs:// URI to a local path.

    Args:
        gcs_uri: Google Cloud Storage URI, e.g. "gs://bucket/path/to/file.mp4".
        local_path: Local filesystem path to save the downloaded file.
    """
    from google.cloud import storage

    # Parse gs://bucket/blob_path
    if not gcs_uri.startswith("gs://"):
        raise ValueError(f"Invalid GCS URI: {gcs_uri}")

    path_without_scheme = gcs_uri[5:]  # Remove "gs://"
    parts = path_without_scheme.split("/", 1)
    bucket_name = parts[0]
    blob_name = parts[1] if len(parts) > 1 else ""

    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.download_to_filename(str(local_path))
