"""
Shield Analyzer — Gemini Vision-based scam/phishing detection.

Analyzes page screenshots + DOM metadata to detect:
- Fake/impersonation websites (e.g., fake bank, fake government portal)
- Phishing forms collecting credentials
- Scam transaction pages designed to steal money
- Suspicious URLs/domains mimicking legitimate services
- Fake news and misleading content on social media

Domain-agnostic — works on any website.
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


SHIELD_SYSTEM_PROMPT = """\
You are a cybersecurity AI analyst specializing in detecting scams, phishing, \
and fraudulent websites. You analyze screenshots of web pages along with their \
DOM structure to determine if the site is legitimate or potentially dangerous.

Your analysis checks for:

1. **Domain Impersonation**: Is the URL trying to mimic a legitimate website? \
   (e.g., "paypai.com" instead of "paypal.com", "g00gle.com" instead of "google.com")

2. **Phishing Forms**: Does the page have login/payment forms that could steal credentials? \
   Are there signs of fake login pages (mismatched branding, suspicious form targets)?

3. **Scam Indicators**: Fake urgency ("Your account will be locked!"), \
   too-good-to-be-true offers, fake countdown timers, fake trust badges.

4. **Transaction Risk**: Pages asking for payment/banking details on non-HTTPS or \
   suspicious domains. Fake payment processors.

5. **Content Authenticity**: Misinformation, fake news articles, clickbait with \
   no real sources, impersonation of news outlets, unverified viral claims.

6. **AI-Generated Content**: Signs of AI-generated text (repetitive phrasing, \
   generic language), deepfake images, AI-generated reviews or testimonials \
   designed to build false trust.

7. **Visual Cloning**: Is the page visually copying a legitimate service but hosted \
   on a different domain? (e.g., fake banking portal, fake government service)

8. **SSL/Security**: Missing HTTPS on sensitive pages, mixed content warnings.

9. **Spam Indicators**: Excessive pop-ups, redirect chains, fake download buttons, \
   misleading ad placement designed to trick clicks.

Be conservative — flag genuine threats but don't false-positive on legitimate sites. \
If in doubt, mark as "medium" and explain why.
"""

SHIELD_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "threat_level": {
            "type": "STRING",
            "description": "Threat level: safe, low, medium, high, or critical",
        },
        "summary": {
            "type": "STRING",
            "description": "One-line summary of the finding in the user's language",
        },
        "threats": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "List of specific threats detected (2-5 items)",
        },
        "domain_analysis": {
            "type": "STRING",
            "description": "Analysis of the domain/URL legitimacy",
        },
        "impersonating": {
            "type": "STRING",
            "description": "If impersonating, which legitimate service/brand. Empty if not impersonating.",
        },
        "recommendation": {
            "type": "STRING",
            "description": "What the user should do (in their language)",
        },
    },
    "required": ["threat_level", "summary", "threats", "recommendation"],
}


async def analyze_page_safety(
    screenshot_b64: str,
    dom_summary: dict,
    language: str = "English",
    page_url: str = "",
    page_title: str = "",
) -> dict:
    """Analyze a page for scam/phishing/fraud indicators.

    Args:
        screenshot_b64: Base64-encoded JPEG screenshot.
        dom_summary: Dict with url, title, viewport, elements.
        language: Language for response messages.
        page_url: Current page URL.
        page_title: Current page title.

    Returns:
        Dict with threat_level, summary, threats, recommendation.
    """
    try:
        client = _get_client()

        # Build context from DOM
        dom_context = ""
        if dom_summary:
            # Extract form actions, links, and suspicious elements
            forms_and_links = []
            for el in (dom_summary.get("elements") or [])[:80]:
                if el.get("tag") in ("a", "form", "input"):
                    forms_and_links.append({
                        "tag": el["tag"],
                        "type": el.get("type"),
                        "href": el.get("href"),
                        "text": el.get("text", "")[:60],
                        "name": el.get("name"),
                        "placeholder": el.get("placeholder"),
                    })
            if forms_and_links:
                dom_context = f"\n\nKey DOM elements (forms, links, inputs):\n{json.dumps(forms_and_links, indent=2)}"

        user_prompt = (
            f"Analyze this page for scam/phishing/fraud indicators.\n"
            f"URL: {page_url or 'Unknown'}\n"
            f"Title: {page_title or 'Unknown'}\n"
            f"Respond in: {language}"
            f"{dom_context}"
        )

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
                system_instruction=SHIELD_SYSTEM_PROMPT,
                temperature=0.1,  # Low temp for safety analysis
                response_mime_type="application/json",
                response_schema=SHIELD_RESPONSE_SCHEMA,
            ),
        )

        if response.candidates and response.candidates[0].content:
            text = ""
            for part in response.candidates[0].content.parts:
                if part.text:
                    text += part.text

            if text:
                result = json.loads(text)
                return {
                    "threat_level": result.get("threat_level", "safe"),
                    "summary": result.get("summary", ""),
                    "threats": result.get("threats", []),
                    "domain_analysis": result.get("domain_analysis", ""),
                    "impersonating": result.get("impersonating", ""),
                    "recommendation": result.get("recommendation", ""),
                    "success": True,
                }

        return {
            "threat_level": "safe",
            "summary": "Unable to analyze. Proceed with caution.",
            "threats": [],
            "recommendation": "Could not complete analysis.",
            "success": False,
        }

    except Exception as e:
        logger.error(f"Shield analysis error: {e}", exc_info=True)
        return {
            "threat_level": "safe",
            "summary": f"Analysis error: {str(e)}",
            "threats": [],
            "recommendation": "Analysis failed. Exercise normal caution.",
            "success": False,
            "error": str(e),
        }
