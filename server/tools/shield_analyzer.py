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
You are a cybersecurity AI analyst. Your job is to protect users from REAL threats \
like scams, phishing, and fraud — while NEVER crying wolf on legitimate websites.

## DEFAULT STANCE: SAFE
Most websites are legitimate. Your default verdict is "safe" unless you find \
CONCRETE, SPECIFIC evidence of malicious intent. Vague suspicions are NOT enough.

## LEGITIMATE SITES — DO NOT FLAG:
- Well-known services: Google, YouTube, GitHub, Amazon, Facebook, Twitter/X, \
  LinkedIn, Reddit, Wikipedia, Microsoft, Apple, Netflix, Spotify, StackOverflow, \
  medium.com, substack.com, dev.to, etc.
- Sites on their official/expected domain (google.com, github.com, amazon.co.uk, etc.)
- Login forms on HTTPS with matching domain branding — this is NORMAL behavior
- Cookie consent banners, newsletter popups, notification requests — these are NORMAL
- Sites with ads — ads alone are NOT a threat indicator
- News sites, blogs, forums, documentation sites — content sites are generally safe
- Government sites (.gov, .gov.uk, etc.) on their official domains

## ONLY FLAG when you find CLEAR evidence of:
1. **Domain Impersonation**: URL deliberately mimics another (e.g., "paypai.com", "g00gle.com") — \
   NOT just any unfamiliar domain
2. **Credential Theft**: Login form posting to a DIFFERENT domain than the page, \
   or a page impersonating a known brand's login on the wrong domain
3. **Active Scam**: Fake urgency ("Account locked in 24h!"), too-good-to-be-true \
   prizes/giveaways, fake countdown timers, advance-fee fraud
4. **Payment Fraud**: Payment forms on non-HTTPS, or fake payment processors
5. **Visual Cloning**: Page is a near-exact copy of a known brand but on a suspicious domain
6. **Malware Distribution**: Fake download buttons, drive-by downloads, deceptive software offers

## SEVERITY GUIDE:
- **safe**: No threats found. This is where MOST sites should land.
- **low**: Minor observation worth noting but not actionable (e.g., self-signed cert on internal tool)
- **medium**: ONLY if there is specific suspicious evidence that needs user awareness
- **high**: ONLY if there is strong evidence of active phishing/scam/fraud attempt
- **critical**: ONLY if Google Web Risk API confirms it, or there is overwhelming evidence

## RULES:
- When in doubt, mark "safe" with an explanation — NOT "medium"
- An unfamiliar domain is NOT suspicious by itself — millions of legitimate sites exist
- Having login forms, payment forms, or popups is NORMAL website behavior
- Each finding MUST cite specific evidence (exact URL, DOM element, visual element)
- NEVER flag a site just because you don't recognize the brand
- If the domain matches the brand shown on page and uses HTTPS → it's almost certainly safe
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
        "findings": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "category": {
                        "type": "STRING",
                        "description": "Category: domain, phishing, scam, transaction, content, ai_generated, visual_clone, ssl, spam",
                    },
                    "severity": {
                        "type": "STRING",
                        "description": "Severity: safe, low, medium, high, critical",
                    },
                    "detail": {
                        "type": "STRING",
                        "description": "Detailed explanation of what was found and why it matters, citing specific evidence from the page",
                    },
                    "evidence": {
                        "type": "STRING",
                        "description": "Specific observed evidence: exact text, URL, DOM element, or visual element that led to this finding",
                    },
                },
                "required": ["category", "severity", "detail", "evidence"],
            },
            "description": "List of findings with evidence and reasoning (1-8 items)",
        },
        "threats": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
            "description": "Short list of threat labels for quick display (2-5 items)",
        },
        "domain_analysis": {
            "type": "STRING",
            "description": "Analysis of the domain/URL legitimacy with reasoning",
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
    "required": ["threat_level", "summary", "findings", "threats", "recommendation"],
}


def _analyze_domain_osint(page_url: str) -> dict:
    """OSINT-style domain analysis — no external API calls, pure heuristics.

    Checks domain characteristics that indicate legitimacy or suspicion:
    - TLD reputation (known good vs suspicious)
    - Domain length and character patterns
    - Subdomain depth
    - Lookalike/typosquatting detection
    - Known brand impersonation
    """
    result = {
        "score": 100,  # Start at 100 (trustworthy), deduct for red flags
        "flags": [],
        "domain": "",
        "tld": "",
        "is_ip": False,
        "subdomain_depth": 0,
    }

    try:
        parsed = urlparse(page_url)
        hostname = (parsed.netloc or "").lower().split(":")[0]  # Strip port
        result["domain"] = hostname

        if not hostname:
            return result

        # Check if IP address instead of domain
        import re
        if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', hostname):
            result["is_ip"] = True
            result["score"] -= 30
            result["flags"].append("IP address instead of domain name")
            return result

        parts = hostname.split(".")
        tld = parts[-1] if parts else ""
        result["tld"] = tld

        # Subdomain depth (example.com = 0, sub.example.com = 1)
        # For known 2-part TLDs like co.uk, adjust
        two_part_tlds = {"co.uk", "com.au", "co.in", "org.uk", "co.za", "com.br", "co.jp"}
        sld = ".".join(parts[-2:])
        if sld in two_part_tlds:
            result["subdomain_depth"] = max(0, len(parts) - 3)
        else:
            result["subdomain_depth"] = max(0, len(parts) - 2)

        if result["subdomain_depth"] >= 3:
            result["score"] -= 15
            result["flags"].append(f"Deep subdomain nesting ({result['subdomain_depth']} levels)")

        # Suspicious TLDs (commonly abused)
        suspicious_tlds = {"tk", "ml", "ga", "cf", "gq", "xyz", "top", "club", "buzz", "surf",
                           "icu", "cam", "rest", "monster", "click", "link", "work"}
        if tld in suspicious_tlds:
            result["score"] -= 20
            result["flags"].append(f"Suspicious TLD: .{tld} (commonly abused)")

        # Trusted TLDs
        trusted_tlds = {"gov", "edu", "mil", "int"}
        if tld in trusted_tlds:
            result["score"] += 10
            result["flags"].append(f"Trusted TLD: .{tld}")

        # Well-known domains (never flag these)
        known_safe = {
            "google.com", "youtube.com", "github.com", "amazon.com", "microsoft.com",
            "apple.com", "facebook.com", "twitter.com", "x.com", "linkedin.com",
            "reddit.com", "wikipedia.org", "stackoverflow.com", "medium.com",
            "netflix.com", "spotify.com", "bbc.co.uk", "bbc.com", "cnn.com",
            "nytimes.com", "theguardian.com", "aws.amazon.com", "cloud.google.com",
            "portal.azure.com", "dev.to", "npmjs.com", "pypi.org",
        }
        base_domain = ".".join(parts[-2:]) if len(parts) >= 2 else hostname
        if base_domain in known_safe or hostname in known_safe:
            result["score"] = 100
            result["flags"] = [f"Known trusted domain: {base_domain}"]
            return result

        # Domain length (very long = suspicious)
        domain_name = parts[-2] if len(parts) >= 2 else parts[0]
        if len(domain_name) > 25:
            result["score"] -= 10
            result["flags"].append(f"Unusually long domain name ({len(domain_name)} chars)")

        # Excessive hyphens (phishing pattern)
        if domain_name.count("-") >= 3:
            result["score"] -= 15
            result["flags"].append(f"Excessive hyphens in domain ({domain_name.count('-')})")

        # Number-letter mixing (l00kalike patterns)
        if re.search(r'[a-z][0-9][a-z]|[0-9][a-z][0-9]', domain_name):
            # Only flag if it's not a known pattern like "web3" or "i18n"
            if not re.match(r'^(web3|i18n|l10n|w3|k8s)', domain_name):
                result["score"] -= 10
                result["flags"].append("Letter-number mixing (possible lookalike)")

        # Brand typosquatting detection
        brands = {
            "paypal": "paypal.com", "google": "google.com", "amazon": "amazon.com",
            "microsoft": "microsoft.com", "apple": "apple.com", "facebook": "facebook.com",
            "netflix": "netflix.com", "instagram": "instagram.com", "whatsapp": "whatsapp.com",
            "linkedin": "linkedin.com", "twitter": "twitter.com",
        }
        for brand, official in brands.items():
            if brand in domain_name and base_domain != official:
                # Could be a subdomain of the real brand or a fake
                if not hostname.endswith(f".{official}"):
                    result["score"] -= 25
                    result["flags"].append(f"Possible impersonation of {brand} (official: {official})")

    except Exception as e:
        logger.warning(f"Domain OSINT analysis error: {e}")

    # Clamp score
    result["score"] = max(0, min(100, result["score"]))
    return result


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
            f'What is "{domain}"? Is this website legitimate or has it been reported '
            f'as a scam/phishing site? Look for both positive reputation AND any '
            f'fraud/scam reports. Page title: {page_title}'
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

        # ── Step 0a: Domain OSINT (instant, no API calls) ──
        osint_result = _analyze_domain_osint(page_url) if page_url else {"score": 100, "flags": []}
        logger.info(f"OSINT score for {page_url}: {osint_result['score']} | Flags: {osint_result['flags']}")

        # ── Step 0b: Google Web Risk API (known threat database) ──
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
        # Only search if vision ALREADY found something suspicious — don't search for safe sites
        search_context = ""
        if page_url and vision_result.get("threat_level") in ("medium", "high", "critical"):
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
        search_finding = None
        if search_context:
            vision_result["search_intel"] = search_context
            domain = urlparse(page_url).netloc if page_url else "unknown"
            search_finding = {
                "category": "search_grounding",
                "severity": "safe",
                "detail": search_context[:300],
                "evidence": f"Google Search results for domain reputation of {domain}",
                "source": "Google Search Grounding (Gemini Flash)",
            }

            # Smart escalation: only escalate if search results CONFIRM the domain is bad
            # Look for strong negative signals — not just mentions of scam/phishing in general
            search_lower = search_context.lower()
            negative_phrases = [
                f"{domain.lower()} is a scam",
                f"{domain.lower()} is a phishing",
                f"{domain.lower()} is fraudulent",
                "confirmed scam",
                "confirmed phishing",
                "known scam site",
                "known phishing site",
                "reported as scam",
                "reported as phishing",
                "avoid this site",
                "do not trust",
            ]
            positive_phrases = [
                "is legitimate",
                "is a legitimate",
                "is not a scam",
                "is safe",
                "is a real",
                "trusted website",
                "reputable",
                "well-known",
            ]

            has_negative = any(phrase in search_lower for phrase in negative_phrases)
            has_positive = any(phrase in search_lower for phrase in positive_phrases)

            if has_negative and not has_positive:
                current = vision_result.get("threat_level", "safe")
                escalation = {"medium": "high"}  # Only escalate medium→high, not safe→medium
                if current in escalation:
                    vision_result["threat_level"] = escalation[current]
                    vision_result["threats"] = vision_result.get("threats", []) + [
                        "Google Search confirms scam/fraud reports for this domain"
                    ]
                search_finding["severity"] = "high"
            elif has_positive:
                # Search confirms site is legitimate — de-escalate if vision was suspicious
                current = vision_result.get("threat_level", "safe")
                deescalation = {"medium": "low", "low": "safe"}
                if current in deescalation:
                    vision_result["threat_level"] = deescalation[current]
                search_finding["severity"] = "safe"
                search_finding["detail"] = f"Search verification: {domain} appears legitimate. " + search_finding["detail"]

        # ── Build findings with layer sources ──
        findings = vision_result.get("findings") or []

        # Add source attribution to vision findings
        for f in findings:
            f["source"] = "Gemini Vision Analysis (Layer 2)"

        # Prepend Web Risk finding if present
        if web_risk_result.get("is_threat"):
            findings.insert(0, {
                "category": "web_risk",
                "severity": "critical",
                "detail": web_risk_result["detail"],
                "evidence": f"URL {page_url} matched Google's threat database for: {', '.join(web_risk_result.get('threat_types', []))}",
                "source": "Google Web Risk API (Layer 1)",
            })

        # Append search grounding finding
        if search_finding:
            findings.append(search_finding)

        # Add OSINT domain analysis finding
        osint_severity = "safe"
        if osint_result["score"] < 50:
            osint_severity = "high"
        elif osint_result["score"] < 75:
            osint_severity = "medium"
        elif osint_result["score"] < 90:
            osint_severity = "low"

        osint_flags_str = "; ".join(osint_result["flags"]) if osint_result["flags"] else "No flags"
        findings.append({
            "category": "domain",
            "severity": osint_severity,
            "detail": f"Domain authority score: {osint_result['score']}/100. {osint_flags_str}",
            "evidence": f"Domain: {osint_result.get('domain', 'unknown')} | TLD: .{osint_result.get('tld', '?')} | Subdomains: {osint_result.get('subdomain_depth', 0)}",
            "source": "OSINT Domain Analysis (Layer 0)",
        })

        # If OSINT score is very low, escalate
        if osint_result["score"] < 50:
            current = vision_result.get("threat_level", "safe")
            if current in ("safe", "low"):
                vision_result["threat_level"] = "medium"
            vision_result["threats"] = vision_result.get("threats", []) + [
                f"Suspicious domain characteristics (score: {osint_result['score']}/100)"
            ]

        return {
            "threat_level": vision_result.get("threat_level", "safe"),
            "summary": vision_result.get("summary", ""),
            "threats": vision_result.get("threats", []),
            "findings": findings,
            "domain_analysis": vision_result.get("domain_analysis", ""),
            "impersonating": vision_result.get("impersonating", ""),
            "recommendation": vision_result.get("recommendation", ""),
            "search_intel": vision_result.get("search_intel", ""),
            "web_risk": web_risk_result,
            "osint": {
                "domain_score": osint_result["score"],
                "flags": osint_result["flags"],
                "domain": osint_result.get("domain", ""),
                "tld": osint_result.get("tld", ""),
            },
            "layers_used": ["osint_domain", "web_risk_api", "gemini_vision", "google_search_grounding"],
            "success": True,
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
