# MCP (Model Context Protocol) Research for TubeForge

**Date**: 2026-02-27
**Purpose**: Evaluate MCP tools that could enhance TubeForge's AI video generation pipeline
**Status**: Research complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [ADK + MCP Integration (Verified)](#adk--mcp-integration-verified)
3. [Compatibility with Live API / Streaming](#compatibility-with-live-api--streaming)
4. [Recommended MCP Servers by Category](#recommended-mcp-servers-by-category)
5. [Integration Architecture](#integration-architecture)
6. [Implementation Priority for Hackathon](#implementation-priority-for-hackathon)
7. [Code Examples](#code-examples)
8. [Alternative: Native ADK FunctionTools Instead of MCP](#alternative-native-adk-functiontools-instead-of-mcp)
9. [Final Recommendation](#final-recommendation)

---

## Executive Summary

**Key finding**: Google ADK natively supports MCP via the `MCPToolset` class. MCP tools appear to ADK agents as native tools, making integration straightforward. However, there are significant caveats when using `run_live()` streaming mode that TubeForge relies on.

**Verdict for hackathon**: Use 2-3 high-value MCP servers (research + YouTube transcripts + stock media) as a **sub-agent's tools** (not on the streaming Forge agent), OR wrap the same APIs as native ADK `FunctionTool` functions if MCP streaming compatibility proves problematic.

---

## ADK + MCP Integration (Verified)

### How It Works

Google ADK has **first-class MCP support** via `MCPToolset`. This is NOT a hack or workaround; it is officially documented and supported.

**Import pattern:**
```python
from google.adk.tools.mcp_tool import MCPToolset
from mcp.client.stdio import StdioServerParameters
```

**How MCPToolset works internally:**
1. Connects to an MCP server (via stdio, SSE, or Streamable HTTP)
2. Queries the server for available tools (`list_tools` MCP method)
3. Converts MCP tool schemas into ADK-compatible `BaseTool` instances
4. When the LLM calls a tool, MCPToolset proxies the call to the MCP server (`call_tool` MCP method)
5. Returns the MCP server's response back to the agent

**Result**: MCP tools look and behave exactly like native ADK tools to the Gemini model.

### Connection Types Supported

| Transport | Class | Use Case |
|-----------|-------|----------|
| stdio | `StdioServerParameters` | Local MCP servers (spawns a subprocess) |
| SSE | `SseServerParams` | Remote MCP servers via HTTP/SSE |
| Streamable HTTP | Partially supported | Newer protocol, some issues on Cloud Run |

### Dependency Required

```
# Add to requirements.txt
mcp>=1.0.0
```

The `mcp` Python package is needed alongside `google-adk`.

---

## Compatibility with Live API / Streaming

### Critical Caveat for TubeForge

TubeForge uses `run_live()` with `gemini-live-2.5-flash-native-audio` for real-time voice conversation. There are known issues:

1. **Sub-agents in streaming mode**: There are reported issues with adding sub-agents and `AgentTools` in streaming mode (GitHub issue #1348 on google/adk-python).

2. **MCPToolset + streaming**: The `MCPToolset` uses buffered request/response, which can conflict with `run_live()` streaming.

3. **Remote MCP servers**: Agents can hang when MCPToolset connects to remote Cloud Run endpoints in streaming mode.

### Mitigation Strategies

**Strategy A (Recommended): MCP in a dedicated sub-agent**
Put MCP tools in a separate sub-agent that the Forge agent can transfer to. Since the researcher sub-agent already exists and handles `google_search` (which also can't coexist with other tools), create a second sub-agent for MCP-powered research.

**Strategy B: Wrap MCP server logic as native FunctionTools**
Instead of using MCPToolset, directly call the underlying APIs (Wikipedia API, YouTube Transcript API, etc.) inside regular ADK FunctionTools. This avoids all MCP streaming issues.

**Strategy C: Hybrid approach**
Use `adk web` for development (which handles async MCPToolset fine), and only fall back to native FunctionTools if `run_live()` proves incompatible.

---

## Recommended MCP Servers by Category

### 1. Research & Knowledge

| Server | Source | What It Does | Value for TubeForge |
|--------|--------|--------------|---------------------|
| **Brave Search** | `@anthropic/brave-search-mcp` | Web search with privacy, news, images, video search, AI summarization | HIGH - Better than google_search for structured data |
| **Exa Search** | `exa-mcp-server` | AI-native search across academic papers, Wikipedia, GitHub, LinkedIn | HIGH - Superior for topic research |
| **Wikipedia MCP** | `wikipedia-mcp` | Real-time Wikipedia article retrieval | MEDIUM - Good for factual grounding |
| **Wikimedia MCP** | `@privetin/wikimedia` | Full Wikimedia API access (Wikipedia + Commons + Wikidata) | MEDIUM - Media + facts in one |

### 2. Academic & Fact-Checking

| Server | Source | What It Does | Value for TubeForge |
|--------|--------|--------------|---------------------|
| **Paper Search MCP** | `paper-search-mcp` | Search arXiv, PubMed, bioRxiv, Google Scholar, Semantic Scholar | HIGH - Science/tech video topics |
| **Semantic Scholar MCP** | `semantic-scholar-mcp` | Papers, citations, author info, citation networks | MEDIUM - Deep academic research |
| **arXiv MCP** | `arxiv-mcp-server` | Search and analyze arXiv papers specifically | MEDIUM - AI/tech topics |
| **News Fact-Checker MCP** | `news-factchecker-mcp` | Fact verification for news claims | LOW - Nice to have |

### 3. YouTube & Video Content

| Server | Source | What It Does | Value for TubeForge |
|--------|--------|--------------|---------------------|
| **YouTube Transcript MCP** | `mcp-server-youtube-transcript` | Download transcripts from YouTube videos | HIGH - Competitor analysis, research |
| **YouTube Data API MCP** | `youtube-mcp-server` | 40 tools: analytics, SEO, comments, publishing | MEDIUM - Channel insights |
| **YouTube MCP (anaisbetts)** | `mcp-youtube` | Lightweight YouTube content interaction | LOW - Basic access |

### 4. Stock Media

| Server | Source | What It Does | Value for TubeForge |
|--------|--------|--------------|---------------------|
| **Stock Images MCP** | `stock-images-mcp` | Search Unsplash + Pexels + Pixabay | HIGH - B-roll alternatives |
| **Pixabay MCP** | `pixabay-mcp-server` | Royalty-free images AND videos | HIGH - Free video clips |
| **Pexels MCP** | Pipedream MCP | Stock photos and videos | MEDIUM - 150K+ free videos |

### 5. News & Trending Topics

| Server | Source | What It Does | Value for TubeForge |
|--------|--------|--------------|---------------------|
| **Google News & Trends MCP** | `google-news-trends-mcp` | News retrieval + Google Trends data | HIGH - Trending video topics |
| **News API MCP** | `news-api-mcp` | Access News API for headlines | MEDIUM - Current events |
| **News Aggregator MCP** | `news-mcp` | 31 sources, trending topics | MEDIUM - Broad coverage |

---

## Integration Architecture

### Option A: MCP Sub-Agent (Recommended for Hackathon)

```
User
  |
  v
Forge (root_agent) ---- gemini-live-2.5-flash-native-audio
  |                      tools: [generate_script, generate_voiceover,
  |                              generate_thumbnail, generate_broll,
  |                              edit_image, assemble_video]
  |
  |--- transfers to ---> researcher (sub-agent)
  |                      tools: [google_search]
  |
  |--- transfers to ---> deep_researcher (NEW sub-agent)
                         tools: [MCPToolset(wikipedia),
                                 MCPToolset(youtube-transcript),
                                 MCPToolset(paper-search),
                                 MCPToolset(stock-images)]
```

**Pros**: Clean separation, MCP tools don't interfere with Live API streaming on Forge.
**Cons**: Another sub-agent, model must decide which researcher to use.

### Option B: MCP Tools on Existing Researcher

```
researcher (sub-agent)
  tools: [google_search]  <-- Cannot add more tools here (ADK limitation)
```

**Not viable**: `google_search` cannot coexist with other tools.

### Option C: Native FunctionTools (Safest)

```python
# Instead of MCP, wrap APIs directly:
def search_wikipedia(query: str) -> dict:
    """Search Wikipedia for factual information."""
    import wikipedia
    # Direct API call, no MCP overhead
    ...

def get_youtube_transcript(video_url: str) -> dict:
    """Get transcript from a YouTube video for research."""
    from youtube_transcript_api import YouTubeTranscriptApi
    # Direct API call
    ...
```

**Pros**: Zero compatibility risk, no extra dependencies, works perfectly with `run_live()`.
**Cons**: More code to write, no MCP ecosystem benefits.

---

## Implementation Priority for Hackathon

Given the March 17 deadline, here is the priority order:

### P0 - Must Have (High impact, low risk)
1. **YouTube Transcript** - Analyze competitor videos, research topics by watching existing content
2. **Wikipedia** - Factual grounding for explainer video scripts
3. **Stock Media (Pexels/Pixabay)** - Free B-roll when Veo 2 generation is slow or fails

### P1 - Should Have (High impact, moderate risk)
4. **Google News & Trends** - Find trending topics for video suggestions
5. **Brave Search or Exa** - Deeper research than built-in google_search

### P2 - Nice to Have (Lower impact)
6. **Paper Search (arXiv/Semantic Scholar)** - Academic topics
7. **News Fact-Checker** - Verification layer
8. **YouTube Analytics** - Channel optimization

---

## Code Examples

### Example 1: MCPToolset with stdio (Local MCP Server)

```python
# agent.py
import os
from google.adk.agents import Agent
from google.adk.tools.mcp_tool import MCPToolset
from mcp.client.stdio import StdioServerParameters

AGENT_MODEL = os.environ.get("DEMO_AGENT_MODEL", "gemini-live-2.5-flash-native-audio")

# MCP-powered research sub-agent
deep_researcher = Agent(
    name="deep_researcher",
    model=AGENT_MODEL,
    description=(
        "Deep research assistant that searches Wikipedia, YouTube transcripts, "
        "academic papers, and stock media. Transfer to this agent when you need "
        "in-depth research beyond basic Google Search."
    ),
    instruction=(
        "You are a deep research assistant. Use the available tools to find "
        "detailed factual information, video transcripts, academic sources, "
        "and stock media for video production."
    ),
    tools=[
        MCPToolset(
            connection_params=StdioServerParameters(
                command="npx",
                args=["-y", "mcp-server-youtube-transcript"],
            ),
        ),
        MCPToolset(
            connection_params=StdioServerParameters(
                command="python",
                args=["-m", "wikipedia_mcp"],
            ),
        ),
    ],
)
```

### Example 2: MCPToolset with SSE (Remote MCP Server)

```python
from google.adk.tools.mcp_tool import MCPToolset, SseServerParams

stock_media_tools = MCPToolset(
    connection_params=SseServerParams(
        url="http://localhost:3001/sse",
    ),
    tool_filter=["search_images", "search_videos"],  # Only expose specific tools
)
```

### Example 3: Native FunctionTool Alternative (Safest)

```python
# tools/research_tools.py
"""Native research tools — no MCP dependency, maximum compatibility."""

import json
import urllib.request
from typing import Optional


def search_wikipedia(
    query: str,
    sentences: int = 5,
) -> dict:
    """Search Wikipedia for factual information about a topic.

    Args:
        query: The topic to search for on Wikipedia.
        sentences: Number of sentences to return in the summary (1-10).

    Returns:
        Dictionary with title, summary, and URL of the Wikipedia article.
    """
    url = (
        f"https://en.wikipedia.org/api/rest_v1/page/summary/"
        f"{urllib.parse.quote(query)}"
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
            return {
                "title": data.get("title", ""),
                "summary": data.get("extract", ""),
                "url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                "description": data.get("description", ""),
            }
    except Exception as e:
        return {"error": str(e)}


def get_youtube_transcript(
    video_id: str,
    language: str = "en",
) -> dict:
    """Get the transcript/captions from a YouTube video for research.

    Args:
        video_id: The YouTube video ID (the part after v= in the URL).
        language: Language code for the transcript (default: en).

    Returns:
        Dictionary with the full transcript text and metadata.
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=[language])
        full_text = " ".join([entry["text"] for entry in transcript])
        return {
            "video_id": video_id,
            "language": language,
            "segment_count": len(transcript),
            "transcript": full_text,
        }
    except Exception as e:
        return {"error": str(e), "video_id": video_id}


def search_stock_media(
    query: str,
    media_type: str = "photo",
    per_page: int = 5,
) -> dict:
    """Search Pexels for royalty-free stock photos and videos.

    Args:
        query: Search term for stock media.
        media_type: Type of media - 'photo' or 'video'.
        per_page: Number of results to return (1-20).

    Returns:
        Dictionary with media results including URLs and metadata.
    """
    import os
    api_key = os.environ.get("PEXELS_API_KEY", "")
    if not api_key:
        return {"error": "PEXELS_API_KEY not set in environment"}

    if media_type == "video":
        url = f"https://api.pexels.com/videos/search?query={urllib.parse.quote(query)}&per_page={per_page}"
    else:
        url = f"https://api.pexels.com/v1/search?query={urllib.parse.quote(query)}&per_page={per_page}"

    req = urllib.request.Request(url, headers={"Authorization": api_key})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            if media_type == "video":
                results = [
                    {
                        "id": v["id"],
                        "url": v["url"],
                        "duration": v.get("duration"),
                        "video_files": [
                            {"quality": f["quality"], "link": f["link"]}
                            for f in v.get("video_files", [])[:2]
                        ],
                    }
                    for v in data.get("videos", [])
                ]
            else:
                results = [
                    {
                        "id": p["id"],
                        "url": p["url"],
                        "src": p.get("src", {}).get("large2x", ""),
                        "photographer": p.get("photographer", ""),
                    }
                    for p in data.get("photos", [])
                ]
            return {"query": query, "type": media_type, "results": results}
    except Exception as e:
        return {"error": str(e)}


def search_trending_topics(
    category: str = "technology",
) -> dict:
    """Get trending news topics for video content ideas.

    Args:
        category: News category - technology, science, business, entertainment, health.

    Returns:
        Dictionary with trending headlines and topics.
    """
    import os
    api_key = os.environ.get("NEWS_API_KEY", "")
    if not api_key:
        return {"error": "NEWS_API_KEY not set. Get one free at newsapi.org"}

    url = (
        f"https://newsapi.org/v2/top-headlines?"
        f"category={category}&language=en&pageSize=10"
        f"&apiKey={api_key}"
    )
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
            articles = [
                {
                    "title": a["title"],
                    "description": a.get("description", ""),
                    "source": a.get("source", {}).get("name", ""),
                    "url": a.get("url", ""),
                }
                for a in data.get("articles", [])
            ]
            return {"category": category, "trending": articles}
    except Exception as e:
        return {"error": str(e)}
```

### Example 4: Integrating into agent.py (Native Approach)

```python
# agent.py — updated with research tools
from tools.research_tools import (
    search_wikipedia,
    get_youtube_transcript,
    search_stock_media,
    search_trending_topics,
)

# New sub-agent with native research tools
deep_researcher = Agent(
    name="deep_researcher",
    model=AGENT_MODEL,
    description=(
        "Deep research assistant with access to Wikipedia, YouTube transcripts, "
        "stock media search, and trending topics. Transfer here for in-depth "
        "research beyond basic Google Search."
    ),
    instruction=(
        "You are a deep research assistant for video production. Use your tools to:\n"
        "- search_wikipedia: Get factual information for explainer videos\n"
        "- get_youtube_transcript: Analyze competitor videos\n"
        "- search_stock_media: Find royalty-free B-roll footage\n"
        "- search_trending_topics: Discover trending video ideas\n\n"
        "Return structured, concise information ready for video scripting."
    ),
    tools=[
        search_wikipedia,
        get_youtube_transcript,
        search_stock_media,
        search_trending_topics,
    ],
)

# Update root_agent to include new sub-agent
root_agent = Agent(
    name="forge",
    model=AGENT_MODEL,
    instruction=_system_prompt,
    tools=[
        generate_script, generate_voiceover, generate_thumbnail,
        generate_broll, edit_image, assemble_video,
    ],
    sub_agents=[researcher, deep_researcher],  # Both sub-agents
)
```

---

## Alternative: Native ADK FunctionTools Instead of MCP

### When to Use Native FunctionTools Over MCP

| Factor | MCP | Native FunctionTool |
|--------|-----|---------------------|
| Streaming / run_live() | Known issues | Fully compatible |
| Dependency count | +mcp, +npx, +server packages | Just pip packages |
| Setup complexity | MCP server config + env | Just Python code |
| Hackathon speed | Slower (debug MCP issues) | Faster (direct control) |
| Ecosystem benefit | Access 1200+ servers | Write per-API |
| Cloud Run deploy | Extra complexity | Works out of the box |

### Verdict

For TubeForge's hackathon timeline (March 17, 2026), **native FunctionTools are the safer bet**. The underlying APIs are simple REST calls:

- Wikipedia REST API: No API key needed, simple HTTP GET
- YouTube Transcript API: `pip install youtube-transcript-api`, 3 lines of code
- Pexels API: Free API key, simple HTTP GET
- News API: Free tier, simple HTTP GET

MCP adds value for **production systems** with many tools, but for a hackathon with 4-6 research tools, the direct approach is faster and more reliable.

---

## Final Recommendation

### For the Hackathon (March 17 deadline)

1. **Use native FunctionTools** (not MCP) for research capabilities
2. **Create `tools/research_tools.py`** with 4 functions:
   - `search_wikipedia` (no API key needed)
   - `get_youtube_transcript` (pip package)
   - `search_stock_media` (free Pexels API key)
   - `search_trending_topics` (free News API key)
3. **Create `deep_researcher` sub-agent** with these 4 tools
4. **Update `agent.py`** to include `deep_researcher` alongside existing `researcher`

### For Post-Hackathon / Production

1. Migrate to MCP for standardized tool interfaces
2. Add MCP servers: Brave Search, Exa, Semantic Scholar, YouTube Analytics
3. Use `MCPToolset` with Streamable HTTP for remote servers
4. Consider MCP Toolbox for Databases if storing video metadata

### Dependencies to Add

```
# requirements.txt additions
youtube-transcript-api>=0.6.0    # YouTube transcript extraction
# Optional:
# mcp>=1.0.0                     # Only if using MCPToolset approach
```

### Environment Variables to Add

```env
# .env additions
PEXELS_API_KEY=your_key_here       # Free at pexels.com/api
NEWS_API_KEY=your_key_here         # Free at newsapi.org
```

---

## Sources

- [ADK MCP Tools Documentation](https://google.github.io/adk-docs/tools-custom/mcp-tools/)
- [ADK MCP Overview](https://google.github.io/adk-docs/mcp/)
- [Google Cloud Blog: ADK + MCP External Server](https://cloud.google.com/blog/topics/developers-practitioners/use-google-adk-and-mcp-with-an-external-server)
- [ADK Codelab: MCP + ADK + A2A](https://codelabs.developers.google.com/codelabs/currency-agent)
- [ADK MCPToolset Source Code](https://github.com/google/adk-python/blob/main/src/google/adk/tools/mcp_tool/mcp_toolset.py)
- [Awesome MCP Servers Directory](https://mcp-awesome.com)
- [Official MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
- [Brave Search MCP Server](https://github.com/brave/brave-search-mcp-server)
- [YouTube Transcript MCP Server](https://github.com/kimtaeyoon83/mcp-server-youtube-transcript)
- [Paper Search MCP (arXiv + Semantic Scholar)](https://github.com/openags/paper-search-mcp)
- [Wikipedia MCP Server](https://github.com/Rudra-ravi/wikipedia-mcp)
- [Stock Images MCP (Pexels + Pixabay)](https://github.com/Zulelee/stock-images-mcp)
- [Google News & Trends MCP Server](https://www.pulsemcp.com/servers/jmanek-google-news-trends)
- [Pixabay MCP Server](https://mcpservers.org/servers/Unlock-MCP/pixabay-mcp-server)
- [Semantic Scholar FastMCP Server](https://github.com/zongmin-yu/semantic-scholar-fastmcp-mcp-server)
- [ADK Streaming Issues (GitHub #1348)](https://github.com/google/adk-python/issues/1348)
- [MCP Streamable HTTP Support (GitHub #1841)](https://github.com/google/adk-python/issues/1841)
