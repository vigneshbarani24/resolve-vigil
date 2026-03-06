"""Video assembler tool — FFmpeg pipeline for final video production.

Combines scene images, voiceover audio, optional B-roll clips, and subtitles
into a final YouTube-ready MP4 using FFmpeg.  Applies a Ken Burns effect
(slow zoom/pan) to static images for visual dynamism.

Ported from genmedia-live FFmpeg assembly pattern → ADK FunctionTool.
"""

from __future__ import annotations

import os
import subprocess
import uuid
from pathlib import Path
from typing import Any

from tools.context import ToolContext

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
OUTPUTS_DIR = Path(__file__).parent.parent / "outputs"
IMAGES_DIR = OUTPUTS_DIR / "images"
AUDIO_DIR = OUTPUTS_DIR / "audio"
VIDEOS_DIR = OUTPUTS_DIR / "videos"
FINAL_DIR = OUTPUTS_DIR / "final"
def _get_ffmpeg_path() -> str:
    """Get FFmpeg binary path, trying system PATH first then imageio-ffmpeg."""
    import shutil
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

# Video settings
OUTPUT_WIDTH = 1920
OUTPUT_HEIGHT = 1080
OUTPUT_FPS = 30
VIDEO_CODEC = "libx264"
AUDIO_CODEC = "aac"
CRF = 23  # Constant Rate Factor — lower = better quality


def _ensure_dirs() -> None:
    """Create output directories if they do not exist."""
    FINAL_DIR.mkdir(parents=True, exist_ok=True)
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)


def _run_ffmpeg(args: list[str], description: str) -> tuple[bool, str]:
    """Run an FFmpeg command and return (success, stderr_output).

    Args:
        args: Full command list including 'ffmpeg' as first element.
        description: Human-readable description for error messages.

    Returns:
        Tuple of (success: bool, output: str).
    """
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minute timeout per step
        )
        if result.returncode != 0:
            return False, f"{description} failed: {result.stderr[-500:]}"
        return True, ""
    except subprocess.TimeoutExpired:
        return False, f"{description} timed out after 300s."
    except FileNotFoundError:
        return False, f"FFmpeg not found at '{FFMPEG}'. Install FFmpeg or set FFMPEG_PATH."
    except Exception as exc:
        return False, f"{description} error: {str(exc)}"


def _create_ken_burns_segment(
    image_path: str,
    duration: float,
    output_path: str,
    segment_index: int,
) -> tuple[bool, str]:
    """Create a video segment from a static image with Ken Burns effect.

    Applies a slow zoom-in (1.0x to 1.3x) with centering, producing a
    gentle push-in motion that adds visual interest to static images.

    Args:
        image_path: Path to the source image.
        duration: Segment duration in seconds.
        output_path: Path for the output MP4 segment.
        segment_index: Index for alternating zoom direction.

    Returns:
        Tuple of (success: bool, error_message: str).
    """
    total_frames = int(duration * OUTPUT_FPS)

    # Alternate between zoom-in and zoom-out for visual variety
    if segment_index % 2 == 0:
        # Zoom in (1.0 -> 1.3)
        zoompan_filter = (
            f"zoompan="
            f"z='min(zoom+0.0015,1.3)':"
            f"d={total_frames}:"
            f"x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':"
            f"s={OUTPUT_WIDTH}x{OUTPUT_HEIGHT}:"
            f"fps={OUTPUT_FPS}"
        )
    else:
        # Zoom out (1.3 -> 1.0)
        zoompan_filter = (
            f"zoompan="
            f"z='if(eq(on,1),1.3,max(zoom-0.0015,1.0))':"
            f"d={total_frames}:"
            f"x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':"
            f"s={OUTPUT_WIDTH}x{OUTPUT_HEIGHT}:"
            f"fps={OUTPUT_FPS}"
        )

    args = [
        FFMPEG, "-y",
        "-loop", "1",
        "-i", image_path,
        "-t", str(duration),
        "-vf", zoompan_filter,
        "-c:v", VIDEO_CODEC,
        "-crf", str(CRF),
        "-pix_fmt", "yuv420p",
        "-r", str(OUTPUT_FPS),
        output_path,
    ]

    return _run_ffmpeg(args, f"Ken Burns segment {segment_index}")


def _generate_srt(
    segments: list[dict[str, Any]],
    srt_path: str,
) -> None:
    """Generate an SRT subtitle file from script segments.

    Args:
        segments: List of segment dicts with 'narration' and
            'duration_seconds' keys.
        srt_path: Output path for the .srt file.
    """
    lines: list[str] = []
    current_time = 0.0

    for i, segment in enumerate(segments, 1):
        narration = segment.get("narration", "")
        duration = segment.get("duration_seconds", 5.0)

        start_time = current_time
        end_time = current_time + duration

        # Split narration into subtitle chunks (~12 words each)
        words = narration.split()
        chunk_size = 12
        chunks = [
            " ".join(words[j:j + chunk_size])
            for j in range(0, len(words), chunk_size)
        ]

        if not chunks:
            chunks = [narration]

        chunk_duration = duration / len(chunks) if chunks else duration

        for k, chunk in enumerate(chunks):
            sub_index = len(lines) // 3 + 1  # SRT is 1-indexed
            chunk_start = start_time + (k * chunk_duration)
            chunk_end = chunk_start + chunk_duration

            lines.append(str(sub_index))
            lines.append(
                f"{_format_srt_time(chunk_start)} --> {_format_srt_time(chunk_end)}"
            )
            lines.append(chunk)
            lines.append("")  # Blank line separator

        current_time = end_time

    with open(srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def _format_srt_time(seconds: float) -> str:
    """Format seconds as SRT timestamp: HH:MM:SS,mmm."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


# ---------------------------------------------------------------------------
# ADK FunctionTool
# ---------------------------------------------------------------------------

def assemble_video(
    add_subtitles: bool,
    background_music: str,
    tool_context: ToolContext,
) -> dict[str, Any]:
    """Assemble the final YouTube video from generated assets.

    Reads script segments, voiceover audio, and optionally B-roll clips
    from the session state, then uses FFmpeg to produce a polished MP4
    with Ken Burns effects, narration audio, and optional burned-in
    subtitles.

    Pipeline steps:
        1. Each scene image → video segment with Ken Burns zoom effect
        2. Concatenate all segments into one continuous video
        3. Mix in the voiceover audio track
        4. Optionally burn in SRT subtitles

    Args:
        add_subtitles: Whether to burn subtitles into the video.  Subtitles
            are generated from the script narration segments.
        background_music: Path to a background music file to mix in, or
            empty string "" for no background music.
        tool_context: ADK tool context for session state management.
            Reads: script_segments, voiceover_path, broll_ids.
            Writes: video_url.

    Returns:
        dict with keys:
            - status: "success" or "error"
            - video_path: absolute path to the final MP4
            - video_id: unique filename
            - duration_seconds: total video duration
            - stages_completed: list of pipeline stages that succeeded
    """
    try:
        _ensure_dirs()

        # ----- Read required state -----
        segments = tool_context.state.get("script_segments", [])
        voiceover_path = tool_context.state.get("voiceover_path", "")
        broll_clips = tool_context.state.get("broll_ids", [])

        if not segments:
            return {
                "status": "error",
                "error": "No script segments found in state. Run generate_script first.",
                "video_path": "",
                "video_id": "",
                "duration_seconds": 0,
                "stages_completed": [],
            }

        build_id = uuid.uuid4().hex[:8]
        temp_dir = FINAL_DIR / f"build_{build_id}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        stages_completed: list[str] = []
        segment_files: list[str] = []

        # ----- Stage 1: Create Ken Burns video segments from images -----
        for i, segment in enumerate(segments):
            image_path = segment.get("image_path", "")
            duration = segment.get("duration_seconds", 5.0)

            if not image_path or not Path(image_path).exists():
                # Check if there is a B-roll clip for this segment
                if i < len(broll_clips):
                    broll = broll_clips[i]
                    broll_path = broll.get("video_path", "")
                    if broll_path and Path(broll_path).exists():
                        segment_files.append(broll_path)
                        continue
                # Skip segments without images or B-roll
                continue

            segment_output = str(temp_dir / f"segment_{i:03d}.mp4")
            success, error = _create_ken_burns_segment(
                image_path=image_path,
                duration=duration,
                output_path=segment_output,
                segment_index=i,
            )

            if not success:
                return {
                    "status": "error",
                    "error": f"Stage 1 failed at segment {i}: {error}",
                    "video_path": "",
                    "video_id": "",
                    "duration_seconds": 0,
                    "stages_completed": stages_completed,
                }

            segment_files.append(segment_output)

        if not segment_files:
            return {
                "status": "error",
                "error": "No video segments could be created (no images found).",
                "video_path": "",
                "video_id": "",
                "duration_seconds": 0,
                "stages_completed": stages_completed,
            }

        stages_completed.append("ken_burns_segments")

        # ----- Stage 2: Concatenate all segments -----
        concat_list_path = str(temp_dir / "concat_list.txt")
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for seg_file in segment_files:
                # FFmpeg concat demuxer requires forward slashes or escaped paths
                safe_path = seg_file.replace("\\", "/")
                f.write(f"file '{safe_path}'\n")

        concat_output = str(temp_dir / "concat.mp4")
        success, error = _run_ffmpeg(
            [
                FFMPEG, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_list_path,
                "-c:v", VIDEO_CODEC,
                "-crf", str(CRF),
                "-pix_fmt", "yuv420p",
                concat_output,
            ],
            "Concatenation",
        )

        if not success:
            return {
                "status": "error",
                "error": f"Stage 2 (concat) failed: {error}",
                "video_path": "",
                "video_id": "",
                "duration_seconds": 0,
                "stages_completed": stages_completed,
            }

        stages_completed.append("concatenation")

        # ----- Stage 3: Add voiceover audio -----
        current_video = concat_output

        if voiceover_path and Path(voiceover_path).exists():
            audio_output = str(temp_dir / "with_audio.mp4")
            success, error = _run_ffmpeg(
                [
                    FFMPEG, "-y",
                    "-i", current_video,
                    "-i", voiceover_path,
                    "-c:v", "copy",
                    "-c:a", AUDIO_CODEC,
                    "-b:a", "192k",
                    "-shortest",
                    audio_output,
                ],
                "Audio mixing",
            )

            if not success:
                return {
                    "status": "error",
                    "error": f"Stage 3 (audio) failed: {error}",
                    "video_path": "",
                    "video_id": "",
                    "duration_seconds": 0,
                    "stages_completed": stages_completed,
                }

            current_video = audio_output
            stages_completed.append("voiceover_audio")

        # ----- Stage 3b: Add background music (optional) -----
        if background_music and Path(background_music).exists():
            music_output = str(temp_dir / "with_music.mp4")

            # Mix background music at lower volume (-15dB) under narration
            success, error = _run_ffmpeg(
                [
                    FFMPEG, "-y",
                    "-i", current_video,
                    "-i", background_music,
                    "-filter_complex",
                    "[1:a]volume=0.15[bg];[0:a][bg]amix=inputs=2:duration=first[aout]",
                    "-map", "0:v",
                    "-map", "[aout]",
                    "-c:v", "copy",
                    "-c:a", AUDIO_CODEC,
                    "-b:a", "192k",
                    music_output,
                ],
                "Background music mixing",
            )

            if success:
                current_video = music_output
                stages_completed.append("background_music")
            # If music mixing fails, continue without it (non-critical)

        # ----- Stage 4: Burn in subtitles (optional) -----
        if add_subtitles:
            srt_path = str(temp_dir / "subtitles.srt")
            _generate_srt(segments, srt_path)

            subtitle_output = str(temp_dir / "with_subs.mp4")

            # Escape path separators for FFmpeg subtitle filter
            srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")

            subtitle_filter = (
                f"subtitles='{srt_escaped}':"
                f"force_style='FontName=Arial,FontSize=24,"
                f"PrimaryColour=&HFFFFFF,OutlineColour=&H000000,"
                f"Outline=2,Shadow=1,MarginV=40'"
            )

            success, error = _run_ffmpeg(
                [
                    FFMPEG, "-y",
                    "-i", current_video,
                    "-vf", subtitle_filter,
                    "-c:v", VIDEO_CODEC,
                    "-crf", str(CRF),
                    "-c:a", "copy",
                    subtitle_output,
                ],
                "Subtitle burn-in",
            )

            if success:
                current_video = subtitle_output
                stages_completed.append("subtitles")
            # If subtitle burn fails, continue without them (non-critical)

        # ----- Move final video to outputs/final/ -----
        video_id = f"tubeforge_{build_id}.mp4"
        final_path = FINAL_DIR / video_id

        # Copy (or rename) the final build artifact
        import shutil
        shutil.copy2(current_video, str(final_path))

        # Clean up temp build directory
        try:
            shutil.rmtree(str(temp_dir))
        except Exception:
            pass  # Non-critical cleanup

        # ----- Calculate total duration -----
        total_duration = sum(
            s.get("duration_seconds", 0) for s in segments
        )

        # ----- Store in session state -----
        tool_context.state["video_url"] = str(final_path)
        tool_context.state["video_id"] = video_id

        return {
            "status": "success",
            "video_path": str(final_path),
            "video_id": video_id,
            "duration_seconds": round(total_duration, 1),
            "stages_completed": stages_completed,
        }

    except Exception as exc:
        return {
            "status": "error",
            "error": str(exc),
            "video_path": "",
            "video_id": "",
            "duration_seconds": 0,
            "stages_completed": [],
        }
