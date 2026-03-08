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
After the greeting, proceed to triage. Immediately ask for their name, the error message, and the T-code.`;

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
                /* ─── Centered breathing layout ─── */
                .session-wrap {
                    display: flex;
                    flex-direction: column;
                    min-height: 100vh;
                    padding: var(--spacing-lg);
                    padding-bottom: 160px;
                    max-width: 860px;
                    margin: 0 auto;
                    width: 100%;
                }

                /* ─── Header ─── */
                .s-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--spacing-md);
                    padding-top: var(--spacing-sm);
                }

                .s-header-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .s-back {
                    background: none; border: none; cursor: pointer;
                    color: var(--color-text-main); opacity: 0.5;
                    padding: 6px; border-radius: 50%; display: flex;
                    transition: opacity 0.2s;
                }
                .s-back:hover { opacity: 1; }

                .s-title-group {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                }

                .s-title {
                    font-size: 1.1rem;
                    font-weight: 800;
                    letter-spacing: 0.02em;
                }

                .s-subtitle {
                    font-size: 0.78rem;
                    font-weight: 600;
                    color: var(--color-accent-primary, #4d9ff7);
                }

                .s-lang {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: var(--color-accent-secondary, #f0ab00);
                    background: rgba(240,171,0,0.08);
                    border: 1px solid rgba(240,171,0,0.15);
                    padding: 2px 10px;
                    border-radius: var(--radius-full);
                    display: none;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                }

                /* ─── Diagnostic tracker ─── */
                .s-tracker {
                    margin-bottom: var(--spacing-md);
                }

                /* ─── Screen share — hidden until active ─── */
                .s-screen {
                    display: none;
                    margin-bottom: var(--spacing-md);
                    animation: fadeSlideIn 0.3s ease;
                }
                .s-screen.visible { display: block; }

                .s-screen-box {
                    width: 100%;
                    aspect-ratio: 16/9;
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    background: rgba(0,0,0,0.25);
                    border: 1px solid rgba(255,255,255,0.06);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                .s-screen-box video, .s-screen-box img {
                    width: 100%; height: 100%; object-fit: contain;
                }

                /* ─── Transcript — main focus ─── */
                .s-transcript {
                    flex: 1;
                    min-height: 200px;
                    margin-bottom: var(--spacing-md);
                }

                /* ─── Floating panels — appear on demand ─── */
                .s-panels {
                    display: flex;
                    gap: var(--spacing-sm);
                    margin-bottom: var(--spacing-md);
                }

                .s-panel-slot {
                    flex: 1;
                    min-width: 0;
                    display: none;
                    animation: fadeSlideIn 0.35s ease;
                }
                .s-panel-slot.visible { display: block; }

                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* ─── Bottom bar — fixed ─── */
                .s-bottom {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 20;
                    background: linear-gradient(transparent, var(--color-bg) 25%);
                    padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-lg);
                }

                .s-bottom-inner {
                    max-width: 860px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }

                /* Visualizer row */
                .s-viz-row {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    width: 100%;
                    max-width: 600px;
                }

                .s-viz-side {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 3px;
                    min-width: 0;
                }

                .s-viz-side audio-visualizer {
                    width: 100%;
                    height: 44px;
                }

                .s-viz-label {
                    font-size: 0.58rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.14em;
                    opacity: 0.7;
                }
                .s-viz-label.you { color: #81c784; }
                .s-viz-label.jessica { color: var(--color-accent-primary, #4d9ff7); }

                /* CTA */
                .s-cta {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }

                .s-cta-btn {
                    padding: 14px 36px;
                    border-radius: var(--radius-full, 9999px);
                    border: none;
                    background: var(--color-accent-primary, #4d9ff7);
                    color: #fff;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.95rem;
                    font-weight: 800;
                    letter-spacing: 0.04em;
                    transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);
                    white-space: nowrap;
                    box-shadow: 0 4px 16px rgba(77,159,247,0.25);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .s-cta-btn:hover {
                    transform: translateY(-2px) scale(1.03);
                    box-shadow: 0 8px 24px rgba(77,159,247,0.35);
                    filter: brightness(1.1);
                }
                .s-cta-btn.active {
                    background: var(--color-danger, #e57373);
                    box-shadow: 0 4px 16px rgba(229,115,115,0.3);
                }
                .s-cta-btn.active:hover {
                    box-shadow: 0 8px 24px rgba(229,115,115,0.4);
                }

                .s-status {
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    height: 1em;
                    transition: all 0.3s;
                }

                /* ─── Action chips — screen share / screenshot ─── */
                .s-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: center;
                    margin-bottom: var(--spacing-sm);
                    flex-wrap: wrap;
                }

                .s-chip {
                    padding: 6px 14px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    border-radius: var(--radius-full);
                    background: rgba(255,255,255,0.04);
                    color: var(--color-text-main);
                    border: 1px solid rgba(255,255,255,0.1);
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .s-chip:hover {
                    opacity: 1;
                    background: rgba(77,159,247,0.08);
                    border-color: rgba(77,159,247,0.2);
                    color: var(--color-accent-primary);
                }
                .s-chip:disabled { opacity: 0.3; cursor: default; }
                .s-chip:disabled:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: var(--color-text-main); }
                .s-chip.active-share {
                    background: rgba(229,115,115,0.1);
                    border-color: rgba(229,115,115,0.3);
                    color: var(--color-danger);
                    opacity: 1;
                }

                @media (max-width: 600px) {
                    .session-wrap { padding: var(--spacing-sm); }
                    .s-viz-row { max-width: 100%; gap: 10px; }
                    .s-cta-btn { width: 48px; height: 48px; }
                    .s-panels { flex-direction: column; }
                }
            </style>

            <div class="session-wrap">
                <!-- Header -->
                <div class="s-header">
                    <div class="s-header-left">
                        <button class="s-back" id="back-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                            </svg>
                        </button>
                        <div class="s-title-group">
                            <span class="s-title">Guardian</span>
                            <span class="s-subtitle">Jessica</span>
                        </div>
                    </div>
                    <span class="s-lang" id="lang-pill"></span>
                </div>

                <!-- Diagnostic tracker -->
                <div class="s-tracker">
                    <diagnostic-tracker id="diagnostic-tracker"></diagnostic-tracker>
                </div>

                <!-- Action chips -->
                <div class="s-actions">
                    <button class="s-chip" id="screen-share-btn" disabled>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        Share Screen
                    </button>
                    <button class="s-chip" id="screenshot-btn" disabled title="Upload image or paste from clipboard (Ctrl+V)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        Screenshot / Paste
                    </button>
                </div>

                <!-- Screen share — only visible when sharing -->
                <div class="s-screen" id="screen-section">
                    <div class="s-screen-box" id="screen-preview-box">
                    </div>
                </div>

                <!-- Transcript -->
                <div class="s-transcript">
                    <live-transcript id="transcript"></live-transcript>
                </div>

                <!-- Floating panels — appear when data arrives -->
                <div class="s-panels">
                    <div class="s-panel-slot" id="guidance-slot">
                        <agent-guidance id="agent-guidance"></agent-guidance>
                    </div>
                    <div class="s-panel-slot" id="issues-slot">
                        <issue-panel id="issue-panel"></issue-panel>
                    </div>
                </div>
            </div>

            <!-- Fixed bottom bar -->
            <div class="s-bottom">
                <div class="s-bottom-inner">
                    <div class="s-viz-row">
                        <div class="s-viz-side">
                            <span class="s-viz-label you">You</span>
                            <audio-visualizer id="user-viz" color="#81c784"></audio-visualizer>
                        </div>

                        <div class="s-cta">
                            <button class="s-cta-btn" id="mic-btn">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                                Start Session
                            </button>
                            <span class="s-status" id="connection-status"></span>
                        </div>

                        <div class="s-viz-side">
                            <span class="s-viz-label jessica">Jessica</span>
                            <audio-visualizer id="model-viz" color="#4d9ff7"></audio-visualizer>
                        </div>
                    </div>
                </div>
            </div>

            <input type="file" id="file-input" accept="image/*" style="display: none;" />
        `;

        this.bindEvents();
    }

    disconnectedCallback() {
        this.cleanup();
        if (this._pasteHandler) {
            document.removeEventListener('paste', this._pasteHandler);
        }
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="6" y="6" width="12" height="12" rx="1"/>
                    </svg>
                    End Session`;
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

        // Clipboard paste (Ctrl+V / Cmd+V anywhere on page)
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

    async startSession(statusEl) {
        try {
            statusEl.textContent = 'Connecting...';
            statusEl.style.color = 'var(--color-text-sub)';

            // Initialize client
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
            this.sessionToken = this.geminiClient.sessionToken;
            statusEl.textContent = 'Live';
            statusEl.style.color = '#81c784';

            // Show language badge if non-English
            const lang = this.getAttribute('language') || 'English';
            if (lang !== 'English') {
                const langPill = this.querySelector('#lang-pill');
                if (langPill) { langPill.style.display = ''; langPill.textContent = lang; }
            }

            // Enable action chips
            this.querySelector('#screen-share-btn').disabled = false;
            this.querySelector('#screenshot-btn').disabled = false;

            // Clear transcript
            this.querySelector('#transcript').clear();

        } catch (err) {
            console.error('Failed to start:', err);
            this.isSpeaking = false;

            const micBtn = this.querySelector('#mic-btn');
            micBtn.classList.remove('active');
            this._resetMicBtn(micBtn);

            statusEl.textContent = err.status === 429 ? 'Rate limited' : 'Failed';
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
                if (response.data && response.data.functionCalls) {
                    for (const fc of response.data.functionCalls) {
                        this.geminiClient.callFunction(fc.name, fc.args);
                        this.geminiClient.sendToolResponse(fc.id, { result: 'success' });
                    }
                }
                break;

            case MultimodalLiveResponseType.SERVER_TOOL_CALL:
                this.handleServerToolEvent(response.data);
                break;

            case 'SESSION_STATE':
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

        // Update agent guidance — show panel on demand
        const guidance = this.querySelector('#agent-guidance');
        const guidanceSlot = this.querySelector('#guidance-slot');
        if (guidance && state.agent_guidance && state.agent_guidance.length > 0 && guidance.setGuidance) {
            guidance.setGuidance(state.agent_guidance);
            if (guidanceSlot) guidanceSlot.classList.add('visible');
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
                const issuePanel = this.querySelector('#issue-panel');
                const issuesSlot = this.querySelector('#issues-slot');
                if (issuePanel) {
                    let issueData = result ? (typeof result === 'string' ? JSON.parse(result) : result) : args;
                    if (issueData.issue) issueData = issueData.issue;
                    if (!issueData.title && args.title) issueData = args;
                    issuePanel.addIssue(issueData);
                    // Show issues panel on demand
                    if (issuesSlot) issuesSlot.classList.add('visible');
                }
                break;
            }
            case 'create_itsm_ticket': {
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
                break;
            default:
                console.log('Unhandled server tool:', name);
        }
    }

    async toggleScreenShare() {
        const btn = this.querySelector('#screen-share-btn');
        const screenSection = this.querySelector('#screen-section');
        const previewBox = this.querySelector('#screen-preview-box');

        if (this.isScreenSharing) {
            if (this.screenCapture) {
                this.screenCapture.stop();
                this.screenCapture = null;
            }
            this.isScreenSharing = false;
            previewBox.innerHTML = '';
            screenSection.classList.remove('visible');
            btn.textContent = 'Share Screen';
            btn.classList.remove('active-share');
        } else {
            try {
                this.screenCapture = new ScreenCapture(this.geminiClient);
                this.screenCapture.onStop = () => {
                    this.isScreenSharing = false;
                    previewBox.innerHTML = '';
                    screenSection.classList.remove('visible');
                    btn.textContent = 'Share Screen';
                    btn.classList.remove('active-share');
                };

                const videoElement = await this.screenCapture.start({
                    fps: 1, width: 1280, height: 720, quality: 0.7,
                });

                this.isScreenSharing = true;
                videoElement.style.width = '100%';
                videoElement.style.height = '100%';
                videoElement.style.objectFit = 'contain';
                previewBox.appendChild(videoElement);
                screenSection.classList.add('visible');

                btn.textContent = 'Stop Sharing';
                btn.classList.add('active-share');
            } catch (error) {
                console.error('Screen share failed:', error);
            }
        }
    }

    _sendImageToServer(base64Data) {
        // Send image in the format the server expects: {"type": "image", "data": "<base64>"}
        if (this.geminiClient && this.geminiClient.connected) {
            this.geminiClient.sendMessage({ type: 'image', data: base64Data });
        }
    }

    _showImagePreview(dataUrl) {
        const previewBox = this.querySelector('#screen-preview-box');
        const screenSection = this.querySelector('#screen-section');

        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';

        const existing = previewBox.querySelector('img, video');
        if (existing) existing.remove();
        previewBox.appendChild(img);
        screenSection.classList.add('visible');
    }

    handleScreenshotUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1];
            this._sendImageToServer(base64);
            this._showImagePreview(e.target.result);
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
            this._resetMicBtn(micBtn);
        }

        const statusEl = this.querySelector('#connection-status');
        if (statusEl) statusEl.textContent = '';

        const userViz = this.querySelector('#user-viz');
        const modelViz = this.querySelector('#model-viz');
        if (userViz) userViz.disconnect();
        if (modelViz) modelViz.disconnect();

        // Disable action chips
        const screenBtn = this.querySelector('#screen-share-btn');
        const ssBtn = this.querySelector('#screenshot-btn');
        if (screenBtn) screenBtn.disabled = true;
        if (ssBtn) ssBtn.disabled = true;

        // Finalize transcript
        const transcript = this.querySelector('#transcript');
        if (transcript) transcript.finalizeAll();

        // Navigate to summary view
        if (this.sessionToken) {
            const token = this.sessionToken;
            setTimeout(() => {
                this.dispatchEvent(new CustomEvent('navigate', {
                    bubbles: true,
                    detail: { view: 'summary', token }
                }));
            }, 1500);
        }
    }

    _resetMicBtn(btn) {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            Start Session`;
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
