/**
 * Diagnostic Tracker — Horizontal stepper progress rail
 * Mission-control style with glowing nodes and progress lines
 */
class DiagnosticTracker extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._rendered = false;
        this._expandedStage = null;
        this._stages = [
            { key: 'initiation', label: 'Initiation', status: 'pending' },
            { key: 'diagnosis', label: 'Diagnosis', status: 'pending' },
            { key: 'troubleshoot', label: 'Troubleshoot', status: 'pending' },
            { key: 'resolution', label: 'Resolution', status: 'pending' },
        ];
        this._checkpoints = [];
    }

    connectedCallback() {
        if (!this._rendered) {
            this.render();
            this._rendered = true;
        }
    }

    updateFromState(state) {
        if (!state) return;
        const activeStage = state.stage || '';
        this._checkpoints = state.checkpoints || [];
        const stageOrder = ['initiation', 'diagnosis', 'troubleshoot', 'resolution'];
        const activeIdx = stageOrder.indexOf(activeStage.toLowerCase());

        this._stages = this._stages.map((s, i) => {
            let status = 'pending';
            if (i < activeIdx) status = 'complete';
            else if (i === activeIdx) status = 'active';
            return { ...s, status };
        });

        if (activeIdx >= 0) this._expandedStage = stageOrder[activeIdx];

        for (const s of this._stages) {
            const cps = this._checkpoints.filter(c => c.stage?.toLowerCase() === s.key);
            if (cps.length > 0 && cps.every(c => c.status === 'skipped') && s.status === 'complete') {
                s.status = 'skipped';
            }
        }
        this.renderPipeline();
    }

    _handleStageClick(key) {
        this._expandedStage = this._expandedStage === key ? null : key;
        this.renderPipeline();
    }

    renderPipeline() {
        const rail = this.shadowRoot.querySelector('.rail');
        const details = this.shadowRoot.querySelector('.checkpoint-details');
        if (!rail || !details) return;

        // Render rail nodes
        rail.innerHTML = this._stages.map((s, i) => {
            const isLast = i === this._stages.length - 1;
            const nextStatus = !isLast ? this._stages[i + 1].status : 'pending';
            const lineFill = s.status === 'complete' || s.status === 'skipped' ? 'filled' : '';
            const isExpanded = this._expandedStage === s.key;
            const cps = this._checkpoints.filter(c => c.stage?.toLowerCase() === s.key);
            const doneCount = cps.filter(c => c.status === 'complete').length;

            return `
                <div class="step">
                    <button class="node ${s.status} ${isExpanded ? 'selected' : ''}" data-stage="${s.key}" title="${s.label}">
                        ${s.status === 'complete' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
                        : s.status === 'active' ? `<span class="pulse-dot"></span>`
                        : s.status === 'skipped' ? '—'
                        : `<span class="step-num">${i + 1}</span>`}
                    </button>
                    <span class="step-label ${s.status}">${s.label}</span>
                    ${cps.length > 0 ? `<span class="step-count ${s.status}">${doneCount}/${cps.length}</span>` : ''}
                </div>
                ${!isLast ? `<div class="connector ${lineFill}"><div class="connector-fill"></div></div>` : ''}
            `;
        }).join('');

        // Render expanded checkpoints
        const expanded = this._stages.find(s => s.key === this._expandedStage);
        const cps = expanded ? this._checkpoints.filter(c => c.stage?.toLowerCase() === expanded.key) : [];

        if (cps.length > 0) {
            details.innerHTML = `
                <div class="details-header">${expanded.label} Checkpoints</div>
                <div class="details-list">
                    ${cps.map(cp => `
                        <div class="cp-row">
                            <span class="cp-status ${cp.status}">
                                ${cp.status === 'complete' ? '✓' : cp.status === 'active' ? '◉' : cp.status === 'skipped' ? '—' : '○'}
                            </span>
                            <span class="cp-text">${cp.label}</span>
                            ${cp.detail ? `<span class="cp-detail">${cp.detail}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            details.classList.add('visible');
        } else {
            details.innerHTML = '';
            details.classList.remove('visible');
        }

        // Attach click handlers
        rail.querySelectorAll('.node').forEach(btn => {
            btn.addEventListener('click', () => this._handleStageClick(btn.dataset.stage));
        });
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    font-family: 'Nunito', system-ui, sans-serif;
                }

                .tracker {
                    background: var(--color-surface, rgba(255,255,255,0.04));
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 14px;
                    padding: 16px 20px 12px;
                }

                .tracker-label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--color-accent-secondary, #f0ab00);
                    margin-bottom: 14px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .rail {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    position: relative;
                }

                .step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    position: relative;
                    z-index: 2;
                    flex-shrink: 0;
                }

                .node {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: 2px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.04);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    color: rgba(255,255,255,0.5);
                    padding: 0;
                    font-family: inherit;
                    position: relative;
                }

                .node:hover {
                    border-color: var(--color-accent-primary, #4d9ff7);
                    transform: scale(1.1);
                }

                .node.selected {
                    transform: scale(1.15);
                }

                .node.complete {
                    border-color: #81c784;
                    background: rgba(129, 199, 132, 0.15);
                    color: #81c784;
                    box-shadow: 0 0 12px rgba(129, 199, 132, 0.2);
                }

                .node.active {
                    border-color: var(--color-accent-primary, #4d9ff7);
                    background: rgba(77, 159, 247, 0.12);
                    color: var(--color-accent-primary, #4d9ff7);
                    box-shadow: 0 0 16px rgba(77, 159, 247, 0.25);
                    animation: nodePulse 2.5s ease-in-out infinite;
                }

                .node.skipped {
                    border-color: rgba(240, 171, 0, 0.4);
                    background: rgba(240, 171, 0, 0.08);
                    color: #f0ab00;
                }

                @keyframes nodePulse {
                    0%, 100% { box-shadow: 0 0 8px rgba(77, 159, 247, 0.15); }
                    50% { box-shadow: 0 0 20px rgba(77, 159, 247, 0.35); }
                }

                .pulse-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: var(--color-accent-primary, #4d9ff7);
                    animation: dotPulse 1.5s ease-in-out infinite;
                }

                @keyframes dotPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.7); }
                }

                .step-num {
                    font-size: 0.75rem;
                    font-weight: 700;
                    opacity: 0.6;
                }

                .step-label {
                    font-size: 0.68rem;
                    font-weight: 700;
                    color: rgba(255,255,255,0.55);
                    text-align: center;
                    white-space: nowrap;
                    transition: color 0.3s;
                }
                .step-label.complete { color: #81c784; }
                .step-label.active { color: var(--color-accent-primary, #4d9ff7); }
                .step-label.skipped { color: #f0ab00; }

                .step-count {
                    font-size: 0.6rem;
                    font-weight: 700;
                    opacity: 0.4;
                    font-family: 'JetBrains Mono', monospace;
                }
                .step-count.complete { color: #81c784; opacity: 0.7; }
                .step-count.active { color: var(--color-accent-primary, #4d9ff7); opacity: 0.7; }

                .connector {
                    flex: 1;
                    height: 2px;
                    background: rgba(255,255,255,0.08);
                    margin-top: 18px;
                    position: relative;
                    border-radius: 1px;
                    overflow: hidden;
                    min-width: 20px;
                }

                .connector-fill {
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 0;
                    background: linear-gradient(90deg, #81c784, rgba(129,199,132,0.3));
                    border-radius: 1px;
                    transition: width 0.6s ease;
                }

                .connector.filled .connector-fill {
                    width: 100%;
                }

                /* Checkpoint details dropdown */
                .checkpoint-details {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.35s ease, padding 0.35s ease, opacity 0.25s ease;
                    opacity: 0;
                    margin-top: 0;
                }

                .checkpoint-details.visible {
                    max-height: 300px;
                    opacity: 1;
                    margin-top: 12px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(255,255,255,0.06);
                }

                .details-header {
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    color: rgba(255,255,255,0.4);
                    margin-bottom: 8px;
                }

                .details-list {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .cp-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.78rem;
                    transition: background 0.2s;
                }

                .cp-row:hover {
                    background: rgba(255,255,255,0.03);
                }

                .cp-status {
                    font-size: 0.7rem;
                    width: 16px;
                    text-align: center;
                    flex-shrink: 0;
                }
                .cp-status.complete { color: #81c784; }
                .cp-status.active { color: var(--color-accent-primary, #4d9ff7); }
                .cp-status.skipped { color: #f0ab00; }
                .cp-status.pending { color: rgba(255,255,255,0.2); }

                .cp-text {
                    color: var(--color-text-main, #eaddcf);
                    opacity: 0.8;
                    flex: 1;
                }

                .cp-detail {
                    font-size: 0.68rem;
                    color: var(--color-accent-primary, #4d9ff7);
                    opacity: 0.6;
                    font-family: 'JetBrains Mono', monospace;
                    flex-shrink: 0;
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                @media (max-width: 600px) {
                    .step-label { font-size: 0.6rem; }
                    .node { width: 30px; height: 30px; }
                    .connector { margin-top: 15px; }
                    .tracker { padding: 12px 14px 10px; }
                }
            </style>
            <div class="tracker">
                <div class="tracker-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    Diagnostic Progress
                </div>
                <div class="rail"></div>
                <div class="checkpoint-details"></div>
            </div>
        `;
        this.renderPipeline();
    }
}

customElements.define('diagnostic-tracker', DiagnosticTracker);
