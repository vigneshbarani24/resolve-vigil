# Guardian — Backlog

## High Priority

### Backend Persistence Layer
Store all session data in a database for analytics, compliance, and audit trails.

**What to store:**
- ITSM Tickets (created/updated during sessions)
- Conversation Transcripts (full user + agent text)
- Audio Recordings (raw session audio)
- CSAT Ratings + Comments
- RCA Reports (root cause analysis documents)
- Tool Call Logs (every tool invocation with args + results)
- Session Metadata (duration, language, sentiment history, detected info)
- User Profiles (name, role, frequency of issues)

**Considerations:**
- Cloud SQL (PostgreSQL) or Firestore for structured data
- Cloud Storage for audio recordings and large documents
- API endpoints: `/api/session/:token/save`, `/api/session/:token/feedback`
- Data retention policies
- Export to CSV/PDF for reporting

---

## Medium Priority

- [ ] Session replay (playback transcript + tool calls timeline)
- [ ] Dashboard with aggregate CSAT scores, avg resolution time, top error codes
- [ ] Email/Slack notification on P1 ticket creation
- [ ] Multi-user session history (list past sessions per user)
- [ ] RCA report PDF export

## Low Priority

- [ ] Light/dark theme toggle in session view
- [ ] Keyboard shortcuts (mute, end session, toggle panel)
- [ ] Mobile-optimized layout refinements
