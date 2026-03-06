# TubeForge — Frontend Design Specification

> Version: 2.0 | Date: 2026-03-06 | Target: Google Stitch / AI Code Generation
> Pattern: Voice-First Creative Kanban + Content DNA System
> UI Library: shadcn/ui (Tailwind CSS) | Theme: Light
> Framework: React (or vanilla — Stitch-compatible component spec)

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Design System](#2-design-system)
3. [Layout Architecture](#3-layout-architecture)
4. [Navigation & Routing](#4-navigation--routing)
5. [Page: Create Video](#5-page-create-video)
6. [Page: Content DNAs](#6-page-content-dnas)
7. [Shared Components](#7-shared-components)
8. [Screen States & Transitions](#8-screen-states--transitions)
9. [Animation & Motion](#9-animation--motion)
10. [Data Flow & State Management](#10-data-flow--state-management)
11. [WebSocket Protocol](#11-websocket-protocol)
12. [Responsive Behavior](#12-responsive-behavior)
13. [Accessibility](#13-accessibility)
14. [Component Tree](#14-component-tree)
15. [Content DNA Schema](#15-content-dna-schema)

---

## 1. Design Philosophy

### Core Principle: "Select DNA. Talk. Watch. Download."

The user selects a Content DNA (their channel's creative identity), uploads a photo, talks to Forge, watches their video materialize on a kanban board, and downloads a consistent, on-brand result. Every generation follows the DNA.

### Design Pillars

| Pillar | Description | Implementation |
|--------|-------------|----------------|
| **Voice-First** | Voice is the primary input. Text is fallback. The mic visualizer is the hero element. | Large voice orb center-top. No prominent text input. |
| **DNA-Driven** | Every generation is shaped by a Content DNA profile. Consistency across videos. | DNA selector prominent in Create page. DNA colors tint the workspace. |
| **Visible Pipeline** | Users see exactly what Forge is doing. Kanban columns fill left-to-right. | 5-column board with cards appearing in real-time. |
| **Clean & Light** | Light theme, generous whitespace, shadcn components. Professional but not cold. | White/gray backgrounds, subtle shadows, crisp typography. |
| **Sidebar Navigation** | Persistent sidebar for switching between sections. Content swaps in main area. | Collapsible sidebar with icon + label nav items. |

### Anti-Patterns

- No dark/hacker aesthetic — this is a creative studio, light and inviting
- No chat-app layout — this is NOT a chatbot interface
- No visible complexity — hide advanced options behind menus/sheets
- No custom component styling where shadcn provides one — use the library
- No loading spinners — use shadcn Skeleton components
- No excessive borders — use shadows and background contrast for depth

---

## 2. Design System

### 2.1 shadcn/ui Foundation

Use shadcn/ui with the **"New York"** style variant (sharper radius, more refined). All components from the shadcn registry: Button, Card, Badge, Input, Select, Dialog, Sheet, Tabs, Avatar, Tooltip, Skeleton, Progress, Separator, DropdownMenu, Command, ScrollArea, Toast.

### 2.2 Color Palette (Light Theme)

#### Base Colors (shadcn CSS variables)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#ffffff` | Page background |
| `--foreground` | `#0a0a0a` | Primary text |
| `--card` | `#ffffff` | Card backgrounds |
| `--card-foreground` | `#0a0a0a` | Card text |
| `--popover` | `#ffffff` | Popover/dropdown backgrounds |
| `--popover-foreground` | `#0a0a0a` | Popover text |
| `--primary` | `#dc2626` | TubeForge red (YouTube red) — CTAs, active states |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--secondary` | `#f5f5f5` | Secondary buttons, subtle backgrounds |
| `--secondary-foreground` | `#171717` | Text on secondary |
| `--muted` | `#f5f5f5` | Muted backgrounds, disabled states |
| `--muted-foreground` | `#737373` | Muted text, placeholders, labels |
| `--accent` | `#f5f5f5` | Hover backgrounds |
| `--accent-foreground` | `#171717` | Text on accent |
| `--destructive` | `#ef4444` | Error states |
| `--destructive-foreground` | `#ffffff` | Text on destructive |
| `--border` | `#e5e5e5` | Default borders |
| `--input` | `#e5e5e5` | Input borders |
| `--ring` | `#dc2626` | Focus rings (matches primary) |
| `--radius` | `0.5rem` | Default border radius (shadcn "New York") |

#### Pipeline Column Colors

| Token | Hex | Column | Semantic |
|-------|-----|--------|----------|
| `--col-research` | `#3b82f6` | Research | Blue — knowledge |
| `--col-research-light` | `#eff6ff` | Research bg | |
| `--col-script` | `#8b5cf6` | Script | Purple — creativity |
| `--col-script-light` | `#f5f3ff` | Script bg | |
| `--col-voice` | `#22c55e` | Voiceover | Green — audio |
| `--col-voice-light` | `#f0fdf4` | Voice bg | |
| `--col-visuals` | `#f97316` | Visuals | Orange — media |
| `--col-visuals-light` | `#fff7ed` | Visuals bg | |
| `--col-final` | `#dc2626` | Final | Red — output |
| `--col-final-light` | `#fef2f2` | Final bg | |

#### Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--status-success` | `#22c55e` | Connected, complete |
| `--status-warning` | `#eab308` | In-progress, generating |
| `--status-error` | `#ef4444` | Disconnected, failed |
| `--status-info` | `#3b82f6` | Informational |

### 2.3 Typography

#### Font Stack

```css
--font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace;
```

Load Inter (400, 500, 600, 700) from Google Fonts.

#### Type Scale (matches shadcn defaults)

| Name | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|----------------|-------|
| `display` | 30px | 700 | 1.2 | -0.5px | Empty state headlines |
| `h1` | 24px | 700 | 1.3 | -0.3px | Page titles |
| `h2` | 20px | 600 | 1.35 | -0.2px | Section titles |
| `h3` | 16px | 600 | 1.4 | 0 | Card titles, column headers |
| `h4` | 14px | 600 | 1.4 | 0 | Sub-headers |
| `body` | 14px | 400 | 1.6 | 0 | Body text |
| `body-sm` | 13px | 400 | 1.5 | 0 | Card content, descriptions |
| `caption` | 12px | 500 | 1.4 | 0.2px | Labels, metadata |
| `overline` | 11px | 600 | 1.2 | 0.8px | Column headers, section labels (uppercase) |
| `micro` | 10px | 500 | 1.2 | 0.5px | Badges, status bar |

### 2.4 Spacing

Tailwind's default spacing scale. Key values:

| Tailwind Class | Value | Usage |
|----------------|-------|-------|
| `gap-1` / `p-1` | 4px | Tight gaps |
| `gap-2` / `p-2` | 8px | Default component gaps |
| `gap-3` / `p-3` | 12px | Card padding |
| `gap-4` / `p-4` | 16px | Section gaps |
| `gap-5` / `p-5` | 20px | Between major sections |
| `gap-6` / `p-6` | 24px | Large section padding |
| `gap-8` / `p-8` | 32px | Voice zone padding |
| `gap-10` / `p-10` | 40px | Major layout gaps |

### 2.5 Shadows (shadcn defaults)

| Name | Value | Usage |
|------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle card depth |
| `shadow` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Default card shadow |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)` | Hover cards |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Modals, floating panels |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` | Large modals |

### 2.6 Border Radius

| Tailwind Class | Value | Usage |
|----------------|-------|-------|
| `rounded-sm` | 4px | Small elements, tags |
| `rounded-md` | 6px | Buttons, inputs (shadcn default) |
| `rounded-lg` | 8px | Cards |
| `rounded-xl` | 12px | Large cards, modals |
| `rounded-2xl` | 16px | Hero elements |
| `rounded-full` | 9999px | Pills, avatars, voice orb |

### 2.7 Z-Index

| Layer | Value | Usage |
|-------|-------|-------|
| Base content | 0 | Default |
| Kanban cards | 10 | Card hover lift |
| Sidebar | 40 | Persistent sidebar |
| Header | 50 | Sticky header (within main area) |
| Dropdown/Popover | 100 | shadcn popover default |
| Sheet/Drawer | 200 | Console, DNA editor sheet |
| Dialog/Modal | 300 | Lightbox, camera modal |
| Toast | 400 | Toast notifications |

---

## 3. Layout Architecture

### 3.1 Root Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─────────┐  ┌──────────────────────────────────────────────────┐   │
│  │         │  │                                                  │   │
│  │ SIDEBAR │  │              MAIN CONTENT AREA                   │   │
│  │         │  │                                                  │   │
│  │  64px   │  │  (swaps based on active nav item)                │   │
│  │ (icon)  │  │                                                  │   │
│  │         │  │  Currently: Create Video page                    │   │
│  │  or     │  │            OR Content DNAs page                  │   │
│  │         │  │            OR placeholder pages                  │   │
│  │ 240px   │  │                                                  │   │
│  │(expanded)│  │                                                  │   │
│  │         │  │                                                  │   │
│  │         │  │                                                  │   │
│  └─────────┘  └──────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 CSS Layout

```css
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--background);
}

.sidebar {
  width: 64px;                    /* collapsed */
  /* width: 240px;               /* expanded */
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: var(--card);
  display: flex;
  flex-direction: column;
  transition: width 200ms ease;
  z-index: 40;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
```

---

## 4. Navigation & Routing

### 4.1 Sidebar Component

**Width**: 64px collapsed (icons only), 240px expanded (icons + labels).
**Toggle**: Hamburger/collapse button at top of sidebar, or hover to peek-expand.
**Background**: `var(--card)` (white). Right border: `1px solid var(--border)`.

**Structure** (top to bottom):

```
┌─────────────────────┐
│  ☰  TubeForge       │  <- Logo row (logo icon + text when expanded)
├─────────────────────┤
│                     │
│  ▶  Create          │  <- Primary nav (active = red accent bar left)
│  🧬 Content DNAs    │  <- Primary nav
│                     │
│  ─────────────────  │  <- Separator
│                     │
│  📁 Projects        │  <- Secondary nav (ghosted, "Coming Soon" tooltip)
│  🖼  Assets          │  <- Secondary nav (ghosted)
│                     │
│                     │
│                     │
│                     │
│  ─────────────────  │  <- Separator (near bottom)
│  ⚙  Settings        │  <- Bottom nav (ghosted)
│  ○  Connection      │  <- Connection status indicator
└─────────────────────┘
```

#### Nav Item Anatomy

**Collapsed (64px)**:
- Icon only, 20px, centered horizontally.
- Padding: `12px 0`. Total item height: 44px.
- `rounded-md` on hover background.
- **Active**: Left border accent bar, 3px wide, `var(--primary)`. Icon color: `var(--primary)`. Background: `var(--primary)/5%`.
- **Inactive**: Icon color: `var(--muted-foreground)`. Background: transparent.
- **Hover** (inactive): Background: `var(--accent)`. Icon color: `var(--foreground)`.
- **Disabled** ("Coming Soon"): Icon color: `var(--muted-foreground)` at 40% opacity. Cursor: `not-allowed`. shadcn Tooltip on hover: "Coming Soon".

**Expanded (240px)**:
- Icon (20px) + Label text (`body` size, `var(--foreground)` or `var(--muted-foreground)`).
- Gap between icon and label: `12px`.
- Padding: `12px 16px`.
- Same active/hover/disabled states as collapsed, label follows icon color.
- Active label: `font-weight: 600`.

#### Logo Row

- **Collapsed**: Play triangle icon, 24px, filled `var(--primary)`. Centered. Height: 56px.
- **Expanded**: Play icon + "TubeForge" text (`h3`, weight 700, `var(--primary)`). Left-aligned with `padding-left: 16px`.
- Bottom border: `1px solid var(--border)`.

#### Connection Status (bottom of sidebar)

- **Collapsed**: Small dot (8px), centered. Green/red/yellow based on WebSocket state.
- **Expanded**: Dot + "Connected" / "Offline" / "Reconnecting..." text (`caption`, `var(--muted-foreground)`).
- Tooltip (collapsed): Shows full status text.

#### Sidebar Icons (use Lucide icons — shadcn default)

| Nav Item | Lucide Icon | Notes |
|----------|-------------|-------|
| Create | `Play` (or `Video`) | Primary action |
| Content DNAs | `Dna` (or `Palette`) | DNA/brand profiles |
| Projects | `FolderOpen` | Coming soon |
| Assets | `Image` | Coming soon |
| Settings | `Settings` | Coming soon |
| Collapse toggle | `PanelLeftClose` / `PanelLeftOpen` | Top of sidebar |

### 4.2 Routing

| Path | Page | Status |
|------|------|--------|
| `/` | Redirect to `/create` | — |
| `/create` | Create Video | Functional |
| `/dna` | Content DNAs | Functional |
| `/projects` | Projects | Placeholder |
| `/assets` | Assets Library | Placeholder |
| `/settings` | Settings | Placeholder |

Placeholder pages show: centered icon + "Coming Soon" text + "This feature is on the roadmap" subtext. Uses shadcn Card with muted styling.

---

## 5. Page: Create Video

### 5.1 Page Layout

The Create page is the main workspace. Two zones stacked vertically:

```
┌──────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                  │
│ "Create Video"  |  [DNA selector]  |  Timer  |  Status      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    VOICE ZONE                                │
│  ┌────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ Photo      │  │  Voice Orb     │  │ Forge Transcript  │  │
│  │ Area       │  │  (140px)       │  │ + Text Input      │  │
│  └────────────┘  └────────────────┘  └───────────────────┘  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                   KANBAN PIPELINE BOARD                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌─────┐ │
│  │ Research │ │ Script   │ │ Voice    │ │Visuals │ │Final│ │
│  │          │ │          │ │          │ │        │ │     │ │
│  │ [cards]  │ │ [cards]  │ │ [cards]  │ │[cards] │ │[vid]│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ └─────┘ │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ STATUS BAR                                                   │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Page Header

**Height**: 56px. `border-bottom: 1px solid var(--border)`. `background: var(--background)`. Sticky top within main content area.

**Layout**: `display: flex; align-items: center; justify-content: space-between; padding: 0 24px;`

#### Left Section
- Page title: "Create Video", `h2` size, weight 600, `var(--foreground)`.

#### Center Section — DNA Selector (CRITICAL COMPONENT)

This is how the user picks which Content DNA to apply to this generation.

**Component**: shadcn `Select` (or custom dropdown).

**Anatomy**:
```
┌──────────────────────────────────────────┐
│  🧬  My History Channel  ▾              │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔  │
│  DNA color bar (3px, DNA accent color)   │
└──────────────────────────────────────────┘
```

- Width: 280px. Height: 40px.
- Left: DNA icon (Lucide `Dna`, 16px, DNA accent color).
- Center: DNA name (`body`, weight 500).
- Right: Chevron down.
- Bottom: 3px colored bar matching the selected DNA's accent color.
- Border: `1px solid var(--border)`. `rounded-lg`.
- Background: `var(--card)`.

**Dropdown (open)**:
- shadcn Select dropdown with DNA options.
- Each option shows: DNA color dot (8px) + DNA name + DNA channel description (truncated, `caption`, `var(--muted-foreground)`).
- Bottom of dropdown: "+ Create New DNA" link (text button, `var(--primary)`). Navigates to `/dna` page.
- "No DNA selected" option at top (uses generic/default settings).

**When a DNA is selected**: The DNA's accent color subtly tints the voice zone background (`background: linear-gradient(180deg, {dna-accent-color}05 0%, transparent 100%)`). This gives a visual connection between the DNA and the workspace.

#### Right Section
- **Pipeline dots**: Same as before — 5 small dots connected by lines, colored by column accent. Shows pipeline progress at a glance.
- **Timer**: `caption`, monospace, `var(--muted-foreground)`. Hidden until pipeline starts.
- **Connection badge**: shadcn `Badge` variant. `variant="outline"` with colored dot.

### 5.3 Voice Zone

**Container**: `padding: 24px 32px`. `border-bottom: 1px solid var(--border)`. Min-height: 180px. Max-height: 240px. Background: `var(--background)` with optional DNA accent tint (see above).

**Layout**: `display: flex; align-items: center; justify-content: center; gap: 32px;`

#### 5.3.1 Photo Area (Left)

**Container**: `flex-shrink: 0`. Width: 160px.

**Empty State** — shadcn-styled drop zone:
- `border: 2px dashed var(--border)`. `rounded-xl`. `background: var(--muted)`.
- Size: 160px x 120px. `display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;`
- Icon: Lucide `ImagePlus`, 32px, `var(--muted-foreground)`.
- Label: "Drop photo", `caption`, `var(--muted-foreground)`.
- **Hover**: `border-color: var(--primary)`. `background: var(--primary)/5%`. Cursor: pointer.
- **Drag over**: `border-color: var(--primary)`. `border-style: solid`. `scale-[1.02]`. `ring-2 ring-primary/20`.
- **Click**: Opens file picker (`accept="image/*"`).

**Photo Loaded State**:
- Image: `object-fit: cover`. `rounded-xl`. Fills 160x120. `shadow-sm`.
- **Hover overlay**: `absolute inset-0 bg-black/40 rounded-xl`, with Lucide `X` button (top-right, 24px circle, white) and "Change" text (center, `caption`, white).
- Below image: filename, `micro`, `var(--muted-foreground)`, truncated.

**Camera Button**: Small circular shadcn `Button` (`variant="outline"`, `size="icon"`), 28px, positioned bottom-right overlapping the photo area. Lucide `Camera` icon, 14px. Opens camera modal.

#### 5.3.2 Voice Orb (Center)

**Purpose**: Hero interaction element. Click to toggle voice mode. Visual feedback for audio state.

**Container**: `flex-shrink: 0`. Width: 160px (including glow). Centered.

**Structure** (concentric circles):

1. **Outer glow** (160px): `absolute`. Invisible by default. Radial gradient glow appears during voice states. Color matches state.
2. **Outer ring** (140px): `border: 2px solid var(--border)`. `rounded-full`. Background: `var(--card)`.
3. **Waveform canvas** (130px): `<canvas>` element. 32 radial bars. Draws circular waveform reacting to audio.
4. **Inner circle** (96px): `background: var(--muted)`. `rounded-full`. Contains state icon.
5. **State icon** (center): Lucide icons — `Mic` (idle), `MicOff` (muted), `AudioLines` (speaking), `Loader2` (processing). Size: 28px.

**Voice Orb States**:

| State | Outer Ring Border | Inner Circle BG | Icon | Waveform Bars | Glow | Label Below |
|-------|-------------------|-----------------|------|---------------|------|-------------|
| **Idle** | `var(--border)` | `var(--muted)` | `Mic`, `var(--muted-foreground)` | Static, min height, `var(--border)` | None | "Click to talk" |
| **Connecting** | `var(--status-warning)` | `var(--muted)` | `Loader2` spinning, `var(--status-warning)` | Sequential loading animation | Warm subtle glow | "Connecting..." |
| **Listening** | `var(--status-success)` | `var(--status-success)/10%` | `Mic`, `var(--status-success)` | React to mic FFT, `var(--status-success)` | Green glow, pulsing | "Listening..." |
| **Speaking** | `var(--primary)` | `var(--primary)/10%` | `AudioLines`, `var(--primary)` | React to output audio FFT, `var(--primary)` | Red glow, pulsing | "Forge is speaking" |
| **Processing** | `var(--status-warning)` | `var(--status-warning)/10%` | `Loader2` spinning, `var(--status-warning)` | Slow clockwise rotation | Warm glow | "Thinking..." |
| **Error** | `var(--status-error)` | `var(--status-error)/10%` | `AlertTriangle`, `var(--status-error)` | All min, `var(--status-error)` | Red flash | "Error. Click to retry." |

**Label**: `caption`, `var(--muted-foreground)`. Centered below orb. `margin-top: 8px`.

**Interactions**:
- **Click**: Toggle voice mode (idle → listening, listening → idle).
- **Click while speaking**: Barge-in (interrupt Forge). Flash orange, return to listening.
- **Hover (idle)**: Outer ring brightens to `var(--foreground)/20%`. `cursor: pointer`. `scale-[1.02]` transition.

**Waveform Canvas Details**:
- Canvas CSS size: 130x130px. Actual: 260x260px (retina).
- 32 bars, each 2px wide, rounded caps. Arranged radially (11.25deg apart).
- Bar height: min 4px, max 20px. Driven by audio analyser FFT data.
- Idle: Perlin noise breathing (very subtle, never fully static).
- `requestAnimationFrame` loop. Only active when voice zone visible.

#### 5.3.3 Forge Transcript Area (Right)

**Container**: `flex: 1; min-width: 200px; max-width: 420px;`

**Layout** (vertical stack, `gap: 8px`):

**1. Forge Identity Row**:
- `display: flex; align-items: center; gap: 8px;`
- shadcn `Avatar` (28px): `bg-primary/10`, Lucide `Flame` icon (14px, `var(--primary)`).
- "Forge" — `h4`, `var(--foreground)`.
- shadcn `Badge` (`variant="secondary"`): "Creative Director", `micro`, uppercase. If a DNA is selected, badge shows DNA name instead: e.g., "Using: My History Channel".

**2. Transcript Area**:
- shadcn `Card` (`p-3`). `min-h-[60px] max-h-[120px]`. `overflow-y: auto` (shadcn `ScrollArea` for styled scrollbar).
- **Empty**: Italic placeholder — "Upload a photo and start talking...", `var(--muted-foreground)`.
- **Streaming text**: Text appears word-by-word. Blinking cursor: thin 2px line, `var(--primary)`, `animation: blink 1s step-end infinite`.
- **Turn complete**: Cursor disappears.
- **Interrupted**: Text gets `opacity-50`. Small shadcn `Badge` (`variant="outline"`) appended: "interrupted", `var(--status-warning)`.
- **Previous turn**: Shown as 1 line above current, `text-muted-foreground`, truncated with ellipsis. `text-xs`.
- Text style: `body-sm`, `var(--foreground)`, `leading-relaxed`.

**3. Text Input Fallback**:
- shadcn `Input` with send button.
- Height: 36px. `rounded-full`. `bg-muted`. `border-muted`.
- Placeholder: "Type to Forge..." `text-xs`, `text-muted-foreground`.
- Send button: shadcn `Button` (`variant="ghost"`, `size="icon"`, 28px). Lucide `SendHorizontal`, 14px. Only visible when input has text (`opacity-0 → opacity-100` transition). Color: `var(--primary)`.
- **Focus**: `ring-2 ring-ring`.

#### 5.3.4 Preset Bar (below voice zone content, within voice zone)

**Position**: Full width. Centered. `margin-top: 16px`.
**Layout**: `display: flex; align-items: center; gap: 8px; justify-content: center; flex-wrap: wrap;`

**Note**: When a Content DNA is selected, the preset bar shows the DNA's preset (locked, with label "Set by DNA"). User can override by clicking a different preset (shows confirmation: "Override DNA preset?").

**Label**: "Style:", `overline`, `var(--muted-foreground)`.

**Preset Pills**: shadcn `Button` (`variant="outline"`, `size="sm"`).

| Preset | Lucide Icon (14px) | Dot Color |
|--------|-------------------|-----------|
| Documentary | `BookOpen` | `#3b82f6` |
| Educational | `GraduationCap` | `#22c55e` |
| Dramatic | `Zap` | `#8b5cf6` |
| Cinematic | `Clapperboard` | `#f97316` |
| Story | `BookText` | `#ec4899` |
| Fun | `Sparkles` | `#eab308` |

**Pill anatomy** (each):
- Height: 32px. `rounded-full`. `px-3`.
- Contains: 6px color dot + icon (14px) + label (`caption`).
- **Default**: `border-border`, `text-muted-foreground`, `bg-transparent`.
- **Hover**: `bg-accent`, `text-foreground`.
- **Active/Selected**: `border-{dot-color}`, `bg-{dot-color}/10`, `text-{dot-color}`. Dot replaced with Lucide `Check` (10px).
- Only one active at a time. Default: "Documentary".

---

### 5.4 Kanban Pipeline Board

**Container**:
```css
.kanban-board {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  overflow-x: auto;
  overflow-y: hidden;
}
```
Uses shadcn `ScrollArea` for horizontal scroll (custom scrollbar).

#### 5.4.1 Column Component

**5 Columns**: Research, Script, Voiceover, Visuals, Final.

**Column container**: shadcn `Card` variant (custom).
```css
.kanban-column {
  min-width: 220px;
  max-width: 360px;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);   /* 8px */
  overflow: hidden;
}
```

**Script and Visuals columns**: `flex: 1.2` (slightly wider — they have more content).
**Final column**: `flex: 1.3`.

**Column Header**:
- Height: 40px. `padding: 0 12px`.
- `display: flex; align-items: center; justify-content: space-between;`
- `background: var(--muted)`. `border-bottom: 1px solid var(--border)`.
- Left: Column accent dot (8px, `rounded-full`, column color) + Column name (`overline`, uppercase, `var(--muted-foreground)`). Gap: 8px.
- Right: Card count — shadcn `Badge` (`variant="secondary"`), `micro` text, column accent color text. Hidden when 0.
- **Active state bottom border**: `2px solid {column-color}` on the header's bottom edge. Dot pulses (`animate-pulse`).
- **Complete state**: Small Lucide `Check` (12px, column color) appears after the name.

**Column Body**: `flex: 1; padding: 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;`

Uses shadcn `ScrollArea` for styled vertical scrollbar (thin, rounded, muted color).

**Column States**:

| State | Header Dot | Header Name | Body Content | Column Border |
|-------|-----------|-------------|-------------|---------------|
| **Empty** | `var(--border)` (gray) | `text-muted-foreground/40` | Ghost card | `border-border` |
| **Pending** | `var(--muted-foreground)` | `text-muted-foreground` | Ghost card | `border-border` |
| **Active** | Column color, pulsing | `text-foreground` | Skeleton card + completed cards | `border-border` |
| **Complete** | Column color, solid + checkmark | `text-muted-foreground` | Completed cards | `border-border` |
| **Error** | `var(--status-error)` | `text-muted-foreground` | Error card + completed cards | `border-destructive/30` |

**Ghost Card** (empty placeholder):
- `border: 1px dashed var(--border)`. `rounded-lg`. `bg-transparent`.
- Height: 80px. Centered content.
- Text: `caption`, `var(--muted-foreground)/60`, italic.
  - Research: "Facts will appear here"
  - Script: "Scenes will appear here"
  - Voiceover: "Audio will appear here"
  - Visuals: "Media will appear here"
  - Final: "Video will appear here"

**Skeleton Card** (loading):
- shadcn `Skeleton` component. Same dimensions as a real card.
- 2-3 skeleton bars with shimmer animation.
- shadcn default: `bg-muted animate-pulse rounded-md`.

#### 5.4.2 Card Types

**Base card style** (all cards):
- shadcn `Card` component. `rounded-lg`. `shadow-sm`.
- `border: 1px solid var(--border)`. `bg-card`.
- `cursor: pointer`.
- **Hover**: `shadow-md`. `border-color` brightens slightly. `translateY(-1px)` lift.
- **Entry animation**: `cardIn` — `opacity: 0, translateY(12px), scale(0.97)` → `opacity: 1, translateY(0), scale(1)`. Duration: 400ms. Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Left accent border**: `border-left: 3px solid {column-color}`.

---

##### 5.4.2.1 Research Fact Card

**Column**: Research. **Source**: `google_search` result.

```
┌──────────────────────────────────┐
│ ℹ  Key Fact          source.com │
│──────────────────────────────────│
│ The Colosseum was completed in   │
│ 80 AD under Emperor Titus...     │
│──────────────────────────────────│
│ #colosseum  #roman  #history     │
└──────────────────────────────────┘
```

- **Left border**: `3px solid var(--col-research)`.
- **Header**: `display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--border);`
  - Lucide `Info` icon (14px, `var(--col-research)`).
  - Title: `body-sm`, weight 600, `var(--foreground)`. `flex: 1; truncate;`.
  - Source: `micro`, `var(--muted-foreground)`. Right-aligned.
- **Body**: `padding: 8px 12px;`
  - Fact text: `body-sm`, `var(--muted-foreground)`, `leading-relaxed`. `line-clamp-3`.
- **Tags** (optional): `padding: 6px 12px; border-top: 1px solid var(--border);`
  - shadcn `Badge` (`variant="secondary"`), `micro` text, `bg-col-research-light`, `text-col-research`. `gap: 4px`.

##### 5.4.2.2 Scene Card (Script)

**Column**: Script. **Source**: `generate_script` result (one card per segment).

```
┌──────────────────────────────────┐
│ SCENE 1                    45s  │
│ ┌──────────────────────────────┐ │
│ │   [scene image 16:9]        │ │
│ └──────────────────────────────┘ │
│ The Ancient Arena                │
│ In the heart of Rome stands     │
│ a monument to both human...     │
└──────────────────────────────────┘
```

- **Left border**: `3px solid var(--col-script)`.
- **Header**: `padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;`
  - "SCENE N": `overline`, `var(--col-script)`.
  - Duration: shadcn `Badge` (`variant="secondary"`), `micro`, `bg-col-script-light`, `text-col-script`. E.g., "45s".
- **Image**: `margin: 0 8px; aspect-ratio: 16/9; rounded-md; object-fit: cover; bg-muted;`
  - No image yet: `bg-muted` with Lucide `Image` icon centered (20px, `var(--muted-foreground)/40`).
  - Hover: `scale-[1.02]` with `overflow-hidden` on container.
- **Scene title**: `padding: 8px 12px 2px; body-sm; font-semibold; text-foreground;`
- **Narration**: `padding: 2px 12px 8px; body-sm; text-muted-foreground; line-clamp-3; leading-relaxed;`

##### 5.4.2.3 Voiceover Card

**Column**: Voiceover. **Source**: `generate_voiceover` result.

```
┌──────────────────────────────────┐
│ 🎤 Voiceover              2:34 │
│ ┌──────────────────────────────┐ │
│ │ ▶  ━━━━━━━━━━━━━━━━━  0:00  │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ ▁▂▃▅▇▅▃▂▁▂▃▅▇▅▃▂▁▂▃▅▇▅▃▂▁ │ │
│ └──────────────────────────────┘ │
│ Voice: Neural2-D   Rate: 0.95x │
└──────────────────────────────────┘
```

- **Left border**: `3px solid var(--col-voice)`.
- **Header**: Lucide `Mic` (14px, `var(--col-voice)`) + "Voiceover" (`body-sm`, semibold) + duration right (`caption`, monospace, `var(--muted-foreground)`).
- **Audio player**: Custom component. `margin: 4px 8px; bg-muted; rounded-md; h-9; px-2;`
  - Play button: 28px circle. `bg-col-voice`, white `Play`/`Pause` icon (12px).
  - Progress: `flex: 1; h-1; bg-border; rounded-full;`. Fill: `bg-col-voice`. Knob: 12px circle, `bg-col-voice`, `shadow-sm`. Appears on hover.
  - Time: `micro`, monospace, `var(--muted-foreground)`.
- **Waveform visual**: Canvas. Full width minus margins. Height: 40px. Waveform drawn in `var(--col-voice)/30`. Decorative.
- **Metadata**: `padding: 6px 12px; caption; text-muted-foreground;`. Voice name + rate.

##### 5.4.2.4 Visual Asset Card

**Column**: Visuals. **Source**: `generate_thumbnail`, `generate_broll`, scene images.

```
┌──────────────────────────────────┐
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │   [image/video 16:9]        │ │
│ │              ▶ (if video)   │ │
│ └──────────────────────────────┘ │
│ Thumbnail              1280x720 │
│ "dramatic style"                │
└──────────────────────────────────┘
```

- **Left border**: `3px solid var(--col-visuals)`.
- **Media**: Full-width within card, no side padding on image. `aspect-ratio: 16/9; rounded-t-lg; object-fit: cover;`
  - Video: Play icon overlay (40px circle, `bg-black/50 backdrop-blur-sm`, white `Play` triangle 16px). Fades in on hover.
  - Thumbnail: shadcn `Badge` top-left — "THUMB", `bg-primary text-primary-foreground`, `micro`. `absolute top-2 left-2`.
- **Label row**: `padding: 8px 12px 2px; display: flex; justify-content: space-between;`
  - Label: `body-sm`, semibold, `var(--foreground)`.
  - Dimensions: `micro`, `var(--muted-foreground)`.
- **Description**: `padding: 2px 12px 8px; caption; text-muted-foreground;` 1-line max.
- **Click**: Opens lightbox modal.

##### 5.4.2.5 Final Video Card

**Column**: Final. **Source**: `assemble_video` result.

```
┌──────────────────────────────────┐
│ ┌──────────────────────────────┐ │
│ │                              │ │
│ │   [video player 16:9]       │ │
│ │   native controls           │ │
│ └──────────────────────────────┘ │
│ Final Video              1080p  │
│ 4:32  ·  H.264  ·  24.5 MB     │
│ ┌──────────────────────────────┐ │
│ │    ↓  Download Video         │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

- **Left border**: `3px solid var(--col-final)`.
- **Video**: `<video controls>`. Full width. `rounded-lg; bg-black;` within `8px` padding.
- **Title**: `padding: 8px 12px 2px; h4; text-foreground;`
- **Metadata**: `padding: 2px 12px 4px; caption; text-muted-foreground;` Duration · Codec · Size (separated by `·`).
- **Download button**: shadcn `Button` (`variant="default"`, full width). `bg-primary text-primary-foreground`. Lucide `Download` (14px) + "Download Video". `rounded-md`. `margin: 8px 12px 12px;`.
  - **Hover**: `bg-primary/90`.
  - **Attention pulse on first appear**: 2x gentle `scale` pulse (`1 → 1.02 → 1`), 600ms each.
- `min-h-[280px]`.

##### 5.4.2.6 Error Card

**Any column** where a tool failed.

- `bg-destructive/5`. `border: 1px solid var(--status-error)/30`.
- Left border: `3px solid var(--status-error)`.
- Lucide `AlertTriangle` (16px, `var(--status-error)`) + error message (`body-sm`, `var(--foreground)`).
- shadcn `Button` (`variant="outline"`, `size="sm"`): "Retry". `border-destructive text-destructive`. Click: sends "Forge, please retry [tool]" as text message.

---

### 5.5 Status Bar

**Position**: Bottom of main content area. Height: 32px. `border-top: 1px solid var(--border)`. `bg-muted/50`.

**Layout**: `display: flex; align-items: center; justify-content: space-between; padding: 0 16px;`

**Left** (separated by `·` in `var(--border)`):
1. **Mic status**: Lucide `Mic`/`MicOff` (10px) + "Off" / "Listening" / "Speaking". `micro`. Color matches orb state.
2. **Pipeline status**: `micro`. "Idle" / "Researching..." / "Generating Script..." / "Complete!". Color matches active column.
3. **Active tool name**: `micro`, `var(--muted-foreground)`. Shows tool name or empty.

**Right**:
1. **Timer**: `micro`, monospace, `var(--muted-foreground)`.
2. **Card count**: `micro`, `var(--muted-foreground)`. "N cards".
3. **Console button**: shadcn `Button` (`variant="ghost"`, `size="sm"`). Lucide `Terminal` (12px) + "Console". `micro`, uppercase. Toggles console drawer.

---

## 6. Page: Content DNAs

### 6.1 Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                  │
│ "Content DNAs"        [+ Create New DNA] button              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Description text: "Define your channel's creative           │
│  identity. Forge adapts voice, visuals, and script           │
│  style to match your DNA."                                   │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ My History       │  │ Tech Reviews     │                 │
│  │ Channel          │  │ Channel          │  ...             │
│  │                  │  │                  │                 │
│  │ Documentary      │  │ Educational      │                 │
│  │ Formal · Deep    │  │ Casual · Fast    │                 │
│  │                  │  │                  │                 │
│  │ [Edit] [Delete]  │  │ [Edit] [Dupe]    │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────┐                                       │
│  │  +               │                                       │
│  │  Create New DNA  │  <- ghost/add card                    │
│  │                  │                                       │
│  └──────────────────┘                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Page Header

- Title: "Content DNAs", `h1`, `var(--foreground)`.
- shadcn `Button` (`variant="default"`): "+ Create New DNA". Lucide `Plus` (14px) + text. `bg-primary`.
- `padding: 24px; border-bottom: 1px solid var(--border);`

### 6.3 Description Text

- `padding: 16px 24px 0;`
- `body`, `var(--muted-foreground)`. Max-width: 600px.
- "Define your channel's creative identity. Forge adapts voice, visuals, and script style to match your DNA."

### 6.4 DNA Card Grid

**Layout**: `display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; padding: 16px 24px;`

#### DNA Card Anatomy

Each DNA is a shadcn `Card`. Dimensions: min 300px wide, auto height.

```
┌──────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐  │
│  │  Accent color bar (full width, 4px)    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  🧬  My History Channel                     │  <- DNA name + icon
│  "Exploring ancient civilizations and        │  <- channel description
│   forgotten empires through cinematic        │
│   storytelling"                              │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Preset: Documentary                    │  │
│  │ Tone: Formal, authoritative, curious   │  │
│  │ Voice: en-US-Neural2-D @ 0.95x        │  │
│  │ Visual: Cinematic, warm, desaturated   │  │
│  │ Hook: Question-based                   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │
│  │ Edit │  │ Dupe │  │ Use  │  │  ⋮   │    │
│  └──────┘  └──────┘  └──────┘  └──────┘    │
└──────────────────────────────────────────────┘
```

**Accent bar**: Full-width colored bar at top of card. Height: 4px. Color: DNA's chosen accent color. `rounded-t-lg`.

**DNA Icon**: Lucide `Dna`, 20px, DNA accent color. Or custom channel icon/emoji if set.

**DNA Name**: `h3`, `var(--foreground)`, semibold.

**Channel Description**: `body-sm`, `var(--muted-foreground)`, `line-clamp-2`, `leading-relaxed`. `margin-top: 4px`.

**Settings Preview**: `bg-muted rounded-md p-3 mt-3`. Contains key DNA settings as `caption`-sized rows:
- Each row: Label (`font-semibold`, `var(--muted-foreground)`) + Value (`var(--foreground)`).
- Rows: Preset, Tone, Voice, Visual Style, Hook Style. Show max 5 rows. If more, show "+N more" link.

**Action Bar**: `display: flex; gap: 8px; mt-3; pt-3; border-top: 1px solid var(--border);`
- **Edit**: shadcn `Button` (`variant="outline"`, `size="sm"`). Lucide `Pencil` (12px). Opens DNA Editor Sheet.
- **Duplicate**: shadcn `Button` (`variant="outline"`, `size="sm"`). Lucide `Copy` (12px).
- **Use**: shadcn `Button` (`variant="default"`, `size="sm"`). "Use" — navigates to `/create` with this DNA pre-selected. `bg-primary`.
- **More menu**: shadcn `DropdownMenu` triggered by `Button` (`variant="ghost"`, `size="icon"`, 28px). Lucide `MoreVertical`. Options: "Rename", "Export JSON", "Delete" (destructive text color).

#### Add New DNA Card (Ghost Card)

- `border: 2px dashed var(--border)`. `rounded-lg`. `bg-transparent`.
- `min-h-[200px]`. `display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;`
- Lucide `Plus` (32px, `var(--muted-foreground)`).
- "Create New DNA" text: `body-sm`, `var(--muted-foreground)`.
- **Hover**: `border-color: var(--primary)`. `bg-primary/5`. Cursor: pointer.
- **Click**: Opens DNA Editor Sheet in create mode.

### 6.5 DNA Editor Sheet

Opens as a shadcn `Sheet` (slides in from the right). Width: 480px.

**Sheet Header**: DNA name (editable `Input`) + Close button.

**Sheet Body**: shadcn `ScrollArea`. Form with sections separated by `Separator` components.

#### Section 1: Identity

| Field | Component | Description |
|-------|-----------|-------------|
| DNA Name | shadcn `Input` | E.g., "My History Channel". Required. |
| Channel Description | shadcn `Textarea` (3 rows) | What the channel is about. Used by Forge for context. |
| Accent Color | Color picker (6 preset swatches + custom hex input) | Colors the DNA card and tints the Create workspace. Swatches: red, blue, purple, green, orange, pink. |
| Icon/Emoji | Emoji picker or Lucide icon selector | Optional. Shown on DNA card and selector. |

#### Section 2: Content Style

| Field | Component | Description |
|-------|-----------|-------------|
| Preset | shadcn `Select` | Documentary, Educational, Dramatic, Cinematic, Story, Fun |
| Tone Keywords | shadcn `Input` (comma-separated tags) | E.g., "formal, authoritative, curious". Displayed as shadcn `Badge` pills. Users type and press comma/enter to add. Click badge X to remove. |
| Target Audience | shadcn `Input` | E.g., "History enthusiasts, 25-45, English-speaking" |
| Hook Style | shadcn `Select` | Question-based, Shocking fact, Story opening, Challenge, Statistic |
| CTA Style | shadcn `Select` | Subscribe reminder, Question prompt, Next video tease, None |

#### Section 3: Voice & Audio

| Field | Component | Description |
|-------|-----------|-------------|
| Voice | shadcn `Select` | en-US-Neural2-D, en-US-Neural2-F, en-US-Studio-O, etc. With preview play button next to each option. |
| Speaking Rate | shadcn `Slider` | 0.8x — 1.2x. Default: 0.95. Shows current value. |
| Pitch | shadcn `Slider` | -5 to +5 semitones. Default: 0. |

#### Section 4: Visual Style

| Field | Component | Description |
|-------|-----------|-------------|
| Image Style | shadcn `Select` | Cinematic, Photorealistic, Illustrated, Vintage, Minimalist, Abstract |
| Color Mood | shadcn `Select` | Warm, Cool, Neutral, Vibrant, Desaturated, Dark |
| Thumbnail Style | shadcn `Select` | Dramatic, Clean, Text-heavy, Mysterious, Colorful |
| B-Roll Style | shadcn `Select` | Cinematic slow-mo, Aerial, Close-up, Atmospheric, Abstract |

#### Section 5: Script Structure

| Field | Component | Description |
|-------|-----------|-------------|
| Video Length Target | shadcn `Select` | Short (2-3 min), Medium (5-7 min), Long (10-15 min) |
| Pacing | shadcn `Slider` | Slow — Medium — Fast. Affects words-per-minute. |
| Narration Style | shadcn `Select` | Third-person narrator, First-person host, Conversational, Academic |
| Include Sections | Checklist (shadcn `Checkbox` list) | Hook, Intro, Main content, Recap, CTA, Outro |

#### Section 6: Advanced (collapsible)

| Field | Component | Description |
|-------|-----------|-------------|
| Custom System Prompt Addition | shadcn `Textarea` (4 rows) | Extra instructions appended to Forge's system prompt when using this DNA. E.g., "Always mention the sponsor BetterHelp in the CTA." |
| Negative Prompts | shadcn `Input` (comma tags) | Things to avoid. E.g., "no gore, no politics, no clickbait" |

#### Sheet Footer

- `border-top: 1px solid var(--border)`. `padding: 16px`.
- shadcn `Button` (`variant="default"`): "Save DNA". `bg-primary`.
- shadcn `Button` (`variant="ghost"`): "Cancel".
- If editing existing DNA: shadcn `Button` (`variant="destructive"`, `size="sm"`): "Delete DNA". Left-aligned. Confirms with shadcn `AlertDialog`.

---

## 7. Shared Components

### 7.1 Lightbox Modal (Asset Preview)

**Trigger**: Click on any Visual Asset Card or Scene Card image.
**Component**: shadcn `Dialog`.

- `max-w-[80vw] max-h-[85vh]`. `bg-card`. `rounded-xl`. `shadow-xl`.
- **Media**: `object-fit: contain`. Full dialog width. `rounded-lg`.
- **Info row**: Asset name (`h4`) + dimensions (`caption`, `var(--muted-foreground)`).
- **Actions**: "Download" (`Button` default), "Regenerate" (`Button` outline — sends Forge command), "Close" (`Button` ghost).
- **Navigation**: If multiple assets in same column, left/right arrow buttons. Keyboard: arrow keys, Escape to close.
- **Entry animation**: shadcn Dialog default (fade + scale).

### 7.2 Camera Modal

shadcn `Dialog`. Same as before:
- Header: "Camera Capture" + close X.
- Body: `<video autoplay playsinline>` from `getUserMedia`. `bg-black rounded-lg`.
- Footer: "Cancel" (`Button` ghost) + "Capture & Send" (`Button` default).

### 7.3 Console Drawer

shadcn `Sheet` (slides from bottom). Height: 280px.

- **Bar**: `h-10 bg-muted border-b`. "Event Console" label + filter checkbox + "Clear" button + close.
- **Content**: shadcn `ScrollArea`. Monospace log entries. `font-mono text-xs`.
- **Entry format**: `[HH:MM:SS] [UP/DN/ER] message`. Left-colored border. Expandable JSON payloads.

### 7.4 Toast Notifications

shadcn `Toast` (via `useToast` or shadcn Sonner integration).

- Position: top-right, below header.
- Types: success (green left accent), warning (yellow), error (red), info (blue).
- Auto-dismiss: 4 seconds.
- Contains: icon + title + description. Optional action button.

### 7.5 Disconnection Banner

- `absolute top-0 left-0 right-0 h-9 bg-destructive/10 border-b border-destructive/30`.
- Lucide `WifiOff` (14px) + "Connection lost. Reconnecting..." (`body-sm`).
- `z-index: 50`. Slides down with `animate-slideDown`.
- Disappears on reconnect (slide up).

---

## 8. Screen States & Transitions

### 8.1 Create Page State Machine

```
                    ┌─────────┐
                    │  EMPTY  │ (no photo, no voice)
                    └────┬────┘
                         │ photo uploaded OR voice activated
                         v
                    ┌─────────┐
                    │  READY  │ (photo + awaiting Forge)
                    └────┬────┘
                         │ Forge responds / pipeline starts
                         v
                    ┌──────────┐
                ┌──>│ PIPELINE │ (tools running, cards appearing)
                │   └────┬─────┘
                │        │ all tools complete
                │        v
                │   ┌──────────┐
                │   │ COMPLETE │ (video ready)
                │   └────┬─────┘
                │        │ user starts new generation
                └────────┘
```

### 8.2 EMPTY State

- Photo area: full prominence drop zone.
- Voice orb: idle.
- Transcript: placeholder text.
- Kanban columns: all at `opacity-60`. Ghost cards.
- DNA selector: shows currently selected or "Select a DNA".
- Status bar: "Idle".

### 8.3 READY State

- Photo displayed.
- Voice orb: idle or listening.
- Forge greeting in transcript.
- Columns: `opacity-100`, ghost cards.
- Presets interactive.

### 8.4 PIPELINE State

- Cards appear progressively left → right across columns.
- Active column header pulses.
- Skeleton cards appear first, then animate to real cards.
- Scene cards stagger: 200ms between each.
- Status bar shows active tool name.

### 8.5 COMPLETE State

- All column dots colored + checkmarked.
- Final column highlighted.
- Download button pulses.
- Toast: "Your video is ready!"
- Status bar: "Complete!" in green.
- Timer shows total elapsed.

### 8.6 ERROR State

- Failed column shows error card.
- Other columns intact.
- Forge explains error in transcript.
- Error toast.

---

## 9. Animation & Motion

### 9.1 Animation Catalog

| Name | Duration | Easing | Trigger | CSS/Tailwind |
|------|----------|--------|---------|-------------|
| `cardIn` | 400ms | `cubic-bezier(0.34,1.56,0.64,1)` | Card added to column | `@keyframes cardIn { from { opacity:0; transform: translateY(12px) scale(0.97); } }` |
| `cardOut` | 250ms | ease-out | Card removed (retry) | `opacity → 0, translateY(-8px)` |
| `dotPulse` | 1.5s | ease-in-out, infinite | Active pipeline dot | `animate-pulse` (shadcn/Tailwind built-in) |
| `shimmer` | 1.5s | ease-in-out, infinite | Skeleton cards | shadcn `Skeleton` built-in `animate-pulse` |
| `orbBreathe` | 4s | ease, infinite | Idle waveform | Perlin noise amplitude (JS canvas) |
| `orbListen` | continuous | audio-reactive | Listening | Mic FFT → bar heights (JS canvas) |
| `orbSpeak` | continuous | audio-reactive | Speaking | Output audio FFT → bar heights (JS canvas) |
| `orbStateChange` | 600ms | ease | State transitions | Color + glow crossfade (CSS transitions) |
| `blink` | 1s | step-end, infinite | Transcript cursor | `50% { opacity: 0; }` |
| `slideDown` | 300ms | ease | Disconnection banner | `from { transform: translateY(-100%); }` |
| `downloadPulse` | 600ms x2 | ease | Video ready | `scale(1) → scale(1.02) → scale(1)` twice |
| `celebrationGlow` | 2s | ease-out | Pipeline complete | Final column shadow glow fade |

### 9.2 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Data Flow & State Management

### 10.1 Application State

```javascript
const state = {
  // --- Navigation ---
  currentPage: 'create',       // 'create' | 'dna' | 'projects' | 'assets' | 'settings'
  sidebarExpanded: false,

  // --- Content DNAs ---
  dnas: [                       // Persisted to localStorage
    {
      id: 'dna-abc123',
      name: 'My History Channel',
      description: 'Exploring ancient civilizations...',
      accentColor: '#3b82f6',
      icon: 'dna',              // Lucide icon name or emoji
      preset: 'documentary',
      tone: ['formal', 'authoritative', 'curious'],
      targetAudience: 'History enthusiasts, 25-45',
      hookStyle: 'question',
      ctaStyle: 'subscribe',
      voice: 'en-US-Neural2-D',
      speakingRate: 0.95,
      pitch: 0,
      imageStyle: 'cinematic',
      colorMood: 'warm',
      thumbnailStyle: 'dramatic',
      brollStyle: 'cinematic',
      videoLength: 'medium',
      pacing: 'medium',
      narrationStyle: 'third-person',
      sections: ['hook', 'intro', 'main', 'recap', 'cta'],
      customPrompt: '',
      negativePrompts: [],
      createdAt: '2026-03-06T...',
      updatedAt: '2026-03-06T...',
    },
    // ... more DNAs
  ],
  activeDnaId: null,            // Currently selected DNA for generation

  // --- Connection ---
  connection: 'disconnected',   // 'disconnected' | 'connecting' | 'connected'
  userId: null,
  sessionId: null,

  // --- Voice ---
  voiceMode: 'idle',            // 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing'
  audioPlayerNode: null,
  audioRecorderNode: null,

  // --- Photo ---
  photo: null,                  // { dataUrl, fileName, mimeType } | null

  // --- Transcript ---
  forgeTranscript: {
    current: '',
    isStreaming: false,
    interrupted: false,
    previous: '',
  },

  userTranscript: {
    current: '',
    isStreaming: false,
    finished: false,
  },

  // --- Pipeline ---
  pipeline: {
    research:  { status: 'empty', cards: [] },
    script:    { status: 'empty', cards: [] },
    voiceover: { status: 'empty', cards: [] },
    visuals:   { status: 'empty', cards: [] },
    final:     { status: 'empty', cards: [] },
  },

  // --- Timer ---
  timerStart: null,
  timerElapsed: 0,

  // --- Console ---
  consoleOpen: false,
  consoleLogs: [],
  showAudioEvents: false,

  // --- UI ---
  lightbox: null,               // { type, src, title, assets[] } | null
  cameraModalOpen: false,
  dnaEditorOpen: false,         // Sheet open state
  dnaEditorMode: 'create',      // 'create' | 'edit'
  dnaEditorData: null,          // DNA object being edited
};
```

### 10.2 DNA → Tool Pipeline Integration

When a generation starts, the active DNA is serialized and sent to the backend as part of the first text message or as a separate configuration message:

```javascript
// Sent before or alongside the first user message
ws.send(JSON.stringify({
  type: 'config',
  dna: {
    preset: state.dnas.find(d => d.id === state.activeDnaId),
    // All DNA fields included — backend injects into system prompt + tool args
  }
}));
```

The backend uses the DNA to:
- Modify Forge's system prompt (append tone, audience, style directives)
- Set tool parameters (voice selection, image style, thumbnail style, video length)
- Filter/shape research queries
- Structure script output (hook style, sections, pacing)

### 10.3 State Persistence

| Data | Storage | Lifetime |
|------|---------|----------|
| Content DNAs | `localStorage` key: `tubeforge_dnas` | Permanent (until cleared) |
| Active DNA ID | `localStorage` key: `tubeforge_active_dna` | Permanent |
| Sidebar expanded | `localStorage` key: `tubeforge_sidebar` | Permanent |
| Console open | Session only (memory) | Until page reload |
| Pipeline state | Session only (memory) | Until page reload |
| Generated assets | Server-side (`/outputs/`) | Until server restart |

### 10.4 Tool Name → Column Mapping

```javascript
const TOOL_COLUMN_MAP = {
  'google_search':      'research',
  'generate_script':    'script',
  'generate_voiceover': 'voiceover',
  'generate_thumbnail': 'visuals',
  'generate_broll':     'visuals',
  'edit_image':         'visuals',
  'assemble_video':     'final',
};
```

### 10.5 Card Data Shapes

```javascript
// Research fact card
{ id, type: 'fact', title, text, source, tags: [] }

// Script scene card
{ id, type: 'scene', sceneNumber, title, narration, imageUrl, durationSeconds }

// Voiceover card
{ id, type: 'voiceover', audioUrl, durationSeconds, voiceName, speakingRate, waveformData }

// Visual asset card
{ id, type: 'thumbnail'|'scene-image'|'broll', mediaUrl, mediaType: 'image'|'video', label, description, dimensions }

// Final video card
{ id, type: 'final-video', videoUrl, durationSeconds, codec, resolution, fileSizeMB }

// Error card
{ id, type: 'error', toolName, message, retryable: boolean }
```

---

## 11. WebSocket Protocol

### 11.1 Connection

```
Endpoint: ws://{host}/ws/{userId}/{sessionId}
userId: "user-" + random(6)
sessionId: "session-" + timestamp(base36)
```

Reconnection: 2s initial, exponential backoff, max 30s. Reset on success.

### 11.2 Client → Server

| Type | Format | Description |
|------|--------|-------------|
| Audio | Binary (ArrayBuffer) | PCM 16kHz Int16LE from mic |
| Text | `{ "type": "text", "text": "..." }` | User typed message |
| Image | `{ "type": "image", "data": "base64", "mimeType": "image/jpeg" }` | Photo upload |
| Config | `{ "type": "config", "dna": { ... } }` | Content DNA settings (sent on generation start) |

### 11.3 Server → Client

```javascript
// Turn lifecycle
{ "turnComplete": true }
{ "interrupted": true }

// Transcription
{ "inputTranscription": { "text": "...", "finished": true|false } }
{ "outputTranscription": { "text": "...", "finished": true|false } }

// Content parts
{
  "content": {
    "parts": [
      { "text": "..." },
      { "inlineData": { "data": "base64", "mimeType": "audio/pcm;rate=24000" } },
      { "functionCall": { "name": "generate_script", "args": { ... } } },
      { "functionResponse": { "name": "generate_script", "response": { "status": "success", "segments": [...] } } }
    ]
  },
  "partial": true
}
```

### 11.4 Event → UI Action Map

| Event | UI Action |
|-------|-----------|
| `turnComplete` | Clear cursor. Set voice to listening. Finalize text. |
| `interrupted` | Mark transcript interrupted. Flush audio. Flash orb. |
| `inputTranscription` (streaming) | Optional: show user speech below orb. |
| `inputTranscription` (finished) | Show final as faded label. |
| `outputTranscription` (streaming) | Append to transcript. Set voice to speaking. |
| `outputTranscription` (finished) | Finalize transcript. |
| `inlineData` (audio) | Feed PCM to player. Set speaking. Drive orb. |
| `text` part | Fallback transcript (non-voice). |
| `functionCall` | Column → active. Add skeleton. Status bar update. Toast. |
| `functionResponse` (success) | Column → complete. Replace skeleton. Create card. |
| `functionResponse` (error) | Column → error. Error card. Error toast. |

---

## 12. Responsive Behavior

### 12.1 Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| Desktop XL | > 1440px | Full layout, sidebar + all columns visible |
| Desktop | 1024-1440px | Full layout, columns may shrink |
| Tablet | 768-1023px | Sidebar collapses to icons only. Voice zone stacks. Kanban scrolls. |
| Mobile | < 768px | Sidebar becomes bottom tab bar. Complete restructure. |

### 12.2 Tablet (768-1023px)

- Sidebar: locked to collapsed (64px icons only). Cannot expand.
- Voice zone: `flex-direction: column; align-items: center;`. Photo above orb. Transcript below. Presets below that.
- Kanban: horizontal scroll with `scroll-snap-type: x mandatory`.

### 12.3 Mobile (< 768px)

```
┌─────────────────────┐
│ Header (48px)       │
├─────────────────────┤
│ Voice Orb (hero)    │
│ Transcript (2 lines)│
│ [Record] [Upload]   │
├─────────────────────┤
│ Column tabs:        │
│ [Research][Script]..│
├─────────────────────┤
│ Selected column     │
│ cards (scrollable)  │
├─────────────────────┤
│ ☰ 🧬 📁 🖼 ⚙       │  <- bottom tab bar (replaces sidebar)
└─────────────────────┘
```

- Sidebar → bottom tab bar (5 icons, 56px height, `border-top`).
- Voice orb: 160px, hero element.
- Photo: button-only (no drop zone).
- Kanban: tab-based, one column at a time. Swipe to switch.
- DNA selector: moves to sheet/bottom-sheet.

---

## 13. Accessibility

### 13.1 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate: sidebar → DNA selector → voice orb → text input → preset pills → column cards |
| `Enter` | Activate focused element |
| `Escape` | Close modal/sheet/lightbox/console |
| `Space` | Toggle voice when orb focused |
| `Arrow Left/Right` | Navigate columns (kanban) or nav items (sidebar) |
| `Arrow Up/Down` | Navigate cards within column |

### 13.2 ARIA

```html
<nav class="sidebar" role="navigation" aria-label="Main navigation">
<div class="voice-orb" role="button" tabindex="0" aria-label="Toggle voice mode. Currently idle." aria-pressed="false">
<div class="kanban-board" role="region" aria-label="Video creation pipeline">
<div class="kanban-column" role="group" aria-label="Research. 3 cards. Complete.">
<div class="kanban-card" role="article" tabindex="0" aria-label="Scene 1: The Ancient Arena. 45 seconds.">
<div class="forge-transcript" role="log" aria-live="polite" aria-label="Forge is saying">
<div class="connection-badge" role="status" aria-live="polite">
```

### 13.3 Color Contrast (WCAG AA)

All text on light backgrounds:
- `--foreground` (#0a0a0a) on `--background` (#ffffff): ~21:1
- `--muted-foreground` (#737373) on `--card` (#ffffff): ~5.5:1
- Pipeline column colors on white: all > 3:1 (decorative + text labels)

---

## 14. Component Tree

```
body.app-layout
├── nav.sidebar
│   ├── div.sidebar-header
│   │   ├── button.sidebar-toggle (PanelLeftClose/Open icon)
│   │   └── div.logo (Play icon + "TubeForge" text)
│   ├── div.sidebar-nav
│   │   ├── a.nav-item[data-page="create"] (active)
│   │   │   ├── icon (Play)
│   │   │   └── span.nav-label "Create"
│   │   ├── a.nav-item[data-page="dna"]
│   │   │   ├── icon (Dna)
│   │   │   └── span.nav-label "Content DNAs"
│   │   ├── Separator
│   │   ├── a.nav-item[data-page="projects"] (disabled)
│   │   ├── a.nav-item[data-page="assets"] (disabled)
│   ├── div.sidebar-footer
│   │   ├── Separator
│   │   ├── a.nav-item[data-page="settings"] (disabled)
│   │   └── div.connection-indicator (dot + label)
│
├── main.main-content
│   │
│   ├── [PAGE: Create Video] ─────────────────────────
│   │   ├── header.page-header
│   │   │   ├── h2 "Create Video"
│   │   │   ├── div.dna-selector (Select component)
│   │   │   │   ├── icon (Dna, DNA color)
│   │   │   │   ├── span.dna-name
│   │   │   │   ├── icon (ChevronDown)
│   │   │   │   └── div.dna-color-bar (3px accent)
│   │   │   ├── div.pipeline-dots (5 dots + lines)
│   │   │   ├── span.timer
│   │   │   └── Badge.connection-badge
│   │   │
│   │   ├── section.voice-zone
│   │   │   ├── div.voice-zone-content (flex row)
│   │   │   │   ├── div.photo-area
│   │   │   │   │   ├── div.photo-dropzone (empty) | div.photo-loaded
│   │   │   │   │   └── button.camera-btn
│   │   │   │   ├── div.voice-orb-container
│   │   │   │   │   ├── div.orb-glow
│   │   │   │   │   ├── div.orb-ring
│   │   │   │   │   ├── canvas.orb-waveform
│   │   │   │   │   ├── div.orb-center
│   │   │   │   │   │   └── icon (state-dependent)
│   │   │   │   │   └── span.orb-label
│   │   │   │   └── div.forge-transcript
│   │   │   │       ├── div.forge-identity (Avatar + name + Badge)
│   │   │   │       ├── Card.transcript-bubble
│   │   │   │       │   ├── p.transcript-previous
│   │   │   │       │   ├── p.transcript-current
│   │   │   │       │   └── span.cursor
│   │   │   │       └── div.text-input (Input + send Button)
│   │   │   └── div.preset-bar
│   │   │       ├── span "Style:"
│   │   │       └── Button.preset-pill * 6
│   │   │
│   │   ├── main.kanban-board (flex row, scrollable)
│   │   │   ├── Card.kanban-column[research]
│   │   │   │   ├── div.column-header (dot + name + count Badge)
│   │   │   │   └── ScrollArea.column-body
│   │   │   │       ├── Card.fact-card * N | Skeleton | ghost-card
│   │   │   ├── Card.kanban-column[script]
│   │   │   │   └── ... (scene-cards)
│   │   │   ├── Card.kanban-column[voiceover]
│   │   │   │   └── ... (voiceover-card)
│   │   │   ├── Card.kanban-column[visuals]
│   │   │   │   └── ... (visual-cards)
│   │   │   └── Card.kanban-column[final]
│   │   │       └── ... (final-video-card)
│   │   │
│   │   └── footer.status-bar
│   │       ├── div.status-left (mic + pipeline + tool)
│   │       └── div.status-right (timer + cards + console btn)
│   │
│   ├── [PAGE: Content DNAs] ─────────────────────────
│   │   ├── header.page-header
│   │   │   ├── h1 "Content DNAs"
│   │   │   └── Button "+ Create New DNA"
│   │   ├── p.description
│   │   └── div.dna-grid (CSS grid)
│   │       ├── Card.dna-card * N
│   │       │   ├── div.accent-bar (4px, DNA color)
│   │       │   ├── div.dna-header (icon + name)
│   │       │   ├── p.dna-description
│   │       │   ├── div.dna-settings-preview (bg-muted rows)
│   │       │   └── div.dna-actions (Edit, Dupe, Use, More)
│   │       └── div.dna-add-card (dashed ghost)
│   │
│   └── [PLACEHOLDER PAGES] ─────────────────────────
│       └── Card (centered icon + "Coming Soon" text)
│
├── Sheet.dna-editor (right slide, 480px)
│   ├── Sheet.Header (DNA name Input + close)
│   ├── Sheet.Body (ScrollArea)
│   │   ├── Section: Identity (name, desc, color, icon)
│   │   ├── Separator
│   │   ├── Section: Content Style (preset, tone, audience, hook, cta)
│   │   ├── Separator
│   │   ├── Section: Voice & Audio (voice select, rate slider, pitch slider)
│   │   ├── Separator
│   │   ├── Section: Visual Style (image, color mood, thumb, broll)
│   │   ├── Separator
│   │   ├── Section: Script Structure (length, pacing, narration, sections)
│   │   ├── Separator (collapsible)
│   │   └── Section: Advanced (custom prompt, negative prompts)
│   └── Sheet.Footer (Save + Cancel + Delete)
│
├── Dialog.lightbox-modal
│   ├── img | video (media)
│   ├── div.info (name + dimensions)
│   └── div.actions (Download, Regenerate, Close)
│
├── Dialog.camera-modal
│   ├── video#cameraPreview
│   └── div.actions (Cancel, Capture)
│
├── Sheet.console-drawer (bottom, 280px)
│   ├── div.console-bar
│   └── ScrollArea.console-content
│
├── div.toast-container (Sonner/shadcn Toast)
│
└── div.disconnection-banner (conditional)
```

---

## 15. Content DNA Schema

### 15.1 Full Schema (JSON)

```json
{
  "id": "dna-abc123",
  "name": "My History Channel",
  "description": "Exploring ancient civilizations and forgotten empires through cinematic storytelling",
  "accentColor": "#3b82f6",
  "icon": "dna",

  "contentStyle": {
    "preset": "documentary",
    "tone": ["formal", "authoritative", "curious"],
    "targetAudience": "History enthusiasts, 25-45, English-speaking",
    "hookStyle": "question",
    "ctaStyle": "subscribe"
  },

  "voice": {
    "voiceId": "en-US-Neural2-D",
    "speakingRate": 0.95,
    "pitch": 0
  },

  "visuals": {
    "imageStyle": "cinematic",
    "colorMood": "warm",
    "thumbnailStyle": "dramatic",
    "brollStyle": "cinematic"
  },

  "script": {
    "videoLength": "medium",
    "pacing": "medium",
    "narrationStyle": "third-person",
    "sections": ["hook", "intro", "main", "recap", "cta"]
  },

  "advanced": {
    "customPrompt": "",
    "negativePrompts": []
  },

  "metadata": {
    "createdAt": "2026-03-06T10:30:00Z",
    "updatedAt": "2026-03-06T10:30:00Z",
    "videosGenerated": 0
  }
}
```

### 15.2 How DNA Flows to Backend

When the user clicks record or sends the first message with a DNA selected:

1. Frontend sends `{ type: "config", dna: { ...fullDnaObject } }` via WebSocket.
2. Backend receives DNA and:
   - **System prompt**: Appends DNA tone, audience, style directives to Forge's base system prompt.
   - **Tool args**: Pre-fills tool parameters (voice ID, speaking rate, image style, thumbnail style, video length target).
   - **Research**: Shapes search queries based on audience and tone.
   - **Script**: Structures output based on sections, pacing, narration style, hook/CTA preferences.
3. All generated content is consistent with the DNA profile.

### 15.3 Default DNA (when none selected)

If no DNA is selected, Forge uses sensible defaults:
- Preset: Documentary
- Tone: Neutral, informative
- Voice: en-US-Neural2-D @ 1.0x
- Image style: Photorealistic
- Video length: Medium (5-7 min)
- All sections enabled

The user can still override via voice commands ("make it more dramatic", "use a female voice").

### 15.4 DNA Field Enums

**Preset**: `documentary` | `educational` | `dramatic` | `cinematic` | `story` | `fun`

**Hook Style**: `question` | `shocking-fact` | `story-opening` | `challenge` | `statistic`

**CTA Style**: `subscribe` | `question-prompt` | `next-video-tease` | `none`

**Voice IDs**: `en-US-Neural2-D` | `en-US-Neural2-F` | `en-US-Neural2-A` | `en-US-Neural2-C` | `en-US-Studio-O` | `en-US-Studio-Q` | `en-GB-Neural2-A` | `en-GB-Neural2-B`

**Image Style**: `cinematic` | `photorealistic` | `illustrated` | `vintage` | `minimalist` | `abstract`

**Color Mood**: `warm` | `cool` | `neutral` | `vibrant` | `desaturated` | `dark`

**Thumbnail Style**: `dramatic` | `clean` | `text-heavy` | `mysterious` | `colorful`

**B-Roll Style**: `cinematic` | `aerial` | `close-up` | `atmospheric` | `abstract`

**Video Length**: `short` (2-3 min) | `medium` (5-7 min) | `long` (10-15 min)

**Pacing**: `slow` (100 wpm) | `medium` (130 wpm) | `fast` (160 wpm)

**Narration Style**: `third-person` | `first-person` | `conversational` | `academic`

**Sections**: `hook` | `intro` | `main` | `recap` | `cta` | `outro`

---

## Appendix A: File Structure

```
frontend/
├── index.html                     # Single page — full DOM structure
├── style.css                      # Tailwind + shadcn + custom styles
└── src/
    ├── app.js                     # State, WebSocket, event processing, routing
    ├── ui.js                      # DOM rendering — kanban, cards, voice orb, toasts
    ├── voice-orb.js               # Canvas waveform drawing + state animations
    ├── dna.js                     # Content DNA CRUD + localStorage persistence
    ├── audio-player.js            # Web Audio playback worklet (bidi-demo)
    ├── audio-recorder.js          # Web Audio recording worklet (bidi-demo)
    ├── pcm-player-processor.js    # AudioWorkletProcessor (playback)
    └── pcm-recorder-processor.js  # AudioWorkletProcessor (recording)
```

## Appendix B: External Dependencies

| Resource | Source | Purpose |
|----------|--------|---------|
| Inter font | Google Fonts | Primary typeface |
| JetBrains Mono | Google Fonts | Monospace (console) |
| Tailwind CSS | CDN or build | Utility classes |
| shadcn/ui | Components | UI component library |
| Lucide Icons | Package or CDN | Icon set (shadcn default) |

## Appendix C: Browser Support

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Primary. Full WebSocket + AudioWorklet. |
| Firefox | 90+ | Full support. |
| Safari | 16+ | AudioWorklet from 14.5. |
| Edge | 90+ | Chromium-based. |
| Mobile Chrome | 90+ | Touch interactions. |
| Mobile Safari | 16+ | Test mic permissions. |
