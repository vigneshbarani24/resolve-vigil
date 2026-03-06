"""YouTube Shorts Creator tools — all 5 tools in one file.

Tools:
1. research_topic — Google Search grounding via Gemini
2. generate_storyboard — Gemini 2.5 Flash with interleaved TEXT+IMAGE
3. generate_clip — Veo 2 vertical video generation
4. generate_voiceover — Google Cloud TTS
5. assemble_short — FFmpeg pipeline for vertical video assembly
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
IMAGES_DIR = OUTPUTS_DIR / "images"
VIDEOS_DIR = OUTPUTS_DIR / "videos"
AUDIO_DIR = OUTPUTS_DIR / "audio"
FINAL_DIR = OUTPUTS_DIR / "final"

# Vertical Short dimensions
OUTPUT_WIDTH = 1080
OUTPUT_HEIGHT = 1920
OUTPUT_FPS = 30

# Session state (simple in-memory store per session)
_session_state: dict[str, Any] = {}


def _ensure_dirs():
    for d in [IMAGES_DIR, VIDEOS_DIR, AUDIO_DIR, FINAL_DIR]:
        d.mkdir(parents=True, exist_ok=True)


def _get_ffmpeg_path() -> str:
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    return "ffmpeg"


FFMPEG = os.environ.get("FFMPEG_PATH", _get_ffmpeg_path())


# ===================================================================
# Tool 1: research_topic
# ===================================================================
def research_topic(topic: str, style: str = "educational") -> dict[str, Any]:
    """Research a topic using Gemini with Google Search grounding."""
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(vertexai=True)

        prompt = (
            f"Research the following topic for a 60-second YouTube Short:\n"
            f"Topic: {topic}\n"
            f"Style: {style}\n\n"
            f"Provide:\n"
            f"1. 5-7 key facts (surprising, little-known facts work best)\n"
            f"2. A hook statement (attention-grabbing first line)\n"
            f"3. A suggested narrative arc for 60 seconds\n"
            f"4. Target audience insights\n"
            f"Keep it concise and punchy — this is for a Short, not a documentary."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )

        research_text = response.text if response.text else "No research results found."

        _session_state["research"] = research_text
        _session_state["topic"] = topic
        _session_state["style"] = style

        return {
            "status": "success",
            "research": research_text,
        }
    except Exception as exc:
        logger.error(f"research_topic failed: {exc}")
        return {"status": "error", "error": str(exc), "research": ""}


# ===================================================================
# Tool 2: generate_storyboard
# ===================================================================
def generate_storyboard(
    topic: str,
    research: str,
    num_scenes: int = 5,
    style: str = "cinematic",
) -> dict[str, Any]:
    """Generate storyboard with interleaved narration text + scene images."""
    try:
        _ensure_dirs()

        from google import genai
        from google.genai import types

        client = genai.Client(vertexai=True)

        prompt = (
            f"You are a YouTube Shorts storyboard artist.\n\n"
            f"Create a {num_scenes}-scene storyboard for a 60-second vertical Short about: {topic}\n"
            f"Style: {style}\n\n"
            f"RESEARCH CONTEXT:\n{research}\n\n"
            f"REQUIREMENTS:\n"
            f"- Write exactly {num_scenes} scenes\n"
            f"- For EACH scene:\n"
            f"  1. Write [Scene N: brief description] as a header\n"
            f"  2. Write the voiceover narration (2-3 sentences, punchy)\n"
            f"  3. Generate a matching illustration image (vertical 9:16 composition)\n"
            f"- Scene 1 MUST start with a hook (surprising fact or bold statement)\n"
            f"- Last scene should have a call-to-action\n"
            f"- Total narration across all scenes should be ~150 words (60 sec at 150 WPM)\n"
            f"- Images should be {style} style, vertical composition, high quality\n\n"
            f"Begin now. Alternate text then image for each scene."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-preview-05-20",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["TEXT", "IMAGE"],
            ),
        )

        # Parse interleaved response
        segments: list[dict[str, Any]] = []
        current_narration = ""
        current_scene_desc = ""

        from PIL import Image

        for part in response.candidates[0].content.parts:
            if part.text:
                text = part.text.strip()
                if not text:
                    continue

                lines = text.split("\n")
                narration_lines = []

                for line in lines:
                    stripped = line.strip()
                    if stripped.startswith("[") and "]" in stripped:
                        current_scene_desc = stripped.strip("[]")
                    elif stripped:
                        narration_lines.append(stripped)

                narration_text = " ".join(narration_lines)
                if narration_text:
                    current_narration += (" " + narration_text).strip()

            elif part.inline_data:
                image_id = f"scene_{uuid.uuid4().hex[:8]}.png"
                image_path = IMAGES_DIR / image_id

                image = Image.open(io.BytesIO(part.inline_data.data))
                image.save(str(image_path), "PNG")

                # Also create base64 for frontend preview
                img_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")

                narration = current_narration.strip()
                if not narration:
                    narration = f"Scene {len(segments) + 1} of {topic}."

                word_count = len(narration.split())
                duration = round((word_count / 150) * 60, 1)
                duration = max(4.0, min(duration, 12.0))

                segments.append({
                    "narration": narration,
                    "image_path": str(image_path),
                    "image_id": image_id,
                    "image_base64": img_b64,
                    "scene_description": current_scene_desc or f"Scene {len(segments) + 1}",
                    "duration_seconds": duration,
                })

                current_narration = ""
                current_scene_desc = ""

        # Handle trailing narration
        trailing = current_narration.strip()
        if trailing and segments:
            last = segments[-1]
            last["narration"] += " " + trailing
            word_count = len(last["narration"].split())
            last["duration_seconds"] = round((word_count / 150) * 60, 1)

        _session_state["storyboard"] = segments

        return {
            "status": "success",
            "segment_count": len(segments),
            "segments": segments,
        }

    except Exception as exc:
        logger.error(f"generate_storyboard failed: {exc}")
        return {"status": "error", "error": str(exc), "segment_count": 0, "segments": []}


# ===================================================================
# Tool 3: generate_clip
# ===================================================================
def generate_clip(
    scene_description: str,
    duration: int = 6,
) -> dict[str, Any]:
    """Generate a vertical video clip using Veo 2."""
    try:
        _ensure_dirs()

        from google import genai
        from google.genai import types

        client = genai.Client(vertexai=True)

        # Normalize duration
        if duration <= 5:
            duration = 4
        elif duration <= 7:
            duration = 6
        else:
            duration = 8

        prompt = (
            f"Cinematic vertical video: {scene_description}. "
            f"Smooth camera movement, professional lighting, 9:16 vertical format."
        )

        video_id = f"clip_{uuid.uuid4().hex[:8]}.mp4"
        video_path = VIDEOS_DIR / video_id

        operation = client.models.generate_videos(
            model="veo-2.0-generate-001",
            prompt=prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio="9:16",
                number_of_videos=1,
                duration_seconds=duration,
                person_generation="allow_adults",
            ),
        )

        # Poll for completion
        start_time = time.time()
        poll_count = 0
        max_polls = 60

        while not operation.done:
            if poll_count >= max_polls:
                return {
                    "status": "error",
                    "error": "Video generation timed out.",
                    "video_path": "",
                    "clip_id": "",
                }
            time.sleep(10)
            operation = client.operations.get(operation)
            poll_count += 1

        gen_time = round(time.time() - start_time, 1)

        if not operation.result or not operation.result.generated_videos:
            return {
                "status": "error",
                "error": "Veo returned no video.",
                "video_path": "",
                "clip_id": "",
            }

        video_result = operation.result.generated_videos[0]

        if hasattr(video_result, "video") and video_result.video:
            video_obj = video_result.video
            if hasattr(video_obj, "video_bytes") and video_obj.video_bytes:
                with open(video_path, "wb") as f:
                    f.write(video_obj.video_bytes)
            elif hasattr(video_obj, "uri") and video_obj.uri:
                _download_from_gcs(video_obj.uri, video_path)
            else:
                return {"status": "error", "error": "No video data in result.", "video_path": "", "clip_id": ""}
        else:
            return {"status": "error", "error": "Unexpected video result.", "video_path": "", "clip_id": ""}

        # Track clips in session
        clips = _session_state.get("clips", [])
        clips.append({
            "clip_id": video_id,
            "video_path": str(video_path),
            "scene_description": scene_description,
            "duration_seconds": duration,
        })
        _session_state["clips"] = clips

        return {
            "status": "success",
            "clip_id": video_id,
            "video_path": str(video_path),
            "duration_seconds": duration,
            "generation_time_seconds": gen_time,
        }

    except Exception as exc:
        logger.error(f"generate_clip failed: {exc}")
        return {"status": "error", "error": str(exc), "video_path": "", "clip_id": ""}


def _download_from_gcs(gcs_uri: str, local_path: Path):
    from google.cloud import storage
    if not gcs_uri.startswith("gs://"):
        raise ValueError(f"Invalid GCS URI: {gcs_uri}")
    path_without_scheme = gcs_uri[5:]
    parts = path_without_scheme.split("/", 1)
    bucket_name = parts[0]
    blob_name = parts[1] if len(parts) > 1 else ""
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.download_to_filename(str(local_path))


# ===================================================================
# Tool 4: generate_voiceover
# ===================================================================
def generate_voiceover(
    narration_text: str,
    voice_name: str = "",
) -> dict[str, Any]:
    """Generate voiceover audio using Google Cloud TTS."""
    try:
        _ensure_dirs()

        from google.cloud import texttospeech

        voice_name = voice_name or os.environ.get("TTS_DEFAULT_VOICE", "en-US-Neural2-D")
        speaking_rate = float(os.environ.get("TTS_SPEAKING_RATE", "0.95"))

        client = texttospeech.TextToSpeechClient()

        synthesis_input = texttospeech.SynthesisInput(text=narration_text)

        voice_params = texttospeech.VoiceSelectionParams(
            language_code=voice_name[:5] if len(voice_name) >= 5 else "en-US",
            name=voice_name,
        )

        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
            speaking_rate=speaking_rate,
            sample_rate_hertz=24000,
        )

        response = client.synthesize_speech(
            input=synthesis_input,
            voice=voice_params,
            audio_config=audio_config,
        )

        voiceover_id = f"voiceover_{uuid.uuid4().hex[:8]}"
        audio_path = AUDIO_DIR / f"{voiceover_id}.wav"

        with open(audio_path, "wb") as f:
            f.write(response.audio_content)

        # Estimate duration from word count
        words = narration_text.split()
        duration_seconds = round(len(words) / (150 * speaking_rate) * 60, 2)

        # Estimate word timestamps
        word_timestamps = []
        seconds_per_word = 60.0 / (150.0 * speaking_rate)
        current_time = 0.0
        for word in words:
            word_timestamps.append({"word": word, "start_sec": round(current_time, 3)})
            current_time += seconds_per_word

        _session_state["voiceover_id"] = voiceover_id
        _session_state["voiceover_path"] = str(audio_path)
        _session_state["voiceover_duration"] = duration_seconds
        _session_state["word_timestamps"] = word_timestamps

        return {
            "status": "success",
            "voiceover_id": voiceover_id,
            "audio_path": str(audio_path),
            "duration_seconds": duration_seconds,
        }

    except Exception as exc:
        logger.error(f"generate_voiceover failed: {exc}")
        return {"status": "error", "error": str(exc), "audio_path": ""}


# ===================================================================
# Tool 5: assemble_short
# ===================================================================
def assemble_short(title: str = "short") -> dict[str, Any]:
    """Assemble the final vertical YouTube Short MP4."""
    try:
        _ensure_dirs()

        segments = _session_state.get("storyboard", [])
        clips = _session_state.get("clips", [])
        voiceover_path = _session_state.get("voiceover_path", "")

        if not segments and not clips:
            return {"status": "error", "error": "No storyboard or clips found. Generate content first."}

        build_id = uuid.uuid4().hex[:8]
        temp_dir = FINAL_DIR / f"build_{build_id}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        segment_files: list[str] = []

        # Use Veo clips if available, otherwise Ken Burns from images
        for i, segment in enumerate(segments):
            # Check for a matching clip
            if i < len(clips):
                clip_path = clips[i].get("video_path", "")
                if clip_path and Path(clip_path).exists():
                    segment_files.append(clip_path)
                    continue

            # Fall back to Ken Burns from image
            image_path = segment.get("image_path", "")
            if image_path and Path(image_path).exists():
                seg_output = str(temp_dir / f"segment_{i:03d}.mp4")
                duration = segment.get("duration_seconds", 6.0)
                success, error = _create_ken_burns_segment(image_path, duration, seg_output, i)
                if success:
                    segment_files.append(seg_output)

        if not segment_files:
            return {"status": "error", "error": "No video segments could be created."}

        # Concatenate
        concat_list = str(temp_dir / "concat.txt")
        with open(concat_list, "w", encoding="utf-8") as f:
            for sf in segment_files:
                safe = sf.replace("\\", "/")
                f.write(f"file '{safe}'\n")

        concat_out = str(temp_dir / "concat.mp4")
        success, error = _run_ffmpeg([
            FFMPEG, "-y", "-f", "concat", "-safe", "0",
            "-i", concat_list,
            "-c:v", "libx264", "-crf", "23", "-pix_fmt", "yuv420p",
            concat_out,
        ], "Concatenation")

        if not success:
            return {"status": "error", "error": f"Concat failed: {error}"}

        current_video = concat_out

        # Add voiceover
        if voiceover_path and Path(voiceover_path).exists():
            audio_out = str(temp_dir / "with_audio.mp4")
            success, error = _run_ffmpeg([
                FFMPEG, "-y",
                "-i", current_video, "-i", voiceover_path,
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                audio_out,
            ], "Audio mixing")
            if success:
                current_video = audio_out

        # Burn subtitles
        srt_path = str(temp_dir / "subtitles.srt")
        _generate_srt(segments, srt_path)

        sub_out = str(temp_dir / "with_subs.mp4")
        srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
        sub_filter = (
            f"subtitles='{srt_escaped}':"
            f"force_style='FontName=Arial,FontSize=28,"
            f"PrimaryColour=&HFFFFFF,OutlineColour=&H000000,"
            f"Outline=2,Shadow=1,MarginV=60,Alignment=2'"
        )
        success, error = _run_ffmpeg([
            FFMPEG, "-y", "-i", current_video,
            "-vf", sub_filter,
            "-c:v", "libx264", "-crf", "23", "-c:a", "copy",
            sub_out,
        ], "Subtitle burn")
        if success:
            current_video = sub_out

        # Move to final
        safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip()[:50]
        video_id = f"{safe_title}_{build_id}.mp4"
        final_path = FINAL_DIR / video_id
        shutil.copy2(current_video, str(final_path))

        # Cleanup temp
        try:
            shutil.rmtree(str(temp_dir))
        except Exception:
            pass

        total_duration = sum(s.get("duration_seconds", 0) for s in segments)

        _session_state["final_video_path"] = str(final_path)
        _session_state["final_video_id"] = video_id

        return {
            "status": "success",
            "video_path": str(final_path),
            "video_id": video_id,
            "duration_seconds": round(total_duration, 1),
        }

    except Exception as exc:
        logger.error(f"assemble_short failed: {exc}")
        return {"status": "error", "error": str(exc)}


# ===================================================================
# FFmpeg helpers
# ===================================================================
def _run_ffmpeg(args: list[str], description: str) -> tuple[bool, str]:
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            return False, f"{description} failed: {result.stderr[-500:]}"
        return True, ""
    except subprocess.TimeoutExpired:
        return False, f"{description} timed out."
    except FileNotFoundError:
        return False, f"FFmpeg not found at '{FFMPEG}'."
    except Exception as exc:
        return False, f"{description} error: {exc}"


def _create_ken_burns_segment(
    image_path: str, duration: float, output_path: str, index: int
) -> tuple[bool, str]:
    total_frames = int(duration * OUTPUT_FPS)

    if index % 2 == 0:
        zoompan = (
            f"zoompan=z='min(zoom+0.0015,1.3)':d={total_frames}:"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"s={OUTPUT_WIDTH}x{OUTPUT_HEIGHT}:fps={OUTPUT_FPS}"
        )
    else:
        zoompan = (
            f"zoompan=z='if(eq(on,1),1.3,max(zoom-0.0015,1.0))':d={total_frames}:"
            f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
            f"s={OUTPUT_WIDTH}x{OUTPUT_HEIGHT}:fps={OUTPUT_FPS}"
        )

    return _run_ffmpeg([
        FFMPEG, "-y", "-loop", "1", "-i", image_path,
        "-t", str(duration), "-vf", zoompan,
        "-c:v", "libx264", "-crf", "23", "-pix_fmt", "yuv420p",
        "-r", str(OUTPUT_FPS), output_path,
    ], f"Ken Burns segment {index}")


def _generate_srt(segments: list[dict], srt_path: str):
    lines: list[str] = []
    current_time = 0.0

    for segment in segments:
        narration = segment.get("narration", "")
        duration = segment.get("duration_seconds", 5.0)

        words = narration.split()
        chunk_size = 8  # Shorter chunks for vertical Shorts
        chunks = [" ".join(words[j:j + chunk_size]) for j in range(0, len(words), chunk_size)]
        if not chunks:
            chunks = [narration]

        chunk_duration = duration / len(chunks) if chunks else duration

        for k, chunk in enumerate(chunks):
            sub_index = len(lines) // 3 + 1
            chunk_start = current_time + (k * chunk_duration)
            chunk_end = chunk_start + chunk_duration

            lines.append(str(sub_index))
            lines.append(f"{_fmt_srt(chunk_start)} --> {_fmt_srt(chunk_end)}")
            lines.append(chunk)
            lines.append("")

        current_time += duration

    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def _fmt_srt(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
