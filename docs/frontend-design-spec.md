# Vigil — Frontend Design Specification

> Voice-First IT Support + Real-Time Scam Shield
> Updated: 2026-03-16
> Stack: Vite + Web Components + Web Audio API
> Theme: Dark with glassmorphism accents

---

## 1. Design Philosophy

### Core Principle: "Speak. See. Resolve."

The user speaks to Theepa, sees real-time diagnostics and shield alerts, and gets issues resolved through voice conversation. The interface stays out of the way during voice interaction and surfaces relevant information contextually.

### Design Pillars

| Pillar | Description | Implementation |
|--------|-------------|----------------|
| **Voice-First** | Voice is the primary input. The mic/audio visualizer is the hero element. | Large audio visualizer orb, no prominent text input |
| **Real-Time Transparency** | Users see every tool call, diagnostic step, and shield scan as it happens. | Live activity feed, diagnostic tracker, agent guidance panel |
| **Dark + Glassmorphism** | Professional dark theme with frosted glass panels and subtle depth. | `--bg-primary: #0a0a0f`, blur/saturate backdrop filters, subtle borders |
| **Progressive Disclosure** | Start simple, reveal detail on demand. | Collapsible panels, expandable tool call results |

---

## 2. Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0a0a0f` | Page background |
| `--bg-surface` | `rgba(255,255,255,0.04)` | Card/panel background |
| `--bg-glass` | `rgba(255,255,255,0.06)` | Glassmorphism panels |
| `--text-primary` | `#e8e8ed` | Primary text |
| `--text-secondary` | `#8e8e93` | Secondary/muted text |
| `--accent-blue` | `#3b82f6` | Active states, links |
| `--accent-green` | `#22c55e` | Success, safe, resolved |
| `--accent-red` | `#ef4444` | Threats, errors, critical |
| `--accent-amber` | `#f59e0b` | Warnings, medium risk |
| `--accent-purple` | `#a855f7` | Agent activity, tool calls |

### Typography

- Font: `Inter` (UI), `JetBrains Mono` (code/technical)
- Scale: 12px (caption), 14px (body), 16px (subtitle), 20px (title), 28px (hero)

### Glassmorphism Recipe

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
```

---

## 3. Web Components (10)

### `<app-root>`
Top-level shell. Manages routing between views, holds global WebSocket connection, and dispatches events to child components.

- Owns the WebSocket connection to `/ws`
- Routes: `/` (home), `/session/:token` (active session), `/summary/:token` (post-session)
- Provides shared state via custom events

### `<view-home>`
Landing page. Displays Vigil branding, session start button, and recent session history.

- Hero section with animated logo and tagline
- "Start Session" button (initiates WebSocket + mic access)
- Recent sessions list (stored in localStorage)
- Shield status indicator (extension connected / not detected)

### `<view-session>`
Active voice session view. The main workspace during a helpdesk conversation.

- Layout: 3-column on desktop (transcript | center stage | side panels)
- Center: `<audio-visualizer>` orb + session controls (mute, end, share screen)
- Left: `<live-transcript>` with scrolling conversation
- Right: `<diagnostic-tracker>` + `<issue-panel>` + `<agent-guidance>`
- Bottom: `<dev-panel>` (collapsible, for debugging)
- Responsive: stacks vertically on tablet/mobile

### `<view-summary>`
Post-session summary. Shown after session ends.

- Session duration, tool calls count, issues created
- Full transcript (downloadable as .txt)
- Diagnostic report (downloadable as .txt)
- ITSM tickets created during session (with IDs and status)
- Shield scan results if any were triggered
- CSAT rating input (1-5 stars + comment)

### `<live-transcript>`
Real-time scrolling transcript of the conversation.

- Messages styled by role: user (right-aligned, blue), agent (left-aligned, white)
- Tool call entries inline (purple, collapsible to show args + result)
- Auto-scrolls to bottom, with "scroll to latest" button when manually scrolled up
- Timestamps on each message

### `<diagnostic-tracker>`
Visual representation of the 4-stage diagnostic state machine.

- Stages: GREETING, GATHERING, DIAGNOSING, RESOLUTION
- Active stage highlighted with pulse animation
- Each stage shows relevant findings (detected error codes, matched KB articles)
- Compact pill layout that expands on click

### `<issue-panel>`
Displays issues and ITSM tickets created during the session.

- Issue cards: ID, category, severity badge, description
- ITSM ticket cards: ticket number, status, assignee, priority
- Real-time updates when `create_issue`, `create_itsm_ticket`, or `update_itsm_ticket` fires
- Badge count on panel header

### `<agent-guidance>`
Shows what Theepa is doing and suggested next steps.

- Current agent action: "Searching knowledge base...", "Creating ITSM ticket..."
- Suggested user actions: "Try clearing your browser cache", "Navigate to Settings > Security"
- Shield alerts: threat warnings with severity and details
- Animated indicator when agent is thinking or executing a tool

### `<audio-visualizer>`
Central voice interaction orb with real-time audio visualization.

- Circular orb with radial frequency bars (Web Audio API AnalyserNode)
- States: idle (subtle pulse), listening (blue glow), speaking (green glow), processing (purple glow)
- Click to mute/unmute
- Uses AudioWorklet processors from `public/audio-processors/`

### `<dev-panel>`
Developer/debug panel (collapsible, bottom of session view).

- Raw WebSocket message log
- Tool call timeline with execution duration
- Session state JSON viewer
- Model info and token usage (if available)
- Toggle: hidden by default, shown via keyboard shortcut or URL param `?dev=1`

---

## 4. Real-Time Activity Feed

All components subscribe to a shared event bus driven by WebSocket messages:

| WebSocket Event | Component Updated | Visual Effect |
|-----------------|-------------------|---------------|
| `transcript` | `<live-transcript>` | New message bubble appears |
| `tool_call` | `<live-transcript>`, `<diagnostic-tracker>`, `<agent-guidance>` | Purple tool badge + tracker update |
| `state` | `<diagnostic-tracker>` | Stage transition animation |
| `shield_alert` | `<agent-guidance>`, `<issue-panel>` | Red alert card with threat details |
| `audio` | `<audio-visualizer>` | Orb animates to speaking state |
| `error` | `<agent-guidance>` | Error toast notification |

---

## 5. WebSocket Integration

```javascript
// Simplified connection flow in <app-root>
const ws = new WebSocket(`wss://${host}/ws`);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // Dispatch to all listening components
  document.dispatchEvent(new CustomEvent('ws-message', { detail: msg }));
};

// Audio sending (from AudioWorklet)
audioProcessor.port.onmessage = (e) => {
  ws.send(e.data); // Raw PCM bytes
};
```

Each Web Component listens for `ws-message` events and filters by message type.

---

## 6. Layout

### Desktop (1200px+)

```
┌──────────────────────────────────────────────────┐
│  Header: Vigil logo | Session ID | Shield status │
├────────────┬─────────────────┬───────────────────┤
│            │                 │                    │
│  Live      │  Audio          │  Diagnostic        │
│  Transcript│  Visualizer     │  Tracker           │
│            │  + Controls     │                    │
│  (scrolls) │                 │  Issue Panel       │
│            │                 │                    │
│            │                 │  Agent Guidance    │
│            │                 │                    │
├────────────┴─────────────────┴───────────────────┤
│  Dev Panel (collapsible)                         │
└──────────────────────────────────────────────────┘
```

### Tablet (768-1199px)
Two columns: transcript left, visualizer + panels right (stacked).

### Mobile (<768px)
Single column: visualizer top, transcript below, panels in bottom sheet drawer.

---

## 7. Animations

| Element | Animation | Duration |
|---------|-----------|----------|
| Audio orb idle | Subtle scale pulse (1.0-1.02) | 2s ease-in-out loop |
| Audio orb active | Frequency-driven radial bars | Real-time (60fps via requestAnimationFrame) |
| Stage transition | Slide + fade between diagnostic stages | 300ms ease |
| Tool call appear | Slide in from left + fade | 200ms ease-out |
| Shield alert | Shake + red flash | 400ms |
| Glass panels | Fade in on mount | 150ms ease |
| Message bubble | Slide up + fade in | 150ms ease-out |

---

## 8. Build & Serve

```bash
cd frontend
npm install
npm run dev      # Development with HMR (port 5173)
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

Production build output is served by FastAPI as static files from `frontend/dist/`.

Audio worklet processors live in `frontend/public/audio-processors/` and are loaded at runtime by the Web Audio API.
