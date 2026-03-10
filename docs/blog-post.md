# Building an AI SAP Support Agent with Gemini Live API

*Created for the Gemini Live Agent Challenge hackathon #GeminiLiveAgentChallenge*

---

## The Idea

What if SAP support felt like calling a brilliant senior consultant who never sleeps, never forgets, and can see your screen?

That's Guardian — an AI-powered SAP AMS Control Tower where you talk to **Jessica**, a voice AI agent who conducts structured diagnostic interviews, reads your SAP screens, searches knowledge bases and the web, and produces complete Root Cause Analysis reports. All in a single real-time conversation.

## Why Gemini Live API?

SAP support is inherently a **conversation**. Users are frustrated, they describe problems imprecisely, and they need guidance step by step. Text-based AI chatbots fail here because:

1. Users don't know what information is relevant
2. Typing error codes and T-codes is error-prone
3. The back-and-forth of chat is too slow for urgent issues

Gemini Live API solves all three:
- **Voice** means users can describe problems naturally
- **Vision** means Jessica can read errors directly from screen shares
- **Real-time** means the conversation flows like a phone call
- **Interruption support** means users can jump in when Jessica is going down the wrong path

## Architecture

The system has three layers:

### Frontend (Vite + Web Components)
A dark-themed SPA with real-time audio visualization, screen capture via `getDisplayMedia`, clipboard paste for screenshots, and a visual diagnostic pipeline tracker. Web Audio worklets handle PCM audio streaming at 16kHz.

### Backend (FastAPI + WebSocket)
Bidirectional WebSocket streams audio and JSON between the browser and Gemini Live API. The backend manages 8 server-side tools that Gemini can call during conversation. When a tool fires, the result goes back to Gemini and the frontend gets a visual update.

### AI Layer (Gemini Live + Gemini Flash)
Two Gemini models work together:
- **Gemini Live** (`gemini-live-2.5-flash-native-audio`) handles the voice conversation and vision input
- **Gemini Flash** (`gemini-2.5-flash`) handles Google Search grounding in a separate call (because `google_search` conflicts with `function_declarations` in the Live API)

## The Hardest Problem: Multi-Response Bug

The biggest challenge was preventing Jessica from generating multiple responses per turn. With Gemini Live API, the model sometimes continues speaking after a `turn_complete` event — generating a second response before the user has said anything.

The fix was three-layered:

1. **VAD Tuning**: Increased `silence_duration_ms` to 3000ms and set both speech sensitivities to `LOW`
2. **Server-Side Turn Gating**: After `turn_complete`, a flag suppresses model output until user audio arrives
3. **Prompt Engineering**: Added an "ABSOLUTE RULE" at the end of the system prompt: *"One turn = one response = then silence."*

## Google Search Grounding — The Anti-Hallucination Layer

SAP is a domain where hallucination is dangerous. A wrong OSS note number or incorrect configuration advice could cause a production outage. We added `research_sap_topic` as the 8th tool — when Jessica's internal KB has no answer, she calls Gemini Flash with Google Search grounding to find the latest SAP OSS notes, patches, and community solutions.

```python
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=f"Research SAP topic: {query}",
    config=types.GenerateContentConfig(
        tools=[types.Tool(google_search=types.GoogleSearch())],
    ),
)
```

This returns grounded answers with source URLs — no hallucination, always verifiable.

## 8 Tools Working Together

Jessica's power comes from her tools:

| Tool | Purpose |
|------|---------|
| `search_knowledge_base` | Local KB with keyword scoring |
| `lookup_sap_error` | Error code → root cause + fix |
| `lookup_transaction_code` | T-code → module + context |
| `diagnose_sap_issue` | Cross-reference all data |
| `create_issue` | Log problems with dedup |
| `create_itsm_ticket` | Full diagnostic report |
| `update_itsm_ticket` | Status + resolution updates |
| `research_sap_topic` | Google Search grounding |

The system prompt instructs Jessica to call tools **aggressively and in parallel** — the moment she hears an error code, she fires `lookup_sap_error`, `search_knowledge_base`, and `lookup_transaction_code` simultaneously.

## What I Learned

1. **Gemini Live API is production-ready** for voice agents — the audio quality, latency, and interruption handling are excellent
2. **Turn management** is the #1 challenge for Live API agents — you need both client-side and server-side controls
3. **Google Search grounding** is essential for domain-specific agents — it eliminates the "confident but wrong" failure mode
4. **System prompts matter enormously** for voice agents — Jessica's persona, protocol, and guardrails are 240+ lines of carefully tuned instructions
5. **Vision + Voice + Tools** is the killer combo — users don't need to type anything, Jessica handles it all

## Try It

Guardian is deployed on Google Cloud Run. The code is open source.

- GitHub: [link]
- Live Demo: [link]

Built with Gemini Live API, Vertex AI, Google Cloud Run, and the Google GenAI SDK.

*#GeminiLiveAgentChallenge*
