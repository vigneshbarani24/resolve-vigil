import { GeminiLiveAPI, MultimodalLiveResponseType } from '../lib/gemini-live/geminilive.js';
import { AudioStreamer, AudioPlayer, ScreenCapture } from '../lib/gemini-live/mediaUtils.js';
import './audio-visualizer.js';
import './live-transcript.js';
import './issue-panel.js';
import './diagnostic-tracker.js';
import './agent-guidance.js';

const SAP_SYSTEM_PROMPT = `You are Jessica, the Senior S-A-P AMS Control Tower veteran for KaarTech — codename "Guardian". You bridge user intent and technical resolution. You have seen millions of tickets. You are relentless, thorough, and you NEVER close a case with missing information.

PERSONALITY:
- Relentless investigator: You do NOT accept vague answers. If the user says "it's not working," you demand the exact error message number, the exact T-code, and the exact step where it fails.
- Skeptical but helpful: "Trust, but verify." Users unintentionally omit steps. You assume they are leaving things out and you ask follow-up questions to fill gaps.
- SLA-obsessed: Categorize issues into P1 (Showstopper), P2 (Critical), P3 (Standard).
- Defensive solutioning: Don't just fix errors; ensure they don't bounce back.
- Professional, authoritative, technically precise. Max 2-3 sentences per response.
- Pronounce S-A-P as individual letters. Never say "Sap." T-codes with pauses: "V-A... zero... one."

MANDATORY INFORMATION CHECKLIST — YOU MUST COLLECT ALL OF THESE:
Before you can consider ANY issue understood, you MUST have collected:
1. User's name and role
2. Exact error message number or text (e.g., "M7 021", "VF024", "00 058")
3. Exact T-code where the error occurs (e.g., VA01, ME21N, MIGO, FB01)
4. S-A-P Module (FI, CO, SD, MM, PP, Basis, HR, WM, QM)
5. What the user was trying to do (business process step)
6. When it started happening (today? after a transport? after an upgrade?)
7. Who is affected (just them, their team, entire company code, all users)
8. Any recent changes (new role, transport, support pack, config change)
9. Steps to reproduce (exact navigation path and field values)

DO NOT MOVE ON until you have items 1-7. If the user tries to skip, push back firmly:
"I need that error message number before I can do anything. Can you read it to me exactly as it appears on screen?"
"Which T-code were you in when this happened? I need the exact code."
"Is this just you, or is anyone else on your team seeing this?"

PROTOCOL:
1. Triage (First 30s): Capture user name, error number, T-code, module. Assess impact. "Is this affecting just your ID, or the whole team?" Do NOT proceed to diagnosis until you have these basics.
2. Sanity Check (Mandatory): Force recreation. "Type /n, then re-enter the T-code." Watch them input data live. Rule out stale buffers, variant drift, human error. Ask: "What variant are you using? Standard or custom?"
3. Tool Blitz: The MOMENT you have an error code or T-code, call ALL relevant tools:
   - lookup_sap_error with the error code
   - lookup_transaction_code with the T-code
   - search_knowledge_base with the error description
   - diagnose_sap_issue to cross-reference everything
   Do NOT wait. Call them immediately. Call multiple tools per turn.
4. Guided Diagnostics: Command user to run diagnostic T-codes and report results:
   - SU53 for authorization failures
   - SM12 for lock entries
   - SM37 for background job status
   - MMRV for period settings (MM module)
   - SM21 for system log entries
   - ST22 for ABAP dumps
   Ask the user to read you the exact output.
5. Resolution Attempt: Try AT LEAST 2-3 different resolution approaches before escalating. Check KB, try standard fixes, verify config. Only escalate after exhausting your options.
6. Issue Logging: Call create_issue for EVERY distinct problem identified. Include severity, module, and error code.
7. Ticket Creation: Call create_itsm_ticket with the FULL AMS Diagnostic Report. Include ALL collected data — error codes, T-codes, steps to reproduce, diagnostic results, resolution attempts made.

RCA DATA COLLECTION — ASK THESE PROBING QUESTIONS:
- "When was the last time this worked correctly?"
- "Were there any transports moved to production recently?"
- "Has your authorization profile changed? Run S-U-5-3 and tell me if you see red entries."
- "Is this happening in Development or Quality system too, or only Production?"
- "What organizational data are you using — company code, plant, sales org?"
- "Read me the exact text in the status bar at the bottom of the screen."

SCREEN ANALYSIS:
When users share screens, actively call out what you see:
- "I can see you're in T-code VA01. I see error message V1 555 in the status bar."
- Identify T-codes, error messages, field values, navigation paths, ALV grids.
- If you spot an error on screen, immediately call lookup_sap_error without waiting for the user to tell you.

TOOLS — WHEN TO USE EACH:
- search_knowledge_base: Search FIRST when user mentions any error or process issue. Try different terms if no results.
- lookup_sap_error: Call IMMEDIATELY when you hear or see an error code. No delay.
- lookup_transaction_code: Call when any T-code is mentioned to get context.
- diagnose_sap_issue: Use for complex problems to cross-reference KB, errors, and T-codes.
- create_issue: Log a problem AFTER you have confirmed it (not on first mention — verify first).
- create_itsm_ticket: Create ONLY after you have tried to resolve the issue and either fixed it or determined it needs escalation. Include the full AMS Diagnostic Report with all collected data.
- update_itsm_ticket: Update with resolution notes or escalation details.
- research_sap_topic: Google Search grounding for latest OSS notes, patches, and solutions. Use when internal KB has no answer.

CRITICAL TOOL RULES:
- Call lookup and search tools IMMEDIATELY when you have data. Do not announce — just call.
- If KB search returns no results, try different search terms (error code, T-code, error text, module name).

TICKET DISCIPLINE — DO NOT RUSH:
- Do NOT create a ticket until you have collected ALL mandatory information (checklist items 1-9).
- Do NOT create a ticket in the first 2 minutes. Spend that time diagnosing and trying to fix.
- FIRST priority: try to RESOLVE the issue yourself using KB solutions and guided diagnostics.
- SECOND priority: once you have either RESOLVED the issue or determined it needs escalation, create a ticket.
- Resolved issues still get a ticket — mark it as resolved with the fix applied. Every session must end with a ticket documenting what happened.
- Only create a ticket early if the user EXPLICITLY asks for one.
- ONE ticket per session. Never create duplicate tickets.

GUARDRAILS:
- Direct commands only. Never "I am checking." Say "Run S-M-1-2 and tell me if you see any red lock entries."
- No fluff. No small talk. Focus on the error message number.
- No system access. Guide user to run T-codes and report results.
- Never guess. If KB has no match, escalate with full documentation.
- Ticket discipline. No conversation goes unlogged.
- NEVER say "I'll look into it" or "I'll get back to you." Either fix it now or escalate with a complete RCA.
- If the user is vague, do NOT accept it. Push for specifics every time.

TURN-BASED CONVERSATION — THIS IS CRITICAL:
- This is a TURN-BASED conversation. You speak ONCE, then WAIT for the user to respond.
- After you finish speaking, STOP. Do not add follow-up statements. Do not elaborate. Do not rephrase.
- ONE response per turn. Never send multiple consecutive messages.
- If the user hasn't responded yet, WAIT. Do not fill the silence.
- If you asked a question, STOP and wait for the answer. Do not ask another question.
- Do NOT repeat or rephrase what you just said if the user is silent. They heard you.

CRITICAL SPEECH RULES:
- NEVER repeat yourself. If you already said something, do not say it again.
- NEVER confirm the same action twice. If you created a ticket, mention it ONCE then move on.
- Keep responses to 1-2 sentences MAX. Be terse. Every word must serve a purpose.
- Do NOT narrate what you are doing. Do NOT say "I have logged this" or "I am creating a ticket." The user can see the UI updates.
- Create each ticket ONCE. Never create duplicate tickets for the same issue.
- After calling a tool, immediately move to the NEXT diagnostic step. Do not summarize what the tool did.

GREETING:
When the session begins, introduce yourself with this exact greeting:
"Hey, I'm Jessica, your S-A-P Guardian at KaarTech. I'm here to walk through your technical queries with you or prepare a detailed diagnostic for our senior team if the situation requires further investigation. Who am I speaking with, and what part of S-A-P are we looking into today?"
After the greeting, proceed to triage. Immediately ask for their name, the error message, and the T-code.

ABSOLUTE RULE — TURN DISCIPLINE:
After you finish speaking, you MUST yield the floor. Do NOT generate another response until the user speaks next. One turn = one response = then silence. If you have already spoken in this turn, STOP IMMEDIATELY. Do not add anything else. Do not elaborate. Do not rephrase. Do not ask a follow-up question in the same turn. WAIT for the user.`;

const TOOL_META = {
    search_knowledge_base:  { label: 'KB Search',      color: '#4d9ff7', icon: '🔍' },
    lookup_sap_error:       { label: 'Error Lookup',    color: '#e57373', icon: '⚠' },
    lookup_transaction_code:{ label: 'T-Code Lookup',   color: '#ffb74d', icon: '📋' },
    diagnose_sap_issue:     { label: 'Diagnosis',       color: '#ba68c8', icon: '🔬' },
    create_issue:           { label: 'Issue Logged',    color: '#ff8a65', icon: '📌' },
    create_itsm_ticket:     { label: 'Ticket Created',  color: '#81c784', icon: '🎫' },
    update_itsm_ticket:     { label: 'Ticket Updated',  color: '#81c784', icon: '✏' },
    research_sap_topic:     { label: 'Web Research',    color: '#4dd0e1', icon: '🌐' },
};

class ViewSession extends HTMLElement {
    constructor() {
        super();
        this.geminiClient = null;
        this.audioStreamer = null;
        this.audioPlayer = null;
        this.screenCapture = null;
        this._isSessionConnected = false;
        this.isScreenSharing = false;
        this.isSpeaking = false;
        this.sessionToken = null;
        this._timerInterval = null;
        this._sessionStartTime = null;
        this._cmdToastTimeout = null;
        this._currentPriority = null;
        this._toolCallCount = 0;
        this._pendingUserTranscript = '';
        this._pendingModelTranscript = '';
        this._panelOpen = false;
        this._activeTab = 'activity';
        this._toolEntries = [];
        this._logEntries = [];
    }

    connectedCallback() {
        this.innerHTML = `
            <style>
                /* ═══════════════════════════════════════════════════
                   GUARDIAN — Google Meet-Inspired Layout
                   Center: Conversation  |  Bottom: Controls
                   Right panel: On-demand activity/logs
                   ═══════════════════════════════════════════════════ */

                .m-root {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    overflow: hidden;
                    background: var(--color-bg);
                }

                /* ─── Top Bar ─── */
                .m-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 20px;
                    height: 56px;
                    flex-shrink: 0;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                .m-topbar-left {
                    display: flex; align-items: center; gap: 12px;
                }
                .m-back {
                    background: none; border: none; cursor: pointer;
                    color: var(--color-text-main); opacity: 0.3; padding: 6px;
                    border-radius: 50%; display: flex; transition: all 0.2s;
                    width: 36px; height: 36px; align-items: center; justify-content: center;
                }
                .m-back:hover { opacity: 0.7; background: rgba(255,255,255,0.05); }
                .m-title {
                    font-family: var(--font-heading);
                    font-size: 1rem; font-weight: 700;
                    color: var(--color-text-main);
                }
                .m-subtitle {
                    font-size: 0.7rem; color: var(--color-text-sub); opacity: 0.6;
                    margin-left: 8px; font-weight: 600;
                }

                .m-topbar-center {
                    display: flex; align-items: center; gap: 14px;
                    position: absolute; left: 50%; transform: translateX(-50%);
                }
                .m-live-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: #444; transition: all 0.3s;
                }
                .m-live-dot.on {
                    background: #81c784;
                    box-shadow: 0 0 10px rgba(129,199,132,0.5);
                    animation: mPulse 2s ease-in-out infinite;
                }
                @keyframes mPulse {
                    0%,100% { box-shadow: 0 0 5px rgba(129,199,132,0.3); }
                    50% { box-shadow: 0 0 14px rgba(129,199,132,0.7); }
                }
                .m-status {
                    font-size: 0.65rem; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.1em;
                    color: #555; transition: color 0.3s;
                }
                .m-status.on { color: #81c784; }
                .m-timer {
                    font-size: 0.8rem; font-weight: 700;
                    font-variant-numeric: tabular-nums;
                    color: var(--color-text-main); opacity: 0;
                    transition: opacity 0.3s;
                }
                .m-timer.on { opacity: 0.5; }
                .m-sla {
                    font-size: 0.6rem; font-weight: 800;
                    padding: 2px 10px; border-radius: 20px;
                    display: none; letter-spacing: 0.06em;
                    text-transform: uppercase;
                }
                .m-sla.visible { display: inline-flex; }
                .m-sla.p1 { background: rgba(229,115,115,0.12); color: #e57373; border: 1px solid rgba(229,115,115,0.2); }
                .m-sla.p2 { background: rgba(255,183,77,0.12); color: #ffb74d; border: 1px solid rgba(255,183,77,0.2); }
                .m-sla.p3 { background: rgba(129,199,132,0.12); color: #81c784; border: 1px solid rgba(129,199,132,0.2); }

                .m-topbar-right {
                    display: flex; align-items: center; gap: 8px;
                }
                .m-lang {
                    font-size: 0.6rem; font-weight: 700;
                    color: var(--color-accent-secondary);
                    background: rgba(240,171,0,0.06);
                    border: 1px solid rgba(240,171,0,0.1);
                    padding: 2px 10px; border-radius: 20px;
                    display: none; text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                /* ─── Main Content ─── */
                .m-body {
                    flex: 1;
                    display: flex;
                    min-height: 0;
                    position: relative;
                }

                /* Center conversation area */
                .m-center {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                    position: relative;
                }

                .m-conversation {
                    flex: 1;
                    min-height: 0;
                    overflow: hidden;
                    padding: 0 24px;
                }
                .m-conversation live-transcript {
                    display: block; height: 100%;
                }

                /* Screen share preview */
                .m-screen-bar {
                    display: none;
                    padding: 10px 24px;
                    border-top: 1px solid rgba(255,255,255,0.04);
                    flex-shrink: 0;
                }
                .m-screen-bar.visible { display: block; }
                .m-screen-box {
                    max-width: 420px; aspect-ratio: 16/9;
                    border-radius: 12px; overflow: hidden;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.06);
                }
                .m-screen-box video, .m-screen-box img {
                    width: 100%; height: 100%; object-fit: contain;
                }

                /* ─── Bottom Controls (Google Meet style) ─── */
                .m-controls {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 16px 24px;
                    border-top: 1px solid rgba(255,255,255,0.04);
                    flex-shrink: 0;
                    position: relative;
                }

                /* Round control buttons */
                .m-ctrl-btn {
                    width: 48px; height: 48px;
                    border-radius: 50%;
                    border: none;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.19, 1, 0.22, 1);
                    position: relative;
                    background: rgba(255,255,255,0.08);
                    color: var(--color-text-main);
                }
                .m-ctrl-btn:hover {
                    background: rgba(255,255,255,0.14);
                    transform: scale(1.05);
                }
                .m-ctrl-btn:disabled {
                    opacity: 0.25; cursor: default;
                    transform: none !important;
                }
                .m-ctrl-btn:disabled:hover {
                    background: rgba(255,255,255,0.08);
                }
                .m-ctrl-btn.active-share {
                    background: rgba(229,115,115,0.15);
                    color: #e57373;
                }
                .m-ctrl-btn svg { flex-shrink: 0; }

                /* Tooltip */
                .m-ctrl-btn .m-tip {
                    position: absolute; bottom: calc(100% + 8px);
                    left: 50%; transform: translateX(-50%);
                    background: rgba(0,0,0,0.85); color: #fff;
                    font-size: 0.65rem; font-weight: 600;
                    padding: 4px 10px; border-radius: 6px;
                    white-space: nowrap; pointer-events: none;
                    opacity: 0; transition: opacity 0.15s;
                }
                .m-ctrl-btn:hover .m-tip { opacity: 1; }

                /* The big mic/end button */
                .m-mic-btn {
                    width: 56px; height: 56px;
                    border-radius: 50%;
                    border: none;
                    background: var(--color-accent-primary);
                    color: #fff;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
                    box-shadow: 0 4px 20px rgba(77,159,247,0.3);
                }
                .m-mic-btn:hover {
                    transform: scale(1.08);
                    box-shadow: 0 6px 28px rgba(77,159,247,0.45);
                }
                .m-mic-btn.active {
                    background: #ea4335;
                    box-shadow: 0 4px 20px rgba(234,67,53,0.35);
                }
                .m-mic-btn.active:hover {
                    box-shadow: 0 6px 28px rgba(234,67,53,0.5);
                }

                /* Divider between left/right groups */
                .m-ctrl-divider {
                    width: 1px; height: 28px;
                    background: rgba(255,255,255,0.06);
                    margin: 0 6px;
                }

                /* Visualizers in control bar */
                .m-viz-pair {
                    display: flex; align-items: center; gap: 10px;
                }
                .m-viz-slot {
                    display: flex; flex-direction: column;
                    align-items: center; gap: 1px; width: 70px;
                }
                .m-viz-slot audio-visualizer { width: 100%; height: 30px; }
                .m-viz-tag {
                    font-size: 0.5rem; font-weight: 800;
                    text-transform: uppercase; letter-spacing: 0.1em;
                    opacity: 0.4;
                }
                .m-viz-tag.you { color: #81c784; }
                .m-viz-tag.jess { color: var(--color-accent-primary); }

                /* Panel toggle badge */
                .m-badge {
                    position: absolute; top: -4px; right: -4px;
                    min-width: 16px; height: 16px;
                    border-radius: 8px;
                    background: var(--color-accent-primary);
                    color: #fff; font-size: 0.55rem; font-weight: 800;
                    display: none; align-items: center; justify-content: center;
                    padding: 0 4px;
                }
                .m-badge.visible { display: flex; }

                /* Right controls group (panel toggles) */
                .m-right-controls {
                    position: absolute; right: 24px;
                    display: flex; align-items: center; gap: 8px;
                }

                /* ═══ Side Panel (slides in like GMeet) ═══ */
                .m-panel {
                    width: 0;
                    overflow: hidden;
                    transition: width 0.3s cubic-bezier(0.19, 1, 0.22, 1);
                    border-left: 1px solid transparent;
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                }
                .m-panel.open {
                    width: 380px;
                    border-left-color: rgba(255,255,255,0.05);
                }

                .m-panel-inner {
                    width: 380px;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    min-height: 0;
                }

                /* Panel header with tabs */
                .m-panel-header {
                    display: flex;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    flex-shrink: 0;
                }
                .m-tab {
                    flex: 1;
                    padding: 12px 0;
                    font-size: 0.72rem;
                    font-weight: 700;
                    text-align: center;
                    color: var(--color-text-sub);
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    background: none; border-top: none; border-left: none; border-right: none;
                    font-family: inherit;
                }
                .m-tab:hover { color: var(--color-text-main); }
                .m-tab.active {
                    color: var(--color-accent-primary);
                    border-bottom-color: var(--color-accent-primary);
                }

                /* Panel content */
                .m-panel-body {
                    flex: 1; overflow-y: auto; min-height: 0;
                    padding: 12px;
                }
                .m-panel-section { display: none; }
                .m-panel-section.active { display: block; }

                /* ─── Activity Tab (Tool Calls) ─── */
                .m-tool-entry {
                    display: flex; align-items: flex-start; gap: 10px;
                    padding: 10px 12px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.04);
                    margin-bottom: 8px;
                    animation: mSlideIn 0.3s ease;
                }
                @keyframes mSlideIn {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .m-tool-pip {
                    width: 4px; height: 100%; min-height: 32px;
                    border-radius: 2px; flex-shrink: 0;
                }
                .m-tool-body { flex: 1; min-width: 0; }
                .m-tool-head {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 4px;
                }
                .m-tool-name {
                    font-size: 0.75rem; font-weight: 700;
                    display: flex; align-items: center; gap: 6px;
                }
                .m-tool-time {
                    font-size: 0.6rem; opacity: 0.35;
                    font-variant-numeric: tabular-nums;
                }
                .m-tool-args {
                    font-size: 0.68rem; color: var(--color-text-sub);
                    opacity: 0.6; line-height: 1.4;
                    word-break: break-word;
                }
                .m-tool-result {
                    font-size: 0.65rem; color: #81c784;
                    margin-top: 4px; opacity: 0.7;
                }
                .m-empty {
                    text-align: center; padding: 40px 20px;
                    color: var(--color-text-sub); opacity: 0.3;
                    font-size: 0.85rem;
                }

                /* ─── Transcript Tab ─── */
                .m-tx-entry {
                    padding: 8px 12px;
                    border-radius: 8px;
                    margin-bottom: 6px;
                    font-size: 0.78rem;
                    line-height: 1.5;
                    animation: mSlideIn 0.3s ease;
                }
                .m-tx-entry.user {
                    background: rgba(240,171,0,0.04);
                    border-left: 3px solid rgba(240,171,0,0.3);
                }
                .m-tx-entry.model {
                    background: rgba(77,159,247,0.04);
                    border-left: 3px solid rgba(77,159,247,0.3);
                }
                .m-tx-head {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 2px;
                }
                .m-tx-role {
                    font-size: 0.6rem; font-weight: 800;
                    text-transform: uppercase; letter-spacing: 0.08em;
                    opacity: 0.5;
                }
                .m-tx-time {
                    font-size: 0.55rem; opacity: 0.3;
                    font-variant-numeric: tabular-nums;
                }
                .m-tx-text {
                    color: var(--color-text-main); opacity: 0.8;
                }

                /* ─── Logs Tab ─── */
                .m-log-entry {
                    font-family: 'JetBrains Mono', 'Courier New', monospace;
                    font-size: 0.62rem;
                    padding: 4px 8px;
                    border-radius: 4px;
                    margin-bottom: 3px;
                    color: var(--color-text-sub);
                    opacity: 0.7;
                    line-height: 1.5;
                    word-break: break-all;
                    animation: mSlideIn 0.2s ease;
                }
                .m-log-entry .hl { color: var(--color-accent-primary); font-weight: 700; }
                .m-log-entry .val { color: var(--color-accent-secondary); }
                .m-log-entry .key { color: #ba68c8; }
                .m-log-entry .err { color: #e57373; }
                .m-log-entry.tool { border-left: 2px solid #ba68c8; }
                .m-log-entry.ws { border-left: 2px solid var(--color-accent-primary); }
                .m-log-entry.error { border-left: 2px solid #e57373; }
                .m-log-entry.event { border-left: 2px solid var(--color-accent-secondary); }
                .m-log-entry.info { border-left: 2px solid #4dd0e1; }

                /* ─── T-code Toast ─── */
                .m-cmd-toast {
                    position: fixed; top: 64px; left: 50%;
                    transform: translateX(-50%); z-index: 100;
                    background: rgba(77,159,247,0.1);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(77,159,247,0.2);
                    border-radius: 12px; padding: 8px 18px;
                    display: flex; align-items: center; gap: 12px;
                    animation: cmdIn 0.3s ease;
                }
                .m-cmd-toast .cmd-label { font-size: 0.58rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-accent-primary); opacity: 0.7; }
                .m-cmd-toast .cmd-code { font-size: 1rem; font-weight: 800; color: var(--color-text-main); letter-spacing: 0.06em; }
                .m-cmd-toast .cmd-copy { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: var(--color-text-main); cursor: pointer; font-size: 0.58rem; font-weight: 700; padding: 3px 9px; transition: all 0.2s; }
                .m-cmd-toast .cmd-copy:hover { background: rgba(77,159,247,0.12); }
                @keyframes cmdIn { from { opacity:0; transform: translateX(-50%) translateY(-8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }

                /* ─── Mobile ─── */
                @media (max-width: 768px) {
                    .m-topbar-center { display: none; }
                    .m-panel.open { width: 100%; position: absolute; right: 0; top: 0; bottom: 0; z-index: 50; background: var(--color-bg); }
                    .m-panel-inner { width: 100%; }
                    .m-controls { padding: 12px 16px; gap: 8px; }
                    .m-mic-btn { width: 48px; height: 48px; }
                    .m-ctrl-btn { width: 40px; height: 40px; }
                    .m-right-controls { position: static; }
                    .m-controls { flex-wrap: wrap; justify-content: center; }
                }

                /* Scrollbar in panel */
                .m-panel-body::-webkit-scrollbar { width: 3px; }
                .m-panel-body::-webkit-scrollbar-track { background: transparent; }
                .m-panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
            </style>

            <div class="m-root">
                <!-- Top Bar -->
                <div class="m-topbar">
                    <div class="m-topbar-left">
                        <button class="m-back" id="back-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                        </button>
                        <span class="m-title">Resolve</span>
                        <span class="m-subtitle">Jessica</span>
                    </div>

                    <div class="m-topbar-center">
                        <span class="m-live-dot" id="live-dot"></span>
                        <span class="m-status" id="connection-status">Offline</span>
                        <span class="m-timer" id="session-timer">00:00</span>
                        <span class="m-sla" id="sla-badge"></span>
                    </div>

                    <div class="m-topbar-right">
                        <span class="m-lang" id="lang-pill"></span>
                    </div>
                </div>

                <!-- Main Body -->
                <div class="m-body">
                    <!-- Center: Conversation -->
                    <div class="m-center">
                        <div class="m-conversation">
                            <live-transcript id="transcript"></live-transcript>
                        </div>
                        <div class="m-screen-bar" id="screen-section">
                            <div class="m-screen-box" id="screen-preview-box"></div>
                        </div>
                    </div>

                    <!-- Right Panel (slides in on demand) -->
                    <div class="m-panel" id="side-panel">
                        <div class="m-panel-inner">
                            <div class="m-panel-header">
                                <button class="m-tab active" data-tab="activity">Activity</button>
                                <button class="m-tab" data-tab="transcript">Transcript</button>
                                <button class="m-tab" data-tab="logs">Logs</button>
                            </div>
                            <div class="m-panel-body">
                                <div class="m-panel-section active" id="tab-activity">
                                    <div class="m-empty" id="activity-empty">Agent activity will appear here</div>
                                </div>
                                <div class="m-panel-section" id="tab-transcript">
                                    <div class="m-empty" id="transcript-empty">Conversation transcript will appear here</div>
                                </div>
                                <div class="m-panel-section" id="tab-logs">
                                    <div class="m-empty" id="logs-empty">System logs will appear here</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Controls (Google Meet style) -->
                <div class="m-controls">
                    <!-- Left group: Media controls -->
                    <button class="m-ctrl-btn" id="screen-share-btn" disabled>
                        <span class="m-tip">Share Screen</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                    </button>
                    <button class="m-ctrl-btn" id="screenshot-btn" disabled>
                        <span class="m-tip">Paste Image</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </button>

                    <div class="m-ctrl-divider"></div>

                    <!-- Center: Viz + Mic -->
                    <div class="m-viz-pair">
                        <div class="m-viz-slot">
                            <audio-visualizer id="user-viz" color="#81c784"></audio-visualizer>
                            <span class="m-viz-tag you">You</span>
                        </div>

                        <button class="m-mic-btn" id="mic-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                            </svg>
                        </button>

                        <div class="m-viz-slot">
                            <audio-visualizer id="model-viz" color="#4d9ff7"></audio-visualizer>
                            <span class="m-viz-tag jess">Jessica</span>
                        </div>
                    </div>

                    <div class="m-ctrl-divider"></div>

                    <!-- Right group: Panel toggles -->
                    <div class="m-right-controls">
                        <button class="m-ctrl-btn" id="toggle-activity-btn">
                            <span class="m-tip">Activity</span>
                            <span class="m-badge" id="tool-badge">0</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        </button>
                        <button class="m-ctrl-btn" id="toggle-transcript-btn">
                            <span class="m-tip">Transcript</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </button>
                        <button class="m-ctrl-btn" id="toggle-logs-btn">
                            <span class="m-tip">Logs</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            <input type="file" id="file-input" accept="image/*" style="display: none;" />
        `;

        this.bindEvents();
    }

    disconnectedCallback() {
        this.cleanup();
        if (this._pasteHandler) document.removeEventListener('paste', this._pasteHandler);
    }

    bindEvents() {
        const backBtn = this.querySelector('#back-btn');
        const micBtn = this.querySelector('#mic-btn');
        const screenShareBtn = this.querySelector('#screen-share-btn');
        const screenshotBtn = this.querySelector('#screenshot-btn');
        const fileInput = this.querySelector('#file-input');
        const statusEl = this.querySelector('#connection-status');

        backBtn.addEventListener('click', () => {
            this.cleanup();
            this.dispatchEvent(new CustomEvent('navigate', { bubbles: true, detail: { view: 'home' } }));
        });

        micBtn.addEventListener('click', async () => {
            this.isSpeaking = !this.isSpeaking;
            if (this.isSpeaking) {
                micBtn.classList.add('active');
                micBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>`;
                await this.startSession(statusEl);
            } else {
                micBtn.classList.remove('active');
                this.endSession();
            }
        });

        screenShareBtn.addEventListener('click', () => this.toggleScreenShare());
        screenshotBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleScreenshotUpload(e));

        // Panel toggle buttons
        this.querySelector('#toggle-activity-btn').addEventListener('click', () => this._togglePanel('activity'));
        this.querySelector('#toggle-transcript-btn').addEventListener('click', () => this._togglePanel('transcript'));
        this.querySelector('#toggle-logs-btn').addEventListener('click', () => this._togglePanel('logs'));

        // Tab switching
        this.querySelectorAll('.m-tab').forEach(tab => {
            tab.addEventListener('click', () => this._switchTab(tab.dataset.tab));
        });

        // Paste handler
        this._pasteHandler = (e) => {
            if (!this._isSessionConnected) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        const base64 = ev.target.result.split(',')[1];
                        this._sendImageToServer(base64);
                        this._showImagePreview(ev.target.result);
                    };
                    reader.readAsDataURL(blob);
                    break;
                }
            }
        };
        document.addEventListener('paste', this._pasteHandler);
    }

    _togglePanel(tab) {
        const panel = this.querySelector('#side-panel');
        if (this._panelOpen && this._activeTab === tab) {
            panel.classList.remove('open');
            this._panelOpen = false;
        } else {
            panel.classList.add('open');
            this._panelOpen = true;
            this._switchTab(tab);
        }
    }

    _switchTab(tab) {
        this._activeTab = tab;
        this.querySelectorAll('.m-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        this.querySelectorAll('.m-panel-section').forEach(s => s.classList.remove('active'));
        this.querySelector(`#tab-${tab}`)?.classList.add('active');
    }

    // ─── Panel data methods ───
    _addToolEntry(name, args, result, meta, time) {
        this._toolCallCount++;
        const badge = this.querySelector('#tool-badge');
        badge.textContent = this._toolCallCount;
        badge.classList.add('visible');

        const container = this.querySelector('#tab-activity');
        const empty = this.querySelector('#activity-empty');
        if (empty) empty.remove();

        const argsStr = JSON.stringify(args || {}).slice(0, 120);
        let resultStr = '';
        if (result) {
            try {
                const r = typeof result === 'string' ? JSON.parse(result) : result;
                if (r.title) resultStr = r.title;
                else if (r.ticket_id) resultStr = `Ticket ${r.ticket_id}`;
                else if (r.source_count) resultStr = `${r.source_count} sources found`;
                else resultStr = JSON.stringify(r).slice(0, 60);
            } catch { resultStr = String(result).slice(0, 60); }
        }

        const entry = document.createElement('div');
        entry.className = 'm-tool-entry';
        entry.innerHTML = `
            <div class="m-tool-pip" style="background:${meta.color}"></div>
            <div class="m-tool-body">
                <div class="m-tool-head">
                    <span class="m-tool-name" style="color:${meta.color}">${meta.icon || ''} ${meta.label}</span>
                    <span class="m-tool-time">${time}</span>
                </div>
                <div class="m-tool-args">${argsStr}</div>
                ${resultStr ? `<div class="m-tool-result">${resultStr}</div>` : ''}
            </div>
        `;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }

    _addTranscriptEntry(role, text, time) {
        const container = this.querySelector('#tab-transcript');
        const empty = this.querySelector('#transcript-empty');
        if (empty) empty.remove();

        const entry = document.createElement('div');
        entry.className = `m-tx-entry ${role}`;
        entry.innerHTML = `
            <div class="m-tx-head">
                <span class="m-tx-role">${role === 'user' ? 'You' : 'Jessica'}</span>
                <span class="m-tx-time">${time}</span>
            </div>
            <div class="m-tx-text">${text}</div>
        `;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }

    _addLogEntry(type, html) {
        const container = this.querySelector('#tab-logs');
        const empty = this.querySelector('#logs-empty');
        if (empty) empty.remove();

        const entry = document.createElement('div');
        entry.className = `m-log-entry ${type}`;
        entry.innerHTML = html;
        container.appendChild(entry);
        container.scrollTop = container.scrollHeight;
    }

    // ─── Session lifecycle ───
    async startSession(statusEl) {
        try {
            statusEl.textContent = 'Connecting';
            statusEl.classList.remove('on');

            const language = this.getAttribute('language') || 'English';
            let systemPrompt = SAP_SYSTEM_PROMPT;
            if (language && language !== 'English') {
                systemPrompt += `\n\n# Language\nYou MUST respond in ${language}. ALL your spoken responses must be in ${language}, INCLUDING your very first greeting. Translate the greeting naturally into ${language} — do not speak English at all.\nHowever, all ITSM tickets, RCA reports, error code lookups, and technical documentation must remain in English regardless of the conversation language.\nTool function calls and their parameters must always be in English.\nTechnical terms like S-A-P, T-codes, and module names stay in English even when speaking ${language}.\n`;
            }
            this.geminiClient = new GeminiLiveAPI();
            this.geminiClient.setSystemInstructions(systemPrompt);
            this.geminiClient.setInputAudioTranscription(true);
            this.geminiClient.setOutputAudioTranscription(true);
            this.geminiClient.setVoice('Kore');
            this.geminiClient.setResponseModalities(['AUDIO']);
            this.geminiClient.setEnableFunctionCalls(true);

            this.geminiClient.onReceiveResponse = (r) => this.handleResponse(r);
            this.geminiClient.onConnectionStarted = () => {
                this._addLogEntry('ws', '<span class="hl">WS_OPEN</span> WebSocket session established');
            };
            this.geminiClient.onError = (e) => {
                console.error('Gemini error:', e);
                this._addLogEntry('error', `<span class="hl">WS_ERROR</span> <span class="err">${e?.message || e}</span>`);
            };
            this.geminiClient.onClose = () => {
                this._addLogEntry('ws', '<span class="hl">WS_CLOSE</span> WebSocket disconnected');
            };

            await this.geminiClient.connect('', language);

            this.audioPlayer = new AudioPlayer();
            await this.audioPlayer.init();
            this.audioStreamer = new AudioStreamer(this.geminiClient);
            await this.audioStreamer.start();

            const userViz = this.querySelector('#user-viz');
            const modelViz = this.querySelector('#model-viz');
            if (this.audioStreamer.audioContext && this.audioStreamer.source) userViz.connect(this.audioStreamer.audioContext, this.audioStreamer.source);
            if (this.audioPlayer.audioContext && this.audioPlayer.gainNode) modelViz.connect(this.audioPlayer.audioContext, this.audioPlayer.gainNode);

            this._isSessionConnected = true;
            this.sessionToken = this.geminiClient.sessionToken;
            this._toolCallCount = 0;

            statusEl.textContent = 'Live';
            statusEl.classList.add('on');
            this.querySelector('#live-dot').classList.add('on');
            this.querySelector('#session-timer').classList.add('on');

            this._sessionStartTime = Date.now();
            this._timerInterval = setInterval(() => {
                const el = Math.floor((Date.now() - this._sessionStartTime) / 1000);
                this.querySelector('#session-timer').textContent = `${String(Math.floor(el/60)).padStart(2,'0')}:${String(el%60).padStart(2,'0')}`;
            }, 1000);

            if (language !== 'English') {
                const pill = this.querySelector('#lang-pill');
                if (pill) { pill.style.display = ''; pill.textContent = language; }
            }

            this.querySelector('#screen-share-btn').disabled = false;
            this.querySelector('#screenshot-btn').disabled = false;
            this.querySelector('#transcript').clear();

            this._addLogEntry('info', `<span class="hl">SESSION_INIT</span> lang=<span class="val">${language}</span> model=<span class="val">gemini-live-2.5-flash</span> voice=<span class="val">Kore</span>`);

        } catch (err) {
            console.error('Failed to start:', err);
            this.isSpeaking = false;
            const micBtn = this.querySelector('#mic-btn');
            micBtn.classList.remove('active');
            this._resetMicBtn(micBtn);
            statusEl.textContent = err.status === 429 ? 'Rate limited' : 'Failed';
            statusEl.classList.remove('on');
        }
    }

    _flushTranscriptsToPanel() {
        if (this._pendingUserTranscript.trim()) {
            const text = this._pendingUserTranscript.trim();
            this._addTranscriptEntry('user', text, this._elapsed());
            this._addLogEntry('ws', `<span class="hl">INPUT_TRANSCRIPTION</span> <span class="val">${this._escapeForLog(text)}</span>`);
            this._pendingUserTranscript = '';
        }
        if (this._pendingModelTranscript.trim()) {
            const text = this._pendingModelTranscript.trim();
            this._addTranscriptEntry('model', text, this._elapsed());
            this._addLogEntry('ws', `<span class="hl">OUTPUT_TRANSCRIPTION</span> <span class="val">${this._escapeForLog(text)}</span>`);
            this._pendingModelTranscript = '';
        }
    }

    _escapeForLog(str) {
        const d = document.createElement('div');
        d.textContent = str.length > 100 ? str.slice(0, 100) + '...' : str;
        return d.innerHTML;
    }

    handleResponse(response) {
        switch (response.type) {
            case MultimodalLiveResponseType.AUDIO:
                if (this.audioPlayer) this.audioPlayer.play(response.data);
                this.querySelector('#transcript').showSpeaking();
                break;
            case MultimodalLiveResponseType.INPUT_TRANSCRIPTION:
                if (response.data?.text) {
                    this.querySelector('#transcript').addInputTranscript(response.data.text, response.data.finished);
                    this._pendingUserTranscript += response.data.text;
                }
                break;
            case MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION:
                if (response.data?.text) {
                    this.querySelector('#transcript').addOutputTranscript(response.data.text, response.data.finished);
                    this._detectTcodeCommand(response.data.text);
                    this._pendingModelTranscript += response.data.text;
                }
                break;
            case MultimodalLiveResponseType.INTERRUPTED:
                if (this.audioPlayer) this.audioPlayer.interrupt();
                this.querySelector('#transcript').finalizeAll();
                this._flushTranscriptsToPanel();
                this._addLogEntry('event', '<span class="hl">INTERRUPTED</span> User cut off model response');
                break;
            case MultimodalLiveResponseType.TURN_COMPLETE:
                this.querySelector('#transcript').finalizeAll();
                this._flushTranscriptsToPanel();
                this._addLogEntry('debug', 'TURN_COMPLETE');
                break;
            case MultimodalLiveResponseType.TOOL_CALL:
                if (response.data?.functionCalls) {
                    for (const fc of response.data.functionCalls) {
                        this.geminiClient.callFunction(fc.name, fc.args);
                        this.geminiClient.sendToolResponse(fc.id, { result: 'success' });
                        this._addLogEntry('tool', `<span class="hl">CLIENT_TOOL_CALL</span> <span class="key">${fc.name}</span>(${JSON.stringify(fc.args).slice(0, 80)})`);
                    }
                }
                break;
            case MultimodalLiveResponseType.SERVER_TOOL_CALL:
                this.querySelector('#transcript').showThinking();
                this.handleServerToolEvent(response.data);
                {
                    const meta = TOOL_META[response.data.name] || { label: response.data.name, color: '#888', icon: '' };
                    this._addToolEntry(response.data.name, response.data.args, response.data.result, meta, this._elapsed());
                    const argsSnippet = JSON.stringify(response.data.args || {}).slice(0, 80);
                    this._addLogEntry('tool', `<span class="hl">SERVER_TOOL_CALL</span> <span class="key">${response.data.name}</span>(${argsSnippet})`);
                }
                break;
            case 'SESSION_STATE':
                this.handleSessionState(response.data);
                this._addLogEntry('info', `<span class="hl">SESSION_STATE</span> stage=<span class="val">${response.data?.stage || 'n/a'}</span> checkpoints=<span class="val">${response.data?.checkpoints?.length || 0}</span>`);
                break;
            default:
                this._addLogEntry('debug', `<span class="hl">UNKNOWN</span> type=<span class="val">${response.type}</span>`);
        }
    }

    _elapsed() {
        if (!this._sessionStartTime) return '';
        const s = Math.floor((Date.now() - this._sessionStartTime) / 1000);
        return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    }

    handleSessionState(state) {
        if (state.tickets?.length > 0) {
            const t = state.tickets[state.tickets.length - 1];
            if (t.severity) this._updateSLA(t.severity.toUpperCase());
        } else if (state.issues?.length > 0) {
            const i = state.issues[state.issues.length - 1];
            if (i.severity) this._updateSLA(i.severity.toUpperCase());
        }
        if (state.session_id && !this.sessionToken) this.sessionToken = state.session_id;
    }

    handleServerToolEvent(event) {
        const { name, args = {}, result } = event;
        switch (name) {
            case 'create_issue': {
                const panel = this.querySelector('#issue-panel');
                const slot = this.querySelector('#issues-slot');
                if (panel) {
                    let d = result ? (typeof result === 'string' ? JSON.parse(result) : result) : args;
                    if (d.issue) d = d.issue;
                    if (!d.title && args.title) d = args;
                    panel.addIssue(d);
                    if (slot) slot.classList.add('visible');
                }
                break;
            }
            case 'create_itsm_ticket': {
                if (result) {
                    const info = typeof result === 'string' ? JSON.parse(result) : result;
                    if (info.ticket_id) this.querySelector('#transcript')?.addOutputTranscript(`[Ticket ${info.ticket_id} created]`, true);
                }
                break;
            }
            case 'research_sap_topic': {
                if (result) {
                    const r = typeof result === 'string' ? JSON.parse(result) : result;
                    if (r.success && r.source_count > 0) this.querySelector('#transcript')?.addOutputTranscript(`[Researched: ${r.source_count} web sources]`, true);
                }
                break;
            }
        }
    }

    async toggleScreenShare() {
        const btn = this.querySelector('#screen-share-btn');
        const section = this.querySelector('#screen-section');
        const box = this.querySelector('#screen-preview-box');

        if (this.isScreenSharing) {
            if (this.screenCapture) { this.screenCapture.stop(); this.screenCapture = null; }
            this.isScreenSharing = false;
            box.innerHTML = '';
            section.classList.remove('visible');
            btn.classList.remove('active-share');
        } else {
            try {
                this.screenCapture = new ScreenCapture(this.geminiClient);
                this.screenCapture.onStop = () => {
                    this.isScreenSharing = false;
                    box.innerHTML = '';
                    section.classList.remove('visible');
                    btn.classList.remove('active-share');
                };
                const vid = await this.screenCapture.start({ fps: 1, width: 1280, height: 720, quality: 0.7 });
                this.isScreenSharing = true;
                vid.style.cssText = 'width:100%;height:100%;object-fit:contain;';
                box.appendChild(vid);
                section.classList.add('visible');
                btn.classList.add('active-share');
            } catch (e) { console.error('Screen share failed:', e); }
        }
    }

    _sendImageToServer(b64) {
        if (this.geminiClient?.connected) this.geminiClient.sendMessage({ type: 'image', data: b64 });
    }

    _showImagePreview(dataUrl) {
        const box = this.querySelector('#screen-preview-box');
        const section = this.querySelector('#screen-section');
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
        const existing = box.querySelector('img, video');
        if (existing) existing.remove();
        box.appendChild(img);
        section.classList.add('visible');
    }

    handleScreenshotUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            this._sendImageToServer(ev.target.result.split(',')[1]);
            this._showImagePreview(ev.target.result);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    endSession() {
        this.cleanup();
        this._isSessionConnected = false;
        this.isSpeaking = false;

        const micBtn = this.querySelector('#mic-btn');
        if (micBtn) { micBtn.classList.remove('active'); this._resetMicBtn(micBtn); }

        const statusEl = this.querySelector('#connection-status');
        if (statusEl) { statusEl.textContent = 'Ended'; statusEl.classList.remove('on'); }
        this.querySelector('#live-dot')?.classList.remove('on');

        if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }

        this.querySelector('#user-viz')?.disconnect();
        this.querySelector('#model-viz')?.disconnect();
        this.querySelector('#screen-share-btn').disabled = true;
        this.querySelector('#screenshot-btn').disabled = true;
        this.querySelector('#transcript')?.finalizeAll();

        if (this.sessionToken) {
            const token = this.sessionToken;
            setTimeout(() => {
                this.dispatchEvent(new CustomEvent('navigate', { bubbles: true, detail: { view: 'summary', token } }));
            }, 1500);
        }
    }

    _resetMicBtn(btn) {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
    }

    _detectTcodeCommand(text) {
        const m = text.match(/\b([A-Z]{2,4}\d{1,3}[A-Z]?)\b/g);
        if (!m) return;
        for (const t of m) {
            if (['THE','AND','FOR','NOT','YOU','ARE','HAS','WAS','MAX'].includes(t)) continue;
            this._showCmdToast(t);
            break;
        }
    }

    _showCmdToast(tcode) {
        document.querySelector('.m-cmd-toast')?.remove();
        if (this._cmdToastTimeout) clearTimeout(this._cmdToastTimeout);
        const toast = document.createElement('div');
        toast.className = 'm-cmd-toast';
        toast.innerHTML = `<div><span class="cmd-label">Run</span> <span class="cmd-code">${tcode}</span></div><button class="cmd-copy" onclick="navigator.clipboard.writeText('${tcode}');this.textContent='Copied!'">Copy</button>`;
        document.body.appendChild(toast);
        this._cmdToastTimeout = setTimeout(() => { toast.style.opacity='0'; toast.style.transition='opacity 0.3s'; setTimeout(()=>toast.remove(),300); }, 6000);
    }

    _updateSLA(p) {
        const b = this.querySelector('#sla-badge');
        if (!b) return;
        this._currentPriority = p;
        b.className = 'm-sla visible';
        if (p === 'P1') { b.classList.add('p1'); b.textContent = 'P1 \u00b7 15min SLA'; }
        else if (p === 'P2') { b.classList.add('p2'); b.textContent = 'P2 \u00b7 1hr SLA'; }
        else if (p === 'P3') { b.classList.add('p3'); b.textContent = 'P3 \u00b7 4hr SLA'; }
        else b.classList.remove('visible');
    }

    cleanup() {
        if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
        if (this._cmdToastTimeout) { clearTimeout(this._cmdToastTimeout); this._cmdToastTimeout = null; }
        document.querySelector('.m-cmd-toast')?.remove();
        if (this.audioStreamer) { this.audioStreamer.stop(); this.audioStreamer = null; }
        if (this.audioPlayer) { this.audioPlayer.destroy(); this.audioPlayer = null; }
        if (this.screenCapture) { this.screenCapture.stop(); this.screenCapture = null; this.isScreenSharing = false; }
        if (this.geminiClient) { this.geminiClient.disconnect(); this.geminiClient = null; }
    }
}

customElements.define('view-session', ViewSession);
