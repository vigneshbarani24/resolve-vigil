"""TubeForge ADK Agent definition — multi-agent architecture.

Architecture:
  - researcher (sub-agent): google_search ONLY (ADK limitation: cannot mix with other tools)
  - forge (root_agent): 6 media FunctionTools + transfers to researcher for fact-gathering

Flow: User → Forge → (transfer to Researcher) → back to Forge → media tools
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

# --- Sub-agent: research ONLY ---
# google_search CANNOT coexist with other tools in a single agent.
researcher = Agent(
    name="researcher",
    model="gemini-2.0-flash",
    description=(
        "Research assistant that gathers facts, dates, statistics, and key "
        "information about topics using Google Search. Transfer to this agent "
        "when you need to research a topic before creating video content."
    ),
    instruction=(
        "You are a research assistant. When given a topic, use Google Search to "
        "find key facts, dates, figures, notable events, and interesting angles. "
        "Return a structured summary with:\n"
        "- Key facts (5-10 bullet points)\n"
        "- Important dates and timeline\n"
        "- Notable figures or people involved\n"
        "- Interesting/surprising facts for engagement\n"
        "- Suggested narrative angles\n"
        "Be concise, factual, and cite sources where possible."
    ),
    tools=[google_search],
)

# --- Main agent: Forge (Creative Director) ---
AGENT_MODEL = os.environ.get("DEMO_AGENT_MODEL", "gemini-2.0-flash-live-001")

# Load system prompt from file, with fallback
_prompt_path = Path(__file__).parent / "prompts" / "system_prompt.txt"
_system_prompt = (
    _prompt_path.read_text(encoding="utf-8")
    if _prompt_path.exists()
    else "You are Forge, an AI Creative Director for YouTube explainer videos."
)

root_agent = Agent(
    name="forge",
    model=AGENT_MODEL,
    description="AI Creative Director for YouTube explainer and documentary videos",
    instruction=_system_prompt,
    tools=[
        generate_script,
        generate_voiceover,
        generate_thumbnail,
        generate_broll,
        edit_image,
        assemble_video,
    ],
    sub_agents=[researcher],
)
