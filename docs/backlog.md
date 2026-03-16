# Vigil — Product Backlog & Roadmap

> Voice-First IT Support + Real-Time Scam Shield
> Updated: 2026-03-16

---

## High Priority

### Safe Shopping Mode
Add a dedicated shopping protection layer to the Vigil Shield. When a user visits an e-commerce site, automatically verify seller legitimacy, check for price manipulation patterns, detect fake product reviews, and flag suspicious checkout flows. Integrate with Google Shopping data for price comparison grounding.

### Real WHOIS Integration
Replace heuristic domain age checks with live WHOIS API lookups. Query registrar data, creation date, expiration date, registrant country, and nameserver history. Flag domains registered within the last 30 days as elevated risk. Use this data in `check_domain_reputation` and `verify_domain_legitimacy` tools.

### Persistent ITSM Backend
Move ITSM tickets and issue tracker from in-memory storage to a persistent database.

**Storage plan:**
- Cloud SQL (PostgreSQL) or Firestore for tickets, issues, and session metadata
- Cloud Storage for audio recordings and diagnostic reports
- Schema: tickets, issues, sessions, transcripts, tool_call_logs, user_profiles
- API endpoints: `POST /api/session/:token/save`, `POST /api/session/:token/feedback`
- Data retention policies and export to CSV/PDF

### Multi-Tab Shield Dashboard
Create a dedicated dashboard view showing shield scan results across all open tabs. Display: active threat count, per-tab risk score, scan history timeline, and aggregate threat categories. Allow bulk actions (report all, whitelist domain).

---

## Medium Priority

### Enterprise SSO Integration
- [ ] SAML 2.0 / OAuth 2.0 support for enterprise identity providers
- [ ] Role-based access: admin (configure KB, manage policies), agent (full tools), viewer (read-only)
- [ ] Tie ITSM tickets to authenticated user profiles
- [ ] Audit logging for compliance (SOC 2 readiness)

### Vector Search for Knowledge Base
- [ ] Replace JSON keyword search with embedding-based vector search
- [ ] Use Vertex AI text-embedding-005 model to embed KB articles
- [ ] Store embeddings in Vertex AI Vector Search or AlloyDB
- [ ] Improve `search_knowledge_base` accuracy for semantic queries
- [ ] Support incremental KB updates without full re-indexing

### Browser Fingerprint Detection
- [ ] Detect browser fingerprinting scripts in page JavaScript
- [ ] Flag canvas fingerprinting, WebGL fingerprinting, and AudioContext probing
- [ ] Add as a signal to `analyze_page_for_threats` scoring
- [ ] Warn users when a site is collecting excessive device identifiers

### Threat Intelligence Sharing
- [ ] Allow users to submit confirmed threats to a shared threat feed
- [ ] Aggregate anonymized threat reports across Vigil users
- [ ] Use collective data to improve `scan_url_safety` beyond Web Risk API
- [ ] Implement reputation scoring based on community reports
- [ ] API endpoint for external security tools to query the feed

---

## Low Priority

### Session Replay
- [ ] Playback full session transcript with synchronized tool call timeline
- [ ] Show diagnostic state transitions visually
- [ ] Exportable as shareable link for team review

### Analytics Dashboard
- [ ] Aggregate metrics: avg resolution time, top error codes, CSAT scores
- [ ] Shield metrics: threats detected per day, false positive rate, top threat categories
- [ ] Tool usage heatmap (which tools are called most frequently)

### Notification Integrations
- [ ] Email/Slack alerts on P1 ticket creation
- [ ] Webhook support for ITSM ticket lifecycle events
- [ ] Chrome notification for shield alerts when tab is in background

### UX Improvements
- [ ] Light/dark theme toggle (currently dark-only)
- [ ] Keyboard shortcuts (mute mic, end session, toggle panels)
- [ ] Mobile-responsive layout for session view
- [ ] Multilingual support (Theepa persona localization)

### Extension Enhancements
- [ ] Extension popup: quick scan history with risk indicators
- [ ] Right-click context menu: "Scan this link with Vigil"
- [ ] Safe browsing mode: block navigation to high-risk URLs with interstitial warning
- [ ] Extension sync: share whitelist/blocklist across devices via Chrome Sync

---

## Technical Debt

- [ ] Add comprehensive unit tests for all 16 tools
- [ ] Integration tests for WebSocket session lifecycle
- [ ] Load testing for concurrent voice sessions on Cloud Run
- [ ] Structured logging with Cloud Logging integration
- [ ] Error recovery: auto-reconnect WebSocket on network interruption
- [ ] Rate limiting on REST endpoints and shield scan API
