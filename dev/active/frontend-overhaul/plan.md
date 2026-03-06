# Frontend Overhaul — Complete Studio UI

## Goal
Transform TubeForge from basic chat+console into a professional dark "Creative Studio"
interface — 3-panel layout with pipeline progress, script preview, asset gallery,
and video download.

## Design Decisions
- **Layout**: Chat (left 320px) | Workspace (center flex) | Output (right 340px)
- **Theme**: Dark (#08080d base) with YouTube red accent (#ff3d3d)
- **Console**: Bottom drawer (hidden by default, toggle in status bar)
- **Pipeline**: 6 stages — Research > Script > Voiceover > Thumbnail > B-Roll > Assembly
- **Tool detection**: Watch ADK events for toolCall/functionCall + text fallback

## Files Modified
| File | Action | Description |
|------|--------|-------------|
| `frontend/index.html` | Rewrite | 3-panel studio layout |
| `frontend/style.css` | Rewrite | Dark theme (~750 lines) |
| `frontend/src/app.js` | Rewrite | Add upload, tool detection, asset handling |
| `frontend/src/ui.js` | NEW | Pipeline state, previews, gallery |
| `app.py` | Edit | Add /api/assets endpoint |
| `.env.example` | Edit | Fix model name |

## Files Unchanged
- `agent.py`, all tools, audio-player.js, audio-recorder.js, worklet processors

## Tasks
- [x] Plan
- [x] Write index.html (3-panel studio layout, ~170 lines)
- [x] Write style.css (dark theme, ~680 lines)
- [x] Write app.js (upload, tool detection, audio, camera, ~500 lines)
- [x] Write ui.js (pipeline, previews, gallery, timer, ~280 lines)
- [x] Edit app.py (added /api/assets endpoint)
- [x] Fix .env.example (corrected model name)
- [x] Verify server starts (all imports OK, all routes registered)
