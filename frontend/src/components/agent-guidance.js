/**
 * Agent Guidance - L2 escalation guidance cards with copy-to-clipboard
 * Displays guidance items as cards with title, detail, and copy button
 */
class AgentGuidance extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._items = [];
        this._rendered = false;
    }

    connectedCallback() {
        if (!this._rendered) {
            this.render();
            this._rendered = true;
        }
    }

    /**
     * Replace all guidance items.
     * @param {Array<{title: string, detail: string}>} items
     */
    setGuidance(items) {
        this._items = Array.isArray(items) ? [...items] : [];
        this._updateVisibility();
        this.renderItems();
    }

    /**
     * Append a single guidance item.
     * @param {{title: string, detail: string}} item
     */
    addGuidance(item) {
        if (!item) return;
        this._items.push({
            title: item.title || 'Untitled',
            detail: item.detail || '',
        });
        this._updateVisibility();
        this.renderItems();
    }

    _updateVisibility() {
        this.style.display = this._items.length === 0 ? 'none' : '';
    }

    async _copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = original;
                btn.classList.remove('copied');
            }, 2000);
        } catch {
            // Fallback for non-secure contexts
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = original;
                btn.classList.remove('copied');
            }, 2000);
        }
    }

    renderItems() {
        const container = this.shadowRoot.querySelector('.guidance-list');
        if (!container) return;

        const countEl = this.shadowRoot.querySelector('.guidance-count');
        if (countEl) countEl.textContent = this._items.length;

        if (this._items.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this._items.map((item, i) => `
            <div class="guidance-card" style="animation: slideIn 0.3s ease forwards; animation-delay: ${i * 0.05}s;">
                <div class="card-header">
                    <span class="card-title">${item.title}</span>
                    <button class="copy-btn" data-idx="${i}">Copy</button>
                </div>
                <div class="card-detail">${item.detail}</div>
            </div>
        `).join('');

        // Attach copy handlers
        container.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx, 10);
                const item = this._items[idx];
                if (item) {
                    this._copyToClipboard(`${item.title}: ${item.detail}`, btn);
                }
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

                .guidance-count-badge {
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

                .guidance-list {
                    padding: 8px;
                    overflow-y: auto;
                    max-height: calc(100% - 40px);
                }

                .guidance-card {
                    padding: 10px 12px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.06);
                    margin-bottom: 6px;
                    transition: all 0.2s ease;
                    opacity: 0;
                }

                .guidance-card:hover {
                    border-color: var(--color-accent-primary, #4d9ff7);
                    background: rgba(77, 159, 247, 0.05);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                    gap: 8px;
                }

                .card-title {
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: var(--color-text-main, #eaddcf);
                    line-height: 1.3;
                }

                .card-detail {
                    font-size: 0.8rem;
                    color: var(--color-text-main, #eaddcf);
                    opacity: 0.7;
                    line-height: 1.5;
                }

                .copy-btn {
                    flex-shrink: 0;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 6px;
                    color: var(--color-text-main, #eaddcf);
                    font-family: inherit;
                    font-size: 0.68rem;
                    font-weight: 600;
                    padding: 3px 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }

                .copy-btn:hover {
                    background: rgba(77, 159, 247, 0.15);
                    border-color: var(--color-accent-primary, #4d9ff7);
                    color: var(--color-accent-primary, #4d9ff7);
                }

                .copy-btn.copied {
                    background: rgba(129, 199, 132, 0.15);
                    border-color: #81c784;
                    color: #81c784;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .guidance-list::-webkit-scrollbar {
                    width: 3px;
                }
                .guidance-list::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                }
            </style>
            <div class="panel-header">
                <span class="panel-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    L2 Guidance
                </span>
                <span class="guidance-count-badge"><span class="guidance-count">0</span></span>
            </div>
            <div class="guidance-list"></div>
        `;

        // Set initial visibility
        this._updateVisibility();
    }
}

customElements.define('agent-guidance', AgentGuidance);
