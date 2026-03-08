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
- Ticket discipline. No conversation goes unlogged.`;

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
                .session-layout {
                    display: flex;
                    flex-direction: column;
                    min-height: 100vh;
                    position: relative;
                    padding: var(--spacing-lg);
                    padding-top: var(--spacing-xxl);
                }

                .session-header {
                    text-align: center;
                    margin-bottom: var(--spacing-lg);
                }

                .session-header h2 {
                    font-size: 1.5rem;
                    margin-bottom: 2px;
                }

                .session-mode-pill {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--color-text-sub);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    background: rgba(0,0,0,0.04);
                    padding: 4px 12px;
                    border-radius: var(--radius-full);
                    width: fit-content;
                    margin: 0 auto;
                    border: 1px solid rgba(0,0,0,0.05);
                }

                .session-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    max-width: 900px;
                    margin: 0 auto;
                    width: 100%;
                }

                .viz-row {
                    width: 100%;
                    height: 100px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }

                .screen-section {
                    width: 100%;
                    max-width: 800px;
                    position: relative;
                }

                .screen-preview-box {
                    width: 100%;
                    aspect-ratio: 16/9;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    background: rgba(0,0,0,0.3);
                    border: var(--glass-border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .screen-preview-box video {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .screen-placeholder-inner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    opacity: 0.4;
                }

                .screen-controls {
                    display: flex;
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-sm);
                    justify-content: center;
                }

                .screen-btn-sm {
                    padding: 6px 14px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    border-radius: var(--radius-full);
                    background: var(--color-surface);
                    color: var(--color-text-main);
                    border: var(--glass-border);
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .screen-btn-sm:hover {
                    background: var(--color-accent-glow);
                    border-color: var(--color-accent-primary);
                    color: var(--color-accent-primary);
                }

                .screen-btn-sm.active-share {
                    background: rgba(229, 115, 115, 0.15);
                    border-color: var(--color-danger);
                    color: var(--color-danger);
                }

                .middle-content {
                    width: 100%;
                    display: flex;
                    gap: var(--spacing-md);
                    flex: 1;
                    min-height: 250px;
                }

                .transcript-section {
                    flex: 1;
                    min-width: 0;
                    position: relative;
                }

                .right-panel {
                    width: 320px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                    gap: var(--spacing-sm);
                    overflow-y: auto;
                    max-height: 600px;
                }

                .right-panel::-webkit-scrollbar {
                    width: 3px;
                }
                .right-panel::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                }

                .issues-section {
                    border-radius: var(--radius-lg);
                    background: var(--color-surface);
                    border: var(--glass-border);
                    backdrop-filter: var(--backdrop-blur);
                    overflow: hidden;
                }

                .session-bottom {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: var(--spacing-md) var(--spacing-lg) var(--spacing-lg);
                    background: linear-gradient(transparent, var(--color-bg) 30%);
                    z-index: 20;
                }

                @media (max-width: 768px) {
                    .middle-content {
                        flex-direction: column;
                    }
                    .right-panel {
                        width: 100%;
                        max-height: 300px;
                    }
                }
            </style>

            <button id="back-btn" style="
                position: fixed;
                top: var(--spacing-md);
                left: var(--spacing-md);
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 8px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.7;
                transition: opacity 0.2s;
                z-index: 10;
                color: var(--color-text-main);
            ">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                </svg>
            </button>

            <div class="container" style="max-width: 1000px; justify-content: space-between; min-height: 100vh; position: relative; padding-bottom: 140px;">

                <div class="session-header" style="margin-top: var(--spacing-xl);">
                    <h2>Guardian</h2>
                    <div class="session-mode-pill">
                        <span>Jessica</span>
                        <span style="opacity: 0.3;">|</span>
                        <span style="color: var(--color-accent-primary);">AMS Control Tower</span>
                        <span id="lang-badge" style="opacity: 0.3; display: none;">|</span>
                        <span id="lang-label" style="color: var(--color-accent-secondary, #f0ab00); font-size: 0.75rem; display: none;"></span>
                    </div>
                    <div style="
                        border-radius: var(--radius-lg);
                        padding: var(--spacing-sm) var(--spacing-lg);
                        display: inline-block;
                        margin-top: var(--spacing-sm);
                        max-width: 800px;
                    ">
                        <p style="font-size: 0.95rem; opacity: 0.7; margin: 0;">
                            Share your S-A-P screen and describe the error. Jessica will triage and guide you.
                        </p>
                    </div>
                </div>

                <div class="session-main">
                    <!-- Model Visualizer (AI voice) -->
                    <div class="viz-row">
                        <audio-visualizer id="model-viz"></audio-visualizer>
                    </div>

                    <!-- Screen Share Preview -->
                    <div class="screen-section" id="screen-section">
                        <div class="screen-preview-box" id="screen-preview-box">
                            <div class="screen-placeholder-inner" id="screen-placeholder">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                                <span style="font-size: 0.85rem;">Share your SAP screen</span>
                            </div>
                        </div>
                        <div class="screen-controls" id="screen-controls">
                            <button class="screen-btn-sm" id="screen-share-btn" disabled>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                                Share Screen
                            </button>
                            <button class="screen-btn-sm" id="screenshot-btn" disabled>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                Upload Screenshot
                            </button>
                        </div>
                    </div>

                    <!-- Transcript + Right Panel -->
                    <div class="middle-content">
                        <div class="transcript-section">
                            <live-transcript id="transcript"></live-transcript>
                        </div>
                        <div class="right-panel">
                            <diagnostic-tracker id="diagnostic-tracker"></diagnostic-tracker>
                            <agent-guidance id="agent-guidance"></agent-guidance>
                            <div class="issues-section">
                                <issue-panel id="issue-panel"></issue-panel>
                            </div>
                        </div>
                    </div>

                    <!-- User Visualizer (mic) -->
                    <div class="viz-row">
                        <audio-visualizer id="user-viz"></audio-visualizer>
                    </div>
                </div>

                <!-- CTA Button -->
                <div class="session-bottom">
                    <button id="mic-btn" class="session-cta-btn">
                        <span style="font-size: 1.3rem; font-weight: 800; margin-bottom: 2px; letter-spacing: 0.02em;">Start Session</span>
                        <span style="font-size: 0.85rem; opacity: 0.9; font-style: italic;">Describe your SAP issue</span>
                    </button>

                    <p id="connection-status" style="
                        margin-top: var(--spacing-sm);
                        font-size: 0.9rem;
                        font-weight: 700;
                        height: 1.2em;
                        transition: all 0.3s ease;
                        letter-spacing: 0.05em;
                        text-transform: uppercase;
                    "></p>
                </div>

                <!-- Hidden file input for screenshot upload -->
                <input type="file" id="file-input" accept="image/*" style="display: none;" />
            </div>
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
                micBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
                    <span style="font-weight: 800; font-size: 1.1rem; letter-spacing: 0.05em; text-transform: uppercase;">End Session</span>
                `;
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
            statusEl.textContent = 'Connected and listening';
            statusEl.style.color = '#81c784';

            // Show language badge if non-English
            const lang = this.getAttribute('language') || 'English';
            if (lang !== 'English') {
                const langBadge = this.querySelector('#lang-badge');
                const langLabel = this.querySelector('#lang-label');
                if (langBadge) langBadge.style.display = '';
                if (langLabel) { langLabel.style.display = ''; langLabel.textContent = lang; }
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
            micBtn.innerHTML = `
                <span style="font-size: 1.3rem; font-weight: 800; margin-bottom: 2px; letter-spacing: 0.02em;">Talk to Jessica</span>
                <span style="font-size: 0.85rem; opacity: 0.9; font-style: italic;">What's your error message number?</span>
            `;

            const statusEl = this.querySelector('#connection-status');
            statusEl.textContent = err.status === 429 ? 'Rate limited - try again later' : 'Failed to connect';
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

            default:
                // Handle custom server events (session_state)
                if (response.type === 'session_state' || (response.data && response.data.stage)) {
                    this.handleSessionState(response.data || response);
                } else {
                    console.log('Response:', response.type);
                }
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
                    const issueData = result ? (typeof result === 'string' ? JSON.parse(result) : result) : args;
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
            micBtn.innerHTML = `
                <span style="font-size: 1.3rem; font-weight: 800; margin-bottom: 2px; letter-spacing: 0.02em;">Talk to Jessica</span>
                <span style="font-size: 0.85rem; opacity: 0.9; font-style: italic;">What's your error message number?</span>
            `;
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
