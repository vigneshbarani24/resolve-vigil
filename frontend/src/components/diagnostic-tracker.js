/**
 * Diagnostic Tracker - 4-stage diagnostic pipeline with expandable checkpoints
 * Stages: Initiation, Diagnosis, Troubleshoot, Resolution
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

    /**
     * Update from diagnostic state.
     * @param {{ stage: string, checkpoints: Array<{stage: string, label: string, status: string, timestamp?: string, detail?: string}> }} state
     */
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

        // Auto-expand the active stage
        if (activeIdx >= 0) {
            this._expandedStage = stageOrder[activeIdx];
        }

        // Mark stages as skipped if any checkpoint in that stage is skipped and stage is complete
        for (const s of this._stages) {
            const stageCheckpoints = this._checkpoints.filter(
                c => c.stage && c.stage.toLowerCase() === s.key
            );
            const allSkipped = stageCheckpoints.length > 0 && stageCheckpoints.every(c => c.status === 'skipped');
            if (allSkipped && s.status === 'complete') {
                s.status = 'skipped';
            }
        }

        this.renderPipeline();
    }

    _getStageIcon(status) {
        switch (status) {
            case 'complete': return '<span class="stage-icon complete">&#10003;</span>';
            case 'active': return '<span class="stage-icon active">&#9673;</span>';
            case 'skipped': return '<span class="stage-icon skipped">&#8211;</span>';
            default: return '<span class="stage-icon pending">&#9675;</span>';
        }
    }

    _getCheckpointIcon(status) {
        switch (status) {
            case 'complete': return '<span class="cp-icon complete">&#10003;</span>';
            case 'active': return '<span class="cp-icon active">&#9679;</span>';
            case 'skipped': return '<span class="cp-icon skipped">&#8211;</span>';
            default: return '<span class="cp-icon pending">&#9675;</span>';
        }
    }

    _handleStageClick(key) {
        this._expandedStage = this._expandedStage === key ? null : key;
        this.renderPipeline();
    }

    renderPipeline() {
        const container = this.shadowRoot.querySelector('.pipeline-body');
        if (!container) return;

        // Render stage indicators
        const stagesHtml = this._stages.map((s, i) => {
            const isExpanded = this._expandedStage === s.key;
            const stageCheckpoints = this._checkpoints.filter(
                c => c.stage && c.stage.toLowerCase() === s.key
            );

            const connector = i < this._stages.length - 1
                ? `<span class="connector ${this._stages[i + 1].status === 'pending' ? '' : 'filled'}"></span>`
                : '';

            const checkpointsHtml = stageCheckpoints.length > 0 ? `
                <div class="checkpoints ${isExpanded ? 'expanded' : ''}">
                    ${stageCheckpoints.map(cp => `
                        <div class="checkpoint-item">
                            ${this._getCheckpointIcon(cp.status)}
                            <div class="cp-content">
                                <span class="cp-label">${cp.label}</span>
                                ${cp.detail ? `<span class="cp-detail">${cp.detail}</span>` : ''}
                            </div>
                            ${cp.timestamp ? `<span class="cp-time">${cp.timestamp}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '';

            return `
                <div class="stage-group">
                    <div class="stage-row">
                        <button class="stage-btn ${s.status}" data-stage="${s.key}" aria-expanded="${isExpanded}">
                            ${this._getStageIcon(s.status)}
                            <span class="stage-label">${s.label}</span>
                            ${stageCheckpoints.length > 0 ? `<span class="expand-arrow ${isExpanded ? 'open' : ''}">&blacktriangledown;</span>` : ''}
                        </button>
                        ${connector}
                    </div>
                    ${checkpointsHtml}
                </div>
            `;
        }).join('');

        container.innerHTML = stagesHtml;

        // Attach click handlers
        container.querySelectorAll('.stage-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._handleStageClick(btn.dataset.stage);
            });
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

                .pipeline-body {
                    padding: 12px;
                    display: flex;
                    align-items: flex-start;
                    gap: 0;
                    overflow-x: auto;
                }

                .stage-group {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    flex-shrink: 0;
                }

                .stage-row {
                    display: flex;
                    align-items: center;
                }

                .stage-btn {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 10px;
                    padding: 6px 10px;
                    color: var(--color-text-main, #eaddcf);
                    font-family: inherit;
                    font-size: 0.78rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .stage-btn:hover {
                    border-color: var(--color-accent-primary, #4d9ff7);
                    background: rgba(77, 159, 247, 0.05);
                }

                .stage-btn.active {
                    border-color: var(--color-accent-primary, #4d9ff7);
                    background: rgba(77, 159, 247, 0.08);
                    animation: pulse 2s ease-in-out infinite;
                }

                .stage-btn.complete {
                    border-color: rgba(129, 199, 132, 0.3);
                    background: rgba(129, 199, 132, 0.05);
                }

                .stage-btn.skipped {
                    border-color: rgba(240, 171, 0, 0.3);
                    background: rgba(240, 171, 0, 0.05);
                }

                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(77, 159, 247, 0); }
                    50% { box-shadow: 0 0 8px 2px rgba(77, 159, 247, 0.15); }
                }

                .stage-icon {
                    font-size: 0.9rem;
                    line-height: 1;
                }
                .stage-icon.complete { color: #81c784; }
                .stage-icon.active { color: var(--color-accent-primary, #4d9ff7); }
                .stage-icon.skipped { color: #f0ab00; }
                .stage-icon.pending { color: rgba(255,255,255,0.3); }

                .stage-label {
                    color: var(--color-text-main, #eaddcf);
                }

                .expand-arrow {
                    font-size: 0.55rem;
                    opacity: 0.4;
                    transition: transform 0.2s ease;
                }
                .expand-arrow.open {
                    transform: rotate(0deg);
                    opacity: 0.7;
                }
                .expand-arrow:not(.open) {
                    transform: rotate(-90deg);
                }

                .connector {
                    display: inline-block;
                    width: 20px;
                    height: 2px;
                    background: rgba(255,255,255,0.1);
                    margin: 0 2px;
                    flex-shrink: 0;
                }
                .connector.filled {
                    background: rgba(129, 199, 132, 0.4);
                }

                .checkpoints {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease, opacity 0.3s ease;
                    opacity: 0;
                    margin-top: 0;
                    padding-left: 14px;
                }
                .checkpoints.expanded {
                    max-height: 500px;
                    opacity: 1;
                    margin-top: 6px;
                }

                .checkpoint-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 6px;
                    padding: 4px 8px;
                    border-radius: 6px;
                    margin-bottom: 2px;
                    font-size: 0.78rem;
                    animation: slideIn 0.2s ease forwards;
                }

                .cp-icon {
                    font-size: 0.7rem;
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .cp-icon.complete { color: #81c784; }
                .cp-icon.active { color: var(--color-accent-primary, #4d9ff7); }
                .cp-icon.skipped { color: #f0ab00; }
                .cp-icon.pending { color: rgba(255,255,255,0.3); }

                .cp-content {
                    display: flex;
                    flex-direction: column;
                    gap: 1px;
                    min-width: 0;
                }

                .cp-label {
                    color: var(--color-text-main, #eaddcf);
                    opacity: 0.85;
                }

                .cp-detail {
                    font-size: 0.7rem;
                    color: var(--color-text-main, #eaddcf);
                    opacity: 0.5;
                    line-height: 1.3;
                }

                .cp-time {
                    font-size: 0.65rem;
                    opacity: 0.35;
                    margin-left: auto;
                    flex-shrink: 0;
                    white-space: nowrap;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Scrollbar */
                .pipeline-body::-webkit-scrollbar {
                    height: 3px;
                }
                .pipeline-body::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                }

                /* Responsive: vertical on mobile */
                @media (max-width: 767px) {
                    .pipeline-body {
                        flex-direction: column;
                        gap: 0;
                        overflow-x: visible;
                    }

                    .stage-row {
                        flex-direction: column;
                        align-items: flex-start;
                    }

                    .connector {
                        width: 2px;
                        height: 16px;
                        margin: 2px 0 2px 16px;
                    }

                    .stage-btn {
                        width: 100%;
                    }

                    .checkpoints {
                        padding-left: 20px;
                    }
                }
            </style>
            <div class="panel-header">
                <span class="panel-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Diagnostic Progress
                </span>
            </div>
            <div class="pipeline-body"></div>
        `;

        this.renderPipeline();
    }
}

customElements.define('diagnostic-tracker', DiagnosticTracker);
