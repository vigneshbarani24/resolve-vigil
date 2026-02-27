"""TubeForge tool functions — ADK FunctionTools auto-wrapped from Python functions.

Each module exposes a single function that ADK auto-wraps into a FunctionTool
based on type hints and docstrings. Import them in agent.py to register with
the root_agent.
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
