# Frontend Redesign — Hybrid Approach

## Goal
Replace dark 3-panel studio with polished light-theme UI using voice orb hero + pipeline view + detail drawer. Keep single-session WebSocket/audio model. Swap third-party API refs for Google/Vertex AI.

## Design Decisions
- **Tailwind CSS** (CDN) + Material Symbols — matches mockups
- **Single-session model preserved** — no multi-project kanban
- **Voice orb hero** — prominent mic button with pulse animation, transcript display
- **Pipeline as horizontal steps** (not kanban columns) — Research > Script > Voice > Visuals > Final
- **Detail drawer** — slides in from right to show script editor, visual previews, metadata
- **Sidebar** — TubeForge branding, Content DNA selector, connection status
- **Settings references** — Google Cloud TTS, Vertex AI (Imagen 3, Veo 2), Gemini — NO ElevenLabs/Midjourney/OpenAI
- **Keep all JS modules** — app.js, ui.js, audio-player.js, audio-recorder.js, PCM worklets

## Files to Change
1. `frontend/index.html` — Complete rewrite (Tailwind + new layout)
2. `frontend/style.css` — Minimal custom styles (animations, scrollbar, Tailwind overrides only)
3. `frontend/src/ui.js` — Update DOM selectors for new HTML structure
4. `frontend/src/app.js` — Update DOM refs, keep all WebSocket/audio logic

## Layout Structure
```
body (flex, h-screen)
├── aside.sidebar (w-60, fixed left)
│   ├── Logo + branding
│   ├── Nav (Dashboard active, Archives, Settings)
│   ├── Content DNA selector button
│   └── Connection status badge
├── main (flex-1, flex-col)
│   ├── section.voice-hero (h-56, voice orb + transcript)
│   ├── section.pipeline-bar (h-16, horizontal step indicators)
│   ├── section.workspace (flex-1, script preview / upload hero)
│   └── footer.status-bar
└── aside.detail-drawer (slide-in from right, hidden by default)
    ├── Header (title + status)
    ├── Tabs (Script, Audio, Visuals, Metadata)
    ├── Content area (script editor, visual grid)
    └── Footer (actions)
```

## Not Implementing (YAGNI for demo)
- Multi-project kanban board
- Settings page (no API key management UI needed — all via .env)
- Content DNA modal (preset selector in sidebar is enough)
- User accounts / billing / credits display
