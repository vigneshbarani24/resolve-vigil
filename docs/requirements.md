# TubeForge — Requirements Specification

> Kiro-style spec | Updated: 2026-02-27 | Framework: Google ADK + genmedia-live hybrid
> Hackathon: Gemini Live Agent Challenge | Deadline: 2026-03-17

## 1. Product Overview

**TubeForge** is an AI-powered YouTube content studio that transforms photos into complete explainer/documentary videos through voice-directed conversation with an AI Creative Director ("Forge").

**Target User**: Solo YouTube creators running faceless channels (history, facts, documentary, motivation niches).

**Problem**: Creating a single faceless YouTube video currently requires 3-5 separate tools and 4-8 hours. No existing tool generates custom AI visuals or offers voice-controlled creative direction.

**Solution**: One conversation, one tool, one video. Upload a photo → talk to Forge → download a complete YouTube-ready MP4.

**Framework**: Google ADK (`google-adk`) multi-agent architecture — a research sub-agent (google_search only) + main Forge agent (6 media FunctionTools) — powered by Gemini 2.0 Flash Live via bidirectional streaming (`run_live()` + `LiveRequestQueue`). Media generation code ported from genmedia-live sample app.

---

## 2. Feature Requirements

### F-001: Image Input (Camera + Upload)
**Priority**: Must-have

**User Stories**:
- As a creator, I want to upload a photo of a famous landmark so that Forge can identify it and create a video about it.
- As a creator, I want to point my phone camera at a monument so that Forge can see it in real-time and start a conversation.

**Acceptance Criteria**:
- [ ] User can upload JPEG/PNG images via file picker
- [ ] User can share live camera feed via browser MediaDevices API
- [ ] Images sent to ADK agent via WebSocket as base64 JPEG
- [ ] ADK `LiveRequestQueue` receives image data and feeds to Gemini Live session
- [ ] Agent correctly identifies the subject in >90% of famous landmarks/artworks
- [ ] Supported image formats: JPEG, PNG, WebP
- [ ] Max image size: 10MB (resized to 768x768 before sending)

---

### F-002: Voice Conversation with Forge
**Priority**: Must-have

**User Stories**:
- As a creator, I want to talk to Forge via my microphone so that I can direct the video creation naturally.
- As a creator, I want to hear Forge's responses via my speaker so that the interaction feels like talking to a creative partner.
- As a creator, I want to interrupt Forge mid-sentence to change direction, just like a real conversation.

**Acceptance Criteria**:
- [ ] Bidirectional audio streaming via ADK `run_live()` async generator
- [ ] PCM 16kHz audio input from browser microphone via Web Audio API worklets
- [ ] Audio output streamed back via WebSocket and played through browser speakers
- [ ] Interruption handling (barge-in) works correctly via `LiveRequestQueue`
- [ ] Forge has a distinct, named persona with consistent personality
- [ ] Session supports 30-minute conversations with ADK session resumption
- [ ] Visual indicators show listening/speaking/processing states
- [ ] Upstream (client→queue) and downstream (run_live→client) run concurrently via `asyncio.gather()`

---

### F-003: Topic Research (Google Search Grounding)
**Priority**: Must-have

**User Stories**:
- As a creator, I want Forge to research the topic before writing so that the video content is factually accurate and grounded.

**Acceptance Criteria**:
- [ ] Uses a dedicated **researcher sub-agent** with ADK built-in `google_search` tool
- [ ] `google_search` is isolated in the sub-agent (cannot coexist with other tools in one agent)
- [ ] Main Forge agent transfers to researcher sub-agent when research is needed
- [ ] Researcher returns key facts, dates, figures, and interesting angles
- [ ] Research results are passed back to Forge and used to ground the script (no hallucinations)
- [ ] Research completes within 10 seconds
- [ ] Agent explicitly references factual sources in narration where appropriate

**Architecture Note**: ADK's `google_search` built-in tool **cannot be combined with other tools** in a single agent. This requires a multi-agent architecture where the researcher is a sub-agent of the main Forge agent. Forge transfers control to the researcher for fact-gathering, then resumes creative direction.

---

### F-004: Script Generation with Interleaved Images
**Priority**: Must-have

**User Stories**:
- As a creator, I want Forge to generate a complete video script with scene-by-scene custom AI images so that I get a visual storyboard in one pass.
- As a creator, I want to see the script and images appear in real-time as they generate.

**Acceptance Criteria**:
- [ ] `generate_script` registered as ADK FunctionTool (auto-wrapped from Python function with type hints)
- [ ] Uses Gemini with `response_modalities=["TEXT", "IMAGE"]` for interleaved output
- [ ] Generates narration text interleaved with scene images in a single stream
- [ ] Script structure: hook (10s) → intro → sections → conclusion → CTA
- [ ] Images match the narration content and visual style
- [ ] Supports multiple styles: documentary, facts, story, explainer
- [ ] Target: 130-150 words per minute of narration
- [ ] Script segments include timing estimates
- [ ] Script for 5-minute video = ~700-750 words, 8-12 scene images
- [ ] Generated assets stored via `ToolContext.state` for cross-tool access

---

### F-005: AI Voiceover Generation
**Priority**: Must-have

**User Stories**:
- As a creator, I want Forge to generate a professional AI voiceover from the script so that I don't need a separate TTS tool.

**Acceptance Criteria**:
- [ ] `generate_voiceover` registered as ADK FunctionTool
- [ ] Uses Google Cloud Text-to-Speech API
- [ ] Supports multiple voice options per content style
- [ ] Speaking rate adjustable (0.85 - 1.15x)
- [ ] Output format: LINEAR16 WAV
- [ ] Returns word-level timestamps for subtitle sync
- [ ] Voiceover duration matches script timing estimates (within 10%)
- [ ] Natural-sounding narration (Neural2 or Studio voices)
- [ ] Audio file path stored in `ToolContext.state['voiceover_id']`

---

### F-006: Thumbnail Generation
**Priority**: Must-have

**User Stories**:
- As a creator, I want Forge to generate an eye-catching YouTube thumbnail so that my video gets clicks.

**Acceptance Criteria**:
- [ ] `generate_thumbnail` registered as ADK FunctionTool
- [ ] Uses Imagen 3 via Vertex AI (ported from genmedia-live pattern)
- [ ] Output resolution: 1280x720 (YouTube standard)
- [ ] Generates visually striking image relevant to the topic
- [ ] Style options: dramatic, colorful, mysterious, clean
- [ ] User can request regeneration via voice ("make it more dramatic")
- [ ] Thumbnail path stored in `ToolContext.state['thumbnail_id']`

---

### F-007: Video Assembly
**Priority**: Must-have

**User Stories**:
- As a creator, I want Forge to assemble all components into a downloadable MP4 so that I can upload directly to YouTube.

**Acceptance Criteria**:
- [ ] `assemble_video` registered as ADK FunctionTool
- [ ] FFmpeg pipeline combines: scene images + voiceover + subtitles → MP4 (ported from genmedia-live)
- [ ] Ken Burns effect (slow pan/zoom) applied to static images
- [ ] Burned-in subtitles generated from script text + word timestamps
- [ ] Output: H.264 MP4, 1920x1080, 30fps
- [ ] Audio: AAC, 128kbps
- [ ] Final video duration matches voiceover duration
- [ ] Download available via REST endpoint or WebSocket event
- [ ] Final video URL stored in `ToolContext.state['video_url']`

---

### F-008: B-Roll Video Generation
**Priority**: Should-have (stretch)

**User Stories**:
- As a creator, I want Forge to generate short atmospheric video clips for key scenes so that the video feels more dynamic and professional.

**Acceptance Criteria**:
- [ ] `generate_broll` registered as ADK FunctionTool
- [ ] Uses Veo 2 via Vertex AI (ported from genmedia-live pattern)
- [ ] Generates 4, 6, or 8 second clips
- [ ] Aspect ratio: 16:9
- [ ] Style options: cinematic, aerial, close-up
- [ ] B-roll clips integrated into assembly pipeline at appropriate scenes
- [ ] Graceful fallback to static image if Veo generation fails

---

### F-009: Image Editing/Regeneration
**Priority**: Should-have

**User Stories**:
- As a creator, I want to ask Forge to change a specific scene image so that I can refine the visual style.

**Acceptance Criteria**:
- [ ] `edit_image` registered as ADK FunctionTool
- [ ] Voice command: "change image 3 to be darker" → regenerates that image
- [ ] Uses Imagen edit capabilities or full regeneration (ported from genmedia-live)
- [ ] Updated image reflects in the preview and final assembly
- [ ] Reads/writes image references from `ToolContext.state`

---

### F-010: Niche Presets
**Priority**: Should-have

**User Stories**:
- As a creator, I want to select a content niche so that Forge automatically adjusts voice, visuals, music, and pacing.

**Acceptance Criteria**:
- [ ] Presets for: documentary, scary/horror, facts/lists, motivation, history, true crime
- [ ] Each preset configures: voice style, visual mood, background music, pacing
- [ ] Selectable via voice or UI button
- [ ] Preset config stored in `ToolContext.state['niche']`
- [ ] Loaded from `prompts/niche_presets.json`

---

### F-011: Cloud Deployment
**Priority**: Must-have (hackathon requirement)

**User Stories**:
- As a hackathon judge, I want to see proof that the backend runs on Google Cloud.

**Acceptance Criteria**:
- [ ] Deploy via `adk deploy cloud_run --project=$PROJECT --region=$REGION`
- [ ] Vertex AI used for all AI model calls (not direct API key)
- [ ] Screen recording of GCP Console showing running Cloud Run service
- [ ] `adk web` used for development/testing (shows sophisticated agent testing)
- [ ] Public HTTPS URL accessible for demo

---

### F-012: Infrastructure as Code
**Priority**: Nice-to-have (bonus points)

**Acceptance Criteria**:
- [ ] Terraform config in `terraform/main.tf`
- [ ] Enables required APIs, deploys Cloud Run service
- [ ] Included in public repository

---

## 3. Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| **Performance** | Script + images generated within 60 seconds for 5-min video |
| **Performance** | Voiceover generated within 30 seconds |
| **Performance** | Video assembly completed within 120 seconds |
| **Performance** | Total end-to-end: photo → video in under 10 minutes |
| **Reliability** | ADK session auto-reconnects on connection drop (LiveRequestQueue graceful close) |
| **Reliability** | Graceful fallback if Veo/Imagen API fails |
| **Security** | No API keys in frontend code or git history |
| **Security** | Vertex AI credentials via ADK environment (GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION) |
| **Compatibility** | Chrome 90+, Firefox 90+, Safari 16+ |
| **Compatibility** | Mobile browser support for camera input |
| **Agent Quality** | `adk eval` golden dataset for key interactions (bonus) |

---

## 4. Out of Scope (Hackathon v1)

- YouTube Data API integration (auto-upload)
- Batch video generation (queue multiple topics)
- User accounts / login system
- Analytics or monetization tracking
- Custom intro/outro branding
- Video editing timeline UI (like Premiere)
- Multiple language support for voiceover
- Background music licensing management
- SEO optimization for YouTube titles/descriptions
- Complex multi-agent orchestration beyond researcher↔forge transfer pattern
