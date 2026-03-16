"""
UI Navigator — Gemini Vision-based page analysis tool.

Accepts a screenshot + DOM summary + user query, sends to Gemini 2.5 Flash
for visual understanding, and returns structured navigation actions
(highlight, click, fill, scroll) for the Chrome extension to execute.

This is domain-agnostic — swap prompts via config, not code.
"""
import json
import logging
import os

import google.genai as genai
from google.genai import types

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        project_id = os.getenv("PROJECT_ID", "")
        location = os.getenv("LOCATION", "us-central1")
        _client = genai.Client(vertexai=True, project=project_id, location=location)
    return _client


VISION_SYSTEM_PROMPT = """\
You are an AI UI Navigator for IT helpdesk support. You analyze screenshots of web pages \
and identify which UI elements a user should interact with to accomplish their goal.

Your task:
1. Look at the screenshot carefully
2. Cross-reference with the DOM summary (interactive elements with bounding boxes)
3. Identify the specific elements the user needs to interact with
4. Return a step-by-step action plan

Rules:
- Be precise about which element to interact with
- Use element_index from the DOM summary when possible for accurate targeting
- Use coordinates from the DOM summary bounding rects
- Keep labels short and actionable (e.g., "Click the 'Submit' button")
- For form fields, specify what value to enter
- Respond in the user's language for labels, but keep type/selector in English
"""

RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "actions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "type": {
                        "type": "STRING",
                        "description": "Action type: highlight, click, fill, or scroll",
                    },
                    "label": {
                        "type": "STRING",
                        "description": "Human-readable instruction in the user's language",
                    },
                    "element_index": {
                        "type": "INTEGER",
                        "description": "Index from the DOM summary elements array",
                    },
                    "selector": {
                        "type": "STRING",
                        "description": "CSS selector for the target element",
                    },
                    "coordinates": {
                        "type": "OBJECT",
                        "properties": {
                            "x": {"type": "INTEGER"},
                            "y": {"type": "INTEGER"},
                            "width": {"type": "INTEGER"},
                            "height": {"type": "INTEGER"},
                        },
                    },
                    "value": {
                        "type": "STRING",
                        "description": "Value to fill (for fill actions only)",
                    },
                },
                "required": ["type", "label"],
            },
        },
        "explanation": {
            "type": "STRING",
            "description": "Brief explanation of the guidance in the user's language",
        },
    },
    "required": ["actions", "explanation"],
}


async def analyze_page_screenshot(
    screenshot_b64: str,
    dom_summary: dict,
    query: str,
    language: str = "English",
    page_url: str = "",
    page_title: str = "",
) -> dict:
    """Analyze a page screenshot with Gemini vision and return UI actions.

    Args:
        screenshot_b64: Base64-encoded JPEG screenshot of the page.
        dom_summary: Dict with url, title, viewport, and elements (interactive DOM nodes).
        query: User's question or goal description.
        language: Language for response labels (default English).
        page_url: Current page URL.
        page_title: Current page title.

    Returns:
        Dict with 'actions' list and 'explanation' string.
    """
    try:
        client = _get_client()

        # Build the user prompt
        dom_context = ""
        if dom_summary and dom_summary.get("elements"):
            elements_text = json.dumps(dom_summary["elements"][:100], indent=2)
            dom_context = f"\n\nDOM Interactive Elements:\n{elements_text}"

        user_prompt = (
            f"Page: {page_title or 'Unknown'} ({page_url or 'N/A'})\n"
            f"User's question ({language}): {query}\n"
            f"Respond in: {language}"
            f"{dom_context}"
        )

        # Build multimodal content: image + text
        import base64
        image_bytes = base64.b64decode(screenshot_b64)

        contents = [
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            types.Part.from_text(text=user_prompt),
        ]

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=VISION_SYSTEM_PROMPT,
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=RESPONSE_SCHEMA,
            ),
        )

        # Parse structured response
        if response.candidates and response.candidates[0].content:
            text = ""
            for part in response.candidates[0].content.parts:
                if part.text:
                    text += part.text

            if text:
                result = json.loads(text)
                return {
                    "actions": result.get("actions", []),
                    "explanation": result.get("explanation", ""),
                    "success": True,
                }

        return {
            "actions": [],
            "explanation": "Could not analyze the page. Please try again.",
            "success": False,
        }

    except Exception as e:
        logger.error(f"UI Navigator vision error: {e}", exc_info=True)
        return {
            "actions": [],
            "explanation": f"Analysis failed: {str(e)}",
            "success": False,
            "error": str(e),
        }


# Tool declaration for Gemini Live session integration
# (Theepa can call this during voice sessions to guide users visually)
UI_NAVIGATOR_DECLARATIONS = [
    {
        "name": "navigate_user_browser",
        "description": (
            "Analyze the user's current browser page and provide visual navigation guidance. "
            "Call this when the user needs help finding a button, form field, or section on a web page. "
            "Returns step-by-step actions that will be highlighted on the user's screen."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "guidance": {
                    "type": "STRING",
                    "description": "What to help the user find or do on the page — e.g. 'Find the upload documents button' or 'Highlight the OTP input field'",
                },
            },
            "required": ["guidance"],
        },
    }
]


def navigate_user_browser(guidance: str) -> str:
    """Placeholder for Live session integration.

    During a voice session, Theepa can call this tool to trigger the extension
    to capture + analyze the page. The actual analysis happens via the REST
    endpoint; this tool returns a message indicating the guidance was sent.
    """
    return json.dumps({
        "success": True,
        "message": f"Visual guidance request sent to browser extension: {guidance}",
        "guidance": guidance,
    })
