# Gemini Live Agent Challenge — Hackathon Project

## Hackathon Info
- **Deadline**: Mar 17, 2026 @ 5:30am GMT+5:30
- **Prize Pool**: $80,000 in cash
- **Platform**: Devpost — https://geminiliveagentchallenge.devpost.com/
- **Team**: KaarTech UK

## Mandatory Requirements
- Must use a **Gemini model**
- Must use **Google GenAI SDK** or **ADK** (Agent Development Kit)
- Must use at least one **Google Cloud** service
- Backend must be **hosted on Google Cloud**

## Categories (pick one)
1. **Live Agents** — Real-time audio/vision interaction via Gemini Live API or ADK
2. **Creative Storyteller** — Multimodal storytelling with interleaved text/image/audio/video output
3. **UI Navigator** — Visual UI understanding & interaction via screenshots/screen recordings

## Judging Criteria
- Innovation & Multimodal UX (40%)
- Technical Implementation & Agent Architecture (30%)
- Demo & Presentation (30%)

## Submission Requirements
- Text description of features, tech, findings
- Public code repository with spin-up instructions in README
- Proof of Google Cloud deployment (screen recording or code file)
- Architecture diagram
- Demo video (<4 min)

## Quick Start
```bash
# TODO: Update after choosing stack
pip install google-genai google-adk google-cloud-aiplatform
python main.py
```

## Build & Test Commands
```bash
# TODO: Update after project structure is set
pip install -r requirements.txt
python -m pytest tests/
```

## Architecture
<!-- TODO: Fill in after choosing category and designing system -->
- Frontend: TBD
- Backend: Python + Google ADK/GenAI SDK
- Cloud: Google Cloud (Vertex AI / Cloud Run / Cloud Functions)
- Model: Gemini (via Live API or GenAI SDK)

## Project Structure
```
.
├── CLAUDE.md                 # This file — project brain
├── main.md                   # Hackathon challenge details
├── resources.md              # Hackathon resource links
├── docs/                     # Planning & design documents
├── dev/active/               # Active task dev docs
├── .claude/                  # Claude Code config
│   ├── commands/             # Slash commands
│   ├── agents/               # Subagent definitions
│   └── skills/               # Project-specific skills
├── feature_list.json         # Cross-session feature tracking
└── claude-progress.txt       # Session progress log
```

## Key Conventions
- Python 3.11+ with type hints
- Use `google-genai` SDK or `google-adk` for agent logic
- All secrets via environment variables (never commit .env)
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- Document first, then implement (per user preference)

## Key Resources
- [Multimodal Live API samples](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/multimodal-live-api)
- [ADK Bidi Streaming Guide](https://google.github.io/adk-docs/streaming/dev-guide/part1/)
- [ADK Bidi Demo](https://github.com/google/adk-samples/tree/main/python/agents/bidi-demo)
- [GenMedia Live Sample App](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/vision/sample-apps/genmedia-live)
- [Computer Use samples](https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/computer-use)

## Common Mistakes
<!-- Add mistakes as you find them -->

## Dev Docs
When starting large tasks:
1. Create directory: `mkdir -p dev/active/[task-name]/`
2. Create files: `[task-name]-plan.md`, `[task-name]-context.md`, `[task-name]-tasks.md`
3. Update regularly: Mark tasks complete immediately

When continuing tasks:
- Check `dev/active/` for existing tasks
- Read all three files before proceeding
- Update "Last Updated" timestamps
