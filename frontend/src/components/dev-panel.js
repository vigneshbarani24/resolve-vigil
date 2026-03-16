/**
 * Dev Panel — Real-time system observatory for jury/demo.
 * Shows live tool execution, shield layer pipeline, ADK agent routing,
 * and system metrics with visual flair.
 */
class DevPanel extends HTMLElement {
    constructor() {
        super();
        this._open = false;
        this._activities = [];
        this._system = {};
        this._pollTimer = null;
        this._scanCount = 0;
        this._toolCount = 0;
        this._sessionCount = 0;
    }

    connectedCallback() {
        this.render();
        this.startPolling();
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    disconnectedCallback() {
        if (this._pollTimer) clearInterval(this._pollTimer);
    }

    toggle() {
        this._open = !this._open;
        this.render();
        if (this._open) this.fetchActivity();
    }

    startPolling() {
        this._pollTimer = setInterval(() => {
            if (this._open) this.fetchActivity();
        }, 1500);
    }

    async fetchActivity() {
        try {
            const resp = await fetch('/api/activity?limit=40');
            if (!resp.ok) return;
            const data = await resp.json();
            this._activities = data.activities || [];
            this._system = data.system || {};
            // Count metrics
            this._scanCount = this._activities.filter(a => a.category === 'shield' && a.action.includes('complete')).length;
            this._toolCount = this._activities.filter(a => a.category === 'tool').length;
            this._sessionCount = this._activities.filter(a => a.category === 'voice').length;
            this.updateContent();
        } catch {}
    }

    updateContent() {
        const panel = this.querySelector('.dp-panel');
        if (!panel) return;

        // Metrics bar
        const metrics = panel.querySelector('.dp-metrics');
        if (metrics) {
            const up = this._system.uptime_seconds || 0;
            metrics.innerHTML = `
                <div class="dp-metric">
                    <div class="dp-metric-val">${this._system.adk_enabled ? 'ADK' : 'LIVE'}</div>
                    <div class="dp-metric-label">Mode</div>
                </div>
                <div class="dp-metric">
                    <div class="dp-metric-val">${this._scanCount}</div>
                    <div class="dp-metric-label">Scans</div>
                </div>
                <div class="dp-metric">
                    <div class="dp-metric-val">${this._toolCount}</div>
                    <div class="dp-metric-label">Tool Calls</div>
                </div>
                <div class="dp-metric">
                    <div class="dp-metric-val">${this._sessionCount}</div>
                    <div class="dp-metric-label">Sessions</div>
                </div>
                <div class="dp-metric">
                    <div class="dp-metric-val">${Math.floor(up / 60)}m${up % 60}s</div>
                    <div class="dp-metric-label">Uptime</div>
                </div>
            `;
        }

        // Activity feed
        const feed = panel.querySelector('.dp-feed');
        if (!feed) return;
        if (this._activities.length === 0) {
            feed.innerHTML = '<div class="dp-empty">Waiting for activity...</div>';
            return;
        }

        feed.innerHTML = this._activities.map(a => {
            const icon = {shield:'\u{1F6E1}',voice:'\u{1F399}',tool:'\u{1F527}',adk:'\u{1F916}',system:'\u2699\uFE0F',nav:'\u{1F9ED}'}[a.category]||'\u{1F4CC}';
            const color = {shield:'#00d4aa',voice:'#e8a73e',tool:'#a78bfa',adk:'#60a5fa',system:'#6b7280',nav:'#f59e0b'}[a.category]||'#9ca3af';
            const isShieldComplete = a.category === 'shield' && a.action.includes('complete');
            const isTool = a.category === 'tool';
            const isVoice = a.category === 'voice';

            // Extract verdict from shield actions
            let badge = '';
            if (isShieldComplete) {
                const match = a.action.match(/\u2192 (\w+)/);
                const level = match ? match[1] : 'SAFE';
                const badgeColor = level === 'SAFE' ? '#81c784' : level === 'MEDIUM' ? '#f0ab00' : level === 'HIGH' || level === 'CRITICAL' ? '#e57373' : '#81c784';
                badge = `<span class="dp-badge" style="background:${badgeColor}20;color:${badgeColor};border:1px solid ${badgeColor}40">${level}</span>`;
            }

            // Extract layers from shield detail
            let layers = '';
            if (isShieldComplete && a.detail) {
                const layerMatch = a.detail.match(/Layers: ([^|]+)/);
                if (layerMatch) {
                    const layerNames = layerMatch[1].split(', ');
                    layers = `<div class="dp-layers">${layerNames.map(l =>
                        `<span class="dp-layer">${l.replace(/_/g,' ')}</span>`
                    ).join('<span class="dp-layer-arrow">\u2192</span>')}</div>`;
                }
            }

            return `
                <div class="dp-entry ${isShieldComplete ? 'dp-entry-highlight' : ''}" style="--accent:${color}">
                    <div class="dp-entry-row">
                        <span class="dp-icon">${icon}</span>
                        <span class="dp-cat" style="color:${color}">${a.category.toUpperCase()}</span>
                        <span class="dp-action">${this._esc(a.action)}</span>
                        ${badge}
                        <span class="dp-time">${a.ts}</span>
                    </div>
                    ${layers}
                    ${a.detail ? `<div class="dp-detail">${this._esc(a.detail.replace(/Layers:[^|]+\|?\s*/, ''))}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    render() {
        this.innerHTML = `
            <style>
                .dp-btn {
                    position: fixed; bottom: 16px; right: 16px; z-index: 9999;
                    width: 48px; height: 48px; border-radius: 50%;
                    border: 2px solid rgba(0,212,170,0.3);
                    background: rgba(10,11,16,0.95); color: #00d4aa;
                    font-size: 20px; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(12px);
                    box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
                    transition: all 0.2s;
                }
                .dp-btn:hover { transform: scale(1.1); border-color: #00d4aa; box-shadow: 0 0 20px rgba(0,212,170,0.3); }
                .dp-btn.active { background: #00d4aa; color: #0a0b10; border-color: #00d4aa; }

                .dp-panel {
                    position: fixed; bottom: 74px; right: 16px; z-index: 9998;
                    width: 520px; max-height: 65vh;
                    background: rgba(8,9,15,0.98);
                    border: 1px solid rgba(0,212,170,0.15);
                    border-radius: 14px;
                    box-shadow: 0 12px 48px rgba(0,0,0,0.7), 0 0 1px rgba(0,212,170,0.2);
                    backdrop-filter: blur(20px);
                    display: flex; flex-direction: column;
                    font-family: 'JetBrains Mono', 'Consolas', monospace;
                    font-size: 11px;
                    animation: dpIn 0.25s ease-out;
                    overflow: hidden;
                }
                @keyframes dpIn { from { opacity:0; transform: translateY(12px) scale(0.97); } to { opacity:1; transform: translateY(0) scale(1); } }

                .dp-header {
                    display: flex; align-items: center; gap: 8px;
                    padding: 12px 16px;
                    background: linear-gradient(135deg, rgba(0,212,170,0.08), rgba(0,212,170,0.02));
                    border-bottom: 1px solid rgba(0,212,170,0.1);
                }
                .dp-pulse { width: 8px; height: 8px; border-radius: 50%; background: #00d4aa; animation: dpPulse 1.5s infinite; }
                @keyframes dpPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,212,170,0.5); } 50% { box-shadow: 0 0 0 6px rgba(0,212,170,0); } }
                .dp-header-title { color: #00d4aa; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; flex: 1; }
                .dp-header-sub { color: #4b5563; font-size: 9px; }

                .dp-metrics {
                    display: flex; gap: 2px; padding: 8px 12px;
                    background: rgba(255,255,255,0.02);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .dp-metric { flex: 1; text-align: center; padding: 4px; }
                .dp-metric-val { color: #e5e7eb; font-weight: 700; font-size: 14px; }
                .dp-metric-label { color: #6b7280; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

                .dp-feed { flex: 1; overflow-y: auto; padding: 6px 8px; }
                .dp-feed::-webkit-scrollbar { width: 4px; }
                .dp-feed::-webkit-scrollbar-thumb { background: rgba(0,212,170,0.15); border-radius: 4px; }

                .dp-entry {
                    padding: 6px 8px; margin-bottom: 3px;
                    border-radius: 6px; border-left: 3px solid var(--accent);
                    background: rgba(255,255,255,0.015);
                    transition: background 0.15s;
                }
                .dp-entry:hover { background: rgba(255,255,255,0.04); }
                .dp-entry-highlight { background: rgba(0,212,170,0.04); border-left-color: #00d4aa; }

                .dp-entry-row { display: flex; align-items: center; gap: 6px; }
                .dp-icon { font-size: 13px; flex-shrink: 0; }
                .dp-cat { font-weight: 800; font-size: 9px; letter-spacing: 0.5px; min-width: 48px; }
                .dp-action { flex: 1; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .dp-time { color: #374151; font-size: 10px; flex-shrink: 0; }

                .dp-badge {
                    font-size: 9px; font-weight: 800; padding: 1px 6px;
                    border-radius: 4px; letter-spacing: 0.5px; flex-shrink: 0;
                }

                .dp-layers {
                    display: flex; align-items: center; gap: 4px;
                    padding: 4px 0 2px 22px; flex-wrap: wrap;
                }
                .dp-layer {
                    font-size: 9px; color: #9ca3af; background: rgba(255,255,255,0.05);
                    padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.08);
                }
                .dp-layer-arrow { color: #374151; font-size: 10px; }

                .dp-detail {
                    margin-top: 3px; padding-left: 22px;
                    color: #6b7280; font-size: 10px; line-height: 1.4;
                    overflow: hidden; text-overflow: ellipsis;
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                }
                .dp-empty { padding: 30px; text-align: center; color: #374151; }
            </style>

            <button class="dp-btn ${this._open ? 'active' : ''}" id="dp-toggle" title="System Observatory (Ctrl+Shift+D)">
                ${this._open ? '\u2716' : '\u{1F4BB}'}
            </button>

            ${this._open ? `
                <div class="dp-panel">
                    <div class="dp-header">
                        <span class="dp-pulse"></span>
                        <span class="dp-header-title">System Observatory</span>
                        <span class="dp-header-sub">Ctrl+Shift+D</span>
                    </div>
                    <div class="dp-metrics"></div>
                    <div class="dp-feed"><div class="dp-empty">Loading...</div></div>
                </div>
            ` : ''}
        `;

        this.querySelector('#dp-toggle').addEventListener('click', () => this.toggle());
        if (this._open) this.fetchActivity();
    }
}

customElements.define('dev-panel', DevPanel);
