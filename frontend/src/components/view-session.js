import { GeminiLiveAPI, MultimodalLiveResponseType } from '../lib/gemini-live/geminilive.js';
import { AudioStreamer, AudioPlayer, ScreenCapture } from '../lib/gemini-live/mediaUtils.js';
import './audio-visualizer.js';
import './live-transcript.js';
import './issue-panel.js';
import './diagnostic-tracker.js';
import './agent-guidance.js';

const SAP_SYSTEM_PROMPT = `You are Jessica, the Senior S-A-P AMS Control Tower veteran for KaarTech — codename "Guardian". You are a Tier 0.5 agent that bridges user intent and technical resolution.

PERSONALITY:
- Skeptical but helpful: "Trust, but verify." Users unintentionally omit steps.
- SLA-obsessed: Categorize issues into P1 (Showstopper), P2 (Critical), P3 (Standard).
- Defensive solutioning: Don't just fix errors; ensure they don't bounce back.
- Professional, authoritative, technically precise. Max 2-3 sentences per response.
- Pronounce S-A-P as individual letters. Never say "Sap." T-codes with pauses: "V-A... zero... one."

PROTOCOL:
1. Triage (First 30s): Assess impact. "Is this affecting just your ID, or the whole team?" Capture error number, T-code, module.
2. Sanity Check: Force recreation. "/n before the T-code." Watch them input data live. Rule out stale buffers, variant drift, human error.
3. Speed Loop: Command user to run diagnostic T-codes (S-U-5-3, S-M-1-2, M-M-R-V, S-M-3-7) and report results.
4. Fix or Escalate: If KB fix works, close it. If not, escalate with full Ironclad RCA.

SCREEN ANALYSIS:
- When users share screens, identify T-codes, error messages, field values, navigation paths, ALV grids.

TOOLS — USE AGGRESSIVELY:
- search_knowledge_base: Search FIRST before responding to any error.
- lookup_sap_error: Look up error codes immediately when spotted.
- lookup_transaction_code: Get T-code details.
- create_issue: Log every detected problem to the issue panel.
- create_itsm_ticket: Every conversation gets a ticket. Use AMS Diagnostic Report format.
- update_itsm_ticket: Update tickets with resolution or escalation notes.
- diagnose_sap_issue: Cross-reference KB, error codes, and transaction context.

GUARDRAILS:
- Direct commands only. Never "I am checking." Say "Run S-M-1-2 and tell me what you see."
- No fluff. No small talk. Focus on the error message number.
- No system access. Guide user to run T-codes and report back.
- Never guess. If KB has no match, escalate.
- Ticket discipline. No conversation goes unlogged.

GREETING:
When the session begins, introduce yourself with this exact greeting:
"Hey, I'm Jessica, your S-A-P Guardian at KaarTech. I'm here to walk through your technical queries with you or prepare a detailed diagnostic for our senior team if the situation requires further investigation. Who am I speaking with, and what part of S-A-P are we looking into today?"
After the greeting, proceed to triage.`;

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
    }

    connectedCallback() {
        this.innerHTML = `
            <style>
                .session-shell {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    overflow: hidden;
                    padding: 0;
                }

                /* ─── Top bar ─── */
                .session-topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    flex-shrink: 0;
                    background: rgba(0,0,0,0.15);
                }

                .topbar-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .back-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    color: var(--color-text-main);
                    opacity: 0.6;
                    transition: opacity 0.2s;
                }
                .back-btn:hover { opacity: 1; }

                .topbar-title {
                    font-size: 0.95rem;
                    font-weight: 800;
                    letter-spacing: 0.03em;
                }

                .topbar-subtitle {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--color-accent-primary, #4d9ff7);
                    opacity: 0.8;
                }

                .topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .lang-pill {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: var(--color-accent-secondary, #f0ab00);
                    background: rgba(240, 171, 0, 0.1);
                    border: 1px solid rgba(240, 171, 0, 0.2);
                    padding: 2px 10px;
                    border-radius: var(--radius-full);
                    display: none;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                /* ─── Diagnostic tracker strip ─── */
                .tracker-strip {
                    padding: 8px 24px;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                    flex-shrink: 0;
                    background: rgba(0,0,0,0.08);
                }

                /* ─── Main content area ─── */
                .session-body {
                    flex: 1;
                    display: flex;
                    gap: 0;
                    overflow: hidden;
                    min-height: 0;
                }

                /* Left column: screen share */
                .col-screen {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid rgba(255,255,255,0.06);
                    min-width: 0;
                }

                .screen-preview-box {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.2);
                    position: relative;
                    overflow: hidden;
                    min-height: 0;
                }

                .screen-preview-box video,
                .screen-preview-box img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .screen-placeholder-inner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    opacity: 0.3;
                }

                .screen-controls {
                    display: flex;
                    gap: 8px;
                    padding: 8px 12px;
                    justify-content: center;
                    border-top: 1px solid rgba(255,255,255,0.04);
                    background: rgba(0,0,0,0.1);
                }

                .screen-btn-sm {
                    padding: 5px 12px;
                    font-size: 0.72rem;
                    font-weight: 700;
                    border-radius: var(--radius-full);
                    background: rgba(255,255,255,0.04);
                    color: var(--color-text-main);
                    border: 1px solid rgba(255,255,255,0.08);
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .screen-btn-sm:hover {
                    background: var(--color-accent-glow);
                    border-color: var(--color-accent-primary);
                    color: var(--color-accent-primary);
                }
                .screen-btn-sm:disabled {
                    opacity: 0.4;
                    cursor: default;
                }
                .screen-btn-sm.active-share {
                    background: rgba(229, 115, 115, 0.15);
                    border-color: var(--color-danger);
                    color: var(--color-danger);
                }

                /* Center column: transcript */
                .col-transcript {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid rgba(255,255,255,0.06);
                    min-width: 0;
                    overflow: hidden;
                }

                .col-transcript live-transcript {
                    flex: 1;
                    overflow-y: auto;
                }

                /* Right column: panels */
                .col-panels {
                    width: 320px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    overflow-y: auto;
                }
                .col-panels::-webkit-scrollbar { width: 3px; }
                .col-panels::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

                .panel-section {
                    padding: 10px 14px;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }

                /* ─── Bottom bar: visualizers + CTA ─── */
                .session-footer {
                    display: flex;
                    align-items: center;
                    gap: 0;
                    border-top: 1px solid rgba(255,255,255,0.08);
                    flex-shrink: 0;
                    background: rgba(0,0,0,0.2);
                    height: 80px;
                }

                .viz-cell {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                    padding: 6px 16px;
                    height: 100%;
                    min-width: 0;
                }

                .viz-cell audio-visualizer {
                    width: 100%;
                    height: 48px;
                }

                .viz-label {
                    font-size: 0.6rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    opacity: 0.5;
                }

                .viz-label.you { color: #81c784; }
                .viz-label.jessica { color: var(--color-accent-primary, #4d9ff7); }

                .cta-cell {
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 8px 20px;
                    gap: 4px;
                }

                .session-cta-compact {
                    padding: 10px 28px;
                    border-radius: var(--radius-full);
                    border: 2px solid var(--color-accent-primary, #4d9ff7);
                    background: rgba(77, 159, 247, 0.08);
                    color: var(--color-accent-primary, #4d9ff7);
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.85rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    transition: all 0.25s ease;
                    white-space: nowrap;
                }
                .session-cta-compact:hover {
                    background: rgba(77, 159, 247, 0.18);
                    transform: scale(1.03);
                }
                .session-cta-compact.active {
                    border-color: var(--color-danger, #e57373);
                    background: rgba(229, 115, 115, 0.12);
                    color: var(--color-danger, #e57373);
                    animation: ctaPulse 2s ease-in-out infinite;
                }

                @keyframes ctaPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(229, 115, 115, 0); }
                    50% { box-shadow: 0 0 16px 2px rgba(229, 115, 115, 0.15); }
                }

                .status-text {
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    height: 1em;
                    transition: all 0.3s;
                }

                /* ─── Responsive ─── */
                @media (max-width: 1024px) {
                    .col-panels { width: 260px; }
                }
                @media (max-width: 768px) {
                    .session-body { flex-direction: column; }
                    .col-screen { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); max-height: 35vh; }
                    .col-transcript { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); }
                    .col-panels { width: 100%; max-height: 200px; flex-direction: row; overflow-x: auto; }
                    .session-footer { height: 70px; }
                }
            </style>

            <div class="session-shell">
                <!-- ═══ Top bar ═══ -->
                <div class="session-topbar">
                    <div class="topbar-left">
                        <button class="back-btn" id="back-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                            </svg>
                        </button>
                        <div>
                            <div class="topbar-title">Guardian</div>
                            <div class="topbar-subtitle">Jessica &middot; AMS Control Tower</div>
                        </div>
                    </div>
                    <div class="topbar-right">
                        <span class="lang-pill" id="lang-pill"></span>
                    </div>
                </div>

                <!-- ═══ Diagnostic tracker ═══ -->
                <div class="tracker-strip">
                    <diagnostic-tracker id="diagnostic-tracker"></diagnostic-tracker>
                </div>

                <!-- ═══ Three-column body ═══ -->
                <div class="session-body">
                    <!-- Left: Screen share -->
                    <div class="col-screen">
                        <div class="screen-preview-box" id="screen-preview-box">
                            <div class="screen-placeholder-inner" id="screen-placeholder">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                                <span style="font-size: 0.78rem;">Share your SAP screen</span>
                            </div>
                        </div>
                        <div class="screen-controls" id="screen-controls">
                            <button class="screen-btn-sm" id="screen-share-btn" disabled>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                                Share Screen
                            </button>
                            <button class="screen-btn-sm" id="screenshot-btn" disabled>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                Upload Screenshot
                            </button>
                        </div>
                    </div>

                    <!-- Center: Transcript -->
                    <div class="col-transcript">
                        <live-transcript id="transcript"></live-transcript>
                    </div>

                    <!-- Right: Panels -->
                    <div class="col-panels">
                        <div class="panel-section">
                            <agent-guidance id="agent-guidance"></agent-guidance>
                        </div>
                        <div class="panel-section" style="flex: 1;">
                            <issue-panel id="issue-panel"></issue-panel>
                        </div>
                    </div>
                </div>

                <!-- ═══ Footer: Visualizers + CTA ═══ -->
                <div class="session-footer">
                    <div class="viz-cell">
                        <span class="viz-label you">You</span>
                        <audio-visualizer id="user-viz" color="#81c784"></audio-visualizer>
                    </div>

                    <div class="cta-cell">
                        <button class="session-cta-compact" id="mic-btn">Start Session</button>
                        <span class="status-text" id="connection-status"></span>
                    </div>

                    <div class="viz-cell">
                        <span class="viz-label jessica">Jessica</span>
                        <audio-visualizer id="model-viz" color="#4d9ff7"></audio-visualizer>
                    </div>
                </div>
            </div>

            <input type="file" id="file-input" accept="image/*" style="display: none;" />
        `;

        this.bindEvents();
    }

    disconnectedCallback() {
        this.cleanup();
    }

    bindEvents() {
        const backBtn = this.querySelector('#back-btn');
        const micBtn = this.querySelector('#mic-btn');
        const screenShareBtn = this.querySelector('#screen-share-btn');
        const screenshotBtn = this.querySelector('#screenshot-btn');
        const fileInput = this.querySelector('#file-input');
        const statusEl = this.querySelector('#connection-status');

        backBtn.addEventListener('mouseover', () => backBtn.style.opacity = '1');
        backBtn.addEventListener('mouseout', () => backBtn.style.opacity = '0.7');

        backBtn.addEventListener('click', () => {
            this.cleanup();
            this.dispatchEvent(new CustomEvent('navigate', {
                bubbles: true,
                detail: { view: 'home' }
            }));
        });

        // Mic / Session toggle
        micBtn.addEventListener('click', async () => {
            this.isSpeaking = !this.isSpeaking;

            if (this.isSpeaking) {
                micBtn.classList.add('active');
                micBtn.textContent = 'End Session';
                await this.startSession(statusEl);
            } else {
                micBtn.classList.remove('active');
                this.endSession();
            }
        });

        // Screen share toggle
        screenShareBtn.addEventListener('click', () => this.toggleScreenShare());

        // Screenshot upload
        screenshotBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleScreenshotUpload(e));
    }

    async startSession(statusEl) {
        try {
            statusEl.textContent = 'Connecting...';
            statusEl.style.color = 'var(--color-text-sub)';

            // Initialize client
            const language = this.getAttribute('language') || 'English';
            let systemPrompt = SAP_SYSTEM_PROMPT;
            if (language && language !== 'English') {
                systemPrompt += `\n\n# Language\nYou MUST respond in ${language}. All your spoken responses and conversational text must be in ${language}.\nHowever, all ITSM tickets, RCA reports, error code lookups, and technical documentation must remain in English regardless of the conversation language.\nTool function calls and their parameters must always be in English.\n`;
            }
            this.geminiClient = new GeminiLiveAPI();
            this.geminiClient.setSystemInstructions(systemPrompt);
            this.geminiClient.setInputAudioTranscription(true);
            this.geminiClient.setOutputAudioTranscription(true);
            this.geminiClient.setVoice('Kore');
            this.geminiClient.setResponseModalities(['AUDIO']);

            // Tools are registered server-side (see server/tools/registry.py)
            // The backend merges tool declarations into the setup config
            this.geminiClient.setEnableFunctionCalls(true);

            // Response handler
            this.geminiClient.onReceiveResponse = (response) => {
                this.handleResponse(response);
            };

            this.geminiClient.onConnectionStarted = () => {
                console.log('Connection started');
            };

            this.geminiClient.onError = (error) => {
                console.error('Gemini error:', error);
            };

            this.geminiClient.onClose = () => {
                console.log('Connection closed');
            };

            // Connect (pass language for server-side session state)
            await this.geminiClient.connect('', language);

            // Audio player
            this.audioPlayer = new AudioPlayer();
            await this.audioPlayer.init();

            // Audio streamer
            this.audioStreamer = new AudioStreamer(this.geminiClient);
            await this.audioStreamer.start();

            // Connect visualizers
            const userViz = this.querySelector('#user-viz');
            const modelViz = this.querySelector('#model-viz');

            if (this.audioStreamer.audioContext && this.audioStreamer.source) {
                userViz.connect(this.audioStreamer.audioContext, this.audioStreamer.source);
            }

            if (this.audioPlayer.audioContext && this.audioPlayer.gainNode) {
                modelViz.connect(this.audioPlayer.audioContext, this.audioPlayer.gainNode);
            }

            this._isSessionConnected = true;
            this.sessionToken = this.geminiClient.sessionToken;  // Store auth token for summary
            statusEl.textContent = 'Connected and listening';
            statusEl.style.color = '#81c784';

            // Show language badge if non-English
            const lang = this.getAttribute('language') || 'English';
            if (lang !== 'English') {
                const langPill = this.querySelector('#lang-pill');
                if (langPill) { langPill.style.display = ''; langPill.textContent = lang; }
            }

            // Enable screen buttons
            this.querySelector('#screen-share-btn').disabled = false;
            this.querySelector('#screenshot-btn').disabled = false;

            // Clear transcript
            this.querySelector('#transcript').clear();

        } catch (err) {
            console.error('Failed to start:', err);
            this.isSpeaking = false;

            const micBtn = this.querySelector('#mic-btn');
            micBtn.classList.remove('active');
            micBtn.textContent = 'Start Session';

            const statusEl = this.querySelector('#connection-status');
            statusEl.textContent = err.status === 429 ? 'Rate limited' : 'Connection failed';
            statusEl.style.color = '#e57373';
        }
    }

    handleResponse(response) {
        switch (response.type) {
            case MultimodalLiveResponseType.AUDIO:
                if (this.audioPlayer) {
                    this.audioPlayer.play(response.data);
                }
                break;

            case MultimodalLiveResponseType.INPUT_TRANSCRIPTION:
                if (response.data && response.data.text) {
                    this.querySelector('#transcript').addInputTranscript(
                        response.data.text, response.data.finished
                    );
                }
                break;

            case MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION:
                if (response.data && response.data.text) {
                    this.querySelector('#transcript').addOutputTranscript(
                        response.data.text, response.data.finished
                    );
                }
                break;

            case MultimodalLiveResponseType.INTERRUPTED:
                if (this.audioPlayer) this.audioPlayer.interrupt();
                this.querySelector('#transcript').finalizeAll();
                break;

            case MultimodalLiveResponseType.TURN_COMPLETE:
                this.querySelector('#transcript').finalizeAll();
                break;

            case MultimodalLiveResponseType.TOOL_CALL:
                // Client-side tool calls (if any remain)
                if (response.data && response.data.functionCalls) {
                    for (const fc of response.data.functionCalls) {
                        this.geminiClient.callFunction(fc.name, fc.args);
                        this.geminiClient.sendToolResponse(fc.id, { result: 'success' });
                    }
                }
                break;

            case MultimodalLiveResponseType.SERVER_TOOL_CALL:
                // Backend-handled tool call — update UI accordingly
                this.handleServerToolEvent(response.data);
                break;

            case 'SESSION_STATE':
                // Session state update from server
                this.handleSessionState(response.data);
                break;

            default:
                console.log('Response:', response.type);
        }
    }

    handleSessionState(state) {
        // Update diagnostic tracker
        const tracker = this.querySelector('#diagnostic-tracker');
        if (tracker && tracker.updateFromState) {
            tracker.updateFromState(state);
        }

        // Update agent guidance
        const guidance = this.querySelector('#agent-guidance');
        if (guidance && state.agent_guidance && guidance.setGuidance) {
            guidance.setGuidance(state.agent_guidance);
        }

        // Store session token for summary navigation
        if (state.session_id && !this.sessionToken) {
            this.sessionToken = state.session_id;
        }
    }

    handleServerToolEvent(event) {
        const name = event.name;
        const args = event.args || {};
        const result = event.result;

        console.log(`Server tool event: ${name}`, args, result);

        switch (name) {
            case 'create_issue': {
                // Update issue panel with the detected issue
                const issuePanel = this.querySelector('#issue-panel');
                if (issuePanel) {
                    let issueData = result ? (typeof result === 'string' ? JSON.parse(result) : result) : args;
                    // Tool returns {success, issue: {...}, message} — extract the inner issue
                    if (issueData.issue) issueData = issueData.issue;
                    // Fallback: if still no title, use args directly
                    if (!issueData.title && args.title) issueData = args;
                    issuePanel.addIssue(issueData);
                }
                break;
            }
            case 'create_itsm_ticket': {
                // Show ticket creation confirmation in transcript
                const transcript = this.querySelector('#transcript');
                if (transcript && result) {
                    const ticketInfo = typeof result === 'string' ? JSON.parse(result) : result;
                    if (ticketInfo.ticket_id) {
                        transcript.addOutputTranscript(
                            `[Ticket ${ticketInfo.ticket_id} created]`, true
                        );
                    }
                }
                break;
            }
            case 'search_knowledge_base':
            case 'lookup_sap_error':
            case 'lookup_transaction_code':
            case 'diagnose_sap_issue':
                // These are informational — Gemini uses the results in its response
                // No special UI action needed
                break;
            default:
                console.log('Unhandled server tool:', name);
        }
    }

    async toggleScreenShare() {
        const btn = this.querySelector('#screen-share-btn');
        const previewBox = this.querySelector('#screen-preview-box');
        const placeholder = this.querySelector('#screen-placeholder');

        if (this.isScreenSharing) {
            if (this.screenCapture) {
                this.screenCapture.stop();
                this.screenCapture = null;
            }
            this.isScreenSharing = false;
            previewBox.innerHTML = '';
            previewBox.appendChild(placeholder);
            placeholder.style.display = '';
            btn.textContent = 'Share Screen';
            btn.classList.remove('active-share');
        } else {
            try {
                this.screenCapture = new ScreenCapture(this.geminiClient);
                this.screenCapture.onStop = () => {
                    this.isScreenSharing = false;
                    previewBox.innerHTML = '';
                    previewBox.appendChild(placeholder);
                    placeholder.style.display = '';
                    btn.textContent = 'Share Screen';
                    btn.classList.remove('active-share');
                };

                const videoElement = await this.screenCapture.start({
                    fps: 1, width: 1280, height: 720, quality: 0.7,
                });

                this.isScreenSharing = true;
                placeholder.style.display = 'none';

                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
                videoElement.style.objectFit = 'contain';
                previewBox.appendChild(videoElement);

                btn.textContent = 'Stop Sharing';
                btn.classList.add('active-share');
            } catch (error) {
                console.error('Screen share failed:', error);
            }
        }
    }

    handleScreenshotUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1];
            if (this.geminiClient && this.geminiClient.connected) {
                this.geminiClient.sendImageMessage(base64, file.type);

                // Show in preview
                const previewBox = this.querySelector('#screen-preview-box');
                const placeholder = this.querySelector('#screen-placeholder');
                placeholder.style.display = 'none';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';

                // Remove old preview content (keep placeholder hidden)
                const existing = previewBox.querySelector('img, video');
                if (existing) existing.remove();
                previewBox.appendChild(img);
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }

    endSession() {
        this.cleanup();
        this._isSessionConnected = false;
        this.isSpeaking = false;

        const micBtn = this.querySelector('#mic-btn');
        if (micBtn) {
            micBtn.classList.remove('active');
            micBtn.textContent = 'Start Session';
        }

        const statusEl = this.querySelector('#connection-status');
        if (statusEl) {
            statusEl.textContent = '';
        }

        const userViz = this.querySelector('#user-viz');
        const modelViz = this.querySelector('#model-viz');
        if (userViz) userViz.disconnect();
        if (modelViz) modelViz.disconnect();

        // Disable screen buttons
        const screenBtn = this.querySelector('#screen-share-btn');
        const ssBtn = this.querySelector('#screenshot-btn');
        if (screenBtn) screenBtn.disabled = true;
        if (ssBtn) ssBtn.disabled = true;

        // Finalize transcript
        const transcript = this.querySelector('#transcript');
        if (transcript) transcript.finalizeAll();

        // Navigate to summary view if we have a session token
        if (this.sessionToken) {
            const token = this.sessionToken;
            setTimeout(() => {
                this.dispatchEvent(new CustomEvent('navigate', {
                    bubbles: true,
                    detail: { view: 'summary', token }
                }));
            }, 1500);  // Brief delay to let user see final state
        }
    }

    cleanup() {
        if (this.audioStreamer) {
            this.audioStreamer.stop();
            this.audioStreamer = null;
        }
        if (this.audioPlayer) {
            this.audioPlayer.destroy();
            this.audioPlayer = null;
        }
        if (this.screenCapture) {
            this.screenCapture.stop();
            this.screenCapture = null;
            this.isScreenSharing = false;
        }
        if (this.geminiClient) {
            this.geminiClient.disconnect();
            this.geminiClient = null;
        }
    }
}

customElements.define('view-session', ViewSession);
