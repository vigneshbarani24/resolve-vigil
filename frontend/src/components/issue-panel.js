/**
 * Issue Panel - Auto-detected issues from conversation
 * The AI can call create_issue tool to populate this
 */
class IssuePanel extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.issues = [];
        this._rendered = false;
    }

    connectedCallback() {
        if (!this._rendered) {
            this.render();
            this._rendered = true;
        }
    }

    addIssue(issue) {
        this.issues.push({
            id: this.issues.length + 1,
            title: issue.title || 'Untitled Issue',
            description: issue.description || '',
            severity: issue.severity || 'medium',
            transaction: issue.transaction_code || '',
            steps: issue.steps_to_reproduce || '',
            timestamp: new Date().toLocaleTimeString(),
        });
        this.renderIssues();
    }

    getIssues() {
        return this.issues;
    }

    clearIssues() {
        this.issues = [];
        this.renderIssues();
    }

    renderIssues() {
        const container = this.shadowRoot.querySelector('.issues-list');
        if (!container) return;

        const countEl = this.shadowRoot.querySelector('.issue-count');
        if (countEl) countEl.textContent = this.issues.length;

        if (this.issues.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 24px; opacity: 0.5; font-size: 0.85rem;">
                    No issues detected yet. The AI will auto-detect and log issues from your conversation.
                </div>
            `;
            return;
        }

        container.innerHTML = this.issues.map(issue => `
            <div class="issue-item" style="animation: slideIn 0.3s ease forwards;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                    <span class="issue-badge ${issue.severity}">${issue.severity}</span>
                    <span style="font-size: 0.7rem; opacity: 0.4;">${issue.timestamp}</span>
                </div>
                <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px; color: var(--color-text-main, #eaddcf);">
                    ${issue.title}
                </div>
                ${issue.transaction ? `<div style="font-size: 0.75rem; font-family: monospace; color: var(--color-accent-primary, #4d9ff7); margin-bottom: 4px;">T-Code: ${issue.transaction}</div>` : ''}
                <div style="font-size: 0.8rem; opacity: 0.7; line-height: 1.4;">
                    ${issue.description}
                </div>
                ${issue.steps ? `<div style="font-size: 0.75rem; opacity: 0.5; margin-top: 4px; font-style: italic;">Steps: ${issue.steps}</div>` : ''}
            </div>
        `).join('');
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    font-family: 'Nunito', system-ui, sans-serif;
                }

                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }

                .panel-title {
                    font-size: 0.8rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--color-accent-secondary, #f0ab00);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .issue-count-badge {
                    background: var(--color-accent-secondary, #f0ab00);
                    color: #000;
                    font-size: 0.65rem;
                    font-weight: 800;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .issues-list {
                    padding: 8px;
                    overflow-y: auto;
                    max-height: calc(100% - 40px);
                }

                .issue-item {
                    padding: 10px 12px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.06);
                    margin-bottom: 6px;
                    transition: all 0.2s ease;
                }

                .issue-item:hover {
                    border-color: var(--color-accent-primary, #4d9ff7);
                    background: rgba(77, 159, 247, 0.05);
                }

                .issue-badge {
                    font-size: 0.6rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 2px 6px;
                    border-radius: 4px;
                }

                .issue-badge.critical {
                    background: rgba(229, 115, 115, 0.2);
                    color: #e57373;
                }
                .issue-badge.high {
                    background: rgba(240, 171, 0, 0.2);
                    color: #f0ab00;
                }
                .issue-badge.medium {
                    background: rgba(77, 159, 247, 0.2);
                    color: #4d9ff7;
                }
                .issue-badge.low {
                    background: rgba(129, 199, 132, 0.2);
                    color: #81c784;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .issues-list::-webkit-scrollbar {
                    width: 3px;
                }
                .issues-list::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                }
            </style>
            <div class="panel-header">
                <span class="panel-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Issues
                </span>
                <span class="issue-count-badge"><span class="issue-count">0</span></span>
            </div>
            <div class="issues-list">
                <div style="text-align: center; padding: 24px; opacity: 0.5; font-size: 0.85rem;">
                    No issues detected yet. The AI will auto-detect and log issues from your conversation.
                </div>
            </div>
        `;
    }
}

customElements.define('issue-panel', IssuePanel);
