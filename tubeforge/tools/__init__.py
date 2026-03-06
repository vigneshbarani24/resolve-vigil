"""TubeForge tool functions — called by the server-side tool dispatcher.

Each module exposes a single function that takes typed parameters plus
a ToolContext for session state. The dispatcher in app.py maps Gemini
function_call events to these functions.
"""

from tools.script_generator import generate_script
from tools.voiceover_gen import generate_voiceover
from tools.thumbnail_gen import generate_thumbnail
from tools.broll_gen import generate_broll
from tools.image_editor import edit_image
from tools.video_assembler import assemble_video

__all__ = [
    "generate_script",
    "generate_voiceover",
    "generate_thumbnail",
    "generate_broll",
    "edit_image",
    "assemble_video",
]
