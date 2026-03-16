# Vigil — Competitor & Market Analysis

> IT Helpdesk AI + Cybersecurity Scam Protection
> Updated: 2026-03-16

---

## 1. Market Context

Vigil operates at the intersection of two markets: AI-powered IT service management (ITSM) and browser-based cybersecurity. Most products address one or the other. Vigil combines both through a unified voice-first interface with multi-agent AI architecture.

---

## 2. IT Helpdesk AI Competitors

### Freshdesk AI (Freddy AI)

| Aspect | Freshdesk AI | Vigil (Theepa) |
|--------|-------------|-----------------|
| Interface | Chat widget, email, phone | Voice-first (Gemini Live bidirectional audio) |
| AI Model | Proprietary Freddy AI | Gemini 2.5 Flash (latest, multimodal) |
| Diagnostic Depth | Canned response matching | Cross-reference engine (KB + error codes + portal pages) |
| Tool Calling | Limited automation | 8 function tools with real-time orchestration |
| Screen Understanding | None | Vision-based screen analysis via Gemini |
| Browser Control | None | Chrome extension DOM navigation |
| Pricing | $15-79/agent/month | Open source / self-hosted on Cloud Run |

**Vigil advantage**: Freshdesk relies on text-based ticket routing and keyword matching. Vigil conducts a live diagnostic conversation, cross-references multiple data sources simultaneously, and can see and interact with the user's screen.

### Zendesk AI

| Aspect | Zendesk AI | Vigil (Theepa) |
|--------|-----------|-----------------|
| Interface | Chat, email, phone (separate channels) | Unified voice session with real-time transcript |
| AI Capability | Intent classification + suggested replies | Multi-agent system with autonomous tool execution |
| Knowledge Base | Zendesk Guide (proprietary format) | JSON KB with cross-reference engine |
| Ticket Creation | Manual or rule-based | AI-driven with auto-populated diagnostic report |
| Customization | Configuration UI | Code-first (ADK FunctionTool pattern) |
| Deployment | SaaS only | Self-hosted on Google Cloud Run |

**Vigil advantage**: Zendesk AI assists human agents with suggestions. Vigil IS the agent. It autonomously diagnoses, researches, and resolves issues end-to-end through voice conversation.

### ServiceNow Virtual Agent

| Aspect | ServiceNow VA | Vigil (Theepa) |
|--------|--------------|-----------------|
| Interface | Chat (Now Platform) | Voice-first with vision |
| Architecture | Decision tree + NLU | Multi-agent with dynamic tool selection |
| Integration | Deep ServiceNow ecosystem | Standalone + Chrome extension |
| Research | Internal KB only | Google Search grounding (anti-hallucination) |
| Setup Complexity | Weeks/months | Minutes (pip install + deploy) |
| Cost | Enterprise licensing ($100K+/year) | Open source |

**Vigil advantage**: ServiceNow VA requires extensive configuration of decision trees and dialog flows. Vigil uses LLM reasoning with tool calling, adapting to any IT issue without pre-built flows. The Google Search grounding sub-agent provides real-time web knowledge that no closed KB can match.

---

## 3. Cybersecurity / Scam Protection Competitors

### Google Safe Browsing

| Aspect | Google Safe Browsing | Vigil Shield |
|--------|---------------------|--------------|
| Detection Method | URL blocklist (known threats) | 4-layer: OSINT + Web Risk API + Gemini Vision + Search grounding |
| Visual Analysis | None | Screenshot + DOM analysis for visual scam indicators |
| Fake Content Detection | None | AI detection of fake reviews, counterfeit logos, fabricated testimonials |
| DOM Annotation | None | Red borders, warning overlays on dangerous elements |
| User Interaction | Binary block/allow | Detailed threat explanation via voice or visual overlay |
| Coverage | Known phishing/malware URLs | Known threats + zero-day visual scams + fake content |

**Vigil advantage**: Safe Browsing catches known threats from its blocklist. Vigil adds two layers on top: Gemini Vision analyzes the actual page appearance for scam patterns (fake urgency, misleading buttons, counterfeit branding), and Search grounding verifies domain legitimacy against real-time web data. This catches zero-day scams that blocklists miss.

### Norton Safe Web

| Aspect | Norton Safe Web | Vigil Shield |
|--------|----------------|--------------|
| Analysis | Reputation database + heuristics | AI vision + search grounding + Web Risk API |
| Fake Content | No | Gemini-powered fake review/logo/testimonial detection |
| DOM-Level Detail | Site-level rating only | Element-level annotations (specific buttons, forms, text) |
| Voice Integration | None | Ask Theepa about any suspicious site via voice |
| Cost | Norton 360 subscription | Open source |

**Vigil advantage**: Norton provides a simple trust score per domain. Vigil identifies specific dangerous elements within a page and explains why they are suspicious. The voice integration means a non-technical user can ask "Is this site safe?" and get a conversational, contextual answer.

### VirusTotal

| Aspect | VirusTotal | Vigil Shield |
|--------|-----------|--------------|
| Focus | File and URL scanning via 70+ engines | Real-time browsing protection |
| Speed | Batch scan (seconds to minutes) | Auto-scan on every page load |
| Visual Analysis | None | Gemini Vision page analysis |
| User Experience | Technical interface for security professionals | Consumer-friendly Chrome extension + voice |
| Fake Content | No | AI-powered detection |
| Browser Integration | None (manual URL submission) | Chrome extension with auto-scan |

**Vigil advantage**: VirusTotal is a powerful security research tool but requires manual submission and technical expertise to interpret results. Vigil operates transparently in the background, scanning every page the user visits and surfacing warnings in plain language.

---

## 4. Why Vigil Is Different

### Voice-First Architecture
No other IT helpdesk or scam protection tool uses bidirectional voice streaming as its primary interface. Vigil uses Gemini Live API for natural, interruptible voice conversation. Users speak their problem instead of typing tickets or navigating menus.

### Multi-Agent Orchestration
Four specialized ADK agents collaborate: Theepa handles IT diagnostics, Vigil handles threat detection, Researcher grounds IT responses in web search, and Threat Intel verifies scam claims. No competitor uses this level of agent specialization.

### Fake Content Detection
No browser security tool currently offers AI-powered detection of fake reviews, counterfeit logos, or fabricated testimonials. Vigil's `detect_fake_content` tool uses Gemini Vision to identify content that looks legitimate to humans but follows known deception patterns.

### DOM-Level Annotations
Instead of a simple "safe/unsafe" site rating, Vigil's `highlight_danger_zones` tool annotates specific page elements: dangerous download buttons, phishing form fields, misleading countdown timers, fake trust badges. This teaches users what to watch for.

### Unified IT + Security Platform
Competitors address IT support OR security, never both. A user experiencing a suspicious login page can ask Theepa about it. Theepa delegates to Vigil for threat analysis, gets context from Threat Intel via web search, and guides the user through both the security concern and any IT actions needed.

---

## 5. Competitive Positioning Summary

```
                    Voice-First
                        │
                   Vigil ●
                        │
    IT Helpdesk ────────┼──────── Security
                        │
         Freshdesk ●    │    ● Norton
         Zendesk ●      │    ● Google Safe Browsing
         ServiceNow ●   │    ● VirusTotal
                        │
                   Text/Manual
```

Vigil is the only solution in the upper-center of this grid: voice-first, spanning both IT helpdesk and cybersecurity, with multi-agent AI orchestration.
