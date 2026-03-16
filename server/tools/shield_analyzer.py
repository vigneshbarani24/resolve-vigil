"""
Shield Analyzer (Vigil) — Multi-layer scam/phishing detection.

Three detection layers:
1. Google Web Risk API — checks URL against Google's known phishing/malware database
2. Gemini Vision — analyzes screenshot + DOM for visual impersonation/scam indicators
3. Google Search Grounding — cross-references domain against scam reports on the web

Domain-agnostic — works on any website.
"""
import json
import logging
import os
from urllib.parse import urlparse

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


async def _check_web_risk(page_url: str) -> dict:
    """Check URL against Google Web Risk API for known threats.

    Returns dict with is_threat (bool), threat_types (list), and detail (str).
    Free for 100k lookups/month.
    """
    try:
        from google.cloud import webrisk_v1
        from google.cloud.webrisk_v1 import ThreatType

        client = webrisk_v1.WebRiskServiceClient()

        response = client.search_uris(
            uri=page_url,
            threat_types=[
                ThreatType.SOCIAL_ENGINEERING,
                ThreatType.MALWARE,
                ThreatType.UNWANTED_SOFTWARE,
            ],
        )

        if response.threat:
            threat_names = []
            for threat in response.threat.threat_types:
                name = ThreatType(threat).name
                threat_names.append(name)

            return {
                "is_threat": True,
                "threat_types": threat_names,
                "detail": f"Google Web Risk: URL flagged as {', '.join(threat_names)}",
            }

        return {"is_threat": False, "threat_types": [], "detail": ""}

    except ImportError:
        logger.info("google-cloud-webrisk not installed, skipping Web Risk check")
        return {"is_threat": False, "threat_types": [], "detail": ""}
    except Exception as e:
        logger.warning(f"Web Risk API check failed: {e}")
        return {"is_threat": False, "threat_types": [], "detail": ""}


async def _search_domain_reputation(client, page_url: str, page_title: str = "") -> str:
    """Cross-reference a domain against known scam/phishing reports via Google Search."""
    try:
        # Extract domain from URL
        from urllib.parse import urlparse
        domain = urlparse(page_url).netloc or page_url

        search_query = (
            f'Is "{domain}" a scam or phishing site? '
            f'Check for fraud reports, scam alerts, and legitimacy of this website. '
            f'Page title: {page_title}'
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=search_query,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.1,
            ),
        )

        result_text = ""
        if response.candidates and response.candidates[0].content:
            for part in response.candidates[0].content.parts:
                if part.text:
                    result_text += part.text

        return result_text[:500]  # Cap length

    except Exception as e:
        logger.warning(f"Domain reputation search failed: {e}")
        return ""


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

        # ── Step 0: Google Web Risk API (known threat database) ──
        web_risk_result = await _check_web_risk(page_url) if page_url else {"is_threat": False}

        # ── Step 1: Vision analysis (screenshot + DOM) ──
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SHIELD_SYSTEM_PROMPT,
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=SHIELD_RESPONSE_SCHEMA,
            ),
        )

        vision_result = None
        if response.candidates and response.candidates[0].content:
            text = ""
            for part in response.candidates[0].content.parts:
                if part.text:
                    text += part.text
            if text:
                vision_result = json.loads(text)

        if not vision_result:
            vision_result = {"threat_level": "safe", "summary": "", "threats": [], "recommendation": ""}

        # ── Step 2: Google Search grounding (cross-reference domain) ──
        # Only search if vision found something suspicious or domain is worth checking
        search_context = ""
        if page_url and (vision_result.get("threat_level") in ("medium", "high", "critical") or page_url):
            try:
                search_context = await _search_domain_reputation(client, page_url, page_title)
            except Exception as se:
                logger.warning(f"Shield search grounding failed: {se}")

        # ── Step 3: Merge all layers ──

        # Layer 0: Web Risk API (Google's known threat database)
        if web_risk_result.get("is_threat"):
            vision_result["threat_level"] = "critical"
            vision_result["threats"] = [
                web_risk_result["detail"]
            ] + vision_result.get("threats", [])
            vision_result["summary"] = (
                f"BLOCKED by Google Web Risk: {', '.join(web_risk_result.get('threat_types', []))}"
            )

        # Layer 2: Google Search grounding
        if search_context:
            vision_result["search_intel"] = search_context
            if "scam" in search_context.lower() or "phishing" in search_context.lower() or "fraud" in search_context.lower():
                current = vision_result.get("threat_level", "safe")
                escalation = {"safe": "medium", "low": "medium", "medium": "high"}
                if current in escalation:
                    vision_result["threat_level"] = escalation[current]
                    vision_result["threats"] = vision_result.get("threats", []) + [
                        "Google Search reports scam/fraud activity associated with this domain"
                    ]

        return {
            "threat_level": vision_result.get("threat_level", "safe"),
            "summary": vision_result.get("summary", ""),
            "threats": vision_result.get("threats", []),
            "domain_analysis": vision_result.get("domain_analysis", ""),
            "impersonating": vision_result.get("impersonating", ""),
            "recommendation": vision_result.get("recommendation", ""),
            "search_intel": vision_result.get("search_intel", ""),
            "web_risk": web_risk_result,
            "layers_used": ["web_risk_api", "gemini_vision", "google_search_grounding"],
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
