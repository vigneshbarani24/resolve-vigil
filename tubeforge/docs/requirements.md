# TubeForge -- Requirements Specification

**Project**: TubeForge -- AI Explainer Video Engine
**Category**: Creative Storyteller (Gemini Live Agent Challenge)
**Version**: 1.0.0
**Last Updated**: 2026-03-02
**Status**: Built -- all features implemented, pending GCP integration testing

---

## 1. Product Overview

TubeForge is an AI-powered explainer video engine that transforms a user's photo and voice conversation into a complete YouTube-ready video. Users interact with "Forge," an AI Creative Director, through a bidirectional audio/text/image interface. Forge researches topics, writes narrated scripts with scene illustrations, generates voiceovers, thumbnails, and B-roll clips, then assembles everything into a polished MP4.

---

## 2. Stakeholders

| Role | Description |
|------|-------------|
| End User | Content creators who want faceless YouTube explainer/documentary videos |
| Forge (Agent) | The AI Creative Director persona powered by Gemini Live |
| Solo Developer | KaarTech UK (hackathon team) |
| Hackathon Judges | Devpost Gemini Live Agent Challenge evaluators |

---

## 3. User Stories and Requirements (EARS Notation)

### US-1: Image Upload and Subject Identification

**As a** content creator,
**I want to** upload a photo or capture one with my camera,
**so that** Forge can identify the subject and propose a video concept.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-1.1** (Event-driven): WHEN the user captures an image via the camera button, the system SHALL display a camera preview modal with a live video feed and a "Send Image" button.
- **R-1.2** (Event-driven): WHEN the user clicks "Send Image," the system SHALL capture the current frame as JPEG (quality 0.85), display it as a user chat bubble, and transmit it over WebSocket as a base64-encoded JSON message with type "image" and mimeType "image/jpeg."
- **R-1.3** (Event-driven): WHEN the server receives an image message, the system SHALL decode the base64 data and send it to the Live API via `LiveRequestQueue.send_realtime()` as a `types.Blob`.
- **R-1.4** (Ubiquitous): The camera capture SHALL use `getUserMedia` with ideal resolution 768x768 and facingMode "user."

**Acceptance Criteria**:
1. Clicking the "Camera" button opens a modal with live camera preview.
2. Clicking "Send Image" captures a JPEG frame, shows it in the chat, and sends it to Forge.
3. Clicking "Cancel" or the close button stops the camera stream and closes the modal.
4. Camera errors display a system message with the error detail.

---

### US-2: Text Conversation with Forge

**As a** content creator,
**I want to** type text messages to Forge,
**so that** I can describe my video concept, preferences, and iterate on ideas.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-2.1** (Event-driven): WHEN the user submits the message form, the system SHALL display the message as a user chat bubble and send it over WebSocket as a JSON message with type "text."
- **R-2.2** (Event-driven): WHEN the server receives a text message, the system SHALL wrap it in a `types.Content` with a `types.Part(text=...)` and send it to the Live API via `LiveRequestQueue.send_content()`.
- **R-2.3** (Event-driven): WHEN the agent returns content events with text parts, the system SHALL render them as agent chat bubbles with a typing indicator during partial responses.
- **R-2.4** (Event-driven): WHEN a `turnComplete` event is received, the system SHALL remove the typing indicator from the current agent bubble.
- **R-2.5** (Ubiquitous): The send button SHALL be disabled until the WebSocket connection is established.

**Acceptance Criteria**:
1. Typing a message and pressing Enter (or clicking Send) shows a user bubble and clears the input.
2. Agent responses appear as agent bubbles with streaming text and a typing indicator.
3. The typing indicator disappears when the turn completes.
4. The send button is disabled while disconnected and enabled when connected.

---

### US-3: Bidirectional Voice Conversation

**As a** content creator,
**I want to** speak to Forge using my microphone and hear Forge's voice responses,
**so that** I can have a natural hands-free conversation about my video.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-3.1** (Event-driven): WHEN the user clicks "Start Audio," the system SHALL initialize an AudioWorklet recorder at 16kHz sample rate (mono, PCM16) and an AudioWorklet player at 24kHz sample rate.
- **R-3.2** (State-driven): WHILE audio mode is active, the system SHALL continuously send PCM16 audio chunks from the microphone to the server as WebSocket binary frames.
- **R-3.3** (Event-driven): WHEN the server receives binary audio data, it SHALL send it to the Live API via `LiveRequestQueue.send_realtime()` as a `types.Blob` with mime_type `audio/pcm;rate=16000`.
- **R-3.4** (Event-driven): WHEN the agent returns content events with `inlineData` audio parts (PCM at 24kHz), the system SHALL forward them to the audio player worklet for real-time playback.
- **R-3.5** (Event-driven): WHEN the agent returns `inputTranscription` events, the system SHALL display them as user transcription bubbles (with partial/finished states).
- **R-3.6** (Event-driven): WHEN the agent returns `outputTranscription` events, the system SHALL display them as agent transcription bubbles (with partial/finished states).
- **R-3.7** (Event-driven): WHEN an `interrupted` event is received, the system SHALL send an `endOfAudio` command to the player worklet and mark the current bubble as interrupted.
- **R-3.8** (Ubiquitous): The Live API run configuration SHALL enable `AudioTranscriptionConfig` for both input and output transcription WHEN the model is a native-audio model.
- **R-3.9** (Ubiquitous): The run configuration SHALL use `StreamingMode.BIDI` with `response_modalities=["AUDIO"]` for native-audio models and `response_modalities=["TEXT"]` for half-cascade models.

**Acceptance Criteria**:
1. Clicking "Start Audio" enables the microphone and disables the button.
2. A system message "Audio mode enabled" appears.
3. The user's speech is transcribed and shown in user bubbles.
4. Forge's spoken responses play through the browser speakers.
5. Forge's speech is transcribed and shown in agent bubbles.
6. Interrupting Forge (speaking over it) stops playback and marks the response as interrupted.

---

### US-4: Topic Research via Google Search

**As a** content creator,
**I want** Forge to research my topic with real web data,
**so that** the video script is grounded in accurate facts, not hallucinated content.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-4.1** (Ubiquitous): The root agent SHALL include `google_search` from `google.adk.tools` as one of its registered tools.
- **R-4.2** (Ubiquitous): The system prompt SHALL instruct Forge to always research before writing scripts and to use real facts only.
- **R-4.3** (Ubiquitous): The `generate_script` tool SHALL accept a `research_context` parameter containing background facts gathered via search.

**Acceptance Criteria**:
1. Forge calls `google_search` before generating a script.
2. Research results are passed to `generate_script` via the `research_context` parameter.
3. The system prompt explicitly prohibits hallucinated facts.

---

### US-5: Script Generation with Scene Illustrations

**As a** content creator,
**I want** Forge to generate a narrated video script with matching scene images for each segment,
**so that** I can review and iterate on the story before committing to full production.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-5.1** (Event-driven): WHEN the `generate_script` tool is called, the system SHALL send a structured prompt to Gemini 2.0 Flash (`gemini-2.0-flash`) requesting `response_modalities=["TEXT", "IMAGE"]` for interleaved output.
- **R-5.2** (Ubiquitous): The prompt SHALL request exactly `max(3, duration_minutes * 2)` scene segments, with total narration targeting `duration_minutes * 140` words (~140 WPM).
- **R-5.3** (Ubiquitous): Each segment SHALL contain a scene description (in `[Scene N: ...]` format), narration text, and a matching illustration image.
- **R-5.4** (Event-driven): WHEN the model returns interleaved text and image parts, the system SHALL parse them into ordered segments, save images as PNG to `outputs/images/`, and record `narration`, `image_path`, `image_id`, `scene_description`, and `duration_seconds` per segment.
- **R-5.5** (Event-driven): WHEN generation completes, the system SHALL store `script_segments`, `script_topic`, and `script_style` in the ADK session state via `tool_context.state`.
- **R-5.6** (Unwanted behavior): IF trailing narration text exists without a paired image, the system SHALL append it to the last segment or create a text-only segment.
- **R-5.7** (Ubiquitous): The tool SHALL return a dict with `status`, `segment_count`, `total_duration_seconds`, and `segments` list.

**Acceptance Criteria**:
1. Calling `generate_script("Ancient Rome", 5, "documentary", "gladiators", "...")` returns 10 segments.
2. Each segment has narration text, a saved PNG image path, and a duration estimate.
3. Session state contains `script_segments` after successful generation.
4. Errors return `status: "error"` with an `error` message and empty segments.

---

### US-6: Voiceover Generation

**As a** content creator,
**I want** Forge to generate a professional voiceover from the script narration,
**so that** the final video has high-quality narration audio.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-6.1** (Event-driven): WHEN the `generate_voiceover` tool is called, the system SHALL send the script text to Google Cloud Text-to-Speech with a Neural2 voice.
- **R-6.2** (Ubiquitous): The audio output SHALL be LINEAR16 WAV at 24kHz sample rate.
- **R-6.3** (Ubiquitous): The tool SHALL request SSML_MARK timepoints for word-level timestamps. IF the TTS response returns no timepoints (plain-text input), the system SHALL estimate timestamps at ~150 WPM adjusted by the speaking rate multiplier.
- **R-6.4** (Ubiquitous): The speaking rate SHALL be configurable (0.5 to 2.0), defaulting to `TTS_DEFAULT_VOICE` env var or `en-US-Neural2-D`.
- **R-6.5** (Event-driven): WHEN synthesis completes, the system SHALL save the WAV to `outputs/audio/` and store `voiceover_id`, `voiceover_path`, `voiceover_duration`, and `word_timestamps` in session state.
- **R-6.6** (Ubiquitous): The tool SHALL return a dict with `status`, `voiceover_id`, `audio_path`, `duration_seconds`, and `word_timestamps`.

**Acceptance Criteria**:
1. Calling `generate_voiceover("Hello world...", "en-US-Neural2-D", 0.95)` produces a WAV file in `outputs/audio/`.
2. `word_timestamps` contains entries with `word` and `start_sec` keys.
3. Session state contains `voiceover_path` after successful generation.
4. The language code is extracted from the first 5 characters of the voice name.

---

### US-7: Thumbnail Generation

**As a** content creator,
**I want** Forge to generate a click-worthy YouTube thumbnail,
**so that** my video gets maximum impressions.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-7.1** (Event-driven): WHEN the `generate_thumbnail` tool is called, the system SHALL first attempt Imagen 3 (`imagen-3.0-generate-002`) via the `google-genai` SDK with Vertex AI, requesting 1 image at 16:9 aspect ratio.
- **R-7.2** (Unwanted behavior): IF Imagen 3 fails (exception or no images returned), the system SHALL fall back to Gemini 2.0 Flash (`gemini-2.0-flash`) with `response_modalities=["IMAGE"]`.
- **R-7.3** (Ubiquitous): The generated image SHALL be resized to exactly 1280x720 pixels using Lanczos resampling and saved as PNG to `outputs/images/`.
- **R-7.4** (Event-driven): WHEN the thumbnail is saved, the system SHALL store `thumbnail_id` and `thumbnail_path` in session state.
- **R-7.5** (Ubiquitous): The tool SHALL return a dict with `status`, `thumbnail_id`, `thumbnail_path`, and `model_used` (indicating which model produced the image).

**Acceptance Criteria**:
1. Calling `generate_thumbnail("Roman Colosseum", "SECRETS OF ROME", "dramatic")` produces a 1280x720 PNG.
2. If Imagen 3 is unavailable, the fallback to Gemini succeeds transparently.
3. The return value includes `model_used` reflecting which model was actually used.
4. Session state contains `thumbnail_path` after success.

---

### US-8: B-Roll Video Generation

**As a** content creator,
**I want** Forge to generate short cinematic B-roll video clips,
**so that** the final video has dynamic visual content beyond static images.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-8.1** (Event-driven): WHEN the `generate_broll` tool is called, the system SHALL submit a video generation request to Veo 2 (`veo-2.0-generate-001`) via the `google-genai` SDK with Vertex AI.
- **R-8.2** (Ubiquitous): The requested duration SHALL be normalized to the nearest Veo-supported value: 4s (if requested <= 5), 6s (if 6-7), or 8s (if >= 8).
- **R-8.3** (Ubiquitous): The video SHALL be requested at 16:9 aspect ratio with `person_generation="allow_adults"`.
- **R-8.4** (State-driven): WHILE the Veo operation is not done, the system SHALL poll every 10 seconds, up to a maximum of 60 attempts (10 minutes).
- **R-8.5** (Event-driven): WHEN the operation completes, the system SHALL download the video -- either from direct bytes or a GCS URI -- and save it as MP4 to `outputs/videos/`.
- **R-8.6** (Event-driven): WHEN the video is saved, the system SHALL append `{video_id, video_path, scene_description, duration_seconds}` to the `broll_ids` list in session state.
- **R-8.7** (Ubiquitous): The tool SHALL return a dict with `status`, `video_id`, `video_path`, `duration_seconds`, and `generation_time_seconds`.
- **R-8.8** (Unwanted behavior): IF the operation times out, the tool SHALL return an error status with a timeout message.

**Acceptance Criteria**:
1. Calling `generate_broll("Aerial shot of Colosseum", 6, "cinematic")` submits a Veo 2 request and polls until complete.
2. The resulting MP4 is saved to `outputs/videos/`.
3. Session state `broll_ids` accumulates entries across multiple calls.
4. Requesting 5 seconds normalizes to 4; requesting 7 normalizes to 6; requesting 9 normalizes to 8.

---

### US-9: Image Editing

**As a** content creator,
**I want to** ask Forge to edit a scene image or thumbnail with natural language instructions,
**so that** I can refine visuals without regenerating from scratch.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-9.1** (Event-driven): WHEN the `edit_image` tool is called, the system SHALL load the referenced image from `outputs/images/` by `image_id`, detect its MIME type from the file extension, and send it to Gemini 2.0 Flash along with the edit instruction using `response_modalities=["IMAGE"]`.
- **R-9.2** (Event-driven): WHEN the model returns an edited image, the system SHALL save it as a new PNG (`edited_{uuid}.png`) in `outputs/images/`.
- **R-9.3** (Event-driven): WHEN the edited image corresponds to a script segment scene (matching `image_id` in `script_segments`), the system SHALL update that segment's `image_id` and `image_path` in session state.
- **R-9.4** (Event-driven): WHEN the edited image corresponds to the thumbnail (matching `thumbnail_id`), the system SHALL update `thumbnail_id` and `thumbnail_path` in session state.
- **R-9.5** (Ubiquitous): The system SHALL maintain an `edit_history` list in session state tracking `{original, edited, instruction}` for each edit operation.
- **R-9.6** (Unwanted behavior): IF the referenced `image_id` does not exist in `outputs/images/`, the tool SHALL return an error status with a descriptive message.

**Acceptance Criteria**:
1. Calling `edit_image("scene_abc123.png", "Make the sky more dramatic")` produces a new edited image.
2. The original image is preserved; the edit creates a new file.
3. If the edited image was a script segment scene, session state `script_segments` is updated.
4. The `edit_history` in session state records the operation.
5. Requesting an edit on a nonexistent image returns an error.

---

### US-10: Video Assembly

**As a** content creator,
**I want** Forge to assemble all generated assets into a final YouTube-ready MP4,
**so that** I can download and upload a complete video.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-10.1** (Event-driven): WHEN the `assemble_video` tool is called, the system SHALL read `script_segments`, `voiceover_path`, and `broll_ids` from session state.
- **R-10.2** (Unwanted behavior): IF no `script_segments` exist in session state, the tool SHALL return an error instructing the user to run `generate_script` first.
- **R-10.3** (Ubiquitous): **Stage 1 (Ken Burns)**: For each script segment with a valid image, the system SHALL create a video segment using FFmpeg's `zoompan` filter, alternating between zoom-in (1.0x to 1.3x) and zoom-out (1.3x to 1.0x) per segment index, at 1920x1080 resolution and 30 FPS. IF no image exists but a B-roll clip is available for that index, the system SHALL use the B-roll clip instead.
- **R-10.4** (Ubiquitous): **Stage 2 (Concat)**: The system SHALL concatenate all segment videos using FFmpeg's concat demuxer with `safe=0`, encoding with libx264 at CRF 23.
- **R-10.5** (Optional behavior): **Stage 3 (Audio)**: IF a voiceover WAV exists at `voiceover_path`, the system SHALL mix it into the concatenated video using AAC encoding at 192kbps with the `-shortest` flag.
- **R-10.6** (Optional behavior): **Stage 3b (Music)**: IF a `background_music` file path is provided and exists, the system SHALL mix it at 15% volume (-15dB) under the narration using FFmpeg's `amix` filter.
- **R-10.7** (Optional behavior): **Stage 4 (Subtitles)**: IF `add_subtitles` is true, the system SHALL generate an SRT file from script segments (splitting narration into ~12-word chunks) and burn it into the video using FFmpeg's `subtitles` filter with Arial font, size 24, white text, black outline, and 40px bottom margin.
- **R-10.8** (Event-driven): WHEN assembly completes, the system SHALL copy the final video to `outputs/final/tubeforge_{build_id}.mp4`, clean up the temporary build directory, and store `video_url` and `video_id` in session state.
- **R-10.9** (Ubiquitous): The tool SHALL return a dict with `status`, `video_path`, `video_id`, `duration_seconds`, and `stages_completed` (list of stage names that succeeded).
- **R-10.10** (Ubiquitous): Each FFmpeg subprocess SHALL have a 300-second (5-minute) timeout. IF FFmpeg is not found at the configured path, the system SHALL try `imageio-ffmpeg` as a fallback before reporting an error.

**Acceptance Criteria**:
1. After running `generate_script` and `generate_voiceover`, calling `assemble_video(True, "")` produces a final MP4 with Ken Burns effects, voiceover, and burned-in subtitles.
2. The `stages_completed` list reflects which stages ran (e.g., `["ken_burns_segments", "concatenation", "voiceover_audio", "subtitles"]`).
3. Non-critical stages (music, subtitles) fail gracefully -- the video is still produced without them.
4. The final video is at 1920x1080, 30fps, libx264/AAC.
5. Session state contains `video_url` and `video_id` after success.

---

### US-11: Asset Download

**As a** content creator,
**I want to** download generated assets (video, images, audio),
**so that** I can use them outside TubeForge.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-11.1** (Event-driven): WHEN a GET request is made to `/api/download/{file_type}/{filename}`, the system SHALL serve the file from `outputs/{file_type}/{filename}` as a `FileResponse` with the original filename.
- **R-11.2** (Unwanted behavior): IF the requested file does not exist, the system SHALL return `{"error": "File not found"}`.
- **R-11.3** (Ubiquitous): The `outputs/` directory SHALL be mounted as static files at `/outputs` for direct access.

**Acceptance Criteria**:
1. `GET /api/download/final/tubeforge_abc123.mp4` returns the video file for download.
2. `GET /api/download/images/thumb_xyz.png` returns the thumbnail image.
3. Requesting a nonexistent file returns a JSON error.

---

### US-12: Niche Style Presets

**As a** content creator,
**I want to** choose from predefined niche styles,
**so that** the voice, pacing, and visual mood match my content type.

**Priority**: Should-have

**Requirements (EARS)**:

- **R-12.1** (Ubiquitous): The system SHALL provide 6 niche presets in `prompts/niche_presets.json`: documentary, facts, story, explainer, horror, and history.
- **R-12.2** (Ubiquitous): Each preset SHALL define: `voice_name` (Cloud TTS Neural2 voice ID), `speaking_rate` (float), `visual_mood` (descriptive string), `music_style` (string), and `pacing` (descriptive string).
- **R-12.3** (Ubiquitous): The Forge system prompt SHALL instruct the agent to ask users about their preferred style (documentary, facts, story, explainer) during the creative direction conversation.

**Acceptance Criteria**:
1. `niche_presets.json` contains all 6 presets with the required keys.
2. The documentary preset uses `en-US-Neural2-D` at 0.92 rate.
3. The horror preset uses `en-US-Neural2-A` at 0.88 rate.
4. The facts preset uses `en-US-Neural2-J` at 1.05 rate.

---

### US-13: Event Console

**As a** developer or advanced user,
**I want to** see a real-time event console showing all WebSocket traffic,
**so that** I can debug agent interactions and understand the pipeline.

**Priority**: Should-have

**Requirements (EARS)**:

- **R-13.1** (Ubiquitous): The frontend SHALL display an event console panel alongside the chat interface.
- **R-13.2** (Event-driven): WHEN a WebSocket event is sent or received, the system SHALL log it to the console with a timestamp, direction indicator (UP/DOWN/ERR), author badge, and summary text.
- **R-13.3** (Event-driven): WHEN an event has associated JSON data, the console entry SHALL be expandable (click to toggle) showing the full JSON payload.
- **R-13.4** (Ubiquitous): Audio events SHALL be hidden by default and only shown when the "Show audio" checkbox is checked.
- **R-13.5** (Ubiquitous): Audio data in console entries SHALL be sanitized to show byte size instead of raw base64 data.
- **R-13.6** (Event-driven): WHEN the "Clear" button is clicked, all console entries SHALL be removed.

**Acceptance Criteria**:
1. Sending a text message creates an "UP" entry in the console.
2. Receiving an agent response creates a "DOWN" entry with expandable JSON.
3. Audio events are hidden unless "Show audio" is checked.
4. Large audio data is displayed as "(X bytes)" not as raw base64.
5. Clicking "Clear" empties the console.

---

### US-14: Connection Management

**As a** content creator,
**I want** the application to manage WebSocket connections reliably,
**so that** I do not lose my session unexpectedly.

**Priority**: Should-have

**Requirements (EARS)**:

- **R-14.1** (Ubiquitous): The frontend SHALL display a connection status indicator (connected/disconnected) in the header.
- **R-14.2** (Event-driven): WHEN the WebSocket connection closes, the system SHALL display a "Reconnecting in 5 seconds..." message and automatically reconnect after 5 seconds.
- **R-14.3** (Ubiquitous): Each session SHALL be identified by `user_id` and `session_id` in the WebSocket URL path: `/ws/{user_id}/{session_id}`.
- **R-14.4** (Event-driven): WHEN a new WebSocket connection opens, the server SHALL get or create an ADK session using `InMemorySessionService` and initialize a `LiveRequestQueue`.
- **R-14.5** (Ubiquitous): The run configuration SHALL include `SessionResumptionConfig` for session continuity.
- **R-14.6** (Event-driven): WHEN the WebSocket disconnects or errors, the server SHALL close the `LiveRequestQueue`.

**Acceptance Criteria**:
1. The status indicator shows green/connected when the WebSocket is open.
2. The status indicator shows red/disconnected when the WebSocket closes.
3. After disconnection, the system reconnects automatically within 5 seconds.
4. A system message informs the user about connection state changes.

---

### US-15: Health Check Endpoint

**As a** deployment engineer,
**I want** a health check endpoint,
**so that** Cloud Run can verify the service is running.

**Priority**: Should-have

**Requirements (EARS)**:

- **R-15.1** (Event-driven): WHEN a GET request is made to `/api/health`, the system SHALL return `{"status": "ok", "app": "tubeforge"}` with HTTP 200.

**Acceptance Criteria**:
1. `GET /api/health` returns 200 with the expected JSON body.

---

### US-16: Forge Persona and Creative Direction

**As a** content creator,
**I want** Forge to behave as an enthusiastic creative director with a distinct personality,
**so that** the interaction feels like collaborating with a real creative professional.

**Priority**: Should-have

**Requirements (EARS)**:

- **R-16.1** (Ubiquitous): The system prompt SHALL define Forge as an "expert AI Creative Director specializing in YouTube explainer and documentary content."
- **R-16.2** (Ubiquitous): Forge SHALL follow a defined workflow: (1) identify the image subject, (2) express enthusiasm, (3) ask about preferences (duration: 3/5/7/10 min; style; focus angle), (4) research via google_search, (5) generate script, (6) let user review and iterate, (7) generate voiceover/thumbnail/broll, (8) assemble final video.
- **R-16.3** (Ubiquitous): Forge SHALL address the user as "creator" and maintain a creative, knowledgeable, conversational tone.
- **R-16.4** (Ubiquitous): Forge SHALL target 130-150 words per minute for narration scripts and hook viewers in the first 10 seconds.

**Acceptance Criteria**:
1. The system prompt file at `prompts/system_prompt.txt` contains the full persona definition.
2. The agent loads the system prompt at startup with a fallback string if the file is missing.
3. Forge's behavior in conversation matches the workflow described in the prompt.

---

### US-17: Session State Management

**As a** developer,
**I want** all tools to share state through the ADK session state,
**so that** downstream tools can access assets generated by upstream tools.

**Priority**: Must-have

**Requirements (EARS)**:

- **R-17.1** (Ubiquitous): The following keys SHALL be written to `tool_context.state` by their respective tools:

| Key | Written by | Type | Description |
|-----|------------|------|-------------|
| `script_segments` | `generate_script` | `list[dict]` | Ordered list of scene segments |
| `script_topic` | `generate_script` | `str` | Topic of the generated script |
| `script_style` | `generate_script` | `str` | Style of the generated script |
| `voiceover_id` | `generate_voiceover` | `str` | Unique voiceover identifier |
| `voiceover_path` | `generate_voiceover` | `str` | Absolute path to WAV file |
| `voiceover_duration` | `generate_voiceover` | `float` | Audio duration in seconds |
| `word_timestamps` | `generate_voiceover` | `list[dict]` | Word-level timing data |
| `thumbnail_id` | `generate_thumbnail` | `str` | Thumbnail filename |
| `thumbnail_path` | `generate_thumbnail` | `str` | Absolute path to thumbnail PNG |
| `broll_ids` | `generate_broll` | `list[dict]` | Accumulated B-roll clip metadata |
| `edit_history` | `edit_image` | `list[dict]` | History of image edits |
| `video_url` | `assemble_video` | `str` | Path to the final MP4 |
| `video_id` | `assemble_video` | `str` | Filename of the final MP4 |

- **R-17.2** (Ubiquitous): `assemble_video` SHALL read `script_segments`, `voiceover_path`, and `broll_ids` from session state.
- **R-17.3** (Ubiquitous): `edit_image` SHALL read and update `script_segments` and `thumbnail_id`/`thumbnail_path` in session state as applicable.

**Acceptance Criteria**:
1. After `generate_script`, session state contains `script_segments`, `script_topic`, `script_style`.
2. After `generate_voiceover`, session state contains `voiceover_path` and `word_timestamps`.
3. `assemble_video` fails gracefully with a clear error if `script_segments` is missing.
4. `edit_image` updates the correct segment or thumbnail reference in state.

---

### US-18: Error Handling and Resilience

**As a** content creator,
**I want** each tool to handle errors gracefully,
**so that** a single failure does not crash the entire session.

**Priority**: Should-have

**Requirements (EARS)**:

- **R-18.1** (Ubiquitous): Every tool function SHALL wrap its entire body in a try/except block and return a dict with `status: "error"` and an `error` message string on any exception.
- **R-18.2** (Ubiquitous): Non-critical assembly stages (background music, subtitles) SHALL fail gracefully -- the video is still produced without them.
- **R-18.3** (Ubiquitous): The `generate_thumbnail` tool SHALL implement a two-tier fallback: Imagen 3 primary, Gemini 2.0 Flash secondary.
- **R-18.4** (Ubiquitous): The `generate_broll` tool SHALL implement a timeout after 10 minutes of polling and return an error status.

**Acceptance Criteria**:
1. No tool function raises an unhandled exception to the agent.
2. Every error return includes `status: "error"` and a human-readable `error` string.
3. Video assembly continues if subtitle burn-in fails.
4. Thumbnail generation tries Gemini when Imagen fails.

---

### US-19: Cloud Deployment Readiness

**As a** deployment engineer,
**I want** the application to be deployable to Cloud Run,
**so that** it can scale and be publicly accessible.

**Priority**: Nice-to-have

**Requirements (EARS)**:

- **R-19.1** (Ubiquitous): The application SHALL be runnable via `uvicorn app:app --host 0.0.0.0 --port 8080`.
- **R-19.2** (Ubiquitous): The port SHALL be configurable via the `PORT` environment variable, defaulting to 8080.
- **R-19.3** (Ubiquitous): All secrets and configuration SHALL be loaded from `.env` via `python-dotenv`, loaded before agent import.
- **R-19.4** (Ubiquitous): The application SHALL be deployable via `adk deploy cloud_run` with `--with_ui` flag.
- **R-19.5** (Ubiquitous): Vertex AI SHALL be used for all model calls (`GOOGLE_GENAI_USE_VERTEXAI=TRUE`).

**Acceptance Criteria**:
1. `python -m uvicorn app:app --port 8080` starts the server.
2. `PORT=9090 python app.py` starts on port 9090.
3. No hardcoded secrets exist in source code.
4. All `genai.Client(vertexai=True)` calls use Vertex AI.

---

### US-20: ADK Dev Mode

**As a** developer,
**I want to** run the agent in ADK's built-in web UI for rapid testing,
**so that** I can iterate on agent behavior without the full custom frontend.

**Priority**: Nice-to-have

**Requirements (EARS)**:

- **R-20.1** (Ubiquitous): The agent module SHALL expose a `root_agent` variable that ADK's `adk web` command can discover.
- **R-20.2** (Ubiquitous): The `__init__.py` SHALL import from the `agent` module to make the package loadable by ADK.

**Acceptance Criteria**:
1. Running `adk web tubeforge/` starts the ADK dev UI with Forge loaded.
2. All 7 tools are available in the ADK UI tool list.

---

## 4. Non-Functional Requirements

### NFR-1: Performance
- **NFR-1.1**: Each FFmpeg subprocess SHALL complete within 300 seconds (5-minute timeout per stage).
- **NFR-1.2**: Veo 2 B-roll generation SHALL complete within 600 seconds (10-minute polling limit).
- **NFR-1.3**: Audio recording SHALL use 16kHz sample rate; audio playback SHALL use 24kHz sample rate.

### NFR-2: Compatibility
- **NFR-2.1**: The application SHALL require Python 3.10 or later.
- **NFR-2.2**: The frontend SHALL work in modern browsers supporting WebSocket, AudioWorklet, and getUserMedia APIs.
- **NFR-2.3**: FFmpeg SHALL be located via system PATH, `imageio-ffmpeg` package, or `FFMPEG_PATH` environment variable.

### NFR-3: Output Quality
- **NFR-3.1**: Final videos SHALL be encoded at 1920x1080 resolution, 30 FPS, libx264, CRF 23.
- **NFR-3.2**: Audio SHALL be encoded as AAC at 192kbps.
- **NFR-3.3**: Thumbnails SHALL be exactly 1280x720 pixels.

### NFR-4: Dependencies
- **NFR-4.1**: Required Python packages: `google-adk>=1.20.0`, `fastapi>=0.115.0`, `uvicorn[standard]>=0.30.0`, `python-dotenv>=1.0.0`, `google-cloud-texttospeech>=2.16.0`, `google-cloud-storage>=2.14.0`, `pillow>=10.4.0`, `imageio-ffmpeg>=0.5.1`.
- **NFR-4.2**: Runtime dependency: FFmpeg (system-installed or via imageio-ffmpeg).

### NFR-5: Security
- **NFR-5.1**: All secrets SHALL be stored in `.env` files, never committed to version control.
- **NFR-5.2**: Session state SHALL use in-memory storage (no persistence across restarts).

---

## 5. Constraints

- **C-1**: This is a solo hackathon entry for the Gemini Live Agent Challenge on Devpost (deadline: March 17, 2026).
- **C-2**: The agent model MUST be `gemini-live-2.5-flash-native-audio` (or configurable via `DEMO_AGENT_MODEL` env var).
- **C-3**: Google ADK (`google-adk`) MUST be the primary agent framework.
- **C-4**: All Vertex AI model calls MUST use the `google-genai` SDK with `vertexai=True`.
- **C-5**: The application MUST serve both the API and frontend from a single FastAPI process.

---

## 6. Glossary

| Term | Definition |
|------|------------|
| ADK | Google Agent Development Kit -- framework for building AI agents |
| Forge | The AI Creative Director persona |
| Ken Burns Effect | Slow zoom/pan applied to static images for visual motion |
| B-roll | Supplementary footage that provides visual variety |
| Interleaved Output | Gemini response containing alternating text and image parts |
| Neural2 | Google Cloud TTS voice family with high-quality neural synthesis |
| Veo 2 | Google's video generation model |
| Imagen 3 | Google's image generation model |
| EARS | Easy Approach to Requirements Syntax (Event/Ubiquitous/Unwanted/State/Optional) |
| BIDI | Bidirectional streaming mode for real-time agent interaction |
| PCM | Pulse Code Modulation -- uncompressed audio format |
| CRF | Constant Rate Factor -- FFmpeg quality parameter (lower = better) |
| SRT | SubRip Text -- subtitle file format |
| LiveRequestQueue | ADK class for sending content/audio to a live agent session |
