"""
Google Search Grounding Tool.

Uses Gemini Flash with Google Search grounding to research IT support topics,
find latest portal updates, known issues, and solutions from the web.
This is a SEPARATE Gemini call (not the Live session) because
google_search grounding conflicts with function declarations in Live API.
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


def research_support_topic(query: str) -> str:
    """Research an IT support topic using Google Search for latest solutions and updates."""
    try:
        client = _get_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"You are an IT helpdesk expert specializing in government portals, "
                     f"visa applications, tax filing, and online services. Research the "
                     f"following topic and provide: "
                     f"1) Current known issues or outages, "
                     f"2) Root cause analysis, "
                     f"3) Step-by-step resolution. "
                     f"Be specific and practical. Topic: {query}",
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.2,
            ),
        )

        result_text = ""
        grounding_sources = []

        if response.candidates and response.candidates[0].content:
            for part in response.candidates[0].content.parts:
                if part.text:
                    result_text += part.text

        # Extract grounding metadata if available
        if (response.candidates and
                response.candidates[0].grounding_metadata and
                response.candidates[0].grounding_metadata.grounding_chunks):
            for chunk in response.candidates[0].grounding_metadata.grounding_chunks:
                if chunk.web:
                    grounding_sources.append({
                        "title": chunk.web.title or "",
                        "uri": chunk.web.uri or "",
                    })

        return json.dumps({
            "success": True,
            "query": query,
            "answer": result_text,
            "sources": grounding_sources[:5],
            "source_count": len(grounding_sources),
        })

    except Exception as e:
        logger.error(f"Google Search grounding error: {e}", exc_info=True)
        return json.dumps({
            "success": False,
            "query": query,
            "error": str(e),
            "answer": f"Search grounding failed: {e}. Falling back to internal KB.",
        })


SEARCH_GROUNDING_DECLARATIONS = [
    {
        "name": "research_support_topic",
        "description": (
            "Research an IT support topic using Google Search for latest portal updates, "
            "known outages, and solutions. Use for issues where the internal knowledge base "
            "has no answer, or when you need the latest information about a portal error, "
            "government service update, or technical issue."
        ),
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "query": {
                    "type": "STRING",
                    "description": "The support topic to research — e.g. 'income tax portal login issues today' or 'VFS Schengen visa appointment availability'"
                }
            },
            "required": ["query"]
        }
    }
]
