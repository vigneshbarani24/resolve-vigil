import './diagnostic-tracker.js';

class ViewSummary extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.sessionData = null;
        this.token = null;
    }

    connectedCallback() {
        this.token = this.getAttribute('token');
        this.renderLoading();
        if (this.token) {
            this.fetchSummary();
        } else {
            this.renderError('No session token provided');
        }
    }

    async fetchSummary() {
        try {
            const res = await fetch(`/api/session/${this.token}/summary`);
            if (!res.ok) throw new Error(`Session not found (${res.status})`);
            this.sessionData = await res.json();
            this.renderSummary();
        } catch (err) {
            this.renderError(err.message);
        }
    }

    renderLoading() {
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="summary-container">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading session summary...</p>
                </div>
            </div>
        `;
    }

    renderError(message) {
        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="summary-container">
                <div class="error-state">
                    <h2>Session Summary Unavailable</h2>
                    <p>${message}</p>
                    <button class="action-btn primary" id="home-btn">New Session</button>
                </div>
            </div>
        `;
        this.shadowRoot.querySelector('#home-btn')?.addEventListener('click', () => this.goHome());
    }

    renderSummary() {
        const d = this.sessionData;
        const duration = d.duration_seconds ? `${Math.floor(d.duration_seconds / 60)}m ${d.duration_seconds % 60}s` : 'N/A';
        const startTime = d.start_time ? new Date(d.start_time).toLocaleTimeString() : 'N/A';
        const endTime = d.end_time ? new Date(d.end_time).toLocaleTimeString() : 'In progress';

        this.shadowRoot.innerHTML = `
            ${this.getStyles()}
            <div class="summary-container">
                <div class="summary-header">
                    <h1>Session Summary</h1>
                    <p class="subtitle">Resolve — AMS Control Tower Report</p>
                </div>

                <!-- Metadata -->
                <div class="meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">Duration</span>
                        <span class="meta-value">${duration}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Module</span>
                        <span class="meta-value">${d.module || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Priority</span>
                        <span class="meta-value priority-${(d.priority || 'medium').toLowerCase()}">${d.priority || 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Language</span>
                        <span class="meta-value">${d.language || 'English'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Started</span>
                        <span class="meta-value">${startTime}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Ended</span>
                        <span class="meta-value">${endTime}</span>
                    </div>
                </div>

                <!-- Diagnostic Pipeline -->
                <div class="section">
                    <h2 class="section-title">Diagnostic Pipeline</h2>
                    <diagnostic-tracker id="summary-tracker"></diagnostic-tracker>
                </div>

                <!-- Issues -->
                ${d.issues && d.issues.length > 0 ? `
                <div class="section">
                    <h2 class="section-title">Issues Detected (${d.issues.length})</h2>
                    <div class="issues-list">
                        ${d.issues.map(issue => `
                            <div class="issue-card">
                                <span class="severity-badge ${(issue.severity || 'medium').toLowerCase()}">${issue.severity || 'medium'}</span>
                                <span class="issue-title">${issue.title || 'Untitled'}</span>
                                ${issue.transaction_code ? `<span class="tcode">T-Code: ${issue.transaction_code}</span>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

                <!-- ITSM Tickets -->
                ${d.tickets && d.tickets.length > 0 ? `
                <div class="section">
                    <h2 class="section-title">ITSM Tickets</h2>
                    ${d.tickets.map(t => `
                        <div class="ticket-card">
                            <div class="ticket-id">${t.ticket_id}</div>
                            <div class="ticket-title">${t.title}</div>
                            <div class="ticket-meta">
                                <span class="severity-badge ${(t.severity || 'medium').toLowerCase()}">${t.severity || 'medium'}</span>
                                <span class="ticket-status">${t.status || 'New'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>` : ''}

                <!-- Agent Guidance -->
                ${d.agent_guidance && d.agent_guidance.length > 0 ? `
                <div class="section">
                    <h2 class="section-title">L2 Guidance</h2>
                    <div class="guidance-list">
                        ${d.agent_guidance.map(g => `
                            <div class="guidance-item">
                                <strong>${g.title || ''}</strong>
                                <p>${g.detail || g}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

                <!-- Actions -->
                <div class="actions">
                    <button class="action-btn primary" id="download-rca">Download RCA Report</button>
                    <button class="action-btn secondary" id="download-transcript">Download Transcript</button>
                    <button class="action-btn outline" id="new-session">New Session</button>
                </div>
            </div>
        `;

        // Set up tracker
        const tracker = this.shadowRoot.querySelector('#summary-tracker');
        if (tracker && d.checkpoints) {
            // Small delay to ensure component is rendered
            setTimeout(() => {
                tracker.updateFromState({ stage: d.stage, checkpoints: d.checkpoints });
            }, 100);
        }

        // Bind actions
        this.shadowRoot.querySelector('#download-rca').addEventListener('click', () => this.downloadFile('rca'));
        this.shadowRoot.querySelector('#download-transcript').addEventListener('click', () => this.downloadFile('transcript'));
        this.shadowRoot.querySelector('#new-session').addEventListener('click', () => this.goHome());
    }

    async downloadFile(type) {
        const btn = this.shadowRoot.querySelector(`#download-${type}`);
        const originalText = btn.textContent;
        btn.textContent = 'Downloading...';
        btn.disabled = true;

        try {
            const res = await fetch(`/api/session/${this.token}/${type}`);
            if (!res.ok) throw new Error('Download failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `guardian-${type}-${this.token.slice(0, 8)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            btn.textContent = 'Downloaded!';
            setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2000);
        } catch (err) {
            btn.textContent = 'Failed - Retry';
            btn.disabled = false;
        }
    }

    goHome() {
        this.dispatchEvent(new CustomEvent('navigate', {
            bubbles: true,
            composed: true,
            detail: { view: 'home' }
        }));
    }

    getStyles() {
        return `<style>
            :host {
                display: block;
                font-family: 'Nunito', system-ui, sans-serif;
                color: var(--color-text-main, #eaddcf);
                min-height: 100vh;
                padding: 40px 20px 80px;
            }

            .summary-container {
                max-width: 800px;
                margin: 0 auto;
            }

            .summary-header {
                text-align: center;
                margin-bottom: 32px;
                padding-top: 20px;
            }

            .summary-header h1 {
                font-size: 2rem;
                font-weight: 800;
                margin: 0 0 8px;
                background: linear-gradient(135deg, var(--color-text-main, #eaddcf) 30%, var(--color-accent-primary, #4d9ff7));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .subtitle {
                font-size: 0.9rem;
                opacity: 0.6;
                margin: 0;
            }

            .meta-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin-bottom: 32px;
            }

            .meta-item {
                background: var(--color-surface, rgba(255,255,255,0.05));
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 12px;
                padding: 12px 16px;
                text-align: center;
            }

            .meta-label {
                display: block;
                font-size: 0.7rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                opacity: 0.5;
                margin-bottom: 4px;
            }

            .meta-value {
                display: block;
                font-size: 1rem;
                font-weight: 700;
            }

            .priority-critical { color: #e57373; }
            .priority-high { color: #f0ab00; }
            .priority-medium { color: #4d9ff7; }
            .priority-low { color: #81c784; }

            .section {
                margin-bottom: 24px;
            }

            .section-title {
                font-size: 0.85rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--color-accent-secondary, #f0ab00);
                margin: 0 0 12px;
            }

            .issues-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .issue-card {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 10px;
            }

            .severity-badge {
                font-size: 0.6rem;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: 2px 6px;
                border-radius: 4px;
                flex-shrink: 0;
            }

            .severity-badge.critical { background: rgba(229,115,115,0.2); color: #e57373; }
            .severity-badge.high { background: rgba(240,171,0,0.2); color: #f0ab00; }
            .severity-badge.medium { background: rgba(77,159,247,0.2); color: #4d9ff7; }
            .severity-badge.low { background: rgba(129,199,132,0.2); color: #81c784; }

            .issue-title {
                font-weight: 700;
                font-size: 0.9rem;
                flex: 1;
            }

            .tcode {
                font-family: monospace;
                font-size: 0.75rem;
                color: var(--color-accent-primary, #4d9ff7);
                flex-shrink: 0;
            }

            .ticket-card {
                padding: 16px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 12px;
                margin-bottom: 8px;
            }

            .ticket-id {
                font-family: monospace;
                font-size: 0.8rem;
                color: var(--color-accent-primary, #4d9ff7);
                margin-bottom: 4px;
            }

            .ticket-title {
                font-weight: 700;
                font-size: 1rem;
                margin-bottom: 8px;
            }

            .ticket-meta {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .ticket-status {
                font-size: 0.8rem;
                opacity: 0.7;
            }

            .guidance-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .guidance-item {
                padding: 12px 16px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 10px;
                font-size: 0.85rem;
                line-height: 1.5;
            }

            .guidance-item strong {
                display: block;
                margin-bottom: 4px;
                color: var(--color-accent-primary, #4d9ff7);
            }

            .guidance-item p {
                margin: 0;
                opacity: 0.8;
            }

            .actions {
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-top: 40px;
                flex-wrap: wrap;
            }

            .action-btn {
                padding: 12px 24px;
                border-radius: 999px;
                font-weight: 700;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid transparent;
                font-family: inherit;
            }

            .action-btn.primary {
                background: var(--color-accent-primary, #4d9ff7);
                color: #000;
                border-color: var(--color-accent-primary, #4d9ff7);
            }

            .action-btn.primary:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }

            .action-btn.secondary {
                background: rgba(77,159,247,0.15);
                color: var(--color-accent-primary, #4d9ff7);
                border-color: var(--color-accent-primary, #4d9ff7);
            }

            .action-btn.outline {
                background: transparent;
                color: var(--color-text-main, #eaddcf);
                border-color: rgba(255,255,255,0.2);
            }

            .action-btn.outline:hover {
                border-color: rgba(255,255,255,0.4);
            }

            .action-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .loading, .error-state {
                text-align: center;
                padding: 80px 20px;
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.1);
                border-top-color: var(--color-accent-primary, #4d9ff7);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 16px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .error-state h2 {
                margin-bottom: 8px;
            }

            .error-state p {
                opacity: 0.6;
                margin-bottom: 24px;
            }

            @media (max-width: 600px) {
                .meta-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                .actions {
                    flex-direction: column;
                    align-items: stretch;
                }
            }
        </style>`;
    }
}

customElements.define('view-summary', ViewSummary);
