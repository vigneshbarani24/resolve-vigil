"""TubeForge ADK Agent definition — single agent with all tools.

Simplified from multi-agent to single agent because:
  1. google_search CAN coexist with FunctionTools (verified)
  2. Sub-agent transfers open extra bidi sessions → resource exhaustion
  3. Matches the proven bidi-demo pattern (single agent, works reliably)
"""

import os
from pathlib import Path

from google.adk.agents import Agent
from google.adk.tools import google_search

from tools.script_generator import generate_script
from tools.voiceover_gen import generate_voiceover
from tools.thumbnail_gen import generate_thumbnail
from tools.broll_gen import generate_broll
from tools.image_editor import edit_image
from tools.video_assembler import assemble_video

# --- Model config ---
AGENT_MODEL = os.environ.get("DEMO_AGENT_MODEL", "gemini-live-2.5-flash-native-audio")

# Load system prompt from file, with fallback
_prompt_path = Path(__file__).parent / "prompts" / "system_prompt.txt"
_system_prompt = (
    _prompt_path.read_text(encoding="utf-8")
    if _prompt_path.exists()
    else "You are Forge, an AI Creative Director for YouTube explainer videos."
)

# --- Single agent: Forge (all tools including google_search) ---
root_agent = Agent(
    name="forge",
    model=AGENT_MODEL,
    description="AI Creative Director for YouTube explainer and documentary videos",
    instruction=_system_prompt,
    tools=[
        google_search,
        generate_script,
        generate_voiceover,
        generate_thumbnail,
        generate_broll,
        edit_image,
        assemble_video,
    ],
)
